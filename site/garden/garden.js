(function () {
  var KEY = "garden-v1", N = 12, COLS = 4, HOUR = 3600000, WATER_GAP = 3 * HOUR;
  var KINDS = {
    blossom: { h: 24, c: "#f9b8cf", en: "Blossom", vi: "Hoa anh đào" },
    tulip: { h: 6, c: "#ec4f6e", en: "Tulip", vi: "Tulip" },
    sunflower: { h: 12, c: "#ffcf3f", en: "Sunflower", vi: "Hướng dương" },
    hibiscus: { h: 18, c: "#f0553a", en: "Hibiscus", vi: "Dâm bụt" },
    lotus: { h: 48, c: "#f6a6d0", en: "Lotus", vi: "Sen" }
  };
  var ORDER = ["tulip", "sunflower", "hibiscus", "blossom", "lotus"];
  var pick = "tulip";
  var STAGES = [
    { f: 0, k: 0, en: "A seed, resting.", vi: "Một hạt giống đang ngủ." },
    { f: 0.01, k: 1, en: "A sprout!", vi: "Một mầm non!" },
    { f: 0.08, k: 2, en: "Growing leaves.", vi: "Đang ra lá." },
    { f: 0.33, k: 3, en: "Almost there.", vi: "Sắp nở rồi." },
    { f: 1, k: 4, bloom: true, en: "In full bloom.", vi: "Đang nở rộ." }
  ];
  var el = document.getElementById("plots"), status = document.getElementById("status"),
    sky = document.getElementById("sky"), seeds = document.getElementById("seeds");
  var data = load();

  // isometric helpers (same 2:1 look as the city)
  var OX = 320, OY = 112, HW = 60, HH = 30;
  function P(u, v, z) { return [OX + (u - v) * HW, OY + (u + v) * HH - (z || 0)]; }
  function pts(a) { return a.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function tile(u0, v0, u1, v1, fill, extra) {
    return '<polygon points="' + pts([P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]) + '" fill="' + fill + '" ' + (extra || "") + "/>";
  }
  function slab(u0, v0, u1, v1, d, top, left, right) {
    var L = P(u0, v1), B = P(u1, v1), R = P(u1, v0);
    return '<polygon points="' + pts([L, B, [B[0], B[1] + d], [L[0], L[1] + d]]) + '" fill="' + left + '"/>' +
      '<polygon points="' + pts([R, B, [B[0], B[1] + d], [R[0], R[1] + d]]) + '" fill="' + right + '"/>' + tile(u0, v0, u1, v1, top);
  }
  function tree(u, v, s) {
    var b = P(u, v);
    return '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="' + 15 * s + '" ry="' + 7 * s + '" fill="rgba(0,0,0,.14)"/>' +
      '<rect x="' + (b[0] - 3 * s) + '" y="' + (b[1] - 22 * s) + '" width="' + 6 * s + '" height="' + 22 * s + '" fill="#6a4a30"/>' +
      '<circle cx="' + b[0] + '" cy="' + (b[1] - 38 * s) + '" r="' + 19 * s + '" fill="#4f9f58"/>' +
      '<circle cx="' + (b[0] - 7 * s) + '" cy="' + (b[1] - 42 * s) + '" r="' + 12 * s + '" fill="#6ab35c"/>';
  }
  function bush(u, v, col) {
    var b = P(u, v);
    return '<ellipse cx="' + b[0] + '" cy="' + (b[1] + 1) + '" rx="13" ry="5" fill="rgba(0,0,0,.13)"/><circle cx="' + b[0] + '" cy="' + (b[1] - 6) + '" r="9" fill="#3f8a4a"/>' +
      '<circle cx="' + (b[0] + 7) + '" cy="' + (b[1] - 3) + '" r="6.5" fill="#4fa357"/><circle cx="' + (b[0] - 3) + '" cy="' + (b[1] - 9) + '" r="2.2" fill="' + col + '"/>';
  }
  function petals(n, r, rx, ry, col, cx, cy, rot0) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var a = rot0 + i * 360 / n;
      s += '<ellipse cx="' + cx + '" cy="' + (cy - r) + '" rx="' + rx + '" ry="' + ry + '" fill="' + col + '" transform="rotate(' + a + " " + cx + " " + cy + ')"/>';
    }
    return s;
  }
  function leaf(x, y, dx, dy) {
    return '<path d="M' + x + " " + y + " q" + dx / 2 + " " + (dy - 5) + " " + dx + " " + dy + " q" + (-dx / 2) + " " + 5 + " " + (-dx) + " " + (-dy) + 'z" fill="#4fae5c"/>';
  }
  function plant(kind, st, cx, cy) {
    var col = KINDS[kind].c, s = "";
    if (st === 0) return '<ellipse cx="' + cx + '" cy="' + (cy - 1) + '" rx="4" ry="5.2" fill="#e0b46c" stroke="#a9792f" stroke-width="1"/>';
    var h = [0, 11, 18, 26, 32][st];
    s += '<g class="garden-sway"><line x1="' + cx + '" y1="' + cy + '" x2="' + cx + '" y2="' + (cy - h) + '" stroke="#3f8a47" stroke-width="2.4" stroke-linecap="round"/>';
    if (st === 1) s += leaf(cx, cy - h + 1, 7, -5) + leaf(cx, cy - h + 1, -7, -5);
    if (st >= 2) s += leaf(cx, cy - 5, 11, -4) + leaf(cx, cy - 7, -11, -5) + (st >= 3 ? leaf(cx, cy - 13, 9, -7) + leaf(cx, cy - 14, -9, -7) : leaf(cx, cy - h + 3, 8, -7) + leaf(cx, cy - h + 3, -8, -7));
    var hy = cy - h;
    if (st === 2) s += '<circle cx="' + cx + '" cy="' + (hy - 1) + '" r="2.6" fill="#7fd06a"/>';
    if (st === 3) s += '<ellipse cx="' + cx + '" cy="' + (hy - 3) + '" rx="4.5" ry="6.5" fill="' + col + '"/><path d="M' + (cx - 4.5) + " " + (hy - 1) + " q4.5 5 9 0 l0 2 q-4.5 4 -9 0z" + '" fill="#4fae5c"/>';
    if (st === 4) {
      if (kind === "tulip") s += '<path d="M' + (cx - 8) + " " + (hy - 12) + " l4 6 l4 -7 l4 7 l4 -6 q1 10 -8 12 q-9 -2 -8 -12z" + '" fill="' + col + '"/><path d="M' + (cx - 3) + " " + (hy - 6) + ' q3 5 6 0 q-1 5 -3 6 q-2 -1 -3 -6z" fill="#c43656"/>';
      if (kind === "sunflower") s += petals(12, 9, 3, 6, "#ffd23f", cx, hy - 4, 0) + petals(12, 8, 3, 5.5, "#ffb81f", cx, hy - 4, 15) + '<circle cx="' + cx + '" cy="' + (hy - 4) + '" r="6" fill="#6b4a2a"/><circle cx="' + (cx - 1.5) + '" cy="' + (hy - 5.5) + '" r="2" fill="#8a6238"/>';
      if (kind === "hibiscus") s += petals(5, 6.5, 6.5, 7.5, col, cx, hy - 5, 10) + '<circle cx="' + cx + '" cy="' + (hy - 5) + '" r="2.8" fill="#8f1d2c"/><line x1="' + cx + '" y1="' + (hy - 5) + '" x2="' + (cx + 6) + '" y2="' + (hy - 11) + '" stroke="#ffd24a" stroke-width="1.6"/><circle cx="' + (cx + 6) + '" cy="' + (hy - 11) + '" r="1.8" fill="#ffd24a"/>';
      if (kind === "blossom") s += petals(5, 6.5, 5.5, 6.5, "#ffd3e2", cx, hy - 5, 0) + petals(5, 6, 4.5, 5.5, col, cx, hy - 5, 36) + '<circle cx="' + cx + '" cy="' + (hy - 5) + '" r="2.6" fill="#f08ab0"/>';
      if (kind === "lotus") s += '<ellipse cx="' + cx + '" cy="' + (cy + 1) + '" rx="19" ry="8" fill="#4fae5c"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="15" ry="6" fill="#68c474"/>' +
        petals(7, 7, 3.6, 8.5, "#fbd0e6", cx, hy - 2, -60) + petals(5, 6, 3.6, 8, col, cx, hy - 2, -36) + '<circle cx="' + cx + '" cy="' + (hy - 4) + '" r="3" fill="#ffd24a"/>';
    }
    return s + "</g>";
  }

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
    return { k: s.k, en: s.bloom ? kind.en + ": " + s.en : s.en, vi: s.bloom ? kind.vi + ": " + s.vi : s.vi };
  }
  function renderSeeds() {
    seeds.textContent = "";
    ORDER.forEach(function (k) {
      var b = document.createElement("button");
      b.className = "garden-seed" + (k === pick ? " on" : "");
      b.dataset.k = k;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", k === pick ? "true" : "false");
      var ic = document.createElement("span"); ic.className = "garden-dot"; ic.style.background = KINDS[k].c;
      var nm = document.createElement("span"); nm.textContent = i18n.t(KINDS[k]);
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
    var p = (window.world && window.world.phase) || "day";
    sky.textContent = i18n.t({
      day: { en: "☀️ Daytime: the garden is warm and bright.", vi: "☀️ Ban ngày: khu vườn ấm và sáng." },
      dusk: { en: "🌇 Dusk: the light turns golden.", vi: "🌇 Hoàng hôn: ánh sáng ngả màu vàng." },
      night: { en: "🌙 Night: the garden sleeps under the stars.", vi: "🌙 Ban đêm: khu vườn ngủ dưới những vì sao." }
    }[p]);
  }
  function scenery() {
    var m = .75, W = COLS, D = N / COLS;
    var s = slab(-m, -m, W + m, D + m, 16, "#86c46b", "#7a5638", "#5c4029");
    s += tile(-m + .12, -m + .12, W + m - .12, D + m - .12, "#9bd77f");
    s += tile(-m + .12, D + .2, W + m - .12, D + m - .12, "#efe2bd", 'opacity=".75"');
    s += tile(W + .2, -m + .12, W + m - .12, D + .2, "#efe2bd", 'opacity=".75"');
    return s;
  }
  function render() {
    var back = scenery(), cells = [], i;
    var front = tree(-.35, -.3, 1.15) + tree(W() + .4, -.35, .9) + bush(-.4, D() + .35, "#ff7aa8") + bush(W() + .35, D() + .3, "#ffd24a") + bush(W() + .45, 1.6, "#b18cf0");
    function W() { return COLS; } function D() { return N / COLS; }
    for (i = 0; i < N; i++) cells.push(i);
    cells.sort(function (a, b) { return (a % COLS + (a / COLS | 0)) - (b % COLS + (b / COLS | 0)) || a - b; });
    var out = back + tree(-.35, -.3, 1.15) + tree(W() + .4, -.35, .9);
    cells.forEach(function (i) {
      var c = i % COLS, r = i / COLS | 0, t = data[i], u = c + .08, v = r + .08, u1 = c + .92, v1 = r + .92;
      var wet = t && Date.now() - (t.w || 0) < WATER_GAP;
      var label = t ? i18n.t(stage(t)) : i18n.t({ en: "Empty bed, plant a seed", vi: "Luống trống, gieo hạt" });
      var g = '<g class="garden-cell" data-i="' + i + '" role="button" tabindex="0" aria-label="' + label.replace(/"/g, "") + '">';
      g += slab(u, v, u1, v1, 5, wet ? "#6b4a30" : "#7f5a3b", "#5c4029", "#4a3322");
      g += tile(u + .12, v + .12, u1 - .12, v1 - .12, wet ? "#5a3d27" : "#6f4d32");
      var ctr = P(c + .5, r + .5);
      if (!t) g += '<ellipse cx="' + ctr[0] + '" cy="' + ctr[1] + '" rx="9" ry="3.6" fill="#5a3d27"/><ellipse cx="' + ctr[0] + '" cy="' + (ctr[1] - 1.5) + '" rx="6" ry="2.2" fill="#7f5a3b"/>';
      else {
        g += '<ellipse cx="' + ctr[0] + '" cy="' + (ctr[1] + 1) + '" rx="12" ry="5" fill="rgba(0,0,0,.2)"/>' + plant(t.k, stage(t).k, ctr[0], ctr[1]);
        if (wet) g += '<circle cx="' + (ctr[0] + 20) + '" cy="' + (ctr[1] - 3) + '" r="3.2" fill="#7fcdf0"/>';
      }
      g += '<polygon class="garden-hl" points="' + pts([P(u, v), P(u1, v), P(u1, v1), P(u, v1)]) + '" fill="rgba(255,230,150,.18)" stroke="#ffe39a" stroke-width="2.5"/></g>';
      out += g;
    });
    el.innerHTML = out + bush(-.4, D() + .35, "#ff7aa8") + bush(W() + .35, D() + .3, "#ffd24a") + bush(W() + .45, 1.6, "#b18cf0");
  }
  var focusI = -1;
  function act(i) {
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
      }
    } else {
      data[i] = { t: Date.now(), k: pick, w: 0 };
      save();
      status.textContent = i18n.t({ en: "Planted. Be patient.", vi: "Đã gieo. Hãy kiên nhẫn nhé." });
    }
    render();
    var f = el.querySelector('[data-i="' + i + '"]'); if (f) f.focus();
  }
  el.addEventListener("click", function (e) {
    var b = e.target.closest(".garden-cell");
    if (b) act(+b.dataset.i);
  });
  el.addEventListener("keydown", function (e) {
    var b = e.target.closest && e.target.closest(".garden-cell");
    if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); act(+b.dataset.i); }
  });
  function idle() { status.textContent = i18n.t({ en: "Pick a seed, then tap a bed.", vi: "Chọn một hạt giống rồi chạm vào luống." }); }
  document.addEventListener("langchange", function () { idle(); render(); renderSeeds(); renderSky(); });
  document.addEventListener("worldtick", renderSky);
  idle(); render(); renderSeeds(); renderSky();
  setInterval(render, 60000);
})();
