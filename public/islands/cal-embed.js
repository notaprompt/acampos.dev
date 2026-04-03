(function() {
  if (window.__calEmbedInit) return;
  window.__calEmbedInit = true;

  var links = document.querySelectorAll('[data-cal-link]');
  if (!links.length) return;

  // Load Cal.com embed script
  var script = document.createElement('script');
  script.src = 'https://app.cal.com/embed/embed.js';
  script.async = true;
  script.onload = function() {
    if (typeof Cal === 'undefined') return;
    Cal('init', { origin: 'https://cal.com' });
    Cal('ui', {
      styles: { branding: { brandColor: '#b8965a' } },
      hideEventTypeDetails: false,
      layout: 'month_view',
    });
  };
  document.head.appendChild(script);

  // Make links clickable
  links.forEach(function(el) {
    el.style.cursor = 'pointer';
    el.addEventListener('click', function(e) {
      e.preventDefault();
      var calLink = el.getAttribute('data-cal-link');
      if (typeof Cal !== 'undefined') {
        Cal('openModal', { calLink: calLink });
      } else {
        window.open('https://cal.com/' + calLink, '_blank');
      }
    });
  });
})();
