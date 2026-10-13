// News discourse analytics: codes each article live in the browser against the study's framework
// (RQ1 wellbeing frames, RQ2 responsibility locus, remedies, stage), scores relevance, tracks screening,
// and exports to Zotero (RIS) and NVivo (classification CSV + REFI-QDA codebook).
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // ---------------------------------------------------------------- coding frame (English + Bahasa Indonesia)
  var FRAMES = [
    ["clinical", "Clinical & crisis", /therap|depress|anxiety|suicid|self-harm|psychosis|delusion|psychiatr|crisis|eating disorder|mental illness|depresi|kecemasan|bunuh diri|gangguan jiwa|kejiwaan|psikiater/i],
    ["lonely", "Loneliness & companionship", /loneli|lonely|companion|friend|relationship|romance|girlfriend|boyfriend|attachment|love|grief|kesepian|teman|pasangan|curhat/i],
    ["youth", "Children, teens & family", /teen|child|kid|parent|famil|school|student|minor|mum|mother|father|anak|remaja|orang tua|keluarga|pelajar|siswa/i],
    ["harm", "Safety, harm & risk", /harm|danger|risk|lawsuit|sued|death|died|unsafe|safety|safeguard|warning|alarm|bahaya|risiko|gugat|keamanan/i],
    ["optim", "Wellness & self-optimisation", /wellness|wellbeing|well-being|self-care|mindful|productiv|coach|happiness|resilien|kesejahteraan|self-healing|produktif/i]
  ];
  var LOCI = [
    ["user", "Individual users", /\b(users?|people|you|yourself|individuals?|consumers?)\b.{0,40}\b(should|must|need|can|turn|rely|choose|learn)|how to (use|have)|tips|pengguna|masyarakat diminta|bijak/i],
    ["family", "Parents & families", /parent|famil|mum|mother|father|household|orang tua|keluarga|ayah|ibu\b/i],
    ["company", "Companies & platforms", /openai|meta\b|character\.ai|replika|google|anthropic|microsoft|company|companies|firm|platform|developer|startup|perusahaan|platform|pengembang/i],
    ["state", "State & regulators", /regulat|law\b|laws\b|legislat|bill\b|ban\b|government|ftc|ofcom|attorney general|senat|congress|court|lawsuit|sued|komdigi|kominfo|kemenkes|pemerintah|regulasi|undang|aturan|dpr\b/i],
    ["prof", "Professionals & clinicians", /psycholog|therapist|clinician|psychiatr|doctor|counsel|apa\b|nhs|expert|psikolog|psikiater|dokter|pakar|ahli/i]
  ];
  var REMEDY = [
    ["reg", "Regulation & law", /regulat|law\b|legislat|bill\b|ban\b|regulasi|aturan|undang/i],
    ["controls", "Parental controls & age checks", /parental control|age verif|age check|teen account|for teens|kontrol orang tua|verifikasi usia/i],
    ["design", "Design safeguards", /safeguard|guardrail|crisis (line|alert)|redirect|update|feature|safety (feature|measure)|fitur keamanan/i],
    ["care", "Professional care", /see a (therapist|professional)|professional help|seek help|psychologist|therapist|konsultasi|tenaga profesional|psikolog/i],
    ["literacy", "Literacy & self-management", /literacy|limit (use|screen)|healthy (habits|relationship)|how to|tips|bijak|literasi|batasi/i]
  ];
  var CHATBOT = /chatbot|chat ?gpt|openai|character\.ai|replika|ai (companion|friend|therap|chatbot)|claude|gemini|woebot|wysa|kecerdasan buatan|akal imitasi|\bAI\b/i;
  var WELL = /wellbeing|well-being|mental health|loneli|therap|psycholog|suicid|emotional|companion|kesehatan mental|curhat|psikolog|kesepian/i;
  function stageOf(d) { return d < "2024-01-01" ? "Emergence" : d < "2025-07-01" ? "Normalisation" : "Containment"; }
  var GROUP = { guardian: "The Guardian", wsj: "WSJ", indonesia: "Indonesia", global: "Global" };

  function code(x) {
    var t = x.title + " " + (x.summary || ""), L = x.llm || null;
    var frames = L && L.frames ? L.frames : FRAMES.filter(function (f) { return f[2].test(t); }).map(function (f) { return f[0]; });
    var loci = L && L.loci ? L.loci : LOCI.filter(function (f) { return f[2].test(t); }).map(function (f) { return f[0]; });
    var rem = L && L.remedies ? L.remedies : REMEDY.filter(function (f) { return f[2].test(t); }).map(function (f) { return f[0]; });
    var rel = L && L.relevance != null ? L.relevance : Math.min(100, (CHATBOT.test(t) ? 40 : 0) + (WELL.test(t) ? 30 : 0) + Math.min(20, loci.length * 10) + (x.group !== "global" ? 10 : 0));
    return { frames: frames, loci: loci, rem: rem, rel: rel, stage: stageOf(x.date), by: L ? "claude" : "keywords" };
  }

  // ---------------------------------------------------------------- state
  var DATA = { items: [] }, ITEMS = [], SCREEN = get("wr-news-screen", {}), F = get("wr-news-filter", { group: "all", locus: "all", q: "", dec: "all", min: 40 });
  function nameOf(arr, k) { var f = arr.find(function (x) { return x[0] === k; }); return f ? f[1] : k; }

  // ---------------------------------------------------------------- scores (live)
  function scores() {
    var pool = ITEMS.filter(function (x) { return x.c.rel >= 60; });
    var screened = pool.filter(function (x) { return SCREEN[x.id] && SCREEN[x.id].dec; }).length;
    var incl = pool.filter(function (x) { return SCREEN[x.id] && SCREEN[x.id].dec === "in"; });
    var coded = incl.filter(function (x) { return SCREEN[x.id].loci && SCREEN[x.id].loci.length; }).length;
    // balance across responsibility loci among included (or all relevant) items: normalised entropy
    var base = incl.length ? incl : pool, cnt = {}, tot = 0;
    base.forEach(function (x) { var ls = (SCREEN[x.id] && SCREEN[x.id].loci) || x.c.loci; ls.forEach(function (l) { cnt[l] = (cnt[l] || 0) + 1; tot++; }); });
    var H = 0; Object.keys(cnt).forEach(function (k) { var p = cnt[k] / tot; H -= p * Math.log(p); });
    var balance = tot ? H / Math.log(LOCI.length) : 0;
    var groups = ["guardian", "wsj", "indonesia"].filter(function (g) { return base.some(function (x) { return x.group === g; }); }).length / 3;
    var s = {
      screening: pool.length ? screened / pool.length : 0,
      coding: incl.length ? coded / incl.length : 0,
      balance: balance, spread: groups
    };
    s.overall = Math.round(100 * (s.screening * 0.35 + s.coding * 0.25 + s.balance * 0.2 + s.spread * 0.2));
    s.pool = pool.length; s.screened = screened; s.incl = incl.length; s.coded = coded;
    return s;
  }
  function renderScores() {
    var s = scores(), circ = 2 * Math.PI * 52;
    $("#nsRing").setAttribute("stroke-dashoffset", String(circ * (1 - s.overall / 100)));
    $("#nsNum").textContent = s.overall;
    var rows = [["Screened", s.screening, s.screened + " of " + s.pool + " relevant articles have an include/exclude decision"],
      ["Coded", s.coding, s.coded + " of " + s.incl + " included articles have your responsibility codes"],
      ["Balance", s.balance, "How evenly responsibility is spread across the five loci in your set"],
      ["Spread", s.spread, "Guardian, WSJ and Indonesian sources all represented"]];
    $("#nsRows").innerHTML = rows.map(function (r) { var p = Math.round(r[1] * 100); return '<div class="ns-row" title="' + esc(r[2]) + '"><span>' + r[0] + '</span><span class="ns-bar"><i style="width:' + p + '%"></i></span><b>' + p + "</b></div>"; }).join("");
    $("#nsHint").textContent = s.pool ? (s.screening < 0.5 ? "Next: screen the relevant articles below (Include / Exclude)." : s.coding < 0.6 ? "Next: confirm the responsibility codes on included articles." : "Good shape. Export to NVivo and Zotero when you’re ready.") : "No relevant articles yet.";
    try { set("wr-news-score", { score: s.overall, t: Date.now() }); } catch (e) {}
  }

  // ---------------------------------------------------------------- charts (plain SVG/CSS, drawn to scale)
  function bars(el, rows, max) {
    max = max || Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
    el.innerHTML = rows.map(function (r) { return '<div class="hb"><span class="hb-l">' + esc(r[0]) + '</span><span class="hb-t"><i style="width:' + (100 * r[1] / max) + '%;' + (r[2] ? "background:" + r[2] : "") + '"></i></span><b>' + r[1] + "</b></div>"; }).join("");
  }
  function renderCharts(list) {
    // weekly volume, last 26 weeks, stacked by group
    var weeks = [], now = new Date(); var start = new Date(now.getTime() - 25 * 7 * 864e5);
    for (var i = 0; i < 26; i++) weeks.push({ t: new Date(start.getTime() + i * 7 * 864e5), g: {} });
    list.forEach(function (x) { var d = new Date(x.date); var k = Math.floor((d - start) / (7 * 864e5)); if (k >= 0 && k < 26) weeks[k].g[x.group] = (weeks[k].g[x.group] || 0) + 1; });
    var mx = Math.max.apply(null, weeks.map(function (w) { return Object.values(w.g).reduce(function (a, b) { return a + b; }, 0); }).concat([1]));
    var W = 520, Hh = 150, bw = W / 26, order = ["guardian", "wsj", "indonesia", "global"], col = { guardian: "var(--accent)", wsj: "var(--gold)", indonesia: "var(--teal)", global: "var(--line)" };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + (Hh + 22) + '" role="img" aria-label="Articles per week, last 26 weeks"><line x1="0" y1="' + Hh + '" x2="' + W + '" y2="' + Hh + '" class="s-line"/>';
    weeks.forEach(function (w, i) { var y = Hh; order.forEach(function (g) { var n = w.g[g] || 0; if (!n) return; var h = Hh * n / mx; y -= h; svg += '<rect x="' + (i * bw + 2) + '" y="' + y + '" width="' + (bw - 4) + '" height="' + h + '" fill="' + col[g] + '"><title>' + w.t.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " · " + GROUP[g] + ": " + n + "</title></rect>"; }); if (i % 4 === 0) svg += '<text x="' + (i * bw + 2) + '" y="' + (Hh + 16) + '" font-size="10" class="t-muted">' + w.t.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + "</text>"; });
    svg += '<text x="' + W + '" y="10" font-size="10" text-anchor="end" class="t-muted">max ' + mx + "/week</text></svg>";
    $("#chVol").innerHTML = svg + '<div class="legend">' + order.map(function (g) { return '<span><i style="background:' + col[g] + '"></i>' + GROUP[g] + "</span>"; }).join("") + "</div>";
    // responsibility: global vs Indonesia (shares, to compare framing)
    function shares(xs) { var c = {}; xs.forEach(function (x) { x.c.loci.forEach(function (l) { c[l] = (c[l] || 0) + 1; }); }); return c; }
    var gl = list.filter(function (x) { return x.group !== "indonesia"; }), id = list.filter(function (x) { return x.group === "indonesia"; });
    var a = shares(gl), b = shares(id);
    $("#chLoci").innerHTML = '<div class="cmp-head"><span></span><span>UK/US/global (n=' + gl.length + ')</span><span>Indonesia (n=' + id.length + ")</span></div>" + LOCI.map(function (l) {
      var pa = gl.length ? Math.round(100 * (a[l[0]] || 0) / gl.length) : 0, pb = id.length ? Math.round(100 * (b[l[0]] || 0) / id.length) : 0;
      return '<div class="cmp"><span class="hb-l">' + l[1] + '</span><span class="hb-t"><i style="width:' + pa + '%"></i><b>' + pa + '%</b></span><span class="hb-t id"><i style="width:' + pb + '%"></i><b>' + pb + "%</b></span></div>";
    }).join("") + '<p class="small muted" style="margin:8px 0 0">Share of articles that mention each actor. A first look at RQ2: who is made responsible, and does it differ in Indonesia?</p>';
    function count(arr, key) { return arr.map(function (f) { return [f[1], list.filter(function (x) { return x.c[key].indexOf(f[0]) >= 0; }).length]; }); }
    bars($("#chFrames"), count(FRAMES, "frames"));
    bars($("#chRem"), count(REMEDY, "rem"));
    var srcs = {}; list.forEach(function (x) { srcs[x.source] = (srcs[x.source] || 0) + 1; });
    bars($("#chSrc"), Object.keys(srcs).sort(function (p, q) { return srcs[q] - srcs[p]; }).slice(0, 8).map(function (k) { return [k, srcs[k]]; }));
  }

  // ---------------------------------------------------------------- list
  function filtered() {
    var q = (F.q || "").toLowerCase();
    return ITEMS.filter(function (x) {
      if (F.group !== "all" && x.group !== F.group) return false;
      if (F.locus !== "all" && x.c.loci.indexOf(F.locus) < 0) return false;
      if (x.c.rel < (F.min || 0)) return false;
      var d = SCREEN[x.id] && SCREEN[x.id].dec;
      if (F.dec === "todo" && d) return false; if (F.dec === "in" && d !== "in") return false; if (F.dec === "out" && d !== "out") return false;
      if (q && (x.title + " " + x.source + " " + (x.summary || "")).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  var shown = 40;
  function renderList() {
    var list = filtered();
    $("#nCount").textContent = list.length + " articles";
    $("#nList").innerHTML = list.slice(0, shown).map(function (x) {
      var S = SCREEN[x.id] || {}, myLoci = S.loci || x.c.loci;
      return '<article class="na' + (S.dec ? " dec-" + S.dec : "") + '" data-id="' + x.id + '">' +
        '<div class="na-top"><span class="na-src g-' + x.group + '">' + esc(GROUP[x.group]) + " · " + esc(x.source) + '</span><time>' + new Date(x.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + '</time><span class="na-rel" title="Relevance to the study (' + (x.c.by === "claude" ? "reviewed by Claude" : "keyword estimate") + ')">' + x.c.rel + (x.c.by === "claude" ? " ✦" : "") + "</span></div>" +
        '<h4><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.title) + "</a></h4>" +
        (x.llm && x.llm.summary ? '<p class="na-sum">' + esc(x.llm.summary) + "</p>" : x.summary ? '<p class="na-sum">' + esc(x.summary) + "</p>" : "") +
        '<div class="na-codes"><span class="na-k">Stage</span><span class="chipx">' + x.c.stage + '</span><span class="na-k">Wellbeing as</span>' + (x.c.frames.map(function (f) { return '<span class="chipx">' + esc(nameOf(FRAMES, f)) + "</span>"; }).join("") || '<span class="muted small">–</span>') + "</div>" +
        '<div class="na-codes"><span class="na-k">Responsible</span>' + LOCI.map(function (l) { return '<button type="button" class="lc' + (myLoci.indexOf(l[0]) >= 0 ? " on" : "") + '" data-locus="' + l[0] + '" aria-pressed="' + (myLoci.indexOf(l[0]) >= 0) + '">' + l[1] + "</button>"; }).join("") + "</div>" +
        '<div class="na-act"><button type="button" class="dec' + (S.dec === "in" ? " on" : "") + '" data-dec="in">Include</button><button type="button" class="dec' + (S.dec === "out" ? " on" : "") + '" data-dec="out">Exclude</button>' +
        '<input type="text" class="na-note" placeholder="Memo (saved in this browser)" value="' + esc(S.note || "") + '" aria-label="Memo for this article"></div></article>';
    }).join("") + (list.length > shown ? '<button type="button" class="btn ghost" id="nMore">Show more (' + (list.length - shown) + ")</button>" : "");
    var more = $("#nMore"); if (more) more.addEventListener("click", function () { shown += 40; renderList(); });
  }
  function save() { set("wr-news-screen", SCREEN); renderScores(); }
  $("#nList").addEventListener("click", function (e) {
    var art = e.target.closest(".na"); if (!art) return;
    var id = art.dataset.id, x = ITEMS.find(function (i) { return i.id === id; }), S = SCREEN[id] = SCREEN[id] || {};
    var d = e.target.closest("[data-dec]"); if (d) { S.dec = S.dec === d.dataset.dec ? null : d.dataset.dec; if (S.dec === "in" && !S.loci) S.loci = x.c.loci.slice(); save(); renderList(); return; }
    var l = e.target.closest("[data-locus]"); if (l) { S.loci = (S.loci || x.c.loci.slice()); var k = l.dataset.locus, i = S.loci.indexOf(k); if (i >= 0) S.loci.splice(i, 1); else S.loci.push(k); save(); renderList(); }
  });
  $("#nList").addEventListener("input", function (e) { if (!e.target.classList.contains("na-note")) return; var id = e.target.closest(".na").dataset.id; SCREEN[id] = SCREEN[id] || {}; SCREEN[id].note = e.target.value; set("wr-news-screen", SCREEN); });

  function wireFilters() {
    $("#fGroup").value = F.group; $("#fLocus").innerHTML = '<option value="all">Any actor</option>' + LOCI.map(function (l) { return '<option value="' + l[0] + '">' + l[1] + "</option>"; }).join(""); $("#fLocus").value = F.locus;
    $("#fDec").value = F.dec; $("#fQ").value = F.q || ""; $("#fMin").value = F.min;
    [["#fGroup", "group"], ["#fLocus", "locus"], ["#fDec", "dec"], ["#fMin", "min"]].forEach(function (p) { $(p[0]).addEventListener("change", function () { F[p[1]] = p[1] === "min" ? +$(p[0]).value : $(p[0]).value; set("wr-news-filter", F); shown = 40; renderList(); }); });
    $("#fQ").addEventListener("input", function () { F.q = $("#fQ").value; set("wr-news-filter", F); shown = 40; renderList(); });
  }

  // ---------------------------------------------------------------- exports (Zotero, NVivo)
  function download(name, text, type) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function exportSet() { var inc = ITEMS.filter(function (x) { return SCREEN[x.id] && SCREEN[x.id].dec === "in"; }); return inc.length ? inc : filtered(); }
  function day() { return new Date().toISOString().slice(0, 10); }
  $("#xRis").addEventListener("click", function () {
    var lines = exportSet().map(function (x) {
      var S = SCREEN[x.id] || {}, d = x.date.slice(0, 10).split("-");
      return ["TY  - NEWS", "TI  - " + x.title, "T2  - " + x.source, "PY  - " + d[0], "DA  - " + d.join("/"), "UR  - " + x.url, x.summary ? "AB  - " + x.summary : null, "LA  - " + (x.lang === "id" ? "Indonesian" : "English"),
        "KW  - stage: " + x.c.stage].concat(((S.loci || x.c.loci)).map(function (l) { return "KW  - responsibility: " + nameOf(LOCI, l); }), x.c.frames.map(function (f) { return "KW  - wellbeing: " + nameOf(FRAMES, f); }), S.note ? ["N1  - " + S.note] : [], ["ER  - "]).filter(Boolean).join("\r\n");
    });
    download("news-for-zotero_" + day() + ".ris", lines.join("\r\n\r\n") + "\r\n", "application/x-research-info-systems");
  });
  function csvCell(v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  $("#xCsv").addEventListener("click", function () {
    var head = ["Name", "Headline", "Source", "Group", "Date", "Stage", "Wellbeing frames", "Responsibility", "Remedies", "Relevance", "Decision", "Memo", "URL"];
    var rows = exportSet().map(function (x, i) { var S = SCREEN[x.id] || {}; return ["News " + String(i + 1).padStart(3, "0"), x.title, x.source, GROUP[x.group], x.date.slice(0, 10), x.c.stage, x.c.frames.map(function (f) { return nameOf(FRAMES, f); }).join("; "), (S.loci || x.c.loci).map(function (l) { return nameOf(LOCI, l); }).join("; "), x.c.rem.map(function (r) { return nameOf(REMEDY, r); }).join("; "), x.c.rel, S.dec || "", S.note || "", x.url]; });
    download("nvivo-classification_" + day() + ".csv", "﻿" + [head].concat(rows).map(function (r) { return r.map(csvCell).join(","); }).join("\r\n"), "text/csv");
  });
  function guid(s) { var h = 0, out = ""; for (var k = 0; k < 4; k++) { for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i) + k) | 0; out += ("00000000" + (h >>> 0).toString(16)).slice(-8); } return out.slice(0, 8) + "-" + out.slice(8, 12) + "-4" + out.slice(13, 16) + "-a" + out.slice(17, 20) + "-" + out.slice(20, 32); }
  $("#xQdc").addEventListener("click", function () {
    function node(name, desc, kids, color) { return '<Code guid="' + guid(name) + '" name="' + esc(name) + '" isCodable="' + (kids ? "false" : "true") + '"' + (color ? ' color="' + color + '"' : "") + "><Description>" + esc(desc) + "</Description>" + (kids || "") + "</Code>"; }
    var xml = '<?xml version="1.0" encoding="utf-8"?>\n<CodeBook xmlns="urn:QDA-XML:codebook:1.0" origin="Wellbeing &amp; Responsibility research site"><Codes>' +
      node("RQ1 Wellbeing as", "What counts as wellbeing in the article", FRAMES.map(function (f) { return node(f[1], "Wellbeing framed as " + f[1].toLowerCase()); }).join(""), "#1E6B66") +
      node("RQ2 Responsibility placed on", "Who the article makes responsible for users’ wellbeing", LOCI.map(function (l) { return node(l[1], "Responsibility placed on " + l[1].toLowerCase()); }).join(""), "#B14D26") +
      node("Remedy offered", "What is offered as the remedy", REMEDY.map(function (r) { return node(r[1], "Remedy: " + r[1].toLowerCase()); }).join(""), "#A57A1F") +
      node("Stage", "Emergence (to 2023), normalisation (2024 to mid-2025), containment (from mid-2025)", ["Emergence", "Normalisation", "Containment"].map(function (s) { return node(s, s + " stage"); }).join(""), "#6A3D73") +
      node("van Dijk levels", "News discourse analysis (van Dijk 1983; 1988)", ["Headline & lead (macrostructure)", "Thematic structure", "Local semantics", "Quotation & sources", "Lexical style"].map(function (s) { return node(s, s); }).join(""), "#4A443B") +
      "</Codes></CodeBook>\n";
    download("nvivo-codebook_" + day() + ".qdc", xml, "application/xml");
  });

  // ---------------------------------------------------------------- boot
  function boot(d) {
    DATA = d || { items: [] };
    ITEMS = (DATA.items || []).map(function (x) { return Object.assign({}, x, { c: code(x) }); });
    var upd = DATA.updated ? new Date(DATA.updated) : null;
    $("#nUpdated").textContent = upd ? "Updated " + upd.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " · " + ITEMS.length + " articles · checked every 4 hours" : "";
    var wk = ITEMS.filter(function (x) { return Date.now() - new Date(x.added || x.date) < 7 * 864e5; }).length;
    $("#nNew").textContent = wk;
    renderScores(); renderCharts(ITEMS.filter(function (x) { return x.c.rel >= 60; })); wireFilters(); renderList();
  }
  var bust = Math.floor(Date.now() / 6e5);
  Promise.all([
    fetch("data/news.json?t=" + bust).then(function (r) { return r.json(); }),
    fetch("data/news-llm.json?t=" + bust).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (res) {
    var d = res[0], L = (res[1] && res[1].items) || {};
    (d.items || []).forEach(function (x) { if (L[x.id]) x.llm = L[x.id]; });
    if (res[1] && res[1].updated) d.llmUpdated = res[1].updated;
    boot(d);
  }).catch(function () { $("#nList").innerHTML = '<p class="muted">The news file could not be loaded. Try again later.</p>'; boot(null); });
})();
