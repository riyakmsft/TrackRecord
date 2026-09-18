function getWeekdayDate(date, offset) {
  const result = new Date(date);
  result.setDate(date.getDate() + offset);
  return result;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getCurrentWorkWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = getWeekdayDate(today, -daysSinceMonday);
  const friday = getWeekdayDate(monday, 4);
  return `${formatDate(monday)} – ${formatDate(friday)}`;
}

document.querySelector("#week-dates").textContent = getCurrentWorkWeek();

const sidebar = document.querySelector(".sidebar");
const collapseButton = document.querySelector(".collapse-button");
collapseButton.addEventListener("click", () => {
  const isCollapsed = sidebar.classList.toggle("collapsed");
  if (isCollapsed) {
    sidebar.style.setProperty("flex-basis", "72px", "important");
    sidebar.style.setProperty("width", "72px", "important");
  } else {
    sidebar.style.removeProperty("flex-basis");
    sidebar.style.removeProperty("width");
  }
  collapseButton.setAttribute("aria-expanded", String(!isCollapsed));
  collapseButton.setAttribute("aria-label", isCollapsed ? "Expand navigation" : "Collapse navigation");
  collapseButton.querySelector("span").textContent = isCollapsed ? "›" : "‹";
});

const summaryCategories = [
  { title: "Accomplishments", questionIndexes: [0] },
  { title: "Challenges", questionIndexes: [2] },
  { title: "Collaboration", questionIndexes: [4] },
  { title: "Growth", questionIndexes: [3, 5] },
  { title: "Impact", questionIndexes: [1] },
];

function loadCompletedReflections() {
  const reflections = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("trackrecord-reflection-")) continue;
    try {
      const reflection = JSON.parse(localStorage.getItem(key));
      if (reflection?.week && reflection.completed && Array.isArray(reflection.answers)) reflections.push(reflection);
    } catch {
      // Ignore malformed local records.
    }
  }
  return reflections.sort((first, second) => first.week.localeCompare(second.week));
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function populateConnectWeeks(reflections) {
  const options = reflections.map((reflection, index) => `<option value="${index}">${escapeHtml(reflection.week)}</option>`).join("");
  document.querySelector("#connect-start").innerHTML = options;
  document.querySelector("#connect-end").innerHTML = options;
  document.querySelector("#connect-end").value = String(reflections.length - 1);
}

const ignoredWords = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "with"]);

function answerWords(answer) {
  return new Set(answer.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !ignoredWords.has(word)));
}

function wordSimilarity(first, second) {
  const firstWords = answerWords(first);
  const secondWords = answerWords(second);
  const intersection = [...firstWords].filter((word) => secondWords.has(word)).length;
  const union = new Set([...firstWords, ...secondWords]).size;
  return union ? intersection / union : 0;
}

function buildLocalSummary(reflections) {
  return Object.fromEntries(summaryCategories.map((category) => {
    const answers = reflections.flatMap((reflection) => category.questionIndexes.flatMap((questionIndex) => (reflection.answers[questionIndex] || []).filter(Boolean).map((answer) => ({ answer: answer.trim().replace(/\s+/g, " "), week: reflection.week })))).filter((entry) => entry.answer);
    const groups = [];

    answers.forEach((entry) => {
      const matchingGroup = groups.find((group) => wordSimilarity(group.representative.answer, entry.answer) >= 0.55);
      if (matchingGroup) {
        matchingGroup.entries.push(entry);
      } else {
        groups.push({ representative: entry, entries: [entry] });
      }
    });

    return [category.title, groups.sort((first, second) => second.entries.length - first.entries.length || second.representative.answer.length - first.representative.answer.length).slice(0, 4).map((group) => {
      const weekCount = new Set(group.entries.map((entry) => entry.week)).size;
      return weekCount > 1 ? `${group.representative.answer} (mentioned across ${weekCount} weeks)` : group.representative.answer;
    })];
  }));
}

function renderConnectSummary(reflections, start, end, generatedSummary = null) {
  const selected = reflections.slice(start, end + 1);
  const localSummary = generatedSummary || buildLocalSummary(selected);
  const summary = summaryCategories.map((category) => {
    const answers = localSummary[category.title] || [];
    return `<section class="connect-summary-item"><h4>${category.title}</h4><ul>${answers.length ? answers.map((answer) => `<li>${escapeHtml(answer)}</li>`).join("") : "<li class=\"skipped-answer\">No notes recorded.</li>"}</ul></section>`;
  }).join("");
  document.querySelector("#connect-range").textContent = selected.length === 1 ? selected[0].week : `${selected[0].week} – ${selected[selected.length - 1].week}`;
  document.querySelector("#connect-summary-list").innerHTML = summary;
  document.querySelector("#dashboard-empty").hidden = true;
  document.querySelector("#connect-summary").hidden = false;
}

const connectDialog = document.querySelector("#connect-dialog");
const availableReflections = loadCompletedReflections();
document.querySelector("#connect-button").addEventListener("click", () => {
  if (!availableReflections.length) {
    document.querySelector("#dashboard-empty").innerHTML = '<p class="panel-kicker">Nothing to connect yet</p><p>Complete a reflection first, then come back here to generate a summary.</p>';
    return;
  }
  populateConnectWeeks(availableReflections);
  connectDialog.showModal();
});

document.querySelector("#connect-form").addEventListener("submit", (event) => {
  if (event.submitter?.value !== "default") return;
  event.preventDefault();
  const start = Number(document.querySelector("#connect-start").value);
  const end = Number(document.querySelector("#connect-end").value);
  if (start > end) {
    document.querySelector("#connect-end").setCustomValidity("Choose a week after the starting week.");
    document.querySelector("#connect-end").reportValidity();
    return;
  }
  document.querySelector("#connect-end").setCustomValidity("");
  renderConnectSummary(availableReflections, start, end);
  connectDialog.close();
});

document.querySelector("#connect-start").addEventListener("change", () => {
  const start = document.querySelector("#connect-start");
  const end = document.querySelector("#connect-end");
  if (Number(end.value) < Number(start.value)) end.value = start.value;
});