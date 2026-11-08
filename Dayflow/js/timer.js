// timer.js — temporizador. No cuenta "restando 1 cada segundo": guarda la HORA EXACTA en que termina
// (endsAt) y en cada latido calcula endsAt - ahora. Así es correcto aunque la pestaña esté en segundo plano
// o el usuario cambie de sección, y el estado se guarda para sobrevivir a una recarga.
const DayflowTimer = {
  state: null, message: "", RING: 2 * Math.PI * 90,

  fresh() {
    const ms = DayflowSettings.get().focusMin * 60000;
    return { mode: "focus", status: "idle", durationMs: ms, remainingMs: ms, endsAt: null, taskId: "", pomodoro: false, cycle: 1 };
  },
  durationFor(mode) {
    const s = DayflowSettings.get();
    return (mode === "focus" ? s.focusMin : mode === "short" ? s.shortMin : s.longMin) * 60000;
  },
  fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  },
  $(id) { return document.getElementById(id); },

  init() {
    this.state = { ...this.fresh(), ...DayflowStorage.get("timer", {}) };
    this.$("ring-fg").style.strokeDasharray = this.RING;
    this.$("f-start").addEventListener("click", () => this.start());
    this.$("f-pause").addEventListener("click", () => this.pause());
    this.$("f-reset").addEventListener("click", () => this.reset());
    this.$("f-finish").addEventListener("click", () => this.finish());
    document.querySelectorAll(".presets [data-min]").forEach((b) => b.addEventListener("click", () => this.setDuration(Number(b.dataset.min))));
    this.$("f-custom-set").addEventListener("click", () => {
      const n = Number(this.$("f-custom").value);
      if (!Number.isInteger(n) || n < 1 || n > 240) { this.message = "Escribe una duración entera entre 1 y 240 minutos."; this.render(); return; }
      this.setDuration(n);
    });
    this.$("f-pomodoro").addEventListener("change", (e) => {
      this.state.pomodoro = e.target.checked; this.state.mode = "focus"; this.state.cycle = 1;
      this.setDuration(this.durationFor("focus") / 60000);
    });
    this.$("f-task").addEventListener("change", (e) => { this.state.taskId = e.target.value; this.save(); });
    document.addEventListener("dayflow:tasks-changed", () => this.renderTasks());
    document.addEventListener("dayflow:settings-changed", () => {
      if (this.state.status === "idle" && this.state.pomodoro) this.setDuration(this.durationFor(this.state.mode) / 60000);
      this.renderLog();
    });
    this.renderTasks(); this.renderLog();
    this.render();
    setInterval(() => this.tick(), 250);
  },

  save() { DayflowStorage.set("timer", this.state); },

  tick() {
    const s = this.state;
    if (s.status === "running") {
      s.remainingMs = s.endsAt - Date.now();
      if (s.remainingMs <= 0) this.complete();
    }
    this.render();
  },

  start() {
    const s = this.state;
    if (s.status === "running") return;
    s.endsAt = Date.now() + s.remainingMs; s.status = "running"; this.message = "";
    this.save(); this.render();
  },
  pause() {
    const s = this.state;
    if (s.status !== "running") return;
    s.remainingMs = Math.max(0, s.endsAt - Date.now()); s.status = "paused"; s.endsAt = null;
    this.save(); this.render();
  },
  reset() {
    const s = this.state;
    s.status = "idle"; s.endsAt = null; s.remainingMs = s.durationMs; this.message = "";
    this.save(); this.render();
  },
  finish() {
    const s = this.state;
    if (s.status === "idle") return;
    const elapsed = s.durationMs - (s.status === "running" ? s.endsAt - Date.now() : s.remainingMs);
    if (s.mode === "focus" && elapsed >= 60000) { this.logSession(elapsed, true); this.message = "Sesión finalizada y registrada."; }
    else this.message = "Sesión finalizada.";
    s.status = "idle"; s.endsAt = null; s.remainingMs = s.durationMs;
    this.save(); this.render();
  },
  setDuration(min) {
    const s = this.state;
    if (s.status !== "idle") return;
    s.durationMs = s.remainingMs = min * 60000; this.message = "";
    this.save(); this.render();
  },

  complete() {
    const s = this.state, finished = s.mode, cfg = DayflowSettings.get();
    if (finished === "focus") this.logSession(s.durationMs, false);
    this.notify(finished === "focus" ? "¡Sesión de concentración completada!" : "El descanso terminó. ¿Listo para continuar?");
    if (s.pomodoro) {
      if (finished === "focus") s.mode = s.cycle >= cfg.longEvery ? "long" : "short";
      else { s.cycle = finished === "long" ? 1 : s.cycle + 1; s.mode = "focus"; }
      s.durationMs = this.durationFor(s.mode);
    }
    s.status = "idle"; s.endsAt = null; s.remainingMs = s.durationMs;
    this.message = finished === "focus" ? "¡Sesión completada! Buen trabajo." : "Descanso terminado.";
    this.save();
  },

  notify(text) {
    if (DayflowSettings.get().notifications && "Notification" in window && Notification.permission === "granted") new Notification("Dayflow", { body: text });
  },

  logSession(ms, early) {
    const task = DayflowTasks.tasks.find((t) => t.id === this.state.taskId);
    const now = new Date();
    const sessions = DayflowStorage.get("sessions", []);
    sessions.push({ id: now.getTime().toString(36), date: toISODate(now), endedAt: now.toISOString(), minutes: Math.max(1, Math.round(ms / 60000)), early, taskTitle: task ? task.title : "" });
    DayflowStorage.set("sessions", sessions.slice(-200));
    this.renderLog();
  },

  render() {
    const s = this.state, cfg = DayflowSettings.get();
    this.$("focus-time").textContent = this.fmt(s.remainingMs);
    this.$("ring-fg").style.strokeDashoffset = this.RING * (s.durationMs ? Math.min(1, Math.max(0, s.remainingMs / s.durationMs)) : 0);
    document.title = s.status === "running" ? `${this.fmt(s.remainingMs)} · Dayflow` : "Dayflow";
    this.$("focus-mode").textContent = !s.pomodoro ? "Concentración" : s.mode === "focus" ? `Concentración: sesión ${s.cycle} de ${cfg.longEvery}` : s.mode === "short" ? "Descanso corto" : "Descanso largo";
    this.$("focus-status").textContent = this.message || { idle: "Listo para empezar.", running: "En marcha.", paused: "En pausa." }[s.status];
    this.$("f-start").textContent = s.status === "paused" ? "Reanudar" : "Iniciar";
    this.$("f-start").disabled = s.status === "running";
    this.$("f-pause").disabled = s.status !== "running";
    this.$("f-reset").disabled = s.status === "idle" && s.remainingMs === s.durationMs;
    this.$("f-finish").disabled = s.status === "idle";
    const locked = s.status !== "idle";
    this.$("f-pomodoro").checked = s.pomodoro; this.$("f-pomodoro").disabled = locked;
    this.$("f-custom").disabled = locked || s.pomodoro; this.$("f-custom-set").disabled = locked || s.pomodoro;
    document.querySelectorAll(".presets [data-min]").forEach((b) => {
      b.disabled = locked || s.pomodoro;
      b.classList.toggle("is-active", Number(b.dataset.min) * 60000 === s.durationMs);
    });
  },

  renderTasks() {
    const sel = this.$("f-task"), open = DayflowTasks.tasks.filter((t) => t.status !== "completed");
    if (this.state.taskId && !open.some((t) => t.id === this.state.taskId)) this.state.taskId = "";
    sel.innerHTML = `<option value="">Sin tarea asociada</option>` + open.map((t) => `<option value="${t.id}" ${t.id === this.state.taskId ? "selected" : ""}>${esc(t.title)}</option>`).join("");
  },

  renderLog() {
    const sessions = DayflowStorage.get("sessions", []), today = toISODate(new Date());
    const minutes = sessions.filter((x) => x.date === today).reduce((sum, x) => sum + x.minutes, 0);
    this.$("f-total").textContent = `Hoy: ${minutes} min de concentración`;
    const recent = sessions.slice(-8).reverse();
    this.$("f-log-empty").hidden = recent.length > 0;
    this.$("f-log").innerHTML = recent.map((x) => `<li class="task"><div class="task-body">
      <p class="task-title">${x.minutes} min${x.early ? " (finalizada antes)" : ""}</p>
      <p class="task-meta"><span>${DayflowTasks.formatDate(x.date)}, ${DayflowSettings.formatTime(new Date(x.endedAt))}</span>${x.taskTitle ? `<span class="chip">${esc(x.taskTitle)}</span>` : ""}</p></div></li>`).join("");
  }
};