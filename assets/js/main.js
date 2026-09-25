/* Atlas Automations: interaction and motion.
   Vanilla JS on GSAP 3 (ScrollTrigger, SplitText) and Lenis. The page reads
   fine without any of it: every animated element starts from, or falls back
   to, its final state. */
(function () {
  "use strict";
  window.__atlasReady = true;

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (!hasGSAP) root.classList.remove("js");

  // Portrait phones get their own layout for the hero, story and load scenes;
  // laptops, tablets and landscape phones keep the original design.
  var PORTRAIT = "(max-width: 900px) and (orientation: portrait)";
  var isPortrait = function () { return window.matchMedia(PORTRAIT).matches; };

  /* ------------------------------------------------------------------
     Smooth scroll
     ------------------------------------------------------------------ */
  var lenis = null;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
  if (hasGSAP && window.SplitText) gsap.registerPlugin(SplitText);

  if (hasGSAP && !reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(el) {
    var target = el === document.body ? 0 : el;
    if (lenis) lenis.scrollTo(target, { duration: 1.6, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }

  /* ------------------------------------------------------------------
     Nav: hide on the way down, return on the way up
     ------------------------------------------------------------------ */
  var nav = $(".nav");
  var toggle = $(".nav__toggle");
  var menu = $("#menu");
  var menuOpen = false;
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 24);
    if (y > lastY + 4 && y > 520 && !menuOpen) nav.classList.add("is-hidden");
    else if (y < lastY - 4) nav.classList.remove("is-hidden");
    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  nav.addEventListener("focusin", function () { nav.classList.remove("is-hidden"); });
  onScroll();

  function setMenu(open, returnFocus) {
    menuOpen = open;
    toggle.setAttribute("aria-expanded", String(open));
    $(".nav__toggle-label", toggle).textContent = open ? "Close" : "Menu";
    menu.classList.toggle("is-open", open);
    menu.inert = !open;
    // The menu covers the page, so the page behind it must not take focus
    $$("main, footer").forEach(function (el) { el.inert = open; });
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) { nav.classList.remove("is-hidden"); setTimeout(function () { $("a", menu).focus(); }, 60); }
    else if (returnFocus) toggle.focus();
  }
  toggle.addEventListener("click", function () { setMenu(!menuOpen, true); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menuOpen) setMenu(false, true); });

  // In-page links go through Lenis so they glide instead of jumping.
  // Delegated, so links created later (the story captions) behave the same.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href");
    if (id === "#main" || id === "#") return;
    var el = id === "#top" ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    scrollToTarget(el);
    // replace, not push: Lenis owns scrolling, so Back couldn't restore position anyway
    if (history.replaceState) history.replaceState(null, "", id === "#top" ? location.pathname + location.search : id);
    if (el !== document.body) {
      el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }
  });

  /* ------------------------------------------------------------------
     Video: every clip plays only while it's on screen
     ------------------------------------------------------------------ */
  var videos = $$("video[data-autoplay]");
  var videosPaused = reduce;
  var inView = new Set();

  function canPlay(v) {
    if (videosPaused) return false;
    var screen = v.closest(".screen");
    return !screen || screen.classList.contains("is-active");
  }
  function play(v) {
    if (!canPlay(v)) return;
    if (v.preload !== "auto") v.preload = "auto";
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }
  function refreshVideos() {
    videos.forEach(function (v) { if (inView.has(v) && canPlay(v)) play(v); else v.pause(); });
  }
  // Posters are data-poster so they don't all download on first paint
  var setPoster = function (v) { if (v.dataset.poster && !v.poster) v.poster = v.dataset.poster; };
  if ("IntersectionObserver" in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { inView.add(e.target); play(e.target); }
        else { inView.delete(e.target); e.target.pause(); }
      });
    }, { threshold: 0.2 });
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { setPoster(e.target); pio.unobserve(e.target); } });
    }, { rootMargin: "900px 900px" });
    videos.forEach(function (v) { v.muted = true; vio.observe(v); pio.observe(v); });
  } else {
    videos.forEach(setPoster);
  }
  $$("[data-video-toggle]").forEach(function (btn) {
    var sync = function () {
      btn.setAttribute("aria-pressed", String(videosPaused));
      btn.textContent = videosPaused ? "Play videos" : "Pause videos";
    };
    sync();
    btn.addEventListener("click", function () {
      videosPaused = !videosPaused;
      $$("[data-video-toggle]").forEach(function (b) {
        b.setAttribute("aria-pressed", String(videosPaused));
        b.textContent = videosPaused ? "Play videos" : "Pause videos";
      });
      refreshVideos();
    });
  });

  /* ------------------------------------------------------------------
     Story: the phone follows whichever chapter is in the middle of the screen
     ------------------------------------------------------------------ */
  var story = $(".story");
  var chapters = $$(".chapter");
  var phone = $(".phone--story");
  var screens = $$(".phone--story .screen");
  var clocks = $$("[data-clock]", story);
  var ownerEl = $("[data-owner]", story);
  var realEl = $("[data-real]", story);
  var searchQ = $(".search__q");
  var results = $(".search__results");
  var topResult = $(".result--top");
  var lockScreen = $(".screen--lock");
  var current = null;
  var timers = [];

  // Portrait phones: the chapter text used to scroll over the phone and hide
  // it. Instead, each chapter's card is copied into a caption area under the
  // phone and cross-faded as the chapters change. The originals stay in the
  // page (visually hidden on portrait) so screen readers still get them.
  var captionBox = $(".story__captions");
  var captions = [];
  if (captionBox && chapters.length) {
    chapters.forEach(function (ch) {
      var card = $(".chapter__card", ch).cloneNode(true);
      card.className = "caption";
      $$("a", card).forEach(function (a) { a.setAttribute("tabindex", "-1"); });
      $$("[id]", card).forEach(function (el) { el.removeAttribute("id"); });
      captionBox.appendChild(card);
      captions.push(card);
    });
    story.classList.add("story--captions");
  }

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function showScreen(name) {
    screens.forEach(function (s) {
      var on = s.dataset.screen === name;
      s.classList.toggle("is-active", on);
      if (on) phone.dataset.tone = s.dataset.tone || "dark";
    });
    refreshVideos();
  }

  function runSearch() {
    var q = searchQ.dataset.query;
    searchQ.textContent = "";
    results.classList.remove("is-shown");
    topResult.classList.remove("is-tapped");
    if (reduce) { searchQ.textContent = q; results.classList.add("is-shown"); return; }
    var start = 450, step = 60;
    q.split("").forEach(function (_, i) {
      later(function () { searchQ.textContent = q.slice(0, i + 1); }, start + i * step);
    });
    var typed = start + q.length * step;
    later(function () { results.classList.add("is-shown"); }, typed + 300);
    later(function () { topResult.classList.add("is-tapped"); }, typed + 1700);
    later(function () { showScreen("site"); }, typed + 2300);
  }

  function activate(ch) {
    if (current === ch) return;
    current = ch;
    clearTimers();
    chapters.forEach(function (c, i) {
      c.classList.toggle("is-current", c === ch);
      if (captions[i]) captions[i].classList.toggle("is-current", c === ch);
    });

    var time = ch.dataset.time;
    clocks.forEach(function (c) { c.textContent = time; });
    ownerEl.textContent = ch.dataset.owner;
    realEl.hidden = !ch.hasAttribute("data-real");

    lockScreen.classList.remove("is-playing");
    var name = ch.dataset.screen;
    showScreen(name);
    if (name === "search") runSearch();
    if (name === "lock") { void lockScreen.offsetWidth; lockScreen.classList.add("is-playing"); }
  }

  if (chapters.length) {
    activate(chapters[0]);
    if ("IntersectionObserver" in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) activate(e.target); });
      }, { rootMargin: "-50% 0px -50% 0px" });
      chapters.forEach(function (c) { cio.observe(c); });
    }
  }

  /* ------------------------------------------------------------------
     Everything below needs GSAP
     ------------------------------------------------------------------ */
  if (!hasGSAP) return;

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var timeout = new Promise(function (r) { setTimeout(r, 1500); });
  Promise.race([fontsReady, timeout]).then(init);

  function init() {
    if (reduce) {
      $(".finale").classList.add("is-locked");
      root.classList.remove("js");
      buildWork(false);
      return;
    }

    intro();
    buildHero();
    buildPointer();
    buildNavState();
    buildStoryScrub();
    buildLoad();
    buildServices();
    buildWork(true);
    buildProcess();
    buildFinale();

    // init waits for fonts, so load may already have fired
    if (document.readyState === "complete") ScrollTrigger.refresh();
    else window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  /* ---------- Opening titles: the mark assembles, the words rise ---------- */
  function intro() {
    var hero = $(".hero");
    var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.fromTo(".hero .mark__piece--l", { y: 90, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.4 }, 0.1)
      .fromTo(".hero .mark__piece--r", { y: -90, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.4 }, 0.18)
      .fromTo(".hero .mark__sq", { scale: 0, autoAlpha: 0, transformOrigin: "50% 50%" },
        { scale: 1, autoAlpha: 1, duration: 0.9, ease: "back.out(2.4)" }, 1.0)
      .add(function () { hero.classList.add("is-locked"); }, 0.98)
      // y: 0 matters: GSAP would otherwise keep the CSS start offset as pixels
      .fromTo(".hero__word", { yPercent: 112, y: 0 }, { yPercent: 0, y: 0, duration: 1.3, stagger: 0.1 }, 0.35)
      .fromTo(".hero [data-intro]", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09 }, 0.95)
      .fromTo(".nav", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 1);
  }

  /* ---------- Hero on scroll: the mark opens like a pair of doors ---------- */
  function buildHero() {
    var mm = gsap.matchMedia();
    var mark = $(".hero__mark");

    mm.add("(min-width: 901px)", function () {
      var toCenter = function () { return window.innerWidth / 2 - (mark.offsetLeft + mark.offsetWidth / 2); };
      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: ".hero", start: "top top", end: "+=150%", pin: true, scrub: 0.9, invalidateOnRefresh: true }
      });
      tl.to(".hero__line", { yPercent: -70, autoAlpha: 0, stagger: 0.05, duration: 0.32, ease: "power2.in" }, 0)
        // explicit start values: the intro also fades these, and a refresh
        // mid-intro must not record a half-faded state as "the top"
        .fromTo(".hero__foot", { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -40, duration: 0.24, ease: "power2.in", immediateRender: false }, 0)
        .fromTo(".hero__cue", { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.12, immediateRender: false }, 0)
        .to(".hero__grid", { autoAlpha: 0, duration: 0.4 }, 0)
        .to(mark, { x: toCenter, scale: 1.15, duration: 0.38, ease: "power2.inOut" }, 0.04)
        .to(".hero .mark__sqwrap", { x: 90, y: -140, rotation: 30, autoAlpha: 0, duration: 0.3, ease: "power2.in" }, 0.3)
        .to(".hero .mark__half--l", { x: -330, duration: 0.55, ease: "power3.in" }, 0.4)
        .to(".hero .mark__half--r", { x: 330, duration: 0.55, ease: "power3.in" }, 0.4)
        .to(mark, { scale: 4.4, duration: 0.55, ease: "power2.in" }, 0.4)
        .to(".hero__bg", { scale: 1.35, autoAlpha: 0.5, duration: 0.95 }, 0)
        .fromTo(".hero__scene", { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "power2.out" }, 0.66)
        .to({}, { duration: 0.14 });
    });

    mm.add("(max-width: 900px) and (orientation: landscape)", function () {
      gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 } })
        .to(".hero .mark__half--l", { x: -140, ease: "none" }, 0)
        .to(".hero .mark__half--r", { x: 140, ease: "none" }, 0)
        .to(".hero .mark__sqwrap", { y: -90, autoAlpha: 0, ease: "none" }, 0)
        .to(".hero__content", { y: -80, ease: "none" }, 0);
    });

    // Portrait: the mark sits above the headline, so only the mark moves.
    // Its halves part and fade as it scrolls away; the text stays put.
    mm.add(PORTRAIT, function () {
      gsap.timeline({ scrollTrigger: { trigger: ".hero__mark", start: "top 12%", end: "bottom top", scrub: 0.6 } })
        .to(".hero .mark__half--l", { x: -90, autoAlpha: 0.2, ease: "none" }, 0)
        .to(".hero .mark__half--r", { x: 90, autoAlpha: 0.2, ease: "none" }, 0)
        .to(".hero .mark__sqwrap", { y: -70, autoAlpha: 0, ease: "none" }, 0);
    });
  }

  /* ---------- Hero depth: the mark drifts against the pointer ---------- */
  function buildPointer() {
    if (!window.matchMedia("(pointer: fine) and (min-width: 901px)").matches) return;
    var hero = $(".hero");
    var svg = $(".hero__mark .mark");
    var grid = $(".hero__grid");
    var mx = gsap.quickTo(svg, "x", { duration: 1.2, ease: "power3.out" });
    var my = gsap.quickTo(svg, "y", { duration: 1.2, ease: "power3.out" });
    var gx = gsap.quickTo(grid, "x", { duration: 1.6, ease: "power3.out" });
    var gy = gsap.quickTo(grid, "y", { duration: 1.6, ease: "power3.out" });
    hero.addEventListener("pointermove", function (e) {
      var nx = e.clientX / window.innerWidth - 0.5;
      var ny = e.clientY / window.innerHeight - 0.5;
      mx(nx * -22); my(ny * -16);
      gx(nx * 10); gy(ny * 8);
    });
    hero.addEventListener("pointerleave", function () { mx(0); my(0); gx(0); gy(0); });
  }

  /* ---------- Nav: mark the section you're in ---------- */
  function buildNavState() {
    var links = $$(".nav__links a, .menu__links a");
    ["#story", "#services", "#work", "#process", "#faq"].forEach(function (id) {
      var section = $(id);
      if (!section) return;
      ScrollTrigger.create({
        trigger: section, start: "top 50%", end: "bottom 50%",
        onToggle: function (self) {
          links.forEach(function (a) {
            if (a.getAttribute("href") === id) {
              if (self.isActive) a.setAttribute("aria-current", "true");
              else a.removeAttribute("aria-current");
            }
          });
        }
      });
    });
  }

  /* ---------- Story timeline scrubber under the phone ---------- */
  function buildStoryScrub() {
    if (!chapters.length) return;
    gsap.to(".scrub", {
      "--p": 1, ease: "none",
      scrollTrigger: {
        trigger: chapters[0], start: "center center",
        endTrigger: chapters[chapters.length - 1], end: "center center", scrub: 0.4
      }
    });
  }

  /* ---------- The load: tasks pile onto "You", then Atlas carries them ----------
     One scrubbed timeline over a tall section with a sticky stage:
     0.00–0.38  eight task cards drop onto the "You" bar and stack up
     0.38–0.60  "everything runs through me": the tower leans and wobbles
     0.60–1.00  the mark appears, the cards fly into a ring around it,
                turn teal with a tick, get wired to the mark, and You steps away */
  function buildLoad() {
    var load = $(".load");
    if (!load) return;
    load.classList.add("load--animate");

    var scene = $(".load__scene", load);
    var chips = $$(".chip", load);
    var checks = $$(".chip__check", load);
    var lines = $$(".load__line", load);
    var spokes = $$(".load__spokes line", load);
    var mark = $(".load__mark", load);
    var you = $(".load__you", load);

    var jitterX = [-6, 9, -12, 7, -4, 14, -9, 6];
    var jitterR = [-3, 2, -4, 4, -2, 6, -5, 8];
    var W = function () { return scene.clientWidth; };
    var H = function () { return scene.clientHeight; };
    var k = function () { return W() / 560; };
    var chipH = function () { return chips[0].offsetHeight; };
    // centre of card i when stacked on the bar (scene centre is 0,0)
    // cards overlap a little on portrait so the tower stays inside the scene
    var stepY = function () { return isPortrait() ? chipH() * 0.78 : chipH() + 3; };
    var pileY = function (i) { return you.offsetTop - H() / 2 - chipH() / 2 - 3 - i * stepY(); };
    var dropFrom = function () { return isPortrait() ? 120 : 260; };
    var angle = function (el) { return parseFloat(el.style.getPropertyValue("--a")) * Math.PI / 180; };
    var ring = function (prop) { return parseFloat(getComputedStyle(scene).getPropertyValue(prop)); };

    // Centre with xPercent/yPercent, not the CSS `translate` property: GSAP folds
    // that into its own transform and, after a refresh, re-reads it as pixels,
    // which knocked some cards half their width off the ring.
    gsap.set(chips, { xPercent: -50, yPercent: -50 });
    gsap.set(mark, { xPercent: -50, yPercent: -50 });
    gsap.set(you, { xPercent: -50 });

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: { trigger: load, start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true }
    });

    // Act 1: the pile
    chips.forEach(function (c, i) {
      tl.fromTo(c,
        { x: function () { return jitterX[i] * k(); }, y: function () { return pileY(i) - dropFrom(); }, rotation: 0, autoAlpha: 0 },
        { y: function () { return pileY(i); }, rotation: jitterR[i], autoAlpha: 1, duration: 0.06, ease: "power2.in" },
        0.03 + i * 0.04);
    });
    tl.fromTo(lines[1], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.41)
      .fromTo(lines[2], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.64)
      .fromTo(mark, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.08, ease: "back.out(1.7)" }, 0.74)
      .to(lines[0], { autoAlpha: 0, y: -24, duration: 0.05 }, 0.37);

    // Act 2: the wobble
    tl.to(chips, {
      x: function (i) { return jitterX[i] * 2.4 * k(); }, rotation: function (i) { return jitterR[i] * 2.2; },
      duration: 0.12, ease: "sine.inOut"
    }, 0.45)
      .to(you, { y: 8, duration: 0.12, ease: "sine.inOut" }, 0.45)
      .to(lines[1], { autoAlpha: 0, y: -24, duration: 0.05 }, 0.6);

    // Act 3: Atlas carries it
    tl.to(chips, {
      x: function (i, el) { return Math.cos(angle(el)) * ring("--rx") * W(); },
      y: function (i, el) { return Math.sin(angle(el)) * ring("--ry") * H(); },
      rotation: 0, duration: 0.16, stagger: 0.012, ease: "power3.inOut"
    }, 0.64)
      .to(you, { x: function () { return W() * 0.55; }, autoAlpha: 0, duration: 0.1, ease: "power2.in" }, 0.7)
      .to(chips, { backgroundColor: "rgba(4, 216, 217, 0.1)", color: "#e6f5f4", borderColor: "rgba(4, 216, 217, 1)", duration: 0.06, stagger: 0.012 }, 0.8)
      .to(checks, { opacity: 1, duration: 0.05, stagger: 0.012 }, 0.82)
      .to(spokes, { strokeDashoffset: 0, duration: 0.06, stagger: 0.01 }, 0.86)
      .to({}, { duration: 0.04 }, 0.96);
  }

  /* ---------- Services ---------- */
  function buildServices() {
    // Fan: three phones start stacked and spread as the section arrives
    var fan = $$(".fan__phone");
    if (fan.length === 3) {
      var spread = function () { return isPortrait() ? 40 : window.innerWidth <= 760 ? 46 : 62; };
      var tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: ".fan", start: "top 85%", end: "center 55%", scrub: 1, invalidateOnRefresh: true }
      });
      tl.fromTo(fan[0], { xPercent: 0, rotation: 0, scale: 0.8, y: 60 }, { xPercent: function () { return -spread(); }, rotation: -9, scale: 0.86, y: 0 }, 0)
        .fromTo(fan[1], { scale: 0.9, y: 90 }, { scale: 1, y: 0 }, 0)
        .fromTo(fan[2], { xPercent: 0, rotation: 0, scale: 0.8, y: 60 }, { xPercent: function () { return spread(); }, rotation: 9, scale: 0.86, y: 0 }, 0);
    }

    // Browser: the page inside scrolls while you scroll past it
    var view = $(".browser--scroll .browser__view");
    var img = view && $("img", view);
    if (img) {
      var travel = function () { return -(img.offsetHeight - view.offsetHeight); };
      gsap.fromTo(img, { y: 0 }, {
        y: travel, ease: "none", immediateRender: false,
        scrollTrigger: { trigger: ".service--web", start: "top 80%", end: "bottom 20%", scrub: 0.6, invalidateOnRefresh: true }
      });
      img.addEventListener("load", function () { ScrollTrigger.refresh(); }, { once: true });
    }

    // Flow: the line draws, each step lights as the line reaches it.
    // Horizontal above 760px, vertical below; rebuilt when the width crosses.
    var flow = $(".flow");
    if (flow) {
      var nodes = $$(".node", flow);
      var drawFlow = function (vertical) {
        gsap.fromTo(".flow__fill", { scaleX: vertical ? 1 : 0, scaleY: vertical ? 0 : 1 }, {
          scaleX: 1, scaleY: 1, ease: "none",
          scrollTrigger: {
            trigger: flow, start: "top 75%", end: vertical ? "bottom 60%" : "top 25%", scrub: 0.6,
            onUpdate: function (self) {
              var p = self.progress;
              nodes.forEach(function (n, i) { n.classList.toggle("is-on", p >= i / (nodes.length - 1) - 0.02); });
              flow.classList.toggle("is-running", p > 0.995);
            }
          }
        });
      };
      var fm = gsap.matchMedia();
      fm.add("(max-width: 760px)", function () { drawFlow(true); });
      fm.add("(min-width: 761px)", function () { drawFlow(false); });
    }
  }

  /* ---------- Work: the VSI reel moves sideways, pinned ---------- */
  function buildWork(animate) {
    var work = $(".work");
    var track = $(".work__rail");   // intro + cards move together when pinned
    if (!work || !track) return;
    var mm = gsap.matchMedia();

    var scroller = $(".work__track");
    var native = function () { work.classList.add("work--native"); scroller.setAttribute("tabindex", "0"); };
    if (!animate) { native(); return; }

    mm.add("(min-width: 901px)", function () {
      work.classList.remove("work--native");
      scroller.removeAttribute("tabindex");   // not scrollable while pinned
      var distance = function () { return track.scrollWidth - window.innerWidth; };
      var move = gsap.to(track, {
        x: function () { return -distance(); }, ease: "none",
        scrollTrigger: {
          trigger: work, start: "top top", end: function () { return "+=" + distance(); },
          pin: ".work__pin", scrub: 1, invalidateOnRefresh: true
        }
      });
      gsap.to(".work__progress span", {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: work, start: "top top", end: function () { return "+=" + distance(); }, scrub: 1 }
      });
      // Each card leans in as it crosses the frame
      $$(".reel-card__frame, .site-card .browser, .news-card__frame", track).forEach(function (el) {
        gsap.fromTo(el, { scale: 0.86, rotation: 3 }, {
          scale: 1, rotation: 0, ease: "power2.out",
          scrollTrigger: { trigger: el, containerAnimation: move, start: "left 100%", end: "left 55%", scrub: true }
        });
      });
      // Keyboard: the rail moves by transform, so the browser can't bring a
      // focused card into view itself. Scroll the page to the point where
      // that card sits at the left edge of the frame.
      var pin = $(".work__pin");
      var onFocus = function (e) {
        var item = e.target.closest(".work__intro, .work__track > *");
        var st = move.scrollTrigger;
        if (!item || !st) return;
        pin.scrollLeft = 0;
        // offsetLeft is measured from .work__pin and ignores the rail's transform
        var p = Math.min(Math.max((item.offsetLeft - 48) / distance(), 0), 1);
        var y = st.start + p * (st.end - st.start);
        if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
      };
      work.addEventListener("focusin", onFocus);

      return function () { work.removeEventListener("focusin", onFocus); native(); };
    });

    mm.add("(max-width: 900px)", native);
  }

  /* ---------- Process: the rail fills, steps light ---------- */
  function buildProcess() {
    gsap.to(".process__fill", {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: ".process__body", start: "top 60%", end: "bottom 60%", scrub: 0.5 }
    });
    $$(".step").forEach(function (step) {
      ScrollTrigger.create({ trigger: step, start: "top 62%", toggleClass: { targets: step, className: "is-on" } });
    });
  }

  /* ---------- Finale: the two halves come back together and lock.
     The title waits for the lock, so it lands as the payoff. ---------- */
  function buildFinale() {
    var finale = $(".finale");
    var title = null;
    var played = false;
    if (window.SplitText) {
      // autoSplit re-splits on resize/rotation; once the title has landed,
      // later re-splits just leave it in place
      SplitText.create(".finale__title", {
        type: "lines", linesClass: "sl", mask: "lines", autoSplit: true,
        onSplit: function (self) {
          if (played) return;
          title = gsap.from(self.lines, { yPercent: 110, duration: 1.3, ease: "expo.out", stagger: 0.12, paused: true });
          return title;
        }
      });
    }
    var lock = function () {
      finale.classList.add("is-locked");
      if (title && !played) { played = true; title.play(); }
    };
    gsap.timeline({
      scrollTrigger: {
        trigger: finale, start: "top 90%", end: function () { return isPortrait() ? "top 35%" : "center 60%"; }, scrub: 1,
        invalidateOnRefresh: true,
        onLeave: lock,
        onUpdate: function (self) { if (self.progress > 0.995) lock(); },
        onEnterBack: function () { finale.classList.remove("is-locked"); }
      }
    })
      .fromTo(".finale .mark__half--l", { x: -260, y: 70 }, { x: 0, y: 0, ease: "power3.out" }, 0)
      .fromTo(".finale .mark__half--r", { x: 260, y: -70 }, { x: 0, y: 0, ease: "power3.out" }, 0)
      .fromTo(".finale .mark__sqwrap", { y: -120, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: "power2.out" }, 0.55);
  }
})();
