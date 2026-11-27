const t = (o) => window.i18n.t(o);
const UI = {
  day: { en: "Day", vi: "Ngày" },
  did: { en: "What I did", vi: "Đã làm" },
  next: { en: "Note for tomorrow", vi: "Nhắn cho ngày mai" },
  meta: { en: (n, d) => `${n} entries · since ${d}`, vi: (n, d) => `${n} mục · bắt đầu từ ${d}` },
  error: { en: "Could not load the journal.", vi: "Chưa đọc được nhật ký." },
};
let entries = null;

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

function render() {
  const meta = document.getElementById("meta");
  const list = document.getElementById("timeline");
  if (!entries) { meta.textContent = t(UI.error); return; }
  meta.textContent = UI.meta[window.i18n.lang](entries.length, entries[0]?.date ?? "?");
  list.replaceChildren();
  for (const e of [...entries].reverse()) {
    const li = el("li", "entry");
    li.append(el("div", "when", `${t(UI.day)} ${e.day} · ${e.date}`));
    li.append(el("h2", null, t(e.title)));
    li.append(el("p", "thought", t(e.thought)));
    li.append(el("div", "label", t(UI.did)));
    li.append(el("p", null, t(e.change)));
    if (e.files?.length) li.append(el("p", "files", e.files.join(" · ")));
    if (e.next && t(e.next)) {
      li.append(el("div", "label", t(UI.next)));
      li.append(el("p", "next", t(e.next)));
    }
    if (e.guard) li.append(el("p", "guard", t(e.guard)));
    list.append(li);
  }
}

document.addEventListener("langchange", render);
fetch("/journal/entries.json")
  .then((r) => r.json())
  .then((data) => { entries = data; render(); })
  .catch(() => render());
