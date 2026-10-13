// Viva-readiness rubric for the thesis studio, modelled on UK (University of London) PhD criteria:
// originality and a distinct contribution to knowledge, critical engagement with the literature,
// methodological rigour, coherent argument, satisfactory presentation and suitability for publication.
(function () {
  var Q = /“[^”]{8,}”/g, CITE = /\(\D{0,60}\d{4}[a-z]?[^)]*\)|\d{4}[a-z]?\)/g;
  function noPrompt(D, id) { return D.t(id).trim().length > 0 && !/Prompt:/.test(D.t(id)); }
  function wc(s) { return (s.match(/\S+/g) || []).length; }
  window.THESIS_RUBRIC = [
    { k: "orig", name: "Originality & contribution to knowledge", w: 14, base: 3.0, target: 8.5, note: "Examiners look for a distinct, clearly stated contribution, returned to in the conclusion.",
      checks: [
        ["Contributions set out in the introduction (§1.7)", function (D) { return D.done("t1-7") && /contribut/i.test(D.t("t1-7")); }, "t1-7"],
        ["Conclusion states the contributions to knowledge (§9.2)", function (D) { return D.done("t9-2"); }, "t9-2"],
        ["Discussion engages the literature (8+ citations in Ch 8)", function (D) { return D.count(CITE, "8.") >= 8; }, "t8-2"] ] },
    { k: "rqs", name: "Research questions answered", w: 12, base: 2.5, target: 9.0, note: "Each question needs a direct, evidenced answer.",
      checks: [
        ["Each findings chapter ends with a written conclusion", function (D) { return D.done("t5-6") && D.done("t6-5") && D.done("t7-6"); }, "t5-6"],
        ["Discussion answers RQ1, RQ2 and RQ3 (§8.1)", function (D) { var t = D.t("t8-1"); return D.done("t8-1") && /RQ1/.test(t) && /RQ2/.test(t) && /RQ3/.test(t); }, "t8-1"],
        ["Summary of the argument revisits the questions (§9.1)", function (D) { return D.done("t9-1") && /RQ1|research question/i.test(D.t("t9-1")); }, "t9-1"] ] },
    { k: "lit", name: "Literature & theoretical framework", w: 12, base: 5.5, target: 8.5, note: "Critical engagement, with theory carried through into the analysis.",
      checks: [
        ["Conceptual framework written (§3.8)", function (D) { return D.done("t3-8"); }, "t3-8"],
        ["Framework figure in Chapter 3", function (D) { return D.figuresIn("3.") > 0; }, "t3-8"],
        ["Theory used in findings and discussion (neuroliberal… 3+ times in Ch 5–8)", function (D) { var r = /neuroliberal/gi; return D.count(r, "5.") + D.count(r, "6.") + D.count(r, "7.") + D.count(r, "8.") >= 3; }, "t8-2"] ] },
    { k: "method", name: "Methodology & ethics", w: 12, base: 5.0, target: 8.5, note: "A transparent, rigorous and ethical design, applied as described.",
      checks: [
        ["Worked example of the analysis (§4.7)", function (D) { return D.done("t4-7"); }, "t4-7"],
        ["Ethics approval and data management reported (§4.8)", function (D) { return D.done("t4-8") && /approv/i.test(D.t("t4-8")); }, "t4-8"],
        ["Reflexivity section written (§4.9)", function (D) { return D.done("t4-9"); }, "t4-9"],
        ["Completed work in the past tense (no “I will interview…” in Ch 4–7)", function (D) { return !/\bI will (interview|analyse|conduct|recruit|collect|code)\b/.test(D.ch("4.") + D.ch("5.") + D.ch("6.") + D.ch("7.")); }, "t4-6"] ] },
    { k: "evidence", name: "Evidence & analysis", w: 16, base: 1.5, target: 8.5, note: "Substantial, well-evidenced findings chapters that show the analysis.",
      checks: [
        ["Chapter 5 at 8,000+ words", function (D) { return D.words("5.") >= 8000; }, "t5-3"],
        ["Chapter 6 at 8,000+ words", function (D) { return D.words("6.") >= 8000; }, "t6-3"],
        ["Chapter 7 at 8,000+ words", function (D) { return D.words("7.") >= 8000; }, "t7-3"],
        ["15+ quotations from the data across Ch 5–7", function (D) { return D.count(Q, "5.") + D.count(Q, "6.") + D.count(Q, "7.") >= 15; }, "t5-3"],
        ["3+ figures or tables in the findings chapters", function (D) { var tb = /Table \d+\.\d+/g; return D.figuresIn("5.") + D.figuresIn("6.") + D.figuresIn("7.") + D.count(tb, "5.") + D.count(tb, "6.") + D.count(tb, "7.") >= 3; }, "t5-2"] ] },
    { k: "coh", name: "Coherence of the argument", w: 10, base: 3.0, target: 8.0, note: "A single argument running from introduction to conclusion.",
      checks: [
        ["Structure of the thesis set out (§1.8)", function (D) { return D.done("t1-8"); }, "t1-8"],
        ["Findings chapters open with “This chapter…”", function (D) { return ["t5-1", "t6-1", "t7-1"].every(function (id) { return noPrompt(D, id) && /this chapter/i.test(D.t(id)); }); }, "t5-1"],
        ["Chapters 5–7 hand over to the next chapter", function (D) { return ["t5-6", "t6-5", "t7-6"].every(function (id) { return noPrompt(D, id) && /next chapter|chapter \d|turns to/i.test(D.t(id)); }); }, "t5-6"] ] },
    { k: "pres", name: "Presentation & style", w: 8, base: 5.0, target: 8.5, note: "A satisfactory standard of literary presentation.",
      checks: [
        ["No writing prompts left anywhere", function (D) { return D.count(/Prompt:/g) === 0; }, "abstract"],
        ["No contractions", function (D) { return !/\b(it|don|doesn|can|won|isn|aren|wasn|weren|haven|hasn|didn|couldn|shouldn|wouldn|they|we|you|let|that|there)['’](s|t|re|ve|ll|m)\b/i.test(D.all()); }, "t2-1"],
        ["Total length 80,000–100,000 words (check the Goldsmiths limit)", function (D) { var w = D.totalWords(); return w >= 80000 && w <= 100000; }, "t5-3"] ] },
    { k: "apparatus", name: "Scholarly apparatus", w: 8, base: 3.0, target: 8.5, note: "Complete references, appendices and front matter.",
      checks: [
        ["Reference list with 150+ entries", function (D) { return D.paras("references").filter(function (p) { return /\(\d{4}[a-z]?\)|\d{4}[a-z]?\./.test(p); }).length >= 150; }, "references"],
        ["Appendices drafted", function (D) { return D.done("appendices"); }, "appendices"],
        ["No “&” between author names", function (D) { return !/\b[A-Z][a-z]+ & [A-Z][a-z]+/.test(D.all()); }, "t4-1"],
        ["Acknowledgements and declaration completed", function (D) { return noPrompt(D, "acknowledgements") && noPrompt(D, "declaration"); }, "declaration"] ] },
    { k: "pub", name: "Suitability for publication", w: 8, base: 2.0, target: 8.5, note: "Chapters that could become journal articles.",
      checks: [
        ["Half of the findings sections marked revised", function (D) { return (D.revisedShare("5.") + D.revisedShare("6.") + D.revisedShare("7.")) / 3 >= 0.5; }, "t5-1"],
        ["Abstract finalised (no prompt, 300 words or fewer)", function (D) { return noPrompt(D, "abstract") && wc(D.t("abstract")) <= 300; }, "abstract"] ] }
  ];
  window.THESIS_VERDICT = function (s) { return s >= 8.5 ? "Ready for the viva" : s >= 7 ? "Minor corrections" : s >= 5.5 ? "Major corrections" : "Not yet examinable"; };
  // which papers and careers each chapter builds (used by the “Future you” panel)
  var CH = {
    "1": [["p1", "p2"], ["uk-lecturer", "id-lecturer"], "Your introduction becomes the opening of every job talk and fellowship proposal."],
    "2": [["p1"], ["uk-regulator", "uk-policy"], "Context chapters show policy teams you understand the landscape."],
    "3": [["p1"], ["uk-lecturer", "eu-postdoc"], "This chapter is the core of Paper 1 and of your teaching."],
    "4": [["p5"], ["uk-agency", "uk-ux"], "A rigorous method chapter proves you can run research projects."],
    "5": [["p2"], ["uk-postdoc", "uk-policy"], "Chapter 5 is Paper 2 in waiting."],
    "6": [["p3"], ["uk-postdoc", "us-nonprofit", "uk-ngo"], "Chapter 6 speaks to the families, AI and media research agenda."],
    "7": [["p4", "brief"], ["id-lecturer", "id-intl", "id-gov"], "Chapter 7 is the part only you can write. It becomes Paper 4 and a policy brief."],
    "8": [["p1", "fellow"], ["uk-fellowship", "eu-msca"], "Your discussion is the seed of a fellowship proposal."],
    "9": [["fellow"], ["uk-fellowship", "uk-lecturer"], "A strong conclusion is what examiners reread before the viva."]
  };
  window.THESIS_FUTURE = function (id) { var m = /^t(\d+)-/.exec(id || ""); var c = m && CH[m[1]]; return c ? { papers: c[0], roles: c[1], why: c[2] } : null; };
})();
