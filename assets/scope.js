// Scope guard: compares the current draft with the agreed scope and says, in plain words, how much a
// change really changes the project, what it sets off (ethics, methods, timeline) and roughly how long it adds.
(function () {
  var SOURCES = [
    ["The Guardian", /\bGuardian\b/i], ["Nexis", /\bNexis\b/i], ["Wall Street Journal / Family & Tech", /Wall Street Journal|\bWSJ\b|Family & Tech|Jargon/i],
    ["New York Times", /New York Times|\bNYT\b/i], ["BBC", /\bBBC\b/], ["Indonesian newspapers (Kompas, Tempo, Detik…)", /Kompas|Tempo\b|Detik|Jakarta Post|CNN Indonesia/i],
    ["TikTok", /TikTok/i], ["Reddit", /Reddit/i], ["X / Twitter", /Twitter|\bX \(formerly/i], ["YouTube", /YouTube/i], ["Instagram", /Instagram/i],
    ["App-store reviews", /app[- ]store reviews|user reviews/i], ["Policy documents", /policy documents|white paper corpus|parliamentary (debates|records)/i], ["Survey", /\bsurvey\b/i]
  ];
  var METHODS = [
    ["News discourse analysis (van Dijk)", /van Dijk|news discourse analysis/i], ["Reflexive thematic analysis", /thematic analysis/i], ["Focus group", /focus group/i], ["In-depth interviews", /interview/i],
    ["Critical discourse analysis (Fairclough)", /Fairclough|critical discourse analysis/i], ["Framing analysis", /framing analysis/i], ["Content analysis (quantitative)", /content analysis/i],
    ["Corpus linguistics", /corpus linguistic|concordanc|collocat/i], ["Computational / topic modelling", /topic model|computational|machine learning|sentiment analysis/i],
    ["Ethnography / participant observation", /ethnograph|participant observation/i], ["Walkthrough / app analysis", /walkthrough method|app analysis/i], ["Experiment", /\bexperiment(al)?\b/i], ["Questionnaire survey", /questionnaire/i]
  ];
  var CONCEPTS = [
    ["Neuroliberalism", /neuroliberal/i], ["Reflexive self (Giddens)", /reflexive (project of the )?self|Giddens/i], ["Relational wellbeing", /relational wellbeing|relational well-being/i],
    ["Javanese relational norms", /kekeluargaan|rukun|hormat|sungkan/i], ["Governmentality (Foucault)", /governmentality|Foucault/i], ["Biopolitics", /biopolitic/i],
    ["Platform capitalism", /platform capitalism|Srnicek/i], ["Surveillance capitalism", /surveillance capitalism|Zuboff/i], ["Affect theory", /affect theory|affective turn/i],
    ["Ethics of care", /ethics of care|care ethics|Tronto/i], ["Actor-network theory", /actor-network|\bANT\b|Latour/i], ["Postcolonial / decolonial", /postcolonial|decolonial/i],
    ["Medicalisation", /medicali[sz]ation/i], ["Techno-solutionism", /solutionism/i], ["Moral panic", /moral panic/i], ["Datafication", /datafication/i]
  ];
  var COUNTRIES = ["Indonesia", "United Kingdom", "UK", "United States", "US", "Malaysia", "Singapore", "Philippines", "Thailand", "Vietnam", "India", "China", "Japan", "Korea", "Australia", "Germany", "France", "Netherlands", "Canada", "Brazil", "Nigeria", "Kenya", "South Africa"];
  var GROUPS = [
    ["co-founders", /co-?founders?/i], ["psychologists", /psychologists?/i], ["HIMPSI representative", /HIMPSI/i],
    ["chatbot users", /\b(chatbot|app) users\b.{0,60}(interview|recruit|participant|survey)|(interview|recruit|survey).{0,60}\b(chatbot|app) users\b/i],
    ["young people / minors", /(interview|recruit|participants?).{0,60}(teenagers|adolescents|minors|children|students)|(teenagers|adolescents|minors|children) (will|would) (take part|be interviewed)/i],
    ["patients / clients", /(interview|recruit).{0,40}(patients|clients)/i], ["journalists", /(interview|recruit).{0,40}journalists|journalists (will|would) (take part|be interviewed)/i],
    ["policymakers / regulators", /(interview|recruit).{0,50}(policymakers|regulators|officials|Komdigi|ministry)/i]
  ];
  function words(s) { return (String(s).toLowerCase().match(/[a-z’']+/g) || []); }
  function sim(a, b) { var A = new Set(words(a).filter(function (w) { return w.length > 3; })), B = new Set(words(b).filter(function (w) { return w.length > 3; })); if (!A.size && !B.size) return 1; var n = 0; A.forEach(function (w) { if (B.has(w)) n++; }); return 2 * n / (A.size + B.size); }
  function rqs(t) { var o = {}; ["1", "2", "3", "4", "5"].forEach(function (n) { var m = t.match(new RegExp("RQ" + n + "\\.?\\s+([^\\n]{20,})")); if (m) o["RQ" + n] = m[1].trim(); }); return o; }
  function cites(t) { var s = new Set(), re = /\(([^()]{0,160}?\d{4}[a-z]?[^()]{0,80})\)/g, m; while ((m = re.exec(t))) m[1].split(";").forEach(function (c) { var a = c.match(/([A-Z][A-Za-zÀ-ÿ’'\-]+)(?: et al\.?| and [A-Z][a-z]+)?,? (\d{4})/); if (a) s.add(a[1] + " " + a[2]); }); return s; }
  function nums(t) { var o = {}; [["psychologists", /(minimum (?:of )?|at least |up to |)(\d+|five|six|eight|ten)\s+(?:Riliv )?psychologists/i], ["interviews", /(\d+|ten|twelve|fifteen|twenty)\s+(?:in-depth )?interviews/i], ["focus groups", /(one|two|three|\d+)\s+(?:online )?focus group/i]].forEach(function (p) { var m = t.match(p[1]); if (m) o[p[0]] = (m[1] || "") + (m[2] || m[1]); }); return o; }
  function years(t) { var ys = (t.match(/\b(19[5-9]\d|20[0-4]\d)\b/g) || []).map(Number).filter(function (y) { return y >= 2015 && y <= 2030; }); return ys.length ? [Math.min.apply(null, ys), Math.max.apply(null, ys)] : null; }
  function has(list, t) { return list.filter(function (x) { return x[1].test(t); }).map(function (x) { return x[0]; }); }
  function countries(t) { return COUNTRIES.filter(function (c) { return new RegExp("\\b" + c + "\\b").test(t); }).map(function (c) { return c === "UK" ? "United Kingdom" : c === "US" ? "United States" : c; }).filter(function (c, i, a) { return a.indexOf(c) === i; }); }

  function analyse(base, cur, opts) {
    opts = opts || {};
    var ch = [];
    function add(cat, what, weight, months, then, kind) { ch.push({ cat: cat, what: what, weight: weight, months: months, then: then, kind: kind || "add" }); }
    // research questions
    var RB = rqs(base), RC = rqs(cur);
    Object.keys(RB).forEach(function (k) {
      if (!RC[k]) { add("Research questions", k + " has been removed or renumbered", 30, 1.5, "Every chapter, dataset and the ethics form is built around your questions. Agree this with Aleena and Jason first.", "remove"); return; }
      var s = sim(RB[k], RC[k]); if (s < 0.9) add("Research questions", k + " reworded (" + Math.round((1 - s) * 100) + "% different)", s < 0.6 ? 25 : s < 0.8 ? 12 : 4, s < 0.6 ? 1.5 : s < 0.8 ? 0.5 : 0, s < 0.6 ? "This is a different question now. Check that the dataset and method still answer it, and update the abstract, §1.7 and the ethics form." : s < 0.8 ? "A real shift in emphasis. Make sure the matching dataset section and the abstract say the same thing." : "Wording polish only. Keep the ethics form and abstract in step.", "edit");
    });
    Object.keys(RC).forEach(function (k) { if (!RB[k]) add("Research questions", "New question " + k + ": " + RC[k].slice(0, 90) + (RC[k].length > 90 ? "…" : ""), 35, 3, "A new question needs its own data, analysis chapter and probably an ethics amendment. That is months, not days."); });
    // data sources
    var SB = has(SOURCES, base), SC = has(SOURCES, cur);
    SC.filter(function (x) { return SB.indexOf(x) < 0; }).forEach(function (x) { add("Data", "New data source: " + x, 20, 2.5, "A new dataset needs a sampling plan, a methods subsection and coding time. Social-media data may also need an ethics amendment (REISC)."); });
    SB.filter(function (x) { return SC.indexOf(x) < 0; }).forEach(function (x) { add("Data", "Data source no longer mentioned: " + x, 15, 1, "If this dataset is dropped, the matching research question loses its evidence. Say what replaces it.", "remove"); });
    // methods
    var MB = has(METHODS, base), MC = has(METHODS, cur);
    MC.filter(function (x) { return MB.indexOf(x) < 0; }).forEach(function (x) { add("Method", "New method: " + x, 12, 1.5, "New methods take time to learn and must be justified in Chapter 4, with their own worked example."); });
    MB.filter(function (x) { return MC.indexOf(x) < 0; }).forEach(function (x) { add("Method", "Method no longer mentioned: " + x, 10, 0.5, "If you dropped it on purpose, explain why in the methodology; if not, restore it.", "remove"); });
    // participants
    var GB = has(GROUPS, base), GC = has(GROUPS, cur);
    GC.filter(function (x) { return GB.indexOf(x) < 0; }).forEach(function (x) { var vul = /minors|patients|users/.test(x); add("Participants", "New participant group: " + x, vul ? 35 : 18, vul ? 3 : 1.5, vul ? "This brings in vulnerable or lay participants: a full ethics resubmission, new safeguarding and consent procedures, possibly DBS clearance." : "A new group means new recruitment, an updated information sheet and consent form, and an ethics amendment."); });
    var NB = nums(base), NC = nums(cur);
    Object.keys(NC).forEach(function (k) { if (NB[k] && NB[k] !== NC[k]) add("Participants", "Number of " + k + " changed: “" + NB[k] + "” → “" + NC[k] + "”", 8, 0.5, "More sessions mean more transcription and translation. Keep the ethics form and the upgrade using the same number."); });
    // countries
    var CB = countries(base), CC = countries(cur);
    CC.filter(function (x) { return CB.indexOf(x) < 0; }).forEach(function (x) { add("Setting", "New country or setting: " + x, 15, 2, "A new setting needs context in Chapter 2, its own literature and possibly new access and ethics arrangements."); });
    // theory
    var KB = has(CONCEPTS, base), KC = has(CONCEPTS, cur);
    KC.filter(function (x) { return KB.indexOf(x) < 0; }).forEach(function (x) { add("Theory", "New concept: " + x, 6, 0.5, "Fine if it replaces or sharpens something. If it adds a layer, ask what it explains that neuroliberalism and relational wellbeing can’t."); });
    // literature
    var LB = cites(base), LC = cites(cur), newL = []; LC.forEach(function (c) { if (!LB.has(c)) newL.push(c); });
    if (newL.length) add("Literature", newL.length + " new citation" + (newL.length > 1 ? "s" : "") + ": " + newL.slice(0, 6).join(", ") + (newL.length > 6 ? "…" : ""), Math.min(15, newL.length), newL.length > 10 ? 0.5 : 0, newL.length > 10 ? "That many new sources at once often means a new framing. Check they still serve the same questions, and add them to Zotero." : "Normal growth. Add them to Zotero so the reference list stays complete.");
    // period
    var YB = years(base), YC = years(cur);
    if (YB && YC && (YC[0] < YB[0] - 1 || YC[1] > YB[1] + 1)) add("Period", "Time span now " + YC[0] + "–" + YC[1] + " (was " + YB[0] + "–" + YB[1] + ")", 8, 1, "A longer period means more articles to retrieve and code. Update the Nexis search and Dataset 1 description.");
    // size
    var wb = words(base).length, wc = words(cur).length;
    if (wb && Math.abs(wc - wb) / wb > 0.2) add("Length", "Length changed by " + Math.round(100 * (wc - wb) / wb) + "% (" + wb.toLocaleString() + " → " + wc.toLocaleString() + " words)", 5, 0, "Check the word limit and that new material earns its place.", "edit");
    var shift = Math.min(100, ch.reduce(function (a, x) { return a + x.weight; }, 0));
    var months = Math.round(ch.reduce(function (a, x) { return a + x.months; }, 0) * 2) / 2;
    var label = shift < 15 ? "Small adjustment" : shift < 35 ? "Noticeable change" : shift < 60 ? "Big change" : "A different project";
    var advice = shift < 15 ? "This stays within your agreed scope. Carry on." : shift < 35 ? "Within reach, but it touches other parts of the project. Note it in your next supervision." : shift < 60 ? "This changes the project. Talk to Aleena and Jason before you go further, and check the ethics form." : "This is a new project in places. Pause, list what you would drop to make room, and agree it in supervision.";
    return { changes: ch.sort(function (a, b) { return b.weight - a.weight; }), shift: shift, months: months, label: label, advice: advice };
  }
  function color(shift) { return shift < 15 ? "var(--ok)" : shift < 35 ? "var(--gold)" : "var(--bad)"; }
  function html(r, opts) {
    opts = opts || {};
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var cats = {}; r.changes.forEach(function (c) { (cats[c.cat] = cats[c.cat] || []).push(c); });
    return '<div class="scope-head" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
      '<div style="font-family:var(--serif);font-size:2.4rem;line-height:1;color:' + color(r.shift) + '">' + r.shift + '<small style="font-size:.9rem;color:var(--muted)">/100</small></div>' +
      '<div style="min-width:0;flex:1"><div style="font-weight:600">' + esc(r.label) + (r.months ? ' · about +' + r.months + ' month' + (r.months === 1 ? "" : "s") + " of work" : "") + '</div><div class="small muted">' + esc(r.advice) + "</div></div></div>" +
      '<div style="height:8px;border-radius:999px;background:var(--surface-2);position:relative;margin-bottom:14px"><i style="position:absolute;left:0;top:0;bottom:0;width:' + r.shift + '%;border-radius:999px;background:' + color(r.shift) + '"></i>' +
      '<b style="position:absolute;left:15%;top:-3px;width:1px;height:14px;background:var(--line)"></b><b style="position:absolute;left:35%;top:-3px;width:1px;height:14px;background:var(--line)"></b><b style="position:absolute;left:60%;top:-3px;width:1px;height:14px;background:var(--line)"></b></div>' +
      (r.changes.length ? Object.keys(cats).map(function (k) { return '<h4 style="margin:12px 0 6px;font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">' + esc(k) + "</h4>" + cats[k].map(function (c) { return '<div style="border-left:3px solid ' + color(c.weight * 2) + ';background:var(--surface-2);border-radius:0 8px 8px 0;padding:8px 10px;margin-bottom:6px"><div style="font-weight:500">' + esc(c.what) + (c.months ? ' <span class="small muted">· +' + c.months + " mo</span>" : "") + '</div><div class="small muted">' + esc(c.then) + "</div></div>"; }).join(""); }).join("") : '<p class="small muted">No changes to questions, data, methods, participants, setting or theory. You are working inside your agreed scope. ✓</p>') +
      (opts.footer || "");
  }
  window.ScopeGuard = { analyse: analyse, html: html, color: color };
})();
