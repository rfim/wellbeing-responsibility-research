// Shared document store for the revision studio and the story page.
// Edits live in this browser's localStorage, layered over the original text in upgrade-text.js.
(function () {
 function make(KEY, ORIG) {

  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v && typeof v === "object") return v; } catch (e) {}
    return { sections: {}, order: null, added: [], history: {} };
  }
  function write(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) {
      // Quota: drop oldest history and retry once
      try { state.history = {}; localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e2) { return false; }
    }
  }

  function textOf(html) {
    var d = document.createElement("div"); d.innerHTML = html || "";
    d.querySelectorAll("p,li,h2,h3,h4,tr,figcaption,blockquote").forEach(function (n) { n.appendChild(document.createTextNode("\n")); });
    d.querySelectorAll("td,th").forEach(function (n) { n.appendChild(document.createTextNode(" | ")); });
    return (d.textContent || "").replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  var api = {
    KEY: KEY,
    original: function (id) { return ORIG.find(function (s) { return s.id === id; }) || null; },
    state: read,
    save: write,
    // Merged list of sections (original + added), with edited html/heading applied
    sections: function () {
      var st = read();
      var list = ORIG.map(function (s) { return Object.assign({}, s); }).concat((st.added || []).map(function (s) { return Object.assign({}, s); }));
      list.forEach(function (s) {
        var ed = st.sections && st.sections[s.id];
        s.edited = !!(ed && ed.html !== undefined && ed.html !== (api.original(s.id) || {}).html);
        if (ed) {
          if (ed.html !== undefined) s.html = ed.html;
          if (ed.heading) s.heading = ed.heading;
          if (ed.num !== undefined) s.num = ed.num;
          if (ed.chapter) s.chapter = ed.chapter;
          s.revised = !!ed.revised;
          s.updated = ed.updated || null;
        }
      });
      return list;
    },
    get: function (id) { return api.sections().find(function (s) { return s.id === id; }) || null; },
    text: function (id) { var s = api.get(id); return s ? textOf(s.html) : ""; },
    textOf: textOf,
    title: function () { return api.text("title").replace(/\s+/g, " ").trim(); },
    hasEdits: function () { var st = read(); return Object.keys(st.sections || {}).length > 0 || (st.added || []).length > 0; },
    // Research questions as they currently read in §1.7
    rqs: function () {
      var t = api.text("s1-7"), out = {};
      ["1", "2", "3"].forEach(function (n) {
        var m = t.match(new RegExp("RQ" + n + "\\.?\\s*([^\\n]+)"));
        if (m) out["RQ" + n] = m[1].trim();
      });
      return out;
    },
    abstractLead: function (n) {
      var t = api.text("abstract").replace(/\n+/g, " ");
      var sents = t.match(/[^.!?]+[.!?]+(\s|$)/g) || [t];
      return sents.slice(0, n || 2).join("").trim();
    }
  };
  return api;
 }
  window.DocStore = make("wr-doc-v1", (window.UPGRADE_DOC && window.UPGRADE_DOC.sections) || []);
  // Separate stores for other documents (e.g. the thesis): DocStore.create(key, docData)
  window.DocStore.create = function (key, doc) { return make(key, (doc && doc.sections) || []); };
})();
