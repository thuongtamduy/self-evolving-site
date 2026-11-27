const t = (o) => window.i18n.t(o);
const UI = {
  play: { en: "▶ Play", vi: "▶ Phát" },
  pause: { en: "❚❚ Pause", vi: "❚❚ Dừng" },
  day: { en: "Day", vi: "Ngày" },
  empty: { en: "No pictures yet. The first one appears after the first day of evolution.", vi: "Chưa có ảnh nào. Ảnh đầu tiên sẽ xuất hiện sau ngày tiến hóa đầu tiên." },
  error: { en: "Could not load the picture list.", vi: "Chưa đọc được danh sách ảnh." },
};
const img = document.getElementById("shot");
const caption = document.getElementById("caption");
const slider = document.getElementById("slider");
const playBtn = document.getElementById("play");
let shots = null;
let timer = null;

function show(i) {
  const s = shots?.[i];
  if (!s) return;
  slider.value = i;
  img.src = "/timelapse/" + s.file;
  caption.replaceChildren();
  const b = document.createElement("b");
  b.textContent = `${t(UI.day)} ${s.day}`;
  caption.append(b, ` · ${s.date} · ${t(s.title)}`);
}

function label() { playBtn.textContent = t(timer ? UI.pause : UI.play); }
function stop() { clearInterval(timer); timer = null; label(); }

function refresh() {
  label();
  if (shots === null) return;
  if (shots === false) { caption.textContent = t(UI.error); return; }
  if (!shots.length) { caption.textContent = t(UI.empty); playBtn.disabled = true; return; }
  show(+slider.value);
}

playBtn.addEventListener("click", () => {
  if (timer) return stop();
  if (+slider.value >= shots.length - 1) show(0);
  timer = setInterval(() => {
    const next = +slider.value + 1;
    if (next >= shots.length) return stop();
    show(next);
  }, 700);
  label();
});
slider.addEventListener("input", () => { stop(); show(+slider.value); });
document.addEventListener("langchange", refresh);

label();
fetch("/timelapse/shots.json")
  .then((r) => r.json())
  .then((list) => {
    shots = list;
    if (shots.length) {
      slider.max = shots.length - 1;
      slider.value = shots.length - 1;
      shots.forEach((s) => { new Image().src = "/timelapse/" + s.file; }); // preload for smooth playback
    }
    refresh();
  })
  .catch(() => { shots = false; refresh(); });
