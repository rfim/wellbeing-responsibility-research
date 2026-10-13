// Word import for the ethics form (Goldsmiths REISC EAF1: PGR). The form has no numbered headings,
// so answers are found by the form's own questions: each answer is the text after its question and before
// the next question or the form's guidance notes. Applicant details (student number, email), signatures
// and the attachment table are deliberately not imported, so they never reach the public copy.
(function () {
  // [section id, the question as printed on the form]
  var ANCHORS = [
    ["title", "Title of proposed project"],
    ["e1-2", "Proposed start and end dates"],
    ["e1-3", "Names of any other Goldsmiths researchers involved and their roles"],
    ["e1-4", "Names of any collaborating institutions and their roles, if applicable"],
    ["e1-5", "Brief outline of the project, including its purpose (max 500 words)"],
    ["e1-6", "Brief outline of research data collection/activity/practice (max 500 words)"],
    ["e1-7", "If the project involves research fieldwork outside the UK, list countries where it will be undertaken"],
    ["e1-8", "Have you submitted a travel insurance & risk assessment form?"],
    ["e1-9", "If external grant funding has or is being secured, does the research need ethical approval prior to the initiation of that funding?"],
    ["e1-10", "Has the project been approved by an Ethics Committee external to the College? If so please specify. (NB For projects so approved, applicants should append a copy of that application; this may be presented as supplementary information and referenced in your application, but should not be regarded as a substitute for completion of this Goldsmiths form.)"],
    ["e2-1", "Briefly describe your reflections on the key ethical issues or dilemmas posed by the research indicating in particular any exceptional or unusually challenging ethical issues or dilemmas that it poses and how any adverse effects might be mitigated."],
    ["e3-0", "Are human participants involved in your research?"],
    ["e3-1", "How will participants be involved in your research?"],
    ["e3-2", "How will participant(s) be identified and recruited and will there be any reward or remuneration for their participation?"],
    ["e3-3", "Will participant(s) be fully informed about the nature of the project and their participation?"],
    ["e3-4", "How will participant(s) consent be obtained (if written, please include a copy of the intended consent form)."],
    ["e3-5", "Is there any deception involved?"],
    ["e3-6", "Will participants be told that they can withdraw from participation without giving a reason (it may be reasonable to put a limit on this – e.g. ‘during the period of research activity or data collection’)?"],
    ["e3-7", "How will you ensure that any personal data or information is treated confidentially, and what will the participant(s) be told about this?"],
    ["e4-1", "If any such persons are involved, please outline your procedures, identifying any ethical issues and how any adverse effects might be mitigated."],
    ["e4-2", "If data is collected from an institutional location (such as a school, prison, hospital), has agreement been obtained by the relevant authority (e.g. Head Teacher, Local Education Authority, Home Office)?"],
    ["e4-3", "In cases of research with young persons under the age of 18 years or ‘vulnerable persons’ (e.g. with learning difficulties or with severe cognitive disability), or with those in legal custody, will face-to-face interviews or observations or experiments be overseen by a third party (such as a teacher, care worker or prison officer)?"],
    ["e4-4", "For those conducting research with young persons under the age of 18 years or ‘vulnerable persons’ (e.g. with learning difficulties or with severe cognitive disability), do the investigators have Criminal Records Bureau clearance? (Ordinarily unsupervised research with minors would require such clearance)."],
    ["e4-5", "Is it possible that the research might disclose information regarding child sexual abuse or neglect? If yes, indicate how such information will be passed to the relevant authorities (e.g. social workers, police), but also indicate how participants will be informed about the handling of such information were disclosure of this kind to occur. A warning to this effect must be included in the consent form if such disclosure is likely to occur."],
    ["e5-1", "If so, how will any potentially negative effects be mitigated?"],
    ["e6-1", "Could the study cause harm or negative consequences to participants, including psychological stress or anxiety, beyond the risks reasonably encountered in normal life?"],
    ["e7-1", "Could the study cause harm or negative consequences to you or any co-researchers, including psychological stress or anxiety, beyond the risks reasonably encountered in normal life?"],
    ["e8-1", "Are there any conflicts of interest regarding the investigation and dissemination of the research (e.g. with regard to compromising independence or objectivity due to financial gain)?"],
    ["e8-2", "Is the research likely to have any negative impact on the academic status or reputation of the College and other researchers?"],
    ["e9-1", "How will you ensure participant confidentiality and ensure that any personal data remains confidential?"],
    ["e9-2", "When and how will the data be anonymised?"],
    ["e9-3", "Where will data be stored, who will have access to it and how long will the data be stored?"]
  ];
  // the form's own guidance: never part of an answer, and it ends the answer before it
  var STOPS = [
    "section ", "if human participants are involved", "some further considerations", "consent may be obtained", "documentation may need", "detailed ethical approval",
    "please also consider", "please attach", "recruitment materials", "information sheet or description", "consent form or description", "templates for a gdpr",
    "please complete this section", "young under the age", "vulnerable e g with learning", "or with severe cognitive", "in a care facility", "in legal custody",
    "consent agreement for young", "agreement from relevant authority", "indicate if you anticipate", "animal subjects", "robots or artificial intelligence", "other people such as bystanders",
    "direct or indirect environmental harm", "for example", "will the study involve discussion", "does the research involve experiments", "might the discussion of sensitive",
    "could the project place researchers", "if you have any concerns please contact", "while there are ethical issues", "in general participants should", "gdpr says",
    "applicant signature", "please note that you must notify", "in signing this", "i am familiar with", "i agree to abide", "print name", "signature", "date", "supervisor s",
    "has there been appropriate", "are the ethical implications", "head of department", "attachment checklist", "this section refers to all human", "name of applicant"
  ];
  var SKIP = ["if yes how will any potentially negative effects be mitigated"];
  function norm(s) { return String(s || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, " ").trim(); }
  function stripLead(s) { return String(s).replace(/^[\s ]*(?:\d+\.?|[a-c]\)|[•·▪\-–])[\s ]+/, ""); }
  var A = ANCHORS.map(function (a) { return { id: a[0], n: norm(a[1]) }; });
  function anchorAt(text) { var t = norm(stripLead(text)); for (var i = 0; i < A.length; i++) if (t.indexOf(A[i].n) === 0) return A[i]; return null; }
  function isStop(text) {
    var t = norm(stripLead(text)); if (!t) return false;
    if (/^section \d+\b/.test(t)) return true;
    // guidance lines are short; a long line that merely starts with the same words (“Robots or artificial intelligence: the research…”) is an answer
    return STOPS.some(function (s) { return s !== "section " && (t === s || ((t.indexOf(s + " ") === 0 || (s.length > 12 && t.indexOf(s) === 0)) && t.length <= s.length + 160)); });
  }
  // the rest of a line after its question, e.g. “Is there any deception involved? No.” → “No.”
  function remainder(text, a) {
    var src = stripLead(text), need = a.n.replace(/ /g, "").length, k = 0, i = 0;
    for (; i < src.length && k < need; i++) if (/[a-z0-9]/i.test(src[i])) k++;
    return src.slice(i).replace(/^[\s\u00a0?:.)\]\u2019\u201d'"]+/, "").replace(/\s+\/\s+/g, "/").replace(/\s+:/g, ":").trim();
  }
  function blocks(html) {
    var d = document.createElement("div"), out = []; d.innerHTML = html;
    (function walk(n) {
      Array.prototype.forEach.call(n.children, function (el) {
        var tag = el.tagName;
        if (tag === "TABLE") { out.push({ table: true, text: el.textContent }); return; }
        if (tag === "UL" || tag === "OL") { walk(el); return; }
        if (/^(P|LI|H[1-6]|BLOCKQUOTE)$/.test(tag)) { var t = el.textContent.replace(/ /g, " ").trim(); if (t) out.push({ html: el.innerHTML, text: t }); return; }
        walk(el);
      });
    })(d);
    return out;
  }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function parse(html, sections) {
    var B = blocks(html), cur = null, found = {}, order = [];
    B.forEach(function (b) {
      if (b.table) { cur = null; return; }
      var a = anchorAt(b.text);
      if (a && !found[a.id]) { cur = a.id; found[cur] = []; order.push(cur); var r = remainder(b.text, a); if (r) found[cur].push("<p>" + esc(r) + "</p>"); return; }
      if (!cur) return;
      if (SKIP.indexOf(norm(b.text)) >= 0) return;
      if (isStop(b.text)) { cur = null; return; }
      found[cur].push("<p>" + b.html + "</p>");
    });
    var meta = {}; (sections || []).forEach(function (s) { meta[s.id] = s; });
    return order.filter(function (id) { return found[id].length; }).map(function (id) {
      var m = meta[id] || {}, html = found[id].join("");
      if (id === "title") { var t = found[id].map(function (h) { var d = document.createElement("div"); d.innerHTML = h; return d.textContent.trim(); }).join(" ").replace(/\s+/g, " ").trim(); return { id: id, num: m.num || "", heading: m.heading || "Title", kind: "title", html: esc(t), titleText: t }; }
      return { id: id, num: m.num || "", heading: m.heading || id, html: html };
    });
  }
  window.FormImport = { parse: parse, anchors: ANCHORS.length };
})();
