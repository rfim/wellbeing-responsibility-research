// Motion helpers: scroll reveals, count-ups, typewriter rotators, PhD journey bar.
// Everything is skipped when the viewer prefers reduced motion.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var io = !reduce && "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; el.classList.add("in");
      if (el.hasAttribute("data-count")) countUp(el);
      if (el.hasAttribute("data-grow")) el.style.width = el.getAttribute("data-grow");
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }) : null;

  function countUp(el) {
    if (el._counted) return; el._counted = true;
    var target = parseFloat(el.getAttribute("data-count")), dec = (el.getAttribute("data-count").split(".")[1] || "").length;
    var pre = el.getAttribute("data-prefix") || "", suf = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = pre + target.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; return; }
    var t0 = performance.now(), dur = +(el.getAttribute("data-dur") || 1600);
    (function f(t) {
      var k = Math.min(1, (t - t0) / dur), v = target * (1 - Math.pow(1 - k, 3));
      el.textContent = pre + v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  // Mark elements for reveal; stagger siblings
  function scan(root, selector) {
    (root || document).querySelectorAll(selector || ".rv, [data-count], [data-grow]").forEach(function (el, i) {
      if (el._rv) return; el._rv = true;
      if (el.hasAttribute("data-grow") && !reduce) { el.style.width = "0"; }
      if (!io) { el.classList.add("in"); if (el.hasAttribute("data-count")) countUp(el); if (el.hasAttribute("data-grow")) el.style.width = el.getAttribute("data-grow"); return; }
      io.observe(el);
    });
  }
  function auto(selectors) {
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (el.classList.contains("rv")) return;
        el.classList.add("rv");
        var sibs = Array.prototype.filter.call(el.parentNode.children, function (x) { return x.matches(sel); });
        el.style.setProperty("--d", Math.min(0.6, sibs.indexOf(el) * 0.08) + "s");
      });
    });
    scan();
  }

  // Typewriter that cycles through phrases
  function rotate(el, phrases, opts) {
    opts = opts || {};
    if (!el || !phrases.length) return;
    if (reduce) { el.textContent = phrases[0]; return; }
    var i = 0, j = 0, del = false, hold = opts.hold || 1800;
    el.classList.add("tw");
    (function tick() {
      var p = Array.from(phrases[i % phrases.length]);
      if (!del) { j++; el.textContent = p.slice(0, j).join(""); if (j >= p.length) { if (opts.once && i === phrases.length - 1) return; del = true; return setTimeout(tick, hold); } return setTimeout(tick, opts.speed || 42); }
      j--; el.textContent = p.slice(0, j).join(""); if (j <= 0) { del = false; i++; return setTimeout(tick, 260); }
      setTimeout(tick, 18);
    })();
  }
  // Fade-swap rotator for longer lines
  function fadeRotate(el, lines, ms) {
    if (!el || !lines.length) return;
    var i = 0; el.textContent = lines[0];
    if (reduce || lines.length < 2) return;
    setInterval(function () {
      el.classList.add("fade-out");
      setTimeout(function () { i = (i + 1) % lines.length; el.textContent = lines[i]; el.classList.remove("fade-out"); }, 450);
    }, ms || 6500);
  }
  function greeting() { var h = new Date().getHours(); return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

  window.Motion = { scan: scan, auto: auto, rotate: rotate, fadeRotate: fadeRotate, countUp: countUp, greeting: greeting, reduce: reduce };
})();
