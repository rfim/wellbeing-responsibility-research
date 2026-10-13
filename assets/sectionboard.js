// Section board for the story page: a quiet live score for every section of the upgrade document,
// with Read / Suggestions / Supervisors / Revise tabs, and a compiled read-through of the whole draft.
// Uses the same checks as the studio (Checks, Insight, TitleKit) and saves edits to the same DocStore.
(function () {
  var DS = window.DocStore, CK = window.Checks, IN = window.Insight, TK = window.TitleKit;
  var root = document.getElementById("sectionBoard");
  if (!DS || !CK || !IN || !root) return;
  var ROOM_URL = "https://claude.ai/artifact/QHVfPRvosRnJqJiZYhWT3t";
  var SKIP = { references: 1, appendices: 1 };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function wcount(t) { return (String(t).match(/\S+/g) || []).length; }
  function label(s) { return (s.num ? "§" + s.num + " " : "") + s.heading; }
  function cmpNum(a, b) { var x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); return (x[0] - y[0]) || ((x[1] || 0) - (y[1] || 0)) || ((x[2] || 0) - (y[2] || 0)); }

  // Same ordering as the studio sidebar: deleted sections hidden, added ones slotted in, custom order respected.
  function ordered() {
    var st = DS.state(), del = st.deleted || {};
    var list = DS.sections().filter(function (s) { return !del[s.id]; });
    var orig = list.filter(function (s) { return !s.custom; }), added = list.filter(function (s) { return s.custom; });
    added.forEach(function (a) {
      var idx = a.after ? orig.findIndex(function (o) { return o.id === a.after; }) : -1;
      if (idx < 0) orig.forEach(function (o, i) { if (o.num && a.num && o.num.split(".")[0] === a.num.split(".")[0] && cmpNum(o.num, a.num) <= 0) idx = i; });
      if (idx < 0) idx = orig.findIndex(function (o) { return o.id === "references"; }) - 1;
      orig.splice(idx + 1, 0, a);
    });
    if (Array.isArray(st.order) && st.order.length) {
      var pos = new Map(st.order.map(function (id, i) { return [id, i]; }));
      var known = orig.filter(function (s) { return pos.has(s.id); }).sort(function (a, b) { return pos.get(a.id) - pos.get(b.id); });
      orig.forEach(function (u, i) { if (pos.has(u.id)) return; var prev = orig.slice(0, i).reverse().find(function (x) { return known.indexOf(x) >= 0; }); known.splice(prev ? known.indexOf(prev) + 1 : 0, 0, u); });
      return known;
    }
    return orig;
  }

  // ------------------------------------------------------------------ scoring
  function parasOf(html) {
    var d = document.createElement("div"); d.innerHTML = html || "";
    return Array.prototype.filter.call(d.querySelectorAll("p, li, blockquote"), function (x) { return !x.closest("td,th,figure") && x.textContent.trim().length > 25 && !x.classList.contains("caption"); });
  }
  function context() {
    var list = ordered(), at = {}, usedFigs = [], figCount = 0, tables = [];
    list.forEach(function (s) {
      var t = DS.textOf(s.html);
      at[s.id] = { text: (s.custom && s.heading ? s.heading + "\n" : "") + t, label: label(s), num: s.num, html: s.html };
      (String(s.html).match(/data-fig="([a-z]+)"/g) || []).forEach(function (m) { usedFigs.push(m.slice(10, -1)); });
      figCount += (String(s.html).match(/<figure/g) || []).length;
      (t.match(/^Table (\d+\.\d+)/gm) || []).forEach(function (m) { tables.push(m.slice(6)); });
    });
    return { list: list, at: at, usedFigs: usedFigs, figCount: figCount, tables: tables, nums: list.map(function (s) { return s.num; }).filter(Boolean) };
  }
  function band(n) { return n == null ? "na" : n >= 85 ? "ok" : n >= 70 ? "mid" : "low"; }
  function bandName(n) { return n == null ? "Not scored" : n >= 85 ? "Ready" : n >= 70 ? "Polish" : "Needs work"; }
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

  function analyse(s, C) {
    var text = DS.textOf(s.html), words = wcount(text);
    if (SKIP[s.id]) return { id: s.id, skip: true, words: words, text: text };
    if (s.id === "title" || s.kind === "title") {
      var t = text.replace(/\s+/g, " ").trim(), sc = TK ? TK.score(t) : null;
      var sugs = TK ? TK.suggestions(t) : [];
      var g = CK.grammar(t, "title");
      return { id: s.id, title: true, words: words, text: t, score: sc, sub: { Clarity: TK ? TK.altScores(t).clarity : null, Keywords: TK ? TK.altScores(t).keywords : null, Concision: TK ? TK.altScores(t).concision : null }, grammar: g, coh: [], sugs: sugs.filter(function (x) { return x.kind !== "Looks good"; }), tags: IN.tagsOf(t), hash: hashOf(t) };
    }
    // 1. Language: grammar & style issues, per 500 words
    var g = CK.grammar(text, s.id);
    var ign = get("wr-ignore", {});
    g = g.filter(function (i) { return !ign[s.id + "|" + i.rule + "|" + i.match]; });
    var pen = 0; g.forEach(function (i) { pen += i.sev === "error" ? 10 : i.sev === "warn" ? 4 : 1; });
    var lang = clamp(100 - pen * 800 / Math.max(words, 250));
    // 2. Flow: coherence engine
    var paraObjs = (function () { var d = document.createElement("div"); d.innerHTML = s.html || ""; return Array.prototype.filter.call(d.querySelectorAll("p, li, blockquote"), function (p) { return !p.closest("td,th,figure"); }).map(function (p) { return { text: p.textContent.replace(/ /g, " "), isList: p.nodeName === "LI", caption: p.classList.contains("caption") }; }); })();
    var coh = { findings: [], score: 100 };
    try { coh = CK.coherence({ id: s.id }, paraObjs, C.at, C.nums, C.figCount, C.tables); } catch (e) {}
    // 3. Craft: paragraph-level suggestions (citations, agency, signposting…)
    var ps = parasOf(s.html), sugs = [], craftSum = 0;
    ps.forEach(function (p, i) {
      var a = IN.analyse(p, { usedFigs: C.usedFigs, isFirst: i === 0, isLast: i === ps.length - 1, sectionId: s.id });
      var real = a.suggestions.filter(function (x) { return x.kind !== "Looks good"; });
      var lost = 0; real.forEach(function (x) { lost += (x.prio || 5) * 2.4; });
      craftSum += Math.max(0, 100 - lost);
      real.forEach(function (x) { sugs.push(Object.assign({ para: i + 1 }, x)); });
    });
    var craft = ps.length ? clamp(craftSum / ps.length) : 100;
    sugs.sort(function (a, b) { return (b.prio || 0) - (a.prio || 0); });
    var score = clamp(lang * 0.35 + coh.score * 0.35 + craft * 0.30);
    return { id: s.id, words: words, text: text, score: score, sub: { Language: lang, Flow: coh.score, Craft: craft }, grammar: g, coh: coh.findings, sugs: sugs, tags: IN.tagsOf(text), hash: hashOf(text.slice(0, 300)), paras: ps.length };
  }
  function hashOf(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return Math.abs(h); }

  // ------------------------------------------------------------------ state
  var C = context(), R = {}, open = null, tab = get("wr-board-tab2", "sup"), view = "sections", spins = {};
  function scoreAll() { C = context(); R = {}; C.list.forEach(function (s) { R[s.id] = analyse(s, C); }); saveSummary(); }
  function rescore(id) { C = context(); var s = C.list.find(function (x) { return x.id === id; }); if (s) R[id] = analyse(s, C); saveSummary(); }
  function scored() { return C.list.filter(function (s) { return R[s.id] && R[s.id].score != null; }); }
  function summary() {
    var xs = scored(), tot = 0, w = 0;
    xs.forEach(function (s) { var ww = Math.max(60, R[s.id].words); tot += R[s.id].score * ww; w += ww; });
    var avg = w ? Math.round(tot / w) : null;
    var counts = { ok: 0, mid: 0, low: 0 }; xs.forEach(function (s) { counts[band(R[s.id].score)]++; });
    var weakest = xs.slice().sort(function (a, b) { return R[a.id].score - R[b.id].score; }).slice(0, 3);
    return { avg: avg, counts: counts, weakest: weakest, n: xs.length };
  }
  function saveSummary() {
    var S = summary(), per = {};
    scored().forEach(function (s) { per[s.id] = R[s.id].score; });
    set("wr-section-scores", { avg: S.avg, per: per, t: Date.now() });
  }

  // ------------------------------------------------------------------ persistence (same shape as the studio)
  function persist(id, html) {
    var st = DS.state(); st.sections = st.sections || {}; st.history = st.history || {};
    st.sections[id] = Object.assign({}, st.sections[id] || {}, { html: html, updated: Date.now() });
    var h = st.history[id] = st.history[id] || [], last = h[h.length - 1];
    if (!last || Date.now() - last.t > 120000) { h.push({ t: Date.now(), html: html }); if (h.length > 15) h.shift(); } else last.html = html;
    return DS.save(st);
  }

  // ------------------------------------------------------------------ render
  function chip(n, small) {
    return '<span class="sb-chip ' + band(n) + (small ? " sm" : "") + '" title="' + bandName(n) + '"><i></i>' + (n == null ? "–" : n) + "</span>";
  }
  function trio(sub) {
    return '<span class="sb-trio">' + Object.keys(sub).map(function (k) { return '<span><b>' + (sub[k] == null ? "–" : sub[k]) + "</b> " + k.toLowerCase() + "</span>"; }).join("") + "</span>";
  }
  function renderSummary() {
    var S = summary(), el = document.getElementById("sbSummary");
    var strip = C.list.map(function (s) { var r = R[s.id]; return '<button type="button" class="sb-tick ' + band(r && r.score) + '" data-open="' + s.id + '" title="' + esc(label(s)) + " · " + (r && r.score != null ? r.score : "not scored") + '" aria-label="' + esc(label(s)) + '"></button>'; }).join("");
    el.innerHTML =
      '<div class="sb-sum-main"><div class="sb-avg">' + (S.avg == null ? "–" : S.avg) + '<small>/100</small></div>' +
      '<div><div class="sb-sum-h">Section readiness, live</div><div class="small muted">Word-weighted across ' + S.n + ' sections · ' +
      '<span class="sb-k ok"></span>' + S.counts.ok + ' ready · <span class="sb-k mid"></span>' + S.counts.mid + ' to polish · <span class="sb-k low"></span>' + S.counts.low + ' need work</div></div></div>' +
      '<div class="sb-strip" role="group" aria-label="Every section, in order">' + strip + "</div>" +
      (S.weakest.length ? '<div class="small muted sb-start">Start with: ' + S.weakest.map(function (s) { return '<a href="#sec-' + s.id + '" data-open="' + s.id + '">' + esc(label(s)) + "</a> (" + R[s.id].score + ")"; }).join(" · ") + "</div>" : "");
    // feed the studio-scores card above
    var rows = document.getElementById("scoreRows");
    if (rows) {
      var old = document.getElementById("sbScoreRow"); if (old) old.remove();
      var d = document.createElement("div"); d.className = "score-row"; d.id = "sbScoreRow";
      d.innerHTML = '<div><div class="sl">Sections · live average</div><div class="sv">' + S.counts.ok + " ready, " + S.counts.mid + " to polish, " + S.counts.low + ' need work · <a href="#sections">see each section</a></div></div><div class="sn">' + (S.avg == null ? "–" : S.avg) + '</div><div class="sb"><i style="width:' + (S.avg || 0) + '%"></i><b style="left:85%"></b></div>';
      rows.appendChild(d);
    }
  }
  function renderList() {
    var el = document.getElementById("sbList"), chap = null, h = "";
    C.list.forEach(function (s) {
      if (s.chapter !== chap) { chap = s.chapter; h += '<div class="sb-chap">' + esc(chap) + "</div>"; }
      var r = R[s.id] || {}, isOpen = open === s.id;
      h += '<div class="sb-item' + (isOpen ? " open" : "") + '" id="sec-' + s.id + '">' +
        '<button type="button" class="sb-row" data-toggle="' + s.id + '" aria-expanded="' + isOpen + '">' +
        '<span class="sb-name">' + esc(label(s)) + (s.edited ? ' <span class="sb-ed" title="Revised in this browser">revised</span>' : "") + "</span>" +
        '<span class="sb-meta">' + (r.words || 0).toLocaleString() + " words" + (r.score != null && r.sugs ? " · " + (r.grammar || []).filter(function (i) { return i.sev !== "info"; }).length + " checks · " + r.sugs.length + " ideas" : "") + "</span>" +
        chip(r.score) + "</button>" +
        (isOpen ? '<div class="sb-panel" id="sbPanel">' + panel(s, r) + "</div>" : "") + "</div>";
    });
    el.innerHTML = h;
    if (open) wirePanel(open);
  }
  var TABS = [["sup", "Supervisor comments"], ["suggest", "Suggestions"], ["revise", "Revise"], ["read", "Read"]];
  function panel(s, r) {
    var head = '<div class="sb-tabs" role="tablist">' + TABS.map(function (t) {
      var n = t[0] === "suggest" ? ((r.sugs || []).length + (r.grammar || []).filter(function (i) { return i.sev !== "info"; }).length + (r.coh || []).length) : null;
      return '<button type="button" role="tab" aria-selected="' + (tab === t[0]) + '" data-tab="' + t[0] + '">' + t[1] + (n ? " <em>" + n + "</em>" : "") + "</button>";
    }).join("") + '<span class="sb-tabs-r">' + (r.sub ? trio(r.sub) : "") + "</span></div>";
    var body = "";
    if (r.skip) body = '<p class="small muted">' + esc(s.heading) + ' is not scored. <a href="editor.html#' + s.id + '">Edit it in the studio</a>.</p>' + '<div class="sb-read">' + (s.html || "") + "</div>";
    else if (tab === "read") body = '<div class="sb-read">' + (r.title ? "<p><b>" + esc(r.text) + "</b></p>" : s.html) + "</div>";
    else if (tab === "suggest") body = suggestHtml(s, r);
    else if (tab === "sup") body = supHtml(s, r);
    else body = reviseHtml(s, r);
    return head + '<div class="sb-body">' + body + '</div><div class="sb-foot small muted"><span id="sbSaved"></span><a href="editor.html#' + s.id + '">Open in the upgrade studio ↗</a></div>';
  }
  function suggestHtml(s, r) {
    var h = "", fixes = (r.grammar || []).filter(function (i) { return i.sev !== "info" || i.fix != null; });
    if (r.title) {
      h += r.sugs.length ? r.sugs.map(function (x) { return item(x); }).join("") : '<p class="small muted">The title passes every check. ✓</p>';
      return h;
    }
    if (fixes.length) h += '<div class="sb-h">Language · ' + fixes.length + "</div>" + fixes.slice(0, 12).map(function (i, n) {
      return '<div class="sb-sug sev-' + i.sev + '"><div class="sb-sug-k">' + esc(i.cat) + "</div><div>" + esc(i.msg) + ' <code>' + esc(i.match.length > 60 ? i.match.slice(0, 60) + "…" : i.match) + "</code>" + (i.fix != null ? " → <code>" + esc(i.fix === "" ? "(delete)" : i.fix) + "</code>" : "") + "</div>" +
        '<div class="sb-acts">' + (i.fix != null ? '<button type="button" data-fix="' + (r.grammar.indexOf(i)) + '">Apply</button>' : "") + '<button type="button" data-ign="' + r.grammar.indexOf(i) + '">Ignore</button></div></div>';
    }).join("");
    if (r.coh.length) h += '<div class="sb-h">Flow · ' + r.coh.length + "</div>" + r.coh.map(function (f) { return '<div class="sb-sug sev-' + f.sev + '"><div class="sb-sug-k">' + esc(f.type) + "</div><div>" + esc(f.msg) + "</div>" + (f.para != null ? '<div class="sb-acts"><button type="button" data-show="' + (f.para + 1) + '">Show ¶' + (f.para + 1) + "</button></div>" : "") + "</div>"; }).join("");
    if (r.sugs.length) h += '<div class="sb-h">Craft · ' + r.sugs.length + ' <span class="muted">(sorted by priority)</span></div>' + r.sugs.slice(0, 10).map(item).join("") + (r.sugs.length > 10 ? '<p class="small muted">' + (r.sugs.length - 10) + ' more in the studio.</p>' : "");
    if (!h) h = '<p class="small muted">No issues found in this section. ✓ Try the Supervisors tab to test the argument.</p>';
    return h;
  }
  function item(x) {
    var sc = x.impact != null ? '<span class="sb-s3"><span title="Impact on the rubric">impact <b>' + x.impact + '</b></span><span title="Ease of fixing">ease <b>' + x.ease + '</b></span><span title="How visible it is to an examiner">visible <b>' + x.vis + "</b></span></span>" : "";
    return '<div class="sb-sug"><div class="sb-sug-k">' + (x.icon ? x.icon + " " : "") + esc(x.kind) + (x.para ? " · ¶" + x.para : "") + "</div><div>" + esc(x.text) + "</div>" +
      '<div class="sb-acts">' + sc + (x.para ? '<button type="button" data-show="' + x.para + '">Show ¶' + x.para + "</button>" : "") + "</div></div>";
  }
  function reflKey() { return "wr-reflect"; }
  function supHtml(s, r) {
    var a = { tags: r.tags || [], hash: r.hash || 0, sect: !r.title, titleMode: !!r.title, text: r.text };
    var ref = get(reflKey(), {}), mine = ((ref[s.id] || {})[a.hash]) || {};
    return '<div class="sb-sups">' + Object.keys(IN.PERSONAS).map(function (k) {
      var q = IN.ask(k, a, spins[s.id + k] || 0), P = q.persona;
      return '<div class="sb-sup" style="--pc:' + P.color + '"><div class="sb-sup-h"><b>' + esc(P.name) + "</b> " + (P.flag || "") + '<span class="small muted">' + esc(P.role) + " · " + esc(P.aff) + "</span></div>" +
        '<p class="sb-react">“' + esc(q.reaction) + "”</p><p class=\"sb-q\">" + esc(q.question) + "</p>" +
        '<textarea data-ans="' + k + '" rows="2" placeholder="Think aloud: your answer saves in this browser">' + esc((mine[k] && mine[k].a) || "") + "</textarea>" +
        '<div class="sb-acts"><button type="button" data-spin="' + k + '">Another question</button><a class="sb-send" data-room="' + k + '" href="' + ROOM_URL + '" target="_blank" rel="noopener" title="Copies the section, the question and your answer, then opens the Supervision Room. Paste there once (⌘V) and the discussion starts">💬 Send to ' + esc(P.short) + ' ↗</a></div></div>';
    }).join("") + '</div><p class="small muted" style="margin:8px 0 0">These are imagined prompts in each supervisor’s research area, not their words. To keep a real back-and-forth, <a href="' + ROOM_URL + '" target="_blank" rel="noopener">open the Supervision Room ↗</a>.</p>';
  }
  function reviseHtml(s, r) {
    if (r.title) return '<textarea class="sb-title-ed" rows="2" aria-label="Title">' + esc(r.text) + '</textarea><p class="small muted">Use “Main title: subtitle”. The score updates as you type.</p>';
    return '<div class="sb-edit" contenteditable="true" spellcheck="true" aria-label="Edit ' + esc(label(s)) + '">' + s.html + '</div><p class="small muted" style="margin:6px 0 0">Edits save as you type and appear in the studio too. Pasting keeps plain text only.</p>';
  }

  // ------------------------------------------------------------------ interaction
  var saveT = null;
  function currentHtml(id) { var ed = root.querySelector(".sb-edit"); return ed && open === id ? ed.innerHTML : (DS.get(id) || {}).html; }
  function afterEdit(id) {
    rescore(id);
    var r = R[id], row = root.querySelector('#sec-' + id + ' .sb-row');
    if (row) { row.querySelector(".sb-chip").outerHTML = chip(r.score); }
    var tr = root.querySelector(".sb-tabs-r"); if (tr && r.sub) tr.innerHTML = trio(r.sub);
    var sv = document.getElementById("sbSaved"); if (sv) sv.textContent = "Saved " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · score " + r.score;
    renderSummary(); if (view === "compiled") renderCompiled();
  }
  function wirePanel(id) {
    var p = document.getElementById("sbPanel"); if (!p) return;
    p.querySelectorAll("[data-tab]").forEach(function (b) { b.addEventListener("click", function () { tab = b.dataset.tab; set("wr-board-tab2", tab); renderList(); var t = root.querySelector('[data-tab="' + tab + '"]'); if (t) t.focus(); }); });
    var ed = p.querySelector(".sb-edit");
    if (ed) {
      ed.addEventListener("input", function () { clearTimeout(saveT); var sv = document.getElementById("sbSaved"); if (sv) sv.textContent = "Saving…"; saveT = setTimeout(function () { if (!persist(id, ed.innerHTML)) { if (sv) sv.textContent = "Browser storage is full. Export a backup from the studio."; return; } afterEdit(id); }, 700); });
      ed.addEventListener("paste", function (e) { e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData("text/plain"); document.execCommand("insertText", false, t); });
    }
    var te = p.querySelector(".sb-title-ed");
    if (te) te.addEventListener("input", function () { clearTimeout(saveT); saveT = setTimeout(function () { persist(id, esc(te.value.replace(/\s+/g, " ").trim())); afterEdit(id); }, 600); });
    p.querySelectorAll("[data-fix]").forEach(function (b) { b.addEventListener("click", function () { applyFix(id, R[id].grammar[+b.dataset.fix], b); }); });
    p.querySelectorAll("[data-ign]").forEach(function (b) { b.addEventListener("click", function () { var i = R[id].grammar[+b.dataset.ign], ign = get("wr-ignore", {}); ign[id + "|" + i.rule + "|" + i.match] = 1; set("wr-ignore", ign); rescore(id); renderList(); renderSummary(); }); });
    p.querySelectorAll("[data-show]").forEach(function (b) { b.addEventListener("click", function () { showPara(id, +b.dataset.show); }); });
    p.querySelectorAll("[data-spin]").forEach(function (b) { b.addEventListener("click", function () { var k = id + b.dataset.spin; spins[k] = (spins[k] || 0) + 1; renderList(); }); });
    p.querySelectorAll("[data-room]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.dataset.room, r = R[id], s = DS.get(id) || {}, a = { tags: r.tags || [], hash: r.hash || 0, sect: !r.title, titleMode: !!r.title, text: r.text };
        var q = IN.ask(k, a, spins[id + k] || 0), ta = p.querySelector('textarea[data-ans="' + k + '"]');
        var payload = "SUPERVISION-ROOM/1\n" + JSON.stringify({ section: "Upgrade " + label(s), passage: r.text.slice(0, 20000), persona: k, reaction: q.reaction, question: q.question, answer: ta ? ta.value.trim() : "" });
        var sv = document.getElementById("sbSaved");
        var msg = function (t) { if (sv) sv.textContent = t; };
        try { navigator.clipboard.writeText(payload).then(function () { msg("Copied. In the Supervision Room press ⌘V (Ctrl+V) once: the discussion starts and " + q.persona.short + " replies."); }, function () { msg("Couldn’t copy automatically. Paste the section into the Room yourself."); }); } catch (e) { msg("Couldn’t copy automatically. Paste the section into the Room yourself."); }
      });
    });
    p.querySelectorAll("textarea[data-ans]").forEach(function (t) {
      t.addEventListener("input", function () {
        var r = R[id], k = t.dataset.ans, a = { tags: r.tags || [], hash: r.hash || 0, sect: !r.title, titleMode: !!r.title, text: r.text };
        var q = IN.ask(k, a, spins[id + k] || 0), ref = get(reflKey(), {});
        ref[id] = ref[id] || {}; ref[id][r.hash] = ref[id][r.hash] || { excerpt: r.text.slice(0, 120) };
        ref[id][r.hash][k] = { q: q.question, a: t.value, t: Date.now() }; set(reflKey(), ref);
        var sv = document.getElementById("sbSaved"); if (sv) sv.textContent = "Answer saved";
      });
    });
  }
  function applyFix(id, i, btn) {
    if (!i) return;
    if (id === "title") { var t = DS.text("title"), nt = t.replace(i.match, i.fix || ""); persist(id, esc(nt)); rescore(id); renderList(); renderSummary(); return; }
    var d = document.createElement("div"); d.innerHTML = currentHtml(id);
    var w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT), n, done = false;
    while ((n = w.nextNode())) { var k = n.nodeValue.indexOf(i.match); if (k >= 0) { n.nodeValue = n.nodeValue.slice(0, k) + (i.fix || "") + n.nodeValue.slice(k + i.match.length); done = true; break; } }
    if (!done) { btn.textContent = "Fix it in the studio"; btn.disabled = true; return; }
    persist(id, d.innerHTML); rescore(id); renderList(); renderSummary();
    var sv = document.getElementById("sbSaved"); if (sv) sv.textContent = "Applied · score " + R[id].score;
  }
  function showPara(id, n) {
    tab = "revise"; set("wr-board-tab2", tab); renderList();
    var ed = root.querySelector(".sb-edit"); if (!ed) return;
    var ps = Array.prototype.filter.call(ed.querySelectorAll("p, li, blockquote"), function (x) { return !x.closest("td,th,figure") && x.textContent.trim().length > 25 && !x.classList.contains("caption"); });
    var p = ps[n - 1]; if (!p) return;
    p.classList.add("sb-flash"); p.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(function () { p.classList.remove("sb-flash"); }, 2400);
  }
  function openSection(id, scroll) {
    view = "sections"; paintView(); open = id; renderList();
    var el = document.getElementById("sec-" + id); if (el && scroll !== false) el.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-toggle]"); if (t) { var id = t.dataset.toggle; open = open === id ? null : id; renderList(); return; }
    var o = e.target.closest("[data-open]"); if (o) { e.preventDefault(); openSection(o.dataset.open); }
  });

  // ------------------------------------------------------------------ compiled draft
  // one quiet supervisor note per section, rotating between the three lenses
  function note(s, r, k) {
    if (r.score == null || r.skip) return "";
    var keys = Object.keys(IN.PERSONAS), pk = keys[k % keys.length];
    var q = IN.ask(pk, { tags: r.tags || [], hash: r.hash || 0, sect: !r.title, titleMode: !!r.title, text: r.text }, spins[s.id + pk] || 0), P = q.persona;
    return '<aside class="cd-note" style="--pc:' + P.color + '"><b>' + esc(P.short) + '</b> <span>' + esc(q.question) + '</span> <button type="button" data-open="' + s.id + '">Answer</button></aside>';
  }
  function renderCompiled() {
    var el = document.getElementById("sbCompiled"), chap = null, h = "", k = 0;
    C.list.forEach(function (s) {
      var r = R[s.id] || {};
      if (s.id === "title") { h += '<h3 class="cd-title">' + esc(DS.title()) + ' <button type="button" class="cd-chip" data-open="title">' + chip(r.score, true) + "</button></h3>" + note(s, r, k++); return; }
      if (s.chapter !== chap && !/front|back/i.test(s.chapter)) { chap = s.chapter; h += '<div class="cd-chap">' + esc(chap) + "</div>"; }
      h += '<section class="cd-sec"><h4>' + esc(label(s)) + (r.score != null ? ' <button type="button" class="cd-chip" data-open="' + s.id + '" title="Open the suggestions for this section">' + chip(r.score, true) + "</button>" : "") + "</h4>" + note(s, r, ++k) + (s.html || "") + "</section>";
    });
    el.innerHTML = h;
    var w = 0; C.list.forEach(function (s) { w += (R[s.id] || {}).words || 0; });
    document.getElementById("sbCompiledMeta").textContent = w.toLocaleString() + " words · about " + Math.round(w / 230) + " minutes to read";
  }
  function paintView() {
    root.querySelectorAll("[data-view]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.view === view); });
    document.getElementById("sbSections").hidden = view !== "sections";
    document.getElementById("sbCompiledWrap").hidden = view !== "compiled";
    if (view === "compiled") renderCompiled();
  }
  root.querySelectorAll("[data-view]").forEach(function (b) { b.addEventListener("click", function () { view = b.dataset.view; paintView(); }); });

  // live: rescore when the studio (another tab) saves
  window.addEventListener("storage", function (e) {
    if (e.key !== DS.KEY) return;
    var a = document.activeElement; if (a && root.contains(a) && (a.isContentEditable || a.tagName === "TEXTAREA")) return;
    scoreAll(); renderSummary(); renderList(); if (view === "compiled") renderCompiled();
  });

  scoreAll(); renderSummary(); renderList(); paintView();
  var hid = (location.hash || "").replace(/^#sec-/, "");
  if (hid && hid !== location.hash && R[hid]) openSection(hid);
  else if (R.abstract) { open = "abstract"; renderList(); } // supervisors' comments on the abstract are visible straight away
})();
