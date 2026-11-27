(function () {
  var KEY = "garden-v1", N = 12, HOUR = 3600000;
  // age thresholds in ms: seed, sprout, leaf, bud, flower
  var KINDS = {
    blossom: { h: 24, ch: "🌸", en: "Blossom", vi: "Hoa anh đào" },
    tulip: { h: 6, ch: "🌷", en: "Tulip", vi: "Tulip" },
    sunflower: { h: 12, ch: "🌻", en: "Sunflower", vi: "Hướng dương" },
    hibiscus: { h: 18, ch: "🌺", en: "Hibiscus", vi: "Dâm bụt" },
    lotus: { h: 48, ch: "🪷", en: "Lotus", vi: "Sen" }
  };
  var ORDER = ["tulip", "sunflower", "hibiscus", "blossom", "lotus"];
  var pick = "tulip";
  var sky = document.getElementById("sky"), seeds = document.getElementById("seeds");
  // fractions of total growth time
  var STAGES = [
    { f: 0, ch: "🌰", en: "A seed, resting.", vi: "Một hạt giống đang ngủ." },
    { f: 0.01, ch: "🌱", en: "A sprout!", vi: "Một mầm non!" },
    { f: 0.08, ch: "🌿", en: "Growing leaves.", vi: "Đang ra lá." },
    { f: 0.33, ch: "🪴", en: "Almost there.", vi: "Sắp nở rồi." },
    { f: 1, bloom: true, en: "In full bloom.", vi: "Đang nở rộ." }
  ];
  var el = document.getElementById("plots"), status = document.getElementById("status");
  var data = load();

  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(d)) return d.slice(0, N).map(function (x) {
        if (typeof x === "number") return { t: x, k: "blossom" };
        return x && typeof x.t === "number" && KINDS[x.k] ? { t: x.t, k: x.k } : null;
      });
    } catch (e) {}
    return [];
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
  function stage(p) {
    var kind = KINDS[p.k], f = (Date.now() - p.t) / (kind.h * HOUR), s = STAGES[0];
    for (var i = 0; i < STAGES.length; i++) if (f >= STAGES[i].f) s = STAGES[i];
    return { ch: s.bloom ? kind.ch : s.ch, en: s.bloom ? kind.en + ": " + s.en : s.en, vi: s.bloom ? kind.vi + ": " + s.vi : s.vi };
  }
  function renderSeeds() {
    seeds.textContent = "";
    ORDER.forEach(function (k) {
      var b = document.createElement("button");
      b.className = "seed" + (k === pick ? " on" : "");
      b.dataset.k = k;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", k === pick ? "true" : "false");
      b.textContent = KINDS[k].ch + " " + i18n.t(KINDS[k]) + " · " + KINDS[k].h + "h";
      seeds.appendChild(b);
    });
  }
  seeds.addEventListener("click", function (e) {
    var b = e.target.closest(".seed");
    if (!b) return;
    pick = b.dataset.k;
    renderSeeds();
  });
  function renderSky() {
    var h = new Date().getHours(), p = h >= 6 && h < 17 ? "day" : h >= 17 && h < 20 ? "dusk" : "night";
    document.body.className = "sky-" + p;
    sky.textContent = i18n.t({
      day: { en: "☀️ Daytime: the garden is warm and bright.", vi: "☀️ Ban ngày: khu vườn ấm và sáng." },
      dusk: { en: "🌇 Dusk: the light turns golden.", vi: "🌇 Hoàng hôn: ánh sáng ngả màu vàng." },
      night: { en: "🌙 Night: the garden sleeps under the stars.", vi: "🌙 Ban đêm: khu vườn ngủ dưới những vì sao." }
    }[p]);
  }
  function render() {
    el.textContent = "";
    for (var i = 0; i < N; i++) {
      var b = document.createElement("button");
      b.className = "plot";
      b.dataset.i = i;
      var t = data[i];
      if (t) {
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
    if (data[i]) {
      status.textContent = i18n.t(stage(data[i]));
    } else {
      data[i] = { t: Date.now(), k: pick };
      save();
      status.textContent = i18n.t({ en: "Planted. Be patient.", vi: "Đã gieo. Hãy kiên nhẫn nhé." });
      render();
      var nb = el.children[i]; if (nb) nb.focus();
    }
  });
  document.addEventListener("langchange", function () { status.textContent = ""; render(); renderSeeds(); renderSky(); });
  render(); renderSeeds(); renderSky();
  setInterval(function () { render(); renderSky(); }, 60000);
})();
