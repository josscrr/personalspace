// app.js — arranque de la aplicación y datos del Overview.
const QUOTES = [
  "Una cosa a la vez. Eso es suficiente.",
  "Empieza pequeño; el ritmo llega solo.",
  "Descansar también es parte del trabajo.",
  "Lo importante primero, lo demás después.",
  "Hoy no tiene que ser perfecto, no te presiones!.",
  "Menos ruido, más enfoque."
];

// Convierte una fecha en texto local "AAAA-MM-DD" (formato que usarán las tareas)
function toISODate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function renderHeader() {
  const now = new Date();
  const name = DayflowStorage.get("settings", {}).userName || "";
  const hour = now.getHours();
  const hello = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  document.getElementById("greeting").textContent = name ? `${hello}, ${name}` : hello;

  const dateText = now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  document.getElementById("today-date").textContent = dateText.charAt(0).toUpperCase() + dateText.slice(1);

  // La frase cambia cada día, pero se mantiene igual durante todo el día
  const dayNumber = Math.floor(now.getTime() / 86400000);
  document.getElementById("daily-quote").textContent = QUOTES[dayNumber % QUOTES.length];
}

// Calcula los números a partir de las tareas guardadas (hoy no hay ninguna, así que todo es 0)
function renderStats() {
  const tasks = DayflowStorage.get("tasks", []);
  const today = toISODate(new Date());
  const limit = toISODate(new Date(Date.now() + 7 * 86400000));

  const open = tasks.filter((t) => t.status !== "completed");
  const stats = {
    pending: open.length,
    completed: tasks.length - open.length,
    soon: open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= limit).length,
    overdue: open.filter((t) => t.dueDate && t.dueDate < today).length
  };
  for (const [key, value] of Object.entries(stats)) {
    document.getElementById(`stat-${key}`).textContent = value;
  }
}

// Today's Tasks y Upcoming Deadlines (usa las mismas filas que My Tasks)
function renderOverviewLists() {
  const today = toISODate(new Date());
  const tasks = DayflowTasks.tasks;
  const fill = (id, list, emptyTitle, emptyHint) => {
    const box = document.getElementById(id);
    box.className = list.length ? "" : "empty";
    box.innerHTML = list.length
      ? `<ul class="task-list">${list.map((t) => DayflowTasks.rowHTML(t, false)).join("")}</ul>`
      : `<p>${emptyTitle}</p><small>${emptyHint}</small>`;
  };
  fill("today-list", DayflowTasks.sortTasks(tasks.filter((t) => t.dueDate === today)),
    "Tu día está despejado.", "Las tareas con entrega hoy aparecerán aquí.");
  const upcoming = DayflowTasks.sortTasks(tasks.filter((t) => t.status !== "completed" && t.dueDate && t.dueDate !== today)).slice(0, 6);
  fill("upcoming-list", upcoming, "Sin entregas próximas.", "Las fechas más cercanas se ordenarán aquí.");
}

function refreshOverview() { renderStats(); renderOverviewLists(); }

document.addEventListener("DOMContentLoaded", () => {
  DayflowNavigation.init();
  DayflowTasks.init();
  DayflowCalendar.init();
  DayflowSettings.init();
  DayflowTimer.init();
  DayflowMusic.init();
  document.addEventListener("dayflow:settings-changed", renderHeader);
  renderHeader();
  refreshOverview();
  document.addEventListener("dayflow:tasks-changed", refreshOverview);
});