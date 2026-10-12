// Black-and-white figure library for the revision studio.
// Print-safe: black ink, greys and hatching only, so figures survive photocopying and greyscale PDF.
(function () {
  var F = 'font-family="Arial, Helvetica, sans-serif"';
  var DEFS = '<defs>' +
    '<pattern id="h1" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#000" stroke-width="1"/></pattern>' +
    '<pattern id="h2" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fff"/><circle cx="3" cy="3" r="0.75" fill="#9a9a9a"/></pattern>' +
    '<marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#000"/></marker>' +
    '</defs>';
  function svg(w, h, body) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" ' + F + '>' + DEFS +
      '<rect width="' + w + '" height="' + h + '" fill="#fff"/>' + body + '</svg>';
  }
  function box(x, y, w, h, fill, lines, opts) {
    opts = opts || {};
    var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (opts.rx || 6) + '" fill="' + (fill || "#fff") + '" stroke="#000" stroke-width="' + (opts.sw || 1.2) + '"' + (opts.dash ? ' stroke-dasharray="' + opts.dash + '"' : '') + '/>';
    var cx = opts.left ? x + 12 : x + w / 2, anchor = opts.left ? "start" : "middle";
    var lh = 16, y0 = y + h / 2 - (lines.length - 1) * lh / 2 + 5;
    lines.forEach(function (ln, i) {
      var bold = i === 0 && !opts.nobold;
      s += '<text x="' + cx + '" y="' + (y0 + i * lh) + '" text-anchor="' + anchor + '" font-size="' + (bold ? 13 : 11.5) + '"' + (bold ? ' font-weight="700"' : '') + ' fill="#000">' + xe(ln) + '</text>';
    });
    return s;
  }
  function arrow(x1, y1, x2, y2, dash) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#000" stroke-width="1.4" marker-end="url(#ar)"' + (dash ? ' stroke-dasharray="5 4"' : '') + '/>';
  }
  function xe(s) { return String(s).replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, "&amp;").replace(/</g, "&lt;"); }
  function t(px, py, s, size, extra) { extra = extra || ""; return '<text x="' + px + '" y="' + py + '" font-size="' + (size || 12) + '"' + (/fill=/.test(extra) ? "" : ' fill="#000"') + ' ' + extra + '>' + xe(s) + '</text>'; }

  var FIGS = [
    { id: "framework", title: "Conceptual framework", fits: "Ch3 end (§3.6) · upgrade viva opening",
      caption: "Three literatures converge on one question: where news discourse places responsibility for wellbeing.",
      svg: svg(720, 330,
        box(20, 30, 200, 70, "url(#h2)", ["Neuroliberalism", "governing through choice,", "emotion and anxiety"]) +
        box(20, 130, 200, 70, "#fff", ["Reflexive self", "pure relationship,", "expert systems (Giddens)"]) +
        box(20, 230, 200, 70, "#e6e6e6", ["Relational norms", "kekeluargaan · hormat ·", "rukun · sungkan"]) +
        arrow(222, 65, 288, 150) + arrow(222, 165, 282, 165) + arrow(222, 265, 288, 182) +
        '<circle cx="365" cy="165" r="80" fill="#fff" stroke="#000" stroke-width="1.6" stroke-dasharray="6 5"/>' +
        t(365, 155, "Wellbeing", 18, 'text-anchor="middle" font-style="italic" font-family="Georgia, serif"') +
        t(365, 177, "a contested category", 11.5, 'text-anchor="middle"') + t(365, 192, "produced in discourse", 11.5, 'text-anchor="middle"') +
        arrow(447, 165, 490, 165) +
        '<rect x="494" y="40" width="206" height="250" rx="6" fill="#fff" stroke="#000" stroke-width="1.2"/>' +
        t(510, 66, "Responsibility placed on…", 13, 'font-weight="700"') +
        ["the individual user", "parents and family", "companies", "professions", "the state"].map(function (s, i) {
          return '<rect x="510" y="' + (84 + i * 36) + '" width="12" height="12" fill="' + ["#000", "url(#h1)", "#888", "url(#h2)", "#fff"][i] + '" stroke="#000"/>' + t(530, 95 + i * 36, s, 12);
        }).join("") +
        t(510, 276, "news (RQ1–2) · producers (RQ3)", 10.5, 'fill="#444"'))
    },
    { id: "loop", title: "The loop", fits: "§1.2 / §3.3",
      caption: "Companion chatbots reproduce the form of the pure relationship without its reciprocity; the relief they give reproduces the need for it.",
      svg: svg(520, 340,
        '<circle cx="260" cy="170" r="120" fill="none" stroke="#000" stroke-width="1.6"/>' +
        '<path d="M372 128 l10 -12 2 15" fill="none" stroke="#000" stroke-width="1.6"/>' +
        '<path d="M148 212 l-10 12 -2 -15" fill="none" stroke="#000" stroke-width="1.6"/>' +
        box(180, 26, 160, 50, "#fff", ["Reflexive self", "seeks a satisfying bond"]) +
        box(350, 145, 160, 50, "#fff", ["Artificial sociality", "a partner that never tires"]) +
        box(170, 264, 180, 50, "#fff", ["Therapeutic culture", "name it, reframe it, alone"]) +
        box(10, 145, 160, 50, "#fff", ["Relief, not connection", "the need is reproduced"]) +
        t(260, 165, "the pure relationship", 15, 'text-anchor="middle" font-style="italic" font-family="Georgia, serif"') +
        t(260, 186, "minus reciprocity", 12, 'text-anchor="middle" font-weight="700"'))
    },
    { id: "design", title: "Research design", fits: "§4.1, above Table 4.1",
      caption: "A sequential qualitative design: two news strands define wellbeing and responsibility; interviews follow those definitions into Indonesia (triangulation across time, space and persons).",
      svg: svg(640, 300,
        box(20, 30, 190, 66, "#e6e6e6", ["RQ1 · Public news", "The Guardian", "Jan 2023 – Dec 2026"]) +
        box(20, 120, 190, 66, "url(#h2)", ["RQ2 · Family journalism", "Jargon, WSJ “Family & Tech”", "Jun 2023 – Dec 2026"]) +
        arrow(212, 63, 262, 100) + arrow(212, 153, 262, 118) +
        box(266, 76, 150, 66, "#fff", ["van Dijk", "four-level protocol", "NVivo"]) +
        arrow(418, 109, 456, 109) +
        box(460, 76, 160, 66, "#fff", ["Definitions of", "wellbeing and", "responsibility"], { nobold: true }) +
        arrow(540, 144, 540, 196) +
        box(440, 200, 180, 76, "#000", ["", "", ""]) +
        '<text x="530" y="228" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">RQ3 · Indonesia</text>' +
        '<text x="530" y="246" text-anchor="middle" font-size="11.5" fill="#fff">FGD → interviews · Riliv, HIMPSI</text>' +
        '<text x="530" y="262" text-anchor="middle" font-size="11.5" fill="#fff">reflexive thematic analysis</text>' +
        '<polygon points="140,210 70,290 210,290" fill="none" stroke="#000" stroke-width="1.2"/>' +
        t(140, 204, "TIME", 10.5, 'text-anchor="middle"') + t(40, 298, "SPACE", 10.5) + t(196, 298, "PERSONS", 10.5) +
        t(140, 272, "converge / diverge", 10.5, 'text-anchor="middle"'))
    },
    { id: "typology", title: "Three kinds of wellbeing chatbot", fits: "§2.1 (end)",
      caption: "Purpose-built, general-purpose and companion chatbots differ in therapeutic claim and conversational constraint; the type furthest from therapy attracts the most therapeutic attachment. Positions are conceptual.",
      svg: svg(560, 340,
        '<line x1="70" y1="290" x2="540" y2="290" stroke="#000" stroke-width="1.2" marker-end="url(#ar)"/>' +
        '<line x1="70" y1="290" x2="70" y2="20" stroke="#000" stroke-width="1.2" marker-end="url(#ar)"/>' +
        t(305, 322, "conversation: scripted → open-ended", 12, 'text-anchor="middle"') +
        t(28, 160, "therapeutic claim: none → explicit", 12, 'text-anchor="middle" transform="rotate(-90 28 160)"') +
        '<circle cx="130" cy="70" r="24" fill="#888" stroke="#000"/>' + t(164, 66, "Purpose-built", 13, 'font-weight="700"') + t(164, 82, "Wysa, Woebot · CBT scripts", 11) +
        '<circle cx="360" cy="258" r="24" fill="url(#h1)" stroke="#000"/>' + t(326, 252, "General-purpose", 13, 'font-weight="700" text-anchor="end"') + t(326, 268, "ChatGPT, Claude, Gemini", 11, 'text-anchor="end"') +
        '<circle cx="470" cy="236" r="46" fill="url(#h2)" stroke="#000" stroke-width="1.4"/>' + t(470, 172, "Companion", 13, 'font-weight="700" text-anchor="middle"') + t(470, 186, "Replika, Character.AI", 11, 'text-anchor="middle"') +
        '<path d="M160 96 C 260 120, 360 150, 430 196" fill="none" stroke="#000" stroke-width="1.2" stroke-dasharray="5 4"/>' +
        t(196, 142, "furthest from therapy →", 13, 'font-style="italic" font-family="Georgia, serif"') + t(196, 160, "most therapeutic attachment", 13, 'font-style="italic" font-family="Georgia, serif"') +
        t(80, 310, "circle size = intensity of emotional use", 10, 'fill="#444"'))
    },
    { id: "sointu", title: "From body politic to body delegated", fits: "§1.6 / §3.1",
      caption: "This study extends Sointu’s (2005) trajectory of wellbeing in UK newspapers to the period in which wellbeing is delegated to machines.",
      svg: svg(560, 240,
        '<path d="M70 190 C 170 40, 390 40, 490 190" fill="none" stroke="#000" stroke-width="2"/>' +
        '<circle cx="70" cy="190" r="13" fill="#fff" stroke="#000" stroke-width="2"/>' +
        '<circle cx="280" cy="78" r="13" fill="#888" stroke="#000" stroke-width="2"/>' +
        '<circle cx="490" cy="190" r="13" fill="#000"/>' +
        t(70, 222, "Body politic", 13, 'text-anchor="middle" font-weight="700"') + t(70, 236, "mid-1980s · the nation", 10.5, 'text-anchor="middle"') +
        t(280, 42, "Body personal", 13, 'text-anchor="middle" font-weight="700"') + t(280, 56, "1990s–2003 · the self (Sointu 2005)", 10.5, 'text-anchor="middle"') +
        t(490, 222, "Body delegated?", 13, 'text-anchor="middle" font-weight="700"') + t(490, 236, "2023–2026 · the machine", 10.5, 'text-anchor="middle"'))
    },
    { id: "vandijk", title: "Four-level reading protocol", fits: "§4.3",
      caption: "Each article is read at four levels (van Dijk 1983; 1988); level 4 records who acts, who is quoted, what is assumed and what is left unsaid.",
      svg: svg(560, 300,
        box(20, 16, 520, 58, "#fff", ["1 · Thematic structure", "headline and lead → macroproposition; gap between headline and body"], { left: true }) +
        box(20, 84, 520, 58, "#eee", ["2 · Schematic structure", "summary · episode · comment: where users, chatbots and wellbeing are placed"], { left: true }) +
        box(20, 152, 520, 58, "url(#h2)", ["3 · Local coherence", "specify · generalise · contrast: how one case becomes a trend"], { left: true }) +
        box(20, 220, 520, 66, "#fff", ["4 · Style and syntax", "lexicon · passives · nominalisation · source types", "→ who acts, who is quoted, what is assumed, what is unsaid"], { left: true, sw: 2 }))
    },
    { id: "regulation", title: "What regulation reaches", fits: "§2.2 (end)",
      caption: "Regulation reaches the device and the licensed professional, but most wellbeing use of chatbots happens in the unregulated everyday domain.",
      svg: svg(560, 320,
        '<rect x="16" y="16" width="528" height="288" rx="14" fill="url(#h2)" stroke="#000" stroke-width="1.2"/>' +
        '<rect x="30" y="26" width="360" height="58" fill="#fff"/>' +
        t(40, 48, "Everyday, non-clinical use", 13, 'font-weight="700"') + t(40, 66, "left to users, parents and company safeguards", 11) +
        '<rect x="40" y="100" width="340" height="190" rx="12" fill="#fff" stroke="#000" stroke-width="1.2"/>' +
        t(56, 126, "Licensed professionals", 13, 'font-weight="700"') + t(56, 142, "Illinois 2025 ban · HIMPSI licences (UU 23/2022)", 11) +
        '<rect x="60" y="164" width="220" height="110" rx="10" fill="#e6e6e6" stroke="#000" stroke-width="1.2"/>' +
        t(76, 190, "Medical devices", 13, 'font-weight="700"') + t(76, 208, "FDA: 1,500+ narrow AI tools", 11) + t(76, 224, "Wysa: FDA Breakthrough;", 11) + t(76, 240, "NHS talking therapies", 11) +
        '<rect x="400" y="170" width="130" height="70" fill="#fff"/>' +
        t(410, 196, "most use", 15, 'font-style="italic" font-family="Georgia, serif"') + t(410, 216, "happens out here", 15, 'font-style="italic" font-family="Georgia, serif"'))
    },
    { id: "participants", title: "Participants and recruitment", fits: "§4.6, beside Table 4.4",
      caption: "Riliv’s co-founders refer psychologists and the HIMPSI representative, but each person is contacted independently; founders are not told who agreed.",
      svg: svg(560, 300,
        box(210, 14, 140, 44, "#000", [""]) + '<text x="280" y="41" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">Researcher</text>' +
        box(20, 110, 170, 60, "#fff", ["Riliv co-founders (2)", "CEO · COO · interview each"]) +
        box(200, 214, 180, 70, "url(#h2)", ["", "", ""]) + '<rect x="214" y="222" width="152" height="54" fill="#fff"/>' +
        t(290, 240, "Riliv psychologists", 13, 'text-anchor="middle" font-weight="700"') + t(290, 256, "FGD → interview each", 11, 'text-anchor="middle"') + t(290, 270, "role codes in outputs", 11, 'text-anchor="middle"') +
        box(380, 110, 160, 60, "#e6e6e6", ["HIMPSI", "National Policy Synergy"]) +
        arrow(240, 58, 130, 108) + t(110, 82, "direct invitation", 10.5) +
        arrow(320, 58, 440, 108) + arrow(285, 58, 290, 210) + t(360, 80, "independent contact", 10.5) +
        arrow(190, 140, 376, 140, true) + t(206, 132, "referral only (gatekeepers)", 10.5) +
        arrow(110, 172, 204, 236, true))
    },
    { id: "selves", title: "Two selves", fits: "§3.3 (end)",
      caption: "A heuristic contrast between the reflexive self of late modernity and the relational self of Javanese ethics; an ideal type, not a description of all Indonesians.",
      svg: svg(560, 250,
        box(16, 16, 255, 200, "#fff", [""]) + box(289, 16, 255, 200, "#eee", [""]) +
        t(143, 44, "Reflexive self", 14, 'text-anchor="middle" font-weight="700"') + t(416, 44, "Relational self", 14, 'text-anchor="middle" font-weight="700"') +
        t(143, 76, "“Who am I?”", 16, 'text-anchor="middle" font-style="italic" font-family="Georgia, serif"') +
        t(416, 76, "“Where do I stand,", 16, 'text-anchor="middle" font-style="italic" font-family="Georgia, serif"') + t(416, 96, "what do I owe?”", 16, 'text-anchor="middle" font-style="italic" font-family="Georgia, serif"') +
        ["Giddens · Illouz · Turkle", "wellbeing as a property", "of the person", "chatbot meets an individual need"].map(function (s, i) { return t(143, 128 + i * 18, s, 11.5, 'text-anchor="middle"'); }).join("") +
        ["Magnis-Suseno · H. Geertz · White", "wellbeing “inheres in the dance”", "chatbot avoids relational risk", "(sungkan, rukun)"].map(function (s, i) { return t(416, 128 + i * 18, s, 11.5, 'text-anchor="middle"'); }).join("") +
        t(280, 238, "a heuristic contrast, not a stereotype", 10.5, 'text-anchor="middle" fill="#444"'))
    },
    { id: "gantt", title: "Research timeline (Gantt)", fits: "§4.8, replacing Table 4.5",
      caption: "Research timeline, October 2024 to September 2029, with the upgrade and ethics in autumn 2026 and a writing-up year.",
      svg: (function () {
        var x0 = 250, x1 = 700, t0 = Date.UTC(2024, 9, 1), t1 = Date.UTC(2029, 9, 1);
        function X(y, m) { return x0 + (Date.UTC(y, m - 1, 1) - t0) / (t1 - t0) * (x1 - x0); }
        var rows = [["Literature, RQs, design", 2024, 10, 2026, 10, "#fff"], ["Upgrade + ethics application", 2026, 10, 2027, 1, "#000"], ["News collection continues", 2026, 10, 2027, 1, "url(#h1)"],
          ["Screening, initial coding", 2027, 1, 2027, 3, "url(#h1)"], ["FGD and interviews (RQ3)", 2027, 3, 2027, 6, "url(#h2)"], ["Full coding + thematic analysis", 2027, 6, 2027, 10, "#888"],
          ["News findings chapters", 2027, 10, 2028, 4, "#888"], ["Interview chapter + discussion", 2028, 4, 2028, 10, "#888"], ["Writing up · submission · viva", 2028, 10, 2029, 10, "#e6e6e6"]];
        var b = "";
        for (var y = 2025; y <= 2029; y++) { var xx = X(y, 1); b += '<line x1="' + xx + '" y1="10" x2="' + xx + '" y2="238" stroke="#bbb"/>' + t(xx, 254, String(y), 10.5, 'text-anchor="middle"'); }
        rows.forEach(function (r, i) {
          var yy = 14 + i * 25;
          b += t(x0 - 10, yy + 12, r[0], 11, 'text-anchor="end"') + '<rect x="' + X(r[1], r[2]) + '" y="' + yy + '" width="' + Math.max(4, X(r[3], r[4]) - X(r[1], r[2])) + '" height="16" fill="' + r[5] + '" stroke="#000"/>';
        });
        return svg(720, 262, b);
      })()
    }
  ];
  FIGS.forEach(function (f) { f.uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(f.svg); });
  window.FIGLIB = FIGS;
})();
