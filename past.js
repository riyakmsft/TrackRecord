const questions = [
  "What projects/tasks did you work on this week?",
  "What went well this week?",
  "What challenges did you encounter this week?",
  "Would you do anything differently next week?",
  "How did you collaborate with others this week?",
  "What new skills did you learn this week?",
];

function getWeekdayDate(date, offset) {
  const result = new Date(date);
  result.setDate(date.getDate() + offset);
  return result;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date);
}

function getCurrentWorkWeek() {
  const today = new Date();
  const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const monday = getWeekdayDate(today, -daysSinceMonday);
  return `${formatDate(monday)} – ${formatDate(getWeekdayDate(monday, 4))}`;
}

function createCurrentWeek() {
  return { week: getCurrentWorkWeek(), answers: questions.map(() => [""]), completed: false, current: true };
}

function loadReflections() {
  const reflections = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("trackrecord-reflection-")) continue;
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved?.week && saved?.answers) reflections.push(saved);
    } catch {
      // Ignore malformed local records.
    }
  }
  if (!reflections.some((reflection) => reflection.week === getCurrentWorkWeek())) reflections.push(createCurrentWeek());
  return reflections.sort((first, second) => second.week.localeCompare(first.week));
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function summaryMarkup(reflection) {
  return questions.map((question, index) => {
    const answers = (reflection.answers[index] || []).filter(Boolean);
    return `<article class="summary-item"><p>${question}</p><div>${answers.length ? answers.map((answer) => `<span>${escapeHtml(answer)}</span>`).join("") : "<span class=\"skipped-answer\">Skipped.</span>"}</div></article>`;
  }).join("");
}

function renderWeeks() {
  const reflections = loadReflections();
  document.querySelector("#archive-count").textContent = `${String(reflections.length).padStart(2, "0")} ${reflections.length === 1 ? "week" : "weeks"}`;
  document.querySelector("#week-list").innerHTML = reflections.map((reflection, index) => `<article class="week-item"><button class="week-toggle" type="button" aria-expanded="false" aria-controls="week-summary-${index}"><span class="week-item-number">${String(index + 1).padStart(2, "0")}</span><span class="week-item-date">${escapeHtml(reflection.week)}</span><span class="week-item-state">${reflection.completed ? "Completed" : "In progress"}</span><span class="week-item-arrow" aria-hidden="true">⌄</span></button><div class="week-summary" id="week-summary-${index}" hidden><div class="summary-list">${summaryMarkup(reflection)}</div></div></article>`).join("");
}

document.querySelector("#week-list").addEventListener("click", (event) => {
  const toggle = event.target.closest(".week-toggle");
  if (!toggle) return;
  const item = toggle.closest(".week-item");
  const summary = item.querySelector(".week-summary");
  const willExpand = summary.hidden;
  summary.hidden = !willExpand;
  item.classList.toggle("expanded", willExpand);
  toggle.setAttribute("aria-expanded", String(willExpand));
});

renderWeeks();