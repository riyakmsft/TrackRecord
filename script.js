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