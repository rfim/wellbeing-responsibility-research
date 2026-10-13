// Title checks, score and alternative titles for the studios.
// Based on common academic title practice: say what, where and how; put searchable keywords early;
// keep the main title short and the subtitle informative; avoid filler phrases.
(function () {
  function words(s) { return (String(s).match(/[A-Za-zÀ-ɏ’'-]+/g) || []); }
  function cap(s) { s = String(s).trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; }
  var CORE = [
    ["wellbeing", /wellbeing|well-being/i], ["responsibility", /responsib/i], ["AI chatbots", /chatbot|\bAI\b|artificial intelligence|conversational/i],
    ["news", /\bnews\b|journalis|media discourse|discourse/i], ["Indonesia", /indonesia/i]
  ];
  var FILLER = /^(a|an)\s+(study|investigation|exploration|analysis|examination)\s+(of|into)\b|^towards?\b|^an?\s+(critical\s+)?(inquiry|enquiry)\b/i;
  var SMALL = /^(a|an|the|and|or|but|of|on|in|to|for|at|by|from|with|as|vs|via|into|after|over)$/i;

  function checks(t) {
    t = String(t || "").trim();
    var w = words(t), parts = t.split(":"), main = parts[0].trim(), sub = parts.slice(1).join(":").trim(), first65 = t.slice(0, 65);
    var coreIn = CORE.filter(function (c) { return c[1].test(t); }).length, earlyCore = CORE.filter(function (c) { return c[1].test(first65); }).length;
    var big = w.filter(function (x) { return x.length >= 4 && !SMALL.test(x); });
    var capped = big.filter(function (x) { return /^[A-Z]/.test(x); }).length;
    var consistentCase = big.length < 2 || capped === big.length || capped <= 2;
    return [
      { ok: w.length >= 8 && w.length <= 22, w: 12, label: w.length + " words (aim for 8–22)", tip: w.length < 8 ? "Too short to be findable. Add the object and the case." : "Long titles get cut in catalogues. Move detail into the abstract.", kind: "Length", impact: 6, ease: 7, vis: 8 },
      { ok: !!sub, w: 10, label: "Main title and subtitle", tip: "Use “Main title: subtitle”. The main title states the idea, the subtitle says what, where and how.", kind: "Structure", impact: 6, ease: 8, vis: 8 },
      { ok: words(main).length <= 10, w: 8, label: "Main title is 10 words or fewer", tip: "Shorten the part before the colon so it reads as a claim or concept.", kind: "Structure", impact: 5, ease: 7, vis: 7 },
      { ok: /\bnews\b|journalis|discourse/i.test(t), w: 12, label: "Names the object (news / discourse)", tip: "Say what you analyse: news discourse, journalism or coverage.", kind: "Keywords", impact: 8, ease: 8, vis: 9 },
      { ok: /chatbot|\bAI\b|conversational/i.test(t), w: 12, label: "Names the technology (AI chatbots)", tip: "Include “AI chatbots” so the thesis is found in searches on the topic.", kind: "Keywords", impact: 8, ease: 9, vis: 9 },
      { ok: /indonesia/i.test(t), w: 10, label: "Names the case (Indonesia)", tip: "Name the Indonesian case: it is your distinctive contribution.", kind: "Keywords", impact: 7, ease: 9, vis: 8 },
      { ok: /wellbeing|well-being/i.test(t), w: 10, label: "Names the core concept (wellbeing)", tip: "Keep “wellbeing” in the title: it is the object your argument redefines.", kind: "Concept", impact: 8, ease: 9, vis: 8 },
      { ok: /responsib/i.test(t), w: 6, label: "Signals the argument (responsibility)", tip: "“Responsibility” tells readers the thesis is about who is made responsible.", kind: "Concept", impact: 6, ease: 8, vis: 6 },
      { ok: earlyCore >= 2, w: 8, label: "Two key terms within the first 65 characters", tip: "Search results and library lists cut titles short. Move key terms forward.", kind: "Findability", impact: 5, ease: 6, vis: 6 },
      { ok: !/neuroliberal|biocommunicab|governmentality|interpellat/i.test(main), w: 4, label: "Main title free of specialist jargon", tip: "Terms like “neuroliberal” signal your theory but mean little to readers outside the field. Consider moving them into the subtitle or abstract.", kind: "Clarity", impact: 5, ease: 6, vis: 7 },
      { ok: !FILLER.test(t), w: 4, label: "No filler opening (“A study of…”)", tip: "Start with the idea itself, not with “A study of”.", kind: "Style", impact: 4, ease: 9, vis: 6 },
      { ok: consistentCase, w: 4, label: "Consistent capitalisation", tip: "Use title case (major words capitalised) or sentence case throughout, as your style guide requires.", kind: "Style", impact: 3, ease: 10, vis: 5 },
      { ok: !/well-being/i.test(t), w: 2, label: "Spells “wellbeing” as in the document", tip: "Use “wellbeing”, matching the rest of the thesis.", kind: "Style", impact: 2, ease: 10, vis: 4 }
    ].map(function (c) { c.coreIn = coreIn; return c; });
  }
  function score(t) { var cs = checks(t), tot = 0, got = 0; cs.forEach(function (c) { tot += c.w; if (c.ok) got += c.w; }); return Math.round(100 * got / tot); }
  function suggestions(t) {
    var cs = checks(t).filter(function (c) { return !c.ok; });
    if (!cs.length) return [{ icon: "✓", kind: "Looks good", text: "This title meets every check. Try the Alternatives tab to see other framings." }];
    return cs.map(function (c) { return { icon: "✎", kind: "Title · " + c.kind, text: c.label + ". " + c.tip, impact: c.impact, ease: c.ease, vis: c.vis, crit: "Writing & structure", prio: Math.round((c.impact * .5 + c.vis * .3 + c.ease * .2) * 10) / 10 }; });
  }
  function altScores(t) {
    var w = words(t).length, main = t.split(":")[0];
    var clarity = 100 - (/neuroliberal/i.test(t) ? 15 : 0) - (words(main).length > 10 ? 15 : 0) - (FILLER.test(t) ? 20 : 0) - (/\?.*\?/.test(t) ? 10 : 0);
    var keywords = Math.round(100 * CORE.filter(function (c) { return c[1].test(t); }).length / CORE.length);
    var concision = Math.max(0, Math.min(100, 100 - 6 * Math.abs(w - 15)));
    clarity = Math.max(0, Math.min(100, clarity));
    return { clarity: clarity, keywords: keywords, concision: concision, overall: Math.round(clarity * .35 + keywords * .4 + concision * .25) };
  }
  function rng(seed) { var s = (seed % 2147483646) || 3; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function alternatives(t, seed) {
    t = String(t || "").trim();
    var parts = t.split(":"), main = parts[0].trim(), sub = parts.slice(1).join(":").trim();
    var pool = [
      ["Subtitle first", sub ? cap(sub) + ": " + main : ""],
      ["Question-led", "Who Is Responsible for Wellbeing? News Discourse on AI Chatbots and the Indonesian Case"],
      ["Concept-led", "Delegated Wellbeing: News Discourse, AI Chatbots and Responsibility in Indonesia"],
      ["Keywords first", "AI Chatbots, Wellbeing and Responsibility: From Global News to Indonesian Practice"],
      ["Theory-forward", "Neuroliberal Wellbeing and the AI Companion: News Discourse, Responsibility and the Indonesian Case"],
      ["Relational", "Whose Wellbeing, Whose Responsibility? AI Chatbots in the News and in Indonesian Practice"],
      ["Sharper subtitle", main + ": How the News Defines Wellbeing around AI Chatbots, and the Indonesian Case"],
      ["Plain and findable", "Wellbeing, Responsibility and AI Chatbots: News Discourse and Mental Health Technology in Indonesia"],
      ["Main title only", words(main).length >= 4 ? main : ""],
      ["Care-focused", "Care Without Reciprocity: AI Chatbots, Wellbeing and Responsibility in the News and in Indonesia"]
    ].filter(function (x) { return x[1] && x[1].trim() && x[1].trim().toLowerCase() !== t.toLowerCase(); });
    var r = rng(seed || 7);
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    return pool.slice(0, 5).map(function (x) { return { name: x[0], text: x[1], scores: altScores(x[1]) }; }).sort(function (a, b) { return b.scores.overall - a.scores.overall; });
  }
  function prompt(t, abstract) {
    return "Suggest 6 alternative titles for my PhD thesis (Media, Communications and Cultural Studies, Goldsmiths, University of London). Use the form “Main title: subtitle”. The main title should be 10 words or fewer and state the idea; the subtitle should say what, where and how. Keep the key terms findable: wellbeing, responsibility, AI chatbots, news discourse, Indonesia.\n" +
      "For each option, rate clarity, keywords and concision from 1 to 10, then recommend one and say why.\n\nCurrent title: " + t + (abstract ? "\n\nAbstract:\n" + String(abstract).slice(0, 3000) : "");
  }
  window.TitleKit = { checks: checks, score: score, suggestions: suggestions, alternatives: alternatives, altScores: altScores, prompt: prompt };
})();
