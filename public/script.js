document.addEventListener("DOMContentLoaded", () => {
  // ---- Broken-image safety net ----
  // If an <img> 404s (missing asset), hide it instead of showing the
  // browser's broken-image icon + alt text, so the element's own
  // background (a gradient, a solid color) shows through cleanly.
  document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      img.style.visibility = "hidden";
    });
  });

  const footerYear = document.querySelector("#footerYear");
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  const searchToggle = document.querySelector("#searchToggle");
  const searchPanel = document.querySelector("#searchPanel");
  const searchInput = document.querySelector("#siteSearch");
  const searchClose = document.querySelector("#searchClose");

  const featureCarousel = document.querySelector(".feature-carousel");
  const featureStage = document.querySelector(".feature-stage");
  const featureViewport = document.querySelector(".feature-gallery-viewport");
  const featureCards = [...document.querySelectorAll(".feature-card")];
  const featureCardDots = [...document.querySelectorAll(".feature-card-dot")];
  const featureCardControls = document.querySelector(".feature-card-controls");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---- Sticky guard ----
  // position: sticky silently stops working if ANY ancestor has overflow
  // set to hidden / auto / scroll. That is what made the homepage card
  // section scroll away (leaving a black gap) and the About page heading
  // stop pinning. This walks up from every sticky element and neutralises
  // such ancestors (using `clip`, which still hides sideways overflow but
  // does not break sticky), so the problem can't come back if a CSS rule
  // is added later.
  function protectSticky() {
    const stickyEls = document.querySelectorAll(
      ".feature-stage, .scroll-story-sticky"
    );
    stickyEls.forEach((el) => {
      let parent = el.parentElement;
      while (parent && parent !== document.documentElement) {
        const style = getComputedStyle(parent);
        const breaks = (value) => value === "hidden" || value === "auto" || value === "scroll";
        if (breaks(style.overflowX) || breaks(style.overflowY)) {
          parent.style.overflowX = "clip";
          parent.style.overflowY = "visible";
        }
        parent = parent.parentElement;
      }
    });
  }
  protectSticky();

  // ---- Scroll reveal: fade + rise elements up as they enter the viewport ----
  // Applies to content blocks sitewide (cards, rows, FAQ cards, footer
  // columns, etc.) but deliberately skips hero sections (so the first thing
  // a visitor sees never has to wait to fade in) and the homepage's 3D
  // feature carousel (already has its own scroll-driven animation).
  const REVEAL_SELECTOR = [
    ".content-note",
    ".content-grid > *",
    ".feature-row",
    ".faq-card",
    ".plan-cards > *",
    ".about-cta",
    ".closing-cta",
    ".trust-copy",
    ".trust-list > *",
    ".scroll-story-sticky h2",
    ".scroll-story-copy > p",
    ".section-heading",
    ".sunset-card",
    ".testimonials-head",
    ".testimonials-stage",
    ".footer-brand",
    ".footer-column",
    ".footer-contact",
    ".footer-legal",
    ".reveal-right",
  ].join(", ");

  const revealObserver = "IntersectionObserver" in window && !reducedMotion.matches
    ? new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
      )
    : null;

  // Call this again after injecting new markup (e.g. the FAQ grid, which is
  // built dynamically) so those elements get picked up too.
  function applyScrollReveal(root = document) {
    const elements = [...root.querySelectorAll(REVEAL_SELECTOR)].filter(
      (el) => !el.classList.contains("is-visible")
    );

    elements.forEach((el, index) => {
      // Respect a direction variant (e.g. reveal-right) already set in the
      // markup; only default to the standard rise-and-fade otherwise.
      if (!el.classList.contains("reveal") && !el.classList.contains("reveal-right")) {
        el.classList.add("reveal");
        // Small stagger for items that sit side-by-side in the same row/grid
        const delay = Math.min(index % 4, 3) * 0.06;
        el.style.setProperty("--reveal-delay", `${delay}s`);
      }

      if (revealObserver) {
        revealObserver.observe(el);
      } else {
        // Reduced motion or no IntersectionObserver support: just show it
        el.classList.add("is-visible");
      }
    });
  }

  window.applyScrollReveal = applyScrollReveal;
  applyScrollReveal();

  // ---- Testimonials: pick a person to swap the photo and quote ----
  const testimonialTabs = [...document.querySelectorAll(".testimonial-tab")];
  const testimonialPanels = [...document.querySelectorAll(".testimonial-panel")];
  const testimonialPhotos = [...document.querySelectorAll(".testimonial-photo")];

  function showTestimonial(index, moveFocus = false) {
    testimonialTabs.forEach((tab, i) => {
      const on = i === index;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    testimonialPanels.forEach((panel, i) => panel.classList.toggle("is-active", i === index));
    testimonialPhotos.forEach((photo, i) => photo.classList.toggle("is-active", i === index));
    if (moveFocus) testimonialTabs[index].focus();
  }

  testimonialTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showTestimonial(index));
    tab.addEventListener("keydown", (event) => {
      const last = testimonialTabs.length - 1;
      let next = null;
      if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
      if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = last;
      if (next === null) return;
      event.preventDefault();
      showTestimonial(next, true);
    });
  });

  // ---- Autoplaying background videos: pause off-screen / tab hidden ----
  // Decoding video is expensive; a looping hero video has no reason to keep
  // running once it's scrolled out of view or the tab isn't visible.
  const bgVideos = [...document.querySelectorAll("video[autoplay]")];
  if (bgVideos.length) {
    const videoObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const video = entry.target;
              if (entry.isIntersecting && !document.hidden) {
                video.play().catch(() => {});
              } else {
                video.pause();
              }
            });
          },
          { threshold: 0.1 }
        )
      : null;

    bgVideos.forEach((video) => videoObserver?.observe(video));

    document.addEventListener("visibilitychange", () => {
      bgVideos.forEach((video) => {
        const rect = video.getBoundingClientRect();
        const inView = rect.bottom > 0 && rect.top < window.innerHeight;
        if (document.hidden) video.pause();
        else if (inView) video.play().catch(() => {});
      });
    });
  }

  // ---- Smooth-scroll to a #hash target when landing on a page with one ----
  // (e.g. a link on another page pointing to index.html#faq). The browser's
  // own jump is instant; this replaces it with an animated scroll instead.
  if (window.location.hash) {
    const target = document.getElementById(
      decodeURIComponent(window.location.hash.slice(1))
    );
    if (target) {
      window.scrollTo(0, 0);
      window.requestAnimationFrame(() => {
        setTimeout(() => {
          target.scrollIntoView({
            behavior: reducedMotion.matches ? "auto" : "smooth",
            block: "start",
          });
        }, 30);
      });
    }
  }

  let activeFeatureCard = 2; // Center card
  let featureCardTimer;
  let cardsReady = false;
  let scrollTicking = false;
  let scrollableDistance = 1;
  let lastTextProgress = null;
  let lastGalleryProgress = null;

  function showFeatureCard(index) {
    if (!featureCards.length) return;

    activeFeatureCard = (index + featureCards.length) % featureCards.length;

    const isMobile = window.innerWidth <= 600;
    const spacing = isMobile ? 135 : 220;
    const half = Math.floor(featureCards.length / 2);

    featureCards.forEach((card, cardIndex) => {
      // Offset relative to the active card position
      let offset = cardIndex - activeFeatureCard;

      // Wrap around for continuous loop math
      if (offset > half) offset -= featureCards.length;
      if (offset < -half) offset += featureCards.length;

      const distance = Math.abs(offset);
      const isActive = offset === 0;
      card.classList.toggle("is-active", isActive);

      // 3D rotation math
      const rotateY = offset * -26;
      const translateX = offset * spacing;
      const translateZ = Math.cos((offset * Math.PI) / 4) * 180 - 180;
      const scale = isActive ? 1.08 : Math.max(0.72, 1 - distance * 0.14);
      const opacity = Math.max(0.6, 1 - distance * 0.15);

      card.style.transform = `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
      card.style.opacity = opacity.toFixed(2);
      card.style.zIndex = 10 - distance;

      // Side cards get a light dark layer (cheaper than a CSS filter)
      card.style.setProperty("--dim", isActive ? "0" : Math.min(0.3, distance * 0.1).toFixed(2));
    });

    featureCardDots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeFeatureCard;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });
  }

  function restartFeatureCardTimer() {
    clearInterval(featureCardTimer);
    if (!cardsReady || reducedMotion.matches) return;
    featureCardTimer = setInterval(() => showFeatureCard(activeFeatureCard + 1), 4500);
  }

  function setCardsReady(ready) {
    if (ready === cardsReady) return;
    cardsReady = ready;
    featureViewport?.classList.toggle("is-ready", ready);
    featureCardControls?.classList.toggle("is-ready", ready);

    if (ready) {
      showFeatureCard(activeFeatureCard);
      restartFeatureCardTimer();
    } else {
      clearInterval(featureCardTimer);
    }
  }

  function measureFeatureCarousel() {
    if (!featureCarousel) return;
    scrollableDistance = Math.max(1, featureCarousel.offsetHeight - window.innerHeight);
  }

  function updateFeatureScroll() {
    scrollTicking = false;
    if (!featureCarousel || !featureStage) return;

    const rect = featureCarousel.getBoundingClientRect();

    // Nothing to animate while the section is off screen
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setCardsReady(false);
      return;
    }

    const progress = Math.min(1, Math.max(0, -rect.top / scrollableDistance));
    const easedProgress = progress * progress * (3 - 2 * progress);
    const textProgress = Math.min(1, easedProgress / 0.42).toFixed(3);
    const galleryProgress = Math.min(1, Math.max(0, (easedProgress - 0.42) / 0.35));
    const galleryValue = galleryProgress.toFixed(3);

    // CSS reads these two variables for opacity/position, so only write when they change
    if (textProgress !== lastTextProgress) {
      featureStage.style.setProperty("--text-progress", textProgress);
      lastTextProgress = textProgress;
    }
    if (galleryValue !== lastGalleryProgress) {
      featureStage.style.setProperty("--gallery-progress", galleryValue);
      lastGalleryProgress = galleryValue;
    }

    setCardsReady(galleryProgress > 0.8);
  }

  // Run at most once per frame, however many scroll events fire
  function requestFeatureUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateFeatureScroll);
  }

  if (featureCarousel) {
    measureFeatureCarousel();
    showFeatureCard(activeFeatureCard);
    updateFeatureScroll();
    window.addEventListener("scroll", requestFeatureUpdate, { passive: true });
    window.addEventListener("resize", () => {
      measureFeatureCarousel();
      showFeatureCard(activeFeatureCard);
      requestFeatureUpdate();
    });
    window.addEventListener("load", () => {
      measureFeatureCarousel();
      requestFeatureUpdate();
    });
  }

  // ---- Navigation bar fade on scroll ----
  // Change these numbers to tune the effect
  const NAV_DIM_OPACITY = 0.55;   // how faded the bar gets first (1 = solid, 0 = gone)
  const NAV_DIM_AT = 150;         // px of scrolling down until it is that faded
  const NAV_GONE_AT = 400;        // px of scrolling down until it has disappeared
  const NAV_RETURN_HOLD_MS = 5000; // how long it stays faded after you scroll back up

  // The search results page uses a bar that scrolls away, so it skips the fade
  const nav = document.querySelector(".dashboard-topbar:not(.dashboard-topbar--static)");
  let navTravel = 0; // 0 = solid, NAV_DIM_AT = partly faded, NAV_GONE_AT = gone
  let navReturning = false;
  let navReturnTimer;
  let navLastY = window.scrollY;
  let navTicking = false;
  let lastNavOpacity = null;

  function navOpacityFor(travel) {
    if (travel <= 0) return 1;
    if (travel < NAV_DIM_AT) {
      return 1 - (travel / NAV_DIM_AT) * (1 - NAV_DIM_OPACITY);
    }
    if (travel < NAV_GONE_AT) {
      return NAV_DIM_OPACITY * (1 - (travel - NAV_DIM_AT) / (NAV_GONE_AT - NAV_DIM_AT));
    }
    return 0;
  }

  function paintNav(fadeSeconds) {
    const opacity = navOpacityFor(navTravel);
    const value = opacity.toFixed(3);

    nav.style.setProperty("--nav-fade", `${fadeSeconds}s`);
    if (value === lastNavOpacity) return;
    lastNavOpacity = value;
    nav.style.opacity = value;
    // A hidden bar shouldn't catch clicks (it still appears if it gets keyboard focus)
    nav.style.pointerEvents = opacity < 0.05 ? "none" : "";
  }

  // Keep the bar solid while search is open or someone is using it with the keyboard
  function navIsPinned() {
    return (
      searchPanel?.classList.contains("is-open") ||
      nav.classList.contains("is-menu-open") ||
      nav.matches(":has(:focus-visible)")
    );
  }

  function updateNav() {
    navTicking = false;
    const y = window.scrollY;
    const delta = y - navLastY;
    navLastY = y;

    if (y <= 8 || navIsPinned()) {
      navTravel = 0;
      navReturning = false;
      clearTimeout(navReturnTimer);
      paintNav(0.25);
      return;
    }

    if (delta > 0) {
      // Scrolling down: fade a bit, then disappear
      if (navReturning) {
        navReturning = false;
        clearTimeout(navReturnTimer);
      }
      navTravel = Math.min(NAV_GONE_AT, navTravel + delta);
    } else if (delta <= -2 && navTravel > 0) {
      // Scrolling up while faded or hidden: bring it back, still see-through
      navReturning = true;
      navTravel = Math.min(navTravel, NAV_DIM_AT);
      clearTimeout(navReturnTimer);
      navReturnTimer = setTimeout(() => {
        navReturning = false;
        navTravel = 0;
        paintNav(0.9); // slow, gentle fade to solid
      }, NAV_RETURN_HOLD_MS);
    }

    paintNav(0.25);
  }

  function requestNavUpdate() {
    if (!nav || navTicking) return;
    navTicking = true;
    requestAnimationFrame(updateNav);
  }

  if (nav && !reducedMotion.matches) {
    updateNav();
    window.addEventListener("scroll", requestNavUpdate, { passive: true });
    nav.addEventListener("focusin", requestNavUpdate);
    nav.addEventListener("focusout", requestNavUpdate);
  }

  // ---- "Learn" nav dropdown (desktop): hoverable AND clickable ----
  // Hovering the item opens it like a normal dropdown and closes shortly
  // after the cursor leaves. Clicking the arrow "pins" it open regardless of
  // the cursor, until it's clicked again, clicked outside, or Escape is
  // pressed — clicking a second time un-pins and closes it.
  const NAV_HOVER_CLOSE_DELAY = 150;

  document.querySelectorAll(".nav-item").forEach((navItem) => {
    const dropdown = navItem.querySelector(".nav-dropdown");
    const caretBtn = navItem.querySelector(".nav-caret-btn");
    if (!dropdown || !caretBtn) return;

    let closeTimer = null;

    function setOpen(open) {
      clearTimeout(closeTimer);
      navItem.classList.toggle("is-open", open);
      caretBtn.setAttribute("aria-expanded", String(open));
    }

    function openNow() {
      // Only one dropdown open at a time
      document.querySelectorAll(".nav-item.is-open, .nav-item.is-pinned").forEach((openItem) => {
        if (openItem !== navItem) {
          openItem.classList.remove("is-open", "is-pinned");
          openItem.querySelector(".nav-caret-btn")?.setAttribute("aria-expanded", "false");
        }
      });
      setOpen(true);
    }

    function scheduleClose() {
      if (navItem.classList.contains("is-pinned")) return;
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => setOpen(false), NAV_HOVER_CLOSE_DELAY);
    }

    navItem.addEventListener("mouseenter", openNow);
    navItem.addEventListener("mouseleave", scheduleClose);

    caretBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (navItem.classList.contains("is-pinned")) {
        navItem.classList.remove("is-pinned");
        setOpen(false);
      } else {
        openNow();
        navItem.classList.add("is-pinned");
      }
    });

    // Close after choosing a link inside the dropdown
    dropdown.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navItem.classList.remove("is-pinned");
        setOpen(false);
      });
    });
  });

  function closeNavDropdowns() {
    document.querySelectorAll(".nav-item.is-open, .nav-item.is-pinned").forEach((openItem) => {
      openItem.classList.remove("is-open", "is-pinned");
      openItem.querySelector(".nav-caret-btn")?.setAttribute("aria-expanded", "false");
    });
  }

  // Click anywhere outside an open dropdown closes it
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-item")) closeNavDropdowns();
  });

  // Escape closes it too
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavDropdowns();
  });

  // Keep things tidy if the layout crosses the mobile/desktop breakpoint
  window.matchMedia("(min-width: 1001px)").addEventListener("change", closeNavDropdowns);

  // ---- Mobile menu ----
  const siteHeader = document.querySelector(".dashboard-topbar");
  const menuToggle = document.querySelector("#menuToggle");
  const siteNav = document.querySelector("#siteNav");

  function setMenu(open) {
    if (!siteHeader || !menuToggle) return;
    siteHeader.classList.toggle("is-menu-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) setSearchPanel(false);
    closeNavDropdowns();
    requestNavUpdate();
  }

  menuToggle?.addEventListener("click", () => {
    setMenu(!siteHeader.classList.contains("is-menu-open"));
  });

  // Close after choosing a link, pressing Escape, tapping elsewhere, or widening the window
  siteNav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteHeader?.classList.contains("is-menu-open")) {
      setMenu(false);
      menuToggle?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (siteHeader?.classList.contains("is-menu-open") && !siteHeader.contains(event.target)) {
      setMenu(false);
    }
  });

  window.matchMedia("(min-width: 1001px)").addEventListener("change", (event) => {
    if (event.matches) setMenu(false);
  });

  // Set briefly after a swipe so the tap that ends the swipe doesn't also
  // count as a click on whichever card the finger lifted off
  let justSwiped = false;

  // Click card to select & rotate to center
  featureCards.forEach((card, index) => {
    card.addEventListener("click", () => {
      if (justSwiped) return;
      showFeatureCard(index);
      restartFeatureCardTimer();
    });
  });

  // ---- Finger swipe on the card carousel ----
  // Swipe left = next card, swipe right = previous card. Vertical movement is
  // left to the browser (touch-action: pan-y in the CSS) so the page still
  // scrolls normally when the finger goes up/down.
  if (featureViewport) {
    const SWIPE_MIN_DISTANCE = 40; // px the finger must travel sideways
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipePointerId = null;
    let swipeHandled = false;

    featureViewport.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      swipePointerId = event.pointerId;
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
      swipeHandled = false;
    });

    featureViewport.addEventListener("pointermove", (event) => {
      if (event.pointerId !== swipePointerId || swipeHandled) return;
      const dx = event.clientX - swipeStartX;
      const dy = event.clientY - swipeStartY;

      // Only react to mostly-sideways movement
      if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.2) return;

      swipeHandled = true;
      justSwiped = true;
      setTimeout(() => (justSwiped = false), 350);
      showFeatureCard(activeFeatureCard + (dx < 0 ? 1 : -1));
      restartFeatureCardTimer();
    });

    const endSwipe = (event) => {
      if (event.pointerId === swipePointerId) swipePointerId = null;
    };
    featureViewport.addEventListener("pointerup", endSwipe);
    featureViewport.addEventListener("pointercancel", endSwipe);
    featureViewport.addEventListener("pointerleave", endSwipe);
  }

  document.querySelector('[data-card-direction="prev"]')?.addEventListener("click", () => {
    showFeatureCard(activeFeatureCard - 1);
    restartFeatureCardTimer();
  });

  document.querySelector('[data-card-direction="next"]')?.addEventListener("click", () => {
    showFeatureCard(activeFeatureCard + 1);
    restartFeatureCardTimer();
  });

  featureCardDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      showFeatureCard(Number(dot.dataset.cardTo));
      restartFeatureCardTimer();
    });
  });

  function setSearchPanel(open) {
    if (!searchPanel || !searchToggle) return;
    searchPanel.classList.toggle("is-open", open);
    searchToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      searchInput?.focus();
      if (siteHeader?.classList.contains("is-menu-open")) setMenu(false);
    }
    requestNavUpdate();
  }

  searchToggle?.addEventListener("click", () => {
    setSearchPanel(!searchPanel.classList.contains("is-open"));
  });

  searchClose?.addEventListener("click", () => setSearchPanel(false));

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const query = searchInput.value.trim();
    if (query) window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
  });

  // ---- About page: interactive rotating "trust" globe ----
  const globeCanvas = document.querySelector("#trustGlobe");
  const globeStage = document.querySelector("#trustGlobeStage");

  if (globeCanvas && globeStage) {
    const ctx = globeCanvas.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    // 20 countries, each represented by a major city. New York is the hub
    // every other market connects back to.
    const GLOBE_MARKERS = [
      { lat: 6.5244, lon: 3.3792, label: "Lagos" }, // Nigeria
      { lat: 51.5074, lon: -0.1278, label: "London" }, // United Kingdom
      { lat: 40.7128, lon: -74.006, label: "New York", hub: true }, // United States
      { lat: 25.2048, lon: 55.2708, label: "Dubai" }, // UAE
      { lat: 1.3521, lon: 103.8198, label: "Singapore" }, // Singapore
      { lat: -1.2921, lon: 36.8219, label: "Nairobi" }, // Kenya
      { lat: -26.2041, lon: 28.0473, label: "Johannesburg" }, // South Africa
      { lat: 5.6037, lon: -0.187, label: "Accra" }, // Ghana
      { lat: 30.0444, lon: 31.2357, label: "Cairo" }, // Egypt
      { lat: 19.076, lon: 72.8777, label: "Mumbai" }, // India
      { lat: 31.2304, lon: 121.4737, label: "Shanghai" }, // China
      { lat: 35.6762, lon: 139.6503, label: "Tokyo" }, // Japan
      { lat: -33.8688, lon: 151.2093, label: "Sydney" }, // Australia
      { lat: 50.1109, lon: 8.6821, label: "Frankfurt" }, // Germany
      { lat: 48.8566, lon: 2.3522, label: "Paris" }, // France
      { lat: 47.3769, lon: 8.5417, label: "Zurich" }, // Switzerland
      { lat: -23.5505, lon: -46.6333, label: "S\u00e3o Paulo" }, // Brazil
      { lat: 43.6532, lon: -79.3832, label: "Toronto" }, // Canada
      { lat: 24.7136, lon: 46.6753, label: "Riyadh" }, // Saudi Arabia
      { lat: 37.5665, lon: 126.978, label: "Seoul" }, // South Korea
    ];

    function toSphere(lat, lon) {
      const latRad = (lat * Math.PI) / 180;
      const lonRad = (lon * Math.PI) / 180;
      return {
        x: Math.cos(latRad) * Math.sin(lonRad),
        y: Math.sin(latRad),
        z: Math.cos(latRad) * Math.cos(lonRad),
      };
    }

    // Evenly-spaced dots across the sphere's surface (Fibonacci sphere)
    const DOT_COUNT = 650;
    const dots = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < DOT_COUNT; i++) {
      const y = 1 - (i / (DOT_COUNT - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = golden * i;
      dots.push({ x: Math.cos(theta) * radiusAtY, y, z: Math.sin(theta) * radiusAtY });
    }

    const markers = GLOBE_MARKERS.map((marker) => ({ ...marker, ...toSphere(marker.lat, marker.lon) }));
    const hub = markers.find((marker) => marker.hub) || markers[0];

    // Great-circle interpolation between two points on the unit sphere
    function slerp(a, b, t) {
      const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
      const theta = Math.acos(dot) * t;
      const relX = b.x - a.x * dot;
      const relY = b.y - a.y * dot;
      const relZ = b.z - a.z * dot;
      const len = Math.hypot(relX, relY, relZ) || 1;
      return {
        x: a.x * Math.cos(theta) + (relX / len) * Math.sin(theta),
        y: a.y * Math.cos(theta) + (relY / len) * Math.sin(theta),
        z: a.z * Math.cos(theta) + (relZ / len) * Math.sin(theta),
      };
    }

    const ARC_STEPS = 20;
    const arcs = markers
      .filter((marker) => marker !== hub)
      .map((marker) => {
        const points = [];
        for (let step = 0; step <= ARC_STEPS; step++) points.push(slerp(hub, marker, step / ARC_STEPS));
        return points;
      });

    // Start the globe facing the hub (New York)
    let rotY = -(hub.lon * Math.PI) / 180 - 0.25;
    let rotX = -0.18; // gentle downward tilt for a nicer viewing angle
    let autoSpin = 0.0016;
    let dragging = false;
    let lastPointer = null;
    let dragSpin = autoSpin;
    const globeReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function rotatePointWith(cosY, sinY, cosX, sinX, point) {
      const x = point.x * cosY + point.z * sinY;
      const zFromY = -point.x * sinY + point.z * cosY;
      return {
        x,
        y: point.y * cosX - zFromY * sinX,
        z: point.y * sinX + zFromY * cosX,
      };
    }

    function resizeGlobe() {
      const rect = globeStage.getBoundingClientRect();
      globeCanvas.width = rect.width * DPR;
      globeCanvas.height = rect.height * DPR;
    }

    function drawGlobe() {
      const w = globeCanvas.width;
      const h = globeCanvas.height;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.42;
      const time = globeReducedMotion && !dragging ? 0 : performance.now() / 1000;

      // rotY/rotX only change once per frame, so compute their sin/cos just
      // once here instead of inside a function called per point (this used
      // to run 1000+ times per frame — the single biggest cost of the
      // animation).
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const rotatePoint = (point) => rotatePointWith(cosY, sinY, cosX, sinX, point);

      // Outer rim
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = DPR;
      ctx.stroke();

      // Stippled surface, drawn back-to-front so the far side sits behind the near side
      const rotatedDots = dots.map(rotatePoint).sort((a, b) => a.z - b.z);
      rotatedDots.forEach((point) => {
        const depth = (point.z + 1) / 2; // 0 = far side, 1 = facing the viewer
        const alpha = 0.06 + Math.pow(depth, 2.2) * 0.8;
        const size = (0.9 + depth * 1.6) * DPR;
        ctx.beginPath();
        ctx.arc(cx + point.x * radius, cy - point.y * radius, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.fill();
      });

      // Faint arcs from the hub to every other market, with a traveling highlight
      arcs.forEach((points, arcIndex) => {
        ctx.beginPath();
        let started = false;
        points.forEach((arcPoint) => {
          const point = rotatePoint(arcPoint);
          if (point.z < -0.05) {
            started = false;
            return;
          }
          const px = cx + point.x * radius;
          const py = cy - point.y * radius;
          if (!started) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        });
        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = DPR;
        ctx.stroke();

        const t = (time * 0.18 + arcIndex * 0.37) % 1;
        const travelPoint = rotatePoint(points[Math.min(points.length - 1, Math.floor(t * points.length))]);
        if (travelPoint.z > -0.05) {
          ctx.beginPath();
          ctx.arc(cx + travelPoint.x * radius, cy - travelPoint.y * radius, 2.2 * DPR, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fill();
        }
      });

      // Markers + labels, hidden once they rotate onto the far side
      markers.forEach((marker) => {
        const point = rotatePoint(marker);
        if (point.z < -0.15) return;
        const px = cx + point.x * radius;
        const py = cy - point.y * radius;
        const pulse = (Math.sin(time * 2 + marker.lon) + 1) / 2;

        ctx.beginPath();
        ctx.arc(px, py, (5 + pulse * 4) * DPR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.08 + pulse * 0.08).toFixed(3)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, (marker.hub ? 4 : 3) * DPR, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();

        ctx.font = `${(marker.hub ? 12 : 11) * DPR}px "Nunito Sans", sans-serif`;
        ctx.textBaseline = "middle";
        ctx.fillStyle = marker.hub ? "#fff" : "rgba(255, 255, 255, 0.75)";
        ctx.fillText(marker.label, px + 10 * DPR, py);
      });
    }

    function globeFrame() {
      if (!dragging && !globeReducedMotion) rotY += autoSpin;
      drawGlobe();
      rafId = requestAnimationFrame(globeFrame);
    }

    let rafId = null;
    let isVisible = false;

    function startGlobe() {
      if (rafId !== null) return;
      globeFrame();
    }

    function stopGlobe() {
      if (rafId === null) return;
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    function syncGlobeRunning() {
      if (isVisible && !document.hidden) {
        startGlobe();
      } else {
        stopGlobe();
      }
    }

    const globeVisibilityObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            isVisible = entries.some((entry) => entry.isIntersecting);
            syncGlobeRunning();
          },
          { threshold: 0.01 }
        )
      : null;

    if (globeVisibilityObserver) {
      globeVisibilityObserver.observe(globeStage);
    } else {
      // No IntersectionObserver support: just run it as before
      isVisible = true;
    }

    document.addEventListener("visibilitychange", syncGlobeRunning);

    function pointerPosition(event) {
      return { x: event.clientX, y: event.clientY };
    }

    globeStage.addEventListener("pointerdown", (event) => {
      dragging = true;
      lastPointer = pointerPosition(event);
      globeStage.setPointerCapture(event.pointerId);
    });

    globeStage.addEventListener("pointermove", (event) => {
      if (!dragging || !lastPointer) return;
      const pos = pointerPosition(event);
      const dx = pos.x - lastPointer.x;
      const dy = pos.y - lastPointer.y;
      rotY += dx * 0.006;
      rotX = Math.max(-0.9, Math.min(0.9, rotX + dy * 0.006));
      dragSpin = dx * 0.0007;
      lastPointer = pos;
    });

    function endGlobeDrag() {
      if (!dragging) return;
      dragging = false;
      lastPointer = null;
      if (!globeReducedMotion) autoSpin = dragSpin || autoSpin;
    }

    globeStage.addEventListener("pointerup", endGlobeDrag);
    globeStage.addEventListener("pointerleave", endGlobeDrag);
    globeStage.addEventListener("pointercancel", endGlobeDrag);

    window.addEventListener("resize", resizeGlobe);
    resizeGlobe();
  }
});