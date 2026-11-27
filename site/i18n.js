// Shared EN/VI language system. Load it in <head> on every page: <script src="/i18n.js"></script>
//
// Static text:   <span data-l="en">Hello</span><span data-l="vi">Xin chào</span>
// Page title:    <html data-title-en="..." data-title-vi="...">
// From JS:       i18n.lang            -> "en" | "vi"
//                i18n.t({ en, vi })   -> string in the current language
//                document.addEventListener("langchange", (e) => e.detail.lang)
(function () {
  var KEY = "lang";
  function read() {
    try { var v = localStorage.getItem(KEY); if (v === "en" || v === "vi") return v; } catch (e) {}
    return /^vi\b/i.test(navigator.language || "") ? "vi" : "en";
  }
  var root = document.documentElement;

  function apply(lang) {
    root.setAttribute("data-lang", lang);
    root.lang = lang;
    var title = root.getAttribute("data-title-" + lang);
    if (title) document.title = title;
    var btns = document.querySelectorAll(".lang-switch button");
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute("aria-pressed", String(btns[i].value === lang));
  }

  var i18n = {
    lang: read(),
    t: function (o) {
      if (o == null) return "";
      if (typeof o === "string") return o;
      return o[i18n.lang] || o.en || o.vi || "";
    },
    set: function (lang) {
      if (lang !== "en" && lang !== "vi") return;
      i18n.lang = lang;
      try { localStorage.setItem(KEY, lang); } catch (e) {}
      apply(lang);
      document.dispatchEvent(new CustomEvent("langchange", { detail: { lang: lang } }));
    },
  };
  window.i18n = i18n;
  apply(i18n.lang);

  document.addEventListener("DOMContentLoaded", function () {
    var nav = document.createElement("nav");
    nav.className = "lang-switch";
    nav.setAttribute("aria-label", "Language");
    [["en", "EN"], ["vi", "VI"]].forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button"; b.value = p[0]; b.textContent = p[1];
      b.addEventListener("click", function () { i18n.set(p[0]); });
      nav.appendChild(b);
    });
    document.body.appendChild(nav);
    apply(i18n.lang);
  });
})();
