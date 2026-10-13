// Research typography presets for the figures and posters pages.
// Default "Journal": serif reading text (STIX Two Text) + Arial-metric sans for figures and labels (Arimo).
(function () {
  var KEY = "wr-typeface";
  var PRESETS = {
    journal: { name: "Journal · STIX Two Text + Arial", body: "'STIX Two Text', 'Times New Roman', serif", head: "Arimo, Arial, Helvetica, sans-serif", fig: "Arimo, Arial, Helvetica, sans-serif", fonts: [] },
    book: { name: "Book · Source Serif + Source Sans", body: "'Source Serif 4', Georgia, serif", head: "'Source Sans 3', Arial, sans-serif", fig: "'Source Sans 3', Arial, sans-serif", fonts: ["Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400", "Source+Sans+3:wght@400;600;700"] },
    humanities: { name: "Humanities · EB Garamond", body: "'EB Garamond', Garamond, serif", head: "'EB Garamond', Garamond, serif", fig: "'Source Sans 3', Arial, sans-serif", fonts: ["EB+Garamond:ital,wght@0,400;0,600;0,700;1,400", "Source+Sans+3:wght@400;600;700"] },
    classic: { name: "Classic · Libre Baskerville + Arial", body: "'Libre Baskerville', Baskerville, serif", head: "'Libre Baskerville', Baskerville, serif", fig: "Arimo, Arial, Helvetica, sans-serif", fonts: ["Libre+Baskerville:ital,wght@0,400;0,700;1,400"] },
    swiss: { name: "Swiss poster · Arial throughout", body: "Arimo, Arial, Helvetica, sans-serif", head: "Arimo, Arial, Helvetica, sans-serif", fig: "Arimo, Arial, Helvetica, sans-serif", fonts: [] }
  };
  var loaded = {};
  function loadFonts(list) {
    list.forEach(function (f) {
      if (loaded[f]) return; loaded[f] = 1;
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=" + f + "&display=swap"; document.head.appendChild(l);
    });
  }
  function choice() { try { var v = localStorage.getItem(KEY); return PRESETS[v] ? v : "journal"; } catch (e) { return "journal"; } }
  function apply(k) {
    var p = PRESETS[k] || PRESETS.journal, r = document.documentElement.style;
    loadFonts(p.fonts);
    r.setProperty("--r-body", p.body); r.setProperty("--r-head", p.head); r.setProperty("--r-fig", p.fig);
    document.documentElement.setAttribute("data-typeface", k);
  }
  function picker(el) {
    if (!el) return;
    var cur = choice();
    el.innerHTML = '<label class="type-picker"><span>Typeface</span><select aria-label="Typeface" autocomplete="off">' +
      Object.keys(PRESETS).map(function (k) { return '<option value="' + k + '"' + (k === cur ? " selected" : "") + ">" + PRESETS[k].name + (k === "journal" ? " (default)" : "") + "</option>"; }).join("") +
      "</select></label>";
    el.querySelector("select").addEventListener("change", function (e) { try { localStorage.setItem(KEY, e.target.value); } catch (x) {} apply(e.target.value); });
  }
  apply(choice());
  window.Typeset = { PRESETS: PRESETS, apply: apply, picker: picker };
})();
