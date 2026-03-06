// Konami code — Up Up Down Down Left Right Left Right B A
(function () {
  const SEQUENCE = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA',
  ];

  let position = 0;

  document.addEventListener('keydown', function (e) {
    if (e.code === SEQUENCE[position]) {
      position++;

      if (position === SEQUENCE.length) {
        position = 0;
        activate();
      }
    } else {
      position = 0;
    }
  });

  function activate() {
    console.log(
      '%c KONAMI CODE ACTIVATED ',
      'background: #5BF29B; color: #050505; padding: 4px 12px; font-family: monospace; font-size: 14px; font-weight: bold;'
    );
    console.log(
      '%c you found it. /hall awaits. ',
      'color: #5BF29B; font-family: monospace; font-size: 11px;'
    );

    // Visual flip
    document.body.style.transition = 'transform 0.6s ease';
    document.body.style.transform = 'rotate(180deg)';

    setTimeout(function () {
      document.body.style.transform = 'rotate(0deg)';
    }, 3000);

    // Navigate to hall after flip
    setTimeout(function () {
      window.location.href = '/hall';
    }, 1500);
  }
})();
