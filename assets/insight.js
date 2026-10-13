// Paragraph insight engine for the revision studio:
// smart suggestions (figures, tables, citations, agency, italics, examples, signposting)
// and an imagined "supervisor lens" for critical-thinking practice.
(function () {
  // ---------------------------------------------------------------- tagging
  var TAGS = {
    company: /\b(OpenAI|Anthropic|Google|Meta|Wysa|Woebot|Replika|Character\.AI|ChatGPT|compan(y|ies)|platforms?|industry|start-?ups?|Riliv|business|commercial|market)\b/i,
    news: /\b(news|journalis\w*|Guardian|Wall Street Journal|WSJ|Jargon|coverage|headlines?|reporting|press)\b/i,
    theory: /\b(neuroliberal\w*|Giddens|reflexive|Isin|Whitehead|Illouz|Turkle|Hacking|pure relationship|theor\w+|concepts?|framework)\b/i,
    therapy: /\b(therap\w*|CBT|mindfulness|clinical|psycholog\w*|mental health|counsel\w*|distress|suicid\w*|care)\b/i,
    indonesia: /\b(Indonesia\w*|Javanese|kekeluargaan|hormat|rukun|sungkan|Riliv|HIMPSI|pasung|Surabaya|Jakarta|BPJS)\b/i,
    family: /\b(parent\w*|child\w*|famil\w*|household|teen\w*|daughter|mother|young people)\b/i,
    regulation: /\b(regulat\w*|laws?|legislat\w*|bans?|governance|FDA|MHRA|Ofcom|AI Act|polic(y|ies)|licen[cs]\w*|containment)\b/i,
    method: /\b(corpus|sample|sampling|interviews?|focus group|coding|codes?|NVivo|dataset|analys[ie]s|thematic|search string|screening)\b/i,
    gap: /\b(gap|little is known|no study|has not|have not|remains? (unclear|open)|overlook\w*|neglect\w*|limits?)\b/i,
    positionality: /(^|\s)(I|my|me|myself)(\s|,|\.)/
  };
  function tagsOf(text) { return Object.keys(TAGS).filter(function (k) { return TAGS[k].test(text); }); }
  function numbersIn(text) { return (text.match(/\b\d[\d,.]*\s?(%|per cent|million|billion)?/g) || []).filter(function (n) { return !/^(19|20)\d{2}$/.test(n.trim()) && !/^\d\.\d+$/.test(n.trim()); }); }
  function sentencesOf(text) { return text.match(/[^.!?]+[.!?]+["’”)]*|[^.!?]+$/g) || [text]; }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  // ---------------------------------------------------------------- figure matching
  var FIGRULES = [
    { id: "typology", re: /purpose-built|general-purpose|companion platform|three (broad )?categories/i, why: "You compare three kinds of chatbot. A 2×2 typology makes the contrast instant." },
    { id: "framework", re: /neuroliberal[\s\S]*(reflexive|Giddens)|(reflexive|Giddens)[\s\S]*neuroliberal/i, why: "You bring several theories together. A framework diagram shows how they connect." },
    { id: "loop", re: /pure relationship|reciprocity|\bloop\b/i, why: "The loop is a circular argument. A cycle diagram makes it memorable." },
    { id: "design", re: /triangulat|three datasets|sequential (qualitative )?design/i, why: "A design diagram shows how the three strands feed each other." },
    { id: "vandijk", re: /van Dijk|thematic structure|schematic structure|superstructure|macroproposition/i, why: "A layered figure of the four levels can replace a dense list." },
    { id: "regulation", re: /(FDA|medical device|Illinois|AI Act)[\s\S]*(chatbot|therap)|(chatbot|therap)[\s\S]*(FDA|medical device|Illinois)/i, why: "Nested zones show what regulation reaches and what it leaves out." },
    { id: "participants", re: /co-?founders|gatekeep|purposive sampling|referral/i, why: "A recruitment map shows the consent safeguards at a glance." },
    { id: "selves", re: /rukun|hormat|Magnis-Suseno|Javanese (ethics|self)/i, why: "A side-by-side contrast of the two selves makes this abstract comparison concrete." },
    { id: "sointu", re: /Sointu|body politic|body personal/i, why: "A three-point arc places your study as the next step in Sointu’s history." },
    { id: "gantt", re: /writing-up year|Year [1-5]\b|Table 4\.5|timeline/i, why: "A Gantt chart shows overlaps and buffer time better than a table." }
  ];

  // ---------------------------------------------------------------- suggestions
  var TERMS = /\b(kekeluargaan|hormat|rukun|sungkan|pasung|wedi|isin|tugas belajar)\b/gi;
  function analyse(p, ctx) {
    var text = p.textContent.replace(/ /g, " ").trim(), words = (text.match(/\S+/g) || []).length;
    var tags = tagsOf(text), out = [];
    var sents = sentencesOf(text);
    // figure
    FIGRULES.some(function (r) {
      if (!r.re.test(text)) return false;
      if (ctx.usedFigs.indexOf(r.id) >= 0) { out.push({ icon: "🖼", kind: "Figure", text: "This idea already has a figure in the document. Refer to it here (“see Figure n”) instead of re-explaining." }); return true; }
      out.push({ icon: "🖼", kind: "Figure", text: r.why, action: { label: "Insert figure below", type: "figure", fig: r.id } });
      return true;
    });
    if (/emergence[\s\S]*normalisation[\s\S]*containment/i.test(text)) out.push({ icon: "🖼", kind: "Figure", text: "The three stages could be a horizontal stage timeline with key events. See “Figure options” F2 for a sketch." });
    // table
    var ordinals = (text.match(/\b(first|second|third|fourth)\b/gi) || []).length;
    if (ordinals >= 3 && words > 110) out.push({ icon: "▦", kind: "Table", text: "You walk through several parallel items (first, second, third…). A short comparison table could carry the structure and free the prose for argument." });
    var nums = numbersIn(text);
    if (nums.length >= 3) out.push({ icon: "▦", kind: "Numbers", text: "This paragraph carries " + nums.length + " figures (" + nums.slice(0, 3).join(", ") + "…). Check each has a source and date, or gather them in a small table." });
    // citation needed
    sents.forEach(function (s) {
      if (/\b(increasingly|widely|many (studies|scholars|researchers)|research (shows|suggests|has shown)|it is (well )?known|evidence (shows|suggests)|commonly|growing body)\b/i.test(s) && !/\(\D{0,60}\d{4}[a-z]?[^)]*\)|\d{4}[a-z]?\)/.test(s))
        out.push({ icon: "❝", kind: "Citation?", text: "General claim without a citation: “" + s.trim().slice(0, 90) + (s.length > 90 ? "…" : "") + "”", action: { label: "Show me", type: "select", snippet: s.trim() } });
    });
    // agency (her own topic)
    var agentless = sents.filter(function (s) { return /\b(is|are|was|were|been|being)\s+(\w+ly\s+)?(\w+ed|made|given|taken|held|left|placed|framed|shifted|seen)\b/i.test(s) && !/\bby\b/i.test(s); });
    if (agentless.length >= 2 && tags.some(function (t) { return ["family", "company", "regulation", "news", "therapy"].indexOf(t) >= 0; }))
      out.push({ icon: "👤", kind: "Agency", text: "Your thesis asks who acts. " + agentless.length + " sentences here hide the agent in the passive, e.g. “" + agentless[0].trim().slice(0, 80) + "…”. Name who does it.", action: { label: "Show me", type: "select", snippet: agentless[0].trim() } });
    // italics for non-English terms
    var plain = [];
    (function walk(n) {
      if (n.nodeType === 3) { var m; TERMS.lastIndex = 0; while ((m = TERMS.exec(n.nodeValue))) { var par = n.parentNode; if (!(par.closest && par.closest("em,i"))) plain.push(m[0]); } return; }
      if (n.nodeType === 1 && n.nodeName !== "EM" && n.nodeName !== "I") Array.prototype.forEach.call(n.childNodes, walk);
    })(p);
    if (plain.length) out.push({ icon: "𝑖", kind: "Style", text: "Italicise non-English terms on each use: " + Array.from(new Set(plain.map(function (x) { return x.toLowerCase(); }))).join(", ") + ".", action: { label: "Italicise them", type: "italic" } });
    // example
    if (words > 140 && tags.indexOf("theory") >= 0 && !/for example|for instance|e\.g\.|such as|consider|illustrat/i.test(text))
      out.push({ icon: "🔎", kind: "Example", text: "This is abstract for " + words + " words. Ground it with one concrete case, such as a Guardian headline or a Jargon column title from your corpus." });
    // signposting
    if (ctx.isFirst && !/this (section|chapter)|here I|I (first|begin)/i.test(text) && ctx.sectionId !== "abstract" && ctx.sectionId !== "title")
      out.push({ icon: "🧭", kind: "Signpost", text: "Open the section with a one-line roadmap, e.g. “This section examines… and argues that…”." });
    if (ctx.isLast && /^[st][23]-/.test(ctx.sectionId) && !/RQ\d|research question|this study|this thesis|\bI\b|next section|Section \d|Chapter \d/i.test(text))
      out.push({ icon: "🧭", kind: "Bridge", text: "Close by saying what this means for your study: which RQ does it serve, and what comes next?" });
    // length & hedging & over-claiming
    if (words > 220) out.push({ icon: "✂", kind: "Length", text: words + " words. Look for the sentence where the topic turns and split there." });
    var hedges = (text.match(/\b(may|might|could|perhaps|possibly|arguably|seems?|appears?)\b/gi) || []).length;
    if (hedges >= 5) out.push({ icon: "⚖", kind: "Voice", text: hedges + " hedges in one paragraph. Commit to the claims you can defend; hedge only the speculative ones." });
    var strong = text.match(/\b(proves?|always|never|undeniabl\w*|all users|everyone|no one)\b/i);
    if (strong) out.push({ icon: "⚖", kind: "Claim strength", text: "“" + strong[0] + "” is a strong word. Can your evidence carry it?", action: { label: "Show me", type: "select", snippet: strong[0] } });
    // repetition
    var counts = {}; (text.toLowerCase().match(/[a-z’']{5,}/g) || []).forEach(function (w) { if (["wellbeing", "chatbot", "chatbots", "which", "their", "these", "there", "where", "about", "would", "other"].indexOf(w) < 0) counts[w] = (counts[w] || 0) + 1; });
    var rep = Object.keys(counts).filter(function (w) { return counts[w] >= 5; });
    if (rep.length) out.push({ icon: "↻", kind: "Rhythm", text: "“" + rep[0] + "” appears " + counts[rep[0]] + " times here. Fine for a key term, but vary or tighten if it drags." });
    if (!out.length) out.push({ icon: "✓", kind: "Looks good", text: "No structural suggestions for this paragraph. Try the Supervisors tab to stress-test the argument." });
    // three scores per suggestion: impact on the rubric, ease of fixing, visibility to an examiner (all /10)
    var SC = {
      "Citation?": [8, 7, 9, "Scholarly apparatus"], "Agency": [7, 6, 6, "Methodology & analytic approach"], "Figure": [6, 8, 8, "Theoretical framework"],
      "Table": [5, 6, 7, "Writing & structure"], "Numbers": [6, 7, 7, "Research problem & significance"], "Example": [6, 5, 6, "Theoretical framework"],
      "Signpost": [5, 9, 7, "Writing & structure"], "Bridge": [6, 8, 7, "Literature review & gap"], "Length": [4, 7, 5, "Writing & structure"],
      "Voice": [4, 6, 5, "Writing & structure"], "Claim strength": [7, 8, 8, "Contribution & originality"], "Style": [3, 10, 6, "Writing & structure"],
      "Rhythm": [2, 7, 3, "Writing & structure"]
    };
    out.forEach(function (o) { var v = SC[o.kind]; if (!v) return; o.impact = v[0]; o.ease = v[1]; o.vis = v[2]; o.crit = v[3]; o.prio = Math.round((v[0] * 0.5 + v[2] * 0.3 + v[1] * 0.2) * 10) / 10; });
    return { tags: tags, words: words, suggestions: out, hash: hash(text.slice(0, 120)), text: text };
  }

  // ---------------------------------------------------------------- supervisor lens (imagined)
  var PERSONAS = {
    chia: {
      name: "Dr Aleena Chia", short: "Aleena", color: "#b14d26", role: "First supervisor", aff: "Goldsmiths, University of London", flag: "🇬🇧",
      lens: "platforms, media industries, labour & political economy",
      reactions: ["I like where this is going. Now follow the money.", "Let’s slow down here.", "Strong move. Push it one step further.", "What is the industry doing in this paragraph?", "Good, but I want the mechanism, not just the mood."],
      q: {
        company: ["What is the business model that makes this definition of wellbeing profitable?", "Is the company presenting itself as the solution to a problem its product helps create?", "Whose press release might sit behind this framing, and how would you trace it?"],
        news: ["Is the journalist doing the platform’s framing work for it? How would you show that in the text?", "Which sources get the first and last word in these articles, and what does that ordering do?"],
        theory: ["What does neuroliberalism explain here that platform capitalism or political economy can’t?", "Can you show this concept working in one article, rather than asserting it?"],
        therapy: ["Whose labour makes the chatbot feel caring: designers, moderators, or users doing emotional work on themselves?"],
        family: ["What kind of work is being asked of parents here, and is it gendered?", "Is parental supervision being turned into a product feature?"],
        method: ["How will you know a code is about responsibility rather than just about harm?", "What would make you change your coding scheme halfway through?"],
        regulation: ["Who benefits if responsibility settles on users and parents before regulators act?"],
        indonesia: ["How do Indonesian platforms like Riliv make money, and does that shape what “wellbeing” means there?"],
        any: ["So what? What does this paragraph let you argue that you couldn’t before?", "What’s the strongest counter-argument, and where do you answer it?", "If you had to cut this paragraph to one sentence, which sentence survives?"]
      }
    },
    cabanes: {
      name: "Dr Jason Cabañes", short: "Jason", color: "#1e6b66", role: "Second supervisor", aff: "Goldsmiths, University of London", flag: "🇬🇧",
      lens: "Global South media, Southeast Asia, intercultural & reflexive research",
      reactions: ["Let me read this from Surabaya rather than London.", "I want to hear more of your own voice here.", "Careful: this risks treating the West as the default.", "Lovely. Now who is missing from this picture?", "This is where your insider view could really sing."],
      q: {
        indonesia: ["Are you careful not to essentialise “Javanese” or “Indonesian” values? Whose Indonesia is this?", "How do class, religion and region cut across kekeluargaan and rukun?", "What would your participants call this in their own words, in Bahasa Indonesia?"],
        news: ["These are Global North outlets. What travels to Indonesia, and through which channels: translation, social media, the platforms themselves?"],
        theory: ["Does this theory travel? What would change if you started from Southeast Asian scholarship instead of adding it at the end?", "Is Indonesia a case that tests the theory, or one that merely illustrates it?"],
        positionality: ["How does your earlier role at Riliv shape what people will tell you, and what you are able to hear?", "Where does your own experience as a mother and lecturer enter the analysis, and where should it stay out?"],
        method: ["How will translation decisions be recorded, and who checks them?", "How will sungkan show up in the interview itself, and how will you notice it?"],
        family: ["Is “the family” here a Western nuclear family, or the wider kin networks your participants live in?"],
        company: ["Do Indonesian start-ups reproduce Silicon Valley’s framing, or rework it?"],
        regulation: ["What does governance look like where the state came late and the family carries care?"],
        any: ["Who is missing from this paragraph?", "What would a reader in Jakarta push back on?", "Where is your own voice in this paragraph, and should there be more of it?"]
      }
    },
    fullam: {
      name: "Dr Eoin Fullam", short: "Eoin", color: "#6a3d73", role: "Author of Chatbot Therapy (Routledge, 2025)", aff: "Birkbeck, University of London", flag: "🇬🇧",
      lens: "critical psychology of chatbot therapy",
      reactions: ["From a critical psychology angle, I’d stop here.", "Is this therapy, or the appearance of therapy?", "Good. Now be precise about the clinical claim.", "I’m interested in what’s being individualised here.", "Who decided this counts as help?"],
      q: {
        therapy: ["Which psychological model is quietly assumed here, CBT perhaps? What does that model treat as the problem?", "Is “wellbeing” making a clinical gap sound like a lifestyle choice?", "What counts as evidence of benefit, and who produced it?"],
        company: ["Is “support” a carefully chosen word that avoids regulatory definitions of treatment?", "What happens to a user in crisis at 3am on this platform? Is that in your data?"],
        regulation: ["By regulating therapists rather than tools, what intensive use is left untouched?"],
        family: ["Is supervision being sold to parents as care?"],
        theory: ["How does the “private freedom” users describe square with your individualisation critique?", "Does the loop describe users’ experience, or your interpretation of it? How would you tell the difference?"],
        news: ["When journalists quote clinicians, which clinicians, and from which school of therapy?"],
        indonesia: ["Where professional care is scarce, could the chatbot be better than nothing? How does your argument hold up against that?"],
        method: ["Will your psychologists talk about practice, or about the company line? How will you distinguish them?"],
        any: ["Are you criticising the tools, the discourse about them, or both? Is that clear here?", "What would a practising clinician say is missing from this paragraph?"]
      }
    }
  };
  var ORDER = { chia: ["company", "news", "theory", "method", "family", "therapy", "regulation", "indonesia"], cabanes: ["indonesia", "positionality", "theory", "news", "method", "family", "company", "regulation"], fullam: ["therapy", "company", "theory", "regulation", "family", "news", "indonesia", "method"] };
  var TITLEQ = {
    chia: ["Does the title tell a reader what is at stake: who profits from, or governs, this wellbeing?", "Would “neuroliberal” mean anything to a hiring panel outside your field? What does it signal, and to whom?", "Is the title about the technology, the news, or the responsibility? Which one is your argument really about?"],
    cabanes: ["Does the title centre Indonesia, or present it as an add-on case? What would change if Indonesia came first?", "Would a reader in Jakarta recognise their concerns in this title?", "Whose voice does the title promise: journalists, users, or the people who build the care?"],
    fullam: ["Is “wellbeing” the right word, or does it soften something that is really about mental health care?", "Does the title promise an evaluation of chatbots that the thesis does not do?", "Would a clinician reading this title know what kind of claim you are making?"],
    any: ["If someone read only the title, what would they think your main finding is?", "Which word in the title could you lose without losing meaning?"]
  };
  function custom(pk) { try { return (JSON.parse(localStorage.getItem("wr-persona-custom") || "{}") || {})[pk] || {}; } catch (e) { return {}; } }
  function setCustom(pk, data) { try { var all = JSON.parse(localStorage.getItem("wr-persona-custom") || "{}") || {}; all[pk] = data; localStorage.setItem("wr-persona-custom", JSON.stringify(all)); } catch (e) {} }
  // “super critical” mode: examiner-style pressure questions and blunter reactions
  var CRIT_Q = ["If an examiner called this descriptive rather than analytical, how would you answer?", "What is the weakest claim here, and what evidence would make it defensible?", "Which sentence would a hostile reviewer quote back at you, and why?", "What does this add that the existing literature does not already say?", "Where exactly is your argument here, in one sentence, without hedging?", "What would make you wrong? Name the evidence that would change your mind."];
  var CRIT_R = ["Not convinced yet.", "This won’t survive the panel as written.", "I’d push back hard here.", "Slow down. The claim is bigger than the evidence.", "Too safe. Where is the argument?"];
  // softer mode: encouraging reactions and questions that build on what already works
  var GENTLE_Q = ["What is the strongest idea in this passage, and how could you make it even clearer?", "Which source here do you trust most, and what does it let you say with confidence?", "If you explained this to a friend over coffee, what would you say first?", "What is one small change that would make this read more like you?"];
  var GENTLE_R = ["This is coming along nicely.", "There’s a real argument here. Let’s make it shine.", "Good instinct. Build on it.", "I can see your voice in this. Keep going."];
  function ask(pk, analysis, spin) {
    var P = PERSONAS[pk], seed = analysis.hash + (spin || 0), C = custom(pk), crit = !!window.STUDIO_CRITICAL, gentle = !crit && !!window.STUDIO_GENTLE;
    var pool = (crit ? CRIT_Q.slice() : gentle ? GENTLE_Q.slice() : []).concat(C.questions || []);
    ORDER[pk].forEach(function (t) { if (analysis.tags.indexOf(t) >= 0 && P.q[t]) pool = pool.concat(P.q[t]); });
    pool = pool.concat(P.q.any);
    if (analysis.titleMode) pool = (C.questions || []).concat(TITLEQ[pk] || [], TITLEQ.any);
    if (analysis.sect) pool = pool.map(function (q) { return q.replace(/this paragraph/g, "this section"); });
    if (analysis.sent) pool = pool.filter(function (q) { return !/cut this paragraph|one sentence/.test(q); }).map(function (q) { return q.replace(/this paragraph/g, "this sentence"); });
    if (crit && analysis.titleMode) pool = CRIT_Q.slice(0, 2).concat(pool);
    var reacts = crit ? CRIT_R : gentle ? GENTLE_R.concat(C.reactions || []) : (C.reactions || []).concat(P.reactions);
    return { persona: P, reaction: reacts[seed % reacts.length], question: pool[seed % pool.length], poolSize: pool.length };
  }
  function prompt(pk, analysis, sectionLabel) {
    var P = PERSONAS[pk];
    return "Act as a thoughtful PhD supervisor whose expertise is " + P.lens + ". (This is role-play for practice; do not claim to be " + P.name + ".)\n" +
      "My PhD (Goldsmiths, Media & Communications) studies how news discourse defines wellbeing around AI chatbots, with an Indonesian case. Here is a paragraph from " + sectionLabel + " of my upgrade document.\n\n" +
      "1. React briefly, as a supervisor would in a meeting.\n2. Ask me three probing questions, one at a time, and wait for my answer before the next.\n3. After my answers, suggest one concrete revision.\n\nParagraph:\n" + analysis.text;
  }
  window.Insight = { analyse: analyse, ask: ask, prompt: prompt, PERSONAS: PERSONAS, tagsOf: tagsOf, custom: custom, setCustom: setCustom };
})();
