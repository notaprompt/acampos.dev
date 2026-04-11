// audit-engine.js - orchestrates the site audit flow
// 5 phases: input -> crawl -> swot -> questions -> outro
// vanilla JS, no framework, progressive rendering
//
// NOTE: innerHTML is used for rendering server-generated content (from our own
// API endpoints, not user input). The crawl and score data comes from our
// serverless functions, not from the audited site's content directly. User
// input fields (questionnaire) are read via .value, never injected as HTML.

(function () {
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  var auditData = { crawl: null, scores: null, swot: null, narrative: null, questionnaire: {} };

  // Simple HTML escaping for any values that might contain special chars
  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showPhase(name) {
    $$('.phase').forEach(function (p) { p.classList.remove('active'); });
    var el = $('#phase-' + name);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // -- Phase 1: Analyze --

  $('#analyze-btn').addEventListener('click', runAnalysis);
  $('#url-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') runAnalysis();
  });

  async function runAnalysis() {
    var url = $('#url-input').value.trim();
    if (!url) return;

    // Disable button + show loading state
    var btn = $('#analyze-btn');
    btn.disabled = true;
    btn.classList.add('loading');
    btn.textContent = 'analyzing...';

    showPhase('crawl');
    $('#crawl-label').textContent = 'reading the site...';
    $('#crawl-spinner').style.display = 'inline-block';
    $('#score-cards').textContent = '';
    $('#crawl-details').textContent = '';

    try {
      // Step 1: Crawl
      var crawlRes = await fetch('/api/audit/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url }),
      });
      var crawl = await crawlRes.json();
      if (crawl.error) throw new Error(crawl.error);
      auditData.crawl = crawl;

      // Set domain for print header
      $('#phase-crawl').setAttribute('data-domain', crawl.domain);
      renderCrawlDetails(crawl);
      $('#crawl-label').textContent = 'analyzing with models...';

      // Step 2: Score via Claude
      var scoreRes = await fetch('/api/audit/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crawl),
      });
      var scoreData = await scoreRes.json();
      if (scoreData.error) throw new Error(scoreData.error);

      auditData.scores = scoreData.scores;
      auditData.swot = scoreData.swot;
      auditData.narrative = scoreData.narrative;

      renderScoreCards(scoreData.scores);
      $('#crawl-spinner').style.display = 'none';
      $('#crawl-label').textContent = 'done.';

      // Transition to SWOT after a beat
      setTimeout(function () {
        renderNarrative(scoreData.narrative);
        renderSWOT(scoreData.swot);
        showPhase('swot');
        setTimeout(appendContinueButton, 1500);
      }, 1200);

    } catch (err) {
      $('#crawl-label').textContent = 'failed: ' + err.message;
      $('#crawl-spinner').style.display = 'none';
      // Reset button
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.textContent = 'analyze \u2192';
    }
  }

  // -- Render: Crawl Details (uses DOM methods for safety) --

  function renderCrawlDetails(crawl) {
    var grid = $('#crawl-details');
    grid.textContent = '';
    var items = [
      { label: 'platform', value: crawl.platform || 'unknown', cls: '' },
      { label: 'server-rendered', value: crawl.isSSR ? 'yes' : 'no - content loads via JS', cls: crawl.isSSR ? 'good' : 'bad' },
      { label: 'https', value: crawl.isHttps ? 'yes' : 'no', cls: crawl.isHttps ? 'good' : 'bad' },
      { label: 'response', value: crawl.responseTimeMs + 'ms', cls: crawl.responseTimeMs < 1000 ? 'good' : 'bad' },
      { label: 'sitemap', value: crawl.hasSitemap ? 'yes (' + crawl.sitemapUrls + ' URLs)' : 'none found', cls: crawl.hasSitemap ? 'good' : 'bad' },
      { label: 'structured data', value: crawl.hasJsonLd ? crawl.jsonLdTypes.join(', ') : 'none', cls: crawl.hasJsonLd ? 'good' : 'bad' },
      { label: 'images without alt', value: crawl.imagesWithoutAlt + ' of ' + (crawl.images ? crawl.images.length : 0), cls: crawl.imagesWithoutAlt === 0 ? 'good' : 'bad' },
      { label: 'agent-discoverable', value: (crawl.hasAgentJson || crawl.hasLlmsTxt) ? 'yes' : 'not yet', cls: (crawl.hasAgentJson || crawl.hasLlmsTxt) ? 'good' : '' },
    ];
    items.forEach(function (i) {
      var row = document.createElement('div');
      row.className = 'detail';
      var lbl = document.createElement('span');
      lbl.className = 'detail-label';
      lbl.textContent = i.label;
      var val = document.createElement('span');
      val.className = 'detail-value' + (i.cls ? ' ' + i.cls : '');
      val.textContent = i.value;
      row.appendChild(lbl);
      row.appendChild(val);
      grid.appendChild(row);
    });
  }

  // -- Render: Score Cards (uses DOM methods) --

  function renderScoreCards(scores) {
    var grid = $('#score-cards');
    grid.textContent = '';
    scores.forEach(function (s) {
      var card = document.createElement('div');
      card.className = 'score-card grade-' + (s.grade || 'f').toLowerCase();

      var grade = document.createElement('div');
      grade.className = 'grade';
      grade.textContent = s.grade;
      card.appendChild(grade);

      var cat = document.createElement('div');
      cat.className = 'category';
      cat.textContent = s.category;
      card.appendChild(cat);

      var bar = document.createElement('div');
      bar.className = 'score-bar';
      var fill = document.createElement('div');
      fill.className = 'fill';
      fill.style.width = s.score + '%';
      bar.appendChild(fill);
      card.appendChild(bar);

      var list = document.createElement('ul');
      list.className = 'findings';
      s.findings.forEach(function (f) {
        var li = document.createElement('li');
        li.textContent = f;
        list.appendChild(li);
      });
      card.appendChild(list);

      grid.appendChild(card);
    });
  }

  // -- Render: Narrative (uses DOM methods) --

  function renderNarrative(n) {
    var block = $('#narrative-block');
    block.textContent = '';

    var h2 = document.createElement('h2');
    h2.className = 'narrative-headline';
    h2.textContent = n.headline;
    block.appendChild(h2);

    var sections = document.createElement('div');
    sections.className = 'narrative-sections';

    function addSection(title, text, cls) {
      var div = document.createElement('div');
      if (cls) div.className = cls;
      var h3 = document.createElement('h3');
      h3.textContent = title;
      var p = document.createElement('p');
      p.textContent = text;
      div.appendChild(h3);
      div.appendChild(p);
      sections.appendChild(div);
    }

    addSection("what's working", n.whatsWorking);
    addSection("what's not", n.whatsBroken);
    addSection('biggest opportunity', n.biggestOpportunity, 'big-opp');

    block.appendChild(sections);
  }

  // -- Render: SWOT (uses DOM methods) --

  function renderSWOT(swot) {
    var grid = $('#swot-grid');
    grid.textContent = '';

    function addQuadrant(cls, title, items) {
      var div = document.createElement('div');
      div.className = 'swot-quadrant ' + cls;
      var h3 = document.createElement('h3');
      h3.textContent = title;
      div.appendChild(h3);
      var ul = document.createElement('ul');
      items.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
      div.appendChild(ul);
      grid.appendChild(div);
    }

    addQuadrant('s', 'strengths', swot.strengths);
    addQuadrant('w', 'weaknesses', swot.weaknesses);
    addQuadrant('o', 'opportunities', swot.opportunities);
    addQuadrant('t', 'threats', swot.threats);
  }

  // -- Continue to questionnaire --

  function appendContinueButton() {
    if ($('#phase-swot .continue-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'continue-btn';
    btn.textContent = 'now tell me about the business \u2192';
    btn.onclick = function () {
      showPhase('questions');
      renderQuestion(0);
    };
    $('#phase-swot').appendChild(btn);
  }

  // -- Phase 4: Questionnaire --

  var QUESTIONS = [
    { id: 'goodMonth', q: 'what does a good month look like for your business?', placeholder: 'revenue, orders, repeat customers - whatever "good" means to you' },
    { id: 'customerChannels', q: 'where do your customers usually find you?', type: 'pills', options: ['instagram', 'google', 'word of mouth', 'farmers market', 'wholesale', 'other'] },
    { id: 'desiredFeeling', q: 'when someone lands on your site, what do you want them to feel?', placeholder: 'hungry, impressed, trusting, excited, curious...' },
    { id: 'hiddenStory', q: "what's the one thing about your business you wish more people knew?", placeholder: 'the recipe origin, your process, what makes you different...' },
    { id: 'ambitionLevel', q: 'how ambitious do you want to get?', type: 'pills', options: ["fix what's broken", 'level up', 'blow their minds'] },
  ];

  var currentQ = 0;

  function renderQuestion(idx) {
    var q = QUESTIONS[idx];
    var container = $('#question-container');
    container.textContent = '';
    var isLast = idx >= QUESTIONS.length - 1;
    var btnText = isLast ? 'see who\'s building this \u2192' : 'next \u2192';

    var wrapper = document.createElement('div');
    wrapper.className = 'question';

    var qText = document.createElement('p');
    qText.className = 'q-text';
    qText.textContent = q.q;
    wrapper.appendChild(qText);

    if (q.type === 'pills') {
      var pillsDiv = document.createElement('div');
      pillsDiv.className = 'pills';

      q.options.forEach(function (o) {
        var pill = document.createElement('button');
        pill.className = 'pill';
        pill.textContent = o;
        pill.dataset.value = o;
        pill.addEventListener('click', function () {
          if (q.id === 'ambitionLevel') {
            pillsDiv.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('selected'); });
            pill.classList.add('selected');
            auditData.questionnaire[q.id] = o;
            setTimeout(advanceQuestion, 400);
          } else {
            pill.classList.toggle('selected');
            var selected = [];
            pillsDiv.querySelectorAll('.pill.selected').forEach(function (p) { selected.push(p.dataset.value); });
            auditData.questionnaire[q.id] = selected;
          }
        });
        pillsDiv.appendChild(pill);
      });
      wrapper.appendChild(pillsDiv);

      // Multi-select gets a next button
      if (q.id !== 'ambitionLevel') {
        var nextBtn = document.createElement('button');
        nextBtn.className = 'next-q-btn';
        nextBtn.textContent = btnText;
        nextBtn.addEventListener('click', advanceQuestion);
        wrapper.appendChild(nextBtn);
      }
    } else {
      var textarea = document.createElement('textarea');
      textarea.className = 'q-input';
      textarea.placeholder = q.placeholder;
      textarea.rows = 3;
      wrapper.appendChild(textarea);

      var nextBtn2 = document.createElement('button');
      nextBtn2.className = 'next-q-btn';
      nextBtn2.textContent = btnText;
      nextBtn2.addEventListener('click', function () {
        auditData.questionnaire[q.id] = textarea.value;
        advanceQuestion();
      });
      wrapper.appendChild(nextBtn2);

      // Auto-focus
      setTimeout(function () { textarea.focus(); }, 100);
    }

    container.appendChild(wrapper);
  }

  function advanceQuestion() {
    currentQ++;
    if (currentQ < QUESTIONS.length) {
      renderQuestion(currentQ);
    } else {
      saveAndShowOutro();
    }
  }

  // -- Phase 5: Save + Outro --

  async function saveAndShowOutro() {
    showPhase('outro');
    try {
      var saveRes = await fetch('/api/audit/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: auditData.crawl.domain,
          crawl: auditData.crawl,
          scores: auditData.scores,
          swot: auditData.swot,
          narrative: JSON.stringify(auditData.narrative),
          questionnaire: auditData.questionnaire,
        }),
      });
      var result = await saveRes.json();
      var shareUrl = window.location.origin + '/audit?id=' + result.id;
      var link = $('#share-link');
      link.href = shareUrl;
      link.textContent = shareUrl;
    } catch (e) {
      var shareBlock = $('#share-block');
      if (shareBlock) shareBlock.style.display = 'none';
    }
  }

  // -- Init: load saved audit from ?id= --

  var params = new URLSearchParams(window.location.search);
  var loadId = params.get('id');
  if (loadId) {
    showPhase('crawl');
    $('#crawl-label').textContent = 'loading saved audit...';
    fetch('/api/audit/' + encodeURIComponent(loadId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          $('#crawl-label').textContent = 'audit not found';
          $('#crawl-spinner').style.display = 'none';
          return;
        }
        auditData.crawl = data.crawl;
        auditData.scores = data.scores;
        auditData.swot = data.swot;
        auditData.narrative = typeof data.narrative === 'string' ? JSON.parse(data.narrative) : data.narrative;
        auditData.questionnaire = data.questionnaire;

        $('#phase-crawl').setAttribute('data-domain', data.domain);
        renderCrawlDetails(data.crawl);
        if (data.scores) renderScoreCards(data.scores);
        $('#crawl-spinner').style.display = 'none';
        $('#crawl-label').textContent = 'audit of ' + data.domain;

        if (data.swot && auditData.narrative) {
          renderNarrative(auditData.narrative);
          renderSWOT(data.swot);
          showPhase('swot');
          if (data.questionnaire && Object.keys(data.questionnaire).length > 0) {
            showPhase('outro');
          } else {
            appendContinueButton();
          }
        }
      })
      .catch(function () {
        $('#crawl-label').textContent = 'could not load audit';
        $('#crawl-spinner').style.display = 'none';
      });
  }
})();
