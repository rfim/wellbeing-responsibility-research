// Studio UX pass: calmer, roomier studio. Groups secondary controls into menus, removes repeated
// information, adds Focus mode and keeps sticky bars in step with the real header heights.
// It only moves existing elements, so every button keeps its original behaviour.
(function () {
  var $ = function (s) { return document.querySelector(s); };
  document.body.classList.add("studio-page");

  // ---- menus (reuse the studio's .menu / .menu-list pattern)
  function makeMenu(label, title, items) {
    var m = document.createElement("div"); m.className = "menu ux-menu";
    var b = document.createElement("button"); b.type = "button"; b.className = "btn ghost"; b.innerHTML = label; b.title = title; b.setAttribute("aria-haspopup", "true"); b.setAttribute("aria-expanded", "false");
    var list = document.createElement("div"); list.className = "menu-list"; list.setAttribute("role", "menu");
    items.forEach(function (el) { if (el) { el.classList.remove("btn", "ghost"); list.appendChild(el); } });
    m.appendChild(b); m.appendChild(list);
    b.addEventListener("click", function (e) { e.stopPropagation(); var open = !m.classList.contains("open"); closeAll(); m.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open)); });
    list.addEventListener("click", function () { setTimeout(closeAll, 0); });
    return m;
  }
  function closeAll() { document.querySelectorAll(".ux-menu.open, .ux-pop.open").forEach(function (x) { x.classList.remove("open"); var b = x.querySelector("[aria-expanded]"); if (b) b.setAttribute("aria-expanded", "false"); }); }
  document.addEventListener("click", function (e) { if (!e.target.closest(".ux-menu, .ux-pop")) closeAll(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });

  // ---- 1. top bar: one row, four controls
  var acts = $(".top-actions");
  if (acts) {
    var room = acts.querySelector('a[href*="claude.ai/artifact"]');
    var tools = makeMenu("Tools ▾", "Scope check, Zotero, NVivo and the Supervision Room", [$("#scopeBtn"), $("#zoteroBtn"), $("#nvivoBtn"), room]);
    var imp = makeMenu("Import ▾", "Bring in a Word file or a backup", [$("#wordBtn"), $("#importBtn")]);
    var w = $("#wordBtn"); if (w) w.innerHTML = "From Word (.docx)<small>Replace sections with your Word edits</small>";
    var ib = $("#importBtn"); if (ib) ib.innerHTML = "From a backup (.json)<small>Restore edits saved from another browser</small>";
    if (room) room.innerHTML = "💬 Supervision Room ↗<small>Saved discussions with your supervisors</small>";
    var exp = $("#exportMenu");
    acts.insertBefore(imp, exp ? exp.nextSibling : acts.firstChild);
    acts.insertBefore(tools, imp.nextSibling);
    var focus = document.createElement("button"); focus.type = "button"; focus.className = "btn ghost"; focus.id = "focusBtn"; focus.title = "Focus: hide the side panels and write (Esc or click again to leave)";
    acts.appendChild(focus);
    var soft = $("#softBtn"); if (soft) acts.insertBefore(soft, focus);
    function setFocus(on) { document.body.classList.toggle("focus", on); focus.innerHTML = on ? "⤡ Exit focus" : "⤢ Focus"; try { localStorage.setItem("wr-focus", on ? "1" : "0"); } catch (e) {} }
    focus.addEventListener("click", function () { setFocus(!document.body.classList.contains("focus")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("focus") && !document.querySelector("dialog[open]")) setFocus(false); });
    var f0 = false; try { f0 = localStorage.getItem("wr-focus") === "1"; } catch (e) {}
    setFocus(f0);
  }

  // ---- 2. section actions: one quiet “⋯” menu beside the heading instead of a row of six buttons
  var sa = $("#secActions"), hrow = $(".doc-head .hrow");
  if (sa && hrow) {
    var pop = document.createElement("div"); pop.className = "ux-pop";
    var t = document.createElement("button"); t.type = "button"; t.className = "ux-dots"; t.innerHTML = "⋯"; t.title = "Section actions: add, duplicate, move, archive"; t.setAttribute("aria-label", "Section actions"); t.setAttribute("aria-expanded", "false");
    pop.appendChild(t); pop.appendChild(sa); hrow.appendChild(pop);
    t.addEventListener("click", function (e) { e.stopPropagation(); var open = !pop.classList.contains("open"); closeAll(); pop.classList.toggle("open", open); t.setAttribute("aria-expanded", String(open)); });
    sa.addEventListener("click", function () { setTimeout(closeAll, 0); });
  }

  // ---- 3. toolbar: one row; table tools and versions tucked into small menus
  var tb = $("#toolbar");
  if (tb) {
    function group(label, title, sel) {
      var els = sel.map(function (s) { return tb.querySelector(s); }).filter(Boolean); if (!els.length) return null;
      var g = document.createElement("span"); g.className = "ux-pop tb-pop";
      var b = document.createElement("button"); b.type = "button"; b.className = "tb-more"; b.innerHTML = label; b.title = title; b.setAttribute("aria-expanded", "false");
      var list = document.createElement("span"); list.className = "tb-list"; els.forEach(function (el) { list.appendChild(el); });
      g.appendChild(b); g.appendChild(list);
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function (e) { e.stopPropagation(); var open = !g.classList.contains("open"); closeAll(); g.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open)); });
      list.addEventListener("mouseup", function () { setTimeout(closeAll, 0); });
      return g;
    }
    var tg = group("Insert ▾", "Link, table or figure", ['[data-act="link"], [data-cmd="link"]', '[data-act="figure"]', '[data-act="table"]', '[data-act="row"]', '[data-act="col"]', '[data-act="delrow"]']);
    if (tg) tb.insertBefore(tg, tb.querySelector(".grow"));
    var labels = { link: "Link…", figure: "Figure…", table: "Table", row: "Table: add row below", col: "Table: add column right", delrow: "Table: delete row" };
    tg && tg.querySelectorAll(".tb-list button").forEach(function (b) { var k = b.dataset.act || b.dataset.cmd; b.textContent = labels[k] || b.textContent; });
    // lists and the review toggle as compact symbols (the full words stay as tooltips)
    var ul = tb.querySelector('[data-cmd="insertUnorderedList"]'), ol = tb.querySelector('[data-cmd="insertOrderedList"]');
    if (ul) { ul.textContent = "•"; ul.title = "Bulleted list"; }
    if (ol) { ol.textContent = "1."; ol.title = "Numbered list"; }
    var sym = { sent: "S", para: "¶", sect: "§" };
    tb.querySelectorAll(".magic-toggle [data-magic]").forEach(function (b) { b.title = "Review by " + b.textContent.toLowerCase(); b.textContent = sym[b.dataset.magic] || b.textContent; });
    var more = group("More ▾", "Find, superscript, clear formatting, compare, history and restore", ['[data-act="find"]', '[data-cmd="superscript"]', '[data-cmd="removeFormat"]', '[data-act="compare"]', '[data-act="history"]', '[data-act="restore"]']);
    if (more) tb.appendChild(more);
    var nm = { find: "Find and replace…", superscript: "Superscript x²", removeFormat: "Clear formatting", compare: "Compare with original", history: "Version history", restore: "Restore original" };
    more && more.querySelectorAll(".tb-list button").forEach(function (b) { b.textContent = nm[b.dataset.cmd || b.dataset.act] || b.textContent; });
    // drop separators that now sit next to each other
    tb.querySelectorAll(".sep").forEach(function (s) { var p = s.previousElementSibling; if (!p || p.classList.contains("sep")) s.remove(); });
  }

  // ---- 4. stance, justice and codes gauges: hidden by default behind one slim toggle
  var panel = document.querySelector("aside.panel");
  if (panel) {
    var gt = document.createElement("button"); gt.type = "button"; gt.className = "ux-gtoggle"; gt.setAttribute("aria-expanded", "false");
    panel.insertBefore(gt, panel.firstChild);
    function gHost() { return $("#gaugeHost"); }
    function gSummary() {
      var h = gHost(), nums = h ? h.querySelectorAll(".ss-num") : [];
      var codes = nums.length ? nums[nums.length - 1].textContent.trim() : "";
      return codes ? "codes " + codes : "";
    }
    function setG(on) {
      var h = gHost(); if (h) h.hidden = !on;
      gt.setAttribute("aria-expanded", String(on));
      gt.innerHTML = "<span>⚖ Stance, justice &amp; codes</span><em>" + (on ? "Hide" : (gSummary() ? gSummary() + " · " : "") + "Show") + "</em>";
      try { localStorage.setItem("wr-gauges", on ? "1" : "0"); } catch (e) {}
    }
    var g0 = false; try { g0 = localStorage.getItem("wr-gauges") === "1"; } catch (e) {}
    gt.addEventListener("click", function () { setG(gt.getAttribute("aria-expanded") !== "true"); });
    // the gauge box is (re)painted by studio.js; keep it hidden and the summary fresh
    new MutationObserver(function () { var h = gHost(); if (h && h.previousElementSibling !== gt) panel.insertBefore(gt, h); setG(gt.getAttribute("aria-expanded") === "true"); }).observe(panel, { childList: true, subtree: false });
    var hostNow = gHost(); if (hostNow) { panel.insertBefore(gt, hostNow); new MutationObserver(function () { if (gt.getAttribute("aria-expanded") !== "true") setG(false); }).observe(hostNow, { childList: true }); }
    setG(g0);
  }

  // ---- 5. keep sticky bars in step with the actual header and top-bar heights
  function measure() {
    var h = document.querySelector("header.site"), st = document.querySelector(".studio-top");
    if (h) document.documentElement.style.setProperty("--hdr", Math.round(h.getBoundingClientRect().height) + "px");
    if (st) document.documentElement.style.setProperty("--stop", Math.round(st.getBoundingClientRect().height) + "px");
  }
  measure(); window.addEventListener("resize", measure);
  if (window.ResizeObserver) { var ro = new ResizeObserver(measure); ["header.site", ".studio-top"].forEach(function (s) { var el = $(s); if (el) ro.observe(el); }); }
})();
