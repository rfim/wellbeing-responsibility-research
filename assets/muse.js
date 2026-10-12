// Muse: personal favourites that colour the revision studio's encouragement.
// All lines are original; no lyrics or quotations.
(function () {
  var KEY = "wr-muse";
  var MUSES = {
    austen: { name: "Jane Austen", emoji: "🪶", accent: "#6f8f72", tagline: "Revising in the Regency style",
      lines: [
        "Pride and Prejudice began life as a draft called “First Impressions”. Your first draft is allowed to be a first impression.",
        "Austen revised for years before she published. A slow section is in very good company.",
        "Write with Austen’s economy: every sentence should earn its place in the drawing room.",
        "Austen’s irony works because she always knows exactly who is speaking. Does your paragraph?",
        "A well-made argument, like a well-made match, needs both sense and sensibility."],
      revised: "A section worthy of Pemberley.", stamp: "Approved in the drawing room", points: "" },
    swift: { name: "Taylor Swift", emoji: "🎤", accent: "#8a6fb0", tagline: "The Eras Tour of your upgrade",
      lines: [
        "Every chapter is an era. You’re on the upgrade tour now.",
        "This revision is your “Taylor’s Version”: same story, now fully yours.",
        "A great bridge changes the whole song. Your transition sentences are your bridges.",
        "Stadium tours start in small rooms. So do big theses.",
        "Owning your work is the whole point. Every sentence here is yours."],
      revised: "Era complete ✨", stamp: "Taylor’s Version", points: "" },
    rowling: { name: "J.K. Rowling", emoji: "⚡", accent: "#7a2e2e", tagline: "House points for every fix",
      lines: [
        "The first Harry Potter book was turned down by several publishers before it found a home. Rejection is part of the plot.",
        "Rowling plotted her series carefully, famously on hand-drawn grids. Your chapter plan is your map.",
        "Ten points for every error fixed. The House Cup is the upgrade.",
        "Every great series starts with one chapter that works. Make this one work.",
        "A good plot plants its clues early. So does a good introduction."],
      revised: "Ten points to your House!", stamp: "Mischief managed", points: "house" },
    hirata: { name: "Andrea Hirata", emoji: "🌈", accent: "#d08a1e", tagline: "Semangat, Laskar Pelangi",
      lines: [
        "Andrea Hirata wrote Laskar Pelangi to honour the teacher who believed in him. Write this chapter for the people who believed in you.",
        "From Belitung to the world: an Indonesian story told well travels far. So will yours.",
        "Semangat! The Rainbow Troop kept going with very little. You have a draft, a plan and a whole studio.",
        "Small schools can produce big stories. Small paragraphs can carry big ideas.",
        "Satu paragraf hari ini, satu bab bulan depan."],
      revised: "Satu lagi selesai! 🌈", stamp: "Laskar Pelangi approved", points: "" },
    srimulyani: { name: "Bu Sri Mulyani", emoji: "📊", accent: "#1f4e79", tagline: "Fiscal discipline for your word count",
      lines: [
        "Think like a finance minister: your word count is a budget. Spend it where it delivers the most.",
        "Every claim needs a source, like every rupiah needs an audit trail.",
        "Known for transparency and discipline. Your methods chapter earns trust the same way.",
        "Steady, accountable progress beats a dramatic stimulus the night before the deadline.",
        "Cut the waste, keep the essentials, and show your working."],
      revised: "Section audited and balanced ✓", stamp: "Lulus audit", points: "" },
    dian: { name: "Dian Sastrowardoyo", emoji: "🎬", accent: "#b9506f", tagline: "Take two, and action!",
      lines: [
        "Dian Sastro combined a film career with degrees in philosophy and management. Art and scholarship can share one life.",
        "Every great scene needs a second take. This is take two of your upgrade.",
        "AADC proved a story about books and poetry could fill cinemas. Ideas can be thrilling.",
        "Directors cut scenes they love when the story needs it. Be brave with the delete key.",
        "Hit your mark, say the line clearly, move the story on. That is a paragraph."],
      revised: "Cut! That’s a wrap on this section 🎬", stamp: "Final cut", points: "" },
    library: { name: "The library", emoji: "📚", accent: "#7a5c3e", tagline: "Quiet please: revision in progress",
      lines: [
        "Treat each section like a returned book: check it, mend it, stamp it, shelve it.",
        "You know how to catalogue a whole collection. A thesis is just a very particular one.",
        "Quiet hours: 25 minutes of focus, then 5 minutes to wander the stacks.",
        "Every great library started with one shelf. Every thesis starts with one section.",
        "Good catalogue entries are short, exact and findable. So are good topic sentences."],
      revised: "Stamped and shelved 📚", stamp: "RETURNED · REVISED", points: "" }
  };
  var ORDER = ["austen", "swift", "rowling", "hirata", "srimulyani", "dian", "library"];
  function dayIndex() { var d = new Date(); return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); }
  var api = {
    MUSES: MUSES, ORDER: ORDER,
    choice: function () { try { return localStorage.getItem(KEY) || "mix"; } catch (e) { return "mix"; } },
    set: function (k) { try { localStorage.setItem(KEY, k); } catch (e) {} },
    current: function () { var c = api.choice(); if (c === "mix" || !MUSES[c]) c = ORDER[dayIndex() % ORDER.length]; return Object.assign({ key: c }, MUSES[c]); },
    line: function (spin) { var m = api.current(); return m.lines[(dayIndex() + (spin || 0)) % m.lines.length]; },
    applyAccent: function () { var m = api.current(); document.documentElement.style.setProperty("--muse", m.accent); }
  };
  window.Muse = api;
})();
