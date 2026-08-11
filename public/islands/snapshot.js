// snapshot.js — drives the Snapshot flow.
//
// input → working → teaser + gate → report
//
// The report does not exist client-side until the gate is passed. /run returns
// a teaser and an id; only /unlock returns findings. So there is nothing here
// to reverse-engineer, and this file can be read by anyone without leaking it.
//
// All rendering uses DOM methods rather than innerHTML — the report contains
// model output and third-party page titles, and neither is trusted markup.

(function () {
  'use strict';

  var root = document.querySelector('[data-snapshot]');
  if (!root) return;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var state = {
    id: null, teaser: null, report: null, shareToken: null,
    gateShownAt: 0, nicheOptions: [], refining: false,
  };

  // ── tiny DOM helpers ──
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function frag() { return document.createDocumentFragment(); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function money(n) {
    if (typeof n !== 'number' || !isFinite(n) || n <= 0) return null;
    return '$' + Math.round(n).toLocaleString();
  }

  function phase(name) {
    root.querySelectorAll('.phase').forEach(function (p) { p.classList.remove('phase--active'); });
    var target = root.querySelector('[data-phase="' + name + '"]');
    if (target) target.classList.add('phase--active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showError(node, msg) {
    if (!node) return;
    node.textContent = msg;
    node.hidden = !msg;
  }

  // ── Phase 1: input ──
  var urlInput = $('#url');
  var goBtn = $('#go');
  var errNode = $('[data-err]');

  $('[data-toggle-describe]').addEventListener('click', function () {
    var box = $('[data-describe]');
    box.hidden = !box.hidden;
    if (!box.hidden) $('#describe').focus();
  });

  goBtn.addEventListener('click', function () { start({ url: urlInput.value.trim() }); });
  urlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') start({ url: urlInput.value.trim() });
  });
  $('[data-go-describe]').addEventListener('click', function () {
    start({ describe: $('#describe').value.trim() });
  });

  function source() {
    var p = new URLSearchParams(location.search);
    var out = { ref: document.referrer || null, path: location.pathname };
    ['utm_source', 'utm_medium', 'utm_campaign', 'src', 'via'].forEach(function (k) {
      if (p.get(k)) out[k] = p.get(k);
    });
    return out;
  }

  // The step ticker is honest about ordering but not about timing — the server
  // does not stream progress, so these advance on a schedule that matches the
  // real pipeline's shape. Nothing here claims a step finished that didn't.
  var STEP_MS = [1200, 2200, 3200, 4600, 7000, 10000];
  var stepTimers = [];
  function runSteps() {
    var items = root.querySelectorAll('[data-steps] li');
    items.forEach(function (li) { li.removeAttribute('data-state'); });
    stepTimers.forEach(clearTimeout);
    stepTimers = [];
    items.forEach(function (li, i) {
      stepTimers.push(setTimeout(function () {
        for (var j = 0; j < i; j++) items[j].setAttribute('data-state', 'done');
        li.setAttribute('data-state', 'active');
      }, STEP_MS[i] || 11000 + i * 1500));
    });
  }
  function stopSteps() {
    stepTimers.forEach(clearTimeout);
    stepTimers = [];
    root.querySelectorAll('[data-steps] li').forEach(function (li) {
      li.setAttribute('data-state', 'done');
    });
  }

  function start(input) {
    if (!input.url && (!input.describe || input.describe.length < 20)) {
      showError(errNode, 'Enter your website, or describe the business in a sentence or two.');
      return;
    }
    showError(errNode, '');
    goBtn.disabled = true;
    goBtn.textContent = 'reading…';
    phase('working');
    runSteps();

    fetch('/api/snapshot/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input.url || '', describe: input.describe || '', source: source() }),
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        stopSteps();
        goBtn.disabled = false;
        goBtn.textContent = 'Read my business →';
        if (!res.ok || res.body.error) {
          phase('input');
          showError(errNode, res.body.error || 'Something went wrong. Try again in a moment.');
          if (res.body.canDescribe) $('[data-describe]').hidden = false;
          return;
        }
        state.id = res.body.id;
        state.teaser = res.body.teaser;
        state.nicheOptions = res.body.nicheOptions || [];
        renderTeaser(res.body.teaser);
        state.gateShownAt = Date.now();
        phase('gate');
      })
      .catch(function () {
        stopSteps();
        goBtn.disabled = false;
        goBtn.textContent = 'Read my business →';
        phase('input');
        showError(errNode, 'Could not reach the server. Check your connection and try again.');
      });
  }

  // ── Phase 3: teaser ──
  function tile(value, label, grade) {
    var t = el('div', 'tile' + (grade ? ' tile--' + String(grade).toLowerCase() : ''));
    t.appendChild(el('span', 't-val', value));
    t.appendChild(el('span', 't-lab', label));
    return t;
  }

  function renderTeaser(t) {
    var host = $('[data-teaser]');
    clear(host);

    var hero = el('div', 'rep-hero');
    hero.appendChild(el('p', 'rep-name', (t.niche || 'business') + (t.locality ? ' · ' + t.locality : '')));
    hero.appendChild(el('h2', null, 'Your Snapshot is ready, ' + (t.businessName || 'here') + '.'));
    if (t.whatTheyDo) hero.appendChild(el('p', 'rep-what', t.whatTheyDo));
    host.appendChild(hero);

    var tiles = el('div', 'rep-tiles');
    if (typeof t.health === 'number' && t.health > 0) {
      var g = t.health >= 90 ? 'a' : t.health >= 80 ? 'b' : t.health >= 68 ? 'c' : t.health >= 55 ? 'd' : 'f';
      tiles.appendChild(tile(t.health, 'overall health', g));
    }
    tiles.appendChild(tile(t.leakCount || 0, 'money leaks found', (t.leakCount || 0) > 2 ? 'd' : 'c'));
    tiles.appendChild(tile(t.findingCount || 0, 'specific findings'));
    var lo = money(t.estLow);
    var hi = money(t.estHigh);
    if (lo && hi) tiles.appendChild(tile(lo + '–' + hi, 'estimated annual leak', 'f'));
    host.appendChild(tiles);

    var proof = el('div', 'rep-sec');
    proof.appendChild(el('h3', null, 'What it looked at'));
    var ul = el('ul', 'findings');
    var checks = [];
    if (t.pagesRead) checks.push('Read ' + t.pagesRead + ' page' + (t.pagesRead === 1 ? '' : 's') + ' of your site');
    checks.push('Graded ' + (t.grades || []).length + ' parts of the business');
    if (t.reviewsChecked) checks.push('Checked your review presence across platforms');
    if (t.competitorsFound) checks.push('Found ' + t.competitorsFound + ' local competitor' + (t.competitorsFound === 1 ? '' : 's') + ' ranking for your category');
    if (t.frontierItems) checks.push(t.frontierItems + ' recent item' + (t.frontierItems === 1 ? '' : 's') + ' on AI-native competition moving into your trade');
    checks.forEach(function (c) {
      var li = el('li', 'ok', c);
      ul.appendChild(li);
    });
    proof.appendChild(ul);
    host.appendChild(proof);

    if ((t.grades || []).length) {
      var gsec = el('div', 'rep-sec');
      gsec.appendChild(el('h3', null, 'Your grades'));
      var gt = el('div', 'rep-tiles');
      t.grades.forEach(function (x) {
        gt.appendChild(tile(x.grade, x.label, x.grade));
      });
      gsec.appendChild(gt);
      host.appendChild(gsec);
    }

    if (t.sampleFinding) {
      var s = el('div', 'first-move');
      s.appendChild(el('span', 'fm-lab', 'one of the findings'));
      s.appendChild(el('h3', null, t.sampleFinding.name));
      s.appendChild(el('p', null, t.sampleFinding.evidence));
      host.appendChild(s);
    }
  }

  // ── The gate ──
  var gateForm = $('[data-gate-form]');
  var gateErr = $('[data-gate-err]');

  gateForm.addEventListener('submit', function (e) {
    e.preventDefault();
    root.querySelectorAll('[data-field-err]').forEach(function (n) { n.textContent = ''; });
    root.querySelectorAll('.field input').forEach(function (n) { n.removeAttribute('aria-invalid'); });
    showError(gateErr, '');

    var btn = $('[data-unlock]');
    btn.disabled = true;
    btn.textContent = 'checking…';

    fetch('/api/snapshot/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: state.id,
        name: $('#lead-name').value,
        email: $('#lead-email').value,
        businessName: state.teaser ? state.teaser.businessName : '',
        website_url: $('#website_url').value,
        elapsedMs: Date.now() - state.gateShownAt,
      }),
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        btn.disabled = false;
        btn.textContent = 'Show me the report';
        if (!res.ok || res.body.error) {
          var field = res.body.field;
          if (field) {
            var fe = root.querySelector('[data-field-err="' + field + '"]');
            if (fe) fe.textContent = res.body.error;
            var inp = $('#lead-' + field);
            if (inp) { inp.setAttribute('aria-invalid', 'true'); inp.focus(); }
          } else {
            showError(gateErr, res.body.error || 'Something went wrong.');
          }
          return;
        }
        if (!res.body.report) {
          showError(gateErr, 'Something went wrong. Email alex@campos.works and I will send it over.');
          return;
        }
        state.report = res.body.report;
        state.shareToken = res.body.shareToken;
        renderReport(state.report);
        phase('report');
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Show me the report';
        showError(gateErr, 'Could not reach the server. Try again in a moment.');
      });
  });

  // ── Phase 4: the report ──
  function section(title, gloss) {
    var s = el('div', 'rep-sec');
    s.appendChild(el('h3', null, title));
    if (gloss) s.appendChild(el('p', 'rep-gloss', gloss));
    return s;
  }

  function renderReport(full) {
    var host = $('[data-report]');
    clear(host);
    var r = full.report || {};

    // Meta line
    var meta = $('[data-report-meta]');
    if (meta) {
      var when = full.generatedAt ? new Date(full.generatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
      meta.textContent = (full.niche ? full.niche.label : '') + (full.locality ? ' · ' + full.locality : '') + (when ? ' · ' + when : '');
    }

    // A report we ran and sent unprompted needs to say so in the first line.
    // Someone who did not ask for this deserves to know immediately what it is
    // and that nothing is being asked of them.
    if (state.prepared) {
      var pb = el('div', 'prepared');
      pb.appendChild(el('span', 'prep-lab', 'prepared for you'));
      pb.appendChild(el('p', null,
        'I ran this read before getting in touch, so there is nothing to sign up for and nothing to pay. ' +
        'It was built from your public website and public records. If any of it is wrong, correct it below and I will read it again.'));
      host.appendChild(pb);
    }

    // Corrections next — before the owner reads a word, make it obvious that
    // anything wrong here is fixable. A correction is the strongest buying
    // signal on the page, so it should be the easiest thing to do.
    host.appendChild(renderCorrections(full));

    // Hero
    var hero = el('div', 'rep-hero');
    hero.appendChild(el('p', 'rep-name', r.businessName || ''));
    hero.appendChild(el('h2', null, r.headline || ''));
    if (r.whatTheyDo) hero.appendChild(el('p', 'rep-what', r.whatTheyDo));
    if (r.theRead) hero.appendChild(el('p', 'rep-read', r.theRead));
    host.appendChild(hero);

    // Tiles
    var tiles = el('div', 'rep-tiles');
    if (typeof full.health === 'number' && full.health > 0) {
      var g = full.health >= 90 ? 'a' : full.health >= 80 ? 'b' : full.health >= 68 ? 'c' : full.health >= 55 ? 'd' : 'f';
      tiles.appendChild(tile(full.health, 'overall health', g));
    }
    var lo = money(full.totals && full.totals.low);
    var hi = money(full.totals && full.totals.high);
    if (lo && hi) tiles.appendChild(tile(lo + '–' + hi, 'estimated annual leak', 'f'));
    tiles.appendChild(tile((r.leaks || []).length, 'leaks found'));
    host.appendChild(tiles);

    // Leaks
    if ((r.leaks || []).length) {
      var ls = section('Where the money goes', 'Ordered by cost. Every figure below is reasoned from your trade’s unit economics, with the basis shown so you can argue with it.');
      r.leaks.forEach(function (leak, i) {
        var row = el('div', 'leak');
        row.appendChild(el('span', 'leak-rank', String(i + 1).padStart(2, '0')));
        var b = el('div');
        b.appendChild(el('h4', null, leak.name));
        var clo = money(leak.costLow), chi = money(leak.costHigh);
        if (clo && chi) {
          var cost = el('div', 'leak-cost');
          cost.appendChild(document.createTextNode(clo + '–' + chi + '/yr  '));
          cost.appendChild(el('span', 'basis', leak.costBasis || ''));
          b.appendChild(cost);
        }
        if (leak.evidence) b.appendChild(el('p', null, leak.evidence));
        if (leak.fix) {
          var fix = el('p', 'leak-fix');
          fix.appendChild(el('strong', null, 'fix — '));
          fix.appendChild(document.createTextNode(leak.fix + (leak.effort ? ' (' + leak.effort + ')' : '')));
          b.appendChild(fix);
        }
        row.appendChild(b);
        ls.appendChild(row);
      });
      host.appendChild(ls);
    }

    // First move
    if (r.firstMove && r.firstMove.what) {
      var fm = el('div', 'first-move');
      fm.appendChild(el('span', 'fm-lab', 'if you do one thing'));
      fm.appendChild(el('h3', null, r.firstMove.what));
      if (r.firstMove.why) fm.appendChild(el('p', null, r.firstMove.why));
      if (r.firstMove.ifIgnored) fm.appendChild(el('p', 'ignored', r.firstMove.ifIgnored));
      host.appendChild(fm);
    }

    // SWOT
    if (r.swot) {
      var sw = section('The honest read');
      var grid = el('div', 'swot');
      [['s', 'Strengths', r.swot.strengths], ['w', 'Weaknesses', r.swot.weaknesses],
       ['o', 'Opportunities', r.swot.opportunities], ['t', 'Threats', r.swot.threats]].forEach(function (q) {
        var box = el('div', 'swot-q ' + q[0]);
        box.appendChild(el('h4', null, q[1]));
        var ul = el('ul');
        (q[2] || []).forEach(function (x) { ul.appendChild(el('li', null, x)); });
        box.appendChild(ul);
        grid.appendChild(box);
      });
      sw.appendChild(grid);
      host.appendChild(sw);
    }

    // Parts
    if ((full.parts || []).length) {
      var ps = section('The eight parts, graded', 'Three of these cannot be seen from outside your website. Rather than guess, they are marked as such.');
      full.parts.forEach(function (p) {
        var row = el('div', 'part-row');
        var head = el('div', 'part-head');
        head.appendChild(el('span', 'p-name', p.label));
        head.appendChild(el('span', 'p-grade ' + (p.notVisible ? 'g-x' : 'g-' + p.grade), p.notVisible ? 'not visible' : p.grade + ' · ' + p.score));
        row.appendChild(head);
        var ul = el('ul', 'findings');
        (p.findings || []).forEach(function (f) {
          ul.appendChild(el('li', f.ok ? 'ok' : 'gap', f.text));
        });
        row.appendChild(ul);
        ps.appendChild(row);
      });
      host.appendChild(ps);
    }

    // Presence
    if (full.presence) renderPresence(host, full.presence);

    // Frontier mirror
    if (full.frontier) renderFrontier(host, full.frontier, full.niche ? full.niche.label : 'your category');

    // CTA
    var cta = el('div', 'rep-cta');
    cta.appendChild(el('h3', null, 'What now'));
    cta.appendChild(el('p', null,
      'This report is yours. You can hand it to anyone — including another consultant — and it will still be useful. ' +
      'If you want to talk through it, the call is free and I will tell you honestly if there is nothing here worth paying for.'));
    var row = el('div', 'cta-row');
    var a1 = el('a', 'btn btn-primary', 'Book a free 30 minutes');
    a1.href = '/contact?from=snapshot';
    var a2 = el('a', 'btn btn-ghost', 'See what things cost');
    a2.href = '/services#offers';
    row.appendChild(a1); row.appendChild(a2);
    cta.appendChild(row);
    host.appendChild(cta);

    var caveat = el('p', 'caveat',
      'How this was made: your site was read directly, graded against checks that are the same for everyone, ' +
      'and interpreted against how businesses in your trade actually make money. Anything marked "not checked" was not looked at ' +
      '— it is not a claim that something is missing. Dollar figures are estimates with their basis shown, not measurements of your books. ' +
      'If something here is wrong, tell me and I will correct it: alex@campos.works');
    host.appendChild(caveat);
  }

  // ── Corrections ──
  function renderCorrections(full) {
    var r = full.report || {};
    var box = el('div', 'corrections');

    var head = el('div', 'corr-head');
    head.appendChild(el('span', 'corr-lab', 'did I get this right?'));
    var toggle = el('button', 'corr-toggle', 'Something’s wrong →');
    toggle.type = 'button';
    head.appendChild(toggle);
    box.appendChild(head);

    var summary = el('p', 'corr-summary');
    summary.textContent =
      'I read this as ' + (full.niche ? full.niche.label : 'a local business') +
      (full.locality ? ' in ' + full.locality : '') + '. ' +
      (full.niche && full.niche.correctedByOwner
        ? 'You corrected that, and this is the re-read.'
        : 'If any of that is off, fix it and I will read it again properly — the industry drives every number below.');
    box.appendChild(summary);

    var form = el('div', 'corr-form');
    form.hidden = true;

    function field(labelText, id, value, placeholder) {
      var f = el('div', 'corr-field');
      var l = el('label', null, labelText);
      l.setAttribute('for', id);
      var i = document.createElement('input');
      i.type = 'text'; i.id = id; i.value = value || ''; i.placeholder = placeholder || '';
      f.appendChild(l); f.appendChild(i);
      return f;
    }

    // Industry — the highest-value correction. Everything downstream depends on it.
    var nf = el('div', 'corr-field');
    var nl = el('label', null, 'Industry');
    nl.setAttribute('for', 'corr-niche');
    var sel = document.createElement('select');
    sel.id = 'corr-niche';
    (state.nicheOptions.length ? state.nicheOptions : [{ id: full.niche ? full.niche.id : 'general', label: full.niche ? full.niche.label : 'local service business' }])
      .forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.id; opt.textContent = o.label;
        if (full.niche && o.id === full.niche.id) opt.selected = true;
        sel.appendChild(opt);
      });
    nf.appendChild(nl); nf.appendChild(sel);
    form.appendChild(nf);

    form.appendChild(field('Business name', 'corr-name', r.businessName, ''));
    form.appendChild(field('Where you operate', 'corr-locality', full.locality, 'e.g. Woodbridge, VA or 22191'));

    var cf = el('div', 'corr-field');
    var cl = el('label', null, 'Anything I misread');
    cl.setAttribute('for', 'corr-context');
    var ta = document.createElement('textarea');
    ta.id = 'corr-context'; ta.rows = 3;
    ta.placeholder = "e.g. We don't do residential at all — it's 90% commercial contracts. And we do answer after hours, it just goes to a cell.";
    cf.appendChild(cl); cf.appendChild(ta);
    form.appendChild(cf);

    var actions = el('div', 'corr-actions');
    var btn = el('button', 'btn btn-primary', 'Read it again');
    btn.type = 'button';
    var status = el('span', 'corr-status');
    actions.appendChild(btn); actions.appendChild(status);
    form.appendChild(actions);

    box.appendChild(form);

    toggle.addEventListener('click', function () {
      form.hidden = !form.hidden;
      toggle.textContent = form.hidden ? 'Something’s wrong →' : 'Never mind';
      if (!form.hidden) sel.focus();
    });

    btn.addEventListener('click', function () {
      if (state.refining) return;
      var payload = {
        id: state.id,
        shareToken: state.shareToken || '',
        nicheId: sel.value,
        businessName: $('#corr-name').value.trim(),
        locality: $('#corr-locality').value.trim(),
        context: $('#corr-context').value.trim(),
      };
      state.refining = true;
      btn.disabled = true;
      btn.textContent = 'reading again…';
      status.textContent = 'This takes a few seconds.';
      status.className = 'corr-status';

      fetch('/api/snapshot/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (rr) { return rr.json().then(function (b) { return { ok: rr.ok, body: b }; }); })
        .then(function (rr) {
          state.refining = false;
          btn.disabled = false;
          btn.textContent = 'Read it again';
          if (!rr.ok || rr.body.error) {
            status.textContent = rr.body.error || 'Could not re-read that.';
            status.className = 'corr-status corr-status--err';
            return;
          }
          state.report = rr.body.report;
          if (rr.body.nicheOptions) state.nicheOptions = rr.body.nicheOptions;
          renderReport(state.report);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(function () {
          state.refining = false;
          btn.disabled = false;
          btn.textContent = 'Read it again';
          status.textContent = 'Could not reach the server.';
          status.className = 'corr-status corr-status--err';
        });
    });

    return box;
  }

  function probeRow(label, probe, renderValue) {
    var row = el('div', 'probe');
    row.appendChild(el('span', 'probe-label', label));
    var val = el('span', 'probe-val');
    if (probe.state === 'found' && renderValue) {
      renderValue(val, probe.data);
    } else {
      val.textContent = probe.note || (probe.state === 'absent' ? 'Nothing found.' : 'Not checked.');
    }
    row.appendChild(val);
    row.appendChild(el('span', 'probe-state st-' + probe.state, probe.state.replace('_', ' ')));
    return row;
  }

  function renderPresence(host, p) {
    var s = section('What the rest of the internet says about you',
      'Everything here is off your website — the half most owners never see about themselves.');

    s.appendChild(probeRow('Reviews', p.reviews, function (val, data) {
      (data || []).forEach(function (r, i) {
        if (i) val.appendChild(document.createTextNode(' · '));
        var node = r.url ? el('a', null, r.platform) : el('span', null, r.platform);
        if (r.url) { node.href = r.url; node.target = '_blank'; node.rel = 'noopener'; }
        val.appendChild(node);
        if (r.rating || r.reviewCount) {
          val.appendChild(document.createTextNode(
            ' ' + (r.rating ? r.rating + '★' : '') + (r.reviewCount ? ' (' + r.reviewCount + ')' : '')));
        }
      });
    }));

    s.appendChild(probeRow('Search visibility', p.searchVisibility, function (val, d) {
      val.textContent = d.ownSiteRanked
        ? 'Your site appears on page one for "' + d.query + '".'
        : 'Your own site does NOT appear on page one for "' + d.query + '".';
    }));

    s.appendChild(probeRow('AI assistant knows you', p.assistantVisibility, function (val, d) {
      if (d.named) {
        val.textContent = 'Yes — an assistant named you when asked to recommend someone in your trade locally.';
      } else if (d.whoGotNamed && d.whoGotNamed.length) {
        val.textContent = 'No. It named ' + d.whoGotNamed.slice(0, 3).join(', ') + ' instead.';
      } else {
        val.textContent = 'No — and it could not name anyone in your area. That lane is wide open.';
      }
    }));

    s.appendChild(probeRow('Local competitors', p.competitors, function (val, d) {
      (d || []).forEach(function (c, i) {
        if (i) val.appendChild(document.createTextNode(' · '));
        var a = el('a', null, c.name);
        a.href = c.url; a.target = '_blank'; a.rel = 'noopener';
        val.appendChild(a);
      });
    }));

    s.appendChild(probeRow('Domain age', p.domainAge, function (val, d) {
      val.textContent = d.years + ' years (registered ' + d.registered + ')';
    }));

    s.appendChild(probeRow('Email deliverability', p.mail, function (val, d) {
      var bits = [];
      bits.push(d.hasMx ? 'receives mail' : 'CANNOT receive mail');
      bits.push(d.hasSpf ? 'SPF set' : 'no SPF');
      bits.push(d.hasDmarc ? 'DMARC set' : 'no DMARC');
      if (d.provider) bits.push('via ' + d.provider);
      val.textContent = bits.join(' · ');
    }));

    s.appendChild(probeRow('Directory profiles', p.directories, function (val, d) {
      val.textContent = (d || []).map(function (x) { return x.platform; }).join(' · ');
    }));

    host.appendChild(s);
  }

  function renderFrontier(host, f, nicheLabel) {
    var s = section('Who is coming for this category',
      'Well-funded, AI-native companies are moving into ' + nicheLabel + '. Every item below links to its source — click them.');

    if (f.note) s.appendChild(el('p', 'rep-gloss', f.note));

    (f.items || []).forEach(function (it) {
      var box = el('div', 'frontier-item');
      var head = el('span', 'fi-head', it.headline);
      box.appendChild(head);
      var a = el('a', 'fi-src', it.source);
      a.href = it.url; a.target = '_blank'; a.rel = 'noopener';
      box.appendChild(a);
      if (it.excerpt) box.appendChild(el('p', 'fi-ex', it.excerpt));
      s.appendChild(box);
    });

    if ((f.playbook || []).length) {
      s.appendChild(el('p', 'rep-gloss', 'How they operate — and what you can do about each one without their funding:'));
      f.playbook.forEach(function (p) {
        var box = el('div', 'play');
        box.appendChild(el('h4', null, p.move));
        box.appendChild(el('p', null, p.why));
        box.appendChild(el('p', 'counter', p.yourCounter));
        s.appendChild(box);
      });
    }

    host.appendChild(s);
  }

  // ── Report chrome ──
  var clipBtn = $('[data-clip]');
  if (clipBtn) {
    clipBtn.addEventListener('click', function () {
      root.classList.toggle('clip');
      clipBtn.textContent = root.classList.contains('clip') ? 'Exit clip mode' : 'Clip mode';
    });
  }

  var copyBtn = $('[data-copy-link]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var link = location.origin + '/snapshot' + (state.shareToken ? '?s=' + state.shareToken : '');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link).then(function () {
          copyBtn.textContent = 'copied';
          setTimeout(function () { copyBtn.textContent = 'Copy link'; }, 1800);
        });
      }
    });
  }

  // ── Deep links ──
  var params = new URLSearchParams(location.search);

  // /snapshot?s=TOKEN opens a report we already ran. This is the cold-outreach
  // path: the email promised a finished read with nothing to sign up for, so it
  // opens straight into the report with no gate.
  var token = params.get('s');
  if (token) {
    openByToken(token);
  } else {
    // /snapshot?url=example.com starts an analysis immediately, so the owner
    // lands already watching their own business get read.
    var pre = params.get('url') || params.get('site');
    if (pre) {
      urlInput.value = pre;
      setTimeout(function () { start({ url: pre }); }, 400);
    }
  }

  function openByToken(tok) {
    phase('working');
    var steps = root.querySelectorAll('[data-steps] li');
    steps.forEach(function (li) { li.setAttribute('data-state', 'done'); });
    var label = root.querySelector('[data-phase="working"] h2');
    if (label) label.textContent = 'Opening your report';

    fetch('/api/snapshot/by-token?s=' + encodeURIComponent(tok))
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        if (!res.ok || res.body.error || !res.body.report) {
          phase('input');
          showError(errNode, (res.body && res.body.error) || 'That link did not work. Run a fresh read below — it takes about a minute.');
          return;
        }
        state.id = res.body.id;
        state.report = res.body.report;
        state.shareToken = res.body.shareToken;
        state.prepared = res.body.prepared;
        state.nicheOptions = res.body.nicheOptions || [];
        renderReport(state.report);
        phase('report');
      })
      .catch(function () {
        phase('input');
        showError(errNode, 'Could not load that report. Run a fresh read below.');
      });
  }
})();
