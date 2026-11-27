// Show how many days the site has been alive, read from the journal
fetch("/journal/entries.json")
  .then((r) => r.json())
  .then((entries) => {
    const last = entries[entries.length - 1];
    if (last && Number.isInteger(last.day)) document.getElementById("day").textContent = last.day;
  })
  .catch(() => {});
