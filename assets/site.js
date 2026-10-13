// Theme toggle (per-viewer preference) + small shared helpers
(function () {
  var root = document.documentElement;
  var KEY = "wr-theme";
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) {}

  function current() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function paint(btn) { btn.textContent = current() === "dark" ? "☀" : "☾"; }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('nav.main > a[href="index.html"], nav.main > a[href="careers.html"], nav.main > a[href="news.html"]').forEach(function (a) { a.classList.add("spark"); });
    // nav dropdowns: the menu is fixed-positioned so the scrolling mobile nav never clips it
    var openDd = null;
    function closeDd() { if (!openDd) return; openDd.btn.setAttribute("aria-expanded", "false"); openDd.menu.hidden = true; openDd = null; }
    document.querySelectorAll(".nav-dd").forEach(function (dd) {
      var b = dd.querySelector(".dd-btn"), m = dd.querySelector(".dd-menu");
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        if (openDd && openDd.btn === b) { closeDd(); return; }
        closeDd(); m.hidden = false; b.setAttribute("aria-expanded", "true"); openDd = { btn: b, menu: m };
        var r = b.getBoundingClientRect(), w = m.offsetWidth;
        m.style.top = (r.bottom + 6) + "px"; m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + "px";
        var first = m.querySelector("a"); if (first && e.detail === 0) first.focus();
      });
    });
    document.addEventListener("click", function (e) { if (openDd && !openDd.menu.contains(e.target)) closeDd(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && openDd) { var b = openDd.btn; closeDd(); b.focus(); } });
    window.addEventListener("scroll", closeDd, { passive: true }); window.addEventListener("resize", closeDd);
    var navEl = document.querySelector("nav.main"); if (navEl) navEl.addEventListener("scroll", closeDd, { passive: true });
    // collapsible blocks: <section class="block collapsible"> with a .section-head h2; closed by default
    document.querySelectorAll("section.collapsible:not([data-cb])").forEach(function (sec) {
      var wrap = sec.querySelector(".wrap"), head = wrap && wrap.querySelector(".section-head"), h2 = head && head.querySelector("h2");
      if (!h2) return; sec.dataset.cb = "1";
      var body = document.createElement("div"); body.className = "collapse-body"; body.id = (sec.id || "sec" + Math.random().toString(36).slice(2, 7)) + "-body";
      var n = head.nextSibling; while (n) { var nx = n.nextSibling; body.appendChild(n); n = nx; } wrap.appendChild(body);
      var b = document.createElement("button"); b.type = "button"; b.className = "sec-toggle"; b.setAttribute("aria-controls", body.id);
      b.innerHTML = '<span></span><span class="chev"></span>'; b.firstChild.innerHTML = h2.innerHTML; h2.innerHTML = ""; h2.appendChild(b);
      function setOpen(o) { sec.classList.toggle("is-closed", !o); body.hidden = !o; b.setAttribute("aria-expanded", o); b.querySelector(".chev").textContent = o ? "Hide ▴" : "Show ▾"; if (o) window.dispatchEvent(new Event("resize")); }
      b.addEventListener("click", function () { setOpen(sec.classList.contains("is-closed")); });
      setOpen(!!(location.hash && sec.id && location.hash === "#" + sec.id));
    });
    var btn = document.querySelector(".theme-btn");
    if (!btn) return;
    paint(btn);
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      paint(btn);
    });
  });

  // Safe storage helpers for pages that remember small per-viewer state
  window.wrStore = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
})();
