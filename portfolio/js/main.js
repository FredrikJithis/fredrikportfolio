/* ============================================
   MAIN.JS — Portfolio animations & interactions
   ============================================ */

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ----------------------------------------
     SPLIT HERO NAME INTO CHARACTERS
     ---------------------------------------- */
  const heroTextEl = document.querySelector(".hero-name__text");
  if (heroTextEl) {
    const text = heroTextEl.textContent;
    heroTextEl.textContent = "";
    text.split("").forEach((char) => {
      const span = document.createElement("span");
      span.classList.add("char");
      span.textContent = char;
      if (char === " ") span.innerHTML = "&nbsp;";
      heroTextEl.appendChild(span);
    });
  }

  /* ----------------------------------------
     REDUCED MOTION — show everything, bail
     ---------------------------------------- */
  if (prefersReducedMotion) {
    document.body.style.opacity = "1";
    return;
  }

  /* ----------------------------------------
     REGISTER GSAP PLUGINS
     ---------------------------------------- */
  gsap.registerPlugin(ScrollTrigger);

  /* ----------------------------------------
     PAGE LOAD TIMELINE
     ---------------------------------------- */
  const loadTl = gsap.timeline({ onComplete: initLenis });

  loadTl
    .to("body", { opacity: 1, duration: 0.3 })
    .from(".hero-name .char", {
      y: 30,
      opacity: 0,
      stagger: 0.035,
      duration: 0.8,
      ease: "power3.out",
    })
    .from(
      ".hero-subtitle",
      { opacity: 0, y: 20, duration: 0.6, ease: "power2.out" },
      "-=0.3"
    )
    .from(
      ".hero-contact",
      { opacity: 0, y: 15, duration: 0.5, ease: "power2.out" },
      "-=0.2"
    )
    .from(
      ".hero-nav",
      { opacity: 0, y: -15, duration: 0.5, ease: "power2.out" },
      "-=0.4"
    );

  /* ----------------------------------------
     LENIS SMOOTH SCROLL
     ---------------------------------------- */
  let lenis;

  function initLenis() {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // Anchor click handling
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        const targetId = anchor.getAttribute("href");
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: 0 });
          closeMobileMenu();
        }
      });
    });

    initSidebar();
    initScrollAnimations();
  }

  /* ----------------------------------------
     SIDEBAR NAVIGATION
     ---------------------------------------- */
  function initSidebar() {
    const heroNav = document.querySelector(".hero-nav");
    const sidebar = document.querySelector(".sidebar");
    const isDesktop = window.innerWidth > 1024;

    if (!isDesktop || !heroNav || !sidebar) return;

    const sidebarLinks = sidebar.querySelectorAll("a");

    ScrollTrigger.create({
      trigger: "#projects",
      start: "top 90%",
      onEnter: () => activateSidebar(heroNav, sidebar, sidebarLinks),
      onLeaveBack: () => deactivateSidebar(heroNav, sidebar, sidebarLinks),
    });
  }

  function activateSidebar(heroNav, sidebar, sidebarLinks) {
    document.body.classList.add("sidebar-active");

    // Fade out hero nav
    gsap.to(heroNav, {
      opacity: 0,
      duration: 0.25,
      ease: "power2.inOut",
    });

    // Show sidebar
    sidebar.classList.add("is-active");
    sidebar.setAttribute("aria-hidden", "false");
    sidebarLinks.forEach((link) => link.setAttribute("tabindex", "0"));

    gsap.fromTo(
      sidebar,
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.6, ease: "power3.inOut" }
    );

    gsap.fromTo(
      ".sidebar__link",
      { opacity: 0, x: -8 },
      {
        opacity: 1,
        x: 0,
        stagger: 0.06,
        duration: 0.35,
        ease: "power2.out",
        delay: 0.15,
      }
    );

    gsap.fromTo(
      ".sidebar__logo",
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: "power2.out", delay: 0.1 }
    );

    // Shift main content
    gsap.to("main", {
      paddingLeft: 72,
      duration: 0.6,
      ease: "power3.inOut",
    });
  }

  function deactivateSidebar(heroNav, sidebar, sidebarLinks) {
    document.body.classList.remove("sidebar-active");

    // Hide sidebar
    gsap.to(sidebar, {
      opacity: 0,
      x: -30,
      duration: 0.35,
      ease: "power3.inOut",
      onComplete: () => {
        sidebar.classList.remove("is-active");
        sidebar.setAttribute("aria-hidden", "true");
        sidebarLinks.forEach((link) => link.setAttribute("tabindex", "-1"));
      },
    });

    // Show hero nav again
    gsap.to(heroNav, {
      opacity: 1,
      duration: 0.4,
      ease: "power2.inOut",
      delay: 0.1,
    });

    // Reset main padding
    gsap.to("main", {
      paddingLeft: 0,
      duration: 0.6,
      ease: "power3.inOut",
    });
  }

  // Resize handler
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      ScrollTrigger.refresh();
      if (window.innerWidth <= 1024) {
        const sidebar = document.querySelector(".sidebar");
        const heroNav = document.querySelector(".hero-nav");
        if (sidebar) {
          sidebar.classList.remove("is-active");
          sidebar.setAttribute("aria-hidden", "true");
          gsap.set(sidebar, { opacity: 0 });
        }
        if (heroNav) gsap.set(heroNav, { opacity: 1 });
        document.body.classList.remove("sidebar-active");
        gsap.set("main", { paddingLeft: 0 });
      }
    }, 200);
  });

  /* ----------------------------------------
     MOBILE MENU
     ---------------------------------------- */
  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.querySelector(".mobile-menu");
  const mobileClose = document.querySelector(".mobile-menu__close");
  const mobileLinks = document.querySelectorAll(".mobile-menu__link");

  function openMobileMenu() {
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    hamburger.setAttribute("aria-expanded", "true");

    if (lenis) lenis.stop();

    gsap.fromTo(
      mobileMenu,
      { opacity: 0 },
      { opacity: 1, visibility: "visible", duration: 0.3, ease: "power2.out" }
    );

    gsap.fromTo(
      ".mobile-menu__link",
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.5,
        ease: "power3.out",
        delay: 0.1,
      }
    );

    setTimeout(() => mobileLinks[0]?.focus(), 300);
  }

  function closeMobileMenu() {
    if (!mobileMenu || !mobileMenu.classList.contains("is-open")) return;

    gsap.to(mobileMenu, {
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        mobileMenu.classList.remove("is-open");
        mobileMenu.setAttribute("aria-hidden", "true");
        mobileMenu.style.visibility = "hidden";
        hamburger.setAttribute("aria-expanded", "false");
        if (lenis) lenis.start();
      },
    });
  }

  if (hamburger) {
    hamburger.addEventListener("click", () => {
      if (mobileMenu.classList.contains("is-open")) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  if (mobileClose) {
    mobileClose.addEventListener("click", closeMobileMenu);
  }

  mobileLinks.forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileMenu?.classList.contains("is-open")) {
      closeMobileMenu();
      hamburger?.focus();
    }
  });

  /* ----------------------------------------
     SCROLL ANIMATIONS
     ---------------------------------------- */
  function initScrollAnimations() {
    // Featured project cards
    gsap.utils.toArray(".projects .project-card").forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 70,
        duration: 0.9,
        ease: "power2.out",
        delay: i * 0.12,
      });
    });

    // Other Work cards
    gsap.utils.toArray(".other-work .project-card").forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: "power2.out",
        delay: i * 0.1,
      });
    });

    // About name lines
    gsap.utils.toArray(".about__name-line").forEach((line, i) => {
      gsap.from(line, {
        scrollTrigger: {
          trigger: line,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        x: -100,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        delay: i * 0.2,
      });
    });

    // Portrait reveal
    const portraitWrap = document.querySelector(".about__portrait-wrap");
    if (portraitWrap) {
      gsap.set(portraitWrap, { clipPath: "inset(100% 0 0 0)" });
      gsap.to(portraitWrap, {
        scrollTrigger: {
          trigger: portraitWrap,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        clipPath: "inset(0% 0 0 0)",
        duration: 1,
        ease: "power2.out",
      });
    }

    // About bio
    const aboutBio = document.querySelector(".about__bio");
    if (aboutBio) {
      gsap.from(aboutBio, {
        scrollTrigger: {
          trigger: aboutBio,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 35,
        duration: 0.8,
        ease: "power2.out",
      });
    }

    // Timeline entries
    gsap.utils.toArray(".timeline__entry").forEach((entry, i) => {
      gsap.from(entry, {
        scrollTrigger: {
          trigger: entry,
          start: "top 88%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: "power2.out",
        delay: i * 0.08,
      });
    });

    // Section labels
    gsap.utils.toArray(".section__label").forEach((label) => {
      gsap.from(label, {
        scrollTrigger: {
          trigger: label,
          start: "top 88%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 15,
        duration: 0.5,
        ease: "power2.out",
      });
    });

    // Footer
    const footerContent = document.querySelector(".footer__content");
    if (footerContent) {
      gsap.from(footerContent, {
        scrollTrigger: {
          trigger: footerContent,
          start: "top 88%",
          toggleActions: "play none none none",
        },
        opacity: 0,
        y: 35,
        duration: 0.8,
        ease: "power2.out",
      });
    }
  }

  /* ----------------------------------------
     IMAGE HOVER — GSAP scale
     ---------------------------------------- */
  document.querySelectorAll(".project-card__link").forEach((card) => {
    const img = card.querySelector(".project-card__image");
    if (!img) return;

    card.addEventListener("mouseenter", () => {
      gsap.to(img, { scale: 1.03, duration: 0.6, ease: "power1.out" });
    });

    card.addEventListener("mouseleave", () => {
      gsap.to(img, { scale: 1, duration: 0.6, ease: "power1.out" });
    });
  });
})();
