// Checks engine for the revision studio: grammar & style rules, ethics-form consistency,
// coherence heuristics and the live upgrade rubric. Everything runs locally in the browser.
(function () {
  // ------------------------------------------------------------------ helpers
  var STOP = new Set("the a an and or but of to in on for with by from as at that this these those is are was were be been being it its their they them there which who whom whose what when where how why not no nor so than then also into over under about between across through more most such can could would should may might will shall do does did has have had i we you he she our my your his her us one two three first second third however yet each other only very much many both all any some own same within without upon while whether because although though since until after before during again further here once just even ever every few still well rather instead".split(" "));
  function words(s) { return (s.toLowerCase().match(/[a-zÀ-ɏ’']+/g) || []); }
  function stem(w) { return w.replace(/[’']s$/, "").replace(/(ies)$/, "y").replace(/(ing|ed|es|s)$/, ""); }
  function content(s) { var out = new Set(); words(s).forEach(function (w) { if (w.length >= 4 && !STOP.has(w)) out.add(stem(w)); }); return out; }
  function sentences(text) {
    var out = [], re = /[^.!?\n]+(?:[.!?]+["’”)]*|\n|$)/g, m;
    while ((m = re.exec(text))) {
      var s = m[0]; if (!s.trim()) { if (re.lastIndex === m.index) re.lastIndex++; continue; }
      // re-join on abbreviations (et al., p., pp., e.g., i.e.)
      if (out.length && /\b(al|p|pp|e\.g|i\.e|cf|vs|no|ch|vol|Dr|St)\.\s*$/.test(out[out.length - 1].text)) {
        out[out.length - 1].text += s; continue;
      }
      out.push({ text: s, index: m.index });
      if (re.lastIndex === m.index) re.lastIndex++;
    }
    out.forEach(function (o) { o.words = words(o.text).length; });
    return out;
  }
  function shingles(text, n) {
    var w = words(text), set = new Set();
    for (var i = 0; i + n <= w.length; i++) set.add(w.slice(i, i + n).join(" "));
    return set;
  }

  // ------------------------------------------------------------------ grammar & style rules
  var CONTR = { "it's": "it is", "don't": "do not", "doesn't": "does not", "can't": "cannot", "won't": "will not", "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not", "haven't": "have not", "hasn't": "has not", "didn't": "did not", "couldn't": "could not", "shouldn't": "should not", "wouldn't": "would not", "they're": "they are", "we're": "we are", "you're": "you are", "let's": "let us", "that's": "that is", "there's": "there is", "i'm": "I am", "i've": "I have", "i'll": "I will", "we'll": "we will", "they've": "they have", "we've": "we have" };
  var UK = { organize: "organise", organized: "organised", organizing: "organising", organization: "organisation", organizations: "organisations", recognize: "recognise", recognized: "recognised", realize: "realise", realized: "realised", emphasize: "emphasise", emphasized: "emphasised", prioritize: "prioritise", characterize: "characterise", characterized: "characterised", minimize: "minimise", normalize: "normalise", normalized: "normalised", normalization: "normalisation", conceptualize: "conceptualise", operationalize: "operationalise", analyze: "analyse", analyzed: "analysed", analyzing: "analysing", behavior: "behaviour", behaviors: "behaviours", behavioral: "behavioural", center: "centre", centers: "centres", color: "colour", favor: "favour", labor: "labour", modeling: "modelling", skeptical: "sceptical", defense: "defence", individualized: "individualised", stigmatized: "stigmatised", medicalized: "medicalised" };
  function caseLike(src, rep) { return src[0] === src[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep; }

  var RULES = [
    { id: "contraction", cat: "Register", sev: "warn", re: /\b(it|don|doesn|can|won|isn|aren|wasn|weren|haven|hasn|didn|couldn|shouldn|wouldn|they|we|you|let|that|there|I)['’](s|t|re|ve|ll|m)\b/gi,
      msg: "Contraction. Use the full form in academic writing.", fix: function (m) { var k = m.toLowerCase().replace("’", "'"); return CONTR[k] ? caseLike(m, CONTR[k]) : null; } },
    { id: "repeat", cat: "Grammar", sev: "error", re: /\b([A-Za-z]{2,})\s+\1\b/gi, msg: "Repeated word.", fix: function (m) { return m.split(/\s+/)[0]; } },
    { id: "dspace", cat: "Typography", sev: "warn", re: / {2,}/g, msg: "Double space.", fix: function () { return " "; } },
    { id: "spacepunct", cat: "Typography", sev: "warn", re: /[ \t]+([,;:!?](?!\S*\/\/))/g, msg: "Space before punctuation.", fix: function (m) { return m.trim(); } },
    { id: "nospace", cat: "Typography", sev: "warn", re: /([,;])(?=[A-Za-z])/g, msg: "Missing space after punctuation.", fix: function (m) { return m + " "; } },
    { id: "amp", cat: "Citations", sev: "warn", re: /\b([A-Z][A-Za-z’'-]+) & ([A-Z][A-Za-z’'-]+)/g, msg: "Use “and” between author names (Goldsmiths Harvard).", fix: function (m) { return m.replace(" & ", " and "); } },
    { id: "etal", cat: "Citations", sev: "warn", re: /\bet al\b(?!\.)/g, msg: "“et al.” needs a full stop.", fix: function () { return "et al."; } },
    { id: "wellbeing", cat: "Consistency", sev: "warn", re: /\b[Ww]ell-[Bb]eing\b/g, msg: "The document uses “wellbeing”; keep one spelling (except in quotations).", fix: function (m) { return m[0] === "W" ? "Wellbeing" : "wellbeing"; } },
    { id: "ukspell", cat: "Spelling (UK)", sev: "warn", re: new RegExp("\\b(" + Object.keys(UK).join("|") + ")\\b", "gi"),
      msg: "US spelling. Use UK English (ignore if inside a quotation or title).", fix: function (m) { var r = UK[m.toLowerCase()]; return r ? caseLike(m, r) : null; } },
    { id: "wordy", cat: "Concision", sev: "info", re: /\b(in order to|due to the fact that|a number of|at this point in time|it is important to note that|the fact that)\b/gi,
      msg: "Wordy phrase.", fix: function (m) { var k = m.toLowerCase(); return ({ "in order to": "to", "due to the fact that": "because", "a number of": "several", "at this point in time": "now", "it is important to note that": "", "the fact that": null })[k]; } },
    { id: "intens", cat: "Style", sev: "info", re: /\b(very|quite|really|basically|obviously|extremely|actually|a lot of|lots of|kind of|sort of)\b/gi, msg: "Intensifier or informal phrase. Cut it, or be more precise." },
    { id: "passive", cat: "Agency", sev: "info", re: /\b(is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(\w+ed|known|made|given|taken|seen|done|shown|built|found|held|left|brought|drawn|written|chosen|told|led|kept)\b/gi,
      msg: "Passive voice. Fine in methods, but your own study is about who acts, so check the agent is clear." },
    { id: "lower", cat: "Grammar", sev: "warn", re: /(?<!\b(?:al|p|pp|e\.g|i\.e|cf|vs|no|ch|vol|etc))([.!?])\s+([a-z])/g, msg: "Sentence starts with a lowercase letter.", fix: function (m) { return m.slice(0, -1) + m.slice(-1).toUpperCase(); } },
    // Ethics-form consistency (cross-document)
    { id: "eth-five", cat: "Ethics form", sev: "error", re: /\bup to (five|5)\b/gi, msg: "The ethics form says “minimum 5” psychologists. Use one phrasing in both documents.", fix: function () { return "a target of five (four to six)"; } },
    { id: "eth-himpsi", cat: "Ethics form", sev: "warn", re: /\bBidang Sinergitas\b/g, msg: "The ethics form says “Departemen Sinergitas Kebijakan Nasional”. Check HIMPSI’s official name.", fix: function () { return "Departemen Sinergitas"; } },
    { id: "eth-initials", cat: "Ethics form", sev: "error", re: /identified (only )?by (their )?initials/gi, msg: "The ethics form uses initials in transcripts only and role codes (e.g. “Riliv Psychologist 1”) in all outputs." },
    { id: "eth-room", cat: "Ethics form", sev: "warn", re: /arrange a private room in their city/gi, msg: "Beyond the ethics scope (no fieldwork or travel). Remove it or add it to the ethics form." },
    { id: "eth-fieldwork", cat: "Ethics form", sev: "info", re: /These interviews are not fieldwork/g, msg: "The ethics form lists Indonesia under “fieldwork outside the UK”. Use the same phrase in both, e.g. “remote data collection”." },
    { id: "eth-range", cat: "Ethics form", sev: "info", re: /\(2023 to 2026\)/g, msg: "The ethics form’s RQ1 says “2022 to 2026”. Align the two." },
  ];
  var PAST = { interview: "interviewed", analyse: "analysed", conduct: "conducted", recruit: "recruited", collect: "collected", code: "coded", trace: "traced", examine: "examined" };
  var SECTION_RULES = [
    { id: "tense-past", cat: "Tense", sev: "warn", sections: /^t[4-7]-/, re: /\bI will (interview|analyse|conduct|recruit|collect|code|trace|examine)\b/g, msg: "In the thesis this work is finished. Use the past tense.", fix: function (m) { return m.replace(/^I will (\w+)/, function (x, v) { return "I " + (PAST[v] || v); }); } },
    { id: "tense", cat: "Tense", sev: "warn", sections: /^(abstract|s1-8|s4-|e\d)/, re: /\bI (interview|analyse|conduct|recruit|collect|trace)\b/g, msg: "This is planned work. Use the future tense.", fix: function (m) { return m.replace(/^I /, "I will "); } },
  ];

  function grammar(text, sectionId) {
    var issues = [];
    RULES.concat(SECTION_RULES.filter(function (r) { return r.sections.test(sectionId || ""); })).forEach(function (r) {
      r.re.lastIndex = 0; var m, guard = 0;
      while ((m = r.re.exec(text)) && guard++ < 400) {
        if (m[0].length === 0) { r.re.lastIndex++; continue; }
        var fx = r.fix ? r.fix(m[0]) : null;
        issues.push({ rule: r.id, cat: r.cat, sev: r.sev, msg: r.msg, index: m.index, length: m[0].length, match: m[0], fix: (fx === undefined ? null : fx) });
      }
    });
    // long sentences
    sentences(text).forEach(function (s) {
      if (s.words > 45) issues.push({ rule: "long", cat: "Clarity", sev: "info", msg: "Long sentence (" + s.words + " words). Consider splitting it.", index: s.index + (s.text.length - s.text.trimStart().length), length: Math.min(s.text.trim().length, 60), match: s.text.trim().slice(0, 60) + "…", fix: null });
    });
    // unbalanced brackets / quotes per paragraph
    var off = 0;
    text.split("\n").forEach(function (p) {
      var o = (p.match(/\(/g) || []).length, c = (p.match(/\)/g) || []).length;
      if (o !== c) issues.push({ rule: "brackets", cat: "Punctuation", sev: "error", msg: "Unbalanced brackets in this paragraph (" + o + " open, " + c + " close).", index: off, length: Math.min(p.length, 40), match: p.slice(0, 40) + "…", fix: null });
      var lq = (p.match(/“/g) || []).length, rq = (p.match(/”/g) || []).length;
      if (lq !== rq) issues.push({ rule: "quotes", cat: "Punctuation", sev: "warn", msg: "Unbalanced double quotation marks in this paragraph.", index: off, length: Math.min(p.length, 40), match: p.slice(0, 40) + "…", fix: null });
      off += p.length + 1;
    });
    var order = { error: 0, warn: 1, info: 2 };
    issues.sort(function (a, b) { return order[a.sev] - order[b.sev] || a.index - b.index; });
    return issues;
  }

  // ------------------------------------------------------------------ coherence
  var CONNECT = /^(however|yet|but|this|these|such|therefore|thus|first|second|third|fourth|finally|in contrast|by contrast|moreover|furthermore|similarly|likewise|instead|meanwhile|as a result|in other words|for example|for instance|here|nor|while|although|at the same time|rather|so|then|that|those|its|their|again|both|neither|together|beyond|across|in this|in short|in sum|taken together|the same|another|other|a second|a third|by|from|with|unlike|like)\b/i;
  var THREADS = [
    ["wellbeing", /wellbeing|well-being/i], ["responsibility", /responsib/i], ["news discourse", /\bnews\b|journalis/i],
    ["neuroliberal", /neuroliberal/i], ["AI chatbots", /chatbot|conversational ai|companion/i], ["Indonesia", /indonesia|riliv|himpsi/i]
  ];

  function coherence(section, paragraphs, allTexts, sectionNums, figureCount, tableNums) {
    var out = [], score = 100;
    var paras = paragraphs.filter(function (p) { return p.text.trim().length > 0 && !p.isList && !/^Table \d/.test(p.text) && !/^Figure \d/.test(p.text); });
    for (var i = 0; i + 1 < paras.length; i++) {
      var a = content(paras[i].text), b = content(paras[i + 1].text), inter = 0;
      a.forEach(function (w) { if (b.has(w)) inter++; });
      var ov = inter / Math.max(1, Math.min(a.size, b.size));
      var starts = CONNECT.test(paras[i + 1].text.trim());
      if (ov < 0.08 && !starts) { out.push({ sev: "warn", type: "Flow", msg: "Weak link between ¶" + (i + 1) + " and ¶" + (i + 2) + ": little shared vocabulary and no transition. Add a bridging sentence.", para: i + 1 }); score -= 6; }
    }
    paras.forEach(function (p, i) {
      var w = words(p.text).length, ss = sentences(p.text);
      if (w > 220) { out.push({ sev: "warn", type: "Paragraph", msg: "¶" + (i + 1) + " is long (" + w + " words). Consider splitting at a change of topic.", para: i }); score -= 4; }
      if (ss.length === 1 && w < 30 && !/^RQ\d/.test(p.text.trim())) { out.push({ sev: "info", type: "Paragraph", msg: "¶" + (i + 1) + " is a single short sentence. Merge it or develop it.", para: i }); score -= 2; }
      if (ss.length && ss[0].words > 40) { out.push({ sev: "info", type: "Topic sentence", msg: "¶" + (i + 1) + " opens with a " + ss[0].words + "-word sentence. A shorter topic sentence reads more clearly.", para: i }); score -= 3; }
    });
    var full = paragraphs.map(function (p) { return p.text; }).join("\n");
    var m, re = /(?:Section|§)\s?(\d+\.\d+)/g;
    while ((m = re.exec(full))) if (sectionNums.indexOf(m[1]) < 0) { out.push({ sev: "error", type: "Cross-reference", msg: "Refers to §" + m[1] + ", which does not exist." }); score -= 8; }
    re = /Table (\d+\.\d+)/g;
    while ((m = re.exec(full))) if (tableNums.indexOf(m[1]) < 0) { out.push({ sev: "warn", type: "Cross-reference", msg: "Refers to Table " + m[1] + ", which is not in the document." }); score -= 5; }
    re = /Figure (\d+)/g;
    while ((m = re.exec(full))) if (+m[1] > figureCount) { out.push({ sev: "warn", type: "Cross-reference", msg: "Refers to Figure " + m[1] + ", but only " + figureCount + " figure(s) exist." }); score -= 5; }
    // repetition with other sections
    var mine = shingles(full, 6);
    Object.keys(allTexts).forEach(function (id) {
      if (id === section.id) return;
      var other = shingles(allTexts[id].text, 6), n = 0;
      mine.forEach(function (s) { if (other.has(s)) n++; });
      if (n >= 3) { out.push({ sev: n >= 8 ? "warn" : "info", type: "Repetition", msg: "Shares " + n + " six-word phrases with " + allTexts[id].label + ". Cross-reference instead of repeating.", target: id }); score -= Math.min(8, n); }
    });
    var threads = THREADS.map(function (t) { return { name: t[0], on: t[1].test(full) }; });
    if (section.id !== "title" && section.id !== "references" && section.id !== "appendices" && !threads.some(function (t) { return t.on; })) { out.push({ sev: "warn", type: "Thread", msg: "None of the thesis’s core concepts appear here. Link the section back to the argument." }); score -= 6; }
    return { findings: out, score: Math.max(0, Math.min(100, score)), threads: threads, paragraphs: paras.length };
  }

  // ------------------------------------------------------------------ rubric
  // Each check is phrased as an improvement; all fail on the original draft, so the live score starts at the baseline.
  var CONTR_RE = /\b(it|don|doesn|can|won|isn|aren|wasn|weren|haven|hasn|didn|couldn|shouldn|wouldn|they|we|you|let|that|there)['’](s|t|re|ve|ll|m)\b/i;
  var RUBRIC = [
    { k: "problem", name: "Research problem & significance", w: 8, base: 8.0, target: 8.5, note: "Timely and well motivated with current scale data. §1.3 is persuasive.",
      checks: [
        ["Indonesian scale figure in §1.2–1.3 (a % or number about Indonesia)", function (D) { return /Indonesia[^.]{0,160}\d+(\.\d+)?\s?(%|per cent|million|juta)|\d+(\.\d+)?\s?(%|per cent|million)[^.]{0,160}Indonesia/i.test(D.t("s1-2") + D.t("s1-3")); }, "s1-2"],
        ["§1.3 ends by tying the urgency to this study", function (D) { return /this (study|research|thesis)/i.test(D.t("s1-3")); }, "s1-3"] ] },
    { k: "rqs", name: "Research questions & alignment", w: 12, base: 6.0, target: 8.0, note: "RQ1 implies a baseline it lacks. RQ2 names the workplace with no data. The RQ3 link to the news is implicit.",
      checks: [
        ["RQ1’s “redefined” has a stated baseline (e.g. Sointu 2005 / pre-2023)", function (D) { return /baseline|Sointu|before 2023|pre-ChatGPT|prior to/i.test(D.t("s1-7")); }, "s1-7"],
        ["RQ2’s “workplace” removed, or justified with data in §4.5", function (D) { var r = D.rq(2); return !/workplace/i.test(r) || /workplace/i.test(D.t("s4-5")); }, "s1-7"],
        ["RQ3 says “in Indonesia”", function (D) { return /in Indonesia/i.test(D.rq(3)); }, "s1-7"],
        ["RQ3 links explicitly to the news definitions", function (D) { return /news|definitions? (circulat|travel)|these definitions/i.test(D.rq(3)); }, "s1-7"] ] },
    { k: "lit", name: "Literature review & gap", w: 10, base: 7.5, target: 8.0, note: "Wide and current, and the gap is clearly argued. Some repetition across Ch 1 and Ch 3.",
      checks: [
        ["Ch1–Ch3 repetition reduced (fewer than 12 shared six-word phrases; draft: 29)", function (D) { return D.overlap("1.", "3.") < 12; }, "s1-4"] ] },
    { k: "theory", name: "Theoretical framework", w: 12, base: 6.0, target: 7.5, note: "Rich but sprawling. Concepts are not carried through into codes. The loop claim is not testable with this data.",
      checks: [
        ["Ch4 turns theory into codes (a codebook or sensitising concepts)", function (D) { return /codebook|sensiti[sz]ing concept/i.test(D.ch("4.")); }, "s4-3"],
        ["§3.3 frames the loop as interpretive, not tested", function (D) { return /not (be )?test(ed|able)|interpretive|heuristic|sensiti[sz]ing/i.test(D.t("s3-3")); }, "s3-3"],
        ["A framework figure appears in Ch3", function (D) { return D.figuresIn("3.") > 0; }, "s3-5"] ] },
    { k: "method", name: "Methodology & analytic approach", w: 12, base: 6.0, target: 7.5, note: "Van Dijk's levels are well described, but it is unclear how they capture responsibility. No pilot analysis.",
      checks: [
        ["A worked example or pilot analysis is included", function (D) { return /worked example|pilot (analysis|coding|study)/i.test(D.all()); }, "s4-3"],
        ["§4.3 says how the levels capture responsibility", function (D) { return /responsibility/i.test(D.t("s4-3")); }, "s4-3"],
        ["§4.3 gives a decision rule for stage boundaries", function (D) { return /decision rule|stage (boundar|shift)[^.]*(when|if)/i.test(D.t("s4-3")); }, "s4-3"] ] },
    { k: "sampling", name: "Sampling & datasets", w: 10, base: 5.0, target: 7.0, note: "Single search string, a stretched Jargon corpus and an inconsistent participant design.",
      checks: [
        ["Psychologist numbers match the ethics form (no “up to five”)", function (D) { return !/up to (five|5)\b/i.test(D.all()); }, "s4-6"],
        ["Focus group described in §4.6", function (D) { return /focus group/i.test(D.t("s4-6")); }, "s4-6"],
        ["Guardian search interface named (Open Platform, API or site search)", function (D) { return /Open Platform|\bAPI\b|theguardian\.com|site search/i.test(D.t("s4-4")); }, "s4-4"],
        ["Additional search strings for Dataset 1 (e.g. “mental health”, “companion”)", function (D) { return /search strings|additional (terms|searches|search)|“mental health”|"mental health"/i.test(D.t("s4-4")); }, "s4-4"] ] },
    { k: "feas", name: "Feasibility & timeline", w: 8, base: 6.0, target: 7.0, note: "Realistic phases with a writing-up year. The Year 3 upgrade and two years of lit review need framing.",
      checks: [
        ["§4.8 explains why the upgrade falls in Year 3", function (D) { return /upgrade[^.]*(because|reason|due to|following|after|delay)|(because|reason|due to)[^.]*upgrade/i.test(D.t("s4-8")); }, "s4-8"],
        ["Timeline shown as a figure (Gantt)", function (D) { return D.figuresIn("4.8") > 0; }, "s4-8"] ] },
    { k: "pos", name: "Positionality & reflexivity", w: 5, base: 8.0, target: 8.5, note: "Specific and honest, and tied to access risks and memoing.",
      checks: [
        ["Reflexive memos are discussed in supervision (debrief)", function (D) { return /debrief|discuss[^.]*supervis|supervis[^.]*(memo|positionality)/i.test(D.t("s1-9")); }, "s1-9"] ] },
    { k: "ethics", name: "Ethics & data management", w: 6, base: 4.0, target: 7.5, note: "One paragraph. Missing distress protocol, cross-border data rules, consent language and retention.",
      checks: [
        ["Distress protocol (pause or stop, signposting)", function (D) { return /distress protocol|signs of distress|pause or (end|stop)|signpost/i.test(D.ch("4.")); }, "s4-6"],
        ["Cross-border data (Indonesia → UK; UK GDPR and PDP Law)", function (D) { return /cross-border|transfer[^.]*(UK|data)|UU 27\/2022|GDPR/i.test(D.ch("4.")); }, "s4-6"],
        ["Consent language (written consent, right to withdraw)", function (D) { return /consent form|written (informed )?consent|withdraw/i.test(D.ch("4.")); }, "s4-6"],
        ["Retention and deletion of recordings and transcripts", function (D) { return /retention period|retain(ed)? (for|until)|(destroy|delete)[^.]*(recording|transcript|audio|personal data)|(recording|transcript|audio)s?[^.]*(destroy|delet)/i.test(D.ch("4.")); }, "s4-6"],
        ["Ethics approval status named (EAF1 / REISC / submitted)", function (D) { return /EAF1|REISC|ethics (application|approval)[^.]*(submitted|approved|granted)/i.test(D.ch("4.")); }, "s4-6"] ] },
    { k: "contrib", name: "Contribution & originality", w: 7, base: 7.5, target: 8.0, note: "Indonesian relational angle and responsibility-in-grammar are strong. The fourth contribution is thin.",
      checks: [
        ["Fourth contribution developed (35+ words)", function (D) { var p = D.paras("s1-10").find(function (x) { return /^Fourth/i.test(x); }); return !!p && words(p).length >= 35; }, "s1-10"] ] },
    { k: "writing", name: "Writing & structure", w: 5, base: 7.0, target: 8.0, note: "Clear prose overall. Long Chapter 1, some digressions, register slips.",
      checks: [
        ["No contractions anywhere", function (D) { return !CONTR_RE.test(D.all()); }, "s2-1"],
        ["Chapter 1 under 3,900 words (draft: 4,321)", function (D) { return D.words("1.") < 3900; }, "s1-4"] ] },
    { k: "apparatus", name: "Scholarly apparatus", w: 5, base: 3.0, target: 8.0, note: "No reference list or appendices, and inconsistent citation years and styles.",
      checks: [
        ["Reference list with 40+ entries", function (D) { return D.paras("references").filter(function (p) { return /\(\d{4}[a-z]?\)|\d{4}[a-z]?\./.test(p); }).length >= 40; }, "references"],
        ["Appendices drafted (100+ words)", function (D) { return words(D.t("appendices")).length >= 100; }, "appendices"],
        ["No “&” between author names", function (D) { return !/\b[A-Z][a-z]+ & [A-Z][a-z]+/.test(D.all()); }, "s4-1"],
        ["Whitehead et al. definition cited to one year", function (D) { var a = D.all(); return !(/Whitehead et al\.?,? \(?2018/.test(a) && /Whitehead et al\.?,? \(?2019/.test(a)); }, "s3-4"],
        ["Appendices referenced by letter in the text (e.g. “Appendix A”)", function (D) { return /Appendix [A-Z]\b/.test(D.ch("1.") + D.ch("2.") + D.ch("3.") + D.ch("4.")); }, "s4-4"] ] },
  ];
  function verdict(score) {
    if (score >= 8.5) return "Ready to submit";
    if (score >= 7.5) return "Minor revisions";
    if (score >= 6.5) return "Moderate revisions";
    return "Major revisions";
  }
  // opts.critical (“super critical” mode): partial credit shrinks (passed share squared) and any open check costs 0.4
  function scoreRubric(D, overrides, rubric, verdictFn, opts) {
    var crit = !!(opts && opts.critical);
    overrides = overrides || {}; rubric = rubric || RUBRIC; var V = verdictFn || verdict;
    var tot = 0, base = 0, target = 0;
    var rows = rubric.map(function (c) {
      var res = c.checks.map(function (ch) { var ok = false; try { ok = !!ch[1](D); } catch (e) {} return { label: ch[0], ok: ok, section: ch[2] }; });
      var passed = res.filter(function (r) { return r.ok; }).length;
      var share = passed / c.checks.length;
      var auto = crit ? Math.max(c.base - 1, c.base + (c.target - c.base) * share * share - (passed < c.checks.length ? 0.4 : 0)) : c.base + (c.target - c.base) * share;
      var live = overrides[c.k] != null ? overrides[c.k] : auto;
      tot += live * c.w / 100; base += c.base * c.w / 100; target += c.target * c.w / 100;
      return { k: c.k, name: c.name, w: c.w, base: c.base, target: c.target, note: c.note, auto: auto, live: live, overridden: overrides[c.k] != null, checks: res, passed: passed };
    });
    return { rows: rows, overall: tot, base: base, target: target, verdict: V(tot), baseVerdict: V(base), targetVerdict: V(target) };
  }

  window.Checks = { grammar: grammar, coherence: coherence, scoreRubric: scoreRubric, RUBRIC: RUBRIC, sentences: sentences, words: words, shingles: shingles, verdict: verdict };
})();
