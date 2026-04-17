(function () {
  'use strict';

  // Progress bar
  var prog = document.getElementById('caseProgress');
  if (prog) {
    window.addEventListener('scroll', function () {
      var pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
      prog.style.width = pct + '%';
    }, { passive: true });
  }

  // Back bar scroll shadow
  var bar = document.getElementById('caseBar');
  if (bar) {
    window.addEventListener('scroll', function () {
      bar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  // Carousel
  var slides = document.getElementById('carouselSlides');
  var dotsWrap = document.getElementById('carouselDots');
  var prev = document.getElementById('carouselPrev');
  var next = document.getElementById('carouselNext');
  if (slides && dotsWrap && prev && next) {
    var count = slides.children.length;
    var idx = 0;
    for (var i = 0; i < count; i++) {
      var d = document.createElement('button');
      d.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', 'Slide ' + (i + 1));
      (function (n) {
        d.addEventListener('click', function () { go(n); });
      })(i);
      dotsWrap.appendChild(d);
    }
    function go(n) {
      idx = (n + count) % count;
      slides.style.transform = 'translateX(-' + (idx * 100) + '%)';
      dotsWrap.querySelectorAll('.carousel-dot').forEach(function (d, i) {
        d.classList.toggle('active', i === idx);
      });
    }
    prev.addEventListener('click', function () { go(idx - 1); });
    next.addEventListener('click', function () { go(idx + 1); });
  }

  // Ensure page transition overlay is always hidden (prevents stuck overlay on bfcache restore)
  var overlay = document.getElementById('pageTransition');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.opacity = '0';
  }
  window.addEventListener('pageshow', function () {
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.opacity = '0';
    }
  });

  // Dark mode — respect main page setting
  var saved = localStorage.getItem('darkMode');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'true' || (saved === null && prefersDark)) {
    document.body.classList.add('dark');
  }
})();
