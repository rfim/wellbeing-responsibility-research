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
    // left icon rail (desktop) and bottom tab bar (phone), like an app
    (function () {
      var I = {
        home: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" rx="2"/>',
        pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
        plan: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
        book: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v16H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 0 7.5 23H19"/>',
        news: '<rect x="3" y="4" width="15" height="16" rx="3"/><path d="M18 8h3v9a3 3 0 0 1-3 3M7 8h7M7 12h7M7 16h4"/>',
        people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 5.5 5"/>',
        career: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
        ethics: '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
        thesis: '<path d="M4 5h11l5 5v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M14 5v6h6M8 14h8M8 17h5"/>'
      };
      function svg(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[k] + "</svg>"; }
      var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
      var main = [["index.html", "home", "Story & readiness"], ["editor.html", "pen", "Upgrade studio"], ["thesis.html", "thesis", "Thesis studio"], ["ethics.html", "ethics", "Ethics studio"], ["plan.html", "plan", "Plan"]];
      var more = [["literature.html", "book", "Literature"], ["news.html", "news", "News analytics"], ["people.html", "people", "People"], ["careers.html", "career", "Careers"]];
      function link(x) { return '<a href="' + x[0] + '" data-tip="' + x[2] + '" aria-label="' + x[2] + '"' + (here === x[0] ? ' aria-current="page"' : "") + ">" + svg(x[1]) + "</a>"; }
      var rail = document.createElement("nav"); rail.className = "rail"; rail.setAttribute("aria-label", "Quick navigation");
      rail.innerHTML = '<div class="rail-grp">' + main.map(link).join("") + '</div><div class="rail-grp">' + more.map(link).join("") + "</div>";
      document.body.appendChild(rail);
      var tabs = [["index.html", "home", "Story"], ["editor.html", "pen", "Studio"], ["plan.html", "plan", "Plan"], ["literature.html", "book", "Reading"], ["news.html", "news", "News"]];
      var tb = document.createElement("nav"); tb.className = "tabbar"; tb.setAttribute("aria-label", "App navigation");
      tb.innerHTML = tabs.map(function (x) { var on = here === x[0] || (x[0] === "editor.html" && /thesis|ethics/.test(here)); return '<a href="' + x[0] + '"' + (on ? ' aria-current="page"' : "") + ">" + svg(x[1]) + "<span>" + x[2] + "</span></a>"; }).join("");
      document.body.appendChild(tb);
      document.body.classList.add("has-rail");
    })();
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

  // Installable app: offline cache + an install button where the browser supports it (Android, desktop Chrome);
  // on iPhone, Safari’s Share → Add to Home Screen does the same.
  if ("serviceWorker" in navigator && location.protocol === "https:") { window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); }); }
  var deferredInstall = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; var b = document.getElementById("installApp"); if (b) b.hidden = false; });
  document.addEventListener("DOMContentLoaded", function () {
    var foot = document.querySelector("footer.site .wrap"); if (!foot) return;
    var standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (standalone) return;
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var d = document.createElement("div"); d.className = "install-tip";
    d.innerHTML = '<button type="button" id="installApp" class="btn" hidden>📱 Install as an app</button>' + (ios ? '<span class="small muted">📱 On iPhone: tap Share, then “Add to Home Screen” to use this as an app.</span>' : "");
    foot.appendChild(d);
    document.getElementById("installApp").addEventListener("click", function () { if (!deferredInstall) return; deferredInstall.prompt(); deferredInstall.userChoice.finally(function () { deferredInstall = null; document.getElementById("installApp").hidden = true; }); });
    if (deferredInstall) document.getElementById("installApp").hidden = false;
  });

  // Safe storage helpers for pages that remember small per-viewer state
  window.wrStore = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
})();
