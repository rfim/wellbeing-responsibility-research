// Plan: suggested timeline (built on Table 4.5 of the upgrade), tasks, risks, scope guard and an idea parking lot.
// Everything she changes is saved in this browser (wr-plan-*).
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function ym(s) { var p = s.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, 1)); }
  function fmt(d) { return d.toLocaleDateString(undefined, { month: "short", year: "numeric" }); }
  var T0 = ym("2026-10"), T1 = ym("2029-10"), SPAN = T1 - T0;
  function x(d) { return Math.max(0, Math.min(100, 100 * (d - T0) / SPAN)); }

  // ---------------------------------------------------------------- suggested timeline
  // [lane, label, start, end (exclusive month), kind, why]
  var PLAN = [
    ["Milestones", "Upgrade submission & panel", "2026-10", "2026-12", "mile", "Table 4.5: Oct–Dec 2026."],
    ["Ethics", "Submit ethics form with the upgrade", "2026-10", "2026-12", "suggest", "Suggestion: don’t wait for the upgrade result. Reviews can take 6–10 weeks, longer during industrial action."],
    ["Ethics", "Approval and any amendments", "2026-12", "2027-02", "plan", "Buffer for questions from the reviewer."],
    ["News data", "Nexis retrieval & screening (Dataset 1)", "2026-10", "2027-01", "suggest", "Suggestion: the search window closed on 30 Sep 2026, so retrieval can start now rather than in January."],
    ["News data", "Jargon column collection (Dataset 2)", "2026-10", "2027-01", "plan", "Collection continues to 31 Dec 2026."],
    ["News data", "Initial coding in NVivo (RQ1, RQ2)", "2027-01", "2027-03", "plan", "Table 4.5: Jan–Feb 2027."],
    ["Interviews", "Pilot the interview guide (1 person outside the sample)", "2027-02", "2027-03", "suggest", "Suggestion: one pilot catches unclear or sungkan-sensitive questions before the real sessions."],
    ["Interviews", "Focus group + interviews (RQ3)", "2027-03", "2027-06", "plan", "Table 4.5: Mar–May 2027."],
    ["Interviews", "Transcription & translation", "2027-03", "2027-08", "suggest", "Suggestion: budget 6–8 hours per recorded hour. About 10 sessions ≈ 70 hours, so spread it over the season."],
    ["News data", "Full coding of both corpora", "2027-06", "2027-10", "plan", "Table 4.5: Jun–Sep 2027."],
    ["Interviews", "Reflexive thematic analysis", "2027-06", "2027-12", "plan", "Table 4.5: Jun 2027 onwards."],
    ["Writing", "Revise Ch 1–4 from the upgrade", "2027-01", "2027-10", "suggest", "Suggestion: write as you go. The upgrade already gives you most of Chapters 1–4."],
    ["Writing", "Ch 5 news findings (RQ1)", "2027-10", "2028-01", "plan", "Table 4.5: Oct 2027–Mar 2028."],
    ["Writing", "Ch 6 Family & Tech findings (RQ2)", "2028-01", "2028-04", "plan", ""],
    ["Writing", "Ch 7 Indonesian case (RQ3)", "2028-04", "2028-07", "plan", "Table 4.5: Apr–Sep 2028."],
    ["Writing", "Ch 8–9 discussion & conclusion", "2028-07", "2028-10", "plan", "End of LPDP tuition funding: Sep 2028."],
    ["Milestones", "Full draft to supervisors", "2028-09", "2028-10", "mile", "Suggestion: aim for a full draft by the end of funded year 4."],
    ["Writing", "Revisions (writing-up year)", "2028-10", "2029-04", "plan", "Table 4.5: Year 5."],
    ["Milestones", "Submission", "2029-04", "2029-06", "mile", "Leaves a summer for the viva."],
    ["Milestones", "Viva", "2029-06", "2029-09", "mile", ""],
    ["Papers", "Paper 1 (literature + framework)", "2027-03", "2027-07", "suggest", "Suggestion: turn Chapter 3 into a journal article while coding runs."],
    ["Papers", "Conference abstracts (MeCCSA, AoIR, ICA)", "2027-01", "2027-04", "suggest", "Short abstracts from the upgrade keep you visible on the job market."],
    ["Papers", "Paper 2 (RQ1 findings)", "2028-02", "2028-06", "suggest", ""],
    ["Buffer", "Slack for strikes, illness, family", "2028-10", "2029-01", "buffer", "Suggestion: protect about two months a year. Everyone needs it."]
  ];
  var LANES = ["Milestones", "Ethics", "News data", "Interviews", "Writing", "Papers", "Buffer"];

  function scopeMonths() {
    if (!window.ScopeGuard || !window.DocStore) return { months: 0, rows: [] };
    var docs = [["Upgrade", window.DocStore, "wr-scope-baseline", window.UPGRADE_DOC, "editor.html"]];
    if (window.THESIS_DOC) docs.push(["Thesis", window.DocStore.create("wr-thesis-v1", window.THESIS_DOC), "wr-scope-baseline-thesis", window.THESIS_DOC, "thesis.html"]);
    if (window.ETHICS_DOC) docs.push(["Ethics form", window.DocStore.create("wr-ethics-v1", window.ETHICS_DOC), "wr-scope-baseline-ethics", window.ETHICS_DOC, "ethics.html"]);
    var rows = docs.map(function (d) {
      var S = d[1], b = get(d[2], null), del = (S.state().deleted || {});
      var base = b && b.text ? b.text : (d[3].sections || []).map(function (s) { return S.textOf(s.html); }).join("\n");
      var cur = S.sections().filter(function (s) { return !del[s.id]; }).map(function (s) { return S.textOf(s.html); }).join("\n");
      return { name: d[0], href: d[4], r: window.ScopeGuard.analyse(base, cur), agreed: b ? b.t : null };
    });
    return { months: Math.max.apply(null, rows.map(function (r) { return r.r.months; }).concat([0])), rows: rows };
  }

  function renderGantt(extra) {
    var now = new Date(), html = '<div class="g-axis">';
    for (var y = 2026; y <= 2029; y++) [0, 3, 6, 9].forEach(function (m) { var d = new Date(Date.UTC(y, m, 1)); if (d < T0 || d >= T1) return; html += '<span style="left:' + x(d) + '%">' + (m === 0 ? "<b>" + y + "</b>" : d.toLocaleDateString(undefined, { month: "short" })) + "</span>"; });
    html += "</div>";
    LANES.forEach(function (lane) {
      html += '<div class="g-lane-h">' + lane + "</div>";
      PLAN.filter(function (p) { return p[0] === lane; }).forEach(function (p) {
        var a = ym(p[2]), b = ym(p[3]), left = x(a), w = Math.max(1.2, x(b) - left), tip = p[1] + " · " + fmt(a) + " – " + fmt(new Date(b - 864e5)) + (p[5] ? " · " + p[5] : "");
        html += '<div class="g-row" title="' + esc(tip) + '"><div class="g-label">' + esc(p[1]) + (p[4] === "suggest" ? ' <span class="g-sug">suggestion</span>' : "") + '<small>' + fmt(a) + " – " + fmt(new Date(b - 864e5)) + '</small></div><div class="g-track"><div class="g-bar k-' + p[4] + '" style="left:' + left + "%;width:" + w + '%"></div></div></div>';
      });
      if (lane === "Milestones" && extra > 0) { var sub = ym("2029-04"), moved = new Date(sub.getTime() + extra * 30.4 * 864e5); html += '<div class="g-row"><div class="g-label" style="color:var(--bad)">Unagreed scope changes<small>would push submission to about ' + fmt(moved) + '</small></div><div class="g-track"><div class="g-bar k-scope" style="left:' + x(sub) + "%;width:" + Math.max(1.5, x(moved) - x(sub)) + '%"></div></div></div>'; }
    });
    html += '<div class="g-now" style="left:calc(var(--gname) + (100% - var(--gname)) * ' + (x(now) / 100) + ')"><span>Today</span></div>';
    $("#gantt").innerHTML = html;
    var why = PLAN.filter(function (p) { return p[4] === "suggest" && p[5]; });
    $("#suggestList").innerHTML = why.map(function (p) { return "<li><b>" + esc(p[1]) + ".</b> " + esc(p[5].replace(/^Suggestion: /, "")) + "</li>"; }).join("");
  }

  function renderScope(S) {
    $("#scopeRows").innerHTML = S.rows.map(function (r) {
      return '<div class="sc-row"><div><b>' + r.name + '</b><div class="small muted">' + esc(r.r.label) + (r.r.months ? " · about +" + r.r.months + " months" : "") + (r.agreed ? " · scope agreed " + new Date(r.agreed).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : " · compared with the original") + '</div></div><div class="sc-num" style="color:' + window.ScopeGuard.color(r.r.shift) + '">' + r.r.shift + '</div><a class="btn ghost" href="' + r.href + '">Open</a></div>' +
        (r.r.changes.length ? '<ul class="sc-list">' + r.r.changes.slice(0, 4).map(function (c) { return "<li>" + esc(c.what) + "</li>"; }).join("") + (r.r.changes.length > 4 ? "<li class=\"muted\">…and " + (r.r.changes.length - 4) + " more (open the studio → 🧭 Scope)</li>" : "") + "</ul>" : "");
    }).join("");
    var log = get("wr-scope-log", []);
    $("#scopeLog").innerHTML = log.length ? log.map(function (l) { return '<li><b>' + new Date(l.t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + "</b> · " + esc(l.doc) + " · " + esc(l.label) + (l.months ? " (+" + l.months + " mo)" : "") + '<div class="small muted">' + esc((l.changes || []).join(" · ")) + "</div></li>"; }).join("") : '<li class="muted">No agreed changes yet. When your supervisors agree a change, press “Agreed in supervision” in the studio’s 🧭 Scope window and it appears here.</li>';
  }

  // ---------------------------------------------------------------- tasks
  var DEFAULT_TASKS = [
    ["Finish the upgrade: work through the weakest sections on the story page", "2026-10-31", "Upgrade"],
    ["Make the ethics form and upgrade match (title, “wellbeing”, Dataset 1 source, number of psychologists)", "2026-10-24", "Ethics"],
    ["Draft the participant information sheet and consent form (Ethics studio §10.2–10.3)", "2026-10-31", "Ethics"],
    ["Run the Nexis search and export results (Dataset 1)", "2026-11-15", "News data"],
    ["Export your Zotero thesis collection and check citations in the studio", "2026-10-20", "Writing"],
    ["Set up the NVivo project; import the codebook from the News page", "2026-11-30", "News data"],
    ["Book the upgrade panel date with the PGR convenor", "2026-10-24", "Upgrade"]
  ];
  function tasks() { var t = get("wr-plan-tasks", null); if (!t) { t = DEFAULT_TASKS.map(function (d, i) { return { id: "d" + i, text: d[0], due: d[1], area: d[2], done: false }; }); set("wr-plan-tasks", t); } return t; }
  function renderTasks() {
    var t = tasks().slice().sort(function (a, b) { return (a.done - b.done) || (a.due || "9").localeCompare(b.due || "9"); }), today = new Date().toISOString().slice(0, 10);
    var wk = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    $("#taskList").innerHTML = t.map(function (k) {
      var late = !k.done && k.due && k.due < today, soon = !k.done && k.due && k.due <= wk;
      return '<li class="tk' + (k.done ? " done" : "") + '"><label><input type="checkbox" data-tk="' + k.id + '"' + (k.done ? " checked" : "") + "> <span>" + esc(k.text) + '</span></label><span class="tk-meta"><span class="tag">' + esc(k.area || "") + '</span><span class="' + (late ? "late" : soon ? "soon" : "") + '">' + (k.due ? new Date(k.due).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "") + (late ? " · overdue" : soon ? " · this week" : "") + '</span><button type="button" class="tk-x" data-del="' + k.id + '" aria-label="Delete task">×</button></span></li>';
    }).join("");
    var open = t.filter(function (k) { return !k.done; }).length, doneN = t.length - open;
    $("#taskSum").textContent = doneN + " done · " + open + " open";
  }
  $("#taskList").addEventListener("change", function (e) { var id = e.target.dataset.tk; if (!id) return; var t = tasks(); t.forEach(function (k) { if (k.id === id) k.done = e.target.checked; }); set("wr-plan-tasks", t); renderTasks(); });
  $("#taskList").addEventListener("click", function (e) { var id = e.target.dataset.del; if (!id) return; set("wr-plan-tasks", tasks().filter(function (k) { return k.id !== id; })); renderTasks(); });
  $("#taskForm").addEventListener("submit", function (e) { e.preventDefault(); var v = $("#taskText").value.trim(); if (!v) return; var t = tasks(); t.push({ id: "u" + Date.now().toString(36), text: v, due: $("#taskDue").value, area: $("#taskArea").value, done: false }); set("wr-plan-tasks", t); $("#taskText").value = ""; renderTasks(); });

  // ---------------------------------------------------------------- risks
  var RISKS = [
    ["Ethics approval delayed (industrial action, reviewer questions)", 3, 3, "Submit with the upgrade; answer reviewer queries within a week; keep news work going meanwhile."],
    ["Recruitment stalls through the gatekeepers", 2, 3, "Ask the co-founders for introductions early; send reminders through HIMPSI; accept 4 psychologists as a fallback and say so in the ethics form."],
    ["Sungkan and hormat make answers polite rather than candid", 3, 2, "Pilot the guide; use the private interview after the focus group; ask for examples, not opinions."],
    ["Transcription and translation take longer than planned", 3, 2, "Budget 70 hours; transcribe within a week of each session; use Teams captions only as a first draft."],
    ["Scope creep: new datasets, theories or countries", 3, 3, "Use the 🧭 Scope check before adding anything; park new ideas below; agree changes in supervision."],
    ["Writing time squeezed by teaching and family", 3, 3, "Protect two half-days a week; write from the studio in short sessions; the buffer exists for this."],
    ["Data loss or a privacy breach", 1, 3, "Goldsmiths OneDrive only; consent forms and the pseudonym key kept separately; no identifiable data in AI tools."],
    ["Funding ends before submission (Sep 2028)", 2, 3, "Full draft by Sep 2028; the writing-up year is for revision, not first drafts."]
  ];
  function renderRisks() {
    var st = get("wr-plan-risks", {});
    $("#riskList").innerHTML = RISKS.map(function (r, i) {
      var s = st[i] || "open", score = r[1] * r[2];
      return '<div class="rk"><div class="rk-sc s' + (score >= 9 ? "h" : score >= 6 ? "m" : "l") + '" title="Likelihood ' + r[1] + " × impact " + r[2] + '">' + score + '</div><div><b>' + esc(r[0]) + '</b><div class="small muted">' + esc(r[3]) + '</div></div><select data-rk="' + i + '" aria-label="Risk status"><option value="open"' + (s === "open" ? " selected" : "") + '>Watching</option><option value="act"' + (s === "act" ? " selected" : "") + '>Acting on it</option><option value="ok"' + (s === "ok" ? " selected" : "") + ">Under control</option></select></div>";
    }).join("");
  }
  $("#riskList").addEventListener("change", function (e) { var i = e.target.dataset.rk; if (i == null) return; var st = get("wr-plan-risks", {}); st[i] = e.target.value; set("wr-plan-risks", st); });

  // ---------------------------------------------------------------- idea parking lot
  function renderIdeas() {
    var ideas = get("wr-plan-ideas", []);
    $("#ideaList").innerHTML = ideas.length ? ideas.map(function (d, i) { return '<li><span>' + esc(d.text) + '</span><span class="tk-meta"><span class="tag">' + esc(d.where) + '</span><button type="button" class="tk-x" data-idel="' + i + '" aria-label="Remove idea">×</button></span></li>'; }).join("") : '<li class="muted">Nothing parked yet. New idea for a dataset, a theory, a country? Park it here first.</li>';
  }
  $("#ideaForm").addEventListener("submit", function (e) { e.preventDefault(); var v = $("#ideaText").value.trim(); if (!v) return; var ideas = get("wr-plan-ideas", []); ideas.unshift({ text: v, where: $("#ideaWhere").value, t: Date.now() }); set("wr-plan-ideas", ideas); $("#ideaText").value = ""; renderIdeas(); });
  $("#ideaList").addEventListener("click", function (e) { var i = e.target.dataset.idel; if (i == null) return; var ideas = get("wr-plan-ideas", []); ideas.splice(+i, 1); set("wr-plan-ideas", ideas); renderIdeas(); });

  // ---------------------------------------------------------------- headline + supervision agenda
  function renderHead(S) {
    var now = new Date(), next = PLAN.filter(function (p) { return p[4] === "mile" && ym(p[3]) > now; })[0];
    var sub = ym("2029-04"), moved = new Date(sub.getTime() + S.months * 30.4 * 864e5);
    $("#hNext").textContent = next ? next[1] : "Viva";
    $("#hNextWhen").textContent = next ? "by " + fmt(new Date(ym(next[3]) - 864e5)) + " · " + Math.max(0, Math.round((ym(next[3]) - now) / (7 * 864e5))) + " weeks" : "";
    $("#hSubmit").textContent = fmt(S.months ? moved : sub);
    $("#hSubmitNote").textContent = S.months ? "Planned Apr 2029. Unagreed scope changes add about " + S.months + " months." : "On plan, with a buffer before the viva.";
    $("#hSubmit").style.color = S.months >= 3 ? "var(--bad)" : S.months ? "var(--gold)" : "";
    var weak = get("wr-section-scores", null), agenda = [];
    S.rows.forEach(function (r) { if (r.r.changes.length && r.r.shift >= 15) agenda.push("Agree or drop the " + r.name.toLowerCase() + " scope changes (" + r.r.label.toLowerCase() + ", about +" + r.r.months + " months)"); });
    if (weak && weak.per) { var ids = Object.keys(weak.per).sort(function (a, b) { return weak.per[a] - weak.per[b]; }).slice(0, 2); if (ids.length) agenda.push("Feedback on the weakest upgrade sections: " + ids.map(function (i) { return "§" + i.replace(/^s/, "").replace("-", "."); }).join(", ")); }
    var ideas = get("wr-plan-ideas", []); if (ideas.length) agenda.push("Parked ideas to decide on: " + ideas.slice(0, 3).map(function (d) { return "“" + d.text.slice(0, 50) + "”"; }).join(", "));
    var late = tasks().filter(function (k) { return !k.done && k.due && k.due < new Date().toISOString().slice(0, 10); }); if (late.length) agenda.push(late.length + " overdue task(s): what to drop or move?");
    agenda.push("Timeline check: is the next milestone (" + (next ? next[1] : "viva") + ") still realistic?");
    $("#agenda").innerHTML = agenda.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("");
  }

  var S = scopeMonths();
  renderHead(S); renderGantt(S.months); renderScope(S); renderTasks(); renderRisks(); renderIdeas();
  $("#agendaCopy").addEventListener("click", function () { var t = "Supervision agenda\n" + Array.prototype.map.call(document.querySelectorAll("#agenda li"), function (li) { return "• " + li.textContent; }).join("\n"); var done = function () { $("#agendaCopy").textContent = "Copied ✓"; setTimeout(function () { $("#agendaCopy").textContent = "Copy agenda"; }, 1800); }; try { navigator.clipboard.writeText(t).then(done, function () {}); } catch (e) {} });
})();
