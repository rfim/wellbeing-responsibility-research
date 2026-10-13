// "Future you": momentum tracking, gentle celebrations and the link from each section
// to the papers and careers it is building. Everything stays in this browser.
(function () {
  var NAME = "Oktifani";
  var KEY = "wr-momentum";
  var PAPERS = {
    p1: { name: "Paper 1 · The pure relationship, minus reciprocity", venue: "New Media & Society · Media, Culture & Society", when: "can be drafted now" },
    p2: { name: "Paper 2 · Body politic, body personal, body delegated?", venue: "Journalism Studies · Digital Journalism", when: "2027–28" },
    p3: { name: "Paper 3 · Parenting the chatbot", venue: "Journalism · Feminist Media Studies", when: "2027–28" },
    p4: { name: "Paper 4 · Sungkan and the machine", venue: "Asian Journal of Communication · Big Data & Society", when: "2028" },
    p5: { name: "Paper 5 · Reading responsibility in the grammar of news", venue: "Discourse & Communication", when: "with the worked example" },
    brief: { name: "Policy brief in Bahasa Indonesia", venue: "for HIMPSI and platforms", when: "2028" },
    fellow: { name: "Fellowship proposals", venue: "Leverhulme ECF · MSCA · British Academy", when: "2028–29" }
  };
  var F = function (papers, roles, why) { return { papers: papers, roles: roles, why: why }; };
  var MAP = {
    "title": F(["p1", "p2", "p3", "p4"], ["uk-postdoc", "id-lecturer", "eu-postdoc"], "Every application, from a job to a fellowship, starts with how you name this project."),
    "abstract": F(["p1", "p2", "p3", "p4"], ["uk-postdoc", "id-lecturer", "eu-postdoc"], "This abstract becomes your research statement, your conference bios and your job-talk opening."),
    "s1-1": F(["p2"], ["uk-policy", "uk-regulator"], "Scene-setting like this is what policy teams use to explain why a problem matters."),
    "s1-2": F(["p2"], ["uk-regulator", "uk-policy"], "Your scale-and-harm framing is exactly how regulators justify their work."),
    "s1-3": F(["p2"], ["uk-policy", "us-nonprofit"], "“Why now” is the hook editors and funders look for first."),
    "s1-4": F(["p2", "p3"], ["uk-lecturer", "eu-asstprof"], "A sharp review is the first thing a hiring panel reads in a research statement."),
    "s1-5": F(["p2", "p3"], ["uk-lecturer", "eu-asstprof"], "A clear gap statement is the heart of every paper introduction you will write."),
    "s1-6": F(["p1", "p2"], ["uk-policy", "eu-ngo"], "Treating wellbeing as contested is a contribution in itself, and think tanks need that clarity."),
    "s1-7": F(["p2", "p3", "p4"], ["uk-postdoc", "us-postdoc"], "Clear questions become the backbone of every paper and every job talk."),
    "s1-8": F(["p2", "p3", "p4"], ["uk-postdoc", "uk-agency"], "A design you can explain in one breath is a skill every research employer values."),
    "s1-9": F(["p4"], ["id-lecturer", "id-intl"], "Insider access with reflexive distance is rare. This is a strength, not a disclaimer."),
    "s1-10": F(["fellow"], ["uk-fellowship", "eu-msca"], "This paragraph is a fellowship proposal in miniature."),
    "s2-1": F(["p1"], ["uk-tns", "us-tns", "eu-tns"], "The three-chatbot typology is how trust & safety teams think about product risk."),
    "s2-2": F(["p1"], ["uk-regulator", "uk-policy", "eu-institutions"], "Your regulatory-gap analysis speaks directly to Ofcom and the AI governance world."),
    "s2-3": F(["p4", "brief"], ["id-gov", "id-intl", "id-thinktank"], "Very few people can write this history of Indonesian care and AI governance."),
    "s3-1": F(["p1"], ["uk-lecturer", "eu-postdoc"], "Theory written this carefully becomes a single-authored article and a lecture series."),
    "s3-2": F(["p1"], ["uk-lecturer", "eu-postdoc"], "Two trajectories of wellbeing research make a ready-made seminar for students."),
    "s3-3": F(["p1"], ["uk-lecturer", "eu-asstprof"], "The loop is your signature idea. Polish it and people will cite it."),
    "s3-4": F(["p1"], ["uk-postdoc", "eu-postdoc"], "Neuroliberalism from the Global South is a fresh angle that panels remember."),
    "s3-5": F(["p2", "p5"], ["eu-asstprof", "uk-lecturer"], "News as problem-construction is a teachable module for any journalism department."),
    "s4-1": F(["p5"], ["uk-agency", "uk-postdoc"], "A triangulated design shows you can run a multi-strand project."),
    "s4-2": F(["p5"], ["uk-agency", "uk-ux"], "Justifying your method clearly is the core skill of research consultancy."),
    "s4-3": F(["p5"], ["uk-agency", "uk-ux"], "The four-level protocol could become a methods paper and a training workshop."),
    "s4-4": F(["p2"], ["uk-agency", "uk-postdoc"], "Reproducible corpus building is valued in every research team."),
    "s4-5": F(["p3"], ["uk-postdoc", "us-nonprofit", "uk-ngo"], "Families, AI and media is a live research agenda, and teams are hiring for it now."),
    "s4-6": F(["p4"], ["uk-ux", "id-ux", "eu-postdoc"], "Interviews and focus groups are the core skill of user research."),
    "s4-7": F(["p2", "p3", "p4"], ["uk-postdoc"], "Naming limits honestly is what makes reviewers trust the rest of your work."),
    "s4-8": F(["p2", "p3", "p4"], ["uk-postdoc"], "Planning a realistic timeline is project management, which every PI looks for."),
    "references": F(["fellow"], ["uk-lecturer"], "A clean scholarly apparatus signals the care that examiners and editors reward."),
    "appendices": F(["fellow"], ["uk-lecturer"], "Good appendices make your research reusable, and reusable research gets cited.")
  };
  var LINES = [
    "Every sentence you tighten today is one an examiner won’t have to question.",
    "You’re not only revising an upgrade. You’re drafting your first four papers.",
    "Slow sections are still progress. The upgrade is a step, not the summit.",
    "The Indonesian strand is the part nobody else can write.",
    "Clarity is kindness to your reader, and to you on viva day.",
    "One section at a time. That is how theses get finished.",
    "Your question, who is made responsible, is being asked in parliaments right now.",
    "When the words fight back, take a break. They’re gentler after tea.",
    "Good enough and submitted beats perfect and pending.",
    "You have taught since 2021. Explain it the way you’d explain it to your students."
  ];

  function museLine(spin) { return window.Muse ? window.Muse.line(spin) : LINES[(new Date().getDate() + (spin || 0)) % LINES.length]; }
  function muse() { return window.Muse ? window.Muse.current() : null; }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function load() { try { var v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && v.days) return v; } catch (e) {} return { days: {}, thresholds: {}, wordMarks: {} }; }
  function store(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} }
  function bag(text) { var b = {}; (text.toLowerCase().match(/[a-zÀ-ɏ’']+/g) || []).forEach(function (w) { b[w] = (b[w] || 0) + 1; }); return b; }
  function addedWords(oldT, newT) { var a = bag(oldT), b = bag(newT), n = 0; Object.keys(b).forEach(function (w) { n += Math.max(0, b[w] - (a[w] || 0)); }); return n; }
  function streak(m) {
    var n = 0, d = new Date();
    if (!(m.days[today()] && m.days[today()].words > 0)) d.setDate(d.getDate() - 1);
    for (;;) { var k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); if (m.days[k] && m.days[k].words > 0) { n++; d.setDate(d.getDate() - 1); } else break; }
    return n;
  }
  function greeting() { var h = new Date().getHours(); return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

  // ---------------------------------------------------------------- celebration UI
  var css = document.createElement("style");
  css.textContent = ".cheer{position:fixed;right:20px;bottom:20px;z-index:120;max-width:360px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-left:5px solid var(--accent);border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.18);padding:14px 16px 14px 16px;transform:translateY(20px);opacity:0;transition:all .35s ease;font-family:var(--sans)}" +
    ".cheer.show{transform:none;opacity:1}.cheer h5{margin:0 0 4px;font:500 1.15rem var(--serif)}.cheer p{margin:0;font-size:.88rem;color:var(--ink-2)}.cheer .x{position:absolute;top:6px;right:8px;border:0;background:none;color:var(--muted);cursor:pointer;font-size:1rem}" +
    ".cheer a{font-size:.82rem}@media(max-width:520px){.cheer{left:12px;right:12px;max-width:none}}";
  document.head.appendChild(css);
  var queue = [], showing = false;
  function cheer(title, body, opts) {
    queue.push({ title: title, body: body, opts: opts || {} });
    if (!showing) next();
  }
  function next() {
    var c = queue.shift(); if (!c) { showing = false; return; }
    showing = true;
    var el = document.createElement("div"); el.className = "cheer"; el.setAttribute("role", "status");
    el.innerHTML = '<button class="x" aria-label="Dismiss">×</button><h5></h5><p></p>';
    el.querySelector("h5").textContent = c.title; el.querySelector("p").textContent = c.body;
    if (c.opts.link) { var a = document.createElement("a"); a.href = c.opts.link.href; a.textContent = c.opts.link.text; a.target = "_blank"; a.rel = "noopener"; var p = document.createElement("p"); p.style.marginTop = "6px"; p.appendChild(a); el.appendChild(p); }
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    if (c.opts.confetti) confetti();
    var done = function () { el.classList.remove("show"); setTimeout(function () { el.remove(); next(); }, 350); };
    el.querySelector(".x").addEventListener("click", done);
    setTimeout(done, c.opts.ms || 6500);
  }
  function confetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var cv = document.createElement("canvas"), W = cv.width = innerWidth, H = cv.height = innerHeight;
    cv.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:119";
    document.body.appendChild(cv);
    var x = cv.getContext("2d"), cols = ["#b14d26", "#1e6b66", "#a57a1f", "#6a3d73", "#e07a4f", "#5fb5ad"], ps = [];
    for (var i = 0; i < 110; i++) ps.push({ x: W * (0.3 + Math.random() * 0.4), y: H * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, r: 3 + Math.random() * 4, c: cols[i % cols.length], a: Math.random() * 6 });
    var t0 = performance.now();
    (function frame(t) {
      var k = (t - t0) / 1600; x.clearRect(0, 0, W, H);
      ps.forEach(function (p) { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.2; x.save(); x.globalAlpha = Math.max(0, 1 - k); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); x.restore(); });
      if (k < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  // ---------------------------------------------------------------- events
  // ---------------------------------------------------------------- focus music (opens Amazon Music in a new tab)
  var MUSIC = [
    { k: "piano", label: "Deep focus: classical piano", q: "classical piano for studying", note: "no lyrics, calm" },
    { k: "lofi", label: "Lo-fi study beats", q: "lofi study beats", note: "steady rhythm" },
    { k: "austen", label: "Pride & Prejudice (2005) score", q: "Pride and Prejudice Dario Marianelli", note: "Austen, on piano" },
    { k: "swift", label: "Taylor Swift on piano (instrumental)", q: "Taylor Swift piano instrumental", note: "familiar, no lyrics" },
    { k: "potter", label: "Harry Potter film scores", q: "Harry Potter John Williams soundtrack", note: "orchestral" },
    { k: "gamelan", label: "Gamelan for calm", q: "gamelan relaxing", note: "a little bit of home" },
    { k: "library", label: "Library ambience & rain", q: "rain sounds library ambience", note: "quiet hours" },
    { k: "brown", label: "Brown noise", q: "brown noise", note: "blocks distractions" },
    { k: "pelangi", label: "Laskar Pelangi soundtrack", q: "Laskar Pelangi soundtrack", note: "for breaks (has vocals)" }
  ];
  var MUSE_MUSIC = { austen: "austen", swift: "swift", rowling: "potter", hirata: "gamelan", srimulyani: "piano", dian: "lofi", library: "library" };
  function musicPref() { try { return JSON.parse(localStorage.getItem("wr-music") || "null") || {}; } catch (e) { return {}; } }
  function musicSave(p) { try { localStorage.setItem("wr-music", JSON.stringify(p)); } catch (e) {} }
  function musicUrl() {
    var p = musicPref();
    if (p.k === "custom" && p.url && /^https:\/\/music\.amazon\.[a-z.]+\//.test(p.url)) return p.url;
    var mu = window.Muse ? window.Muse.current() : null;
    var k = p.k && p.k !== "custom" ? p.k : (mu && MUSE_MUSIC[mu.key]) || "piano";
    var m = MUSIC.find(function (x) { return x.k === k; }) || MUSIC[0];
    return "https://music.amazon." + (p.region || "co.uk") + "/search/" + encodeURIComponent(m.q);
  }
  var prevErrors = {};
  var api = {
    PAPERS: PAPERS, MAP: MAP, cheer: cheer, confetti: confetti, MUSIC: MUSIC,
    playMusic: function () { window.open(musicUrl(), "amazonmusic", "noopener"); },
    future: function (id) { return MAP[id] || (window.STUDIO_FUTURE && window.STUDIO_FUTURE(id)) || F(["p1", "p2"], ["uk-postdoc"], "Every section you add strengthens the whole argument."); },
    onSave: function (id, oldText, newText) {
      var m = load(), d = today(), first = !m.days[d];
      m.days[d] = m.days[d] || { words: 0, sections: [] };
      var add = addedWords(oldText, newText);
      if (!add) return;
      m.days[d].words += add;
      if (m.days[d].sections.indexOf(id) < 0) m.days[d].sections.push(id);
      m.wordMarks[d] = m.wordMarks[d] || [];
      var w = m.days[d].words;
      [[250, "250 words revised today", "That’s a conference abstract’s worth of careful writing."], [500, "500 words today", "A proper writing session. Stretch, drink some water, keep going."], [1000, "1,000 words revised today", "That’s a strong day’s work. Close the laptop proud."], [2000, "2,000 words today!", "That is a whole section’s worth. Remember to rest too."]].forEach(function (mk) {
        if (w >= mk[0] && m.wordMarks[d].indexOf(mk[0]) < 0) { m.wordMarks[d].push(mk[0]); cheer(mk[1] + " ✦", mk[2], { confetti: mk[0] >= 1000 }); }
      });
      store(m);
      if (first) { var s = streak(m); var mu = muse(); cheer(greeting() + ", " + NAME + " " + (mu ? mu.emoji : "✦"), (s > 1 ? "Day " + s + " of your writing streak. " : "") + museLine()); }
    },
    onRevised: function (section, done, total) {
      var f = api.future(section.id), p = PAPERS[f.papers[0]];
      var pct = Math.round(100 * done / total);
      var milestone = [25, 50, 75, 100].find(function (x) { return pct >= x && Math.round(100 * (done - 1) / total) < x; });
      var mu = muse();
      cheer((mu ? mu.revised + "  " : "") + (section.num ? "§" + section.num + " " : "") + "revised (" + done + " of " + total + ")",
        (milestone ? milestone + "% of the upgrade revised! " : "") + f.why + (p ? " It feeds " + p.name + "." : ""), { confetti: true, ms: 8000 });
    },
    onScore: function (score) {
      var m = load(); m.thresholds = m.thresholds || {};
      var marks = [[6.5, "Score 6.5: moderate revisions ✦", "You’ve moved out of “major revisions” territory. The panel will see the difference."], [7.0, "Score 7.0 ✦", "More than halfway from the draft to the target. Keep the momentum."], [7.5, "Score 7.5: minor revisions ✦", "This is an upgrade-ready shape. Supervisor reading next!"], [7.7, "Target reached 🎉", "You hit the 7.7 target. Celebrate properly, then send it to your supervisors."]];
      marks.forEach(function (mk) { if (score >= mk[0] - 1e-9 && !m.thresholds[mk[0]]) { m.thresholds[mk[0]] = Date.now(); store(m); cheer(mk[1], mk[2], { confetti: true, ms: 8000 }); } });
    },
    onIssues: function (id, num, errors, init) {
      if (!init && prevErrors[id] > 0 && errors === 0) { var mu = muse(); cheer("No errors left in " + (num ? "§" + num : "this section") + " ✓", (mu && mu.points === "house" ? "Ten points to your House! " : "") + "Clean. Every fix here is one less thing for an examiner to circle."); }
      prevErrors[id] = errors;
    },
    // ---------------------------------------------------------------- panel
    renderPanel: function (el, ctx) {
      var m = load(), d = m.days[today()] || { words: 0, sections: [] }, s = streak(m);
      var f = api.future(ctx.section.id);
      var C = window.CAREERS || { ROLES: [], COUNTRIES: [] }, J = window.JOBS || {};
      var esc = function (x) { return String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
      var flag = function (k) { var c = C.COUNTRIES.find(function (x) { return x.k === k; }); return c ? c.flag : ""; };
      var line = museLine(api._spin || 0), mu = muse(), M = window.Muse;
      // next best check to pass
      var best = null;
      (ctx.rubric ? ctx.rubric.rows : []).forEach(function (r) {
        if (r.overridden) return;
        var gain = (r.target - r.base) / r.checks.length * r.w / 100;
        r.checks.forEach(function (c) { if (!c.ok && (!best || gain > best.gain)) best = { gain: gain, label: c.label, section: c.section, crit: r.name }; });
      });
      var roles = f.roles.map(function (rid) { return C.ROLES.find(function (r) { return r.id === rid; }); }).filter(Boolean);
      el.innerHTML =
        // the studios replace the greeting card with her live Hogwarts persona (STUDIO_PERSONA); other pages keep the muse card
        (window.STUDIO_PERSONA ? '<div id="personaCard">' + window.STUDIO_PERSONA() + '</div>' : (
        '<div style="background:linear-gradient(135deg,color-mix(in srgb,var(--muse,var(--accent)) 26%,var(--surface)),var(--teal-soft));border-radius:12px;padding:16px;margin-bottom:10px;border-left:5px solid var(--muse,var(--accent))">' +
          '<div style="font:500 1.3rem var(--serif)">' + greeting() + ', ' + NAME + ' ' + (mu ? mu.emoji : '✦') + '</div>' +
          (mu ? '<div class="small" style="text-transform:uppercase;letter-spacing:.08em;font-weight:600;color:var(--muse,var(--accent));margin-top:2px">' + esc(mu.name) + ' · ' + esc(mu.tagline) + '</div>' : '') +
          '<p style="margin:8px 0 8px;font-size:.95rem;font-family:var(--serif)">' + esc(line) + '</p>' +
          '<button class="btn ghost" id="cheerSpin" type="button" style="font-size:.75rem;padding:4px 10px">Another one</button>' +
        '</div>' +
        (M ? '<div class="chips small" id="musePick" style="margin-bottom:14px" aria-label="Choose your muse"><button class="chip" data-m="mix" aria-pressed="' + (M.choice() === "mix") + '">✦ A different favourite each day</button>' +
          M.ORDER.map(function (k) { return '<button class="chip" data-m="' + k + '" aria-pressed="' + (M.choice() === k) + '">' + M.MUSES[k].emoji + ' ' + esc(M.MUSES[k].name) + '</button>'; }).join("") + '</div>' : '')
        )) +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px 12px;background:var(--surface-2);border-radius:10px"><span style="font:500 1.4rem var(--mono)" id="focusClock">' + fmt(api._left != null ? api._left : 1500) + '</span><span class="small muted" style="flex:1">' + (mu && mu.key === "library" ? "Quiet hours" : "Focus session") + ': 25 min writing, 5 min break</span><button class="btn ghost" id="focusBtn" type="button" style="font-size:.75rem;padding:4px 10px">' + (api._timer ? "Pause" : "Start") + '</button></div>' +
        (function () {
          var mp = musicPref(), sel = mp.k || ((mu && MUSE_MUSIC[mu.key]) || "piano");
          return '<div style="margin:-6px 0 14px;padding:10px 12px;background:var(--surface-2);border-radius:10px">' +
            '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span aria-hidden="true">🎧</span><select id="musicSel" aria-label="Focus music" style="flex:1;min-width:160px;padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:.82rem var(--sans)">' +
              MUSIC.map(function (m) { return '<option value="' + m.k + '"' + (sel === m.k ? " selected" : "") + '>' + esc(m.label) + ' · ' + esc(m.note) + '</option>'; }).join("") +
              '<option value="custom"' + (sel === "custom" ? " selected" : "") + '>My own Amazon Music playlist…</option></select>' +
              '<button class="btn" id="musicPlay" type="button" style="font-size:.75rem;padding:5px 12px">▶ Play on Amazon Music</button></div>' +
            '<div id="musicCustom" style="margin-top:8px"' + (sel === "custom" ? "" : " hidden") + '><input id="musicUrl" type="url" placeholder="Paste a music.amazon… playlist link" value="' + esc(mp.url || "") + '" style="width:100%;padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:.8rem var(--sans)"></div>' +
            '<div class="small muted" style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><label><input type="checkbox" id="musicAuto"' + (mp.auto ? " checked" : "") + '> Play when the focus session starts</label>' +
            '<label>Store <select id="musicRegion" style="padding:2px 4px;border-radius:6px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:.75rem"><option value="co.uk"' + ((mp.region || "co.uk") === "co.uk" ? " selected" : "") + '>UK</option><option value="com"' + (mp.region === "com" ? " selected" : "") + '>US</option></select></label><span>Shortcut: <kbd>Alt</kbd>+<kbd>M</kbd></span></div>' +
          '</div>';
        })() +
        '<h4>Momentum</h4>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">' +
          stat(d.words.toLocaleString(), "words revised today") + stat(s + (s === 1 ? " day" : " days"), "writing streak") +
          stat(ctx.revised + "/" + ctx.total, "sections revised") + stat((ctx.rubric ? (ctx.rubric.overall - ctx.rubric.base >= 0 ? "+" : "") + (ctx.rubric.overall - ctx.rubric.base).toFixed(2) : "–"), "score since draft") +
        '</div>' +
        (best ? '<h4>Next best step</h4><div class="issue sev-info" id="cheerNext" style="cursor:pointer"><div class="ih"><span>' + esc(best.crit) + '</span><span>+' + best.gain.toFixed(2) + ' score</span></div><div class="im">' + esc(best.label) + '</div><div class="ia"><button>Go to section →</button></div></div>' : '<p class="small">Every automatic check passes. Ask your supervisors for a reading! 🎉</p>') +
        '<h4 style="margin-top:14px">What this section is building</h4>' +
        '<p class="small" style="margin:0 0 8px;color:var(--ink-2)">' + esc(f.why) + '</p>' +
        f.papers.map(function (k) { var p = PAPERS[k]; return p ? '<div style="border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px"><div style="font-weight:600;font-size:.86rem">📄 ' + esc(p.name) + '</div><div class="small muted">' + esc(p.venue) + ' · ' + esc(p.when) + '</div></div>' : ""; }).join("") +
        roles.map(function (r) {
          var j = (J[r.id] && J[r.id].openings || [])[0];
          return '<div style="border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px"><div style="display:flex;justify-content:space-between;gap:8px"><span style="font-weight:600;font-size:.86rem">' + flag(r.c) + ' ' + esc(r.title) + '</span><span class="small" style="white-space:nowrap">' + r.p + '%</span></div>' +
            (j && /^https:\/\//.test(j.url) ? '<div class="small" style="margin-top:4px">Open now: <a href="' + esc(j.url) + '" target="_blank" rel="noopener">' + esc(j.title) + '</a> <span class="muted">· ' + esc(j.org) + (j.deadline && j.deadline !== "not stated" ? " · closes " + esc(j.deadline) : "") + '</span></div>' : "") + '</div>';
        }).join("") +
        '<p class="small" style="margin-top:10px"><a href="careers.html">All career paths →</a> · <a href="posters.html">Paper pipeline →</a></p>';
      function fmt(sec) { return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0"); }
      function stat(v, l) { return '<div style="background:var(--surface-2);border-radius:10px;padding:10px"><div style="font:500 1.3rem var(--serif)">' + v + '</div><div class="small muted">' + l + '</div></div>'; }
      el.querySelectorAll("#musePick .chip").forEach(function (b) { b.addEventListener("click", function () { M.set(b.dataset.m); M.applyAccent(); api._spin = 0; api.renderPanel(el, ctx); var m2 = M.current(); cheer(m2.emoji + " " + m2.name, m2.tagline + ". " + m2.lines[0]); }); });
      var ms = el.querySelector("#musicSel");
      if (ms) {
        var upd = function () { var p = musicPref(); p.k = ms.value; p.url = (el.querySelector("#musicUrl") || {}).value || p.url; p.auto = el.querySelector("#musicAuto").checked; p.region = el.querySelector("#musicRegion").value; musicSave(p); el.querySelector("#musicCustom").hidden = ms.value !== "custom"; };
        ms.addEventListener("change", upd); el.querySelector("#musicAuto").addEventListener("change", upd); el.querySelector("#musicRegion").addEventListener("change", upd);
        el.querySelector("#musicUrl").addEventListener("change", function () { var v = this.value.trim(); if (v && !/^https:\/\/music\.amazon\.[a-z.]+\//.test(v)) { cheer("That isn’t an Amazon Music link", "Copy the share link of a playlist from Amazon Music (it starts with https://music.amazon…)."); return; } upd(); });
        el.querySelector("#musicPlay").addEventListener("click", function () { upd(); api.playMusic(); });
      }
      var fb = el.querySelector("#focusBtn");
      if (fb) fb.addEventListener("click", function () {
        if (api._timer) { clearInterval(api._timer); api._timer = null; fb.textContent = "Start"; return; }
        if (api._left == null || api._left <= 0) api._left = 1500;
        fb.textContent = "Pause";
        if (musicPref().auto) api.playMusic();
        api._timer = setInterval(function () {
          api._left--; var c = document.getElementById("focusClock"); if (c) c.textContent = fmt(Math.max(0, api._left));
          if (api._left <= 0) { clearInterval(api._timer); api._timer = null; api._left = null; var m3 = muse(); cheer("Session done " + (m3 ? m3.emoji : "✦"), "25 focused minutes. Take five: stretch, water, look out of a window. " + museLine(3), { confetti: true }); var b2 = document.getElementById("focusBtn"); if (b2) b2.textContent = "Start"; }
        }, 1000);
      });
      var sp = el.querySelector("#cheerSpin"); if (sp) sp.addEventListener("click", function () { api._spin = (api._spin || 0) + 1; api.renderPanel(el, ctx); });
      var nx = el.querySelector("#cheerNext"); if (nx && ctx.go) nx.addEventListener("click", function () { ctx.go(best.section); });
    }
  };
  window.Cheer = api;
})();
