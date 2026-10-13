// NVivo bridge: reads an NVivo REFI-QDA export (.qdpx project or .qdc codebook) in the browser, so codes,
// counts and coded quotes can be used while writing. Nothing is uploaded; the summary stays in this browser.
// In NVivo: File → Export → Export Project as REFI-QDA (.qdpx), or Share → Export Codebook (.qdc).
(function () {
  var KEY = "wr-nvivo";
  var JSZIP = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  function loadZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = JSZIP; s.onload = function () { res(window.JSZip); }; s.onerror = function () { rej(new Error("could not load the zip reader (are you offline?)")); }; document.head.appendChild(s); });
  }
  function attr(el, n) { return el.getAttribute(n) || ""; }
  function kids(el, name) { return Array.prototype.filter.call(el.children, function (c) { return c.localName === name; }); }
  function readCodes(doc) {
    var out = [], byId = {};
    function walk(el, depth, path) {
      kids(el, "Code").forEach(function (c) {
        var d = kids(c, "Description")[0], name = attr(c, "name");
        var code = { id: attr(c, "guid"), name: name, path: path ? path + " › " + name : name, depth: depth, color: attr(c, "color"), desc: d ? d.textContent.trim() : "", refs: [], sources: {} };
        out.push(code); byId[code.id] = code; walk(c, depth + 1, code.path);
      });
    }
    var codes = doc.getElementsByTagNameNS("*", "Codes")[0]; if (codes) walk(codes, 0, "");
    return { list: out, byId: byId };
  }
  function cp(s) { return Array.from(s); }  // REFI positions count Unicode code points
  async function parseQdpx(file) {
    var JSZip = await loadZip(), zip = await JSZip.loadAsync(file);
    var qde = zip.file(/project\.qde$/i)[0]; if (!qde) throw new Error("no project.qde inside this file");
    var doc = new DOMParser().parseFromString(await qde.async("string"), "application/xml");
    var C = readCodes(doc), texts = {};
    async function plain(path) {
      if (!path) return null; if (texts[path] != null) return texts[path];
      var name = path.replace(/^internal:\/\//, ""), f = zip.file("sources/" + name) || zip.file(name) || zip.file(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"))[0];
      texts[path] = f ? cp(await f.async("string")) : null; return texts[path];
    }
    var srcs = Array.prototype.slice.call(doc.getElementsByTagNameNS("*", "TextSource")), nSources = 0;
    for (var i = 0; i < srcs.length; i++) {
      var src = srcs[i], parent = src.parentElement, name = attr(src, "name") || (parent && attr(parent, "name")) || "Source";
      var sels = kids(src, "PlainTextSelection"); if (!sels.length) continue; nSources++;
      var T = await plain(attr(src, "plainTextPath"));
      sels.forEach(function (sel) {
        var a = +attr(sel, "startPosition"), b = +attr(sel, "endPosition");
        var text = T ? T.slice(a, b).join("").replace(/\s+/g, " ").trim() : attr(sel, "name");
        kids(sel, "Coding").forEach(function (cd) { kids(cd, "CodeRef").forEach(function (ref) {
          var code = C.byId[attr(ref, "targetGUID")]; if (!code) return;
          code.sources[name] = 1; if (code.refs.length < 60) code.refs.push({ source: name, text: text.length > 900 ? text.slice(0, 900) + "…" : text });
          code.n = (code.n || 0) + 1;
        }); });
      });
    }
    return finish(C.list, file.name, nSources);
  }
  async function parseQdc(file) {
    var doc = new DOMParser().parseFromString(await file.text(), "application/xml");
    return finish(readCodes(doc).list, file.name, 0);
  }
  function finish(list, name, nSources) {
    return { name: name, t: Date.now(), sources: nSources, codes: list.map(function (c) { return { name: c.name, path: c.path, depth: c.depth, color: c.color, desc: c.desc, n: c.n || 0, nSources: Object.keys(c.sources).length, refs: c.refs }; }) };
  }
  function parse(file) { return /\.qdc$/i.test(file.name) ? parseQdc(file) : parseQdpx(file); }
  function save(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); return true; } catch (e) { p.codes.forEach(function (c) { c.refs = c.refs.slice(0, 8); }); try { localStorage.setItem(KEY, JSON.stringify(p)); return true; } catch (e2) { return false; } } }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  // flags source names that look like a person's real name rather than a role code
  function looksNamed(s) { return /^[A-Z][a-z]+ [A-Z][a-z]+/.test(s) && !/(psycholog|participant|founder|interview|focus|fgd|group|transcript|himpsi|riliv|p\d|r\d|article|guardian|wsj|news)/i.test(s); }
  window.NVivoKit = { parse: parse, save: save, load: load, looksNamed: looksNamed };
})();
