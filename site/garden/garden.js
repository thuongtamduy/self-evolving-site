(function () {
  var KEY = "garden-v1", N = 12, HOUR = 3600000, WATER_GAP = 3 * HOUR;
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
        return x && typeof x.t === "number" && KINDS[x.k] ? { t: x.t, k: x.k, w: typeof x.w === "number" ? x.w : 0 } : null;
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
      b.className = "garden-seed" + (k === pick ? " on" : "");
      b.dataset.k = k;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", k === pick ? "true" : "false");
      b.innerHTML = "";
      var ic = document.createElement("span"); ic.className = "garden-seed-ch"; ic.textContent = KINDS[k].ch;
      var nm = document.createElement("span"); nm.className = "garden-seed-name"; nm.textContent = i18n.t(KINDS[k]);
      var hh = document.createElement("span"); hh.className = "garden-seed-h"; hh.textContent = KINDS[k].h + "h";
      b.appendChild(ic); b.appendChild(nm); b.appendChild(hh);
      seeds.appendChild(b);
    });
  }
  seeds.addEventListener("click", function (e) {
    var b = e.target.closest(".garden-seed");
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
      b.className = "garden-plot";
      b.dataset.i = i;
      var t = data[i];
      if (t) {
        var s = stage(t);
        if (s.ch === "🌰") b.appendChild(document.createElement("span")).className = "garden-bean";
        else b.textContent = s.ch;
        b.setAttribute("aria-label", i18n.t(s));
      } else {
        b.classList.add("garden-empty");
        b.appendChild(document.createElement("span")).className = "garden-mound";
        b.setAttribute("aria-label", i18n.t({ en: "Empty plot, plant a seed", vi: "Ô đất trống, gieo hạt" }));
      }
      el.appendChild(b);
    }
  }
  el.addEventListener("click", function (e) {
    var b = e.target.closest(".garden-plot");
    if (!b) return;
    var i = +b.dataset.i;
    if (data[i]) {
      var p = data[i], kind = KINDS[p.k];
      if (Date.now() - p.t >= kind.h * HOUR) {
        status.textContent = i18n.t(stage(p));
      } else if (Date.now() - (p.w || 0) < WATER_GAP) {
        var mins = Math.ceil((WATER_GAP - (Date.now() - p.w)) / 60000);
        status.textContent = i18n.t({ en: "💧 Already watered. Thirsty again in " + mins + " min.", vi: "💧 Đã tưới rồi. " + mins + " phút nữa cây sẽ khát lại." });
      } else {
        p.t -= kind.h * HOUR * 0.05;
        p.w = Date.now();
        save();
        status.textContent = i18n.t({ en: "💧 Watered! It grew a little faster.", vi: "💧 Đã tưới! Cây lớn nhanh thêm một chút." });
        render();
        var wb = el.children[i]; if (wb) wb.focus();
      }
    } else {
      data[i] = { t: Date.now(), k: pick, w: 0 };
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
