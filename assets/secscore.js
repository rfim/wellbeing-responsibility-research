// Section score (0–100) shared by the story page and the three studios, so every place shows the same number.
// Three parts: Language (grammar & style issues per 500 words), Flow (coherence engine) and Craft (paragraph suggestions).
(function () {
  var CK = window.Checks, IN = window.Insight, TK = window.TitleKit;
  var SKIP = { references: 1, appendices: 1 };
  var PROMPT = /<p class="prompt">[\s\S]*?<\/p>/g;
  function wcount(t) { return (String(t).match(/\S+/g) || []).length; }
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }
  function hashOf(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return Math.abs(h); }
  function band(n) { return n == null ? "na" : n >= 85 ? "ok" : n >= 70 ? "mid" : "low"; }
  function bandName(n) { return n == null ? "Not scored" : n >= 85 ? "Ready" : n >= 70 ? "Polish" : "Needs work"; }
  function parasOf(html) {
    var d = document.createElement("div"); d.innerHTML = html || "";
    return Array.prototype.filter.call(d.querySelectorAll("p, li, blockquote"), function (x) { return !x.closest("td,th,figure") && x.textContent.trim().length > 25 && !x.classList.contains("caption") && !x.classList.contains("prompt"); });
  }
  function label(s) { return (s.num ? "§" + s.num + " " : "") + s.heading; }
  // list: sections in document order (each with id, num, heading, html, custom?)
  function context(list, DS) {
    var at = {}, usedFigs = [], figCount = 0, tables = [];
    list.forEach(function (s) {
      var t = DS.textOf(String(s.html || "").replace(PROMPT, ""));
      at[s.id] = { text: (s.custom && s.heading ? s.heading + "\n" : "") + t, label: label(s), num: s.num, html: s.html };
      (String(s.html).match(/data-fig="([a-z]+)"/g) || []).forEach(function (m) { usedFigs.push(m.slice(10, -1)); });
      figCount += (String(s.html).match(/<figure/g) || []).length;
      (t.match(/^Table (\d+\.\d+)/gm) || []).forEach(function (m) { tables.push(m.slice(6)); });
    });
    return { list: list, at: at, usedFigs: usedFigs, figCount: figCount, tables: tables, nums: list.map(function (s) { return s.num; }).filter(Boolean) };
  }
  function analyse(s, C, DS, ignore, opts) {
    var k = (opts && opts.critical ? 1.6 : 1) * (opts && opts.strict ? 1.3 : 1);
    var html = String(s.html || "").replace(PROMPT, ""), text = DS.textOf(html), words = wcount(text);
    if (SKIP[s.id]) return { id: s.id, skip: true, words: words, text: text };
    if (s.id === "title" || s.kind === "title") {
      var t = text.replace(/\s+/g, " ").trim(), alt = TK ? TK.altScores(t) : null;
      return { id: s.id, title: true, words: words, text: t, score: TK ? clamp(100 - (100 - TK.score(t)) * k) : null, sub: alt ? { Clarity: alt.clarity, Keywords: alt.keywords, Concision: alt.concision } : {}, grammar: CK.grammar(t, "title"), coh: [], sugs: (TK ? TK.suggestions(t) : []).filter(function (x) { return x.kind !== "Looks good"; }), tags: IN.tagsOf(t), hash: hashOf(t) };
    }
    if (words < 3) return { id: s.id, empty: true, words: words, text: text, score: null, sub: {}, grammar: [], coh: [], sugs: [], tags: [], hash: 0 };
    var g = CK.grammar(text, s.id);
    if (ignore) g = g.filter(function (i) { return !ignore[s.id + "|" + i.rule + "|" + i.match]; });
    var pen = 0; g.forEach(function (i) { pen += i.sev === "error" ? 10 : i.sev === "warn" ? 4 : (k > 1 ? 2 : 1); });
    var lang = clamp(100 - k * pen * 800 / Math.max(words, 250));
    var d = document.createElement("div"); d.innerHTML = html;
    var paraObjs = Array.prototype.filter.call(d.querySelectorAll("p, li, blockquote"), function (p) { return !p.closest("td,th,figure"); }).map(function (p) { return { text: p.textContent.replace(/ /g, " "), isList: p.nodeName === "LI", caption: p.classList.contains("caption") }; });
    var coh = { findings: [], score: 100 };
    try { coh = CK.coherence({ id: s.id }, paraObjs, C.at, C.nums, C.figCount, C.tables); } catch (e) {}
    var ps = parasOf(html), sugs = [], craftSum = 0;
    ps.forEach(function (p, i) {
      var a = IN.analyse(p, { usedFigs: C.usedFigs, isFirst: i === 0, isLast: i === ps.length - 1, sectionId: s.id });
      var real = a.suggestions.filter(function (x) { return x.kind !== "Looks good"; });
      var lost = 0; real.forEach(function (x) { lost += (x.prio || 5) * 2.4 * k; });
      craftSum += Math.max(0, 100 - lost);
      real.forEach(function (x) { sugs.push(Object.assign({ para: i + 1 }, x)); });
    });
    // very short answers (e.g. “No.” on a form) are judged on language only
    var craft = ps.length ? clamp(craftSum / ps.length) : 100, flow = paraObjs.length > 1 ? clamp(100 - (100 - coh.score) * k) : 100;
    sugs.sort(function (a, b) { return (b.prio || 0) - (a.prio || 0); });
    return { id: s.id, words: words, text: text, score: clamp(lang * 0.35 + flow * 0.35 + craft * 0.30), sub: { Language: lang, Flow: flow, Craft: craft }, grammar: g, coh: coh.findings, sugs: sugs, tags: IN.tagsOf(text), hash: hashOf(text.slice(0, 300)), paras: ps.length };
  }
  window.SecScore = { context: context, analyse: analyse, band: band, bandName: bandName, hashOf: hashOf, parasOf: parasOf };
})();
