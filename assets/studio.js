// Shared studio engine (upgrade studio and thesis studio). Configure with window.STUDIO_CONFIG before loading.
(function(){
"use strict";
const CFG = window.STUDIO_CONFIG || {}; const NS = CFG.ns || "";
const ROOM_URL = "https://claude.ai/artifact/QHVfPRvosRnJqJiZYhWT3t";
const DS = CFG.store || window.DocStore, CK = window.Checks, FIG = window.FIGLIB;
const $ = s => document.querySelector(s);
const ed = $("#ed");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let lastR = null;
function renderFuture(){ if (!current || !window.Cheer) return; const all = ordered(); Cheer.renderPanel($("#p-future"), { section: DS.get(current), rubric: lastR, revised: all.filter(x => x.revised).length, total: all.length, go: openSection }); }
let current = null, saveTimer = null, checkTimer = null, sevFilter = "all", lastIssues = [], ltMatches = [], ltBusy = false, ltLast = 0;
const OVR_KEY = "wr-rubric-override" + NS;

function toast(msg, actLabel, actFn){
  const t=$("#toast"); t.textContent=msg;
  if (actLabel) { const b=document.createElement("button"); b.textContent=actLabel; b.addEventListener("click", () => { t.classList.remove("show"); actFn(); }); t.appendChild(b); }
  t.classList.add("show"); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove("show"), actLabel ? 7000 : 2200);
}

// ------------------------------------------------------------ section ordering
function ordered(){
  const st = DS.state(), del = st.deleted || {};
  const list = DS.sections().filter(s => !del[s.id]);
  const orig = list.filter(s => !s.custom), added = list.filter(s => s.custom);
  added.forEach(a => {
    let idx = a.after ? orig.findIndex(o => o.id === a.after) : -1;
    if (idx < 0) orig.forEach((o,i) => { if (o.num && a.num && o.num.split(".")[0] === a.num.split(".")[0] && cmpNum(o.num, a.num) <= 0) idx = i; });
    if (idx < 0) idx = orig.findIndex(o => o.id === "references") - 1;
    orig.splice(idx+1, 0, a);
  });
  if (Array.isArray(st.order) && st.order.length) {
    const pos = new Map(st.order.map((id,i) => [id,i]));
    const known = orig.filter(s => pos.has(s.id)).sort((a,b) => pos.get(a.id) - pos.get(b.id));
    orig.forEach((u,i) => { if (pos.has(u.id)) return; const prev = orig.slice(0,i).reverse().find(x => known.includes(x)); known.splice(prev ? known.indexOf(prev) + 1 : 0, 0, u); });
    return known;
  }
  return orig;
}
function cmpNum(a,b){ const x=String(a).split(".").map(Number), y=String(b).split(".").map(Number); return (x[0]-y[0]) || ((x[1]||0)-(y[1]||0)) || ((x[2]||0)-(y[2]||0)); }
function label(s){ return (s.num ? "§" + s.num + " " : "") + s.heading; }
function wcount(t){ return (t.match(/\S+/g)||[]).length; }
const PROMPT_RE = /<p class="prompt">[\s\S]*?<\/p>/g;
function wordsIn(x){ const h = x.id === current ? editorHtml() : (x.html || ""); return wcount(DS.textOf(String(h).replace(PROMPT_RE, ""))); }

// ------------------------------------------------------------ section scores (shared with the story page: assets/secscore.js)
const SEC_CACHE = new Map();
function sectionScores(list){
  if (!window.SecScore) return {};
  const live = list.map(x => x.id === current && !isTitle() ? Object.assign({}, x, { html: ed.innerHTML }) : x.id === current ? Object.assign({}, x, { html: editorHtml() }) : x);
  const C = SecScore.context(live, DS), ign = wrStore.get("wr-ignore" + NS, {}), out = {};
  live.forEach(x => {
    const key = mode() + String(x.html || "").length + ":" + SecScore.hashOf(String(x.html || ""));
    const c = SEC_CACHE.get(x.id); if (c && c.key === key) { out[x.id] = c.r; return; }
    const r = SecScore.analyse(x, C, DS, ign, { critical: isCritical(), gentle: isGentle(), strict: !!CFG.strict }); SEC_CACHE.set(x.id, { key, r }); out[x.id] = r;
  });
  const per = {}; Object.keys(out).forEach(k => { if (out[k].score != null) per[k] = out[k].score; });
  wrStore.set("wr-section-scores" + NS, { per, t: Date.now() });
  paintSecScore(out[current]);
  return out;
}
function scoreChip(r){ if (!r || r.score == null) return ""; return `<b class="ssc ${SecScore.band(r.score)}" title="Section score: ${r.score}/100 · ${Object.keys(r.sub || {}).map(k => k.toLowerCase() + " " + r.sub[k]).join(" · ")}">${r.score}</b> `; }
function paintSecScore(r){
  let el = $("#secScoreLine");
  if (!el) { const hr = document.querySelector(".hrow"); if (!hr) return; el = document.createElement("div"); el.id = "secScoreLine"; el.className = "sec-score-line"; hr.insertAdjacentElement("afterend", el); }
  if (!r || r.score == null) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<span class="ssc ${SecScore.band(r.score)}">${r.score}</span><span>section score · <b>${SecScore.bandName(r.score)}</b></span>` + Object.keys(r.sub || {}).map(k => `<span class="ssub"><i style="width:${r.sub[k]}%"></i></span><span class="small">${k.toLowerCase()} <b>${r.sub[k]}</b></span>`).join("") + (r.sugs && r.sugs.length ? `<span class="small muted">· ${r.sugs.length} ideas, ${(r.grammar || []).filter(i => i.sev !== "info").length} checks</span>` : "");
}
(function secScoreStyles(){
  const st = document.createElement("style");
  st.textContent = `.ssc{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:16px;border-radius:999px;font:600 .66rem var(--sans);padding:0 5px;margin-right:4px;color:#fff;vertical-align:1px}
  .ssc.ok{background:var(--ok)}.ssc.mid{background:var(--warn)}.ssc.low{background:var(--bad)}
  .sec-score-line{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:.8rem;color:var(--muted);margin:6px 0 4px}
  .sec-score-line .ssc{height:20px;min-width:30px;font-size:.78rem}
  .sec-score-line .ssub{display:inline-block;width:42px;height:6px;border-radius:999px;background:var(--surface-2);position:relative;overflow:hidden}
  .sec-score-line .ssub i{position:absolute;left:0;top:0;bottom:0;background:var(--accent);border-radius:999px}

  .soft-btn[aria-pressed="true"]{background:var(--ok);color:#fff;border-color:var(--ok)}
  .formq{border-left:3px solid var(--accent);background:var(--surface-2);border-radius:0 8px 8px 0;padding:8px 12px;margin:8px 0 6px;font-size:.86rem;color:var(--ink-2)}
  .formq b{display:block;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:2px}`;
  document.head.appendChild(st);
})();

// ------------------------------------------------------------ sidebar
function renderSide(){
  const f = $("#secFilter").value.toLowerCase();
  const list = ordered();
  const SC = sectionScores(list);
  let html = "", grp = null, rev = 0;
  const addBtn = ch => /^Chapter|Back matter/.test(ch || "") && !f ? `<button class="add-in-ch" data-addch="${esc(ch)}">＋ Add section to ${esc(ch.replace(/ · .*/, ""))}</button>` : "";
  list.forEach(s => {
    if (s.revised) rev++;
    if (f && !(label(s).toLowerCase().includes(f))) return;
    if (s.chapter !== grp) { html += addBtn(grp); grp = s.chapter; const tgt = CFG.targets && CFG.targets[grp];
      if (tgt) { const cw = list.filter(x => x.chapter === grp).reduce((n, x) => n + wordsIn(x), 0), pc = Math.min(100, Math.round(100 * cw / tgt));
        html += `<div class="grp">${esc(grp)}<span class="gw">${(cw / 1000).toFixed(1)}k / ${tgt / 1000}k</span></div><div class="gbar" title="${cw.toLocaleString()} of ${tgt.toLocaleString()} words (${pc}%)"><i style="width:${pc}%"></i></div>`; }
      else html += `<div class="grp">${esc(grp)}</div>`; }
    const st = s.revised ? "revised" : (s.edited ? "edited" : "");
    const isSub = (s.num || "").split(".").length >= 3;
    html += `<div class="sec-row${isSub ? " sub" : ""}${s.id === current ? " cur" : ""}"><button class="sec" data-id="${s.id}" aria-current="${s.id===current}"><span class="st ${st}" title="${s.revised?'Revised':s.edited?'Edited':'Original'}"></span><span>${s.num?`<b>${esc(s.num)}</b> `:""}${esc(s.heading)}</span><span class="wc">${scoreChip(SC[s.id])}${wordsIn(s)}</span></button>` +
      (s.id !== "title" ? `<span class="hov">${s.num ? `<button data-sub="${s.id}" title="Add a subsection under ${esc(s.num)}" aria-label="Add subsection">＋</button>` : ""}<button class="arch" data-arch="${s.id}" title="Archive this section (restore or reuse it later)" aria-label="Archive section">🗄</button></span>` : "") + `</div>`;
  });
  html += addBtn(grp);
  const st0 = DS.state(), del = st0.deleted || {}, delIds = Object.keys(del).sort((a,b) => del[b]-del[a]);
  if (delIds.length) {
    const all = DS.sections();
    html += `<details class="del-grp" ${renderSide._archOpen ? "open" : ""}><summary>🗄 Archive (${delIds.length}): restore or reuse</summary>${delIds.map(id => { const d = all.find(x => x.id === id); return d ? `<div class="del-item"><span title="Archived ${new Date(del[id]).toLocaleDateString()}">${esc(label(d))}</span><span style="white-space:nowrap"><button data-restore="${id}" title="Put it back where it was">Restore</button> <button data-reuse="${id}" title="Insert a copy after the section you are editing">Reuse</button>${d.custom ? ` <button data-purge="${id}" title="Delete forever">✕</button>` : ""}</span></div>` : ""; }).join("")}</details>`;
  }
  $("#secList").innerHTML = html;
  const dg = $("#secList").querySelector(".del-grp"); if (dg) dg.addEventListener("toggle", () => { renderSide._archOpen = dg.open; });
  $("#secList").querySelectorAll("[data-sub]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); addSubsection(b.dataset.sub); }));
  $("#secList").querySelectorAll("[data-arch]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); const sec = DS.get(b.dataset.arch); if (sec && confirm("Archive “" + label(sec) + "”? It leaves the document but stays in the Archive, where you can restore or reuse it.")) deleteSection(b.dataset.arch); }));
  $("#secList").querySelectorAll("[data-addch]").forEach(b => b.addEventListener("click", () => sectionForm("add", { where: "end:" + b.dataset.addch })));
  $("#secList").querySelectorAll("[data-reuse]").forEach(b => b.addEventListener("click", () => reuseSection(b.dataset.reuse)));
  $("#secList").querySelectorAll("[data-restore]").forEach(b => b.addEventListener("click", () => restoreSection(b.dataset.restore)));
  $("#secList").querySelectorAll("[data-purge]").forEach(b => b.addEventListener("click", () => { if (!confirm("Delete this section forever? This cannot be undone.")) return; const st = DS.state(); st.added = (st.added||[]).filter(a => a.id !== b.dataset.purge); delete st.deleted[b.dataset.purge]; if (st.sections) delete st.sections[b.dataset.purge]; DS.save(st); renderSide(); }));
  $("#secList").querySelectorAll("button.sec").forEach(b => b.addEventListener("click", () => openSection(b.dataset.id)));
  const pct = Math.round(100*rev/list.length);
  $("#sideProg").innerHTML = `<b>${rev}</b> of ${list.length} sections revised (${pct}%)`;
  $("#revProg").textContent = `${rev}/${list.length} sections revised`;
  if (CFG.wordTarget && $("#wordGoal")) { const tw = list.reduce((n, x) => n + wordsIn(x), 0), pc = Math.round(100 * tw / CFG.wordTarget);
    $("#wordGoal").hidden = false; $("#wordGoal").innerHTML = `<b>${tw.toLocaleString()}</b> / ${CFG.wordTarget.toLocaleString()} words <span class="wg"><i style="width:${Math.min(100, pc)}%"></i></span> ${pc}%${CFG.wordLimit && tw > CFG.wordLimit ? ` <b style="color:var(--bad)">over the ${CFG.wordLimit.toLocaleString()} limit</b>` : ""}`; }
  $("#mobilePick").innerHTML = list.map(s => `<option value="${s.id}" ${s.id===current?"selected":""}>${esc(label(s))}${s.revised?" ✓":""}</option>`).join("");
}
$("#secFilter").addEventListener("input", renderSide);
$("#mobilePick").addEventListener("change", e => openSection(e.target.value));

// ------------------------------------------------------------ open / save
function isTitle(){ return current === "title"; }
function editorHtml(){ return isTitle() ? esc($("#titleInput").value.replace(/\s+/g," ").trim()) : ed.innerHTML; }
function editorText(){ return isTitle() ? $("#titleInput").value : DS.textOf(ed.innerHTML); }

function openSection(id){
  if (current) flushSave(true);
  const s = DS.get(id); if (!s) return;
  current = id;
  $("#chapLbl").textContent = s.chapter;
  $("#numInput").value = s.num || ""; $("#numInput").disabled = (id === "title");
  const pullBtn = document.querySelector('#secActions [data-sa="pull"]'); if (pullBtn) pullBtn.hidden = !(s.from && window.DocStore && window.DocStore !== DS);
  const ids = ordered().map(x => x.id), k = ids.indexOf(id);
  document.querySelectorAll("#secActions button").forEach(b => { const a = b.dataset.sa; b.disabled = (id === "title" && a !== "add") || (a === "sub" && !s.num) || (a === "up" && k <= 1) || (a === "down" && k === ids.length - 1) || (a === "dup" && id === "title"); });
  $("#headingInput").value = s.heading;
  let fq = $("#formQ"); if (!fq) { const hr = document.querySelector(".hrow"); fq = document.createElement("div"); fq.id = "formQ"; fq.className = "formq"; hr.insertAdjacentElement("afterend", fq); }
  const oq = (DS.original(id) || {}).q || s.q || ""; fq.hidden = !oq; fq.innerHTML = oq ? `<b>The form asks</b>${esc(oq)}` : "";
  $("#headingInput").disabled = (id === "title");
  const t = isTitle();
  $("#titleWrap").hidden = !t; ed.hidden = t;
  document.querySelectorAll("#toolbar button[data-cmd], #toolbar button[data-act]:not([data-act=compare]):not([data-act=history]):not([data-act=restore]), #blockSel").forEach(b => b.disabled = t);
  if (t) { const ta = document.createElement("textarea"); ta.innerHTML = s.html; $("#titleInput").value = ta.value; updateTitlePreview(); }
  else { ed.innerHTML = s.html; }
  $("#revisedBox").checked = !!s.revised; paintStamp(s); closeInsight(); hideTip(true); $("#paraBadge").hidden = true;
  if (typeof magic !== "undefined" && magic === "sect") setTimeout(placeSectionBadge, 50);
  if (id === "title") setTimeout(placeTitleBadge, 50);
  try { history.replaceState(null, "", "#" + id); } catch(e){}
  wrStore.set("wr-studio-last" + NS, id);
  renderSide(); runChecks(true); renderFigs(); renderAI();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function persist(id, patch){
  const st = DS.state(); st.sections = st.sections || {}; st.history = st.history || {};
  const prev = st.sections[id] || {};
  st.sections[id] = Object.assign({}, prev, patch, { updated: Date.now() });
  if (patch.html !== undefined) {
    const h = st.history[id] = st.history[id] || [];
    const last = h[h.length-1];
    if (!last || Date.now() - last.t > 120000) { h.push({ t: Date.now(), html: patch.html }); if (h.length > 15) h.shift(); }
    else last.html = patch.html;
  }
  if (!DS.save(st)) toast("Browser storage is full. Export a backup.");
}
function flushSave(silent){
  clearTimeout(saveTimer); saveTimer = null;
  if (!current) return;
  const s = DS.get(current), html = editorHtml();
  if (s && html !== s.html) { const oldT = DS.textOf(s.html); persist(current, { html }); try { Cheer.onSave(current, oldT, DS.textOf(html)); } catch(e){} if (!silent) $("#saveState").textContent = "Saved " + new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); }
}
function scheduleSave(){
  $("#saveState").textContent = "Saving…";
  clearTimeout(saveTimer); saveTimer = setTimeout(() => { flushSave(); renderSide(); }, 700);
  clearTimeout(checkTimer); checkTimer = setTimeout(() => runChecks(false), 450);
}
ed.addEventListener("input", () => { issuesFresh = false; hideTip(true); scheduleSave(); });
$("#titleInput").addEventListener("input", () => { updateTitlePreview(); scheduleSave(); });
$("#numInput").addEventListener("change", e => { const v = e.target.value.trim(); persist(current, { num: v }); $("#numLbl") && 0; renderSide(); toast(v ? "Renumbered to " + v : "Number removed"); });
$("#headingInput").addEventListener("change", e => { const v = e.target.value.trim(); if (v) { persist(current, { heading: v }); renderSide(); toast("Heading updated"); } });
$("#revisedBox").addEventListener("change", e => { flushSave(true); persist(current, { revised: e.target.checked }); renderSide();
  paintStamp(DS.get(current));
  if (e.target.checked) { const all = ordered(); try { Cheer.onRevised(DS.get(current), all.filter(x => x.revised).length, all.length); } catch(err){} }
  renderFuture(); toast(e.target.checked ? "Marked as revised ✓" : "Unmarked"); });
window.addEventListener("beforeunload", () => flushSave(true));
document.addEventListener("visibilitychange", () => { if (document.hidden) flushSave(true); });

function updateTitlePreview(){
  const v = $("#titleInput").value.replace(/\s+/g," ").trim();
  const [main, ...rest] = v.split(":");
  const tsc = window.TitleKit ? window.TitleKit.score(v) : null;
  $("#titlePreview").innerHTML = (tsc != null ? `<b style="color:${tsc >= 80 ? "var(--ok)" : tsc >= 60 ? "var(--gold)" : "var(--bad)"}">Title score ${tsc}/100</b> · ` : "") + (NS ? `Main title <b>${esc(main.trim())}</b>${rest.length ? `, subtitle <b>${esc(rest.join(":").trim())}</b>` : ""}.` : `The story page will show <b>${esc(main.trim())}</b>${rest.length ? ` with the subtitle <b>${esc(rest.join(":").trim())}</b>` : ""}. <a href="index.html" target="_blank" rel="noopener">Open the story ↗</a>`);
}

// ------------------------------------------------------------ toolbar
document.querySelectorAll("#toolbar button[data-cmd]").forEach(b => b.addEventListener("mousedown", e => { e.preventDefault(); document.execCommand(b.dataset.cmd, false, null); ed.focus(); scheduleSave(); updateToolbar(); }));
$("#blockSel").addEventListener("change", e => { ed.focus(); restoreSel(); document.execCommand("formatBlock", false, e.target.value); scheduleSave(); });
let savedRange = null;
function saveSel(){ const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
function restoreSel(){ if (savedRange) { const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); } }
document.addEventListener("selectionchange", () => { if (document.activeElement === ed) { saveSel(); updateToolbar(); } });
function updateToolbar(){
  ["bold","italic","underline","insertUnorderedList","insertOrderedList"].forEach(c => { const b = document.querySelector(`#toolbar [data-cmd=${c}]`); try { b.classList.toggle("on", document.queryCommandState(c)); } catch(e){} });
  try { const v = (document.queryCommandValue("formatBlock")||"p").toLowerCase().replace(/[<>]/g,""); $("#blockSel").value = ["h3","h4","blockquote"].includes(v) ? v : "p"; } catch(e){}
}
function cellAtCaret(){ const s = getSelection(); if (!s.rangeCount) return null; let n = s.anchorNode; while (n && n !== ed) { if (n.nodeName === "TD" || n.nodeName === "TH") return n; n = n.parentNode; } return null; }
document.querySelectorAll("#toolbar button[data-act]").forEach(b => b.addEventListener("mousedown", e => { e.preventDefault(); act(b.dataset.act); }));
function act(a){
  if (a === "link") { const u = prompt("Link address (https://…)"); if (u && /^https?:\/\//.test(u)) { restoreSel(); document.execCommand("createLink", false, u); scheduleSave(); } return; }
  if (a === "table") {
    const r = Math.max(1, Math.min(30, parseInt(prompt("Rows (excluding header)?", "3"),10)||0)); const c = Math.max(1, Math.min(10, parseInt(prompt("Columns?", "3"),10)||0));
    if (!r || !c) return;
    let h = `<p><strong>Table X.X</strong> Caption</p><table><thead><tr>${"<th>Heading</th>".repeat(c)}</tr></thead><tbody>${("<tr>"+"<td><br></td>".repeat(c)+"</tr>").repeat(r)}</tbody></table><p><br></p>`;
    ed.focus(); restoreSel(); document.execCommand("insertHTML", false, h); scheduleSave(); return;
  }
  if (a === "row" || a === "col" || a === "delrow") {
    const cell = cellAtCaret(); if (!cell) { toast("Put the cursor inside a table first"); return; }
    const tr = cell.parentNode, table = tr.closest("table");
    if (a === "row") { const n = tr.cloneNode(true); n.querySelectorAll("td,th").forEach(c => { const td = document.createElement("td"); td.innerHTML = "<br>"; c.replaceWith(td); }); tr.after(n); }
    if (a === "delrow") { if (table.querySelectorAll("tr").length > 1) tr.remove(); }
    if (a === "col") { const idx = [...tr.children].indexOf(cell); table.querySelectorAll("tr").forEach(row => { const ref = row.children[idx]; const n = document.createElement(ref && ref.nodeName === "TH" ? "th" : "td"); n.innerHTML = ref && ref.nodeName === "TH" ? "Heading" : "<br>"; (ref ? ref.after(n) : row.appendChild(n)); }); }
    scheduleSave(); return;
  }
  if (a === "figure") { switchTab("figs"); toast("Choose a figure and press Insert"); return; }
  if (a === "find") { $("#findbar").classList.toggle("open"); if ($("#findbar").classList.contains("open")) $("#findIn").focus(); else clearFind(); return; }
  if (a === "compare") return showCompare();
  if (a === "history") return showHistory();
  if (a === "restore") {
    if (!confirm("Replace this section with the original draft text? (Your current version stays in History.)")) return;
    const o = DS.original(current); if (!o) { toast("This is a new section; there is no original"); return; }
    flushSave(true);
    if (isTitle()) { const ta=document.createElement("textarea"); ta.innerHTML=o.html; $("#titleInput").value = ta.value; updateTitlePreview(); }
    else ed.innerHTML = o.html;
    persist(current, { html: o.html }); runChecks(true); renderSide(); toast("Original restored");
  }
}
ed.addEventListener("keydown", e => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === "f") { e.preventDefault(); act("find"); }
  if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); flushSave(); toast("Saved"); }
});

// ------------------------------------------------------------ paste sanitiser
const ALLOWED = new Set(["P","BR","STRONG","EM","U","UL","OL","LI","H3","H4","BLOCKQUOTE","A","TABLE","THEAD","TBODY","TR","TH","TD","SUP","SUB"]);
function sanitize(html){
  const doc = new DOMParser().parseFromString(html, "text/html");
  function walk(node){
    [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 8) { ch.remove(); return; }
      if (ch.nodeType !== 1) return;
      let tag = ch.nodeName;
      if (["SCRIPT","STYLE","META","LINK","TITLE","XML","IFRAME","OBJECT"].includes(tag) || tag.includes(":")) { ch.remove(); return; }
      walk(ch);
      if (tag === "B") tag = "STRONG"; if (tag === "I") tag = "EM";
      if (/^H[12]$/.test(tag)) tag = "H3"; if (/^H[56]$/.test(tag)) tag = "H4";
      if (tag === "DIV") tag = "P";
      if (!ALLOWED.has(tag)) { ch.replaceWith(...ch.childNodes); return; }
      const n = document.createElement(tag);
      if (tag === "A") { const h = ch.getAttribute("href")||""; if (/^https?:\/\//.test(h)) n.setAttribute("href", h); }
      while (ch.firstChild) n.appendChild(ch.firstChild);
      ch.replaceWith(n);
    });
  }
  walk(doc.body);
  return doc.body.innerHTML;
}
ed.addEventListener("paste", e => {
  e.preventDefault();
  const cd = e.clipboardData; const h = cd.getData("text/html"), t = cd.getData("text/plain");
  if (h) document.execCommand("insertHTML", false, sanitize(h));
  else if (t) { const parts = t.split(/\n{2,}/); if (parts.length > 1) document.execCommand("insertHTML", false, parts.map(p => "<p>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("")); else document.execCommand("insertText", false, t); }
  scheduleSave();
});
ed.addEventListener("drop", e => { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) e.preventDefault(); });

// ------------------------------------------------------------ text model (offset ↔ DOM)
const BLOCK = /^(P|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|TD|TH|FIGCAPTION|DIV|FIGURE)$/;
function blockOf(n){ while (n && n !== ed) { if (n.nodeType === 1 && BLOCK.test(n.nodeName)) return n; n = n.parentNode; } return ed; }
function textModel(){
  const segs = []; let text = "", prevBlock = null;
  const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentNode.closest && n.parentNode.closest("figure") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  let n;
  while ((n = w.nextNode())) {
    const b = blockOf(n);
    if (prevBlock && b !== prevBlock && text && !text.endsWith("\n")) text += "\n";
    prevBlock = b;
    segs.push({ node: n, start: text.length, end: text.length + n.nodeValue.length });
    text += n.nodeValue;
  }
  return { text: text.replace(/ /g, " "), segs };
}
function rangeFor(model, index, length){
  const s = model.segs.find(x => index >= x.start && index < x.end) || model.segs.find(x => index === x.end);
  const endIdx = index + length;
  const e = model.segs.find(x => endIdx > x.start && endIdx <= x.end);
  if (!s || !e) return null;
  const r = document.createRange();
  r.setStart(s.node, index - s.start); r.setEnd(e.node, endIdx - e.start);
  return r;
}
function selectRange(r){ const s = getSelection(); s.removeAllRanges(); s.addRange(r); const el = r.startContainer.parentElement; if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); }

// ------------------------------------------------------------ checks
function paragraphs(){ return [...ed.querySelectorAll("p, li, blockquote")].filter(p => !p.closest("td,th,figure")).map(p => ({ text: p.textContent.replace(/ /g," "), isList: p.nodeName === "LI", el: p, caption: p.classList.contains("caption") })); }

function runChecks(full){
  const model = isTitle() ? null : textModel();
  const text = isTitle() ? $("#titleInput").value : model.text;
  // stats
  const ss = CK.sentences(text), w = CK.words(text).length;
  $("#wc").textContent = w.toLocaleString(); $("#sc").textContent = ss.length;
  $("#asl").textContent = ss.length ? (w/ss.length).toFixed(1) : "0";
  const syl = CK.words(text).reduce((a,x) => a + Math.max(1, (x.replace(/e$/,"").match(/[aeiouy]+/g)||[]).length), 0);
  $("#fre").textContent = (ss.length && w) ? Math.round(206.835 - 1.015*(w/ss.length) - 84.6*(syl/w)) : "–";
  // grammar
  lastIssues = CK.grammar(text, current).map(i => Object.assign(i, { src: "local" }));
  if (ltMatches.length) lastIssues = lastIssues.concat(ltMatches.filter(m => m.text === text).map(m => m.issue));
  const ign = wrStore.get("wr-ignore" + NS, {});
  lastIssues = lastIssues.filter(i => !ign[current + "|" + i.rule + "|" + i.match]);
  lastModel = model; issuesFresh = true;
  renderIssues(model);
  try { const sec = DS.get(current); Cheer.onIssues(current, sec && sec.num, lastIssues.filter(i => i.sev === "error").length, full); } catch(e){}
  renderCoherence();
  renderScore();
  renderAI();
  if (full) $("#dwc").textContent = docWords().toLocaleString();
  if ($("#ltToggle").checked && !isTitle()) scheduleLT(text);
}
function docWords(){ return ordered().reduce((a,s) => a + wcount(s.id === current ? editorText() : DS.textOf(s.html)), 0); }

function renderIssues(model){
  const list = lastIssues.filter(i => sevFilter === "all" || i.sev === sevFilter);
  $("#cntChecks").textContent = lastIssues.filter(i => i.sev !== "info").length;
  $("#issueList").innerHTML = list.length ? list.slice(0, 200).map((i, n) => `
    <div class="issue sev-${i.sev}" data-n="${lastIssues.indexOf(i)}">
      <div class="ih"><span>${esc(i.cat)}</span><span>${i.sev === "error" ? "Error" : i.sev === "warn" ? "Warning" : "Suggestion"}</span></div>
      <div class="im">${esc(i.msg)}</div>
      <div><code>${esc(i.match.length > 70 ? i.match.slice(0,70)+"…" : i.match)}</code>${i.fix != null ? ` → <code>${esc(i.fix === "" ? "(delete)" : i.fix)}</code>` : ""}</div>
      <div class="ia">${i.fix != null ? `<button class="primary" data-fix="${lastIssues.indexOf(i)}">Apply</button>` : ""}<button data-ign="${lastIssues.indexOf(i)}">Ignore</button></div>
    </div>`).join("") : `<p class="small muted">No issues in this filter. ✓</p>`;
  $("#issueList").querySelectorAll(".issue").forEach(el => el.addEventListener("click", ev => {
    const i = lastIssues[+el.dataset.n]; if (!i) return;
    if (isTitle()) { if (ev.target.dataset.fix !== undefined) { applyFix(i); return; } if (ev.target.dataset.ign !== undefined) { ignoreIssue(i); return; } const ta = $("#titleInput"); ta.focus(); ta.setSelectionRange(i.index, i.index + i.length); return; }
    if (ev.target.dataset.fix !== undefined) { applyFix(i); return; }
    if (ev.target.dataset.ign !== undefined) { ignoreIssue(i); return; }
    const r = rangeFor(textModel(), i.index, i.length); if (r) { ed.focus(); selectRange(r); }
  }));
  // underline
  if (window.CSS && CSS.highlights) {
    ["chk-error","chk-warn","chk-info"].forEach(k => CSS.highlights.delete(k));
    if ($("#underlines").checked && model) {
      const groups = { error: [], warn: [], info: [] };
      lastIssues.forEach(i => { if (i.rule === "long" || i.rule === "brackets" || i.rule === "quotes") return; const r = rangeFor(model, i.index, i.length); if (r) groups[i.sev].push(r); });
      Object.keys(groups).forEach(k => { if (groups[k].length) CSS.highlights.set("chk-" + k, new Highlight(...groups[k])); });
    }
  }
}
function applyFix(i){
  if (isTitle()) {
    const ta = $("#titleInput"), v = ta.value;
    if (v.substr(i.index, i.length) !== i.match) { toast("Title changed. Re-run the check."); runChecks(false); return; }
    ta.value = v.slice(0, i.index) + (i.fix || "") + v.slice(i.index + i.length);
    updateTitlePreview(); scheduleSave(); runChecks(false); return;
  }
  const r = rangeFor(textModel(), i.index, i.length); if (!r) { toast("Text changed. Re-run the check."); return; }
  if (r.toString().replace(/ /g," ") !== i.match) { toast("Text changed. Re-run the check."); runChecks(false); return; }
  ed.focus(); selectRange(r);
  if (i.fix === "") document.execCommand("delete"); else document.execCommand("insertText", false, i.fix);
  scheduleSave(); runChecks(false);
}
$("#fixAll").addEventListener("click", () => {
  if (isTitle()) return;
  const safe = ["contraction","dspace","amp","etal","wellbeing","ukspell","repeat","spacepunct","nospace"];
  const fixes = lastIssues.filter(i => i.fix != null && safe.includes(i.rule)).sort((a,b) => b.index - a.index);
  if (!fixes.length) { toast("No safe fixes to apply"); return; }
  let n = 0;
  fixes.forEach(i => { const r = rangeFor(textModel(), i.index, i.length); if (r && r.toString().replace(/ /g," ") === i.match) { selectRange(r); document.execCommand("insertText", false, i.fix); n++; } });
  scheduleSave(); runChecks(false); toast(n + " fixes applied (undo with ⌘Z)");
});
$("#underlines").addEventListener("change", () => runChecks(false));
$("#sevFilter").querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => { sevFilter = c.dataset.s; $("#sevFilter").querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x===c)); renderIssues(isTitle()?null:textModel()); }));

// LanguageTool (opt-in)
$("#ltToggle").addEventListener("change", e => { wrStore.set("wr-lt", e.target.checked); if (e.target.checked) { ltLast = 0; runChecks(false); } else { ltMatches = []; runChecks(false); } });
$("#ltToggle").checked = !!wrStore.get("wr-lt", false);
let ltTimer = null;
function scheduleLT(text){
  clearTimeout(ltTimer);
  const wait = Math.max(1500, 4000 - (Date.now() - ltLast));
  ltTimer = setTimeout(() => callLT(text), wait);
}
async function callLT(text){
  if (ltBusy || !text.trim()) return; ltBusy = true; ltLast = Date.now();
  try {
    const body = new URLSearchParams({ text: text.slice(0, 19000), language: "en-GB", level: "picky" });
    const r = await fetch("https://api.languagetool.org/v2/check", { method: "POST", body });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    const known = new Set(lastIssues.map(i => i.index + ":" + i.length));
    ltMatches = (j.matches || []).filter(m => !known.has(m.offset + ":" + m.length)).map(m => ({ text, issue: {
      rule: "lt-" + (m.rule && m.rule.id), cat: "LanguageTool · " + ((m.rule && m.rule.category && m.rule.category.name) || "Grammar"),
      sev: (m.rule && m.rule.issueType === "misspelling") || (m.rule && m.rule.category && m.rule.category.id === "GRAMMAR") ? "error" : "warn",
      msg: m.message, index: m.offset, length: m.length, match: text.substr(m.offset, m.length), fix: (m.replacements && m.replacements[0]) ? m.replacements[0].value : null, src: "lt" } }));
    runChecks(false);
  } catch (e) { toast("LanguageTool unavailable (rate limit or offline). Local checks still run."); }
  ltBusy = false;
}

// ------------------------------------------------------------ coherence
function allTexts(){
  const o = {};
  ordered().forEach(s => { const body = s.id === current ? editorText() : DS.textOf(s.html); o[s.id] = { text: (s.custom && s.heading ? s.heading + "\n" : "") + body, label: label(s), num: s.num, html: s.id === current ? editorHtml() : s.html }; });
  return o;
}
function renderCoherence(){
  const box = $("#p-coh");
  if (isTitle()) { box.innerHTML = titleChecks(); return; }
  const at = allTexts();
  const nums = Object.values(at).map(x => x.num).filter(Boolean);
  const tables = []; Object.values(at).forEach(x => { (x.text.match(/Table (\d+\.\d+)/g)||[]).forEach(()=>{}); (x.html.match(/<strong>Table (\d+\.\d+)<\/strong>/g)||[]).forEach(m => tables.push(m.replace(/<\/?strong>|Table /g,""))); });
  const figs = Object.values(at).reduce((a,x) => a + (x.html.match(/<figure/g)||[]).length, 0);
  const res = CK.coherence({ id: current }, paragraphs(), at, nums, figs, tables);
  const col = res.score >= 80 ? "var(--ok)" : res.score >= 60 ? "var(--gold)" : "var(--bad)";
  box.innerHTML = `
    <div class="coh-score"><div class="num" style="color:${col}">${res.score}</div><div class="small">section coherence index<br><span class="muted">${res.paragraphs} paragraphs · 100 = no issues found</span></div></div>
    <h4>Argument threads</h4>
    <div class="threads">${res.threads.map(t => `<span class="${t.on?"on":""}">${t.on?"✓ ":""}${esc(t.name)}</span>`).join("")}</div>
    <h4>Findings</h4>
    ${res.findings.length ? res.findings.map((f,n) => `<div class="issue sev-${f.sev}" data-para="${f.para!=null?f.para:""}" data-target="${f.target||""}"><div class="ih"><span>${esc(f.type)}</span><span>${f.sev==="error"?"Error":f.sev==="warn"?"Warning":"Suggestion"}</span></div><div class="im">${esc(f.msg)}</div>${f.target?`<div class="ia"><button>Open that section</button></div>`:""}</div>`).join("") : `<p class="small muted">No coherence issues found in this section. ✓</p>`}
    <h4 style="margin-top:16px">Whole-document consistency</h4>
    ${docConsistency(at)}
    <p class="small muted" style="margin-top:14px">These are heuristics: shared vocabulary between paragraphs, transitions, paragraph length, cross-references and repeated phrases. Use the AI review tab for a reading of the argument itself.</p>`;
  const paras = paragraphs().filter(p => p.text.trim() && !p.isList && !/^Table \d/.test(p.text) && !/^Figure \d/.test(p.text));
  box.querySelectorAll(".issue").forEach(el => el.addEventListener("click", ev => {
    if (el.dataset.target) { openSection(el.dataset.target); return; }
    const p = paras[+el.dataset.para]; if (p && p.el) { p.el.scrollIntoView({ block: "center", behavior: "smooth" }); p.el.classList.add("flash"); setTimeout(() => p.el.classList.remove("flash"), 1600); }
  }));
}
function docConsistency(at){
  const all = Object.values(at).map(x => x.text).join("\n");
  const rows = [];
  const wb = (all.match(/\bwellbeing\b/gi)||[]).length, wbh = (all.match(/\bwell-being\b/gi)||[]).length;
  rows.push([wbh === 0, `Spelling of wellbeing: ${wb}× “wellbeing”, ${wbh}× “well-being”`]);
  const w18 = /Whitehead et al\.?,? \(?2018/.test(all), w19 = /Whitehead et al\.?,? \(?2019/.test(all);
  rows.push([!(w18 && w19), `Whitehead et al. cited as ${[w18&&"2018", w19&&"2019"].filter(Boolean).join(" and ") || "—"}`]);
  const up5 = (all.match(/up to (five|5)\b/gi)||[]).length;
  rows.push([up5 === 0, `Psychologist numbers: ${up5}× “up to five” (ethics form: minimum 5)`]);
  if (at.title && at.abstract) {
    const ttl = DS.textOf(at.title.html).toLowerCase(), abs = at.abstract.text.toLowerCase();
    const keys = ttl.split(/[^a-z]+/).filter(k => k.length > 5);
    const miss = keys.filter(k => !abs.includes(k.slice(0, -1)));
    rows.push([miss.length === 0, miss.length ? `Title words missing from the abstract: ${miss.join(", ")}` : "All key title words appear in the abstract"]);
  }
  if (NS !== "-ethics") {
    const ch4 = Object.values(at).filter(x => x.num && x.num.startsWith("4.")).map(x => x.text).join(" ");
    ["RQ1","RQ2","RQ3"].forEach(r => rows.push([ch4.includes(r), `${r} is ${ch4.includes(r) ? "" : "not "}referenced in Chapter 4`]));
  }
  const amp = (all.match(/\b[A-Z][a-z]+ & [A-Z][a-z]+/g)||[]).length;
  rows.push([amp === 0, `${amp} citation(s) use “&”`]);
  return `<ul style="list-style:none;padding:0;margin:0;display:grid;gap:6px;font-size:.84rem">${rows.map(r => `<li><span style="color:${r[0]?"var(--ok)":"var(--bad)"}">${r[0]?"✓":"✗"}</span> ${esc(r[1])}</li>`).join("")}</ul>`;
}
function titleChecks(){
  const v = $("#titleInput").value.trim(), TK = window.TitleKit;
  if (!TK) return "";
  const sc = TK.score(v), col = sc >= 80 ? "var(--ok)" : sc >= 60 ? "var(--gold)" : "var(--bad)";
  const ethicsTitle = "Well-Being and Responsibility after Techno-Solutionism: News Discourse on AI Chatbots and the Indonesian Case";
  const same = v.toLowerCase().replace(/[^a-z]/g, "") === ethicsTitle.toLowerCase().replace(/[^a-z]/g, "");
  return `<div class="coh-score"><div class="num" style="color:${col}">${sc}</div><div class="small">title score / 100<br><span class="muted">Click ✦ beside the title for supervisor questions and alternative titles</span></div></div>
  <h4>Title checks</h4><ul style="list-style:none;padding:0;margin:0 0 12px;display:grid;gap:6px;font-size:.86rem">${TK.checks(v).map(c => `<li title="${esc(c.tip)}"><span style="color:${c.ok?"var(--ok)":"var(--bad)"}">${c.ok?"✓":"✗"}</span> ${esc(c.label)}</li>`).join("")}</ul>
  ${NS === "-ethics" ? (() => { const upT = window.DocStore ? window.DocStore.title() : ""; const ok = upT && v.toLowerCase().replace(/[^a-z]/g, "") === upT.toLowerCase().replace(/[^a-z]/g, ""); return `<div class="callout ${ok ? "teal" : "warn"} small"><p>${ok ? "Matches the upgrade document title ✓" : "The upgrade document uses a different title: <em>“" + esc(upT) + "”</em>. Make both match before submission."}</p></div>`; })() : NS ? "" : `<div class="callout ${same ? "teal" : "warn"} small"><p>${same ? "Matches the ethics form title ✓" : "The ethics form uses a different title: <em>“" + esc(ethicsTitle) + "”</em>. Make both match before submission."}</p></div>`}`;
}

// ------------------------------------------------------------ score
function buildD(){
  const at = allTexts();
  const byPrefix = p => Object.values(at).filter(x => x.num && (x.num === p || x.num.startsWith(p.endsWith(".") ? p : p + ".") || x.num === p));
  const rqId = CFG.rqSection || "s1-7";
  const rqLine = n => { const m = (at[rqId] ? at[rqId].text : "").match(new RegExp("RQ" + n + "\\.?\\s*([^\\n]+)")); return m ? m[1] : ""; };
  return {
    t: id => at[id] ? at[id].text : "",
    ch: p => byPrefix(p).map(x => x.text).join("\n"),
    all: () => Object.values(at).map(x => x.text).join("\n"),
    rq: rqLine,
    paras: id => at[id] ? at[id].text.split("\n").map(s => s.trim()).filter(Boolean) : [],
    overlap: (a, b) => { const A = CK.shingles(byPrefix(a).map(x=>x.text).join("\n"), 6), B = CK.shingles(byPrefix(b).map(x=>x.text).join("\n"), 6); let n = 0; A.forEach(s => { if (B.has(s)) n++; }); return n; },
    figuresIn: p => byPrefix(p).reduce((a,x) => a + (x.html.match(/<figure/g)||[]).length, 0),
    words: p => byPrefix(p).reduce((a,x) => a + CK.words(x.text).length, 0),
    revisedShare: p => { const xs = ordered().filter(x => x.num && (x.num + ".").startsWith(p)); return xs.length ? xs.filter(x => x.revised).length / xs.length : 0; },
    done: id => { const x = at[id]; return !!x && CK.words(x.text).length >= 120 && !/Prompt:/.test(x.text); },
    count: (re, p) => ((p ? byPrefix(p).map(x => x.text).join("\n") : Object.values(at).map(x => x.text).join("\n")).match(re) || []).length,
    totalWords: () => Object.values(at).reduce((a,x) => a + CK.words(x.text).length, 0),
  };
}
function renderScore(){
  const ovr = wrStore.get(OVR_KEY, {});
  const R = CK.scoreRubric(buildD(), ovr, CFG.rubric, CFG.verdict, { critical: isCritical(), gentle: isGentle() });
  const sc = R.overall; lastR = R;
  wrStore.set("wr-last-score" + NS, { score: Math.round(sc * 10) / 10, base: Math.round(R.base * 10) / 10, target: Math.round(R.target * 10) / 10, verdict: R.verdict, t: Date.now() });
  try { Cheer.onScore(sc); } catch(e){}
  if (!$("#p-future").hidden) renderFuture();
  $("#liveScore").textContent = sc.toFixed(1);
  $("#liveScore").style.color = sc > R.base + 0.05 ? "var(--ok)" : "";
  $("#sFill").style.width = (sc*10) + "%"; $("#sBase").style.left = (R.base*10) + "%"; $("#sTarget").style.left = (R.target*10) + "%";
  $("#sFrom").textContent = "draft " + R.base.toFixed(1); $("#sTargetNum").textContent = R.target.toFixed(1);
  $("#verdict").textContent = R.verdict; $("#verdict").classList.toggle("ok", sc >= 7.5);
  $("#p-score").innerHTML = `
    <div class="coh-score"><div class="num">${sc.toFixed(1)}</div><div class="small"><b>${esc(R.verdict)}</b><br><span class="muted">draft ${R.base.toFixed(1)} (${esc(R.baseVerdict)}) → target ${R.target.toFixed(1)} (${esc(R.targetVerdict)})</span></div></div>
    <p class="small muted">Each criterion moves from its draft score towards its target as its checks pass. Drag a slider to set your own score after a supervisor reading.</p>
    ${R.rows.map(r => `
      <div class="crit">
        <div class="cn"><span>${esc(r.name)}</span><span class="muted">${r.w}%</span></div>
        <div class="cs"><div class="cb"><i style="width:${r.live*10}%;background:${r.live > r.base + .01 ? "var(--ok)" : "var(--accent)"}"></i><span class="b" style="left:${r.base*10}%"></span><span class="t" style="left:${r.target*10}%"></span></div>
          <span><b style="color:var(--ink)">${r.live.toFixed(1)}</b> / ${r.target.toFixed(1)}${r.overridden ? " (manual)" : ""}</span></div>
        <details><summary>${r.passed}/${r.checks.length} checks · ${esc(r.note)}</summary>
          <ul>${r.checks.map(c => `<li><span class="${c.ok?"ok":"no"}">${c.ok?"✓":"✗"}</span><span>${esc(c.label)}</span>${c.section ? `<a data-go="${c.section}">Go →</a>` : ""}</li>`).join("")}</ul>
          <div class="ov"><span class="small muted">Manual</span><input type="range" min="0" max="10" step="0.5" value="${r.live.toFixed(1)}" data-k="${r.k}" aria-label="Manual score for ${esc(r.name)}"><button class="btn ghost" data-reset="${r.k}" style="font-size:.7rem;padding:2px 8px">auto</button></div>
        </details>
      </div>`).join("")}`;
  const open = renderScore._open || new Set();
  $("#p-score").querySelectorAll("details").forEach((d,i) => { if (open.has(i)) d.open = true; d.addEventListener("toggle", () => { d.open ? open.add(i) : open.delete(i); renderScore._open = open; }); });
  $("#p-score").querySelectorAll("[data-go]").forEach(a => a.addEventListener("click", () => openSection(a.dataset.go)));
  $("#p-score").querySelectorAll("input[type=range]").forEach(s => s.addEventListener("change", () => { const o = wrStore.get(OVR_KEY, {}); o[s.dataset.k] = +s.value; wrStore.set(OVR_KEY, o); renderScore(); }));
  $("#p-score").querySelectorAll("[data-reset]").forEach(b => b.addEventListener("click", () => { const o = wrStore.get(OVR_KEY, {}); delete o[b.dataset.reset]; wrStore.set(OVR_KEY, o); renderScore(); }));
}

// ------------------------------------------------------------ figures
function figCountBefore(){
  let n = 0;
  for (const s of ordered()) { if (s.id === current) break; n += ((s.html||"").match(/<figure/g)||[]).length; }
  return n;
}
function renderFigs(){
  $("#figList").innerHTML = FIG.map(f => `
    <div class="figitem"><img src="${f.uri}" alt="${esc(f.title)}" loading="lazy"><h5>${esc(f.title)}</h5><p>Fits: ${esc(f.fits)}</p>
      <div class="acts"><button class="primary" data-ins="${f.id}">Insert</button><button data-png="${f.id}">PNG</button><button data-svg="${f.id}">SVG</button></div></div>`).join("");
  $("#figList").querySelectorAll("[data-ins]").forEach(b => b.addEventListener("click", () => insertFigure(b.dataset.ins)));
  $("#figList").querySelectorAll("[data-png]").forEach(b => b.addEventListener("click", async () => { const f = FIG.find(x => x.id === b.dataset.png); download("Figure_" + f.id + ".png", await svgToPng(f.uri, 3), true); }));
  $("#figList").querySelectorAll("[data-svg]").forEach(b => b.addEventListener("click", () => { const f = FIG.find(x => x.id === b.dataset.svg); download("Figure_" + f.id + ".svg", new Blob([f.svg], { type: "image/svg+xml" })); }));
}
function insertFigure(id){
  if (isTitle()) { toast("Figures cannot go in the title"); return; }
  const f = FIG.find(x => x.id === id);
  ed.focus(); restoreSel();
  if (!ed.contains(getSelection().anchorNode)) { const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); selectRange(r); }
  document.execCommand("insertHTML", false, `<figure contenteditable="false" data-fig="${f.id}"><img src="${f.uri}" alt="${esc(f.title)}"></figure><p class="caption"><strong>Figure 0.</strong> ${esc(f.caption)}</p><p><br></p>`);
  renumberLocal(); scheduleSave(); toast("Figure inserted. Captions renumbered.");
}
function renumberLocal(){
  let n = figCountBefore();
  ed.querySelectorAll("p.caption strong").forEach(s => { if (/^Figure \d+\.?$/.test(s.textContent.trim())) s.textContent = "Figure " + (++n) + "."; });
  // later sections
  const st = DS.state(); let after = false, changed = false;
  ordered().forEach(s => {
    if (s.id === current) { after = true; return; }
    if (!after || !/<figure/.test(s.html)) return;
    const d = document.createElement("div"); d.innerHTML = s.html;
    d.querySelectorAll("p.caption strong").forEach(x => { if (/^Figure \d+\.?$/.test(x.textContent.trim())) x.textContent = "Figure " + (++n) + "."; });
    if (d.innerHTML !== s.html) { st.sections[s.id] = Object.assign({}, st.sections[s.id] || {}, { html: d.innerHTML, updated: Date.now() }); changed = true; }
  });
  if (changed) DS.save(st);
}
function svgToPng(uri, scale){
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = img.naturalWidth * scale; c.height = img.naturalHeight * scale; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0,0,c.width,c.height); x.drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => res(b), "image/png"); };
    img.onerror = rej; img.src = uri;
  });
}
function blobToDataURL(b){ return new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); }

// ------------------------------------------------------------ compare & history
function diffWords(a, b){
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/);
  if (A.length * B.length > 9e6) return `<p class="muted">Section too long for a word diff.</p>`;
  const n = A.length, m = B.length, dp = new Uint32Array((n+1)*(m+1));
  for (let i = n-1; i >= 0; i--) for (let j = m-1; j >= 0; j--) dp[i*(m+1)+j] = A[i] === B[j] ? dp[(i+1)*(m+1)+j+1] + 1 : Math.max(dp[(i+1)*(m+1)+j], dp[i*(m+1)+j+1]);
  let i = 0, j = 0, out = "";
  while (i < n && j < m) {
    if (A[i] === B[j]) { out += esc(A[i]); i++; j++; }
    else if (dp[(i+1)*(m+1)+j] >= dp[i*(m+1)+j+1]) { out += `<del>${esc(A[i])}</del>`; i++; }
    else { out += `<ins>${esc(B[j])}</ins>`; j++; }
  }
  while (i < n) out += `<del>${esc(A[i++])}</del>`;
  while (j < m) out += `<ins>${esc(B[j++])}</ins>`;
  return out;
}
function modal(title, html){ $("#modalTitle").textContent = title; $("#modalBody").innerHTML = html; $("#modal").showModal(); }
$("#modalClose").addEventListener("click", () => $("#modal").close());
function showCompare(){
  const o = DS.original(current);
  if (!o) { toast("New section: nothing to compare with"); return; }
  const a = DS.textOf(o.html), b = editorText();
  const wa = CK.words(a).length, wb = CK.words(b).length;
  modal("Compare with original · " + label(DS.get(current)), `<p class="small muted">Original ${wa} words → now ${wb} words (${wb-wa >= 0 ? "+" : ""}${wb-wa}). <del>Removed</del> · <ins>Added</ins></p><div class="diff">${diffWords(a, b)}</div>`);
}
function showHistory(){
  flushSave(true);
  const h = (DS.state().history || {})[current] || [];
  const rows = h.slice().reverse().map((v, k) => `<li><span>${new Date(v.t).toLocaleString()} · ${CK.words(DS.textOf(v.html)).length} words</span><span><button class="btn ghost" data-prev="${h.length-1-k}" style="font-size:.75rem;padding:3px 10px">Preview</button> <button class="btn" data-rest="${h.length-1-k}" style="font-size:.75rem;padding:3px 10px">Restore</button></span></li>`).join("");
  modal("Version history · " + label(DS.get(current)), h.length ? `<p class="small muted">A snapshot is kept every couple of minutes while you edit (up to 15 per section).</p><ul class="hist" style="list-style:none;padding:0;margin:0">${rows}</ul><div id="histPrev" style="margin-top:14px"></div>` : `<p class="muted">No saved versions yet. Edit the section and they appear here.</p>`);
  $("#modalBody").querySelectorAll("[data-prev]").forEach(b => b.addEventListener("click", () => { $("#histPrev").innerHTML = `<div class="diff">${diffWords(DS.textOf(h[+b.dataset.prev].html), editorText())}</div><p class="small muted">Diff from that version to now.</p>`; }));
  $("#modalBody").querySelectorAll("[data-rest]").forEach(b => b.addEventListener("click", () => {
    const v = h[+b.dataset.rest];
    if (isTitle()) { const ta = document.createElement("textarea"); ta.innerHTML = v.html; $("#titleInput").value = ta.value; updateTitlePreview(); } else ed.innerHTML = v.html;
    persist(current, { html: v.html }); $("#modal").close(); runChecks(true); renderSide(); toast("Version restored");
  }));
}

// ------------------------------------------------------------ find & replace
function findRanges(){
  const q = $("#findIn").value; if (!q || isTitle()) return [];
  const model = textModel(), cs = $("#findCase").checked;
  const hay = cs ? model.text : model.text.toLowerCase(), nd = cs ? q : q.toLowerCase();
  const out = []; let i = 0;
  while ((i = hay.indexOf(nd, i)) >= 0) { const r = rangeFor(model, i, q.length); if (r) out.push(r); i += Math.max(1, q.length); }
  return out;
}
function paintFind(){ if (!(window.CSS && CSS.highlights)) return; const rs = findRanges(); CSS.highlights.delete("find-hit"); if (rs.length) CSS.highlights.set("find-hit", new Highlight(...rs)); $("#findCount").textContent = $("#findIn").value ? rs.length + " found" : ""; }
function clearFind(){ if (window.CSS && CSS.highlights) CSS.highlights.delete("find-hit"); $("#findCount").textContent = ""; }
let findPos = 0;
$("#findIn").addEventListener("input", () => { findPos = 0; paintFind(); });
$("#findCase").addEventListener("change", paintFind);
$("#findNext").addEventListener("click", () => { const rs = findRanges(); if (!rs.length) return; findPos = findPos % rs.length; ed.focus(); selectRange(rs[findPos++]); });
$("#replOne").addEventListener("click", () => {
  const s = getSelection(), q = $("#findIn").value;
  const sel = s.rangeCount ? s.toString() : "";
  if (q && (sel === q || (!$("#findCase").checked && sel.toLowerCase() === q.toLowerCase()))) { document.execCommand("insertText", false, $("#replIn").value); scheduleSave(); }
  $("#findNext").click(); paintFind();
});
$("#replAll").addEventListener("click", () => {
  const q = $("#findIn").value, rep = $("#replIn").value; if (!q) return;
  let total = 0;
  if ($("#findAll").checked) {
    if (!confirm(`Replace every “${q}” with “${rep}” in ALL sections? (Each section keeps a history snapshot.)`)) return;
    flushSave(true);
    const flags = $("#findCase").checked ? "g" : "gi", re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    ordered().forEach(s => {
      if (s.id === current) return;
      const d = document.createElement("div"); d.innerHTML = s.html; let n = 0;
      const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT); let t;
      while ((t = w.nextNode())) { const v = t.nodeValue.replace(re, () => { n++; return rep; }); if (n) t.nodeValue = v; }
      if (n) { persist(s.id, { html: d.innerHTML }); total += n; }
    });
  }
  const rs = findRanges().reverse();
  rs.forEach(r => { selectRange(r); document.execCommand("insertText", false, rep); total++; });
  scheduleSave(); paintFind(); renderSide(); toast(total + " replaced");
});

// ------------------------------------------------------------ AI prompt
function renderAI(){
  const whole = $("#aiWhole").checked;
  const rub = (CFG.rubric || CK.RUBRIC).map(c => `- ${c.name} (${c.w}%): draft ${c.base.toFixed(1)}, target ${c.target.toFixed(1)}. ${c.note}`).join("\n");
  const body = whole ? ordered().map(s => `## ${label(s)}\n${s.id === current ? editorText() : DS.textOf(s.html)}`).join("\n\n") : `## ${label(DS.get(current) || {heading:""})}\n${editorText()}`;
  $("#aiPrompt").value = `You are an experienced ${CFG.examiner || "PhD upgrade examiner"} in Media, Communications and Cultural Studies at a UK university (Goldsmiths). Review the ${whole ? (CFG.docLabel || "upgrade document") : "section"} below.

Project: "${DS.textOf((DS.get("title")||{}).html || "")}"

Rubric (weight, draft score, target, panel note):
${rub}

Please give:
1. Three strengths.
2. The three most important problems for coherence and argument (logic, links between paragraphs, alignment with the research questions, and how far theory is carried into method), each with a concrete fix.
3. Line edits for grammar, register and concision (UK English, Goldsmiths Harvard citations), as "original → revised".
4. A score out of 10 for each rubric criterion this text touches, with one sentence of justification.

Text:
${body}`;
}
$("#aiWhole").addEventListener("change", renderAI);
$("#aiCopy").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("#aiPrompt").value); toast("Prompt copied"); } catch(e) { $("#aiPrompt").select(); document.execCommand("copy"); toast("Prompt copied"); } });

// ------------------------------------------------------------ panel tabs
function switchTab(p){ document.querySelectorAll(".ptabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.p === p)); ["future","checks","coh","score","figs","ai"].forEach(k => $("#p-"+k).hidden = k !== p); wrStore.set("wr-studio-tab-v2", p); if (p === "future") renderFuture(); }
document.querySelectorAll(".ptabs button").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.p)));

// ------------------------------------------------------------ export / import
function download(name, data, isBlob){ const b = isBlob || data instanceof Blob ? data : new Blob([data], { type: "text/plain;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
async function docHtml(forWord){
  flushSave(true);
  let html = "", chap = null;
  for (const s of ordered()) {
    if (s.id === "title") continue;
    if (s.chapter !== chap && /^Chapter/.test(s.chapter)) { chap = s.chapter; html += `<h1>${esc(s.chapter.replace(" · ", " "))}</h1>`; }
    else if (s.chapter !== chap) chap = s.chapter;
    const oq = (DS.original(s.id) || {}).q || s.q; html += `<h2>${esc((s.num ? s.num + " " : "") + s.heading)}</h2>` + (oq ? `<p><i>${esc(oq)}</i></p>` : "") + s.html;
  }
  if (forWord) {
    const d = document.createElement("div"); d.innerHTML = html;
    for (const img of d.querySelectorAll("figure img")) { try { img.src = await blobToDataURL(await svgToPng(img.src, 2)); img.removeAttribute("loading"); } catch(e){} }
    d.querySelectorAll("figure").forEach(f => { const p = document.createElement("p"); p.setAttribute("align","center"); p.innerHTML = f.innerHTML; f.replaceWith(p); });
    html = d.innerHTML;
  }
  const title = DS.textOf(DS.get("title").html);
  return `<!doctype html><html${forWord ? ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"' : ""}><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;max-width:46em;margin:2em auto}h1{font-size:16pt;margin-top:2em}h2{font-size:13pt;margin-top:1.4em}table{border-collapse:collapse;width:100%;font-size:10pt}td,th{border:1px solid #000;padding:4px;vertical-align:top}th{background:#eee}p.caption{font-size:10pt}figure{text-align:center;margin:1em 0}img{max-width:100%}</style></head>
<body><p style="font-size:18pt;font-weight:bold;text-align:center">${esc(title)}</p><p style="text-align:center">${esc(CFG.subtitle || "PhD Upgrade Document")} · Oktifani Winarti · Goldsmiths, University of London</p>${html}</body></html>`;
}
document.querySelectorAll("#exportMenu [data-exp]").forEach(b => b.addEventListener("click", async () => {
  $("#exportMenu").classList.remove("open");
  const day = new Date().toISOString().slice(0,10), kind = b.dataset.exp;
  if (kind === "doc") { toast("Preparing Word file…"); download(`${CFG.filePrefix || "Upgrade_Document_revised"}_${day}.doc`, new Blob([await docHtml(true)], { type: "application/msword" })); }
  if (kind === "html") download(`${CFG.filePrefix || "Upgrade_Document_revised"}_${day}.html`, new Blob([await docHtml(false)], { type: "text/html" }));
  if (kind === "txt") { flushSave(true); download(`${CFG.filePrefix || "Upgrade_Document_revised"}_${day}.txt`, ordered().map(s => (s.num ? s.num + " " : "") + s.heading.toUpperCase() + "\n\n" + DS.textOf(s.html)).join("\n\n\n")); }
  if (kind === "json") { flushSave(true); download(`${CFG.backupPrefix || "upgrade-edits-backup"}_${day}.json`, new Blob([JSON.stringify({ app: "wr-studio", doc: NS || "upgrade", saved: Date.now(), state: DS.state(), overrides: wrStore.get(OVR_KEY, {}), reflect: wrStore.get("wr-reflect" + NS, {}), ignore: wrStore.get("wr-ignore" + NS, {}), muse: (window.Muse ? window.Muse.choice() : "mix"), momentum: (() => { try { return JSON.parse(localStorage.getItem("wr-momentum") || "null"); } catch (e) { return null; } })() }, null, 1)], { type: "application/json" })); }
  if (kind === "site") {
    flushSave(true);
    const secs = ordered().map(s => ({ id: s.id, num: s.num, heading: s.heading, chapter: s.chapter, kind: s.kind || "rich", html: s.html }));
    const sf = CFG.siteFile || "upgrade-text.js", sv = CFG.siteVar || "UPGRADE_DOC";
    secs.forEach((x, i) => { const o = ordered()[i]; if (o && o.from) x.from = o.from; });
    download(sf, "// Document text, split into sections (exported from the studio " + day + ").\nwindow." + sv + " = " + JSON.stringify({ version: "revised " + day, sections: secs }) + ";\n");
    toast("Replace assets/" + sf + " in the repo with this file");
  }
}));
$("#exportBtn").addEventListener("click", e => { e.stopPropagation(); $("#exportMenu").classList.toggle("open"); });
document.addEventListener("click", e => { if (!e.target.closest("#exportMenu")) $("#exportMenu").classList.remove("open"); });
$("#importBtn").addEventListener("click", () => $("#importFile").click());
$("#importFile").addEventListener("change", async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (j.app !== "wr-studio" || !j.state || typeof j.state.sections !== "object") throw new Error("That file is not a studio backup");
    if ((j.doc || "upgrade") !== (NS || "upgrade")) throw new Error("This backup belongs to the " + (j.doc || "upgrade") + " studio");
    if (!confirm("Replace all edits in this browser with the backup?")) return;
    DS.save(j.state); if (j.overrides) wrStore.set(OVR_KEY, j.overrides);
    if (j.reflect) wrStore.set("wr-reflect" + NS, j.reflect); if (j.ignore) wrStore.set("wr-ignore" + NS, j.ignore);
    if (j.muse && window.Muse) window.Muse.set(j.muse); if (j.momentum) { try { localStorage.setItem("wr-momentum", JSON.stringify(j.momentum)); } catch (e) {} }
    paintMuse();
    toast("Backup imported"); openSection(current || "title");
  } catch (err) { toast(err.message || "That file is not a studio backup"); }
  e.target.value = "";
});

// ------------------------------------------------------------ section manager
function chapterNo(ch){ const m = /^Chapter (\d+)/.exec(ch || ""); return m ? +m[1] : null; }
function suggestNum(after){
  const all = ordered(), nums = new Set(all.map(x => x.num).filter(Boolean));
  if (!after || !after.num) return "";
  const parts = after.num.split(".");
  if (parts.length === 2) { const c = parts[0] + "." + (+parts[1] + 1); if (!nums.has(c)) return c; }
  for (let k = 1; k < 20; k++) { const c = after.num + "." + k; if (!nums.has(c)) return c; }
  return "";
}
function setOrderAfter(newId, afterId){
  const ids = ordered().map(x => x.id).filter(x => x !== newId);
  const k = ids.indexOf(afterId); ids.splice(k < 0 ? ids.length : k + 1, 0, newId);
  const st = DS.state(); st.order = ids; DS.save(st);
}
function sectionForm(mode, opts){
  opts = opts || {};
  flushSave(true);
  const cur = DS.get(opts.base || current), all = ordered();
  const chapters = [...new Set(all.map(x => x.chapter))];
  const maxCh = Math.max(0, ...chapters.map(chapterNo).filter(n => n != null));
  modal(opts.titleText || (mode === "dup" ? "Duplicate section" : "New section"), `
    <div class="form-grid">
      <label>Heading <input type="text" id="nfHead" value="${mode === "dup" ? esc(cur.heading + " (copy)") : ""}" placeholder="e.g. Worked example: one Guardian article"></label>
      <div class="row">
        <label>Number <input type="text" id="nfNum" value="${esc(opts.num != null ? opts.num : suggestNum(cur))}" placeholder="e.g. 4.9 (optional)"></label>
        <label>Where
          <select id="nfWhere">
            <option value="after">${opts.sub ? "Inside" : "Right after"} “${esc(label(cur)).slice(0,40)}”</option>
            ${chapters.filter(c => /^Chapter|Back matter/.test(c)).map(c => `<option value="end:${esc(c)}">At the end of ${esc(c)}</option>`).join("")}
            <option value="newch">As a new chapter…</option>
          </select></label>
      </div>
      <label id="nfChWrap" hidden>New chapter title <input type="text" id="nfCh" placeholder="e.g. Findings: The Guardian"></label>
      ${mode === "dup" ? "" : `<label>Start with
        <select id="nfStart">
          <option value="blank">A blank page</option>
          <option value="outline">An outline (claim, evidence, so what)</option>
          <option value="worked">A worked-example template (van Dijk’s four levels)</option>
          <option value="copy">A copy of the current section</option>
        </select></label>`}
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" type="button" id="nfCancel">Cancel</button><button class="btn" type="button" id="nfOk">${mode === "dup" ? "Duplicate" : "Create section"}</button></div>
    </div>`);
  if (opts.where) { $("#nfWhere").value = opts.where; if (opts.where.startsWith("end:")) { const ch = opts.where.slice(4), inCh = ordered().filter(x => x.chapter === ch && x.num); const last = inCh[inCh.length - 1]; const n = chapterNo(ch); $("#nfNum").value = last && last.num.split(".").length === 2 ? last.num.split(".")[0] + "." + (+last.num.split(".")[1] + 1) : (n ? n + ".1" : ""); } }
  $("#nfWhere").addEventListener("change", e => { $("#nfChWrap").hidden = e.target.value !== "newch"; if (e.target.value === "newch") $("#nfNum").value = (maxCh + 1) + ".1"; });
  $("#nfCancel").addEventListener("click", () => $("#modal").close());
  setTimeout(() => $("#nfHead").focus(), 50);
  $("#nfOk").addEventListener("click", () => {
    const heading = $("#nfHead").value.trim(); if (!heading) { $("#nfHead").focus(); toast("Give the section a heading"); return; }
    const num = $("#nfNum").value.trim(), where = $("#nfWhere").value;
    if (num && ordered().some(x => x.num === num)) { toast("§" + num + " already exists. Pick another number."); return; }
    let chapter = cur.chapter, afterId = opts.afterId || cur.id;
    if (where.startsWith("end:")) { chapter = where.slice(4); const inCh = ordered().filter(x => x.chapter === chapter); afterId = inCh.length ? inCh[inCh.length - 1].id : current; }
    if (where === "newch") {
      const title = ($("#nfCh").value.trim() || heading);
      chapter = "Chapter " + (maxCh + 1) + " · " + title;
      const lastCh = ordered().filter(x => /^Chapter/.test(x.chapter)); afterId = lastCh.length ? lastCh[lastCh.length - 1].id : current;
    } else if (where === "after" && /^Front matter/.test(chapter) && current !== "abstract") chapter = cur.chapter;
    const start = mode === "dup" ? "copy" : $("#nfStart").value;
    const TPL = {
      blank: "<p><br></p>",
      outline: "<p><strong>Claim.</strong> State the point of this section in one sentence.</p><p><strong>Evidence.</strong> What supports it (literature, data, examples)?</p><p><strong>So what.</strong> What does this mean for your research questions?</p>",
      worked: "<p>This section demonstrates the four-level protocol (Section 4.3) on one article from each corpus.</p><h3>Article</h3><p>Headline, outlet, date.</p><h3>1. Thematic structure</h3><p>Macroproposition:</p><h3>2. Schematic structure</h3><p>Where wellbeing, users and chatbots sit (summary / episode / comment):</p><h3>3. Local coherence</h3><p>How a single case becomes a trend:</p><h3>4. Style and syntax</h3><p>Who acts, who is quoted, what is assumed, what is left unsaid:</p><p><strong>Where responsibility is placed:</strong></p>",
      copy: ed.innerHTML || cur.html
    };
    const id = "c" + Date.now().toString(36);
    const st = DS.state(); st.added = st.added || [];
    st.added.push({ id, num, heading, chapter, kind: "rich", custom: true, after: afterId, html: TPL[start] || TPL.blank });
    DS.save(st); setOrderAfter(id, afterId);
    $("#modal").close(); openSection(id); toast("Section created ✓");
  });
}
function pullFromUpgrade(){
  const s = DS.get(current); if (!s || !s.from || !window.DocStore || window.DocStore === DS) return;
  const up = window.DocStore.get(s.from); if (!up) { toast("That upgrade section no longer exists"); return; }
  if (!confirm("Replace this section with the latest version of “" + label(up) + "” from the upgrade studio? Your current text stays in History.")) return;
  flushSave(true);
  const st = DS.state(); st.history = st.history || {}; (st.history[current] = st.history[current] || []).push({ t: Date.now() - 1, html: s.html }); DS.save(st);
  ed.innerHTML = up.html; persist(current, { html: up.html }); runChecks(true); renderSide(); toast("Pulled the latest upgrade text ✓");
}
function addSubsection(parentId){
  const parent = DS.get(parentId); if (!parent || !parent.num) return;
  const all = ordered(), nums = new Set(all.map(x => x.num).filter(Boolean));
  let k = 1; while (nums.has(parent.num + "." + k)) k++;
  // place after the parent's last existing descendant
  const pi = all.findIndex(x => x.id === parentId); let last = parent;
  for (let i = pi + 1; i < all.length; i++) { if ((all[i].num || "").startsWith(parent.num + ".")) last = all[i]; else break; }
  sectionForm("add", { base: parentId, num: parent.num + "." + k, afterId: last.id, sub: true, titleText: "New subsection under §" + parent.num });
}
function reuseSection(id){
  const src = DS.get(id); if (!src) return;
  flushSave(true);
  const cur = DS.get(current), nid = "c" + Date.now().toString(36);
  const st = DS.state(); st.added = st.added || [];
  st.added.push({ id: nid, num: suggestNum(cur), heading: src.heading, chapter: cur.chapter, kind: "rich", custom: true, after: cur.id, html: src.html });
  DS.save(st); setOrderAfter(nid, cur.id); openSection(nid);
  toast("Reused a copy of “" + src.heading + "”. The original stays in the Archive.");
}
function deleteSection(id){
  const s = DS.get(id); if (!s || id === "title") return;
  const all = ordered(), k = all.findIndex(x => x.id === id);
  flushSave(true);
  const st = DS.state(); st.deleted = st.deleted || {}; st.deleted[id] = Date.now(); DS.save(st);
  const next = all[k + 1] || all[k - 1];
  openSection(next ? next.id : "title");
  toast("Archived “" + label(s) + "”", "Undo", () => restoreSection(id));
}
function restoreSection(id){ const st = DS.state(); if (st.deleted) delete st.deleted[id]; DS.save(st); openSection(id); toast("Section restored ✓"); }
function moveSection(dir){
  flushSave(true);
  const ids = ordered().map(x => x.id), k = ids.indexOf(current), j = k + dir;
  if (k < 0 || j < 1 || j >= ids.length) return;
  [ids[k], ids[j]] = [ids[j], ids[k]];
  const st = DS.state(); st.order = ids; DS.save(st);
  const list = ordered(), i = list.findIndex(x => x.id === current), prev = list[i - 1], nxt = list[i + 1];
  const neighbour = dir < 0 ? (nxt && nxt.chapter !== DS.get(current).chapter && prev && prev.chapter !== DS.get(current).chapter ? prev : null) : (prev && nxt && prev.chapter === nxt.chapter && prev.chapter !== DS.get(current).chapter ? prev : null);
  if (neighbour) persist(current, { chapter: neighbour.chapter });
  openSection(current); toast(dir < 0 ? "Moved up" : "Moved down");
}
document.querySelectorAll("#secActions button").forEach(b => b.addEventListener("click", () => {
  const a = b.dataset.sa;
  if (a === "add") sectionForm("add");
  if (a === "dup") sectionForm("dup");
  if (a === "up") moveSection(-1);
  if (a === "down") moveSection(1);
  if (a === "sub") addSubsection(current);
  if (a === "pull") pullFromUpgrade();
  if (a === "del") { if (confirm("Archive “" + label(DS.get(current)) + "”? It leaves the document but stays in the Archive at the bottom of the sidebar, where you can restore or reuse it.")) deleteSection(current); }
}));
$("#addSec").addEventListener("click", () => sectionForm("add"));

// ------------------------------------------------------------ import from Word (.docx)
function loadMammoth(){
  if (window.mammoth) return Promise.resolve(window.mammoth);
  return new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js"; sc.onload = () => res(window.mammoth); sc.onerror = () => rej(new Error("Could not load the Word reader (are you offline?)")); document.head.appendChild(sc); });
}
function cleanImported(html){
  const d = document.createElement("div"); d.innerHTML = html;
  d.querySelectorAll("img").forEach(img => { const src = img.getAttribute("src") || ""; if (!/^data:image\/(png|jpe?g|gif|svg\+xml);/.test(src)) { img.remove(); return; } const f = document.createElement("figure"); f.setAttribute("contenteditable","false"); const n = document.createElement("img"); n.src = src; n.alt = img.getAttribute("alt") || "Figure"; f.appendChild(n); (img.closest("p") || img).replaceWith(f); });
  const figs = [...d.querySelectorAll("figure")].map(f => f.outerHTML); d.querySelectorAll("figure").forEach((f,i) => f.replaceWith(document.createTextNode("\u0000FIG" + i + "\u0000")));
  let out = sanitize(d.innerHTML);
  out = out.replace(/\u0000FIG(\d+)\u0000/g, (m, i) => figs[+i] || "").replace(/<p>\s*<\/p>/g, "");
  return out;
}
const HEAD_RE = /^(?:Chapter\s+\d+\s+[^\d]{0,60}?\s+)?(\d+\.\d+(?:\.\d+)?)\.?\s+(.{2,140})$/;
function splitDocx(html){
  const d = document.createElement("div"); d.innerHTML = html;
  const nodes = [...d.children];
  const out = []; let cur = null, chapter = null, pre = [];
  const start = (num, heading, kind) => { cur = { num, heading, kind, chapter, html: "" }; out.push(cur); };
  nodes.forEach(n => {
    const txt = n.textContent.replace(/\s+/g, " ").trim();
    const isHead = /^H[1-4]$/.test(n.nodeName), short = txt.length < 160;
    const ch = /^Chapter\s+(\d+)\s*[:.\-–]?\s*(.*)$/i.exec(txt);
    if (ch && short && !HEAD_RE.test(txt)) { chapter = "Chapter " + ch[1] + (ch[2] ? " · " + ch[2].trim() : ""); return; }
    if (/^abstract$/i.test(txt)) return start("", "Abstract", "abstract");
    if (/^(references|bibliography|reference list)$/i.test(txt)) return start("", "References", "references");
    if (/^(appendix|appendices)\b/i.test(txt) && short) return start("", "Appendices", "appendices");
    const lead = n.firstElementChild && /^(STRONG|B)$/.test(n.firstElementChild.nodeName) && n.firstChild === n.firstElementChild ? n.firstElementChild : null;
    if (!isHead && lead && txt.length >= 160) { const mh = HEAD_RE.exec(lead.textContent.replace(/\s+/g, " ").trim()); if (mh) { start(mh[1], mh[2].trim(), "num"); lead.remove(); cur.html += n.outerHTML; return; } }
    let m = HEAD_RE.exec(txt);
    if (m && (isHead || short || n.querySelector("strong,b"))) {
      // heading merged with first paragraph (soft line break): split at <br> if present
      const br = n.querySelector("br");
      if (br && !isHead) {
        const headParts = []; let x = n.firstChild;
        while (x && x !== br) { headParts.push(x); x = x.nextSibling; }
        const mm = HEAD_RE.exec(headParts.map(h => h.textContent).join("").replace(/\s+/g, " ").trim());
        if (mm) { start(mm[1], mm[2].trim(), "num"); headParts.forEach(h => h.remove()); br.remove(); if (n.textContent.trim()) cur.html += n.outerHTML; return; }
      }
      if (isHead || short) return start(m[1], m[2].trim(), "num");
    }
    if (isHead && short && !cur) { pre.push(txt); return; }
    if (cur) cur.html += n.outerHTML; else if (txt) pre.push(txt);
  });
  const title = (() => { const lines = pre.filter(Boolean); if (!lines.length) return null; let t = lines[0]; if (/:$/.test(t) && lines[1]) t += " " + lines[1]; return t.length < 220 ? t : null; })();
  return { title, sections: out };
}
function matchTarget(imp, existing){
  if (imp.kind === "abstract") return "abstract";
  if (imp.kind === "references") return "references";
  if (imp.kind === "appendices") return "appendices";
  if (imp.num) { const e = existing.find(x => x.num === imp.num); if (e) return e.id; }
  const norm = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const e2 = existing.find(x => norm(x.heading) === norm(imp.heading) || (norm(imp.heading).length > 8 && norm(x.heading).startsWith(norm(imp.heading).slice(0, 18))));
  return e2 ? e2.id : "new";
}
$("#wordBtn").addEventListener("click", () => $("#wordFile").click());
$("#wordFile").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  toast("Reading " + f.name + "…");
  try {
    const mm = await loadMammoth();
    const res = await mm.convertToHtml({ arrayBuffer: await f.arrayBuffer() });
    // the ethics form has no numbered headings: match answers to the form's own questions instead
    const isForm = !!(window.FormImport && CFG.formImport);
    const parsed = isForm ? { sections: window.FormImport.parse(res.value, ordered()), title: null } : splitDocx(res.value);
    if (!parsed.sections.length) { toast(isForm ? "None of the ethics form’s questions were found. Is this the EAF1 form with its questions still in it?" : "No numbered headings found (e.g. “1.2 The Problem”). Use Word heading styles or numbered headings."); return; }
    flushSave(true);
    const existing = ordered();
    const rows = parsed.sections.map(sct => { const html = sct.kind === "title" ? sct.html : cleanImported(sct.html); return Object.assign(sct, { html, target: sct.id && existing.some(x => x.id === sct.id) ? sct.id : matchTarget(sct, existing), words: wcount(DS.textOf(html)) }); });
    if (parsed.title) rows.unshift({ num: "", heading: "Title", kind: "title", html: esc(parsed.title), target: "title", words: wcount(parsed.title), titleText: parsed.title });
    const opt = (sel) => `<option value="new" ${sel === "new" ? "selected" : ""}>➕ New section</option><option value="skip">— Skip —</option>` + existing.map(x => `<option value="${x.id}" ${sel === x.id ? "selected" : ""}>${esc(label(x)).slice(0, 48)}</option>`).join("");
    const bytes = rows.reduce((a, r) => a + r.html.length, 0);
    modal("Import from Word · " + f.name, `
      <p class="small muted" style="margin-top:0">${rows.length} parts found. Check where each one goes. Current versions are kept in each section’s History, so you can always go back.${bytes > 3e6 ? " <strong>This file has large images; browser storage may fill up. Consider removing images in Word first.</strong>" : ""}</p>
      <div class="table-wrap"><table class="imp-table"><thead><tr><th></th><th>From Word</th><th>Goes to</th><th>Words now → Word</th></tr></thead><tbody>
      ${rows.map((r, i) => { const ex = existing.find(x => x.id === r.target); const now = ex ? wcount(DS.textOf(ex.html)) : 0; const nz = t => t.replace(/[|\s\u00a0]+/g, " ").replace(/\s([,.;:])/g, "$1").trim(); const same = ex && nz(DS.textOf(ex.html)) === nz(DS.textOf(r.html)); return `<tr><td><input type="checkbox" data-row="${i}" ${same ? "" : "checked"}></td><td>${r.num ? "<b>" + esc(r.num) + "</b> " : ""}${esc(r.heading)}${same ? ' <span class="small muted">(unchanged)</span>' : ""}</td><td><select data-tgt="${i}">${opt(r.target)}</select></td><td>${ex ? now : "–"} → ${r.words}</td></tr>`; }).join("")}
      </tbody></table></div>
      ${res.messages && res.messages.length ? `<p class="small muted">${res.messages.length} formatting note(s) from Word were ignored (unusual styles).</p>` : ""}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn ghost" type="button" id="impCancel">Cancel</button><button class="btn" type="button" id="impOk">Import selected</button></div>`);
    $("#impCancel").addEventListener("click", () => $("#modal").close());
    $("#impOk").addEventListener("click", () => {
      let n = 0, created = 0, lastId = null;
      rows.forEach((r, i) => {
        if (!$(`[data-row="${i}"]`).checked) return;
        const tgt = $(`[data-tgt="${i}"]`).value; if (tgt === "skip") return;
        if (tgt === "new") {
          const id = "c" + Date.now().toString(36) + i;
          const st = DS.state(); st.added = st.added || [];
          const chapter = r.chapter || (lastId ? DS.get(lastId).chapter : "Chapter 4 · Methodology");
          st.added.push({ id, num: r.num, heading: r.heading, chapter, kind: "rich", custom: true, after: lastId || current, html: r.html || "<p><br></p>" });
          DS.save(st); setOrderAfter(id, lastId || current); lastId = id; created++; n++; return;
        }
        const ex = DS.get(tgt); if (!ex) return;
        const st = DS.state(); st.history = st.history || {}; (st.history[tgt] = st.history[tgt] || []).push({ t: Date.now() - 1, html: ex.html }); DS.save(st);
        const html = tgt === "title" ? esc(r.titleText || DS.textOf(r.html)) : r.html;
        persist(tgt, { html }); lastId = tgt; n++;
      });
      $("#modal").close(); openSection(current); toast(n + " part(s) imported" + (created ? " · " + created + " new section(s)" : "") + " ✓");
      try { Cheer.cheer("Imported from Word ✦", n + " sections updated. The checks and live score now reflect your Word edits."); } catch (err) {}
      setTimeout(() => { paintScopeChip(); const r = scopeReport(); if (r && r.changes.length) openScope("You just imported " + n + " part(s) from Word. Before you carry on, here is what the import changes about the project itself."); }, 400);
    });
  } catch (err) { toast("Couldn’t read that file: " + err.message); }
});

// ------------------------------------------------------------ focus music shortcut (Alt+M)
document.addEventListener("keydown", e => { if (e.altKey && (e.code === "KeyM")) { e.preventDefault(); try { Cheer.playMusic(); } catch (err) {} } });

// ------------------------------------------------------------ hover: pinpoint mistakes
let lastModel = null, issuesFresh = false, tipTimer = null, tipIssue = null;
const tip = $("#hoverTip");
const SKIP_HOVER = new Set(["long", "brackets", "quotes"]);
function caretFromPoint(x, y){
  if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p ? { node: p.offsetNode, offset: p.offset } : null; }
  if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r ? { node: r.startContainer, offset: r.startOffset } : null; }
  return null;
}
function issueAt(x, y){
  if (!issuesFresh || !lastModel || isTitle()) return null;
  const c = caretFromPoint(x, y); if (!c || c.node.nodeType !== 3) return null;
  const seg = lastModel.segs.find(sg => sg.node === c.node); if (!seg) return null;
  const gi = seg.start + c.offset;
  // make sure the pointer is really over text, not past the end of a line
  const r = document.createRange(); r.setStart(c.node, Math.max(0, c.offset - (c.offset >= c.node.length ? 1 : 0))); r.setEnd(c.node, Math.min(c.node.length, Math.max(1, c.offset + (c.offset >= c.node.length ? 0 : 1))));
  const b = r.getBoundingClientRect(); if (!b || x < b.left - 12 || x > b.right + 12 || y < b.top - 6 || y > b.bottom + 6) return null;
  return lastIssues.find(i => !SKIP_HOVER.has(i.rule) && gi >= i.index && gi <= i.index + i.length) || null;
}
function showTip(i, x, y){
  clearTimeout(tipTimer);
  if (tipIssue === i && !tip.hidden) return;
  tipIssue = i;
  const col = i.sev === "error" ? "var(--bad)" : i.sev === "warn" ? "var(--gold)" : "#4a7fbf";
  tip.style.setProperty("--c", col);
  tip.innerHTML = `<div class="ht-cat">${esc(i.cat)} · ${i.sev === "error" ? "Error" : i.sev === "warn" ? "Warning" : "Suggestion"}</div>
    <div style="margin-top:3px">${esc(i.msg)}</div>
    <div class="ht-fix"><code>${esc(i.match.length > 60 ? i.match.slice(0,60) + "…" : i.match)}</code>${i.fix != null ? ` → <code>${esc(i.fix === "" ? "(delete)" : i.fix)}</code>` : ""}</div>
    <div class="ht-acts">${i.fix != null ? `<button class="primary" data-a="fix">Apply</button>` : ""}<button data-a="sel">Select</button><button data-a="ign">Ignore</button></div>`;
  tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - 20)) + "px";
  tip.style.top = (y + 18 + h > innerHeight ? y - h - 14 : y + 18) + "px";
}
function hideTip(now){ clearTimeout(tipTimer); if (now) { tip.hidden = true; tipIssue = null; return; } tipTimer = setTimeout(() => { tip.hidden = true; tipIssue = null; }, 260); }
tip.addEventListener("mouseenter", () => clearTimeout(tipTimer));
tip.addEventListener("mouseleave", () => hideTip());
tip.addEventListener("click", e => {
  const a = e.target.dataset.a; if (!a || !tipIssue) return;
  const i = tipIssue; hideTip(true);
  if (a === "fix") applyFix(i);
  if (a === "sel") { const r = rangeFor(textModel(), i.index, i.length); if (r) { ed.focus(); selectRange(r); } }
  if (a === "ign") ignoreIssue(i);
});
function ignoreIssue(i){ const ign = wrStore.get("wr-ignore" + NS, {}); ign[current + "|" + i.rule + "|" + i.match] = 1; wrStore.set("wr-ignore" + NS, ign); runChecks(false); toast("Ignored for this section"); }

// ------------------------------------------------------------ hover: paragraph insights
const badge = $("#paraBadge"), card = $("#insightCard"), paper = $("#paper");
let badgePara = null, cardPara = null, badgeTimer = null, spin = 0, badgeSent = null, cardSent = null;
let magic = wrStore.get("wr-magic", "para");
function paintMagic(){ document.querySelectorAll("[data-magic]").forEach(b => b.setAttribute("aria-pressed", b.dataset.magic === magic)); if (magic !== "sent" && window.CSS && CSS.highlights) CSS.highlights.delete("sent-hover"); }
function setMagic(m){ magic = m; wrStore.set("wr-magic", m); paintMagic(); badgeSent = null; toast({ sent: "✦ Reviewing sentence by sentence", para: "✦ Reviewing paragraph by paragraph", sect: "✦ Reviewing the whole section. Click the ✦ at the top" }[m]); if (m === "sect") placeSectionBadge(); }
function placeSectionBadge(){ if (isTitle()) return; const first = [...ed.querySelectorAll("p, li, blockquote")].find(x => !x.closest("td,th,figure") && x.textContent.trim().length > 25); if (!first) return; badgePara = first; badgeSent = null; badge.style.top = (ed.getBoundingClientRect().top - paper.getBoundingClientRect().top + 8) + "px"; badge.title = "Review this whole section"; badge.hidden = false; if (window.CSS && CSS.highlights) CSS.highlights.delete("sent-hover"); }
document.querySelectorAll(".toolbar [data-magic]").forEach(b => b.addEventListener("mousedown", e => { e.preventDefault(); setMagic(b.dataset.magic); }));
paintMagic();
// sentences of a paragraph with absolute offsets in the text model
function sentencesIn(p, model){
  const segs = model.segs.filter(sg => p.contains(sg.node)); if (!segs.length) return [];
  const start = segs[0].start, end = segs[segs.length - 1].end, txt = model.text.slice(start, end);
  const out = []; let from = 0;
  (window.Paraphrase ? window.Paraphrase.sentences(txt) : [txt]).forEach(st => { const i = txt.indexOf(st, from); if (i < 0) return; out.push({ text: st, abs: start + i, len: st.length }); from = i + st.length; });
  return out;
}
function sentenceAt(x, y, p){
  const c = caretFromPoint(x, y); if (!c || c.node.nodeType !== 3 || !p.contains(c.node)) return null;
  const model = textModel(); const seg = model.segs.find(sg => sg.node === c.node); if (!seg) return null;
  const gi = seg.start + c.offset, list = sentencesIn(p, model);
  const k = list.findIndex(sn => gi >= sn.abs && gi <= sn.abs + sn.len); if (k < 0) return null;
  return Object.assign({ n: k + 1, of: list.length, model }, list[k]);
}
function paraAt(target){ const p = target && target.closest && target.closest("p, li, blockquote"); return p && ed.contains(p) && !p.closest("td,th,figure") && p.textContent.trim().length > 25 ? p : null; }
function placeTitleBadge(){
  const tw = $("#titleWrap"); if (!tw || tw.hidden) return;
  badge.style.top = (tw.getBoundingClientRect().top - paper.getBoundingClientRect().top + 10) + "px";
  badge.title = "Supervisor questions, suggestions and alternative titles"; badge.hidden = false; badgePara = null; badgeSent = null;
}
function placeBadge(p, sn){
  if (isTitle()) { placeTitleBadge(); return; }
  if (!p) { return; }
  badgePara = p; badgeSent = sn || null;
  let top = p.getBoundingClientRect().top;
  if (sn) { const r = rangeFor(sn.model, sn.abs, sn.len); if (r) { const rects = r.getClientRects(); if (rects.length) top = rects[0].top - 3; if (window.CSS && CSS.highlights) CSS.highlights.set("sent-hover", new Highlight(r)); } }
  badge.style.top = (top - paper.getBoundingClientRect().top + 2) + "px";
  badge.title = sn ? "Ideas, suggestions and supervisor questions for this sentence" : "Ideas, suggestions and supervisor questions for this paragraph";
  badge.hidden = false;
}
let raf = 0;
ed.addEventListener("mousemove", e => {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const i = issueAt(e.clientX, e.clientY);
    if (i) showTip(i, e.clientX, e.clientY); else if (!tip.hidden) hideTip();
    const p = paraAt(e.target); if (!p) return;
    if (magic === "sect") { if (badge.hidden) placeSectionBadge(); return; }
    if (magic === "sent") { if (!card.hidden) return; const sn = sentenceAt(e.clientX, e.clientY, p); if (sn && (!badgeSent || sn.abs !== badgeSent.abs || p !== badgePara)) placeBadge(p, sn); }
    else if (p !== badgePara || badgeSent) placeBadge(p);
  });
});
ed.addEventListener("click", e => { const i = issueAt(e.clientX, e.clientY); if (i) showTip(i, e.clientX, e.clientY); const p = paraAt(e.target); if (p && magic !== "sect") placeBadge(p, magic === "sent" ? sentenceAt(e.clientX, e.clientY, p) : null); });
ed.addEventListener("input", () => { badgeSent = null; if (window.CSS && CSS.highlights) CSS.highlights.delete("sent-hover"); });
ed.addEventListener("mouseleave", () => hideTip());
badge.addEventListener("mouseenter", () => { clearTimeout(badgeTimer); badgeTimer = setTimeout(() => (isTitle() ? openTitleInsight() : openInsight(badgePara, badgeSent)), 280); });
badge.addEventListener("mouseleave", () => clearTimeout(badgeTimer));
badge.addEventListener("click", () => { clearTimeout(badgeTimer); if (isTitle()) openTitleInsight(); else openInsight(badgePara, badgeSent); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeInsight(); hideTip(true); } });
document.addEventListener("mousedown", e => { if (!card.hidden && !card.contains(e.target) && e.target !== badge) closeInsight(); });
window.addEventListener("scroll", () => { if (!tip.hidden) hideTip(true); if (magic === "sect") { if (!badge.hidden) placeSectionBadge(); return; } if (badgePara && !badge.hidden) placeBadge(badgePara, badgeSent ? Object.assign({}, badgeSent, { model: textModel() }) : null); }, { passive: true });

function usedFigs(){ const out = []; ordered().forEach(s => { const h = s.id === current ? ed.innerHTML : (s.html || ""); (h.match(/data-fig="([a-z]+)"/g) || []).forEach(m => out.push(m.slice(10, -1))); }); return out; }
function closeInsight(){ card.hidden = true; cardPara = null; cardSent = null; }
function sectionAnalysis(){
  const paras = [...ed.querySelectorAll("p, li, blockquote")].filter(x => !x.closest("td,th,figure") && x.textContent.trim().length > 25 && !x.classList.contains("caption"));
  const text = paras.map(x => x.textContent.replace(/\u00a0/g, " ").trim()).join("\n");
  const uf = usedFigs(); let sugs = [];
  paras.forEach((x, i) => {
    const ai = window.Insight.analyse(x, { usedFigs: uf, isFirst: i === 0, isLast: i === paras.length - 1, sectionId: current });
    ai.suggestions.filter(g => g.kind !== "Looks good").forEach(g => sugs.push(Object.assign({}, g, { text: "¶" + (i + 1) + ": " + g.text, _p: x })));
  });
  const COH = { Flow: [6, 6, 7, "Writing & structure", "🔗"], Repetition: [5, 7, 6, "Literature review & gap", "↻"], "Cross-reference": [7, 9, 8, "Scholarly apparatus", "§"], Thread: [6, 5, 6, "Theoretical framework", "🧵"], Paragraph: [4, 7, 5, "Writing & structure", "¶"], "Topic sentence": [5, 7, 6, "Writing & structure", "✎"] };
  try {
    const at = allTexts(), nums = Object.values(at).map(x => x.num).filter(Boolean);
    const res = CK.coherence({ id: current }, paragraphs(), at, nums, Object.values(at).reduce((n, x) => n + (x.html.match(/<figure/g) || []).length, 0), []);
    res.findings.forEach(f => { const v = COH[f.type] || [5, 6, 6, "Writing & structure", "•"]; sugs.push({ icon: v[4], kind: f.type, text: f.msg, impact: v[0], ease: v[1], vis: v[2], crit: v[3], prio: Math.round((v[0] * .5 + v[2] * .3 + v[1] * .2) * 10) / 10, _p: f.para != null ? paras[f.para] : null }); });
  } catch (e) {}
  const seen = new Set(); sugs = sugs.filter(g => { const k = g.kind + g.text; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
  if (!sugs.length) sugs.push({ icon: "✓", kind: "Looks good", text: "No section-level issues found. Try the Supervisors tab to test the argument as a whole." });
  let h = 0; for (let i = 0; i < Math.min(300, text.length); i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return { text, words: CK.words(text).length, tags: window.Insight.tagsOf(text), suggestions: sugs, hash: Math.abs(h), sect: true, paras };
}
function openTitleInsight(){
  const v = $("#titleInput").value.trim(); if (!v) return;
  let h = 0; for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) | 0;
  const a = { text: v, words: CK.words(v).length, tags: window.Insight.tagsOf(v), suggestions: window.TitleKit ? window.TitleKit.suggestions(v) : [], hash: Math.abs(h), titleMode: true };
  cardPara = null; cardSent = null;
  renderInsight(a, 0); card.hidden = false;
  const br = badge.getBoundingClientRect(), w = card.offsetWidth, hh = card.offsetHeight;
  let left = br.right + 10; if (left + w > innerWidth - 8) left = Math.max(8, br.left - w - 10);
  let top = Math.max(70, Math.min(innerHeight - hh - 10, br.top - 10));
  if (innerWidth < 640) { left = 12; top = Math.max(60, innerHeight - hh - 12); }
  card.style.left = left + "px"; card.style.top = top + "px";
}
function openInsight(p, sn){
  if (isTitle()) return openTitleInsight();
  if (magic === "sect") {
    const a = sectionAnalysis(); if (!a.paras.length) return;
    cardPara = a.paras[0]; cardSent = null;
    renderInsight(a, 0); card.hidden = false;
    const br = badge.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight;
    let left = br.right + 10; if (left + w > innerWidth - 8) left = Math.max(8, br.left - w - 10);
    let top = Math.max(70, Math.min(innerHeight - h - 10, br.top - 10));
    if (innerWidth < 640) { left = 12; top = Math.max(60, innerHeight - h - 12); }
    card.style.left = left + "px"; card.style.top = top + "px";
    return;
  }
  if (!p || !ed.contains(p)) return;
  if (magic === "sent" && !sn) { const list = sentencesIn(p, textModel()); if (list.length) { let li = 0; list.forEach((x, i) => { if (x.len > list[li].len) li = i; }); sn = Object.assign({ n: li + 1, of: list.length }, list[li]); } }
  if (magic !== "sent") sn = null;
  cardPara = p; cardSent = sn || null;
  const paras = [...ed.querySelectorAll("p, li, blockquote")].filter(x => !x.closest("td,th,figure") && x.textContent.trim().length > 25 && !x.classList.contains("caption"));
  const idx = paras.indexOf(p);
  let target = p;
  if (sn) { const r = rangeFor(textModel(), sn.abs, sn.len); target = document.createElement("p"); if (r) target.appendChild(r.cloneContents()); else target.textContent = sn.text; }
  const a = window.Insight.analyse(target, { usedFigs: usedFigs(), isFirst: !sn && idx === 0, isLast: !sn && idx === paras.length - 1, sectionId: current });
  a.sent = sn ? { n: sn.n, of: sn.of, text: sn.text } : null;
  renderInsight(a, idx);
  card.hidden = false;
  const br = badge.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight;
  let left = br.right + 10; if (left + w > innerWidth - 8) left = Math.max(8, br.left - w - 10); if (left < 8) left = 8;
  let top = Math.max(70, Math.min(innerHeight - h - 10, br.top - 10));
  if (innerWidth < 640) { left = 12; top = Math.max(60, innerHeight - h - 12); }
  card.style.left = left + "px"; card.style.top = top + "px";
}
function reflections(){ return wrStore.get("wr-reflect" + NS, {}); }
function renderInsight(a, idx){
  const P = window.Insight.PERSONAS, pk = wrStore.get("wr-persona", "chia");
  const all = pk === "all";
  const keys = all ? Object.keys(P) : [pk];
  const ref = reflections(), mine = ((ref[current] || {})[a.hash] || {});
  const lens = keys.map(k => {
    const r = window.Insight.ask(k, a, spin), pp = P[k];
    const initials = pp.short.slice(0, 1) + (pp.name.split(" ").pop()[0] || "");
    return `<div class="lens" style="--pc:${pp.color};margin-bottom:8px">
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px"><span class="av" style="background:${pp.color}">${esc(initials)}</span><div><div style="font-weight:600;font-size:.86rem">${esc(pp.name)}</div><div class="small muted">${esc(pp.role)} · <span title="Institution location">${pp.flag}</span> ${esc(pp.aff)}</div><div class="small muted">Lens: ${esc(pp.lens)}</div></div></div>
      <p class="react">“${esc(r.reaction)}”</p>
      <p class="q">${esc(r.question)}</p>
      ${all ? "" : `<textarea data-ans="${k}" placeholder="Your answer: think aloud, it saves automatically…">${esc((mine[k] && mine[k].a) || "")}</textarea>`}
      <div class="acts"><button class="ic-act" data-spin="1">Another question</button><button class="ic-act" data-claude="${k}">Practise with Claude as ${esc(pp.short)} ↗</button><a class="ic-act primary" data-room="${k}" href="${ROOM_URL}" target="_blank" rel="noopener" title="Copies the passage, the question and your answer, then opens the Supervision Room. Paste there once (⌘V) and the discussion starts">💬 Send to ${esc(pp.short)} in the Supervision Room ↗</a></div>
      ${all ? "" : `<details><summary>✎ Make this sound like ${esc(pp.short)}: add things they really say or ask</summary>
        <textarea data-cust-r="${k}" placeholder="Their typical reactions, one per line">${esc((window.Insight.custom(k).reactions || []).join("\n"))}</textarea>
        <textarea data-cust-q="${k}" placeholder="Questions they often ask you, one per line (these come first)">${esc((window.Insight.custom(k).questions || []).join("\n"))}</textarea></details>`}
    </div>`;
  }).join("");
  const tab = wrStore.get("wr-ic-tab", "sup");
  const realSug = a.suggestions.filter(x => x.kind !== "Looks good").length;
  const nFig = !window.FigGen || a.sect || a.titleMode ? 0 : window.FigGen.detect(a.text, figCtx()).length;
  card.innerHTML = `<div class="ic-head"><b>✦ ${a.titleMode ? "Title" : a.sect ? `Section ${esc((DS.get(current) || {}).num || (DS.get(current) || {}).heading || "")}` : a.sent ? `Sentence ${a.sent.n}/${a.sent.of} · ¶${idx + 1}` : `Paragraph ${idx + 1}`}</b><span class="magic-toggle" role="group" aria-label="Review by"><button type="button" data-magic="sent" aria-pressed="${!!a.sent}" title="Sentence">S</button><button type="button" data-magic="para" aria-pressed="${!a.sent && !a.sect}" title="Paragraph">¶</button><button type="button" data-magic="sect" aria-pressed="${!!a.sect}" title="Whole section">§</button></span><span class="small muted">${a.words}w</span><button class="ic-act" data-close="1" aria-label="Close">✕</button></div>
  <div class="ic-tabs" role="tablist">
    <button role="tab" data-ict="sup" aria-selected="${tab === "sup"}">💬 Supervisors</button>
    <button role="tab" data-ict="sug" aria-selected="${tab === "sug"}">💡 Suggestions${realSug ? ` <span class="cnt">${realSug}</span>` : ""}</button>
    <button role="tab" data-ict="fig" aria-selected="${tab === "fig"}">${a.titleMode ? "✍ Alternatives" : "✨ Figure" + (nFig ? ` <span class="cnt">${nFig}</span>` : "")}</button>
  </div>
  <div class="ic-body">
    ${tab === "sup" ? `
      <div class="persona-chips">${Object.keys(P).map(k => `<button data-pk="${k}" aria-pressed="${pk === k}" style="--pc:${P[k].color}"><span class="av" style="background:${P[k].color}">${esc(P[k].short[0] + P[k].name.split(" ").pop()[0])}</span>${esc(P[k].short)}</button>`).join("")}<button data-pk="all" aria-pressed="${all}" style="--pc:var(--ink)">All three</button></div>
      ${lens}
      <p class="disclaim">Imagined reactions inspired by each scholar’s research areas, to rehearse supervision. They are not their words or views. Bring your answers to real supervision.</p>
      ${a.titleMode ? `<p class="small muted" style="margin-top:12px">For other ways to word the title, open the <b>✍ Alternatives</b> tab.</p>` : `<h6 style="margin-top:14px">✍ Paraphrase help</h6>
      <div class="gen" id="paraBox"></div>`}` : ""}
    ${tab === "sug" ? `
      ${a.tags.length ? `<div class="tagrow">${a.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
      <p class="small muted" style="margin:6px 0 4px">Sorted by priority. Each has three scores out of 10: <b>Impact</b> on the upgrade score, <b>Ease</b> of fixing, and <b>Visibility</b> to an examiner.</p>
      ${a.suggestions.map((sg, n) => ({ sg, n })).sort((x, y) => (y.sg.prio || 0) - (x.sg.prio || 0)).map(({ sg, n }) => `<div class="sug"><span>${sg.icon}</span><div>${sg.prio != null ? `<span class="prio" title="Priority">${sg.prio.toFixed(1)}</span>` : ""}<span class="k">${esc(sg.kind)}${sg.crit ? " · " + esc(sg.crit) : ""}</span>${esc(sg.text)}
        ${sg.impact != null ? `<div class="sc3"><span>Impact <b>${sg.impact}</b></span><span>Ease <b>${sg.ease}</b></span><span>Visibility <b>${sg.vis}</b></span></div>` : ""}
        ${sg.action || (a.sect && sg._p) ? `<div style="margin-top:5px">${sg.action ? `<button class="ic-act primary" data-sug="${n}">${esc(sg.action.label)}</button> ` : ""}${a.sect && sg._p ? `<button class="ic-act" data-goto="${n}">Go to paragraph</button>` : ""}</div>` : ""}</div></div>`).join("")}` : ""}
    ${tab === "fig" ? (a.titleMode ? `<div class="gen" id="altBox"></div>` : `<div class="gen" id="genBox"></div>`) : ""}
  </div>`;
  card.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => { const g = a.suggestions[+b.dataset.goto]; if (!g._p) return; closeInsight(); g._p.scrollIntoView({ block: "center", behavior: "smooth" }); g._p.classList.add("flash"); setTimeout(() => g._p.classList.remove("flash"), 1600); }));
  card.querySelectorAll(".ic-head [data-magic]").forEach(b => b.addEventListener("click", () => { const p = cardPara; setMagic(b.dataset.magic); if (b.dataset.magic === "sect") placeSectionBadge(); else placeBadge(p); openInsight(p); }));
  card.querySelectorAll("[data-ict]").forEach(b => b.addEventListener("click", () => { wrStore.set("wr-ic-tab", b.dataset.ict); renderInsight(a, idx); }));
  card.querySelector("[data-close]").addEventListener("click", closeInsight);
  card.querySelectorAll("[data-pk]").forEach(b => b.addEventListener("click", () => { wrStore.set("wr-persona", b.dataset.pk); spin = 0; renderInsight(a, idx); }));
  card.querySelectorAll("[data-spin]").forEach(b => b.addEventListener("click", () => { spin++; renderInsight(a, idx); }));
  card.querySelectorAll("[data-room]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.room, r = window.Insight.ask(k, a, spin), sec = DS.get(current) || {};
    const ta = card.querySelector('textarea[data-ans="' + k + '"]');
    const payload = "SUPERVISION-ROOM/1\n" + JSON.stringify({ section: ({ thesis: "Thesis ", "ethics form": "Ethics form " }[CFG.docLabel] || "Upgrade ") + label(sec) + (a.sent ? " · sentence " + a.sent.n : ""), passage: a.text, persona: k, reaction: r.reaction, question: r.question, answer: ta ? ta.value.trim() : "" });
    const done = () => toast("Copied. In the Supervision Room, press ⌘V (Ctrl+V) once: the discussion starts and " + window.Insight.PERSONAS[k].short + " replies");
    try { navigator.clipboard.writeText(payload).then(done, () => toast("Couldn’t copy automatically. Paste the passage into the Room yourself")); } catch (e) { toast("Couldn’t copy automatically. Paste the passage into the Room yourself"); }
  }));
  card.querySelectorAll("[data-claude]").forEach(b => b.addEventListener("click", async () => {
    const txt = window.Insight.prompt(b.dataset.claude, a, label(DS.get(current)));
    try { await navigator.clipboard.writeText(txt); } catch (e) {}
    toast("Prompt copied. Paste it into Claude"); window.open("https://claude.ai/new", "_blank", "noopener");
  }));
  card.querySelectorAll("textarea[data-ans]").forEach(t => t.addEventListener("input", () => {
    const ref = reflections(); ref[current] = ref[current] || {}; ref[current][a.hash] = ref[current][a.hash] || { excerpt: a.text.slice(0, 120) };
    const r = window.Insight.ask(t.dataset.ans, a, spin);
    ref[current][a.hash][t.dataset.ans] = { q: r.question, a: t.value, t: Date.now() };
    wrStore.set("wr-reflect" + NS, ref);
  }));
  card.querySelectorAll("[data-sug]").forEach(b => b.addEventListener("click", () => { const g = a.suggestions[+b.dataset.sug]; if (g._p) cardPara = g._p; doSuggestion(g.action); }));
  card.querySelectorAll("textarea[data-cust-r], textarea[data-cust-q]").forEach(t => t.addEventListener("change", () => {
    const k = t.dataset.custR || t.dataset.custQ, cur = window.Insight.custom(k);
    const lines = t.value.split("\n").map(x => x.trim()).filter(Boolean);
    if (t.dataset.custR) cur.reactions = lines; else cur.questions = lines;
    window.Insight.setCustom(k, cur); toast("Saved. " + (P[k].short) + "’s lens now includes your lines");
  }));
  if (tab === "fig") { if (a.titleMode) renderAlts(a); else renderGen(a); }
  if (tab === "sup" && !a.titleMode) renderPara(a);
}
// ------------------------------------------------------------ title alternatives
let altSeed = 17;
function renderAlts(a){
  const box = card.querySelector("#altBox"); if (!box || !window.TitleKit) return;
  const TK = window.TitleKit, curS = TK.altScores(a.text), vs = TK.alternatives(a.text, altSeed);
  const pill = (n, v) => `<span>${n} <b style="font-family:var(--mono);color:${v >= 80 ? "var(--ok)" : v >= 60 ? "var(--gold)" : "var(--bad)"}">${v}</b></span>`;
  box.innerHTML = `<div class="small muted" style="margin-bottom:6px">Your title now: ${pill("Clarity", curS.clarity)} ${pill("Keywords", curS.keywords)} ${pill("Concision", curS.concision)} · overall <b>${curS.overall}</b></div>
    ${vs.map((v, i) => `<div class="sug" style="grid-template-columns:1fr"><div><span class="k">${i === 0 ? "★ " : ""}${esc(v.name)} · overall ${v.scores.overall}</span>
      <div style="font-family:var(--serif);font-size:1rem;line-height:1.4;margin:3px 0">${esc(v.text)}</div>
      <div class="sc3">${pill("Clarity", v.scores.clarity)}${pill("Keywords", v.scores.keywords)}${pill("Concision", v.scores.concision)}</div>
      <div style="margin-top:5px"><button class="ic-act primary" data-alt="${i}">Use this</button></div></div></div>`).join("")}
    <div class="gacts"><button class="ic-act" type="button" id="altMore">🎲 More options</button><button class="ic-act" type="button" id="altClaude">Ask Claude for titles ↗</button></div>
    <p class="disclaim" style="margin-bottom:0">Options are built from your key terms. Your previous title stays in History if you change it.</p>`;
  box.querySelector("#altMore").addEventListener("click", () => { altSeed = (altSeed * 48271) % 2147483646 || 5; renderAlts(a); });
  box.querySelector("#altClaude").addEventListener("click", async () => { try { await navigator.clipboard.writeText(TK.prompt(a.text, DS.text("abstract"))); } catch (e) {} toast("Prompt copied. Paste it into Claude"); window.open("https://claude.ai/new", "_blank", "noopener"); });
  box.querySelectorAll("[data-alt]").forEach(b => b.addEventListener("click", () => {
    const v = vs[+b.dataset.alt]; const ta = $("#titleInput"); ta.value = v.text; updateTitlePreview(); flushSave(); runChecks(false); closeInsight();
    toast("Title updated. The story page shows it too ✓");
  }));
}
// ------------------------------------------------------------ paraphrase help
let para = null;
function renderPara(a){
  const box = card.querySelector("#paraBox"); if (!box || !window.Paraphrase) return;
  const sents = a.sent ? [a.sent.text] : window.Paraphrase.sentences(a.text.replace(/\n/g, " ")).filter(x => CK.words(x).length >= (a.sect ? 12 : 6));
  if (!sents.length) { box.innerHTML = `<p class="small muted" style="margin:0">No full sentences to paraphrase here.</p>`; return; }
  if (!para || para.hash !== a.hash) { let li = 0; sents.forEach((x, i) => { if (CK.words(x).length > CK.words(sents[li]).length) li = i; }); para = { hash: a.hash, si: li, seed: (a.hash % 9973) + 11 }; }
  if (para.si >= sents.length) para.si = 0;
  const sent = sents[para.si], vs = window.Paraphrase.variants(sent, para.seed);
  const pill = (n, v) => `<span title="${n}">${n} <b style="font-family:var(--mono);color:${v >= 80 ? "var(--ok)" : v >= 60 ? "var(--gold)" : "var(--bad)"}">${v}</b></span>`;
  box.innerHTML = `
    <label class="small muted">Sentence <select id="paraSel" style="width:100%;margin-top:3px;padding:5px 6px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:.8rem">${sents.map((x, i) => `<option value="${i}" ${i === para.si ? "selected" : ""}>${i + 1}. ${esc(x.length > 90 ? x.slice(0, 90) + "…" : x)} (${CK.words(x).length} words)</option>`).join("")}</select></label>
    ${vs.length ? vs.map((v, i) => `<div class="sug" style="grid-template-columns:1fr">
      <div><span class="k">${i === 0 ? "★ " : ""}${esc(v.name)} · overall ${v.scores.overall}</span>
        <div style="font-family:var(--serif);font-size:.95rem;line-height:1.45;margin:3px 0">${esc(v.text)}</div>
        <div class="sc3">${pill("Meaning kept", v.scores.meaning)}${pill("Readability", v.scores.read)}${pill("Concision", v.scores.conc)}</div>
        <div style="margin-top:5px"><button class="ic-act primary" data-use="${i}">Use this</button></div></div></div>`).join("")
      : `<p class="small muted">This sentence is already lean. Try another sentence, or ask Claude for creative rewrites.</p>`}
    <div class="gacts"><button class="ic-act" type="button" id="paraMore">🎲 More options</button><button class="ic-act" type="button" id="paraClaude">Paraphrase with Claude ↗</button></div>
    <p class="disclaim" style="margin-bottom:0">Built-in rewrites use rules (concision, register, splitting, word order, active voice). Citations and quotations are never changed. Always reread before using.</p>`;
  box.querySelector("#paraSel").addEventListener("change", e => { para.si = +e.target.value; renderPara(a); });
  box.querySelector("#paraMore").addEventListener("click", () => { para.seed = (para.seed * 48271) % 2147483646 || 5; renderPara(a); });
  box.querySelector("#paraClaude").addEventListener("click", async () => { try { await navigator.clipboard.writeText(window.Paraphrase.prompt(sent, a.text)); } catch (e) {} toast("Prompt copied. Paste it into Claude"); window.open("https://claude.ai/new", "_blank", "noopener"); });
  box.querySelectorAll("[data-use]").forEach(b => b.addEventListener("click", () => {
    const v = vs[+b.dataset.use], p = cardPara; if (!p) return;
    const m = textModel(); const firstSeg = a.sect ? null : m.segs.find(sg => p.contains(sg.node)); const from = firstSeg ? firstSeg.start : 0;
    const at = m.text.indexOf(sent, from);
    const r = at >= 0 ? rangeFor(m, at, sent.length) : null;
    if (!r) { toast("Couldn’t find that sentence. Has the paragraph changed?"); return; }
    closeInsight(); ed.focus(); selectRange(r); document.execCommand("insertText", false, v.text);
    scheduleSave(); runChecks(false); toast("Sentence replaced (undo with ⌘Z) ✍");
    try { Cheer.cheer("Sharper sentence ✍", "Small rewrites add up. Your examiner reads every one of them."); } catch (e) {}
  }));
}
function figCtx(){ if (!cardPara || cardSent) return {}; const ps = [...ed.querySelectorAll("p, li, blockquote")].filter(x => !x.closest("td,th,figure") && x.textContent.trim().length > 25 && !x.classList.contains("caption")); const i = ps.indexOf(cardPara); return { after: ps.slice(i + 1).map(x => x.textContent), section: ps.map(x => x.textContent).join("\n") }; }
// ------------------------------------------------------------ auto-figure generator
let gen = null;
function applyBest(){ const b = window.FigGen.bestFormat(gen.cand); gen.format = b.f; if (b.l) gen.style.layout = b.l; }
function genPrefs(){ return wrStore.get("wr-figpref", { font: "any", fill: "any", corner: "any", title: true }); }
function renderGen(a){
  const box = card.querySelector("#genBox"); if (!box || !window.FigGen) return;
  if (!gen || gen.hash !== a.hash + (a.sect ? 1 : 0)) {
    let cands;
    if (a.sect) {
      const seen = new Set(); cands = [];
      a.paras.forEach((x, i) => { const all = a.paras.map(y => y.textContent); window.FigGen.detect(x.textContent, { after: all.slice(i + 1), section: all.join("\n") }).forEach(c => { if (c.type === "concept") return; const k = c.type + JSON.stringify(c.items); if (seen.has(k)) return; seen.add(k); c._p = x; c._pn = i + 1; cands.push(c); }); });
      cands.sort((x, y) => y.q - x.q); cands = cands.slice(0, 8);
      const whole = window.FigGen.detect(a.text, {}).find(c => c.type === "concept"); if (whole) { whole._p = a.paras[a.paras.length - 1]; cands.push(whole); }
    } else cands = window.FigGen.detect(a.text, figCtx());
    gen = { hash: a.hash + (a.sect ? 1 : 0), cands, ci: 0, seed: (a.hash % 100000) + 7, cand: cands[0] ? JSON.parse(JSON.stringify(cands[0])) : null, style: null, format: "diagram" };
    if (gen.cand) { gen.style = window.FigGen.randomStyle(gen.cand.type, genPrefs(), gen.seed); applyBest(); }
  }
  if (!gen.cand) { box.innerHTML = `<p class="small muted" style="margin:0">Not enough structure here to draw from. Try a paragraph with a list, steps, numbers, years or a contrast.</p>`; return; }
  const pr = genPrefs(), T = window.FigGen.TYPE_LABEL;
  box.innerHTML = `
    <div class="gtypes">${gen.cands.map((c, i) => `<button type="button" data-gt="${i}" aria-pressed="${i === gen.ci}">${c._pn ? "¶" + c._pn + " " : ""}${esc(T[c.type])}${c.items.length ? " · " + c.items.length : ""}</button>`).join("")}</div>
    <div class="small muted" style="margin:2px 0 4px">Format</div>
    <div class="gtypes" id="genFormats">${(() => { const F = window.FigGen, best = F.bestFormat(gen.cand); const chip = (key, lbl, sc, on) => `<button type="button" data-gf="${key}" aria-pressed="${on}" title="Readability ${sc.read} · Fit ${sc.fit} · Academic polish ${sc.acad}">${(best.f === "diagram" ? "d:" + best.l : best.f) === key ? "★ " : ""}${lbl} <span style="opacity:.7;font-family:var(--mono)">${sc.overall}</span></button>`;
      return F.LAYOUTS[gen.cand.type].map(l => chip("d:" + l, esc(F.LAYOUT_NAME[l] || l), F.scores(gen.cand, "diagram", l), gen.format === "diagram" && gen.style.layout === l)).join("") +
        chip("table", "▦ Table", F.scores(gen.cand, "table"), gen.format === "table") + chip("list", "• List", F.scores(gen.cand, "list"), gen.format === "list") + chip("box", "❏ Key points", F.scores(gen.cand, "box"), gen.format === "box"); })()}</div>
    <div id="genScores" class="scorebars"></div>
    <div class="gprev"><img id="genImg" alt="Generated figure preview"><div id="genHtml" class="ed" style="min-height:0;padding:8px 10px;font-size:.88rem;text-align:left" hidden></div></div>
    <div class="small muted" id="genMeta" style="margin-top:4px"></div>
    <div class="gacts">
      <button class="ic-act" type="button" data-g="shuffle" title="Random diagram layout and style within your preferences">🎲 Shuffle</button>
      <button class="ic-act primary" type="button" data-g="insert" id="genInsert">Insert figure</button>
      <button class="ic-act" type="button" data-g="png" id="genPng">PNG</button>
    </div>
    <details><summary>✎ Edit title and labels</summary>
      <input type="text" id="genTitle" value="${esc(gen.cand.title)}" aria-label="Figure title">
      <textarea id="genItems" aria-label="Figure labels">${esc(window.FigGen.toText(gen.cand))}</textarea>
      <div class="small muted">${gen.cand.type === "pairs" ? "One per line: term — meaning" : gen.cand.type === "numbers" ? "One per line: label: number" : gen.cand.type === "timeline" ? "One per line: year: event" : gen.cand.type === "contrast" ? "Two lines: left side, right side" : "One label per line"}</div>
    </details>
    <details><summary>⚙ My style preferences (shuffle stays within these)</summary>
      <div class="prefs">
        <label>Font <select data-pref="font"><option value="any">Any</option><option value="sans">Sans</option><option value="serif">Serif</option></select></label>
        <label>Fill <select data-pref="fill"><option value="any">Any</option><option value="white">White</option><option value="grey">Grey</option><option value="hatch">Hatched</option><option value="dots">Dotted</option><option value="alt">Alternating</option></select></label>
        <label>Corners <select data-pref="corner"><option value="any">Any</option><option value="sharp">Sharp</option><option value="round">Round</option></select></label>
        <label><input type="checkbox" data-pref="title" ${pr.title !== false ? "checked" : ""}> Title</label>
      </div>
    </details>`;
  box.querySelectorAll("select[data-pref]").forEach(sl => { sl.value = pr[sl.dataset.pref] || "any"; sl.addEventListener("change", () => { const p = genPrefs(); p[sl.dataset.pref] = sl.value; wrStore.set("wr-figpref", p); gen.seed += 13; gen.style = window.FigGen.randomStyle(gen.cand.type, p, gen.seed); paintGen(); }); });
  box.querySelector('input[data-pref="title"]').addEventListener("change", e => { const p = genPrefs(); p.title = e.target.checked; wrStore.set("wr-figpref", p); gen.style.title = e.target.checked; paintGen(); });
  box.querySelectorAll("[data-gf]").forEach(b => b.addEventListener("click", () => {
    const f = b.dataset.gf;
    if (f.startsWith("d:")) { gen.format = "diagram"; gen.style.layout = f.slice(2); } else gen.format = f;
    wrStore.set("wr-figformat", gen.format === "diagram" ? "diagram" : gen.format);
    box.querySelectorAll("[data-gf]").forEach(x => x.setAttribute("aria-pressed", x === b)); paintGen();
  }));
  box.querySelectorAll("[data-gt]").forEach(b => b.addEventListener("click", () => { gen.ci = +b.dataset.gt; gen.cand = JSON.parse(JSON.stringify(gen.cands[gen.ci])); gen.style = window.FigGen.randomStyle(gen.cand.type, genPrefs(), ++gen.seed); applyBest(); renderGen(a); }));
  box.querySelector("#genTitle").addEventListener("input", e => { gen.cand.title = e.target.value; paintGen(); });
  box.querySelector("#genItems").addEventListener("input", e => { const t = gen.cand.title; gen.cand = window.FigGen.fromText(gen.cand, e.target.value); gen.cand.title = t; paintGen(); });
  box.querySelector("#genItems").addEventListener("change", () => { const d = box.querySelector("details"); renderGen(a); const d2 = card.querySelector("#genBox details"); if (d2) d2.open = true; });
  box.querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", async () => {
    const g = b.dataset.g;
    if (g === "shuffle") { for (let t = 0; t < 8; t++) { gen.seed = (gen.seed * 31 + 17) % 2147483646 || 99; gen.style = window.FigGen.randomStyle(gen.cand.type, genPrefs(), gen.seed); if (window.FigGen.readability(gen.cand, "diagram", gen.style.layout) >= 70) break; } gen.format = "diagram"; box.querySelectorAll("[data-gf]").forEach(x => x.setAttribute("aria-pressed", x.dataset.gf === "d:" + gen.style.layout)); paintGen(); }
    if (g === "insert") {
      const src = gen.cands[gen.ci]; const p = (src && src._p) || cardPara; if (!p) return;
      const F = window.FigGen, fm = gen.format;
      if (fm === "diagram") p.insertAdjacentHTML("afterend", `<figure contenteditable="false" data-fig="gen"><img src="${F.uri(F.render(gen.cand, gen.style))}" alt="${esc(gen.cand.title)}"></figure><p class="caption"><strong>Figure 0.</strong> ${esc(gen.cand.title)}. <em>Edit this caption to state what the figure shows.</em></p>`);
      else if (fm === "table") p.insertAdjacentHTML("afterend", F.toTableHtml(gen.cand));
      else if (fm === "list") p.insertAdjacentHTML("afterend", F.toListHtml(gen.cand));
      else p.insertAdjacentHTML("afterend", F.toBoxHtml(gen.cand));
      renumberLocal(); scheduleSave(); closeInsight();
      const what = { diagram: "Figure", table: "Table", list: "List", box: "Key-points box" }[fm];
      toast(what + " inserted below the paragraph. Click into it to edit ✨");
      try { Cheer.cheer("New " + what.toLowerCase() + " ✨", fm === "diagram" ? "Examiners love a well-chosen visual. Write a caption that states the claim, not just the topic." : "Structure helps your reader. Keep it short and refer to it in the text."); } catch (e) {}
    }
    if (g === "png") download("Figure_" + (gen.cand.title || "generated").replace(/[^A-Za-z0-9]+/g, "_").slice(0, 40) + ".png", await svgToPng(window.FigGen.uri(window.FigGen.render(gen.cand, gen.style)), 3), true);
  }));
  paintGen();
}
function paintGen(){
  const img = card.querySelector("#genImg"); if (!img || !gen || !gen.cand) return;
  const F = window.FigGen, hp = card.querySelector("#genHtml"), fm = gen.format || "diagram";
  const sc = F.scores(gen.cand, fm, gen.style.layout), bar = (n, v) => `<div><span>${n}</span><i><b style="width:${v}%;background:${v >= 85 ? "var(--ok)" : v >= 65 ? "var(--gold)" : "var(--bad)"}"></b></i><em>${v}</em></div>`;
  card.querySelector("#genScores").innerHTML = bar("Readability", sc.read) + bar("Fit", sc.fit) + bar("Academic polish", sc.acad) + `<div class="overall">Overall <strong>${sc.overall}</strong>/100</div>`;
  img.hidden = fm !== "diagram"; hp.hidden = fm === "diagram";
  card.querySelector("#genPng").hidden = fm !== "diagram";
  card.querySelector("#genInsert").textContent = { diagram: "Insert figure", table: "Insert table", list: "Insert list", box: "Insert box" }[fm];
  if (fm !== "diagram") { hp.innerHTML = fm === "table" ? F.toTableHtml(gen.cand) : fm === "list" ? F.toListHtml(gen.cand) : F.toBoxHtml(gen.cand); card.querySelector("#genMeta").textContent = "Inserted as editable text, so she can change anything afterwards."; return; }
  img.src = F.uri(F.render(gen.cand, gen.style));
  const st = gen.style; card.querySelector("#genMeta").textContent = `Layout: ${st.layout} · ${st.font} · ${st.fill} fill · ${st.corner >= 99 ? "pill" : st.corner ? "rounded" : "sharp"} corners`;
}
function doSuggestion(act){
  const p = cardPara; if (!p || !act) return;
  if (act.type === "figure") {
    const f = FIG.find(x => x.id === act.fig); if (!f) return;
    p.insertAdjacentHTML("afterend", `<figure contenteditable="false" data-fig="${f.id}"><img src="${f.uri}" alt="${esc(f.title)}"></figure><p class="caption"><strong>Figure 0.</strong> ${esc(f.caption)}</p>`);
    renumberLocal(); scheduleSave(); closeInsight(); toast("Figure inserted below the paragraph");
  }
  if (act.type === "italic") {
    const re = /\b(kekeluargaan|hormat|rukun|sungkan|pasung|wedi|isin|tugas belajar)\b/gi;
    const nodes = []; const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) if (!(n.parentNode.closest && n.parentNode.closest("em,i"))) nodes.push(n);
    let count = 0;
    nodes.forEach(t => {
      const parts = t.nodeValue.split(re); if (parts.length < 2) return;
      const frag = document.createDocumentFragment();
      parts.forEach((part, k) => { if (k % 2 === 1) { const em = document.createElement("em"); em.textContent = part; frag.appendChild(em); count++; } else if (part) frag.appendChild(document.createTextNode(part)); });
      t.replaceWith(frag);
    });
    scheduleSave(); runChecks(false); openInsight(p); toast(count + " term(s) italicised");
  }
  if (act.type === "select") {
    const m = textModel(); const pi = m.text.indexOf(act.snippet.slice(0, 60));
    if (pi >= 0) { const r = rangeFor(m, pi, Math.min(act.snippet.length, m.text.length - pi)); if (r) { closeInsight(); ed.focus(); selectRange(r); } }
  }
}
function paintStamp(s){
  const m = window.Muse ? window.Muse.current() : null;
  $("#stamp").innerHTML = s && s.revised && m ? `<span class="stampline">${esc(m.stamp)} · ${new Date(s.updated || Date.now()).toLocaleDateString(undefined, { day: "numeric", month: "short" }).toUpperCase()}</span>` : "";
}
function paintMuse(){ if (!window.Muse) return; window.Muse.applyAccent(); const m = window.Muse.current(); $("#museTop").textContent = m.emoji + " " + m.name + " · " + m.tagline; }
$("#museTop").addEventListener("click", () => { switchTab("future"); $(".panel").scrollIntoView({ behavior: "smooth", block: "start" }); });
document.addEventListener("click", e => { if (e.target.closest && e.target.closest("#musePick")) setTimeout(() => { paintMuse(); paintStamp(DS.get(current)); }, 0); });
paintMuse();

$("#genFromCursor").addEventListener("click", () => {
  restoreSel(); const sel = getSelection();
  let p = sel.rangeCount && ed.contains(sel.anchorNode) ? paraAt(sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode) : null;
  if (!p) { toast("Click inside a paragraph first, then press this button"); return; }
  p.scrollIntoView({ block: "center" }); wrStore.set("wr-ic-tab", "fig"); setTimeout(() => { placeBadge(p); openInsight(p); const g = card.querySelector("#genBox"); if (g) g.scrollIntoView({ block: "nearest" }); }, 250);
});

// ------------------------------------------------------------ boot

// ------------------------------------------------------------ scope guard
const SCOPE_KEY = "wr-scope-baseline" + NS;
function scopeBaseText(){
  const b = wrStore.get(SCOPE_KEY, null); if (b && b.text) return b.text;
  const orig = (window[CFG.siteVar || "UPGRADE_DOC"] || {}).sections || [];
  return orig.map(s => DS.textOf(s.html)).join("\n");
}
function scopeCurText(){ return ordered().map(s => s.id === current ? editorText() : DS.textOf(s.html)).join("\n"); }
function scopeReport(){ return window.ScopeGuard ? window.ScopeGuard.analyse(scopeBaseText(), scopeCurText()) : null; }
function paintScopeChip(){
  const b = $("#scopeBtn"); if (!b || !window.ScopeGuard) return;
  const r = scopeReport(); b.innerHTML = `🧭 Scope <b style="color:${window.ScopeGuard.color(r.shift)}">${r.shift}</b>`;
  b.title = r.label + (r.months ? " · about +" + r.months + " months of work" : "") + ". Click for details.";
}
function openScope(intro){
  if (!window.ScopeGuard) return;
  const r = scopeReport(), base = wrStore.get(SCOPE_KEY, null);
  const since = base ? "the scope you agreed on " + new Date(base.t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "the original " + (CFG.docLabel || "upgrade document");
  modal("Scope check", (intro ? `<div class="callout teal small" style="margin-bottom:12px"><p>${intro}</p></div>` : "") +
    `<p class="small muted" style="margin:0 0 10px">Compared with ${esc(since)}. It looks at what changes the project, not the wording: questions, data, methods, participants, setting, theory and period.</p>` +
    window.ScopeGuard.html(r) +
    `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      <button class="btn" type="button" id="scopeAgree" title="Use after your supervisors have agreed the change">Agreed in supervision: make this my scope</button>
      ${base ? `<button class="btn ghost" type="button" id="scopeReset">Go back to the original scope</button>` : ""}
      <a class="btn ghost" href="plan.html#scope">See the plan and change log</a></div>
    <p class="small muted" style="margin:8px 0 0">Agreeing logs the change on the Plan page, with the date and the extra time, so you can see how the project has grown.</p>`);
  const ag = $("#scopeAgree"); if (ag) ag.addEventListener("click", () => {
    const log = wrStore.get("wr-scope-log", []); log.unshift({ doc: CFG.docLabel || "upgrade document", t: Date.now(), shift: r.shift, label: r.label, months: r.months, changes: r.changes.slice(0, 12).map(c => c.what) });
    wrStore.set("wr-scope-log", log.slice(0, 100)); wrStore.set(SCOPE_KEY, { text: scopeCurText(), t: Date.now() });
    $("#modal").close(); paintScopeChip(); toast("Scope updated and logged on the Plan page ✓");
  });
  const rs = $("#scopeReset"); if (rs) rs.addEventListener("click", () => { try { localStorage.removeItem(SCOPE_KEY); } catch (e) {} $("#modal").close(); paintScopeChip(); toast("Back to the original scope"); });
}

// ------------------------------------------------------------ Zotero
function openZotero(){
  const ZK = window.ZoteroKit; if (!ZK) return;
  const lib = ZK.load(), text = scopeCurText(), cites = ZK.citations(text);
  let body = `<p class="small" style="margin:0 0 10px">Load your Zotero library to check every in-text citation and build the reference list in <b>Cite Them Right Harvard</b>, the Harvard style the Goldsmiths library recommends. In Zotero: right-click your thesis collection → <b>Export Collection…</b> → <b>Better BibTeX</b>, <b>BibTeX</b> or <b>CSL JSON</b>. The file stays in this browser.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" type="button" id="zLoad">${lib ? "Replace library" : "Load Zotero export"}</button><input type="file" id="zFile" accept=".bib,.json,.ris,.txt" hidden>${lib ? `<span class="small muted">${lib.entries.length} items from ${esc(lib.name)} · ${new Date(lib.t).toLocaleDateString()}</span>` : ""}</div>`;
  body += `<h4 style="margin:14px 0 6px">${cites.length} in-text citations found</h4>`;
  if (lib) {
    const m = ZK.match(cites, lib.entries);
    body += m.missing.length ? `<div class="callout warn small"><p><b>${m.missing.length} not in your Zotero library.</b> Add them in Zotero (or fix the spelling or year), then reload the export:</p><p>${m.missing.map(c => esc(c.family + " " + c.year)).join(" · ")}</p></div>` : `<p class="small" style="color:var(--ok)">Every citation is in your library ✓</p>`;
    body += `<p class="small muted">${m.used.length} library items cited · ${m.unused.length} in the library but not cited here.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" id="zWrite" ${m.used.length ? "" : "disabled"}>Write the reference list into “References”</button></div>
      <details style="margin-top:10px"><summary class="small">Preview (${m.used.length})</summary><div class="small" style="margin-top:6px;display:grid;gap:6px">${ZK.referenceList(m.used).map(h => `<p style="margin:0;padding-left:1.5em;text-indent:-1.5em">${h}</p>`).join("")}</div></details>
      <p class="small muted" style="margin-top:10px">Writing in Word with the Zotero plugin? Keep using it there. This check is for drafts in the studio, and it keeps both in step.</p>`;
    modal("Zotero · citations and references", body);
    const w = $("#zWrite"); if (w) w.addEventListener("click", () => {
      const ref = DS.get("references") ? "references" : ordered().find(x => /reference/i.test(x.heading || ""))?.id;
      if (!ref) { toast("No References section in this document. Add one first."); return; }
      if (!confirm("Replace the References section with " + m.used.length + " formatted references? The current text stays in History.")) return;
      const html = ZK.referenceList(m.used).map(h => `<p>${h}</p>`).join("");
      const st = DS.state(); st.history = st.history || {}; (st.history[ref] = st.history[ref] || []).push({ t: Date.now() - 1, html: (DS.get(ref) || {}).html || "" }); DS.save(st);
      persist(ref, { html }); $("#modal").close(); openSection(ref); toast("Reference list written ✓");
    });
  } else {
    body += `<p class="small muted">${cites.slice(0, 40).map(c => esc(c.family + " " + c.year)).join(" · ")}${cites.length > 40 ? " …" : ""}</p>`;
    modal("Zotero · citations and references", body);
  }
  // direct sync with zotero.org (Zotero Web API); settings stay in this browser
  const zs = wrStore.get("wr-zotero-sync", {});
  $("#modalBody").insertAdjacentHTML("beforeend", `<details style="margin-top:14px" ${zs.user ? "open" : ""}><summary><b>Import straight from Zotero</b> (no export file)</summary>
    <p class="small muted" style="margin:6px 0">Syncs your online Zotero library, or one collection, through the Zotero web API. You need your <b>user ID</b> (zotero.org → Settings → Security, shown above “Applications”) and, if your library is private, a <b>read-only API key</b> created on the same page. Both are kept only in this browser. Make sure Zotero desktop has synced first.</p>
    <div style="display:grid;gap:6px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
      <input id="zUser" placeholder="User ID (numbers)" value="${esc(zs.user || "")}" inputmode="numeric" style="padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)">
      <input id="zKey" type="password" placeholder="API key (private library)" value="${esc(zs.key || "")}" autocomplete="off" style="padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)">
      <input id="zColl" placeholder="Collection key (optional)" value="${esc(zs.coll || "")}" style="padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)">
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center"><button class="btn" type="button" id="zSync">Sync from Zotero</button>${zs.user ? `<button class="btn ghost" type="button" id="zForget">Forget these details</button>` : ""}<span class="small muted" id="zMsg"></span></div>
    <p class="small muted" style="margin:6px 0 0">The collection key is the code in the collection’s web address on zotero.org (…/collections/<b>ABCD1234</b>).</p></details>`);
  $("#zSync").addEventListener("click", async () => {
    const user = $("#zUser").value.trim(), key = $("#zKey").value.trim(), coll = $("#zColl").value.trim(), msg = $("#zMsg");
    if (!/^\d+$/.test(user)) { msg.textContent = "The user ID is a number."; return; }
    wrStore.set("wr-zotero-sync", { user, key, coll });
    const base = "https://api.zotero.org/users/" + user + (coll ? "/collections/" + encodeURIComponent(coll) : "") + "/items/top?format=csljson&limit=100";
    let start = 0, all = [], total = Infinity;
    try {
      while (start < total && start < 5000) {
        msg.textContent = "Fetching " + (start + 1) + "…";
        const r = await fetch(base + "&start=" + start, { headers: Object.assign({ "Zotero-API-Version": "3" }, key ? { "Zotero-API-Key": key } : {}) });
        if (r.status === 403) throw new Error("access denied: a private library needs a read-only API key");
        if (r.status === 404) throw new Error("user or collection not found");
        if (!r.ok) throw new Error("Zotero replied " + r.status);
        total = +(r.headers.get("Total-Results") || 0);
        const j = await r.json(); const items = Array.isArray(j) ? j : (j.items || []); all = all.concat(items); if (!items.length) break; start += 100;
      }
      const entries = ZK.parse("zotero.json", JSON.stringify(all));
      if (!ZK.save({ name: "zotero.org" + (coll ? " · collection " + coll : " · whole library"), t: Date.now(), entries })) throw new Error("the library is too large for browser storage");
      toast(entries.length + " items synced from Zotero ✓"); openZotero();
    } catch (err) { msg.textContent = "Couldn’t sync: " + err.message; }
  });
  const zf = $("#zForget"); if (zf) zf.addEventListener("click", () => { try { localStorage.removeItem("wr-zotero-sync"); } catch (e) {} openZotero(); });
  $("#zLoad").addEventListener("click", () => $("#zFile").click());
  $("#zFile").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const entries = ZK.parse(f.name, await f.text()); if (!entries.length) throw new Error("no items found");
      if (!ZK.save({ name: f.name, t: Date.now(), entries })) throw new Error("the library is too large for browser storage");
      toast(entries.length + " Zotero items loaded ✓"); openZotero(); }
    catch (err) { toast("Couldn’t read that export: " + err.message); }
  });
}

// ------------------------------------------------------------ NVivo
let nvLastRange = null;
document.addEventListener("selectionchange", () => { const sel = getSelection(); if (sel.rangeCount && ed.contains(sel.anchorNode)) nvLastRange = sel.getRangeAt(0).cloneRange(); });
function insertBlock(html){
  if (isTitle()) { toast("Open a section first, then insert."); return; }
  const tmp = document.createElement("div"); tmp.innerHTML = html;
  let anchor = nvLastRange && ed.contains(nvLastRange.startContainer) ? nvLastRange.startContainer : null;
  while (anchor && anchor.parentNode !== ed) anchor = anchor.parentNode;
  const frag = document.createDocumentFragment(); [...tmp.childNodes].forEach(n => frag.appendChild(n));
  if (anchor) anchor.after(frag); else ed.appendChild(frag);
  ed.dispatchEvent(new Event("input", { bubbles: true })); $("#modal").close(); toast("Inserted ✓ (after the paragraph where your cursor was)");
}
function openNVivo(sel){
  const NV = window.NVivoKit; if (!NV) return;
  const P = NV.load(), text = scopeCurText().toLowerCase();
  let body = `<p class="small" style="margin:0 0 10px">Bring your NVivo coding into your writing. In NVivo: <b>File → Export → Export Project</b> as <b>REFI-QDA (.qdpx)</b> for codes and coded quotes, or <b>Share → Export Codebook (.qdc)</b> for codes only. The file is read in this browser and never uploaded.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" type="button" id="nvLoad">${P ? "Load a newer export" : "Load NVivo export"}</button><input type="file" id="nvFile" accept=".qdpx,.qdc" hidden>${P ? `<span class="small muted">${esc(P.name)} · ${P.codes.length} codes${P.sources ? " · " + P.sources + " coded sources" : ""} · ${new Date(P.t).toLocaleDateString()}</span>` : ""}</div>`;
  if (P) {
    const named = [...new Set(P.codes.flatMap(c => c.refs.map(r => r.source)))].filter(NV.looksNamed);
    if (named.length) body += `<div class="callout warn small" style="margin-top:10px"><p><b>Check anonymity before quoting.</b> These source names look like real names: ${named.slice(0, 5).map(esc).join(", ")}. Your ethics form promises role codes (e.g. “Riliv Psychologist 1”). Rename the files in NVivo, or edit the attribution after inserting.</p></div>`;
    const coded = P.codes.filter(c => c.n), notYet = P.codes.filter(c => c.n >= 3 && !text.includes(c.name.toLowerCase().split(/[\s/]+/).filter(w => w.length > 4)[0] || "\u0000"));
    body += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 6px"><input id="nvQ" placeholder="Filter codes" style="flex:1 1 180px;min-width:0;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)">${coded.length ? `<button class="btn ghost" type="button" id="nvTable">Insert table of top codes</button>` : ""}</div>`;
    if (notYet.length) body += `<p class="small muted" style="margin:0 0 8px">Codes with 3+ references that this document doesn’t mention yet: ${notYet.slice(0, 8).map(c => `<a href="#" data-nvc="${esc(c.path)}">${esc(c.name)}</a>`).join(" · ")}</p>`;
    body += `<div id="nvList" style="display:grid;gap:2px;max-height:46vh;overflow:auto"></div>`;
  }
  modal("NVivo · codes and quotes", body);
  $("#nvLoad").addEventListener("click", () => $("#nvFile").click());
  $("#nvFile").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return; toast("Reading " + f.name + "…");
    try { const p = await NV.parse(f); if (!p.codes.length) throw new Error("no codes found"); if (!NV.save(p)) throw new Error("too large for browser storage"); toast(p.codes.length + " NVivo codes loaded ✓"); openNVivo(); }
    catch (err) { toast("Couldn’t read that export: " + err.message); }
  });
  if (!P) return;
  const list = $("#nvList");
  function paint(q){
    q = (q || "").toLowerCase();
    list.innerHTML = P.codes.filter(c => !q || c.path.toLowerCase().includes(q)).map((c, i) => `<details data-i="${P.codes.indexOf(c)}" ${sel && c.path === sel ? "open" : ""} style="border-bottom:1px solid var(--line);padding:4px 0 4px ${c.depth * 14}px"><summary style="cursor:pointer;display:flex;gap:8px;align-items:baseline"><span style="flex:1;min-width:0">${c.color ? `<i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${esc(c.color)};margin-right:6px"></i>` : ""}${esc(c.name)}</span><span class="small muted" style="white-space:nowrap">${c.n} refs · ${c.nSources} sources</span></summary>
      ${c.desc ? `<p class="small muted" style="margin:4px 0">${esc(c.desc)}</p>` : ""}
      ${c.refs.length ? c.refs.slice(0, 12).map((r, k) => `<div style="background:var(--surface-2);border-radius:8px;padding:6px 10px;margin:4px 0;font-size:.86rem"><div>“${esc(r.text)}”</div><div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px"><span class="small muted">${esc(r.source)}${NV.looksNamed(r.source) ? " ⚠" : ""}</span><button class="btn ghost" type="button" data-ins="${k}" style="padding:2px 10px;font-size:.76rem">Insert quote</button></div></div>`).join("") : `<p class="small muted" style="margin:4px 0">No quotes in this export (a codebook has codes only).</p>`}
    </details>`).join("") || `<p class="small muted">No codes match.</p>`;
  }
  paint(sel ? "" : "");
  $("#nvQ").addEventListener("input", e => paint(e.target.value));
  list.addEventListener("click", e => {
    const b = e.target.closest("[data-ins]"); if (!b) return;
    const c = P.codes[+b.closest("details").dataset.i], r = c.refs[+b.dataset.ins];
    insertBlock(`<blockquote><p>“${esc(r.text)}” (${esc(r.source)})</p></blockquote>`);
  });
  $("#modalBody").querySelectorAll("[data-nvc]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); $("#nvQ").value = a.textContent; paint(a.textContent); const d = list.querySelector("details"); if (d) d.open = true; }));
  const tb = $("#nvTable"); if (tb) tb.addEventListener("click", () => {
    const top = P.codes.filter(c => c.n).sort((a, b) => b.n - a.n).slice(0, 8);
    insertBlock(`<p><strong>Table</strong> Most frequent codes (NVivo, ${new Date(P.t).toLocaleDateString(undefined, { month: "short", year: "numeric" })})</p><table><thead><tr><th>Code</th><th>References</th><th>Sources</th><th>Example</th></tr></thead><tbody>${top.map(c => `<tr><td>${esc(c.path)}</td><td>${c.n}</td><td>${c.nSources}</td><td>${c.refs[0] ? "“" + esc(c.refs[0].text.slice(0, 140)) + (c.refs[0].text.length > 140 ? "…" : "") + "”" : ""}</td></tr>`).join("")}</tbody></table>`);
  });
}

// ------------------------------------------------------------ review mode
// The default is the strict examiner mode (not labelled on the page). The only visible option is the soft scenario.
function mode(){ return wrStore.get("wr-mode" + NS, "critical") === "gentle" ? "gentle" : "critical"; }
function isCritical(){ return mode() === "critical"; }
function isGentle(){ return mode() === "gentle"; }
window.STUDIO_CRITICAL = isCritical(); window.STUDIO_GENTLE = isGentle();
function setMode(m){
  wrStore.set("wr-mode" + NS, m); window.STUDIO_CRITICAL = m === "critical"; window.STUDIO_GENTLE = m === "gentle";
  const b = $("#softBtn"); if (b) b.setAttribute("aria-pressed", String(m === "gentle"));
  runChecks(true); renderSide(); closeInsight(); try { paintStance(); } catch (e) {}
  toast(m === "gentle" ? "🌱 Soft scenario on: gentler scoring and warmer supervisors" : "Soft scenario off");
}

// ------------------------------------------------------------ stance & codes (live)
function formText(){
  if (NS === "-ethics") return scopeCurText();
  if (!window.ETHICS_DOC) return null;
  try { const E = window.DocStore.create("wr-ethics-v1", window.ETHICS_DOC); return E.sections().map(x => E.textOf(x.html)).join("\n"); } catch (e) { return null; }
}
function stanceNow(){ if (!window.StanceKit) return null; const txt = scopeCurText(), ft = formText(); return { st: StanceKit.stance(txt), cd: StanceKit.codes(txt + "\n" + (ft || ""), ft), js: StanceKit.justice(txt) }; }
function gaugesHtml(r){
  const x = 50 + r.st.pos / 2, jx = 50 + r.js.pos / 2, bc = r.st.balance >= 70 ? "var(--ok)" : r.st.balance >= 50 ? "var(--gold)" : "var(--bad)", cc = r.cd.score >= 80 ? "var(--ok)" : r.cd.score >= 55 ? "var(--gold)" : "var(--bad)";
  const sign = n => (n > 0 ? "+" : "") + n;
  return `<div class="pc-gauges">
    <div id="stanceStrip" class="gbox">
      <div class="gbox-h"><b>Political stance &amp; justice</b><button type="button" class="gbox-x" data-open="stance" aria-label="Enlarge political stance">⤢ Enlarge</button></div>
      <div class="sp-scale"><span>Left</span><span>Centre</span><span>Right</span></div>
      <div class="sp-track"><span class="sp-tick" style="left:25%"></span><span class="sp-tick c" style="left:50%"></span><span class="sp-tick" style="left:75%"></span>
        <i class="sp-word" style="left:${x}%" title="Your vocabulary: ${sign(r.st.pos)}"></i><u class="sp-just" style="left:${jx}%" title="Your justice tradition: ${sign(r.js.pos)}"></u></div>
      <div class="sp-key"><span><i class="k-word"></i>vocabulary <b>${sign(r.st.pos)}</b></span><span><i class="k-just"></i>justice <b>${sign(r.js.pos)}</b></span><span>balance <b style="color:${bc}">${r.st.balance}</b></span></div>
      <div class="ss-sub" style="white-space:normal">${esc(r.st.lean)} · ⚖ walks with <b>${esc(r.js.top.who.split(" · ")[0])}</b></div>
    </div>
    <div id="codesStrip" class="gbox">
      <div class="gbox-h"><b>⚖ Codes &amp; laws</b><button type="button" class="gbox-x" data-open="codes" aria-label="Enlarge codes and laws">⤢ Enlarge</button></div>
      <div style="display:flex;align-items:baseline;gap:10px"><span class="ss-num" style="color:${cc}">${r.cd.score}%</span><span class="ss-sub">${r.cd.rows.filter(c => c.ok).length} of ${r.cd.rows.length} followed${r.cd.missingMust.length ? ` · <b style="color:var(--bad)">${r.cd.missingMust.length} must still missing</b>` : ""}</span></div>
    </div>
  </div>`;
}
function paintStance(){
  const r = stanceNow(); if (!r) return;
  let host = $("#gaugeHost"); if (!host) { const pan = document.querySelector("aside.panel"); if (pan) { host = document.createElement("div"); host.id = "gaugeHost"; pan.insertBefore(host, pan.firstChild); } }
  if (host) { host.innerHTML = gaugesHtml(r); setTimeout(() => host.classList.add("painted"), 1500); }
  const pc = $("#personaCard"); if (pc) { pc.innerHTML = personaCardHtml(true); setTimeout(() => { pc.classList.add("painted"); const pf = $("#p-future"); if (pf) pf.classList.add("painted"); }, 1500); }
}
document.addEventListener("click", e => { const t = e.target.closest && e.target.closest("[data-open]"); if (t && (t.dataset.open === "stance" || t.dataset.open === "codes") && t.closest(".pc-gauges")) { e.preventDefault(); openStance(t.dataset.open); } });
// her live Hogwarts persona for the right-hand panel (replaces the greeting card)
function personaCardHtml(){
  const r = stanceNow(); if (!r) return "";
  const hp = StanceKit.persona(r.js, r.st), h = new Date().getHours(), hi = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `<div class="pc-card"><div class="pc-hi">${hi}, Oktifani</div>
    <div class="sg-hp-top"><span class="sg-hp-icon" aria-hidden="true">${hp.icon}</span><div><div class="small muted" style="text-transform:uppercase;letter-spacing:.08em;font-weight:600">Today you write like</div><div class="sg-hp-name">${esc(hp.name)}</div><div class="small muted">In Fantastic Beasts: ${esc(hp.fb)}</div></div></div>
    <p class="pc-line">${esc(hp.line)}</p>${hp.warn ? `<p class="small" style="color:var(--bad);margin:0 0 6px">${esc(hp.warn)}</p>` : ""}
    <p class="small" style="margin:0 0 10px"><b>${esc(hp.twist)}</b></p>
    <div class="pc-mc">${hp.compass.slice().sort((a, b) => a.pos - b.pos).map(c => `<span class="pc-mc-c${c.top ? " on" : ""}" title="${esc(c.hp)} · ${esc(c.fb)} · ${esc(c.tradition)}: ${c.share}%">${c.icon}<em>${c.share}%</em></span>`).join("")}</div>
    <div class="sg-mc-axis"><span>← Left</span><span>moral compass</span><span>Right →</span></div>
    <div class="sg-h" style="margin:12px 0 6px">Your political counterparts</div>
    <div class="pc-pol">${hp.politics.map(x => `<div class="pc-pol-r"><span class="pc-pol-f">${x.flag}</span><div><b>${esc(x.who)}</b> <span class="small muted">${esc(x.label)}</span>${x.role ? `<div class="small muted">${esc(x.role)}</div>` : ""}<div class="small">${esc(x.line)}</div></div></div>`).join("")}</div>
    <p class="small muted" style="margin:6px 0 0">Matched by policy themes, for fun. Party shown as a public fact; not an endorsement.</p>
    <button class="btn ghost" type="button" id="pcMore" style="font-size:.75rem;padding:4px 10px;margin-top:8px">Stance &amp; justice details</button></div>`;
}
window.STUDIO_PERSONA = personaCardHtml;
document.addEventListener("click", e => { if (e.target && e.target.id === "pcMore") openStance("stance"); });
function openStance(view){
  const r = stanceNow(); if (!r) return; const st = r.st, cd = r.cd, x = 50 + st.pos / 2;
  modal(view === "codes" ? "Codes & laws you follow" : "Political stance & justice", `
    <div class="sg-wrap ${view === "codes" ? "only-codes" : "only-stance"}">
      <div class="sg-stance"><div class="sg-h">Political stance: left or right</div>
        <div class="sg-spec"><div class="sg-axis"><span><b>Left</b> · critical / structural</span><span>Centre</span><span><b>Right</b> · market / individual</span></div><div class="sg-track"><i style="left:${x}%"><b>${st.pos > 0 ? "+" : ""}${st.pos}</b></i></div></div>
        <p style="margin:8px 0 0"><b>${esc(st.lean)}</b> · ${st.left} left-register (critical) terms, ${st.right} right-register (market) terms</p>
        <div class="sg-h" style="margin-top:14px">Balance <span style="float:right;font-family:var(--serif);font-size:1.6rem">${st.balance}</span></div>
        <div class="sg-bal"><i style="width:${st.balance}%"></i></div>
        <p class="small muted" style="margin:6px 0 0">${st.counter} counter-argument markers · ${st.attrib} attributions · ${st.unattributed.length} loaded claims in your own voice. ${esc(st.advice)}</p>
        ${st.unattributed.length ? `<details style="margin-top:8px"><summary class="small">Loaded claims to attribute or balance (${st.unattributed.length})</summary>${st.unattributed.map(u => `<p class="small" style="margin:6px 0;padding-left:10px;border-left:2px solid var(--line)">${esc(u.slice(0, 260))}</p>`).join("")}</details>` : ""}
        ${(() => { const hp = StanceKit.persona(r.js, r.st); return `<div class="sg-h" style="margin-top:18px">🪄 Your Hogwarts persona today</div>
        <div class="sg-hp"><div class="sg-hp-top"><span class="sg-hp-icon" aria-hidden="true">${hp.icon}</span><div><div class="sg-hp-name">${esc(hp.name)}</div><div class="small muted">In Fantastic Beasts: ${esc(hp.fb)}</div></div></div><p>${esc(hp.line)}</p>${hp.warn ? `<p class="small" style="color:var(--bad)">${esc(hp.warn)}</p>` : ""}${hp.with ? `<p class="small muted">With a touch of ${esc(hp.with)}.</p>` : ""}<p class="small"><b>${esc(hp.twist)}</b></p>
          <div class="sg-h" style="margin:10px 0 6px">Moral compass</div>
          <div class="sg-mc">${hp.compass.slice().sort((a, b) => a.pos - b.pos).map(c => `<div class="sg-mc-c${c.top ? " on" : ""}" title="${esc(c.tradition)}: ${c.share}% of your justice vocabulary"><span class="sg-mc-i">${c.icon}</span><b>${esc(c.hp)}</b><span>${esc(c.fb)}</span><em>${c.share}%</em></div>`).join("")}</div>
          <div class="sg-mc-axis"><span>← Left</span><span>Right →</span></div>
          <div class="sg-h" style="margin:12px 0 6px">Your political counterparts</div>
          <div class="pc-pol">${hp.politics.map(x => `<div class="pc-pol-r"><span class="pc-pol-f">${x.flag}</span><div><b>${esc(x.who)}</b> <span class="small muted">${esc(x.label)}</span>${x.role ? `<div class="small muted">${esc(x.role)}</div>` : ""}<div class="small">${esc(x.line)}</div></div></div>`).join("")}</div>
          <p class="small muted" style="margin:6px 0 0">Matched by the policy themes of their public roles to the justice tradition your writing leans on. Just for fun: Indonesian party affiliation is shown as a public fact, not an endorsement, and it says nothing about how you vote.</p></div>`; })()}
        <div class="sg-h" style="margin-top:18px">Justice compass</div>
        <blockquote class="sg-verse">${esc(r.js.verse)}</blockquote>
        <div class="sg-jtrack"><span class="sg-jaxis">Left</span><span class="sg-jaxis r">Right</span>${r.js.rows.map(j => `<span class="sg-jdot" style="left:${50 + j.pos / 2}%;width:${8 + j.share / 3}px;height:${8 + j.share / 3}px;opacity:${j.n ? 1 : .25}" title="${esc(j.name)} (${esc(j.who)}): ${j.share}%"></span>`).join("")}<i style="left:${50 + r.js.pos / 2}%"></i></div>
        ${r.js.ranked.map(j => `<div class="sg-jrow"><span><b>${esc(j.name)}</b> <span class="small muted">${esc(j.who)}</span></span><span class="sg-jbar"><i style="width:${j.share}%"></i></span><b>${j.share}%</b></div>`).join("")}
        <p class="small muted" style="margin:6px 0 0">Read live from the words you use for justice, care, rights, outcomes and freedom. Your RQ2 asks where responsibility is placed; this shows which answer your own prose leans towards.</p>
        <p class="small muted" style="margin:10px 0 0">Left and right here describe the framing vocabulary of the text, not your own politics. Left means a critical, structural register (neoliberalism, inequality, power); right means a market, individual register (innovation, choice, personal responsibility). A thesis built on neuroliberalism will sit left of centre, and that is fine. Examiners check that you represent the right-of-centre view fairly and that strong claims are attributed or evidenced.</p>
      </div>
      <div class="sg-codes"><div class="sg-h">Codes &amp; laws you must follow <span style="float:right;font-family:var(--serif);font-size:1.6rem">${cd.score}%</span></div>
        <p class="small muted" style="margin:2px 0 8px">Data, safeguarding and AI-use laws are checked in your ethics form, where compliance is stated; the rest across ${NS === "-ethics" ? "the form" : "this document and the form"}. Green means the text shows how you follow it.</p>
        ${cd.rows.map(c => `<div class="sg-code"><span class="sg-dot" style="background:${c.ok ? "var(--ok)" : c.level === "must" ? "var(--bad)" : "var(--gold)"}"></span><div><b>${esc(c.name)}</b> <span class="sg-lv">${c.level === "must" ? "must follow" : c.level === "should" ? "should follow" : "know about"} · ${c.kind}</span><div class="small muted">${esc(c.why)}${c.ok ? "" : c.inForm ? " <b>Not yet addressed in your ethics form.</b>" : " <b>Not yet addressed in your text.</b>"}${c.link ? ` <a href="${c.link}" target="_blank" rel="noopener">Read ↗</a>` : ""}</div></div></div>`).join("")}
        <p class="small muted" style="margin:10px 0 0">A guide, not legal advice. For anything uncertain, ask the Goldsmiths research ethics team or the Data Protection Officer.</p>
      </div>
    </div>`);
}
(function stanceStyles(){
  const st = document.createElement("style");
  st.textContent = `.pc-gauges{display:grid;gap:8px;margin-bottom:12px}
  #gaugeHost{padding:10px 10px 0}.gbox{border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:10px 12px;display:grid;gap:6px;min-width:0}
  .gbox-h{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em}
  .gbox-x{font:inherit;font-size:.7rem;text-transform:none;letter-spacing:0;border:1px solid var(--line);background:none;color:var(--ink-2);border-radius:999px;padding:2px 9px;cursor:pointer}.gbox-x:hover{border-color:var(--accent);color:var(--accent)}
  .sp-scale{display:flex;justify-content:space-between;font-size:.72rem;font-weight:600;color:var(--ink-2)}
  .sp-track{position:relative;height:16px;border-radius:999px;background:linear-gradient(90deg,color-mix(in srgb,var(--plum, #6a3d73) 45%,transparent),var(--surface-2) 50%,color-mix(in srgb,var(--teal) 45%,transparent))}
  .sp-tick{position:absolute;top:2px;bottom:2px;width:1px;background:var(--line)}.sp-tick.c{background:var(--muted);top:-3px;bottom:-3px}
  .sp-word{position:absolute;top:-5px;width:5px;height:26px;border-radius:3px;background:var(--ink);transform:translateX(-2px)}
  .sp-just{position:absolute;top:2px;width:12px;height:12px;transform:translateX(-6px) rotate(45deg);background:var(--gold);border:1px solid var(--surface)}
  .sp-key{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.74rem;color:var(--muted)}.sp-key i{display:inline-block;margin-right:4px;vertical-align:middle}
  .k-word{width:4px;height:12px;background:var(--ink);border-radius:2px}.k-just{width:8px;height:8px;background:var(--gold);transform:rotate(45deg)}
  .ss-g{width:100%;min-width:0}.ss-lbl{display:flex;justify-content:space-between;font-size:.66rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.ss-lbl b{color:var(--ink);font-size:.7rem}
  .ss-bar{position:relative;height:10px;border-radius:999px;margin:3px 0;background:linear-gradient(90deg,color-mix(in srgb,var(--plum, #6a3d73) 30%,transparent),var(--surface-2) 50%,color-mix(in srgb,var(--teal) 30%,transparent))}
  .ss-bar i{position:absolute;top:-3px;width:4px;height:16px;border-radius:2px;background:var(--ink);transform:translateX(-2px)}
  .ss-bar u{position:absolute;top:0;width:10px;height:10px;transform:translateX(-5px) rotate(45deg);background:var(--gold);text-decoration:none}
  .ss-verse{font-family:var(--serif);font-style:italic;font-size:.78rem;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sg-verse{margin:6px 0 12px;padding:8px 14px;border-left:3px solid var(--gold);font-family:var(--serif);font-style:italic;font-size:1.05rem;line-height:1.5;color:var(--ink)}
  .sg-jtrack{position:relative;height:30px;border-radius:999px;margin:4px 0 12px;background:linear-gradient(90deg,color-mix(in srgb,var(--plum, #6a3d73) 25%,transparent),var(--surface-2) 50%,color-mix(in srgb,var(--teal) 25%,transparent))}
  .sg-jaxis{position:absolute;top:7px;left:10px;font-size:.66rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.sg-jaxis.r{left:auto;right:10px}
  .sg-jdot{position:absolute;top:50%;transform:translate(-50%,-50%);border-radius:50%;background:var(--gold)}
  .sg-jtrack i{position:absolute;top:-4px;bottom:-4px;width:3px;background:var(--ink);transform:translateX(-1px);border-radius:2px}
  .sg-hp{border:1px solid var(--line);border-radius:12px;padding:10px 14px;background:linear-gradient(135deg,color-mix(in srgb,var(--gold) 14%,var(--surface)),var(--surface))}
  .sg-hp-name{font-family:var(--serif);font-size:1.35rem;line-height:1.1}
  .sg-hp-top{display:flex;gap:12px;align-items:center;margin-bottom:8px}.sg-hp-icon{font-size:2.6rem;line-height:1;width:56px;height:56px;display:grid;place-items:center;border-radius:50%;background:var(--surface);border:2px solid var(--gold)}
  .sg-mc{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}@media(max-width:640px){.sg-mc{grid-template-columns:repeat(4,minmax(0,1fr))}}
  .sg-mc-c{border:1px solid var(--line);border-radius:10px;padding:6px 4px;text-align:center;display:grid;gap:2px;font-size:.66rem;color:var(--muted);background:var(--surface);min-width:0}
  .sg-mc-c b{font-size:.7rem;color:var(--ink);line-height:1.2}.sg-mc-c span{line-height:1.2}.sg-mc-c em{font-style:normal;font-weight:600;color:var(--ink-2)}
  .sg-mc-c.on{border-color:var(--gold);box-shadow:0 0 0 2px color-mix(in srgb,var(--gold) 40%,transparent);background:color-mix(in srgb,var(--gold) 12%,var(--surface))}
  .sg-mc-i{font-size:1.3rem}
  .pc-card{border-radius:12px;padding:14px 16px;margin-bottom:12px;border-left:5px solid var(--gold);background:linear-gradient(135deg,color-mix(in srgb,var(--gold) 16%,var(--surface)),var(--surface))}
  .pc-hi{font:500 1.25rem var(--serif);margin-bottom:8px}
  .pc-pol{display:grid;gap:6px}.pc-pol-r{display:grid;grid-template-columns:24px minmax(0,1fr);gap:8px;align-items:start;font-size:.86rem;padding:6px 8px;border-radius:8px;background:var(--surface)}.pc-pol-f{font-size:1.1rem;line-height:1.3}.pc-line{font-family:var(--serif);font-size:.98rem;margin:0 0 8px}
  .pc-mc{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
  .pc-mc-c{display:grid;justify-items:center;gap:1px;padding:4px 0;border-radius:8px;border:1px solid var(--line);background:var(--surface);font-size:1.05rem;cursor:default}
  .pc-mc-c em{font-style:normal;font-size:.62rem;color:var(--muted);font-weight:600}.pc-mc-c.on{border-color:var(--gold);box-shadow:0 0 0 2px color-mix(in srgb,var(--gold) 40%,transparent)}
  .sg-mc-axis{display:flex;justify-content:space-between;font-size:.66rem;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.06em}.sg-hp p{margin:0 0 6px;font-size:.9rem}
  .sg-jrow{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) 38px;gap:8px;align-items:center;font-size:.84rem;margin-bottom:4px}
  .sg-jbar{height:6px;border-radius:999px;background:var(--surface-2);position:relative;overflow:hidden}.sg-jbar i{position:absolute;inset:0 auto 0 0;background:var(--gold);border-radius:999px}
  .sg-jrow > b{text-align:right;font-variant-numeric:tabular-nums}
  .ss-sub{font-size:.72rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ss-c{text-align:center}.ss-num{font-family:var(--serif);font-size:1.7rem;line-height:1}
  .sg-wrap{display:grid;grid-template-columns:1fr;gap:22px;max-width:720px}.sg-wrap.only-codes .sg-stance,.sg-wrap.only-stance .sg-codes{display:none}
  .sg-h{font-size:.74rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:600;margin-bottom:6px}
  .sg-axis{display:flex;justify-content:space-between;font-size:.72rem;color:var(--muted)}
  .sg-track{position:relative;height:22px;border-radius:999px;margin-top:4px;background:linear-gradient(90deg,color-mix(in srgb,var(--plum, #6a3d73) 45%,transparent),var(--surface-2) 50%,color-mix(in srgb,var(--teal) 45%,transparent))}
  .sg-track i{position:absolute;top:-6px;width:6px;height:34px;border-radius:3px;background:var(--ink);transform:translateX(-3px)}
  .sg-track i b{position:absolute;top:36px;left:50%;transform:translateX(-50%);font:600 .78rem var(--sans);white-space:nowrap}
  .sg-spec{padding-bottom:20px}
  .sg-bal{height:10px;border-radius:999px;background:var(--surface-2);position:relative;overflow:hidden}.sg-bal i{position:absolute;inset:0 auto 0 0;background:var(--accent);border-radius:999px}
  .sg-code{display:grid;grid-template-columns:12px minmax(0,1fr);gap:8px;padding:6px 0;border-bottom:1px solid var(--line);font-size:.86rem}
  .sg-dot{width:10px;height:10px;border-radius:50%;margin-top:5px}.sg-lv{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}`;
  document.head.appendChild(st);
  let t = null; document.addEventListener("input", e => { if (e.target === ed || e.target.id === "titleInput") { clearTimeout(t); t = setTimeout(paintStance, 1200); } });
})();
// toolbar buttons (added here so all three studios get them)
(function addToolButtons(){
  const anchor = $("#wordBtn"); if (!anchor) return;
  const sb = document.createElement("button"); sb.className = "btn ghost"; sb.type = "button"; sb.id = "scopeBtn"; sb.textContent = "🧭 Scope"; sb.addEventListener("click", () => openScope());
  const zb = document.createElement("button"); zb.className = "btn ghost"; zb.type = "button"; zb.id = "zoteroBtn"; zb.textContent = "📚 Zotero"; zb.title = "Check citations against your Zotero library and build the reference list"; zb.addEventListener("click", openZotero);
  const nb = document.createElement("button"); nb.className = "btn ghost"; nb.type = "button"; nb.id = "nvivoBtn"; nb.textContent = "🗂 NVivo"; nb.title = "Bring NVivo codes and coded quotes into your writing"; nb.addEventListener("click", () => openNVivo());
  const cb = document.createElement("button"); cb.type = "button"; cb.id = "softBtn"; cb.className = "btn ghost soft-btn"; cb.textContent = "🌱 Soft scenario";
  cb.title = "For a gentler day: more generous scoring and warmer supervisor reactions. Click again to switch back."; cb.setAttribute("aria-pressed", String(isGentle()));
  cb.addEventListener("click", () => setMode(isGentle() ? "critical" : "gentle"));
  anchor.parentNode.insertBefore(cb, anchor); anchor.parentNode.insertBefore(sb, anchor); anchor.parentNode.insertBefore(zb, anchor); anchor.parentNode.insertBefore(nb, anchor);
  let t = null; document.addEventListener("input", e => { if (e.target === ed || e.target.id === "titleInput") { clearTimeout(t); t = setTimeout(paintScopeChip, 1200); } });
})();
const startId = (location.hash || "").slice(1) || wrStore.get("wr-studio-last" + NS, "title");
switchTab(wrStore.get("wr-studio-tab-v2", "checks"));  // opens on Checks; Future you is one click away
openSection(DS.get(startId) ? startId : "title");
$("#dwc").textContent = docWords().toLocaleString();
setTimeout(paintScopeChip, 300);
setTimeout(paintStance, 400);
})();
