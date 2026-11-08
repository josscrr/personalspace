// tasks.js — datos y pantalla de tareas. Es la ÚNICA fuente de tareas de la app.
// Cuando algo cambia, avisa con el evento "dayflow:tasks-changed" y Overview y Calendar se actualizan solos.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const DayflowTasks = {
  tasks: [], search: "", statusFilter: "all", priorityFilter: "all", categoryFilter: "all", editingId: null,
  LABELS: { pending: "Pendiente", progress: "En progreso", completed: "Completada", low: "Baja", medium: "Media", high: "Alta" },

  init() {
    this.tasks = DayflowStorage.get("tasks", []);
    this.dialog = document.getElementById("task-dialog");
    this.form = document.getElementById("task-form");
    const bind = (id, prop) => document.getElementById(id).addEventListener("input", (e) => { this[prop] = e.target.value; this.render(); });
    bind("task-search", "search"); bind("task-filter", "statusFilter");
    bind("task-priority", "priorityFilter"); bind("task-category", "categoryFilter");
    document.addEventListener("click", (e) => this.handleClick(e));
    document.addEventListener("change", (e) => {
      if (e.target.dataset.statusId) this.update(e.target.dataset.statusId, { status: e.target.value });
    });
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    document.getElementById("task-cancel").addEventListener("click", () => this.dialog.close());
    this.render();
  },

  // ---------- Datos ----------
  save() {
    DayflowStorage.set("tasks", this.tasks);
    this.render();
    document.dispatchEvent(new CustomEvent("dayflow:tasks-changed"));
  },
  update(id, changes) {
    this.tasks = this.tasks.map((t) => (t.id === id ? { ...t, ...changes } : t));
    this.save();
  },
  isOverdue(t) { return t.status !== "completed" && !!t.dueDate && t.dueDate < toISODate(new Date()); },

  // Orden: vencidas, luego fecha más próxima, luego sin fecha, y al final las completadas
  sortTasks(list) {
    const rank = (t) => (t.status === "completed" ? 3 : this.isOverdue(t) ? 0 : t.dueDate ? 1 : 2);
    const prio = { high: 0, medium: 1, low: 2 };
    return [...list].sort((a, b) => rank(a) - rank(b) || (a.dueDate || "").localeCompare(b.dueDate || "") || prio[a.priority] - prio[b.priority]);
  },
  visible() {
    const q = this.search.trim().toLowerCase();
    return this.sortTasks(this.tasks.filter((t) =>
      (!q || t.title.toLowerCase().includes(q)) &&
      (this.priorityFilter === "all" || t.priority === this.priorityFilter) &&
      (this.categoryFilter === "all" || t.category === this.categoryFilter) &&
      (this.statusFilter === "all" || (this.statusFilter === "overdue" ? this.isOverdue(t) : t.status === this.statusFilter))
    ));
  },

  // ---------- Pantalla ----------
  formatDate(iso) { return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }); },

  rowHTML(t, full = true) {
    const done = t.status === "completed", overdue = this.isOverdue(t), L = this.LABELS;
    const status = full
      ? `<select class="status-select" data-status-id="${t.id}" aria-label="Estado de ${esc(t.title)}">${["pending", "progress", "completed"].map((s) => `<option value="${s}" ${t.status === s ? "selected" : ""}>${L[s]}</option>`).join("")}</select>`
      : `<span class="chip">${L[t.status]}</span>`;
    return `<li class="task ${done ? "is-done" : ""} ${overdue ? "is-overdue" : ""}">
      <button class="check" data-action="toggle" data-id="${t.id}" aria-pressed="${done}" aria-label="${done ? "Marcar como pendiente" : "Marcar como completada"}"></button>
      <div class="task-body">
        <p class="task-title">${esc(t.title)}</p>
        ${full && t.description ? `<p class="task-desc">${esc(t.description)}</p>` : ""}
        <p class="task-meta">
          ${t.category ? `<span class="chip">${esc(t.category)}</span>` : ""}
          <span>${t.dueDate ? (overdue ? "Vencida: " : "") + this.formatDate(t.dueDate) : "Sin fecha"}</span>
          ${t.estimatedMinutes ? `<span>${t.estimatedMinutes} min</span>` : ""}
          <span class="prio prio-${t.priority}">${L[t.priority]}</span>
          ${full ? "" : status}
        </p>
      </div>
      ${full ? `<div class="task-actions">${status}
        <button class="link-btn" data-action="edit" data-id="${t.id}">Editar</button>
        <button class="link-btn danger" data-action="delete" data-id="${t.id}">Eliminar</button></div>` : ""}
    </li>`;
  },

  render() {
    const cats = [...new Set(this.tasks.map((t) => t.category).filter(Boolean))].sort();
    const sel = document.getElementById("task-category");
    if (this.categoryFilter !== "all" && !cats.includes(this.categoryFilter)) this.categoryFilter = "all";
    sel.innerHTML = `<option value="all">Toda categoría</option>` + cats.map((c) => `<option ${c === this.categoryFilter ? "selected" : ""}>${esc(c)}</option>`).join("");
    document.getElementById("category-options").innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join("");

    const list = this.visible(), empty = document.getElementById("task-empty");
    document.getElementById("task-list").innerHTML = list.map((t) => this.rowHTML(t)).join("");
    empty.hidden = list.length > 0;
    empty.innerHTML = this.tasks.length
      ? "<p>Ninguna tarea coincide con los filtros.</p><small>Prueba cambiando la búsqueda o el estado.</small>"
      : "<p>Aún no tienes tareas.</p><small>Pulsa “Nueva tarea” para crear la primera.</small>";
  },

  // ---------- Interacciones ----------
  handleClick(e) {
    const open = e.target.closest("[data-open-task]");
    if (open) return this.openForm(null, open.dataset.date);
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const task = this.tasks.find((t) => t.id === btn.dataset.id);
    if (!task) return;
    if (btn.dataset.action === "toggle") this.update(task.id, { status: task.status === "completed" ? "pending" : "completed" });
    if (btn.dataset.action === "edit") this.openForm(task.id);
    if (btn.dataset.action === "delete" && confirm(`¿Eliminar “${task.title}”? Esta acción no se puede deshacer.`)) {
      this.tasks = this.tasks.filter((t) => t.id !== task.id);
      this.save();
    }
  },

  openForm(id = null, presetDate = "") {
    this.editingId = id;
    this.form.reset();
    document.getElementById("task-error").textContent = "";
    document.getElementById("task-dialog-title").textContent = id ? "Editar tarea" : "Nueva tarea";
    const f = this.form.elements;
    if (id) {
      const t = this.tasks.find((x) => x.id === id);
      f.title.value = t.title; f.description.value = t.description || ""; f.category.value = t.category || "";
      f.dueDate.value = t.dueDate || ""; f.priority.value = t.priority; f.status.value = t.status;
      f.estimatedMinutes.value = t.estimatedMinutes || "";
    } else if (presetDate) f.dueDate.value = presetDate;
    this.dialog.showModal();
    f.title.focus();
  },

  validate(v) {
    if (!v.title) return "Escribe un título para la tarea.";
    if (v.dueDate) {
      const d = new Date(v.dueDate + "T00:00:00");
      if (isNaN(d) || d.getFullYear() < 2000 || d.getFullYear() > 2100) return "La fecha de entrega no es válida.";
    }
    if (v.estimatedMinutes !== null && (!Number.isInteger(v.estimatedMinutes) || v.estimatedMinutes < 1 || v.estimatedMinutes > 1440)) return "El tiempo estimado debe ser un número entero entre 1 y 1440.";
    const dup = this.tasks.some((t) => t.id !== this.editingId && t.status !== "completed" && t.title.toLowerCase() === v.title.toLowerCase() && (t.dueDate || "") === v.dueDate);
    return dup ? "Ya tienes una tarea pendiente con ese título y fecha." : "";
  },

  handleSubmit(e) {
    e.preventDefault();
    const f = this.form.elements;
    const values = {
      title: f.title.value.trim(), description: f.description.value.trim(), category: f.category.value.trim(),
      dueDate: f.dueDate.value, priority: f.priority.value, status: f.status.value,
      estimatedMinutes: f.estimatedMinutes.value ? Number(f.estimatedMinutes.value) : null
    };
    const error = this.validate(values);
    if (error) { document.getElementById("task-error").textContent = error; return; }
    if (this.editingId) this.update(this.editingId, values);
    else {
      this.tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), createdAt: toISODate(new Date()), ...values });
      this.save();
    }
    this.dialog.close();
  }
};