// Stance & codes: two live gauges for the studios.
// 1) Stance: where the text's framing vocabulary sits between a critical/structural ("left") and a
//    market/individual ("right") register, and how balanced it is (counter-arguments, attribution).
//    It reads vocabulary, not her politics; critical-theory theses naturally sit left of centre.
// 2) Codes: the research codes and laws that apply to this project, and whether the text shows it follows them.
(function () {
  var LEFT = /\b(neoliberal\w*|capitalis\w*|exploit\w*|commodif\w*|inequalit\w*|precari\w*|marginali[sz]\w*|oppress\w*|hegemon\w*|profit motive|corporate power|surveillance capitalism|extractiv\w*|structural (inequality|power|violence|causes?)|collective responsibility|public provision|solidarity|decolonial|power relations|dispossess\w*|privati[sz]ation of care|responsibili[sz]ation|individuali[sz]ation)\b/gi;
  var RIGHT = /\b(innovation|efficien\w*|entrepreneur\w*|free market|market solutions?|consumer choice|personal responsibility|self-reliance|self-help|deregulat\w*|competitive\w*|economic growth|individual freedom|regulatory burden|red tape|family values|moral decline|law and order|national security|productivity|scalab\w*|empower\w*)\b/gi;
  var COUNTER = /\b(however|on the other hand|by contrast|critics (argue|note|suggest)|proponents|supporters (argue|claim)|defenders|it could be argued|others (argue|contend|suggest)|a counter-?argument|in fairness|to be fair|this is not to say|admittedly|nevertheless)\b/gi;
  var ATTRIB = /\b(argues?|contends?|claims?|suggests?|according to|describes? as|calls? it)\b|\([A-Z][^()]{0,60}\d{4}/g;
  function count(re, t) { re.lastIndex = 0; return (t.match(re) || []).length; }
  function sentences(t) { return (t.match(/[^.!?\n]+[.!?]*/g) || []).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 30; }); }
  function stance(text) {
    var L = count(LEFT, text), R = count(RIGHT, text), words = (text.match(/\S+/g) || []).length || 1;
    var pos = Math.round(100 * (R - L) / (R + L + 4));              // −100 critical … +100 market; small counts stay near 0
    var counter = count(COUNTER, text), attrib = count(ATTRIB, text);
    var loaded = sentences(text).filter(function (s) { return count(LEFT, s) + count(RIGHT, s) > 0; });
    var unattributed = loaded.filter(function (s) { ATTRIB.lastIndex = 0; return !ATTRIB.test(s); });
    var per1k = 1000 / words;
    var balance = Math.max(0, Math.min(100, Math.round(
      45 + Math.min(25, counter * per1k * 6) + Math.min(20, attrib * per1k * 1.5) - Math.min(35, unattributed.length * per1k * 8) - Math.min(15, Math.abs(pos) / 6))));
    var lean = pos <= -60 ? "Strongly critical / structural" : pos <= -20 ? "Critical / structural" : pos < 20 ? "Centre: mixed vocabulary" : pos < 60 ? "Market / individual" : "Strongly market / individual";
    return { pos: pos, lean: lean, left: L, right: R, counter: counter, attrib: attrib, balance: balance, unattributed: unattributed.slice(0, 6),
      advice: balance >= 70 ? "Well balanced: positions are attributed and counter-arguments appear." : unattributed.length ? "Some loaded claims are asserted in your own voice. Attribute them, or add the strongest counter-argument." : "Add the opposing view at least once per section, in its strongest form." };
  }
  // codes and laws: [id, name, kind (law | code | policy), applies, why, cue regex, link]
  var CODES = [
    ["gold", "Goldsmiths Code of Practice on Research Ethics", "policy", "must", "Your institution’s code; REISC reviews against it.", /Goldsmiths (Code of Practice|ethic)|REISC|ethic(s|al) (approval|review)/i, "https://www.gold.ac.uk/research/ethics/"],
    ["ukrio", "UKRIO Code of Practice for Research", "code", "must", "Cited in your ethics form; integrity across the whole project.", /UKRIO|research integrity/i, "https://ukrio.org/ukrio-resources/code-of-practice-for-research/"],
    ["concordat", "Concordat to Support Research Integrity (UK)", "code", "must", "Applies to all UK university research: honesty, rigour, transparency, care, accountability.", /Concordat|integrity|transparen/i, "https://www.universitiesuk.ac.uk/topics/research-and-innovation/concordat-support-research-integrity"],
    ["esrc", "ESRC Framework for Research Ethics", "code", "should", "Standard for UK social science: consent, voluntariness, confidentiality, avoiding harm, independence.", /ESRC|informed consent|voluntar/i, "https://www.ukri.org/councils/esrc/guidance-for-applicants/research-ethics-guidance/"],
    ["gdpr", "UK GDPR and the Data Protection Act 2018", "law", "must", "You hold personal data (recordings, consent forms) at a UK university.", /GDPR|Data Protection Act|data protection|personal data/i, "https://www.legislation.gov.uk/ukpga/2018/12/contents"],
    ["pdp", "Indonesia’s Personal Data Protection Law (UU No. 27/2022)", "law", "must", "Your participants are in Indonesia; their data is collected there and transferred to the UK.", /UU PDP|27\/2022|UU No\.? ?27|Law No\.? ?27|Personal Data Protection Law|Pelindungan Data Pribadi/i, ""],
    ["child", "Indonesian Child Protection Law (UU No. 23/2002, amended by UU No. 35/2014)", "law", "know", "Relevant if a participant discloses risk to an identifiable child (your safeguarding plan).", /child protection|safeguard|perlindungan anak/i, ""],
    ["himpsi", "HIMPSI Code of Ethics (Kode Etik Psikologi Indonesia)", "code", "know", "Binds your psychologist participants, e.g. client confidentiality. You don’t follow it, but you must not ask them to breach it.", /HIMPSI.{0,60}(code|kode etik|ethic)|kode etik|client confidentiality|identify a client/i, "https://himpsi.or.id"],
    ["copyright", "Copyright, Designs and Patents Act 1988, s.30 (quotation for criticism or review)", "law", "must", "You quote news articles: short, acknowledged quotation for criticism and review is fair dealing; reproducing whole articles is not.", /fair dealing|criticism and review|will not reproduce|bibliographic|quote only/i, "https://www.legislation.gov.uk/ukpga/1988/48/section/30"],
    ["ai", "Your department’s guidance on generative AI in research", "policy", "should", "You use AI tools while writing; never put identifiable interview data into them.", /generative AI|AI tool|identifiable (interview )?data into/i, ""]
  ];
  // these are complied with in the ethics form, so that is where the text must show it; the rest apply across the project
  var IN_FORM = { gdpr: 1, pdp: 1, child: 1, himpsi: 1, ai: 1 };
  function codes(text, formText) {
    var rows = CODES.map(function (c) { var t = IN_FORM[c[0]] && formText != null ? formText : text; return { id: c[0], name: c[1], kind: c[2], level: c[3], why: c[4], ok: c[5].test(t), link: c[6], inForm: !!IN_FORM[c[0]] }; });
    var w = { must: 3, should: 2, know: 1 }, tot = 0, got = 0;
    rows.forEach(function (r) { tot += w[r.level]; if (r.ok) got += w[r.level]; });
    return { rows: rows, score: Math.round(100 * got / tot), missingMust: rows.filter(function (r) { return r.level === "must" && !r.ok; }) };
  }
  window.StanceKit = { stance: stance, codes: codes };
})();
