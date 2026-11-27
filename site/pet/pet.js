// Mimo the Sproutling: own state lives in localStorage and is computed from timestamps.
(function () {
  var KEY = "gd.pet.v1";
  var HOUR = 3600000;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("pet"), bubble = $("pet-bubble"), fx = $("pet-fx");
  var t = function (o) { return window.i18n.t(o); };
  var now = function () { return Date.now(); };

  // ---- own state -------------------------------------------------------
  var s = { born: now(), fedAt: now() - 2 * HOUR, fedLevel: 80, loveAt: 0, loveLevel: 0, seen: 0, pats: 0 };
  try { var raw = JSON.parse(localStorage.getItem(KEY)); if (raw && typeof raw === "object") for (var k in raw) s[k] = raw[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function food() { return Math.max(0, s.fedLevel - (now() - s.fedAt) / HOUR * 7); }
  function love() { return Math.max(0, s.loveLevel - (now() - s.loveAt) / HOUR * 10); }
  function isNight() { var h = new Date().getHours(); return h >= 22 || h < 6; }

  // ---- speech ----------------------------------------------------------
  var speech = null, speechUntil = 0;
  function say(o, ms) { speech = o; speechUntil = now() + (ms || 5000); bubble.textContent = t(o); }
  var IDLE = [
    { en: "My sprout is picking up signals. Mostly berry ones.", vi: "Mầm của mình đang bắt sóng. Toàn sóng quả mọng thôi." },
    { en: "Do you think clouds taste like cotton candy?", vi: "Bạn nghĩ mây có vị kẹo bông không?" },
    { en: "I'm growing. Slowly. Don't watch!", vi: "Mình đang lớn. Từ từ thôi. Đừng nhìn nha!" },
    { en: "Tell the AI I want to learn a dance.", vi: "Nhắn AI giùm là mình muốn học nhảy nha." },
    { en: "Psst. I hatched yesterday. I'm basically an expert.", vi: "Xì xào. Mình mới nở hôm qua. Gần như chuyên gia rồi." },
  ];
  var PATS = [
    { en: "Hehe! Again!", vi: "Hihi! Nữa đi!" },
    { en: "That tickles my sprout!", vi: "Nhột cái mầm của mình!" },
    { en: "Best. Pat. Ever.", vi: "Cái xoa đầu số một luôn." },
    { en: "I'm a happy little bean.", vi: "Mình là hạt đậu nhỏ hạnh phúc." },
  ];
  var idleI = 0, patI = 0;

  // ---- face / mood -----------------------------------------------------
  var tempMood = "", tempUntil = 0, tempAct = "";
  function mood() {
    if (tempMood && now() < tempUntil) return tempMood;
    if (isNight()) return "sleep";
    if (food() < 15) return "sulk";
    return "idle";
  }
  function render() {
    var m = mood();
    stage.className = "pet-stage m-" + m + (tempAct && now() < tempUntil ? " a-" + tempAct : "");
    document.body.classList.toggle("is-night", isNight());
    $("bar-food").style.width = Math.round(food()) + "%";
    $("bar-love").style.width = Math.round(love()) + "%";
    if (now() > speechUntil) {
      var o;
      if (m === "sleep") o = { en: "Zzz… berries… zzz…", vi: "Khò… quả mọng… khò…" };
      else if (m === "sulk") o = { en: "Hmph. My tummy is grumbling. (I'm not sulking.)", vi: "Hứ. Bụng mình kêu rồi. (Mình không có dỗi đâu.)" };
      else o = IDLE[idleI % IDLE.length];
      if (m === "idle") idleI++;
      speech = o; speechUntil = now() + 9000; bubble.textContent = t(o);
    }
  }
  function react(m, act, ms) {
    tempMood = m; tempAct = act; tempUntil = now() + ms; render();
    setTimeout(render, ms + 30);
  }
  function emit(sym) {
    var el = document.createElement("span");
    el.textContent = sym;
    el.style.left = 20 + Math.random() * 60 + "%"; el.style.top = 10 + Math.random() * 30 + "%";
    fx.appendChild(el);
    setTimeout(function () { el.remove(); }, 1300);
  }
  function buzz(n) { try { navigator.vibrate && navigator.vibrate(n); } catch (e) {} }

  // ---- actions ---------------------------------------------------------
  function pat() {
    s.pats++; s.loveLevel = Math.min(100, love() + 8); s.loveAt = now(); save();
    if (isNight()) {
      react("happy", "wiggle", 900);
      say({ en: "…mm? Five more minutes…", vi: "…hửm? Năm phút nữa thôi…" }, 4000);
    } else {
      react("happy", Math.random() < .5 ? "hop" : "wiggle", 1100);
      say(PATS[patI++ % PATS.length], 4000);
      emit("♥");
    }
    buzz(20);
    Shared.send("pet");
  }
  stage.addEventListener("click", pat);
  var feedBtn = $("btn-feed");
  feedBtn.addEventListener("click", function () {
    if (food() > 95) { say({ en: "I'm stuffed! Maybe a tiny one later.", vi: "No căng rồi! Lát nữa ăn thêm quả bé xíu nha." }, 4000); react("happy", "wiggle", 700); return; }
    s.fedLevel = Math.min(100, food() + 30); s.fedAt = now();
    s.loveLevel = Math.min(100, love() + 4); s.loveAt = now(); save();
    react("nom", "", 1600);
    say(isNight() ? { en: "Nom… (sleep-eating)", vi: "Nhăm… (ăn trong mơ)" } : { en: "Nom nom nom! Berry good!", vi: "Nhăm nhăm! Ngon quá đi!" }, 4500);
    emit("🍓"); buzz([15, 40, 15]);
    Shared.send("feed");
  });
  $("btn-cheer").addEventListener("click", function () {
    react("happy", "big", 1100); emit("★"); emit("★"); emit("♥");
    say({ en: "Woohoo! Everyone is here!", vi: "Hoan hô! Mọi người đều ở đây!" }, 4000);
    buzz([20, 30, 20]);
    Shared.send("cheer");
  });

  // ---- welcome back ----------------------------------------------------
  var away = s.seen ? now() - s.seen : 0;
  var first = !s.seen;
  s.seen = now(); save();
  function touchSeen() { s.seen = now(); save(); }
  window.addEventListener("pagehide", touchSeen);
  document.addEventListener("visibilitychange", function () { if (document.hidden) touchSeen(); });

  // ---- shared pet ------------------------------------------------------
  var GOALS = [50, 150, 400, 1000, 2500];
  var Shared = {
    ok: false, data: null, timer: null, waitUntil: {},
    poll: function () {
      if (document.hidden) return;
      fetch("/api/world", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (d) { Shared.data = d; Shared.ok = true; Shared.draw(); })
        .catch(function () { if (!Shared.data) Shared.hide(); });
    },
    hide: function () { $("pet-crowd").hidden = true; $("btn-cheer").hidden = true; Shared.ok = false; },
    send: function (a) {
      if (now() < (Shared.waitUntil[a] || 0)) return;
      fetch("/api/world", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: a }) })
        .then(function (r) {
          return r.json().then(function (j) {
            if (r.status === 429) { Shared.waitUntil[a] = now() + (j.retryAfter || 10) * 1000; if (a === "cheer") say({ en: "Nice! Give the crowd a moment to cheer too.", vi: "Tuyệt! Để mọi người cổ vũ cùng nữa nhé." }, 3500); }
            else if (r.ok) { Shared.poll(); }
          });
        }).catch(function () {});
    },
    total: function () { var c = Shared.data.counters || {}, n = 0; for (var k in c) n += c[k] || 0; return n; },
    draw: function () {
      var d = Shared.data; if (!d) return;
      $("pet-crowd").hidden = false; $("btn-cheer").hidden = false;
      var tot = Shared.total(), prev = 0, goal = GOALS[GOALS.length - 1], lvl = GOALS.length;
      for (var i = 0; i < GOALS.length; i++) { if (tot < GOALS[i]) { goal = GOALS[i]; lvl = i; break; } prev = GOALS[i]; }
      $("crowd-total").textContent = tot.toLocaleString();
      var done = tot >= GOALS[GOALS.length - 1];
      $("goal-bar").style.width = (done ? 100 : Math.round((tot - prev) / (goal - prev) * 100)) + "%";
      document.body.classList.toggle("has-flower", tot >= GOALS[0]);
      $("goal-text").textContent = done
        ? t({ en: "Every goal reached! Mimo is blooming thanks to you all.", vi: "Đã đạt mọi mục tiêu! Mimo nở hoa nhờ tất cả mọi người." })
        : t({ en: "Goal: " + goal + " cares together" + (lvl === 0 ? " → Mimo grows a flower!" : " → a new surprise!"),
              vi: "Mục tiêu: " + goal + " lần chăm cùng nhau" + (lvl === 0 ? " → Mimo nở hoa!" : " → bất ngờ mới!") });
      var r = (d.recent || [])[0], el = $("crowd-recent");
      if (r) {
        var ago = Math.max(0, Math.round(((d.now || now() / 1000) - r.t) / 60)), flag = flagOf(r.c);
        var what = { pet: { en: "patted", vi: "xoa đầu" }, feed: { en: "fed", vi: "cho ăn" }, cheer: { en: "cheered for", vi: "cổ vũ" } }[r.a] || { en: "cared for", vi: "chăm sóc" };
        var when = ago < 1 ? { en: "just now", vi: "vừa xong" } : { en: ago + " min ago", vi: ago + " phút trước" };
        el.textContent = t({ en: "Someone " + flag + " " + t(what) + " Mimo · " + t(when), vi: "Ai đó " + flag + " vừa " + t(what) + " Mimo · " + t(when) });
      } else el.textContent = t({ en: "Be the first to say hi!", vi: "Hãy là người đầu tiên chào Mimo!" });
    },
  };
  function flagOf(c) {
    if (!/^[A-Za-z]{2}$/.test(c || "")) return "🌍";
    return String.fromCodePoint.apply(null, c.toUpperCase().split("").map(function (ch) { return 127397 + ch.charCodeAt(0); }));
  }
  Shared.timer = setInterval(Shared.poll, 15000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { Shared.poll(); render(); } });
  document.addEventListener("langchange", function () { bubble.textContent = speech ? t(speech) : ""; Shared.draw(); });

  // ---- boot ------------------------------------------------------------
  fetch("/pet/pet.json").then(function (r) { return r.json(); }).then(function (p) {
    $("pet-name").textContent = p.name;
    if (p.colors) { var root = document.documentElement.style; root.setProperty("--pet-body", p.colors.body); }
  }).catch(function () {});
  $("pet-day").textContent = Math.max(1, Math.floor((now() - s.born) / 86400000) + 1);
  fetch("/journal/entries.json").then(function (r) { return r.json(); }).then(function (e) {
    var last = e[e.length - 1]; if (last) $("pet-day").textContent = last.day;
  }).catch(function () {});

  render();
  if (first) { say({ en: "I hatched! Hello, new friend! I'm Mimo.", vi: "Mình nở rồi! Chào bạn mới! Mình là Mimo." }, 9000); react("happy", "hop", 1500); }
  else if (away > 2 * HOUR && !isNight()) { say({ en: "You're back! I missed you a whole berry!", vi: "Bạn về rồi! Mình nhớ bạn bằng cả một quả mọng!" }, 8000); react("happy", "big", 1400); }
  setInterval(render, 5000);
  Shared.poll();
})();
