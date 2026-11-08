// calendar.js — vista mensual y semanal. No guarda nada: lee las tareas de DayflowTasks.
const DayflowCalendar = {
  mode: "month", cursor: new Date(), selected: "",

  init() {
    this.grid = document.getElementById("cal-grid");
    this.selected = toISODate(new Date()); // se calcula aquí, cuando toISODate ya existe
    document.getElementById("cal-prev").addEventListener("click", () => this.move(-1));
    document.getElementById("cal-next").addEventListener("click", () => this.move(1));
    document.getElementById("cal-today").addEventListener("click", () => {
      this.cursor = new Date(); this.selected = toISODate(this.cursor); this.render();
    });
    document.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => {
      this.mode = b.dataset.mode;
      document.querySelectorAll(".seg-btn").forEach((x) => {
        x.classList.toggle("is-active", x === b); x.setAttribute("aria-pressed", String(x === b));
      });
      this.render();
    }));
    this.grid.addEventListener("click", (e) => {
      const cell = e.target.closest("[data-date]");
      if (!cell) return;
      this.selected = cell.dataset.date;
      if (this.mode === "month") this.cursor = new Date(this.selected + "T00:00:00");
      this.render();
    });
    document.addEventListener("dayflow:tasks-changed", () => this.render());
    this.render();
  },

  move(step) {
    const c = this.cursor;
    this.cursor = this.mode === "month" ? new Date(c.getFullYear(), c.getMonth() + step, 1) : new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7 * step);
    this.render();
  },

  render() {
    const c = this.cursor, today = toISODate(new Date());
    const first = this.mode === "month" ? new Date(c.getFullYear(), c.getMonth(), 1) : c;
    const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - ((first.getDay() + 6) % 7)); // lunes
    const count = this.mode === "month" ? 42 : 7;
    this.grid.className = `cal-grid is-${this.mode}`;

    let html = "";
    for (let i = 0; i < count; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), iso = toISODate(d);
      const items = DayflowTasks.sortTasks(DayflowTasks.tasks.filter((t) => t.dueDate === iso));
      const marks = this.mode === "month"
        ? `<span class="dots">${items.slice(0, 4).map((t) => `<i class="dot prio-bg-${t.priority} ${t.status === "completed" ? "is-done" : ""}"></i>`).join("")}</span>`
        : `<span class="chips">${items.slice(0, 4).map((t) => `<span class="mini prio-bg-${t.priority} ${t.status === "completed" ? "is-done" : ""}">${esc(t.title)}</span>`).join("")}${items.length > 4 ? `<span class="more">+${items.length - 4}</span>` : ""}</span>`;
      const label = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) + `, ${items.length} tareas`;
      html += `<button class="cal-day ${this.mode === "month" && d.getMonth() !== c.getMonth() ? "is-other" : ""} ${iso === today ? "is-today" : ""} ${iso === this.selected ? "is-selected" : ""}" data-date="${iso}" aria-label="${label}" aria-pressed="${iso === this.selected}">
        <span class="num">${d.getDate()}</span>${marks}</button>`;
    }
    this.grid.innerHTML = html;

    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    document.getElementById("cal-title").textContent = this.mode === "month"
      ? c.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
      : `${start.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`;

    // Panel del día seleccionado
    const day = new Date(this.selected + "T00:00:00");
    document.getElementById("cal-day-title").textContent = day.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    const list = DayflowTasks.sortTasks(DayflowTasks.tasks.filter((t) => t.dueDate === this.selected));
    document.getElementById("cal-day-list").innerHTML = list.map((t) => DayflowTasks.rowHTML(t, false)).join("");
    const empty = document.getElementById("cal-day-empty");
    empty.hidden = list.length > 0;
    empty.innerHTML = `<p>Nada programado para este día.</p><button class="btn btn-soft" data-open-task data-date="${this.selected}">Añadir tarea</button>`;
  }
};