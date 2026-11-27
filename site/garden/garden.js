(function () {
  var KEY = "garden-v1", N = 12, HOUR = 3600000;
  // age thresholds in ms: seed, sprout, leaf, bud, flower
  var STAGES = [
    { at: 0, ch: "🌰", en: "A seed, resting.", vi: "Một hạt giống đang ngủ." },
    { at: 0.25 * HOUR, ch: "🌱", en: "A sprout!", vi: "Một mầm non!" },
    { at: 2 * HOUR, ch: "🌿", en: "Growing leaves.", vi: "Đang ra lá." },
    { at: 8 * HOUR, ch: "🪴", en: "Almost there.", vi: "Sắp nở rồi." },
    { at: 24 * HOUR, ch: "🌸", en: "In full bloom.", vi: "Đang nở rộ." }
  ];
  var el = document.getElementById("plots"), status = document.getElementById("status");
  var data = load();

  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(d)) return d.slice(0, N);
    } catch (e) {}
    return [];
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function stage(t) {
    var age = Date.now() - t, s = STAGES[0];
    for (var i = 0; i < STAGES.length; i++) if (age >= STAGES[i].at) s = STAGES[i];
    return s;
  }
  function render() {
    el.textContent = "";
    for (var i = 0; i < N; i++) {
      var b = document.createElement("button");
      b.className = "plot";
      b.dataset.i = i;
      var t = data[i];
      if (typeof t === "number") {
        var s = stage(t);
        b.textContent = s.ch;
        b.setAttribute("aria-label", i18n.t(s));
      } else {
        b.classList.add("empty");
        b.textContent = "+";
        b.setAttribute("aria-label", i18n.t({ en: "Empty plot, plant a seed", vi: "Ô đất trống, gieo hạt" }));
      }
      el.appendChild(b);
    }
  }
  el.addEventListener("click", function (e) {
    var b = e.target.closest(".plot");
    if (!b) return;
    var i = +b.dataset.i;
    if (typeof data[i] === "number") {
      status.textContent = i18n.t(stage(data[i]));
    } else {
      data[i] = Date.now();
      save();
      status.textContent = i18n.t({ en: "Planted. Be patient.", vi: "Đã gieo. Hãy kiên nhẫn nhé." });
      render();
      var nb = el.children[i]; if (nb) nb.focus();
    }
  });
  document.addEventListener("langchange", function () { status.textContent = ""; render(); });
  render();
  setInterval(render, 60000);
})();
