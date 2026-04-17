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

  // Carousel — init all on page with autoplay
  function initCarousel(slidesEl, dotsEl, prevBtn, nextBtn) {
    if (!slidesEl || !dotsEl || !prevBtn || !nextBtn) return;
    var count = slidesEl.children.length;
    if (count < 2) return;
    var idx = 0;
    var timer = null;
    var INTERVAL = 4000;

    for (var i = 0; i < count; i++) {
      var d = document.createElement('button');
      d.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', 'Slide ' + (i + 1));
      (function (n) { d.addEventListener('click', function () { userGo(n); }); })(i);
      dotsEl.appendChild(d);
    }

    function go(n) {
      idx = (n + count) % count;
      slidesEl.style.transform = 'translateX(-' + (idx * 100) + '%)';
      dotsEl.querySelectorAll('.carousel-dot').forEach(function (d, i) {
        d.classList.toggle('active', i === idx);
      });
    }

    function userGo(n) {
      go(n);
      resetAutoplay();
    }

    function startAutoplay() {
      timer = setInterval(function () { go(idx + 1); }, INTERVAL);
    }

    function resetAutoplay() {
      clearInterval(timer);
      startAutoplay();
    }

    prevBtn.addEventListener('click', function () { userGo(idx - 1); });
    nextBtn.addEventListener('click', function () { userGo(idx + 1); });
    startAutoplay();
  }

  initCarousel(
    document.getElementById('carouselSlides'),
    document.getElementById('carouselDots'),
    document.getElementById('carouselPrev'),
    document.getElementById('carouselNext')
  );
  initCarousel(
    document.getElementById('carouselSlides2'),
    document.getElementById('carouselDots2'),
    document.getElementById('carouselPrev2'),
    document.getElementById('carouselNext2')
  );

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
