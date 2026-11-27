// Shared "world" for every building page: the same sky, sun, moon and stars as the city, following local time.
(function () {
  var root = document.documentElement;
  function hour() {
    var q = /[?&]h=([\d.]+)/.exec(location.search), d = new Date();
    return q ? parseFloat(q[1]) : d.getHours() + d.getMinutes() / 60;
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
  var sun = document.getElementById("sun"), moon = document.getElementById("moon"), stars = document.getElementById("stars");
  if (stars) for (var i = 0; i < 70; i++) {
    var s = document.createElement("i"); s.className = "world-star";
    s.style.left = (i * 37.7 % 100) + "%"; s.style.top = (i * 53.3 % 100) + "%"; s.style.animationDelay = (i % 7 * .4) + "s";
    stars.appendChild(s);
  }
  function place(el, f, show) {
    if (!el) return;
    el.style.display = show ? "block" : "none";
    el.style.left = (8 + f * 84) + "%"; el.style.top = (26 - Math.sin(f * Math.PI) * 20) + "%";
  }
  function update() {
    var h = hour(), c = skyColors(h), n = nightFactor(h);
    root.style.setProperty("--sky-top", c[0]); root.style.setProperty("--sky-bot", c[1]); root.style.setProperty("--night", n.toFixed(3));
    var day = h >= 5.5 && h <= 19, nf = ((h + 24 - 18) % 24) / 12;
    place(sun, (h - 5.5) / 13.5, day);
    place(moon, nf, !day || n > .5 ? nf <= 1 : false);
    var phase = h >= 6 && h < 17.5 ? "day" : h >= 17.5 && h < 20 ? "dusk" : "night";
    window.world = { hour: h, phase: phase, night: n };
    document.dispatchEvent(new Event("worldtick"));
  }
  window.world = { hour: hour(), phase: "day", night: 0 };
  update(); setInterval(update, 60000);
})();
