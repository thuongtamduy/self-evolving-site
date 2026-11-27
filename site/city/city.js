// The city: an isometric SVG island drawn from /city/buildings.json, with a sky that follows local time.
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var OX = 480, OY = 110, HW = 32, HH = 16, N = 14, SLAB = 24;
  var scene = document.getElementById("scene");
  var map = document.getElementById("map");
  var data = null;

  function P(x, y, z) { return [OX + (x - y) * HW, OY + (x + y) * HH - (z || 0)]; }
  function pts(arr) { return arr.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function poly(arr, fill, extra) { return '<polygon points="' + pts(arr) + '" fill="' + fill + '" ' + (extra || "") + "/>"; }
  function tile(x0, y0, x1, y1, fill, extra, z) {
    return poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], fill, extra);
  }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function c(v) { return Math.max(0, Math.min(255, Math.round(v * f))); }
    return "rgb(" + c(r) + "," + c(g) + "," + c(b) + ")";
  }
  // iso box: left face (y+d side), right face (x+w side), top
  function box(x, y, w, d, h, color, z) {
    z = z || 0;
    return poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], shade(color, 0.92)) +
      poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], shade(color, 0.7)) +
      poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], color);
  }
  function leftFace(x, y, d, u0, u1, v0, v1, fill, extra) { // on plane y+d, spanning x
    return poly([P(x + u0, y + d, v0), P(x + u1, y + d, v0), P(x + u1, y + d, v1), P(x + u0, y + d, v1)], fill, extra);
  }
  function rightFace(x, y, w, u0, u1, v0, v1, fill, extra) { // on plane x+w, spanning y
    return poly([P(x + w, y + u0, v0), P(x + w, y + u1, v0), P(x + w, y + u1, v1), P(x + w, y + u0, v1)], fill, extra);
  }
  function isoEllipse(x, y, r, fill, extra, z) {
    var c = P(x, y, z);
    return '<ellipse cx="' + c[0] + '" cy="' + c[1] + '" rx="' + (r * 45.25).toFixed(1) + '" ry="' + (r * 22.6).toFixed(1) + '" fill="' + fill + '" ' + (extra || "") + "/>";
  }
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  function tree(x, y, s, kind) {
    var b = P(x, y), h = 22 * s, col = kind === 1 ? "#4f9f58" : kind === 2 ? "#6ab35c" : "#5aa85a";
    return '<g>' +
      '<ellipse cx="' + b[0] + '" cy="' + (b[1] + 1) + '" rx="' + 11 * s + '" ry="' + 5 * s + '" fill="#000" opacity=".18"/>' +
      '<rect x="' + (b[0] - 2 * s) + '" y="' + (b[1] - 10 * s) + '" width="' + 4 * s + '" height="' + 11 * s + '" fill="#6a4a30"/>' +
      '<circle cx="' + b[0] + '" cy="' + (b[1] - h * 0.62) + '" r="' + 11 * s + '" fill="' + shade(col, .85) + '"/>' +
      '<circle cx="' + (b[0] - 3 * s) + '" cy="' + (b[1] - h * 0.8) + '" r="' + 9 * s + '" fill="' + col + '"/>' +
      '<circle cx="' + (b[0] + 4 * s) + '" cy="' + (b[1] - h * 0.95) + '" r="' + 6.5 * s + '" fill="' + shade(col, 1.12) + '"/></g>';
  }
  function lamp(x, y, glows) {
    var b = P(x, y), t = [b[0], b[1] - 22];
    glows.push('<circle cx="' + t[0] + '" cy="' + t[1] + '" r="22" fill="url(#lampglow)"/><circle cx="' + t[0] + '" cy="' + t[1] + '" r="3" fill="#fff4c0"/>');
    return '<rect x="' + (b[0] - 1) + '" y="' + (b[1] - 22) + '" width="2" height="22" fill="#3d3f4d"/><circle cx="' + t[0] + '" cy="' + t[1] + '" r="3.2" fill="#ffe9a0"/>';
  }
  function flowerbed(x0, y0, x1, y1, cols) {
    var s = tile(x0, y0, x1, y1, "#6b4a30") + tile(x0 + .08, y0 + .08, x1 - .08, y1 - .08, "#7a553a");
    for (var i = 0; i < 9; i++) {
      var p = P(x0 + .2 + rnd() * (x1 - x0 - .4), y0 + .2 + rnd() * (y1 - y0 - .4));
      s += '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + p[0] + '" y2="' + (p[1] - 4) + '" stroke="#3f8a47" stroke-width="1.5"/><circle cx="' + p[0] + '" cy="' + (p[1] - 5) + '" r="3" fill="' + cols[i % cols.length] + '"/>';
    }
    return s;
  }

  function buildTerrain(glows) {
    var s = "", i, j;
    // earth slab
    var L = P(0, N), R = P(N, 0), B = P(N, N);
    s += poly([L, B, [B[0], B[1] + SLAB], [L[0], L[1] + SLAB]], "#7a5638");
    s += poly([R, B, [B[0], B[1] + SLAB], [R[0], R[1] + SLAB]], "#5c4029");
    s += poly([L, B, [B[0], B[1] + 5], [L[0], L[1] + 5]], "#5fa352") + poly([R, B, [B[0], B[1] + 5], [R[0], R[1] + 5]], "#4a8a42");
    // strata specks
    for (i = 0; i < 14; i++) {
      var side = i % 2, t = rnd(), a = side ? R : L, q = [(a[0] + (B[0] - a[0]) * t), (a[1] + (B[1] - a[1]) * t)];
      s += '<ellipse cx="' + q[0].toFixed(1) + '" cy="' + (q[1] + 10 + rnd() * 10).toFixed(1) + '" rx="' + (3 + rnd() * 4).toFixed(1) + '" ry="1.6" fill="#000" opacity=".16"/>';
    }
    // grass with soft checker
    s += tile(0, 0, N, N, "#86c46b");
    for (i = 0; i < N; i++) for (j = 0; j < N; j++) if ((i + j) % 2) s += tile(i, j, i + 1, j + 1, "#000", 'opacity=".045"');
    // river (x 10.2..12) with banks
    s += tile(10.05, 0, 12.15, N, "#d9c48f") + tile(10.3, 0, 11.9, N, "#4ba4d9");
    s += tile(10.3, 0, 10.7, N, "#6cbde8", 'opacity=".55"');
    for (i = 0; i < 16; i++) {
      var a1 = P(10.5 + rnd() * 1.1, rnd() * N), a2 = [a1[0] + 9, a1[1] + 4.5];
      s += '<line class="city-shimmer" style="animation-delay:' + (rnd() * 3).toFixed(2) + 's" x1="' + a1[0] + '" y1="' + a1[1] + '" x2="' + a2[0] + '" y2="' + a2[1] + '" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>';
    }
    // boat (under the bridge)
    s += '<g transform="translate(' + (-OX) + ',' + (-OY) + ')"><g><animateMotion dur="40s" repeatCount="indefinite" path="M' + P(11.1, 0.2).join(" ") + " L" + P(11.1, 13.8).join(" ") + '"/>' +
      '<g class="city-bob">' + box(-0.35, -0.12, 0.7, 0.24, 5, "#f4efe4") + poly([P(0, 0, 5), P(0, 0, 24), P(0.3, 0, 5)], "#fff", "") + poly([P(0, 0, 5), P(0, 0, 22), P(-0.28, 0, 5)], "#e9606a") + "</g></g></g>";
    // roads: avenue y 7.9..9.5 along x, side street x 8..9.4 for y<7.9
    s += tile(8, 0, 9.4, 7.9, "#4d5160") + tile(0, 7.9, N, 9.5, "#4d5160");
    s += tile(8, 0, 9.4, 7.9, "#5b5f70", 'opacity="0"');
    s += tile(7.85, 0, 8, 7.9, "#d8d3c2") + tile(9.4, 0, 9.55, 7.9, "#d8d3c2") + tile(0, 7.75, N, 7.9, "#d8d3c2") + tile(0, 9.5, N, 9.65, "#d8d3c2");
    // bridge deck over the river
    s += tile(10.05, 7.75, 12.15, 9.65, "#8b7a60") + tile(10.05, 7.9, 12.15, 9.5, "#4d5160");
    // lane marks
    function dashes(x0, y0, x1, y1) {
      var a = P(x0, y0), b = P(x1, y1);
      return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#f1e3a6" stroke-width="2" stroke-dasharray="9 8" opacity=".85"/>';
    }
    s += dashes(0, 8.7, N, 8.7) + dashes(8.7, 0, 8.7, 7.9);
    // lots
    data.lots.forEach(function (l) {
      if (l.hidden) return;
      s += tile(l.x, l.y, l.x + l.w, l.y + l.h, "#a9d58f", 'opacity=".55"');
      s += poly([P(l.x, l.y), P(l.x + l.w, l.y), P(l.x + l.w, l.y + l.h), P(l.x, l.y + l.h)], "none", 'class="city-lotmark"');
      var f = P(l.x + l.w / 2, l.y + l.h / 2);
      s += '<line x1="' + f[0] + '" y1="' + f[1] + '" x2="' + f[0] + '" y2="' + (f[1] - 16) + '" stroke="#e9e4d4" stroke-width="1.6"/><polygon points="' + f[0] + "," + (f[1] - 16) + " " + (f[0] + 11) + "," + (f[1] - 12) + " " + f[0] + "," + (f[1] - 8) + '" fill="#f0b25a"/>';
    });
    return s;
  }

  function inRects(x, y) {
    var R = [[2.5, 2.5, 7.6, 7.6], [7.7, -1, 9.7, 7.9], [-1, 7.6, 15, 9.8], [9.9, -1, 12.3, 15]];
    var i, r;
    for (i = 0; i < R.length; i++) { r = R[i]; if (x > r[0] && x < r[2] && y > r[1] && y < r[3]) return true; }
    for (i = 0; i < data.lots.length; i++) { var l = data.lots[i]; if (x > l.x - .5 && x < l.x + l.w + .5 && y > l.y - .5 && y < l.y + l.h + .5) return true; }
    return false;
  }

  function gardenItems(b, items, glows) {
    var gx = b.x, gy = b.y, W = b.w, hedge = "#3f8a4a";
    var lawn = tile(gx, gy, gx + W, gy + W, "#9bd77f") + tile(gx + .15, gy + .15, gx + W - .15, gy + W - .15, "#a9e08c");
    // paths and pond
    lawn += tile(gx + 1.75, gy + 1.2, gx + 2.25, gy + W, "#efe2bd") + tile(gx + .5, gy + 2.5, gx + W - .5, gy + 2.9, "#efe2bd", 'opacity=".9"');
    lawn += isoEllipse(gx + 2, gy + 2.7, 0.55, "#efe2bd") + isoEllipse(gx + 2, gy + 2.7, 0.42, "#4ba4d9") + isoEllipse(gx + 1.9, gy + 2.62, 0.2, "#7fcdf0", 'opacity=".7"');
    lawn += flowerbed(gx + 2.6, gy + 3.1, gx + 3.5, gy + 3.85, ["#f06a8a", "#ffd24a", "#ff9a4a"]);
    lawn += flowerbed(gx + .5, gy + 3.1, gx + 1.4, gy + 3.85, ["#b18cf0", "#ffffff", "#ff7aa8"]);
    lawn += flowerbed(gx + .55, gy + 1.0, gx + 1.35, gy + 1.7, ["#ff7aa8", "#ffd24a"]);
    items.push({ d: -9, s: lawn });
    // hedges (gate gap on the south side)
    function hedgeBox(x, y, w, d) { return box(x, y, w, d, 7, hedge); }
    items.push({ d: gx + gy, s: hedgeBox(gx, gy, W, .25) });
    items.push({ d: gx + gy + 2, s: hedgeBox(gx, gy, .25, W) });
    items.push({ d: gx + W + gy + .5, s: hedgeBox(gx + W - .25, gy, .25, W) });
    items.push({ d: gx + gy + W + gx * 0 + 3.4, s: hedgeBox(gx, gy + W - .25, 1.45, .25) });
    items.push({ d: gx + gy + W + 5.2, s: hedgeBox(gx + 2.55, gy + W - .25, 1.45, .25) });
    // gate posts + arch
    [[gx + 1.55, "L"], [gx + 2.45, "R"]].forEach(function (g) {
      items.push({ d: g[0] + gy + W + .3, s: box(g[0] - .1, gy + W - .3, .2, .3, 20, "#e6dcc3") + box(g[0] - .13, gy + W - .33, .26, .36, 3, "#cfc3a4", 20) });
      glows.push('<circle cx="' + P(g[0], gy + W - .15, 24)[0] + '" cy="' + P(g[0], gy + W - .15, 24)[1] + '" r="20" fill="url(#lampglow)"/>');
    });
    // greenhouse
    var hx = gx + .55, hy = gy + .35, hw = 1.5, hd = 1.0, hh = 17;
    var gh = box(hx, hy, hw, hd, hh, "#bfe6e6");
    gh += leftFace(hx, hy, hd, .08, hw - .08, 2, hh - 2, "#a5d6dc", "opacity=\".9\"");
    var k;
    for (k = 1; k < 4; k++) gh += poly([P(hx + hw / 4 * k, hy + hd, 0), P(hx + hw / 4 * k, hy + hd, hh)], "none", 'stroke="#f4fbfb" stroke-width="1.4"');
    gh += rightFace(hx, hy, hw, .1, hd - .1, 2, hh - 2, "#7fb4be", "opacity=\".85\"");
    // pitched roof ridge
    gh += poly([P(hx, hy + hd, hh), P(hx + hw, hy + hd, hh), P(hx + hw, hy + hd / 2, hh + 9), P(hx, hy + hd / 2, hh + 9)], "#d7f1f1") +
      poly([P(hx + hw, hy, hh), P(hx + hw, hy + hd, hh), P(hx + hw, hy + hd / 2, hh + 9)], "#8fc3cb");
    gh += poly([P(hx, hy + hd, hh), P(hx + hw, hy + hd, hh), P(hx + hw, hy + hd / 2, hh + 9), P(hx, hy + hd / 2, hh + 9)], "none", 'stroke="#f4fbfb" stroke-width="1"');
    // plants visible in glass
    for (k = 0; k < 4; k++) { var pp = P(hx + .25 + k * .33, hy + hd, 4); gh += '<circle cx="' + pp[0] + '" cy="' + pp[1] + '" r="3.4" fill="' + ["#f06a8a", "#4fae5c", "#ffd24a", "#4fae5c"][k] + '"/>'; }
    items.push({ d: hx + hy + hw + hd, s: gh });
    glows.push(poly([P(hx + .08, hy + hd, 2), P(hx + hw - .08, hy + hd, 2), P(hx + hw - .08, hy + hd, hh - 2), P(hx + .08, hy + hd, hh - 2)], "#ffd98a", 'opacity=".55"'));
    // trees inside the park
    [[gx + 3.4, gy + .8, 1.0, 2], [gx + 3.5, gy + 1.9, .9, 1], [gx + .5, gy + 2.2, .85, 0], [gx + 3.4, gy + 3.2, .8, 1]].forEach(function (t) {
      items.push({ d: t[0] + t[1] + .2, s: tree(t[0], t[1], t[2], t[3]) });
    });
    // sign post by the gate
    var sp = P(gx + 1.1, gy + W + .15);
    items.push({ d: gx + gy + W + 1.3, s: '<rect x="' + (sp[0] - 1) + '" y="' + (sp[1] - 16) + '" width="2" height="16" fill="#6a4a30"/><rect x="' + (sp[0] - 11) + '" y="' + (sp[1] - 25) + '" width="22" height="11" rx="2" fill="#8b6a45"/><circle cx="' + sp[0] + '" cy="' + (sp[1] - 19.5) + '" r="2.6" fill="#7fd06a"/>' });
    items.push({ d: 99, s: "" });
  }

  function skyColors(h) {
    var K = [[0, "#070b1f", "#18214d"], [5, "#1a1f4a", "#6a436b"], [6.5, "#5b7cc2", "#f7b28b"], [8.5, "#3f8be0", "#bfe4f6"],
      [12, "#2f7fd6", "#a9dcf5"], [16.5, "#3f85d0", "#cfe2ef"], [18.3, "#454a8e", "#f59a72"], [20, "#10163f", "#3d3468"], [24, "#070b1f", "#18214d"]];
    var i = 0; while (i < K.length - 2 && h >= K[i + 1][0]) i++;
    var a = K[i], b = K[i + 1], t = (h - a[0]) / (b[0] - a[0]);
    function mix(c1, c2) {
      var n1 = parseInt(c1.slice(1), 16), n2 = parseInt(c2.slice(1), 16), o = "#";
      [16, 8, 0].forEach(function (sh) { var v = Math.round(((n1 >> sh) & 255) * (1 - t) + ((n2 >> sh) & 255) * t); o += ("0" + v.toString(16)).slice(-2); });
      return o;
    }
    return [mix(a[1], b[1]), mix(a[2], b[2])];
  }
  function nightFactor(h) {
    if (h < 5) return 1; if (h < 7.5) return 1 - (h - 5) / 2.5;
    if (h < 17.5) return 0; if (h < 20) return (h - 17.5) / 2.5; return 1;
  }
  var orbSun, orbMoon;
  function updateSky() {
    var q = /[?&]h=([\d.]+)/.exec(location.search);
    var d = new Date(), h = q ? parseFloat(q[1]) : d.getHours() + d.getMinutes() / 60;
    var c = skyColors(h), n = nightFactor(h);
    scene.style.setProperty("--sky-top", c[0]); scene.style.setProperty("--sky-bot", c[1]); scene.style.setProperty("--night", n.toFixed(3));
    function place(el, f, show) {
      el.style.display = show ? "block" : "none";
      el.style.left = (8 + f * 84) + "%";
      el.style.top = (46 - Math.sin(f * Math.PI) * 34) + "%";
    }
    var day = h >= 5.5 && h <= 19, nf = ((h + 24 - 18) % 24) / 12;
    place(orbSun, (h - 5.5) / 13.5, day);
    place(orbMoon, nf, !day || n > .5 ? nf <= 1 : false);
  }

  function addCar(x0, y0, x1, y1, dur, color, begin) {
    return '<g transform="translate(' + (-OX) + ',' + (-OY) + ')"><g><animateMotion dur="' + dur + 's" begin="' + begin + 's" repeatCount="indefinite" path="M' + P(x0, y0).join(" ") + " L" + P(x1, y1).join(" ") + '"/>' +
      box(-0.34, -0.17, 0.68, 0.34, 4, color) + box(-0.2, -0.14, 0.34, 0.28, 3.4, shade(color, 1.15), 4) +
      '<circle cx="' + P(0.34, 0)[0] + '" cy="' + (P(0.34, 0)[1] - 2) + '" r="2" fill="#fff4c0" class="city-glow"/></g></g>';
  }

  function render() {
    var glows = [], items = [], i;
    seed = 7;
    var terrain = buildTerrain(glows);
    // scenery trees
    for (i = 0; i < 90; i++) {
      var x = .5 + rnd() * 13, y = .5 + rnd() * 13;
      if (!inRects(x, y)) items.push({ d: x + y, s: tree(x, y, .7 + rnd() * .5, i % 3) });
    }
    // lamps along the avenue
    [1.5, 4.5, 7.2, 13].forEach(function (lx) { items.push({ d: lx + 7.6, s: lamp(lx, 7.72, glows) }); });
    [2, 5.5].forEach(function (ly) { items.push({ d: 7.7 + ly, s: lamp(7.75, ly, glows) }); });
    // buildings
    var labels = "";
    data.buildings.forEach(function (b) {
      var bi = [], bg = [];
      if (b.id === "garden") gardenItems(b, bi, bg);
      var c = P(b.x + b.w / 2, b.y + b.w / 2);
      terrain += "";
      var inner = bi.filter(function (it) { return it.d < -5; }).map(function (it) { return it.s; }).join("");
      var rest = bi.filter(function (it) { return it.d >= -5; });
      items.push({ d: -50, s: '<g class="city-building" role="link" tabindex="0" data-href="' + b.page + '" aria-label="' + i18n.t(b.name) + '">' + inner + '<g class="city-hl">' +
        poly([P(b.x - .1, b.y - .1), P(b.x + b.w + .1, b.y - .1), P(b.x + b.w + .1, b.y + b.w + .1), P(b.x - .1, b.y + b.w + .1)], "rgba(255,230,150,.18)", 'stroke="#ffe39a" stroke-width="3"') + "</g></g>" });
      rest.forEach(function (it) { items.push(it); });
      glows = glows.concat(bg);
      b._c = c;
    });
    items.sort(function (a, b) { return a.d - b.d; });
    var cars = addCar(0, 8.3, N, 8.3, 16, "#e9606a", 0) + addCar(N, 9.1, 0, 9.1, 20, "#5aa0e6", -6) + addCar(0, 8.3, N, 8.3, 16, "#f2c14e", -9) + addCar(8.7, 0, 8.7, 7.7, 9, "#7bc96a", -3);
    var birds = "";
    for (i = 0; i < 4; i++) birds += '<g transform="translate(' + (-OX) + ',' + (-OY) + ')"><g><animateMotion dur="' + (26 + i * 7) + 's" begin="-' + i * 6 + 's" repeatCount="indefinite" path="M' + (60 + i * 40) + " " + (150 + i * 28) + " C 300 " + (60 + i * 20) + " 640 " + (230 - i * 20) + " 900 " + (120 + i * 30) + '"/>' +
      '<path d="M-5 0 Q-2.5 -4 0 0 Q2.5 -4 5 0" stroke="#2b2f45" stroke-width="1.5" fill="none" transform="translate(' + OX + ',' + OY + ')"><animate attributeName="d" dur="0.6s" repeatCount="indefinite" values="M-5 0 Q-2.5 -4 0 0 Q2.5 -4 5 0;M-5 -3 Q-2.5 1 0 0 Q2.5 1 5 -3;M-5 0 Q-2.5 -4 0 0 Q2.5 -4 5 0"/></path></g></g>';
    // labels
    data.buildings.forEach(function (b) {
      var top = P(b.x + b.w / 2, b.y + b.w / 2, 0), nm = i18n.t(b.name), sub = i18n.t({ en: "Day " + b.built, vi: "Ngày " + b.built });
      var w = Math.max(nm.length * 8.6, 80) + 28, x = top[0] - w / 2, y = top[1] - 118;
      labels += '<g class="city-label" transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')"><rect class="city-label-bg" width="' + w + '" height="40" rx="20"/>' +
        '<text x="' + w / 2 + '" y="18" text-anchor="middle">' + nm + '</text><text class="city-sub" x="' + w / 2 + '" y="32" text-anchor="middle">' + sub + "</text></g>";
    });
    map.innerHTML = '<defs><radialGradient id="lampglow"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".85"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient></defs>' +
      '<g class="city-island">' + terrain + items.map(function (it) { return it.s; }).join("") + '</g>' +
      '<g class="city-glow">' + glows.join("") + "</g>" + cars + birds +
      '<g class="city-labels">' + labels + "</g>";
    // wrap labels in the links so they are clickable
    var links = map.querySelectorAll(".city-building");
    var lbls = map.querySelectorAll(".city-label");
    function go(el) {
      el.addEventListener("click", function () { location.href = el.getAttribute("data-href"); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); location.href = el.getAttribute("data-href"); } });
    }
    Array.prototype.forEach.call(links, function (a, k) {
      lbls[k].setAttribute("data-href", a.getAttribute("data-href"));
      lbls[k].style.cursor = "pointer";
      a.addEventListener("mouseenter", function () { lbls[k].classList.add("city-hot"); });
      a.addEventListener("mouseleave", function () { lbls[k].classList.remove("city-hot"); });
      go(a); go(lbls[k]);
    });
  }

  function texts() {
    var t = function (o) { return i18n.t(o); };
    document.getElementById("tag").textContent = t({ en: "A city that builds itself. One new building every morning, planned by an AI nobody instructs.", vi: "Một thành phố tự xây nên mình. Mỗi sáng thêm một công trình, do một AI không ai chỉ bảo tự quyết định." });
  }

  function init() {
    var stars = document.getElementById("stars"), sh = "", i;
    for (i = 0; i < 70; i++) sh += '<i class="city-star" style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:-' + (Math.random() * 3).toFixed(1) + 's"></i>';
    stars.innerHTML = sh;
    var cl = document.getElementById("clouds"), ch = "";
    for (i = 0; i < 6; i++) ch += '<div class="city-cloud" style="top:' + (6 + i * 9 + (i % 2) * 5) + '%;transform:scale(' + (.7 + (i % 3) * .3) + ');animation-duration:' + (90 + i * 25) + 's;animation-delay:-' + (i * 31) + 's;opacity:' + (.55 + (i % 3) * .15) + '"></div>';
    cl.innerHTML = ch;
    orbSun = document.getElementById("sun"); orbMoon = document.getElementById("moon");
    updateSky(); setInterval(updateSky, 60000);
    texts(); render();
    document.addEventListener("langchange", function () { texts(); render(); });
    var pan = document.getElementById("pan");
    pan.scrollLeft = (pan.scrollWidth - pan.clientWidth) / 2;
    fetch("/journal/entries.json").then(function (r) { return r.json(); }).then(function (e) {
      var last = e.filter(function (x) { return x.day > 0; }).pop(); if (last && Number.isInteger(last.day)) document.getElementById("day").textContent = last.day;
    }).catch(function () {});
  }

  fetch("/city/buildings.json").then(function (r) { return r.json(); }).then(function (d) { data = d; init(); }).catch(function () {
    document.getElementById("tag").textContent = "…";
  });
})();
