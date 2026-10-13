// Rule-based paraphrase helper with three scores (meaning kept, readability, concision).
// Citations in brackets are protected and always kept verbatim.
(function () {
  function rng(seed) { var s = (seed % 2147483646) || 7; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function lowFirst(s) { return /^[A-Z][a-z]/.test(s) && !/^(I|AI|UK|US|EU|Indonesia\w*|Riliv|HIMPSI|OpenAI|Anthropic|Google|ChatGPT|Claude|Wysa|Woebot|Replika|Character|The Guardian|Guardian|Giddens|Jargon)\b/.test(s) ? s[0].toLowerCase() + s.slice(1) : s; }
  function words(s) { return (s.toLowerCase().match(/[a-zÀ-ɏ’']+/g) || []); }
  var STOP = new Set("the a an and or but of to in on for with by from as at that this these those is are was were be been being it its their they which who what when where how not no so than then also into about such can could would should may might will do does did has have had context important note number fact way able terms case regard means order clear evident several very quite really".split(" "));
  function stem(w) { return w.replace(/[’']s$/, "").replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, ""); }
  function content(s) { var o = new Set(); words(s).forEach(function (w) { if (w.length > 3 && !STOP.has(w)) o.add(stem(w)); }); return o; }
  function sentences(t) { t = String(t).replace(/\.(?=[A-Za-z0-9])/g, "\u0002"); var o = []; (t.match(/[^.!?]+(?:[.!?]+["’”)]*|$)/g) || []).forEach(function (s) { if (o.length && /\b(al|p|pp|e\.g|i\.e|cf|vs)\.\s*$/.test(o[o.length - 1])) o[o.length - 1] += s; else if (s.trim()) o.push(s); }); return o.map(function (s) { return s.trim().replace(/\u0002/g, "."); }); }
  function fre(t) { var ss = sentences(t), w = words(t), syl = w.reduce(function (a, x) { return a + Math.max(1, (x.replace(/e$/, "").match(/[aeiouy]+/g) || []).length); }, 0); return ss.length && w.length ? 206.835 - 1.015 * (w.length / ss.length) - 84.6 * (syl / w.length) : 0; }

  // protect citations and quotations
  function protect(s) { var keep = []; var t = s.replace(/\([^()]*\d{4}[^()]*\)|“[^”]*”|"[^"]*"/g, function (m) { keep.push(m); return "\u0001" + (keep.length - 1) + "\u0001"; }); return { t: t, keep: keep }; }
  function restore(t, keep) { return t.replace(/\u0001(\d+)\u0001/g, function (m, i) { return keep[+i]; }); }

  // swaps: [pattern, [options]]; applied per style
  var FORMAL = [
    [/\bshows that\b/g, ["demonstrates that", "indicates that", "suggests that"]], [/\bshows\b/g, ["demonstrates", "reveals", "indicates"]], [/\bshow\b/g, ["demonstrate", "reveal", "indicate"]],
    [/\bexamines\b/g, ["investigates", "analyses", "interrogates"]], [/\bexamine\b/g, ["investigate", "analyse", "interrogate"]], [/\blooks at\b/g, ["examines", "considers"]],
    [/\bimportant\b/g, ["significant", "central", "crucial"]], [/\bbig\b/g, ["substantial", "considerable"]], [/\bmany\b/g, ["numerous", "a range of"]],
    [/\bargues\b/g, ["contends", "maintains"]], [/\bhelps\b/g, ["enables", "allows"]], [/\bhighlights\b/g, ["underlines", "foregrounds"]],
    [/\bfocuses on\b/g, ["concentrates on", "centres on"]], [/\bunderstand\b/g, ["interpret", "make sense of"]], [/\babout\b/g, ["regarding", "concerning"]],
    [/\bdefines\b/g, ["frames", "casts"]], [/\bmoves\b/g, ["shifts", "redirects"]], [/\bcapacity\b/g, ["ability"]], [/\bbuilt around\b/g, ["grounded in", "based on"]],
    [/\bincreasingly\b/g, ["progressively", "more and more"]], [/\bexplains\b/g, ["accounts for", "clarifies"]], [/\bsupports\b/g, ["reinforces", "underpins"]], [/\bpoints to\b/g, ["indicates", "signals"]],
    [/\bkey\b/g, ["central", "principal"]], [/\bmainly\b/g, ["primarily", "largely"]], [/\bproblem\b/g, ["issue", "concern"]], [/\bchanges\b/g, ["shifts", "transformations"]],
    [/^But\b/g, ["Yet", "However,"]], [/^Also,?\s/g, ["In addition, ", "Moreover, "]], [/\bso that\b/g, ["in order that"]], [/\bget\b/g, ["obtain", "receive"]]
  ];
  var PLAIN = [
    [/\bdemonstrates\b/g, ["shows"]], [/\bdemonstrate\b/g, ["show"]], [/\butilise[sd]?\b/g, ["use"]], [/\bconsequently\b/g, ["so"]], [/\bnumerous\b/g, ["many"]],
    [/\bregarding\b/g, ["about"]], [/\bin relation to\b/g, ["about", "for"]], [/\bwith respect to\b/g, ["about"]], [/\bnevertheless\b/gi, ["still"]], [/\bfurthermore\b/gi, ["also"]],
    [/\bmoreover\b/gi, ["also"]], [/\bthereby\b/g, ["so"]], [/\bprior to\b/g, ["before"]], [/\bsubsequently\b/g, ["later"]], [/\bapproximately\b/g, ["about"]], [/\bcommence[sd]?\b/g, ["start"]],
    [/\binterrogates?\b/g, ["questions"]], [/\bconstitutes?\b/g, ["is", "forms"]], [/\bfacilitates?\b/g, ["helps"]]
  ];
  var CONCISE = [
    [/\bin order to\b/gi, ["to"]], [/\bdue to the fact that\b/gi, ["because"]], [/\bit is important to note that\s*/gi, [""]], [/\bthe fact that\b/gi, ["that"]], [/\bis able to\b/g, ["can"]], [/\bare able to\b/g, ["can"]],
    [/\ba number of\b/gi, ["several"]], [/\bat this point in time\b/gi, ["now"]], [/\bin this context,?\s*/gi, [""]], [/\b(very|quite|really|actually|basically|extremely)\s+/gi, [""]],
    [/\bin terms of\b/gi, ["in", "for"]], [/\bwhether or not\b/gi, ["whether"]], [/\bthere (is|are) (\w+) (who|that|which) /gi, null], [/\bit is (clear|evident) that\s*/gi, [""]], [/\bthe way in which\b/gi, ["how"]],
    [/\bas a means of\b/gi, ["to"]], [/\bin the case of\b/gi, ["for", "in"]], [/\bwith regard to\b/gi, ["on", "about"]]
  ];
  function swap(t, table, r) { table.forEach(function (p) { if (!p[1]) return; t = t.replace(p[0], function (m) { var o = p[1][Math.floor(r() * p[1].length)]; return /^[A-Z]/.test(m) && o ? cap(o) : o; }); }); return t.replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1"); }

  var LEAD = /^(In|Across|For|Since|From|Within|Through|Despite|Unlike|After|Before|During|Among|Beyond|At)\b([^,]{3,70}),\s+(.+)$/;
  var STRATEGIES = {
    concise: { name: "Concise", fn: function (t, r) { return swap(t, CONCISE, r); } },
    formal: { name: "Academic register", fn: function (t, r) { return swap(swap(t, CONCISE, r), FORMAL, r); } },
    plain: { name: "Plain English", fn: function (t, r) { return swap(swap(t, CONCISE, r), PLAIN, r); } },
    split: { name: "Split long sentence", fn: function (t) {
      if (/;\s/.test(t)) return t.replace(/;\s+(\w)/, function (m, c) { return ". " + c.toUpperCase(); });
      var m = t.match(/^(.{40,}?),\s+which\s+(.{20,})$/); if (m) return m[1] + ". This " + m[2];
      m = t.match(/^(.{50,}?),\s+(but|while|whereas|although)\s+(.{25,})$/); if (m) return m[1] + ". " + ({ but: "But", while: "Meanwhile,", whereas: "By contrast,", although: "Even so," })[m[2]] + " " + m[3];
      m = t.match(/^(.{60,}?),\s+and\s+(.{30,})$/); if (m && words(t).length > 30) return m[1] + ". " + cap(m[2]);
      return t; } },
    front: { name: "Main point first", fn: function (t) {
      var m = t.match(LEAD); if (!m) return t;
      var main = m[3].replace(/[.!?]+(["’”)]*)\s*$/, ""), end = (t.match(/([.!?]+["’”)]*)\s*$/) || ["."])[0];
      return cap(main) + " " + lowFirst(m[1]) + m[2] + end; } },
    active: { name: "Active voice (who acts?)", fn: function (t) {
      var m = t.match(/^(.+?)\s+(is|are|was|were)\s+([a-z]+?)(ed)\s+by\s+([^,.;\u0001]+?)(\s*[,.;].*)?$/);
      if (!m || /\u0001/.test(m[5]) || m[3].length < 4 || /,/.test(m[1]) || m[1].split(/\s+/).length > 7 || m[5].split(/\s+/).length > 8) return t;
      var obj = m[1].trim(), aux = m[2], root = m[3], agent = m[5].trim(), rest = m[6] || ".", verb;
      if (aux === "was" || aux === "were") verb = root + "ed";
      else {
        var base = /i$/.test(root) ? root.slice(0, -1) + "y" : (/[^aeiou][aeiouy][bcdfgklmnprstvz]$/.test(root) && !/[aeiou]{2}[a-z]$/.test(root) ? root + "e" : root);
        var plural = /s$/i.test(agent) && !/(news|analysis|process)$/i.test(agent);
        verb = plural ? base : (/y$/.test(base) && !/[aeiou]y$/.test(base) ? base.slice(0, -1) + "ies" : /(s|sh|ch|x)$/.test(base) ? base + "es" : base + "s");
      }
      return cap(agent) + " " + verb + " " + lowFirst(obj) + rest; } }
  };

  function score(orig, para) {
    var A = content(orig), B = content(para), inter = 0; A.forEach(function (w) { if (B.has(w)) inter++; });
    var meaning = Math.round(100 * inter / Math.max(1, A.size));
    var wo = words(orig).length, wv = words(para).length;
    var aslO = wo / Math.max(1, sentences(orig).length), aslV = wv / Math.max(1, sentences(para).length);
    var read = Math.max(0, Math.min(100, Math.round(55 + (fre(para) - fre(orig)) * 1.2 + (aslO - aslV) * 2)));
    var conc = Math.max(0, Math.min(100, Math.round(55 + (wo - wv) / Math.max(1, wo) * 300)));
    return { meaning: meaning, read: read, conc: conc, overall: Math.round(meaning * 0.45 + read * 0.3 + conc * 0.25) };
  }

  function variants(sentence, seed) {
    var P = protect(sentence.trim()), r = rng(seed || 7), out = [], seen = {};
    seen[sentence.trim()] = 1;
    var combos = [["concise"], ["formal"], ["plain"], ["split"], ["front"], ["active"], ["front", "concise"], ["split", "plain"], ["active", "concise"], ["formal", "split"]];
    combos.forEach(function (c) {
      var t = P.t, used = []; c.forEach(function (k) { var before = t; t = STRATEGIES[k].fn(t, r); if (t !== before) used.push(STRATEGIES[k].name); });
      if (!used.length) return;
      t = cap(restore(t, P.keep).replace(/\s{2,}/g, " ").trim()).replace(/\.\s+([a-z])/g, function (m0, c0) { return ". " + c0.toUpperCase(); });
      if (!t || seen[t]) return; seen[t] = 1;
      out.push({ name: used.join(" + "), text: t, scores: score(sentence, t) });
    });
    out.sort(function (a, b) { return b.scores.overall - a.scores.overall; });
    return out.slice(0, 5);
  }
  function prompt(sentence, context) {
    return "Paraphrase the sentence below for a UK media and communications PhD upgrade document (Goldsmiths). Keep every citation exactly as written and keep the meaning.\n" +
      "Give 4 options: concise, academic register, plain English, and main-point-first. Rate each from 1 to 10 for meaning kept, readability and concision, then recommend one.\n\n" +
      "Sentence:\n" + sentence + (context ? "\n\nParagraph for context:\n" + context : "");
  }
  window.Paraphrase = { variants: variants, sentences: sentences, score: score, prompt: prompt };
})();
