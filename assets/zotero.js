// Zotero bridge: reads a Zotero export (BibTeX / Better BibTeX, CSL JSON or RIS), checks in-text
// citations against it and formats a reference list in Cite Them Right Harvard (used at Goldsmiths).
// The library is kept in this browser only (localStorage "wr-zotero"), shared by all three studios.
(function () {
  var KEY = "wr-zotero";
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function save(lib) { try { localStorage.setItem(KEY, JSON.stringify(lib)); return true; } catch (e) { return false; } }

  function stripTex(s) { return String(s || "").replace(/[{}]/g, "").replace(/\\&/g, "&").replace(/\\(textit|emph|textbf)\s*/g, "").replace(/~/g, " ").replace(/\s+/g, " ").trim(); }
  function names(list) { return list.filter(Boolean).map(function (n) { n = n.trim(); if (/,/.test(n)) { var p = n.split(","); return { family: p[0].trim(), given: (p[1] || "").trim() }; } var w = n.split(/\s+/); return w.length === 1 ? { family: w[0], given: "" } : { family: w.pop(), given: w.join(" ") }; }); }

  function parseBib(t) {
    var out = [], re = /@(\w+)\s*\{\s*([^,]+),([\s\S]*?)\n\}/g, m;
    while ((m = re.exec(t + "\n"))) {
      var type = m[1].toLowerCase(); if (type === "comment" || type === "string" || type === "preamble") continue;
      var f = {}, fr = /(\w+)\s*=\s*(\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}|"([^"]*)"|(\d+))/g, x;
      while ((x = fr.exec(m[3]))) f[x[1].toLowerCase()] = stripTex(x[3] != null ? x[3] : x[4] != null ? x[4] : x[5]);
      var year = (f.year || f.date || "").match(/\d{4}/);
      out.push({ key: m[2].trim(), type: type, authors: names(String(f.author || f.editor || "").split(/\s+and\s+/i)), year: year ? year[0] : "n.d.", title: f.title || "", container: f.journal || f.journaltitle || f.booktitle || "", volume: f.volume || "", issue: f.number || f.issue || "", pages: (f.pages || "").replace(/--/g, "–"), publisher: f.publisher || f.institution || "", place: f.address || f.location || "", doi: f.doi || "", url: f.url || "", accessed: f.urldate || "", edition: f.edition || "" });
    }
    return out;
  }
  function parseCsl(t) {
    var arr = JSON.parse(t); if (!Array.isArray(arr)) arr = arr.items || [];
    return arr.map(function (i) {
      var dp = i.issued && i.issued["date-parts"] && i.issued["date-parts"][0];
      return { key: i.id || i["citation-key"] || "", type: i.type || "", authors: (i.author || i.editor || []).map(function (a) { return { family: a.family || a.literal || "", given: a.given || "" }; }), year: dp && dp[0] ? String(dp[0]) : "n.d.", title: i.title || "", container: i["container-title"] || "", volume: i.volume || "", issue: i.issue || "", pages: (i.page || "").replace(/-/g, "–"), publisher: i.publisher || "", place: i["publisher-place"] || "", doi: i.DOI || "", url: i.URL || "", accessed: "", edition: i.edition || "" };
    });
  }
  function parseRis(t) {
    var out = [], cur = null;
    t.split(/\r?\n/).forEach(function (line) {
      var m = line.match(/^([A-Z][A-Z0-9])  - ?(.*)$/); if (!m) return;
      var k = m[1], v = m[2].trim();
      if (k === "TY") { cur = { key: "", type: v.toLowerCase(), authors: [], year: "n.d.", title: "", container: "", volume: "", issue: "", pages: "", publisher: "", place: "", doi: "", url: "", accessed: "", edition: "" }; return; }
      if (!cur) return;
      if (k === "ER") { out.push(cur); cur = null; return; }
      if (k === "AU" || k === "A1") cur.authors = cur.authors.concat(names([v]));
      else if (k === "PY" || k === "Y1" || k === "DA") { var y = v.match(/\d{4}/); if (y && cur.year === "n.d.") cur.year = y[0]; }
      else if (k === "TI" || k === "T1") cur.title = v; else if (k === "T2" || k === "JO" || k === "JF") cur.container = cur.container || v;
      else if (k === "VL") cur.volume = v; else if (k === "IS") cur.issue = v; else if (k === "SP") cur.pages = v; else if (k === "EP") cur.pages += "–" + v;
      else if (k === "PB") cur.publisher = v; else if (k === "CY") cur.place = v; else if (k === "DO") cur.doi = v; else if (k === "UR") cur.url = v; else if (k === "ID") cur.key = v;
    });
    return out;
  }
  function parse(name, text) {
    if (/\.json$/i.test(name) || /^\s*[\[{]/.test(text)) return parseCsl(text);
    if (/\.ris$/i.test(name) || /^TY  - /m.test(text)) return parseRis(text);
    return parseBib(text);
  }

  // in-text citations: (Surname, 2020), (Surname et al., 2019; Other and Name, 2021), Surname (2020)
  function citations(text) {
    var out = [], seen = {}, m;
    function push(fam, year, raw) { var k = fam.toLowerCase() + " " + year; if (seen[k]) return; seen[k] = 1; out.push({ family: fam, year: year, raw: raw }); }
    var re = /\(([^()]{2,240}?\b(?:1[89]|20)\d{2}[a-z]?[^()]{0,60})\)/g;
    while ((m = re.exec(text))) m[1].split(/;/).forEach(function (c) { var a = c.match(/([A-Z][A-Za-zÀ-ÿ’'\-]+(?: [A-Z][A-Za-zÀ-ÿ’'\-]+)?)(?: et al\.?| and [A-Z][A-Za-zÀ-ÿ’'\-]+| & [A-Z][A-Za-zÀ-ÿ’'\-]+)?,? ((?:1[89]|20)\d{2})[a-z]?/); if (a && !/^(RQ|Table|Figure|Section|Chapter|Dataset)/.test(a[1])) push(a[1].split(" ").pop(), a[2], c.trim()); });
    var re2 = /\b([A-Z][A-Za-zÀ-ÿ’'\-]+)(?: et al\.?| and [A-Z][A-Za-zÀ-ÿ’'\-]+)? \(((?:1[89]|20)\d{2})[a-z]?(?:[;,][^)]*)?\)/g;
    while ((m = re2.exec(text))) if (!/^(RQ|Table|Figure|Section|Chapter|Dataset|In|The|See|By)$/.test(m[1])) push(m[1], m[2], m[0]);
    return out;
  }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, ""); }
  function match(cites, entries) {
    var missing = [], used = new Set();
    cites.forEach(function (c) {
      var hit = entries.find(function (e) { return e.year === c.year && e.authors.some(function (a, i) { return i === 0 && norm(a.family) === norm(c.family); }); }) ||
                entries.find(function (e) { return e.year === c.year && e.authors.some(function (a) { return norm(a.family) === norm(c.family); }); });
      if (hit) used.add(hit); else missing.push(c);
    });
    return { missing: missing, used: Array.from(used), unused: entries.filter(function (e) { return !used.has(e); }) };
  }
  function initials(g) { return String(g || "").split(/[\s-]+/).filter(Boolean).map(function (p) { return p[0].toUpperCase() + "."; }).join(""); }
  function authorStr(as) {
    if (!as.length) return "";
    var f = as.map(function (a) { return a.family + (a.given ? ", " + initials(a.given) : ""); });
    if (f.length > 3) return f[0] + " et al.";
    return f.length === 1 ? f[0] : f.slice(0, -1).join(", ") + " and " + f[f.length - 1];
  }
  // Cite Them Right Harvard; returns HTML (titles in italics where the style requires)
  function harvard(e) {
    var esc = function (s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); };
    var a = esc(authorStr(e.authors) || e.title), y = " (" + esc(e.year) + ") ", t = e.type || "";
    var link = e.doi ? " Available at: https://doi.org/" + esc(e.doi.replace(/^https?:\/\/doi\.org\//, "")) + "." : e.url ? " Available at: " + esc(e.url) + (e.accessed ? " (Accessed: " + esc(e.accessed) + ")" : "") + "." : "";
    if (/article|journal|paper-conference|newspaper|magazine|^jour|^news|^mgzn/.test(t) || (e.container && !/book|thesis|report/.test(t))) {
      return a + y + "‘" + esc(e.title) + "’, <em>" + esc(e.container) + "</em>" + (e.volume ? ", " + esc(e.volume) + (e.issue ? "(" + esc(e.issue) + ")" : "") : "") + (e.pages ? ", pp. " + esc(e.pages) : "") + "." + link;
    }
    if (/chapter|incollection|inbook|^chap/.test(t)) return a + y + "‘" + esc(e.title) + "’, in <em>" + esc(e.container) + "</em>." + (e.place ? " " + esc(e.place) + ":" : "") + (e.publisher ? " " + esc(e.publisher) + "," : "") + (e.pages ? " pp. " + esc(e.pages) : "") + "." + link;
    if (/thesis|phd/.test(t)) return a + y + "<em>" + esc(e.title) + "</em>. PhD thesis. " + esc(e.publisher) + "." + link;
    if (/web|online|misc|^elec/.test(t) && !e.publisher) return a + y + "<em>" + esc(e.title) + "</em>." + link;
    return a + y + "<em>" + esc(e.title) + "</em>." + (e.edition ? " " + esc(e.edition) + " edn." : "") + (e.place ? " " + esc(e.place) + ":" : "") + (e.publisher ? " " + esc(e.publisher) + "." : "") + link;
  }
  function sortKey(e) { return norm(authorStr(e.authors) || e.title) + e.year; }
  function referenceList(entries) { return entries.slice().sort(function (x, y) { return sortKey(x) < sortKey(y) ? -1 : 1; }).map(harvard); }
  window.ZoteroKit = { load: load, save: save, parse: parse, citations: citations, match: match, harvard: harvard, referenceList: referenceList };
})();
