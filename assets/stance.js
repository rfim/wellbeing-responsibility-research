// Stance & codes: two live gauges for the studios.
// 1) Stance: where the text's framing vocabulary sits between left (critical/structural) and
//    right (market/individual) registers, and how balanced it is (counter-arguments, attribution).
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
    var lean = pos <= -60 ? "Strongly left (critical / structural)" : pos <= -20 ? "Left (critical / structural)" : pos < 20 ? "Centre (mixed vocabulary)" : pos < 60 ? "Right (market / individual)" : "Strongly right (market / individual)";
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
  // ------------------------------------------------------------ justice compass
  // Which theory of justice the text leans on, placed on the same left–right spectrum (−100 left … +100 right).
  var JUSTICE = [
    { id: "young", name: "Structural justice", who: "Iris Marion Young", pos: -70, re: /\b(structural|shared responsibilit\w*|social connection|collective responsibilit\w*|power relations?|institutions?|systemic|injustice)\b/gi,
      line: "Responsibility is a thread that runs through everyone who touches the harm." },
    { id: "care", name: "Ethics of care", who: "Joan Tronto · Virginia Held", pos: -40, re: /\b((?<!health |clinical |primary |medical |self-|social )care|caring|carers?|relational\w*|relationships?|interdependen\w*|kekeluargaan|rukun|kinship|attentive\w*)\b/gi,
      line: "Wellbeing is not kept inside a person; it lives in the space between people." },
    { id: "rawls", name: "Justice as fairness", who: "John Rawls", pos: -20, re: /\b(fair\w*|equal\w*|equit\w*|rights?|access|vulnerab\w*|least advantaged|protect\w*|safeguard\w*)\b/gi,
      line: "Judge the house by the room given to those who have least." },
    { id: "cap", name: "Capabilities", who: "Amartya Sen · Martha Nussbaum", pos: 0, re: /\b(capabilit\w*|agency|flourish\w*|human development|able to|freedom to|opportunit\w*)\b/gi,
      line: "Justice is measured in what people are truly able to do, and to be." },
    { id: "util", name: "Outcomes and welfare", who: "Bentham · Mill · evidence-based policy", pos: 20, re: /\b(outcomes?|effective\w*|efficacy|evidence-based|cost|benefits?|harms? reduction|measur\w*|scale)\b/gi,
      line: "The good is counted, and the greatest sum is chosen." },
    { id: "comm", name: "Communitarian virtue", who: "Alasdair MacIntyre · Amitai Etzioni", pos: 35, re: /\b(traditions?|virtues?|moral\w*|values|duty|duties|harmony|hormat|religio\w*|community norms?|obligations?)\b/gi,
      line: "Each self is born into a story it did not write, and owes it something." },
    { id: "lib", name: "Libertarian liberty", who: "Robert Nozick · Friedrich Hayek", pos: 75, re: /\b(individual freedom|personal responsibilit\w*|self-reliance|free market|consumer choice|choice|autonomy|self-help|market)\b/gi,
      line: "Each person is the author of their own life, and of its debts." }
  ];
  function justice(text) {
    var words = (text.match(/\S+/g) || []).length || 1, tot = 0;
    var rows = JUSTICE.map(function (j) { j.re.lastIndex = 0; var n = (text.match(j.re) || []).length; tot += n; return { id: j.id, name: j.name, who: j.who, pos: j.pos, line: j.line, n: n }; });
    rows.forEach(function (r) { r.share = tot ? Math.round(100 * r.n / tot) : 0; });
    var ranked = rows.slice().sort(function (a, b) { return b.n - a.n; });
    var pos = tot ? Math.round(rows.reduce(function (a, r) { return a + r.pos * r.n; }, 0) / tot) : 0;
    var top = ranked[0], second = ranked[1];
    var verse = !tot ? "Too few words yet to hear which justice speaks." :
      "You walk with " + top.who.split(" · ")[0] + (second && second.n ? ", and " + second.who.split(" · ")[0] + " keeps you company" : "") + ". " + top.line;
    return { rows: rows, ranked: ranked, top: top, second: second, pos: pos, verse: verse, per1k: Math.round(1000 * tot / words) };
  }
  // ------------------------------------------------------------ Harry Potter persona (playful; lines are our own words)
  // each tradition has a Harry Potter face and a Fantastic Beasts face; lines are our own words
  var HP = {
    young: { icon: "🧙", name: "Albus Dumbledore", fb: "Albus Dumbledore (young)", line: "You see the whole web: no harm belongs to one person alone, and you trace every thread back to the institutions that wove it." },
    care: { icon: "🍲", name: "Molly Weasley", fb: "Newt Scamander", line: "You write like a kitchen full of people: wellbeing is something a family makes together, around the table, not alone with a screen." },
    rawls: { icon: "📚", name: "Hermione Granger", fb: "Tina Goldstein", line: "You read everything, cite everyone, and won’t rest until those with least are protected. S.P.E.W. would be proud." },
    cap: { icon: "🌱", name: "Neville Longbottom", fb: "Jacob Kowalski", line: "You care about what people can grow into. Give them room and they find a courage nobody expected." },
    util: { icon: "🔌", name: "Arthur Weasley", fb: "Gellert Grindelwald (a warning)", line: "You can’t resist asking how the clever machine works, and what it is really doing to the people who use it.", warn: "Outcomes matter, but remember whose slogan “for the greater good” was. Keep the people in view." },
    comm: { icon: "🐈", name: "Minerva McGonagall", fb: "Theseus Scamander", line: "You hold the line on duty, tradition and doing things properly, firm, fair and quietly warm underneath." },
    lib: { icon: "🎆", name: "Fred & George Weasley", fb: "Queenie Goldstein", line: "You trust people to choose for themselves, and you see the bright, mischievous energy of freedom." }
  };
  // political counterparts by the policy themes of their public roles (Indonesian party shown as a fact, “non-partisan” where none): UK figures 2024–now,
  // US figures 2024–now plus the Hamilton musical cast, Indonesian figures 2016–now. Lines are our own words.
  var POL = {
    young: { usnow: ["Bernie Sanders", "Senator for Vermont", "Names inequality as a structure, and goes after the structure."], uk: ["Ed Miliband", "Energy and Net Zero Secretary", "Thinks in systems: change the structure and people’s lives change with it."],
             us: ["Alexander Hamilton", "", "Believes strong institutions, not good luck, keep people safe."],
             id: ["Sri Mulyani Indrawati", "Finance Minister, 2016–2025 · non-partisan", "Builds the institutions (budgets, taxes, rules) that everything else stands on."] },
    care: { usnow: ["Vivek Murthy", "US Surgeon General, 2021–2025", "Called loneliness a public health crisis and warned about social media and young people’s mental health."], uk: ["Wes Streeting", "Health and Social Care Secretary", "Puts health and care, and the people who provide it, at the centre."],
            us: ["Eliza Hamilton", "", "Turns grief into care: builds the orphanage and keeps the story alive."],
            id: ["Tri Rismaharini", "Mayor of Surabaya to 2020; Minister of Social Affairs, 2020–2024 · PDI-P", "Hands-on care for residents, street by street, the Surabaya way."] },
    rawls: { usnow: ["Elizabeth Warren", "Senator for Massachusetts", "Holds companies to account so ordinary people get a fair deal."], uk: ["Keir Starmer", "Prime Minister; former human rights barrister", "Starts from fairness and the rule of law."],
             us: ["John Laurens", "", "Will not call it freedom until it reaches everyone."],
             id: ["Mahfud MD", "Coordinating Minister for Political, Legal and Security Affairs, 2019–2024 · non-partisan", "A constitutional lawyer’s instinct: fairness written into law."] },
    cap: { usnow: ["Wes Moore", "Governor of Maryland", "Opportunity first: widen what people are able to do with their lives."], uk: ["Bridget Phillipson", "Education Secretary", "Opportunity first: widen what every child is able to become."],
           us: ["Angelica Schuyler", "", "Wants everyone able to do more, and to be counted when they do."],
           id: ["Anies Baswedan", "Governor of Jakarta, 2017–2022; earlier education minister · non-partisan", "Education as the way people grow into their own capabilities."] },
    util: { usnow: ["Michael Kratsios", "Director, White House Office of Science and Technology Policy", "Bets on technology and AI to deliver results at scale."], uk: ["Rachel Reeves", "Chancellor of the Exchequer", "Judges policy by its outcomes and the numbers behind them."],
            us: ["Aaron Burr", "", "Watches the outcomes and waits for the right moment (wait for it)."],
            id: ["Budi Gunadi Sadikin", "Minister of Health since 2020 · non-partisan", "Data and digital systems to transform health outcomes."] },
    comm: { usnow: ["JD Vance", "Vice President", "Family, faith and community as the ground of public life."], uk: ["Kemi Badenoch", "Leader of the Opposition", "Puts shared institutions, traditions and national identity first."],
            us: ["George Washington", "", "Puts duty and the common good above personal glory."],
            id: ["Hidayat Nur Wahid", "Deputy Speaker of the MPR · PKS", "Faith, family and community values in public life."] },
    lib: { usnow: ["Rand Paul", "Senator for Kentucky", "Small government and individual liberty, first and last."], uk: ["Ed Davey", "Leader of the Liberal Democrats", "Individual liberty first, with fairness alongside."],
           us: ["Thomas Jefferson", "", "Puts liberty and the individual first, always."],
           id: ["Sandiaga Uno", "Minister of Tourism and Creative Economy, 2020–2024 · PPP (Gerindra until 2023)", "Entrepreneurship and enterprise as the route to prosperity."] }
  };
  function persona(js, st) {
    var p = HP[js.top.id] || HP.care, second = js.second && js.second.n ? HP[js.second.id] : null;
    var twist = st && st.balance < 50 ? "Today’s charm to practise: invite the other side into the room before you argue against them." : st && st.balance >= 70 ? "Your balance is excellent: you let the other side speak before you answer." : "Keep attributing the strong claims; it makes your magic harder to counter.";
    var compass = js.rows.map(function (r) { var h = HP[r.id]; return { id: r.id, icon: h.icon, hp: h.name, fb: h.fb, tradition: r.name, share: r.share, pos: r.pos, top: r.id === js.top.id }; });
    var pol = POL[js.top.id] || POL.care;
    return { icon: p.icon, name: p.name, fb: p.fb, line: p.line, warn: p.warn || null, with: second && second.name !== p.name ? second.name : null, twist: twist, compass: compass,
      politics: [{ flag: "🇬🇧", label: "UK · 2024–now", who: pol.uk[0], role: pol.uk[1], line: pol.uk[2] }, { flag: "🇺🇸", label: "US · 2024–now", who: pol.usnow[0], role: pol.usnow[1], line: pol.usnow[2] }, { flag: "🇺🇸", label: "US · Hamilton", who: pol.us[0], role: pol.us[1], line: pol.us[2] }, { flag: "🇮🇩", label: "Indonesia · 2016–now", who: pol.id[0], role: pol.id[1], line: pol.id[2] }] };
  }
  window.StanceKit = { stance: stance, codes: codes, justice: justice, persona: persona };
})();
