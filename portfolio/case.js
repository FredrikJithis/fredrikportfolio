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

  // Hide legacy overlay (never used, prevent bfcache issues)
  var overlay = document.getElementById('pageTransition');
  if (overlay) { overlay.style.display = 'none'; }

  // Page-enter animation — only on forward navigation
  var isBack = false;
  try {
    var navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length && navEntries[0].type === 'back_forward') isBack = true;
  } catch (e) {}

  if (!isBack) {
    document.body.classList.add('page-enter');
    var wrap = document.querySelector('.case-wrap');
    if (wrap) {
      wrap.addEventListener('animationend', function () {
        document.body.classList.remove('page-enter');
      }, { once: true });
    }
  }

  // On bfcache restore, never show animation
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      document.body.classList.remove('page-enter');
    }
    if (overlay) { overlay.style.display = 'none'; }
  });

  // Dark mode — respect main page setting
  var saved = localStorage.getItem('darkMode');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved === 'true' || (saved === null && prefersDark)) {
    document.body.classList.add('dark');
  }
})();
