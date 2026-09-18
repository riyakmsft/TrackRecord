const questions = [
  "What projects/tasks did you work on this week?",
  "What went well this week?",
  "What challenges did you encounter this week?",
  "Would you do anything differently next week?",
  "How did you collaborate with others this week?",
  "What new skills did you learn this week?",
];

const reflectionWeek = new URLSearchParams(window.location.search).get("week") || getCurrentWorkWeek();
const storageKey = `trackrecord-reflection-${reflectionWeek}`;
let reflection = loadReflection();
let currentQuestion = reflection.currentQuestion || 0;

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

function createEmptyReflection() {
  return { week: reflectionWeek, currentQuestion: 0, answers: questions.map(() => [""]), completed: false };
}

function loadReflection() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return saved && saved.answers ? saved : createEmptyReflection();
  } catch {
    return createEmptyReflection();
  }
}

function saveReflection() {
  reflection.currentQuestion = currentQuestion;
  localStorage.setItem(storageKey, JSON.stringify(reflection));
  document.querySelector("#save-status").textContent = "Saved locally just now";
}

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

function renderAnswers() {
  const answerList = document.querySelector("#answer-list");
  answerList.innerHTML = "";
  reflection.answers[currentQuestion].forEach((answer, index) => {
    const entry = document.createElement("div");
    entry.className = "answer-entry";
    entry.innerHTML = `<div class="answer-label-row"><label for="answer-${index}">${reflection.answers[currentQuestion].length > 1 ? `Entry ${String(index + 1).padStart(2, "0")}` : "Your answer"}</label>${reflection.answers[currentQuestion].length > 1 ? `<button class="delete-button" type="button" data-action="delete" data-index="${index}">Delete entry</button>` : ""}</div><textarea id="answer-${index}" rows="5" placeholder="Write what comes to mind...">${answer}</textarea>${index === reflection.answers[currentQuestion].length - 1 ? `<div class="question-actions"><button class="quiet-button back-button" type="button" data-action="back" ${currentQuestion === 0 ? "disabled" : ""}>← Back</button><button class="quiet-button" type="button" data-action="skip">Skip</button><button class="quiet-button add-button" type="button" data-action="add">+ Add more</button><button class="primary-button" type="button" data-action="next">${currentQuestion === questions.length - 1 ? "Done" : "Next"} <span aria-hidden="true">→</span></button></div>` : ""}`;
    answerList.appendChild(entry);
  });
  document.querySelector("#question-title").textContent = questions[currentQuestion];
  document.querySelector("#question-number").textContent = String(currentQuestion + 1).padStart(2, "0");
  document.querySelector("#question-count").textContent = String(currentQuestion + 1).padStart(2, "0");
  document.querySelector("#progress-fill").style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;
}

function showQuestions() {
  document.querySelector("#start-panel").hidden = true;
  document.querySelector("#summary-panel").hidden = true;
  document.querySelector("#question-panel").hidden = false;
  renderAnswers();
}

function moveToNextQuestion() {
  if (currentQuestion === questions.length - 1) {
    reflection.completed = true;
    saveReflection();
    renderSummary();
    return;
  }
  currentQuestion += 1;
  saveReflection();
  renderAnswers();
}

function renderSummary() {
  document.querySelector("#question-panel").hidden = true;
  document.querySelector("#start-panel").hidden = true;
  document.querySelector("#summary-panel").hidden = false;
  document.querySelector("#summary-list").innerHTML = questions.map((question, index) => {
    const entries = reflection.answers[index].filter(Boolean);
    return `<article class="summary-item"><p>${question}</p><div>${entries.length ? entries.map((answer) => `<span>${escapeHtml(answer)}</span>`).join("") : "<span class=\"skipped-answer\">Skipped.</span>"}</div></article>`;
  }).join("");
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

document.querySelector("#reflection-week-dates").textContent = reflectionWeek;
document.querySelector("#begin-button").addEventListener("click", showQuestions);
document.querySelector("#summary-panel").addEventListener("click", (event) => {
  if (!event.target.closest("[data-action='edit']")) return;
  reflection.completed = false;
  currentQuestion = 0;
  saveReflection();
  showQuestions();
});
document.querySelector("#answer-list").addEventListener("input", (event) => {
  if (event.target.matches("textarea")) {
    reflection.answers[currentQuestion][Number(event.target.id.split("-")[1])] = event.target.value;
    saveReflection();
  }
});
document.querySelector("#answer-list").addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "add") {
    reflection.answers[currentQuestion].push("");
    saveReflection();
    renderAnswers();
  } else if (action === "delete") {
    reflection.answers[currentQuestion].splice(Number(event.target.closest("[data-action='delete']").dataset.index), 1);
    saveReflection();
    renderAnswers();
  } else if (action === "back") {
    if (currentQuestion === 0) return;
    currentQuestion -= 1;
    saveReflection();
    renderAnswers();
  } else if (action === "skip") {
    reflection.answers[currentQuestion] = [""];
    moveToNextQuestion();
  } else {
    moveToNextQuestion();
  }
});

if (reflection.completed) {
  renderSummary();
} else if (reflection.currentQuestion > 0 || reflection.answers.some((entries) => entries.some(Boolean))) {
  showQuestions();
}