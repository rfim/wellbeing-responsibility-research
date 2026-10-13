// Ethics-readiness rubric for the ethics studio. Criteria follow what a Goldsmiths departmental ethics
// reviewer checks on the REISC EAF1 (PGR) form, read against the Goldsmiths Code of Practice on Research
// Ethics, the UKRIO Code of Practice for Research, the ESRC Framework for Research Ethics and UK GDPR.
// Each check is a plain test on the text; the studio turns passed checks into a live score per criterion.
(function () {
  function wc(s) { return (String(s).match(/\S+/g) || []).length; }
  function drafted(D, id) { var t = D.t(id); return wc(t) >= 120 && !/Prompt:/.test(t); }
  // the upgrade document, for cross-document consistency
  function up() { return window.DocStore || null; }
  function upAll() { var U = up(); if (!U) return ""; return U.sections().map(function (s) { return U.textOf(s.html); }).join("\n"); }
  function norm(s) { return String(s).toLowerCase().replace(/[^a-z]/g, ""); }

  window.ETHICS_RUBRIC = [
    { k: "clarity", name: "Project and data collection described clearly", w: 10, base: 6.0, target: 9.0, note: "Reviewers need the purpose, the questions and exactly what participants will do, within the word limits.",
      checks: [
        ["Project outline within 500 words (1.5)", function (D) { var n = wc(D.t("e1-5")); return n > 150 && n <= 500; }, "e1-5"],
        ["Data collection outline within 500 words (1.6)", function (D) { var n = wc(D.t("e1-6")); return n > 150 && n <= 500; }, "e1-6"],
        ["All three research questions stated (1.5)", function (D) { var t = D.t("e1-5"); return /RQ1/.test(t) && /RQ2/.test(t) && /RQ3/.test(t); }, "e1-5"],
        ["Start and end dates given (1.2)", function (D) { return /\d{2}\s*\/\s*\d{2}\s*\/\s*\d{4}/.test(D.t("e1-2")); }, "e1-2"] ] },
    { k: "consent", name: "Informed consent", w: 15, base: 5.5, target: 9.0, note: "ESRC principle: participants take part on the basis of full, understandable information, recorded consent and separate consent items.",
      checks: [
        ["Written consent before the first session (3.4)", function (D) { return /written (informed )?consent/i.test(D.t("e3-4")); }, "e3-4"],
        ["Consent reconfirmed at the start of each session (3.4)", function (D) { return /reconfirm|re-confirm|confirm (their )?consent/i.test(D.t("e3-4")); }, "e3-4"],
        ["Separate consent items: recording, quotations, naming (3.4)", function (D) { var t = D.t("e3-4"); return /record/i.test(t) && /quotation/i.test(t) && /named|name/i.test(t); }, "e3-4"],
        ["Documents in Indonesian and English (3.4)", function (D) { return /Indonesian and English|English and Indonesian|Bahasa Indonesia/i.test(D.t("e3-4")); }, "e3-4"],
        ["Participant information sheet drafted (attachment A)", function (D) { return drafted(D, "a-info"); }, "a-info"],
        ["Consent form drafted (attachment B)", function (D) { return drafted(D, "a-consent"); }, "a-consent"] ] },
    { k: "voluntary", name: "Voluntary participation and the right to withdraw", w: 12, base: 6.0, target: 9.0, note: "Gatekeeper recruitment and hierarchy (hormat, sungkan) make freedom to decline the key risk here.",
      checks: [
        ["Withdrawal without giving a reason (3.6)", function (D) { return /without giving a reason/i.test(D.t("e3-6")); }, "e3-6"],
        ["Withdrawal deadline stated (3.6)", function (D) { return /\b(\w+|\d+) weeks? after/i.test(D.t("e3-6")); }, "e3-6"],
        ["Gatekeepers are not told who agreed or declined (3.2)", function (D) { return /not tell the (co-?founders|founders|gatekeepers)/i.test(D.t("e3-2")); }, "e3-2"],
        ["Focus-group withdrawal limits explained (3.6)", function (D) { return /focus group/i.test(D.t("e3-6")) && /cannot remove|not quote/i.test(D.t("e3-6")); }, "e3-6"],
        ["No payment or inducement (3.2)", function (D) { return /not offer any payment|no payment|no reward/i.test(D.t("e3-2")); }, "e3-2"] ] },
    { k: "confid", name: "Confidentiality and anonymity", w: 14, base: 5.5, target: 9.0, note: "Small, identifiable organisations mean anonymity has limits that participants must be told about.",
      checks: [
        ["Pseudonyms or role-based codes (3.7)", function (D) { return /role-based code|pseudonym/i.test(D.t("e3-7") + D.t("e9-1")); }, "e3-7"],
        ["Limits of anonymity explained to identifiable participants (Section 2)", function (D) { return /cannot guarantee their anonymity|may (still|itself) identify/i.test(D.t("e2-1") + D.t("e3-7")); }, "e2-1"],
        ["Focus-group ground rules (Section 2)", function (D) { return /ground rules/i.test(D.t("e2-1")); }, "e2-1"],
        ["Client details removed at transcription (Section 2)", function (D) { return /client/i.test(D.t("e2-1")) && /remove/i.test(D.t("e2-1")); }, "e2-1"],
        ["Key linking pseudonyms to names stored separately (9.1)", function (D) { return /key that links|stored? (the )?key|separately from (the )?transcripts/i.test(D.t("e9-1")); }, "e9-1"] ] },
    { k: "harm", name: "Risk of harm to participants", w: 12, base: 5.0, target: 9.0, note: "The answer to Section 6 must match the risks the form itself describes, with a distress plan and support routes.",
      checks: [
        ["Section 6 answer matches the risks described (Section 6)", function (D) { var t = D.t("e6-1").trim(); return !(/^No\b/.test(t) && /distress|pressure/i.test(t)); }, "e6-1"],
        ["Plan to pause or end a session if distressed (Section 6)", function (D) { return /pause or end|stop the (session|interview)/i.test(D.t("e6-1")); }, "e6-1"],
        ["Participants may skip questions (Section 6)", function (D) { return /skip any question|decline any question/i.test(D.t("e6-1") + D.t("e3-6")); }, "e6-1"],
        ["Support services offered to participants who are upset (Section 6)", function (D) { return /(signpost|support service|helpline|counselling service|list of (local )?support)/i.test(D.t("e6-1")); }, "e6-1"] ] },
    { k: "safeguard", name: "Safeguarding", w: 8, base: 5.5, target: 9.0, note: "Even with adult participants, disclosures about children need a clear, communicated procedure.",
      checks: [
        ["Disclosure procedure stated (Section 4)", function (D) { return /stop recording/i.test(D.t("e4-5")) && /supervisor/i.test(D.t("e4-5")); }, "e4-5"],
        ["Follows Goldsmiths safeguarding guidance (Section 4)", function (D) { return /Goldsmiths.{0,20}safeguarding/i.test(D.t("e4-5")); }, "e4-5"],
        ["Warning included in the information sheet and consent form (Section 4)", function (D) { return /information sheet and consent form/i.test(D.t("e4-5")); }, "e4-5"],
        ["Reporting route in Indonesia identified (Section 4)", function (D) { return /KPAI|UPTD PPA|SAPA 129|child protection (authority|service)|report(ing)? route in Indonesia/i.test(D.t("e4-5")); }, "e4-5"] ] },
    { k: "researcher", name: "Researcher safety and wellbeing", w: 6, base: 6.0, target: 9.0, note: "Reading reports of suicide and harm for long periods is a recognised risk to the researcher.",
      checks: [
        ["Pacing and breaks (Section 7)", function (D) { return /pace|break/i.test(D.t("e7-1")); }, "e7-1"],
        ["Supervision and counselling support (Section 7)", function (D) { return /supervision/i.test(D.t("e7-1")) && /counsel|wellbeing/i.test(D.t("e7-1")); }, "e7-1"],
        ["Sessions at reasonable hours across time zones (Section 7)", function (D) { return /time difference|time zone/i.test(D.t("e7-1")); }, "e7-1"] ] },
    { k: "data", name: "Data management and UK GDPR", w: 14, base: 5.0, target: 9.0, note: "Say what, why, where, who, how long and on what lawful basis, including transfer from Indonesia.",
      checks: [
        ["Stored on Goldsmiths OneDrive (9.3)", function (D) { return /Goldsmiths OneDrive/i.test(D.t("e9-3")); }, "e9-3"],
        ["Recordings deleted after transcripts are checked (9.3)", function (D) { return /delete the audio|delete (the )?recordings/i.test(D.t("e9-3")); }, "e9-3"],
        ["Retention period stated in years (9.3)", function (D) { return /\b(\d+|five|ten|seven) years\b/i.test(D.t("e9-3")); }, "e9-3"],
        ["Lawful basis under UK GDPR named, e.g. public task (9.1)", function (D) { return /lawful basis|public task|Article 6/i.test(D.t("e9-1") + D.t("e9-3") + D.t("e3-7")); }, "e9-1"],
        ["Data from Indonesia: transfer and Indonesia’s data protection law addressed (9.3)", function (D) { var t = D.t("e9-1") + D.t("e9-3") + D.t("e3-7"); return /transfer/i.test(t) || /Law No\.? ?27|UU PDP|Personal Data Protection Law/i.test(t); }, "e9-3"],
        ["NVivo project file stored securely on Goldsmiths OneDrive (9.3)", function (D) { return /NVivo/i.test(D.t("e9-3")); }, "e9-3"],
        ["No identifiable data in external AI tools (Section 5)", function (D) { return /generative AI/i.test(D.t("e5-1")); }, "e5-1"] ] },
    { k: "integrity", name: "Integrity, conflicts and positionality", w: 5, base: 6.0, target: 9.0, note: "UKRIO: declare interests, reflect on the researcher’s position and cite the codes followed.",
      checks: [
        ["Conflicts of interest declared (8.1)", function (D) { return /no financial|no (conflict|stake)/i.test(D.t("e8-1")); }, "e8-1"],
        ["Positionality addressed (Section 2)", function (D) { return /positionality|insider/i.test(D.t("e2-1")); }, "e2-1"],
        ["Codes of practice cited (Goldsmiths Code, UKRIO)", function (D) { var t = D.t("e0-1"); return /Goldsmiths Code/i.test(t) && /UKRIO/i.test(t); }, "e0-1"] ] },
    { k: "consistent", name: "Consistent with the upgrade document", w: 4, base: 4.0, target: 9.0, note: "Panels read the upgrade and the ethics form side by side: title, spelling, numbers and datasets must match.",
      checks: [
        ["Same title as the upgrade document", function (D) { var U = up(); return !!U && norm(D.t("title")) === norm(U.title()); }, "title"],
        ["Same spelling of “wellbeing” as the upgrade", function (D) { return !/well-being/i.test(D.all()); }, "e1-5"],
        ["Number of psychologists phrased the same in both documents", function (D) { var a = /minimum (of )?(5|five)|at least (5|five)/i.test(D.all()), b = /minimum (of )?(5|five)|at least (5|five)/i.test(upAll()); return a === b; }, "e3-1"],
        ["Dataset 1 source matches the upgrade (Nexis or The Guardian)", function (D) { var a = /Nexis/i.test(D.t("e1-6")), b = /Nexis/i.test(upAll()); return a === b; }, "e1-6"] ] }
  ];
  window.ETHICS_VERDICT = function (s) { return s >= 8.5 ? "Ready for review" : s >= 7.5 ? "Minor amendments" : s >= 6 ? "Revise before review" : "Not ready"; };
  window.ETHICS_FUTURE = function () { return { papers: ["p5"], roles: ["uk-agency", "uk-policy"], why: "A careful ethics plan is a skill research teams hire for, and it makes your interviews possible." }; };
})();
