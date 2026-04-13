/* ============================================
   main.js — Hand-rolled scroll-driven animations
   Adapted from olledavegard.com for "fredrikjohansson"
   No GSAP, no Lenis — pure rAF + lerp + easing
   ============================================ */

(function () {
  'use strict';

  /* ── Reduced motion bail ─── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('scrolled');
    var sw = document.getElementById('sidebarWordmark');
    if (sw) sw.style.opacity = '1';
    var dn = document.getElementById('desktopNav');
    if (dn) dn.style.opacity = '1';
    return;
  }

  /* ============================================
     EASING UTILITIES
     ============================================ */

  /** Linear interpolation: blend a→b by factor t */
  function lerp(a, b, t) { return a + (b - a) * t; }

  /** Quadratic ease-in-out: smooth start & end */
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  /** Spring easing: slight overshoot, organic settle */
  function easeSpring(t) {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -8 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
  }

  /* ============================================
     DOM REFERENCES
     ============================================ */
  var psbBar      = document.getElementById('preScrollBar');
  var psbWordmark = document.getElementById('psbWordmark');
  var psbNav      = document.getElementById('preScrollNav');
  var desktopNav  = document.getElementById('desktopNav');
  var sidebarWm   = document.getElementById('sidebarWordmark');
  var aboutLeft   = document.querySelector('.about-left');
  var aboutHeading = document.getElementById('aboutHeading');
  var progBar     = document.getElementById('prog');

  /* Suffixes: "redrik" and "ohansson" */
  var sufF      = document.getElementById('suf-f');
  var sufJ      = document.getElementById('suf-j');
  var charsF    = sufF ? Array.from(sufF.querySelectorAll('.wm-c')) : [];
  var charsJ    = sufJ ? Array.from(sufJ.querySelectorAll('.wm-c')) : [];
  var spaces    = psbWordmark ? Array.from(psbWordmark.querySelectorAll('.wm-space')) : [];

  /* ============================================
     CACHE NATURAL WIDTHS
     Measured before any collapse, re-measured on resize
     ============================================ */
  var widths = {};

  function cacheWidths() {
    if (sufF) { sufF.style.width = 'auto'; sufF.style.overflow = 'visible'; }
    if (sufJ) { sufJ.style.width = 'auto'; sufJ.style.overflow = 'visible'; }
    spaces.forEach(function (s) { s.style.width = '0.28em'; });

    widths.sufF  = sufF ? sufF.scrollWidth : 0;
    widths.sufJ  = sufJ ? sufJ.scrollWidth : 0;
    widths.space = spaces.length ? spaces[0].offsetWidth : 0;
  }

  /* ============================================
     PHASE THRESHOLDS
     PHASE_START: scroll-Y where collapse begins
     PHASE_END:   scroll-Y where collapse completes → "scrolled" snaps in
     ============================================ */
  var PHASE_START = 80;

  function PHASE_END() {
    var about = document.getElementById('about');
    return about ? about.offsetTop * 0.18 : 500;
  }

  /* ============================================
     STATE
     ============================================ */
  var currentY = 0, targetY = 0, lastScrollY = window.scrollY;
  var navClones = [], navSrcRects = [], navDstRects = [], navRectsReady = false;
  var clones = [], flipRafId = null;
  var laggedP    = [0, 0];
  var laggedTilt = [0, 0];
  var LAG = 0.03, TILT_LAG = 0.5;
  var staggerDelay = [0, 0.1];

  /* ============================================
     COLLAPSE LETTERS
     Shrinks a suffix container and fades its chars
     p ∈ [0,1] — 0 = fully expanded, 1 = fully collapsed
     ============================================ */
  function collapseLetters(suffix, chars, naturalW, p) {
    if (!suffix) return;
    suffix.style.overflow = 'visible';
    suffix.style.width = naturalW * (1 - p) + 'px';
    chars.forEach(function (c, i) {
      /* Staggered threshold: last char fades first */
      var threshold = (chars.length - i) / chars.length;
      c.style.opacity   = p >= threshold ? '0' : '1';
      c.style.transform  = 'none';
      c.style.transition = 'none';
    });
  }

  /* ============================================
     MAIN HEADER UPDATE (called on every scroll)
     Drives the wordmark collapse, position interpolation,
     nav clone fly, and gradient fade.
     ============================================ */
  function updateHeader() {
    if (window.innerWidth <= 700) return;

    /* Raw scroll progress mapped to 0–1 */
    var p = Math.max(0, Math.min(1,
      (window.scrollY - PHASE_START) / (PHASE_END() - PHASE_START)
    ));
    var e = easeInOut(p);

    /* ── 1. Collapse suffix letters ──
       "ohansson" (sufJ) collapses first (0–0.5 of p),
       then space collapses (0.2–0.7),
       then "redrik" (sufF) collapses last (0.4–1.0).
       This mirrors the 3-phase stagger in the reference. */
    var pJ = Math.min(1, p / 0.5);
    collapseLetters(sufJ, charsJ, widths.sufJ, pJ);

    var pF = Math.min(1, Math.max(0, (p - 0.4) / 0.6));
    collapseLetters(sufF, charsF, widths.sufF, pF);

    /* Space collapse: starts at 20%, done by 70% */
    if (spaces.length) {
      var spP = Math.min(1, Math.max(0, (p - 0.2) / 0.5));
      spaces[0].style.width = widths.space * (1 - spP) + 'px';
    }

    /* Keep anchor letters visible */
    var wmF = document.getElementById('wm-f');
    var wmJ = document.getElementById('wm-j');
    if (wmF) wmF.style.opacity = '1';
    if (wmJ) wmJ.style.opacity = '1';

    /* ── 2. Translate + scale wordmark toward sidebar position ── */
    psbWordmark.style.transform       = 'none';
    psbWordmark.style.transformOrigin  = 'top left';
    var wmRect    = psbWordmark.getBoundingClientRect();
    var largeSz   = parseFloat(getComputedStyle(psbWordmark).fontSize);
    var sidebarSz = parseFloat(getComputedStyle(sidebarWm).fontSize);
    var scale     = lerp(1, sidebarSz / largeSz, e);
    var destX     = 44;
    var destY     = 28;
    psbWordmark.style.transform = p > 0
      ? 'translate(' + ((destX - wmRect.left) * e) + 'px,' + ((destY - wmRect.top) * e) + 'px) scale(' + scale + ')'
      : '';

    /* ── 3. Nav clones: fly from horizontal → vertical sidebar ── */
    if (p <= 0 || document.body.classList.contains('scrolled')) {
      psbNav.style.opacity       = '';
      psbNav.style.pointerEvents = '';
      navClones.forEach(function (c) { c.remove(); });
      navClones = [];
      navRectsReady = false;
      desktopNav.style.opacity    = '';
      desktopNav.style.position   = '';
      desktopNav.style.left       = '';
      desktopNav.style.top        = '';
    } else {
      if (!navRectsReady) captureNavRects();
      psbNav.style.opacity       = '0';
      psbNav.style.pointerEvents = 'none';
      desktopNav.style.opacity    = '0';
      desktopNav.style.position   = 'fixed';
      desktopNav.style.left       = '-9999px';
      desktopNav.style.top        = '-9999px';
      navClones.forEach(function (clone, i) {
        var src     = navSrcRects[i];
        var dst     = navDstRects[i];
        var stagger = i * 0.05;
        var linkP   = Math.max(0, Math.min(1, (p - stagger) / (1 - stagger)));
        var linkE   = easeInOut(linkP);
        clone.style.left    = lerp(src.left, dst.left, linkE) + 'px';
        clone.style.top     = lerp(src.top,  dst.top,  linkE) + 'px';
        clone.style.opacity = '1';
      });
    }

    /* ── 4. Fade background gradient ── */
    psbBar.style.setProperty('--bg-fade', String(1 - e));
  }

  /* ============================================
     CAPTURE NAV RECTS
     Measures source (horizontal) and destination (sidebar vertical)
     positions for the flying nav-link clones.
     ============================================ */
  function captureNavRects() {
    var srcLinks = Array.from(psbNav.querySelectorAll('.nav-link'));

    /* Temporarily position sidebar nav to measure destinations */
    desktopNav.style.position   = 'fixed';
    desktopNav.style.left       = '44px';
    desktopNav.style.top        = '-9999px';
    desktopNav.style.opacity    = '0';
    desktopNav.style.visibility = 'visible';
    var dstLinks = Array.from(desktopNav.querySelectorAll('.nav-link'));

    navSrcRects = srcLinks.map(function (l) {
      var r = l.getBoundingClientRect();
      return { left: r.left, top: r.top };
    });

    var sidebarSz  = parseFloat(getComputedStyle(sidebarWm).fontSize);
    var destNavTop  = 28 + sidebarSz + 20;
    var firstDstTop = dstLinks[0].getBoundingClientRect().top;

    navDstRects = dstLinks.map(function (l) {
      var r = l.getBoundingClientRect();
      return { left: 44, top: destNavTop + (r.top - firstDstTop) };
    });

    /* Clean up temporary positioning */
    desktopNav.style.position   = '';
    desktopNav.style.left       = '';
    desktopNav.style.top        = '';
    desktopNav.style.opacity    = '';
    desktopNav.style.visibility = '';

    /* Remove old clones, create new ones */
    navClones.forEach(function (c) { c.remove(); });
    navClones = srcLinks.map(function (link, i) {
      var clone = document.createElement('div');
      clone.className   = 'nav-fly-clone';
      clone.textContent = link.textContent;
      clone.style.left  = navSrcRects[i].left + 'px';
      clone.style.top   = navSrcRects[i].top + 'px';
      clone.style.opacity = '0';
      clone.style.cursor  = 'pointer';
      clone.addEventListener('click', function () {
        if (link.id === 'contactLink') flashContact();
        else if (link.getAttribute('href') === '#projects') scrollToSection('projects');
        else if (link.getAttribute('href') === '#about') scrollToSection('about');
      });
      document.body.appendChild(clone);
      return clone;
    });

    navRectsReady = true;
  }

  /* ============================================
     SCROLLED STATE — ENTER / LEAVE
     Snaps the grid to 3-column layout, shows sidebar,
     triggers flip-in animation on sidebar nav links.
     ============================================ */
  function updateScrolledState() {
    if (window.innerWidth <= 700) return;
    var shouldBeScrolled = window.scrollY >= PHASE_END();

    if (shouldBeScrolled && !document.body.classList.contains('scrolled')) {
      document.body.classList.add('scrolled');
      navClones.forEach(function (c) { c.remove(); });
      navClones = []; navRectsReady = false;
      psbWordmark.style.transform = '';
      psbNav.style.opacity = '';
      desktopNav.style.position = '';
      desktopNav.style.left = '';
      desktopNav.style.top = '';
      desktopNav.style.opacity = '';
      desktopNav.querySelectorAll('.nav-link').forEach(function (link) {
        link.style.transform = '';
        link.style.opacity = '';
      });
      sidebarWm.style.opacity = '1';
      /* Flip-in sidebar nav links with stagger */
      desktopNav.querySelectorAll('.nav-link').forEach(function (link, i) {
        link.classList.remove('flip-in');
        setTimeout(function () { link.classList.add('flip-in'); }, i * 80);
      });
    } else if (!shouldBeScrolled && document.body.classList.contains('scrolled')) {
      document.body.classList.remove('scrolled');
      navClones.forEach(function (c) { c.remove(); });
      navClones = []; navRectsReady = false;
      sidebarWm.style.opacity = '0';
      psbWordmark.style.transform = '';
      psbNav.style.opacity = '';
      psbNav.style.pointerEvents = '';
      desktopNav.style.position = '';
      desktopNav.style.left = '';
      desktopNav.style.top = '';
      desktopNav.style.opacity = '';
      desktopNav.querySelectorAll('.nav-link').forEach(function (link) {
        link.style.transform = '';
        link.style.opacity = '';
        link.classList.remove('flip-in');
      });
    }
  }

  /* ============================================
     ACTIVE NAV HIGHLIGHTING
     ============================================ */
  function updateNav() {
    var offset   = 80;
    var about    = document.getElementById('about');
    var aboutTop = about ? about.offsetTop : Infinity;
    var cur      = window.scrollY >= aboutTop - offset ? 'about' : 'projects';
    document.querySelectorAll('.nav-link').forEach(function (l) {
      var href = l.getAttribute('href');
      l.classList.toggle('active', href === '#' + cur);
    });
  }

  /* ============================================
     SMOOTH SCROLL HELPER
     ============================================ */
  function scrollToSection(id) {
    var target = document.getElementById(id);
    if (!target) return;
    var offset = window.innerWidth <= 700 ? 56 : 24;
    var top = target.getBoundingClientRect().top + window.scrollY - offset;
    // In pre-scroll state, .col-main still has its large top padding (200px),
    // which collapses to 60px once body.scrolled activates. Compensate so the
    // target lands correctly after the transition.
    if (!document.body.classList.contains('scrolled') && window.innerWidth > 700) {
      top -= 140;
    }
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  /* ============================================
     CONTACT FLASH
     Border outline pulses around the contact block
     ============================================ */
  function flashContact() {
    ['cBlock', 'cBlockSidebar'].forEach(function (id) {
      var b = document.getElementById(id);
      if (!b) return;
      b.classList.remove('flash');
      void b.offsetWidth;
      b.classList.add('flash');
      setTimeout(function () { b.classList.remove('flash'); }, 1000);
    });
  }

  /* ============================================
     NAV CLICK HANDLERS
     ============================================ */
  document.querySelectorAll('.nav-link[href^="#"]').forEach(function (link) {
    var hash = link.getAttribute('href');
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (hash === '#contact' || link.id === 'contactLink' || link.id === 'sidebarContactLink') {
        flashContact();
        if (window.innerWidth <= 700) {
          var mc = document.querySelector('.mobile-contact');
          if (mc) mc.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (hash === '#projects') {
        scrollToSection('projects');
      } else if (hash === '#about') {
        scrollToSection('about');
      }
    });
  });

  /* ============================================
     FLIP ANIMATION — Sidebar wordmark → About heading
     2 clones ("f" → "fredrik", "j" → "johansson") fly
     from the sidebar to the about heading with spring easing.
     ============================================ */
  function buildFlipClones() {
    clones.forEach(function (c) { c.remove(); });
    clones = [];
    laggedP    = [0, 0];
    laggedTilt = [0, 0];

    if (!sidebarWm || !aboutHeading) return;
    var wmFontSize = parseFloat(getComputedStyle(sidebarWm).fontSize);
    var ahFontSize = parseFloat(getComputedStyle(aboutHeading).fontSize);

    ['f', 'j'].forEach(function (letter) {
      var clone = document.createElement('div');
      clone.className    = 'flip-clone';
      clone.textContent  = letter;
      clone.dataset.wmSize = wmFontSize;
      clone.dataset.ahSize = ahFontSize;
      clone.style.opacity  = '0';
      document.body.appendChild(clone);
      clones.push(clone);
    });
  }

  /** Raw flip progress 0→1 based on about section approach */
  function getRawFlipProgress() {
    var about = document.getElementById('about');
    if (!about) return 0;
    var aboutTop  = about.getBoundingClientRect().top + window.scrollY;
    var flipStart = aboutTop - window.innerHeight;
    var flipEnd   = aboutTop - window.innerHeight * 0.1;
    return Math.max(0, Math.min(1,
      (window.scrollY - flipStart) / (flipEnd - flipStart)
    ));
  }

  /** rAF loop for the flip animation */
  function renderFlip() {
    if (window.innerWidth <= 700 || !clones.length) { flipRafId = null; return; }

    var rawProgress = getRawFlipProgress();
    var isActive    = rawProgress > 0 && rawProgress < 1;
    var isDone      = rawProgress >= 1;

    var tgtIds = ['ah-fredrik', 'ah-johansson'];
    var words  = ['fredrik', 'johansson'];

    aboutHeading.classList.toggle('flip-active', !isDone);
    aboutHeading.style.opacity = isDone ? '1' : '0';
    sidebarWm.style.opacity    = (isActive || isDone) ? '0' : '1';

    var stillMoving = false;
    clones.forEach(function (clone, i) {
      var targetP = Math.max(0, Math.min(1,
        (rawProgress - staggerDelay[i]) / (1 - staggerDelay[i])
      ));
      var pDiff = targetP - laggedP[i];
      laggedP[i]    += pDiff * LAG;
      laggedTilt[i] += ((1 - laggedP[i]) * (i % 2 === 0 ? -7 : 5) - laggedTilt[i]) * TILT_LAG;

      if (Math.abs(pDiff) > 0.0001) stillMoving = true;

      if (!isActive && Math.abs(pDiff) < 0.0001) {
        clone.style.opacity = '0';
        return;
      }

      var easedP = easeSpring(laggedP[i]);
      var srcR   = sidebarWm.getBoundingClientRect();
      var tgtEl  = document.getElementById(tgtIds[i]);
      if (!tgtEl) return;
      var tgtR   = tgtEl.getBoundingClientRect();

      /* Swap text: single letter → full word at 65% progress */
      clone.textContent = laggedP[i] > 0.65 ? words[i] : ['f', 'j'][i];

      /* Interpolate position, size, rotation */
      clone.style.left     = lerp(srcR.left, tgtR.left, easedP) + 'px';
      clone.style.top      = lerp(srcR.top + i * 28, tgtR.top, easedP) + 'px';
      clone.style.fontSize = lerp(
        parseFloat(clone.dataset.wmSize),
        parseFloat(clone.dataset.ahSize),
        easedP
      ) + 'px';
      clone.style.opacity   = rawProgress > 0 ? '1' : '0';
      clone.style.transform = 'rotate(' + laggedTilt[i] + 'deg)';
    });

    flipRafId = (stillMoving || isActive) ? requestAnimationFrame(renderFlip) : null;
  }

  function kickFlipRaf() {
    if (!flipRafId) flipRafId = requestAnimationFrame(renderFlip);
  }

  /* ============================================
     ABOUT-LEFT PARALLAX
     Subtle vertical shift driven by scroll velocity
     ============================================ */
  function animateLeft() {
    if (window.innerWidth <= 700) {
      if (aboutLeft) aboutLeft.style.transform = '';
      requestAnimationFrame(animateLeft);
      return;
    }
    currentY += (targetY - currentY) * 0.006;
    if (aboutLeft) aboutLeft.style.transform = 'translateY(' + currentY + 'px)';
    requestAnimationFrame(animateLeft);
  }

  /* ============================================
     FOOTER WORDMARK HOVER EXPAND
     On hover, suffixes expand from width:0 to natural width
     ============================================ */
  function initFooterWm() {
    var fwSufF = document.getElementById('fwSufF');
    var fwSufJ = document.getElementById('fwSufJ');
    var fwSp   = document.getElementById('fwSp');
    if (!fwSufF || !fwSufJ || !fwSp) return;

    /* Measure natural widths */
    fwSufF.style.width = 'auto'; var wF = fwSufF.scrollWidth;
    fwSufJ.style.width = 'auto'; var wJ = fwSufJ.scrollWidth;
    fwSp.style.width   = 'auto'; var wSp = fwSp.scrollWidth;
    fwSufF.style.width = '0';
    fwSufJ.style.width = '0';
    fwSp.style.width   = '0';

    var footerWm = document.querySelector('.footer-wm');
    if (!footerWm) return;

    footerWm.addEventListener('mouseenter', function () {
      fwSufF.style.width = wF + 'px';
      fwSufJ.style.width = wJ + 'px';
      fwSp.style.width   = wSp + 'px';
    });
    footerWm.addEventListener('mouseleave', function () {
      fwSufF.style.width = '0';
      fwSufJ.style.width = '0';
      fwSp.style.width   = '0';
    });
  }

  /* ============================================
     PROGRESS BAR
     ============================================ */
  function updateProgressBar() {
    if (!progBar) return;
    var pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100;
    progBar.style.width = pct + '%';
  }

  /* ============================================
     SCROLL EVENT — orchestrates everything
     ============================================ */
  window.addEventListener('scroll', function () {
    updateProgressBar();

    var delta = window.scrollY - lastScrollY;
    targetY += delta * 0.01;
    lastScrollY = window.scrollY;

    updateHeader();
    updateScrolledState();
    updateNav();
    kickFlipRaf();
  }, { passive: true });

  /* ============================================
     RESIZE — recalculate
     ============================================ */
  window.addEventListener('resize', function () {
    cacheWidths();
    buildFlipClones();
    updateHeader();
    updateScrolledState();
    kickFlipRaf();
  });

  /* ============================================
     STAGGERED CARD ENTRANCE (IntersectionObserver)
     ============================================ */
  function initCardStagger() {
    var cards = document.querySelectorAll('.project-card');
    if (!cards.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var idx = Array.from(cards).indexOf(entry.target);
          var row = Math.floor(idx / 2);
          var col = idx % 2;
          var delay = row * 120 + col * 80;
          setTimeout(function () {
            entry.target.classList.add('in-view');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    cards.forEach(function (card) { observer.observe(card); });
  }

  /* ============================================
     PAGE TRANSITION
     Smooth crossfade when navigating to case pages
     ============================================ */
  function initPageTransition() {
    var overlay = document.getElementById('pageTransition');
    if (!overlay) return;

    document.querySelectorAll('a.project-card[href]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var href = link.getAttribute('href');
        if (!href || href.startsWith('#')) return;
        e.preventDefault();
        overlay.classList.add('active');
        setTimeout(function () {
          window.location.href = href;
        }, 400);
      });
    });

    // Fade in when arriving from a case page
    if (overlay.classList.contains('active')) {
      requestAnimationFrame(function () {
        overlay.classList.remove('active');
      });
    }
  }

  /* ============================================
     DARK MODE TOGGLE
     ============================================ */
  function initDarkMode() {
    var saved = localStorage.getItem('darkMode');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (saved === 'true' || (saved === null && prefersDark)) {
      document.body.classList.add('dark');
    }

    var toggles = document.querySelectorAll('.dark-toggle');
    toggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.body.classList.toggle('dark');
        var isDark = document.body.classList.contains('dark');
        localStorage.setItem('darkMode', isDark);
      });
    });
  }

  /* ============================================
     INIT — after fonts are ready
     ============================================ */
  document.fonts.ready.then(function () {
    cacheWidths();
    updateHeader();
    updateScrolledState();
    updateNav();
    buildFlipClones();
    kickFlipRaf();
    initFooterWm();
    animateLeft();
    initCardStagger();
    initPageTransition();
    initDarkMode();
  });

})();
