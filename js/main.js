// (R)EVOLUTION — Ram landing page interactivity
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  // ------------------------------------------------------------------
  // CONFIG
  // ------------------------------------------------------------------
  var CONFIG = {
    whatsappNumber: "972547995652",
  };

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ------------------------------------------------------------------
  // Scroll reveal (GSAP if available + motion allowed, else instant show)
  // ------------------------------------------------------------------
  function initReveals() {
    var els = document.querySelectorAll(".reveal");

    // Gentle stagger for card grids/lists, so items settle in one after
    // another instead of all at once. Capped so a long grid doesn't end
    // with a large trailing delay.
    document.querySelectorAll(".quote-grid, .steps, .carousel-track").forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.transitionDelay = Math.min(i, 6) * 0.07 + "s";
      });
    });

    // Reveal-on-scroll uses IntersectionObserver rather than GSAP
    // ScrollTrigger's pixel-position triggers: on a single page this long,
    // webfont swap-in and lazy-loaded images shift the document height
    // after trigger positions are first calculated, which left late
    // sections (FAQ, final CTA) stuck at opacity:0. IntersectionObserver
    // checks real viewport intersection continuously, so it isn't affected
    // by that drift.
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
      );
      els.forEach(function (el) { io.observe(el); });
    }

    if (reduceMotion || typeof gsap === "undefined") return;

    // Hero intro plays immediately on load (not scroll-dependent), so it
    // isn't affected by the drift issue above.
    var heroEls = [".hero-title", ".hero-sub", ".hero-actions", ".hero-trust"];
    var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroEls.forEach(function (sel, i) {
      var el = document.querySelector(sel);
      if (!el) return;
      tl.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7 }, i === 0 ? 0 : "-=0.45");
    });
  }

  // ------------------------------------------------------------------
  // Lightbox (testimonial screenshots + before/after gallery)
  // ------------------------------------------------------------------
  function initLightbox() {
    var lightbox = document.getElementById("lightbox");
    var imgEl = document.getElementById("lightbox-img");
    var captionEl = document.getElementById("lightbox-caption");
    var closeBtn = document.getElementById("lightbox-close");
    if (!lightbox) return;

    function open(src, alt, caption) {
      imgEl.src = src;
      imgEl.alt = alt || "";
      captionEl.textContent = caption || "";
      lightbox.hidden = false;
      closeBtn.focus();
      document.body.style.overflow = "hidden";
    }
    function close() {
      lightbox.hidden = true;
      imgEl.src = "";
      document.body.style.overflow = "";
    }

    document.querySelectorAll(".screenshot-item, .ba-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var img = btn.querySelector("img");
        open(img.src, img.alt, btn.getAttribute("data-caption"));
      });
    });
    document.querySelectorAll("img.lightbox-trigger").forEach(function (img) {
      img.addEventListener("click", function () {
        open(img.src, img.alt, img.getAttribute("data-caption"));
      });
    });

    closeBtn.addEventListener("click", close);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lightbox.hidden) close();
    });
  }

  // ------------------------------------------------------------------
  // Video testimonials — click to load (keeps page fast, avoids
  // preloading ~600MB of raw video files on page load)
  // ------------------------------------------------------------------
  function initVideoCards() {
    document.querySelectorAll(".video-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var src = card.getAttribute("data-src");
        var name = card.getAttribute("data-name");
        if (!src || card.querySelector("video")) return;
        var video = document.createElement("video");
        video.src = encodeURI(src);
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        video.preload = "none";
        card.innerHTML = "";
        card.appendChild(video);
        card.classList.add("is-playing");
        if (typeof gtag === "function") {
          gtag("event", "video_play", { event_label: name || src });
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // Smooth-scroll CTA buttons → focus the name field on arrival
  // ------------------------------------------------------------------
  function initCtaScroll() {
    document.querySelectorAll(".js-cta-scroll").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var targetId = link.getAttribute("href").slice(1);
        var target = document.getElementById(targetId);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        window.setTimeout(function () {
          var nameField = target.querySelector('input[name="name"]');
          if (nameField) nameField.focus({ preventScroll: true });
        }, reduceMotion ? 0 : 500);
      });
    });
  }

  // ------------------------------------------------------------------
  // Lead forms — validate, send to WhatsApp, show success state
  // ------------------------------------------------------------------
  function isValidPhone(value) {
    var digits = value.replace(/[^0-9]/g, "");
    return /^0\d{8,9}$/.test(digits) || /^972\d{8,9}$/.test(digits);
  }

  function setFieldError(field, message) {
    var input = field.querySelector("input");
    var errorEl = field.querySelector(".field-error");
    if (message) {
      input.classList.add("is-invalid");
      errorEl.textContent = message;
    } else {
      input.classList.remove("is-invalid");
      errorEl.textContent = "";
    }
  }

  function initLeadForms() {
    document.querySelectorAll(".lead-form").forEach(function (form) {
      // validate on blur, not while typing
      form.querySelectorAll("input").forEach(function (input) {
        input.addEventListener("blur", function () {
          validateForm(form, false);
        });
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!validateForm(form, true)) return;

        var name = form.querySelector('input[name="name"]').value.trim();
        var phone = form.querySelector('input[name="phone"]').value.trim();
        var submitBtn = form.querySelector("button[type=submit]");
        var successEl = form.querySelector(".lead-form-success");

        submitBtn.disabled = true;
        var originalLabel = submitBtn.querySelector(".btn-label").textContent;
        submitBtn.querySelector(".btn-label").textContent = "רגע, שולח...";

        if (typeof gtag === "function") {
          gtag("event", "generate_lead", { event_label: form.id });
        }

        var message = "היי ראם, אני " + name + " (טלפון: " + phone + "), ראיתי את דף הנחיתה ורוצה לשמוע פרטים על התהליך.";
        var waUrl = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(message);

        window.setTimeout(function () {
          window.open(waUrl, "_blank", "noopener");
          form.querySelectorAll(".field, button").forEach(function (el) { el.style.display = "none"; });
          successEl.hidden = false;
          submitBtn.disabled = false;
          submitBtn.querySelector(".btn-label").textContent = originalLabel;
        }, 350);
      });
    });
  }

  function validateForm(form, onSubmit) {
    var fields = form.querySelectorAll(".field");
    var valid = true;
    fields.forEach(function (field) {
      var input = field.querySelector("input");
      if (input.name === "name") {
        if (input.value.trim().length < 2) {
          if (onSubmit || input.value.length > 0) setFieldError(field, "השם קצר מדי, אפשר להשלים?");
          valid = false;
        } else {
          setFieldError(field, "");
        }
      }
      if (input.name === "phone") {
        if (!isValidPhone(input.value)) {
          if (onSubmit || input.value.length > 3) setFieldError(field, "הטלפון לא נראה שלם, אפשר לבדוק?");
          valid = false;
        } else {
          setFieldError(field, "");
        }
      }
    });
    return valid;
  }

  // ------------------------------------------------------------------
  // WhatsApp links (footer + sticky mobile bar) + contact click tracking
  // ------------------------------------------------------------------
  function initContactLinks() {
    var waMessage = "היי ראם, ראיתי את דף הנחיתה ורוצה לשמוע פרטים על התהליך.";
    var waUrl = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(waMessage);
    document.querySelectorAll(".js-whatsapp-link").forEach(function (a) {
      a.setAttribute("href", waUrl);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });

    document.querySelectorAll(".js-track-contact").forEach(function (a) {
      a.addEventListener("click", function () {
        if (typeof gtag === "function") {
          gtag("event", "contact_click", { event_label: a.getAttribute("data-contact-type") });
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // Footer year
  // ------------------------------------------------------------------
  function initFooterYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  // ------------------------------------------------------------------
  // Carousels (before/after, video testimonials, WhatsApp screenshots) —
  // manual only, no autoplay. The visitor advances every carousel
  // themselves so a clip they were mid-watching never gets skipped out
  // from under them.
  // ------------------------------------------------------------------
  function initCarousels() {
    document.querySelectorAll(".carousel").forEach(function (carousel) {
      var track = carousel.querySelector(".carousel-track");
      var prevBtn = carousel.querySelector(".carousel-btn--prev");
      var nextBtn = carousel.querySelector(".carousel-btn--next");
      if (!track || !prevBtn || !nextBtn) return;

      var items = Array.prototype.slice.call(track.children);
      if (!items.length) return;
      var index = 0;

      // Modern evergreen browsers all use the "negative" RTL scrollLeft
      // convention (0 = start, negative = scrolled further into the
      // content), so this sign flips the direction of travel to match
      // reading order.
      var dirSign = getComputedStyle(track).direction === "rtl" ? -1 : 1;
      var stepPx = items.length > 1
        ? Math.abs(items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().left)
        : items[0].getBoundingClientRect().width;

      function go(dir) {
        index = (index + dir + items.length) % items.length;
        var behavior = reduceMotion ? "auto" : "smooth";
        // Scroll the track itself instead of items[index].scrollIntoView():
        // scrollIntoView walks the whole ancestor chain, including the
        // document, and would drag the entire page down to bring the item
        // into view if the carousel wasn't already fully in the vertical
        // viewport. scrollBy()/scrollTo() on the track never touches
        // window scroll at all.
        if (dir > 0 && index === 0) {
          track.scrollTo({ left: 0, behavior: behavior }); // wrapped past the last item — back to start
        } else if (dir < 0 && index === items.length - 1) {
          track.scrollTo({ left: dirSign * track.scrollWidth, behavior: behavior }); // wrapped before the first — jump to the end (browser clamps)
        } else {
          // A fixed one-item step rather than "scroll exact distance to
          // center the target item" — the latter can compute a near-zero
          // delta by coincidence, which then gets clamped to a no-op at
          // the scrollLeft boundary. scroll-snap-align:center self-corrects
          // any drift from using a fixed step.
          track.scrollBy({ left: dirSign * dir * stepPx, behavior: behavior });
        }
      }

      prevBtn.addEventListener("click", function () { go(-1); });
      nextBtn.addEventListener("click", function () { go(1); });
    });
  }

  // ------------------------------------------------------------------
  // UserWay widget position. Empirically confirmed via
  // window.UserWay.setPosition(n): 0/1 top-right, 2 middle-right,
  // 3 bottom-right, 4 bottom-center, 5 bottom-left, 6 middle-left,
  // 7 top-left, 8 top-center.
  //
  // Bottom-left (5) on desktop, bottom-right (3) on mobile.
  // ------------------------------------------------------------------
  function initUserWayPosition() {
    var mobileQuery = window.matchMedia("(max-width: 900px)");

    function currentPosition() {
      return mobileQuery.matches ? 3 : 5;
    }

    function apply() {
      // UserWay's own internal setPosition occasionally throws on the very
      // first call (its icon DOM isn't fully mounted yet) even though the
      // position still ends up correct. Swallow that so it doesn't surface
      // as an uncaught error.
      try { window.UserWay.setPosition(currentPosition()); } catch (e) {}
    }

    var attempts = 0;
    var poll = window.setInterval(function () {
      attempts++;
      if (window.UserWay && typeof window.UserWay.setPosition === "function") {
        apply();
        window.clearInterval(poll);
        window.setTimeout(apply, 1000); // confirm it stuck
        mobileQuery.addEventListener("change", apply); // re-apply across the breakpoint
      } else if (attempts > 25) {
        window.clearInterval(poll); // gave up after ~5s, widget may not have loaded
      }
    }, 200);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initReveals();
    initLightbox();
    initVideoCards();
    initCtaScroll();
    initLeadForms();
    initContactLinks();
    initFooterYear();
    initCarousels();
    initUserWayPosition();
  });
})();
