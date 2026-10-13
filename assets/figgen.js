// Auto-figure generator: reads a paragraph, detects structure (lists, term–meaning pairs,
// steps, numbers, years, contrasts, key concepts) and draws black-and-white diagrams
// in randomisable styles. Pure client-side SVG.
(function () {
  // ---------------------------------------------------------------- text helpers
  var STOP = new Set("the a an and or but of to in on for with by from as at that this these those is are was were be been being it its their they them there which who whom what when where how not no so than then also into over under about between across through more most such can could would should may might will do does did has have had i we you he she our my your his her us one two three each other only very many both all any some own same within without while whether because although though since until after before during again further here once just even ever every few still well rather instead however yet".split(" "));
  function cap(s) { s = s.trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; }
  var BOUND = /^(across|by|that|which|who|showing|through|from|with|in|for|while|where|when|because|as|after|before|since|into|over|between|and|or|but|to)$/i;
  function shorten(s, max) {
    s = String(s).replace(/\s+/g, " ").replace(/^[\s,;:]*(and|or|the|a|an|to|of|both)\s+/i, "").replace(/[\s.;:,]+$/, "").trim();
    max = max || 7;
    var w = s.split(" ");
    if (w.length <= max) return cap(s);
    // cut before the last natural boundary inside the window (keeps a readable phrase, no ellipsis)
    var cut = max;
    for (var i = max; i >= 3; i--) if (BOUND.test(w[i] || "")) { cut = i; break; }
    var out = w.slice(0, cut).join(" ").replace(/[,;:]$/, "");
    return cap(out.replace(/\s(the|a|an|of|and|or|to|its|their)$/i, ""));
  }
  function sentences(t) { return t.match(/[^.!?]+(?:[.!?]+["’”)]*|$)/g) || [t]; }
  function trimLead(s) {
    var cuts = [" such as ", " including ", " like ", ": ", " between ", " of ", " are ", " is ", " spans ", " into ", " as "];
    var best = -1, len = 0;
    cuts.forEach(function (c) { var i = s.lastIndexOf(c); if (i > best) { best = i; len = c.length; } });
    if (best >= 0) s = s.slice(best + len);
    var w = s.trim().split(/\s+/); if (w.length > 5) s = w.slice(-4).join(" ");
    return s;
  }
  function trimTail(s) { var m = s.split(/\s(?:which|that|who|whose|where|when|because|while|so that|in order)\s/i)[0]; var w = m.trim().split(/\s+/); return w.length > 6 ? w.slice(0, 5).join(" ") : m; }
  function splitList(seg) {
    var parts = seg.split(/,\s+(?:and\s+|or\s+)?|\s+(?:and|or)\s+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (parts.length < 3) return null;
    parts[0] = trimLead(parts[0]); parts[parts.length - 1] = trimTail(parts[parts.length - 1]);
    if (parts.some(function (p) { return p.split(/\s+/).length > 8 || p.length < 2; })) return null;
    return parts.map(function (p) { return shorten(p, 6); });
  }

  // ---------------------------------------------------------------- detection
  var KEYTERMS = ["wellbeing", "responsibility", "news discourse", "neuroliberalism", "AI chatbots", "reflexive self", "pure relationship", "Indonesia", "family", "therapy", "regulation", "platforms", "journalism", "techno-solutionism", "relational wellbeing", "mental health", "companions", "care", "governance", "self-care"];
  function keyTerms(text) {
    var low = text.toLowerCase(), found = [];
    KEYTERMS.forEach(function (k) { var n = low.split(k.toLowerCase()).length - 1; if (n) found.push([k, n * (k.indexOf(" ") > 0 ? 2 : 1)]); });
    var counts = {};
    (low.match(/[a-z][a-z’'-]{5,}/g) || []).forEach(function (w) { if (!STOP.has(w)) counts[w] = (counts[w] || 0) + 1; });
    Object.keys(counts).forEach(function (w) { if (counts[w] >= 2 && !found.some(function (f) { return f[0].toLowerCase().indexOf(w) >= 0 || w.indexOf(f[0].toLowerCase()) >= 0; })) found.push([w, counts[w]]); });
    found.sort(function (a, b) { return b[1] - a[1]; });
    return found.map(function (f) { return cap(f[0]); });
  }
  var VERBY = /^(however|but|only|yet|thus|instead|have|has|had|were|was|is|are|it|they|these|this|its|their|which|who|that|reduce|shows?|became|become|offer|carry|change|make|made|treated|maintained|produced|operate|developed|centres|read|extract|closing|acknowledge|named|found|includes?)\b/i;
  function nouny(it) { var w = it.replace(/…$/, "").split(/\s+/); return w.length <= 4 && !VERBY.test(it); }
  function noCite(s) { return s.replace(/\s*\([^)]*\b(19|20)\d{2}[^)]*\)/g, "").replace(/\s+/g, " ").trim(); }
  function stripConn(s) { return s.replace(/^[\s,]*(however|yet|but|thus|instead|moreover|therefore|so|and),?\s*/i, "").replace(/^[^,]{0,30},\s*(however|yet|thus|therefore),?\s*/i, ""); }
  function detect(text, ctx) {
    ctx = ctx || {}; text = String(text);
    var out = [], clean = noCite(text), sents = sentences(clean), key = keyTerms(clean);
    // 1. term–meaning pairs: "a, b, c and d (w, x, y and z)"
    var pm, pre = /([^()]{8,260})\(([^()]{5,160})\)/g;
    while ((pm = pre.exec(text))) {
      if (/\b(19|20)\d{2}\b|\bp\.\s?\d/.test(pm[2])) continue;
      var right = splitList(pm[2]); if (!right) continue;
      var raw = pm[1].split(/[.;:]/).pop().split(/,\s+(?:and\s+|or\s+)?|\s+(?:and|or)\s+/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (raw.length < right.length) continue;
      var left = raw.slice(-right.length);
      left[0] = trimLead(" " + left[0]).trim().split(/\s+/).slice(-2).join(" ");
      if (left.some(function (x) { return x.split(/\s+/).length > 4; })) continue;
      left = left.map(function (x) { return shorten(x, 4); });
      out.push({ type: "pairs", q: 10, title: "Terms and meanings", items: left.map(function (a, i) { return { a: a, b: right[i] }; }) });
      break;
    }
    // 2. ordinal steps (this paragraph + following sibling paragraphs)
    var ordRe = /^\s*(First|Second|Third|Fourth|Fifth|Finally|Lastly)\b,?\s*/i;
    var pool = [clean].concat((ctx.after || []).map(noCite));
    if (ordRe.test(pool[0])) {
      var steps = [];
      for (var k = 0; k < pool.length && steps.length < 7; k++) {
        var ss = sentences(pool[k]).filter(function (x) { return ordRe.test(x); });
        if (!ss.length) { if (k > 0) break; else continue; }
        ss.forEach(function (x) {
          var rest = x.replace(ordRe, ""), adv = rest.match(/^([A-Za-z]+ly),\s*/);
          rest = rest.replace(/^([A-Za-z]+ly),\s*/, "").replace(/^(it|this study|the study|this research)\s+/i, "");
          steps.push(adv ? cap(adv[1]) + ": " + shorten(rest, 6).replace(/^./, function (c) { return c.toLowerCase(); }) : shorten(rest, 8));
        });
      }
      if (steps.length >= 2) out.push({ type: "list", flavour: "steps", q: 9, title: key[0] ? key[0] + ": in steps" : "Steps", items: steps });
    }
    // 3. numbers (percentages and counts kept separate)
    var pct = [], cnt = [], nm;
    var pr = /(\d+(?:\.\d+)?)\s?(?:%|per cent)/g;
    while ((nm = pr.exec(clean))) {
      var after = clean.slice(nm.index + nm[0].length).match(/^\s*(?:of\s+)?([^,.;()\d]{3,50})/), before = clean.slice(Math.max(0, nm.index - 60), nm.index).replace(/[(\s]+$/, "").split(/\s+/).slice(-4).join(" ");
      var lab = after && !/^\s*\)/.test(clean.slice(nm.index + nm[0].length)) ? after[1] : before;
      pct.push({ a: shorten(stripConn(lab), 5), v: parseFloat(nm[1]), unit: "%" });
    }
    var cr = /(?<![\d.,])(\d{1,3}(?:,\d{3})+|\d{2,})\s+((?:[A-Za-z][\w’'-]*\s?){1,4}?)(?=[,.;)]|\s(?:from|in|published|between|on|about|and|that|with|by|reviewed)\b)/g;
    while ((nm = cr.exec(clean))) { var v = parseInt(nm[1].replace(/,/g, ""), 10); if (v >= 1900 && v <= 2100 && !/,/.test(nm[1])) continue; cnt.push({ a: shorten(nm[2], 4), v: v, unit: "" }); }
    if (pct.length >= 2) out.push({ type: "numbers", q: 8, title: "Figures cited (%)", items: pct.slice(0, 8) });
    if (cnt.length >= 2) out.push({ type: "numbers", q: 7, title: "Figures cited", items: cnt.slice(0, 8) });
    // 4. timeline (paragraph, extended with sibling paragraphs if it has one dated event)
    var tlText = clean, tr = /\b(?:In|By|Since|From|Until)\s+(?:[A-Z][a-z]+\s+)?((?:19|20)\d{2}),?\s+([^.;]{5,140})/g, tm, tl = [];
    var own = (clean.match(tr) || []).length;
    if (own >= 1 && ctx.section) tlText = noCite(ctx.section);
    tr.lastIndex = 0;
    while ((tm = tr.exec(tlText))) tl.push({ a: tm[1], b: shorten(stripConn(tm[2]), 8) });
    var seenY = {}; tl = tl.filter(function (x) { var k = x.a + x.b; if (seenY[k]) return false; seenY[k] = 1; return true; });
    if (own >= 1 && tl.length >= 2) out.push({ type: "timeline", q: 8, title: "Timeline", items: tl.sort(function (x, y) { return x.a - y.a; }).slice(0, 8) });
    // 5. enumerations (only noun-like lists)
    var seen = {};
    sents.forEach(function (s) {
      var m, re = /((?:[^,;:()]{2,70},\s+){1,6}[^,;:()]{2,70},?\s+(?:and|or)\s+[^,;:().]{2,70})/g;
      while ((m = re.exec(s))) {
        var items = splitList(m[1]); if (!items || items.length > 7) continue;
        var good = items.filter(nouny).length / items.length; if (good < 0.75) continue;
        var kk = items.join("|"); if (seen[kk]) continue; seen[kk] = 1;
        if (out.some(function (o) { return o.type === "pairs" && o.items.some(function (it) { return items.indexOf(it.b) >= 0 || items.indexOf(it.a) >= 0; }); })) continue;
        var isSteps = /stage|phase|step|from .* to|sequence|emergence|normalisation/i.test(s);
        out.push({ type: "list", flavour: isSteps ? "steps" : "set", q: 5 + good, title: isSteps ? "Stages" : (key[0] || "Elements"), items: items });
      }
    });
    // 6. contrast
    sents.some(function (s) {
      var c = s.match(/^(.*?)\b(rather than|whereas|unlike|instead of|as opposed to|in contrast to)\b(.*)$/i);
      if (!c || c[1].trim().split(/\s+/).length < 3 || c[3].trim().split(/\s+/).length < 2) return false;
      var L = stripConn(c[1].replace(/^[^,]{0,40},\s*(?=\w)/, "")).trim(), R = stripConn(c[3]).trim();
      out.push({ type: "contrast", q: 4, title: "Contrast", items: [{ a: shorten(L.split(/\s+/).slice(-9).join(" "), 9) }, { a: shorten(R, 9) }], connector: c[2].toLowerCase() });
      return true;
    });
    // 7. concept map (fallback)
    if (key.length >= 3) out.push({ type: "concept", q: 1, title: key[0], items: key.slice(1, 7) });
    out.sort(function (x, y) { return y.q - x.q; });
    return out;
  }

  // ---------------------------------------------------------------- styles
  var LAYOUTS = { list: ["flow", "cards", "radial", "stack", "cycle"], pairs: ["table", "cards", "radial"], numbers: ["bars", "columns", "dots"], timeline: ["line", "vertical"], contrast: ["columns", "balance"], concept: ["radial", "cards"] };
  var FILLS = ["white", "grey", "hatch", "dots", "alt"], CORNERS = [0, 6, 14, 99], STROKES = [1, 1.6, 2.4], FONTS = ["sans", "serif"];
  function pick(a, r) { return a[Math.floor(r() * a.length)]; }
  function rng(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function randomStyle(type, prefs, seed) {
    var r = rng(seed || (Date.now() & 0xffffff)); prefs = prefs || {};
    var lays = LAYOUTS[type] || ["cards"];
    if (prefs.layouts && prefs.layouts.length) { var f = lays.filter(function (l) { return prefs.layouts.indexOf(l) >= 0; }); if (f.length) lays = f; }
    return {
      layout: pick(lays, r),
      fill: prefs.fill && prefs.fill !== "any" ? prefs.fill : pick(FILLS, r),
      corner: prefs.corner === "sharp" ? 0 : prefs.corner === "round" ? pick([14, 99], r) : pick(CORNERS, r),
      stroke: pick(STROKES, r),
      font: prefs.font && prefs.font !== "any" ? prefs.font : pick(FONTS, r),
      title: prefs.title !== false,
      dashed: r() < 0.3
    };
  }

  // ---------------------------------------------------------------- SVG primitives
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function wrap(text, maxChars) {
    var words = String(text).split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) { if ((cur + " " + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
    if (cur) lines.push(cur);
    return lines.slice(0, 5);
  }
  function fillFor(st, i) {
    var f = st.fill === "alt" ? (i % 2 ? "grey" : "white") : st.fill;
    return f === "grey" ? "#e4e4e4" : f === "hatch" ? "url(#gh)" : f === "dots" ? "url(#gd)" : "#fff";
  }
  function FONT(st) { return st.font === "serif" ? "Georgia, 'Times New Roman', serif" : "Arial, Helvetica, sans-serif"; }
  function svgDoc(w, h, st, body, title) {
    var head = title ? '<text x="' + (w / 2) + '" y="30" text-anchor="middle" font-size="17" font-weight="700" fill="#000">' + esc(title) + '</text>' : "";
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" font-family="' + FONT(st) + '">' +
      '<defs><pattern id="gh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#fff"/><line x1="0" y1="0" x2="0" y2="7" stroke="#b5b5b5" stroke-width="1.2"/></pattern>' +
      '<pattern id="gd" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fff"/><circle cx="3" cy="3" r="0.8" fill="#9a9a9a"/></pattern>' +
      '<marker id="ga" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#000"/></marker></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="#fff"/>' + head + body + '</svg>';
  }
  function node(x, y, w, h, text, st, i, opts) {
    opts = opts || {};
    var rx = Math.min(st.corner, h / 2), lines = wrap(text, Math.max(8, Math.floor(w / 7.4)));
    var fs = opts.fs || 14, lh = fs + 3;
    var need = lines.length * lh + 14; if (!opts.circle && need > h) { y -= (need - h) / 2; h = need; rx = Math.min(st.corner, h / 2); }
    var y0 = y + h / 2 - (lines.length - 1) * lh / 2 + fs * 0.35;
    var shape = opts.circle ? '<circle cx="' + (x + w / 2) + '" cy="' + (y + h / 2) + '" r="' + (w / 2) + '"' : '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '"';
    var s = shape + ' fill="' + (opts.fill || fillFor(st, i)) + '" stroke="#000" stroke-width="' + st.stroke + '"' + (st.dashed && opts.dashable ? ' stroke-dasharray="5 4"' : "") + '/>';
    lines.forEach(function (ln, k) {
      var tw = ln.length * fs * 0.52;
      if (opts.backing && st.fill !== "white" && st.fill !== "grey") s += '<rect x="' + (x + w / 2 - tw / 2 - 3) + '" y="' + (y0 + k * lh - fs + 2) + '" width="' + (tw + 6) + '" height="' + (fs + 3) + '" fill="#fff"/>';
      s += '<text x="' + (x + w / 2) + '" y="' + (y0 + k * lh) + '" text-anchor="middle" font-size="' + fs + '"' + (opts.bold ? ' font-weight="700"' : "") + ' fill="' + (opts.color || "#000") + '">' + esc(ln) + '</text>';
    });
    return s;
  }
  function arrow(x1, y1, x2, y2, st) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#000" stroke-width="' + Math.max(1.2, st.stroke) + '" marker-end="url(#ga)"' + (st.dashed ? ' stroke-dasharray="5 4"' : "") + '/>'; }

  // ---------------------------------------------------------------- renderers
  function render(c, st) {
    var W = 720, T = st.title ? 50 : 14, items = c.items, n = items.length, body = "", H = 300, i;
    var label = function (it) { return typeof it === "string" ? it : (it.a || ""); };
    if (c.type === "list" || c.type === "concept") {
      var lay = st.layout;
      if (lay === "flow" && n <= 6) {
        var gap = 26, bw = Math.min(150, (W - 40 - gap * (n - 1)) / n), bh = 84; H = T + bh + 40;
        var x0 = (W - (bw * n + gap * (n - 1))) / 2;
        for (i = 0; i < n; i++) { body += node(x0 + i * (bw + gap), T + 14, bw, bh, label(items[i]), st, i, { backing: true }); if (i < n - 1) body += arrow(x0 + i * (bw + gap) + bw + 2, T + 14 + bh / 2, x0 + (i + 1) * (bw + gap) - 3, T + 14 + bh / 2, st); }
      } else if (lay === "stack") {
        var bh2 = 46, gap2 = 10; H = T + n * (bh2 + gap2) + 20;
        for (i = 0; i < n; i++) { var ww = 560 - i * (c.flavour === "steps" ? 0 : 30); body += node((W - ww) / 2, T + 10 + i * (bh2 + gap2), ww, bh2, label(items[i]), st, i, { backing: true }); }
      } else if (lay === "cycle" || lay === "radial") {
        var cx = W / 2, R = n > 5 ? 132 : 118, cy = T + R + 58; H = cy + R + 74;
        if (lay === "radial") body += node(cx - 80, cy - 32, 160, 64, c.title || "", st, 0, { bold: true, fill: "#000", color: "#fff", fs: 12.5 });
        for (i = 0; i < n; i++) {
          var ang = -Math.PI / 2 + i * 2 * Math.PI / n, nx = cx + R * 1.55 * Math.cos(ang), ny = cy + R * Math.sin(ang);
          if (lay === "radial") body += '<line x1="' + cx + '" y1="' + cy + '" x2="' + nx + '" y2="' + ny + '" stroke="#000" stroke-width="' + st.stroke + '"' + (st.dashed ? ' stroke-dasharray="5 4"' : "") + '/>';
          else { var a2 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / n, mx = cx + R * 1.55 * Math.cos((ang + a2) / 2) * 0.98, my = cy + R * Math.sin((ang + a2) / 2) * 0.98; body += '<path d="M' + (nx + (cx + R * 1.55 * Math.cos(a2) - nx) * 0.28) + ' ' + (ny + (cy + R * Math.sin(a2) - ny) * 0.28) + ' Q ' + mx + ' ' + my + ' ' + (nx + (cx + R * 1.55 * Math.cos(a2) - nx) * 0.72) + ' ' + (ny + (cy + R * Math.sin(a2) - ny) * 0.72) + '" fill="none" stroke="#000" stroke-width="' + Math.max(1.2, st.stroke) + '" marker-end="url(#ga)"/>'; }
          body += node(nx - 88, ny - 28, 176, 56, label(items[i]), st, i + 1, { backing: true, fs: 13 });
        }
        if (lay === "cycle" && c.title) body += '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="15" font-style="italic" fill="#000">' + esc(c.title) + '</text>';
      } else { // cards
        var cols = n <= 4 ? n : Math.ceil(n / 2), rows = Math.ceil(n / cols), cw = (W - 60 - (cols - 1) * 16) / cols, ch = 90; H = T + rows * (ch + 16) + 24;
        for (i = 0; i < n; i++) { var col = i % cols, row = Math.floor(i / cols); body += node(30 + col * (cw + 16), T + 10 + row * (ch + 16), cw, ch, (c.flavour === "steps" ? (i + 1) + ". " : "") + label(items[i]), st, i, { backing: true }); }
      }
    } else if (c.type === "pairs") {
      if (st.layout === "table") {
        var rh = 40; H = T + 20 + (n + 1) * rh;
        body += '<rect x="60" y="' + (T + 10) + '" width="600" height="' + rh + '" fill="#000"/><text x="80" y="' + (T + 35) + '" font-size="13" font-weight="700" fill="#fff">Term</text><text x="330" y="' + (T + 35) + '" font-size="13" font-weight="700" fill="#fff">Meaning</text>';
        for (i = 0; i < n; i++) { var yy = T + 10 + (i + 1) * rh; body += '<rect x="60" y="' + yy + '" width="600" height="' + rh + '" fill="' + (i % 2 && st.fill !== "white" ? "#eee" : "#fff") + '" stroke="#000" stroke-width="' + st.stroke + '"/><line x1="310" y1="' + yy + '" x2="310" y2="' + (yy + rh) + '" stroke="#000" stroke-width="' + st.stroke + '"/><text x="80" y="' + (yy + 25) + '" font-size="14" font-style="italic" fill="#000">' + esc(items[i].a) + '</text><text x="330" y="' + (yy + 25) + '" font-size="13" fill="#000">' + esc(items[i].b) + '</text>'; }
      } else if (st.layout === "radial") {
        var cx2 = W / 2, R2 = 120, cy2 = T + R2 + 40; H = cy2 + R2 + 70;
        body += node(cx2 - 80, cy2 - 30, 160, 60, c.title, st, 0, { bold: true, fill: "#000", color: "#fff", fs: 12.5 });
        for (i = 0; i < n; i++) { var an = -Math.PI / 2 + i * 2 * Math.PI / n, px = cx2 + R2 * 1.6 * Math.cos(an), py = cy2 + R2 * Math.sin(an); body += '<line x1="' + cx2 + '" y1="' + cy2 + '" x2="' + px + '" y2="' + py + '" stroke="#000" stroke-width="' + st.stroke + '"/>' + node(px - 75, py - 30, 150, 60, items[i].a + " · " + items[i].b, st, i + 1, { backing: true, fs: 12 }); }
      } else {
        var cw2 = (W - 60 - (n - 1) * 14) / n, ch2 = 120; H = T + ch2 + 40;
        for (i = 0; i < n; i++) { var xx = 30 + i * (cw2 + 14); body += node(xx, T + 14, cw2, ch2, "", st, i) + '<text x="' + (xx + cw2 / 2) + '" y="' + (T + 60) + '" text-anchor="middle" font-size="17" font-style="italic" font-weight="700" fill="#000">' + esc(items[i].a) + '</text><text x="' + (xx + cw2 / 2) + '" y="' + (T + 90) + '" text-anchor="middle" font-size="12.5" fill="#000">' + esc(items[i].b) + '</text>'; }
      }
    } else if (c.type === "numbers") {
      var max = Math.max.apply(null, items.map(function (x) { return x.v; })) || 1, unit = items[0].unit || "";
      if (st.layout === "columns") {
        var bw3 = Math.min(90, (W - 100) / n - 20), base = T + 230; H = base + 70;
        body += '<line x1="50" y1="' + base + '" x2="' + (W - 30) + '" y2="' + base + '" stroke="#000" stroke-width="1.2"/>';
        for (i = 0; i < n; i++) { var hh = 200 * items[i].v / max, xc = 70 + i * ((W - 100) / n); body += '<rect x="' + xc + '" y="' + (base - hh) + '" width="' + bw3 + '" height="' + hh + '" rx="' + Math.min(st.corner, 6) + '" fill="' + fillFor(st, i) + '" stroke="#000" stroke-width="' + st.stroke + '"/><text x="' + (xc + bw3 / 2) + '" y="' + (base - hh - 6) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#000">' + items[i].v.toLocaleString() + unit + '</text>' + wrap(items[i].a, 14).map(function (l, k) { return '<text x="' + (xc + bw3 / 2) + '" y="' + (base + 16 + k * 13) + '" text-anchor="middle" font-size="11" fill="#000">' + esc(l) + '</text>'; }).join(""); }
      } else {
        var rh3 = 38; H = T + 20 + n * rh3 + 20;
        for (i = 0; i < n; i++) {
          var y3 = T + 14 + i * rh3, wv = 380 * items[i].v / max;
          body += '<text x="250" y="' + (y3 + 20) + '" text-anchor="end" font-size="12.5" fill="#000">' + esc(items[i].a) + '</text>';
          if (st.layout === "dots") body += '<line x1="262" y1="' + (y3 + 16) + '" x2="' + (262 + wv) + '" y2="' + (y3 + 16) + '" stroke="#999" stroke-width="1" stroke-dasharray="2 3"/><circle cx="' + (262 + wv) + '" cy="' + (y3 + 16) + '" r="7" fill="#000"/>';
          else body += '<rect x="262" y="' + (y3 + 4) + '" width="' + Math.max(2, wv) + '" height="24" rx="' + Math.min(st.corner, 12) + '" fill="' + fillFor(st, i) + '" stroke="#000" stroke-width="' + st.stroke + '"/>';
          body += '<text x="' + (272 + wv + (st.layout === "dots" ? 6 : 0)) + '" y="' + (y3 + 21) + '" font-size="12.5" font-weight="700" fill="#000">' + items[i].v.toLocaleString() + unit + '</text>';
        }
      }
    } else if (c.type === "timeline") {
      if (st.layout === "vertical") {
        var rh4 = 64; H = T + 20 + n * rh4;
        body += '<line x1="140" y1="' + (T + 14) + '" x2="140" y2="' + (H - 16) + '" stroke="#000" stroke-width="' + st.stroke + '"/>';
        for (i = 0; i < n; i++) { var y4 = T + 30 + i * rh4; body += '<circle cx="140" cy="' + y4 + '" r="8" fill="' + (i % 2 ? "#000" : "#fff") + '" stroke="#000" stroke-width="2"/><text x="118" y="' + (y4 + 5) + '" text-anchor="end" font-size="16" font-weight="700" fill="#000">' + esc(items[i].a) + '</text>' + wrap(items[i].b, 60).map(function (l, k) { return '<text x="162" y="' + (y4 + 5 + k * 15) + '" font-size="13" fill="#000">' + esc(l) + '</text>'; }).join(""); }
      } else {
        H = T + 240; var y5 = T + 120, step = (W - 240) / Math.max(1, n - 1);
        body += '<line x1="40" y1="' + y5 + '" x2="' + (W - 40) + '" y2="' + y5 + '" stroke="#000" stroke-width="' + st.stroke + '" marker-end="url(#ga)"/>';
        for (i = 0; i < n; i++) { var x5 = n === 1 ? W / 2 : 120 + i * step, up = i % 2 === 0; var ev = wrap(items[i].b, 22), nl = ev.length;
          body += '<circle cx="' + x5 + '" cy="' + y5 + '" r="8" fill="' + (up ? "#000" : "#fff") + '" stroke="#000" stroke-width="2"/>' +
            '<text x="' + x5 + '" y="' + (up ? y5 - 30 - nl * 13 : y5 + 34) + '" text-anchor="middle" font-size="15" font-weight="700" fill="#000">' + esc(items[i].a) + '</text>' +
            ev.map(function (l, k) { return '<text x="' + x5 + '" y="' + (up ? y5 - 22 - (nl - 1 - k) * 13 : y5 + 50 + k * 13) + '" text-anchor="middle" font-size="11" fill="#000">' + esc(l) + '</text>'; }).join(""); }
      }
    } else if (c.type === "contrast") {
      var Lt = items[0].a, Rt = items[1] ? items[1].a : "";
      if (st.layout === "balance") {
        H = T + 240; var cx6 = W / 2, by = T + 70;
        body += '<polygon points="' + cx6 + ',' + (by + 130) + ' ' + (cx6 - 30) + ',' + (by + 170) + ' ' + (cx6 + 30) + ',' + (by + 170) + '" fill="#000"/><line x1="' + (cx6 - 230) + '" y1="' + (by + 10) + '" x2="' + (cx6 + 230) + '" y2="' + (by - 10) + '" stroke="#000" stroke-width="3"/><line x1="' + cx6 + '" y1="' + by + '" x2="' + cx6 + '" y2="' + (by + 130) + '" stroke="#000" stroke-width="3"/>' +
          node(cx6 - 330, by + 18, 200, 90, Lt, st, 0, { backing: true }) + node(cx6 + 130, by - 2, 200, 90, Rt, st, 1, { backing: true }) +
          '<text x="' + cx6 + '" y="' + (by - 26) + '" text-anchor="middle" font-size="13" font-style="italic" fill="#000">' + esc(c.connector || "versus") + '</text>';
      } else {
        H = T + 170; body += node(40, T + 20, 280, 130, Lt, st, 0, { backing: true }) + node(W - 320, T + 20, 280, 130, Rt, st, 1, { backing: true }) +
          '<circle cx="' + (W / 2) + '" cy="' + (T + 85) + '" r="28" fill="#000"/><text x="' + (W / 2) + '" y="' + (T + 90) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">' + esc((c.connector || "vs").replace("rather than", "not").replace("instead of", "not")) + '</text>';
      }
    }
    return svgDoc(W, Math.max(H, 120), st, body, st.title ? c.title : "");
  }

  // ---------------------------------------------------------------- editing format
  function toText(c) {
    if (c.type === "pairs") return c.items.map(function (x) { return x.a + " — " + x.b; }).join("\n");
    if (c.type === "numbers") return c.items.map(function (x) { return x.a + ": " + x.v + (x.unit || ""); }).join("\n");
    if (c.type === "timeline") return c.items.map(function (x) { return x.a + ": " + x.b; }).join("\n");
    if (c.type === "contrast") return c.items.map(function (x) { return x.a; }).join("\n");
    return c.items.map(function (x) { return typeof x === "string" ? x : x.a; }).join("\n");
  }
  function fromText(c, txt) {
    var lines = txt.split("\n").map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 10), n = Object.assign({}, c);
    if (c.type === "pairs") n.items = lines.map(function (l) { var p = l.split(/\s+[—–-]\s+/); return { a: p[0], b: p.slice(1).join(" – ") || "" }; });
    else if (c.type === "numbers") n.items = lines.map(function (l) { var m = l.match(/^(.*?):\s*([\d.,]+)\s*(%?)/); return m ? { a: m[1], v: parseFloat(m[2].replace(/,/g, "")), unit: m[3] } : null; }).filter(Boolean);
    else if (c.type === "timeline") n.items = lines.map(function (l) { var m = l.match(/^(\S+?):\s*(.*)$/); return m ? { a: m[1], b: m[2] } : { a: "", b: l }; });
    else if (c.type === "contrast") n.items = lines.slice(0, 2).map(function (l) { return { a: l }; });
    else n.items = lines;
    return n;
  }
  function toTableHtml(c) {
    var e = function (s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); };
    var head, rows;
    if (c.type === "pairs") { head = ["Term", "Meaning"]; rows = c.items.map(function (x) { return ["<em>" + e(x.a) + "</em>", e(x.b)]; }); }
    else if (c.type === "numbers") { head = ["Item", "Figure", "Source"]; rows = c.items.map(function (x) { return [e(x.a), e(x.v.toLocaleString() + (x.unit || "")), "<br>"]; }); }
    else if (c.type === "timeline") { head = ["Year", "Event"]; rows = c.items.map(function (x) { return [e(x.a), e(x.b)]; }); }
    else if (c.type === "contrast") { head = ["", ""]; rows = [[e(c.items[0].a), e(c.items[1] ? c.items[1].a : "")]]; }
    else { head = ["#", c.type === "concept" ? "Related concept" : "Element", "Notes"]; rows = c.items.map(function (x, i) { return [String(i + 1), e(typeof x === "string" ? x : x.a), "<br>"]; }); }
    return '<p><strong>Table X.X</strong> ' + e(c.title) + '</p><table><thead><tr>' + head.map(function (h) { return "<th>" + e(h) + "</th>"; }).join("") + '</tr></thead><tbody>' + rows.map(function (r) { return "<tr>" + r.map(function (x) { return "<td>" + x + "</td>"; }).join("") + "</tr>"; }).join("") + '</tbody></table>';
  }
  function itemLine(c, x, e) {
    if (c.type === "pairs") return "<em>" + e(x.a) + "</em>: " + e(x.b);
    if (c.type === "numbers") return e(x.a) + ": <strong>" + e(x.v.toLocaleString() + (x.unit || "")) + "</strong>";
    if (c.type === "timeline") return "<strong>" + e(x.a) + "</strong>: " + e(x.b);
    return e(typeof x === "string" ? x : x.a);
  }
  function E(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  function toListHtml(c) { var tag = c.flavour === "steps" || c.type === "timeline" ? "ol" : "ul"; return "<" + tag + ">" + c.items.map(function (x) { return "<li>" + itemLine(c, x, E) + "</li>"; }).join("") + "</" + tag + ">"; }
  function toBoxHtml(c) { return "<blockquote><p><strong>" + E(c.title) + "</strong></p>" + toListHtml(c) + "</blockquote>"; }
  function labelsOf(c) { return c.items.map(function (x) { return typeof x === "string" ? x : [x.a, x.b].filter(Boolean).join(" "); }); }
  function readability(c, fmt, layout) {
    var L = labelsOf(c), n = L.length || 1, avg = L.reduce(function (a, x) { return a + x.split(/\s+/).length; }, 0) / n, mx = Math.max.apply(null, L.map(function (x) { return x.split(/\s+/).length; }));
    var sc;
    if (fmt === "table") sc = c.type === "concept" ? 70 : (c.type === "pairs" || c.type === "numbers" || c.type === "timeline") ? 94 : 86 - (n > 8 ? 8 : 0);
    else if (fmt === "list") sc = 84 + (avg > 6 ? 6 : 0);
    else if (fmt === "box") sc = 80 + (avg > 6 ? 4 : 0);
    else {
      sc = 96 - 7 * Math.max(0, avg - 3) - 3 * Math.max(0, mx - 8);
      if ((layout === "radial" || layout === "cycle") && n > 5) sc -= 18;
      if (layout === "flow" && n > 4) sc -= 16;
      if (layout === "cards" && avg > 7) sc -= 8;
      if (layout === "stack") sc += 4;
      if (c.type === "numbers") sc = layout === "bars" ? 93 : layout === "dots" ? 88 : 86 - (avg > 3 ? 10 : 0);
      if (c.type === "timeline") sc = layout === "vertical" ? 92 : 90 - 8 * Math.max(0, avg - 5) - (n > 4 ? 18 : 0);
      if (c.type === "pairs" && layout === "table") sc = 95;
      if (c.type === "contrast") sc = layout === "columns" ? 88 - 4 * Math.max(0, avg - 7) : 80 - 4 * Math.max(0, avg - 6);
    }
    return Math.max(20, Math.min(98, Math.round(sc)));
  }
  // how well the format matches the content's structure
  var FIT = {
    pairs: { table: 96, "d:table": 92, "d:cards": 80, "d:radial": 62, list: 70, box: 66 },
    numbers: { "d:bars": 95, "d:columns": 88, "d:dots": 84, table: 86, list: 55, box: 50 },
    timeline: { "d:line": 94, "d:vertical": 92, table: 80, list: 72, box: 55 },
    contrast: { "d:columns": 92, "d:balance": 80, table: 78, list: 50, box: 70 },
    concept: { "d:radial": 90, "d:cards": 72, table: 50, list: 60, box: 64 },
    steps: { "d:flow": 94, "d:stack": 88, "d:cycle": 70, "d:cards": 78, "d:radial": 55, table: 72, list: 84, box: 70 },
    set: { "d:cards": 90, "d:radial": 82, "d:stack": 72, "d:flow": 58, "d:cycle": 50, table: 74, list: 78, box: 76 }
  };
  // how naturally it sits in a thesis (examiners favour tables and clean charts; bullets in prose less so)
  var ACAD = { table: 94, "d:table": 88, "d:bars": 92, "d:columns": 88, "d:dots": 84, "d:line": 88, "d:vertical": 84, "d:flow": 86, "d:stack": 84, "d:cards": 76, "d:radial": 72, "d:cycle": 74, "d:balance": 66, list: 58, box: 70 };
  function scores(c, fmt, layout) {
    var key = fmt === "diagram" ? "d:" + layout : fmt, kind = c.type === "list" ? (c.flavour === "steps" ? "steps" : "set") : c.type;
    var read = readability(c, fmt, layout), fit = (FIT[kind] || {})[key] || 60, acad = ACAD[key] || 70;
    return { read: read, fit: fit, acad: acad, overall: Math.round(read * 0.4 + fit * 0.35 + acad * 0.25) };
  }
  function bestFormat(c) {
    var opts = (LAYOUTS[c.type] || []).map(function (l) { return { f: "diagram", l: l, s: scores(c, "diagram", l).overall }; })
      .concat(["table", "list", "box"].map(function (f) { return { f: f, l: null, s: scores(c, f).overall }; }));
    opts.sort(function (a, b) { return b.s - a.s; });
    return opts[0];
  }
  var LAYOUT_NAME = { flow: "Flow", cards: "Cards", radial: "Radial", stack: "Stack", cycle: "Cycle", table: "Grid", bars: "Bars", columns: "Columns", dots: "Dots", line: "Timeline", vertical: "Vertical timeline", balance: "Balance" };
  var TYPE_LABEL = { list: "List", pairs: "Terms & meanings", numbers: "Numbers", timeline: "Timeline", contrast: "Contrast", concept: "Concept map" };
  window.FigGen = { detect: detect, render: render, randomStyle: randomStyle, LAYOUTS: LAYOUTS, LAYOUT_NAME: LAYOUT_NAME, readability: readability, scores: scores, bestFormat: bestFormat, toText: toText, fromText: fromText, toTableHtml: toTableHtml, toListHtml: toListHtml, toBoxHtml: toBoxHtml, TYPE_LABEL: TYPE_LABEL,
    uri: function (svg) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); } };
})();
