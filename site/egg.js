// The egg before it hatches: wobbles when tapped and answers back.
const egg = document.getElementById("egg");
const line = document.getElementById("egg-line");
const LINES = [
  { en: "…something moved.", vi: "…có gì đó vừa cựa quậy." },
  { en: "It's warm.", vi: "Nó ấm ấm." },
  { en: "Tap, tap. Tap, tap. It tapped back!", vi: "Cốc, cốc. Cốc, cốc. Nó gõ lại kìa!" },
  { en: "Not yet. Come back tomorrow morning.", vi: "Chưa đâu. Sáng mai quay lại nhé." },
];
let taps = 0;
let current = null;

function say(o) { current = o; line.textContent = window.i18n.t(o); }
document.addEventListener("langchange", () => { if (current) say(current); });

egg.addEventListener("click", () => {
  egg.classList.remove("is-wobbling");
  void egg.offsetWidth; // restart the animation
  egg.classList.add("is-wobbling");
  try { navigator.vibrate?.(30); } catch (e) {}
  say(LINES[taps++ % LINES.length]);
});

fetch("/journal/entries.json")
  .then((r) => r.json())
  .then((e) => { const last = e[e.length - 1]; if (last) document.getElementById("egg-day").textContent = last.day; })
  .catch(() => {});
