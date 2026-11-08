// settings.js — preferencias del usuario. Otros módulos las leen con DayflowSettings.get().
const DayflowSettings = {
  DEFAULTS: { userName: "", timeFormat: "24", focusMin: 25, shortMin: 5, longMin: 15, longEvery: 4, notifications: false },

  get() { return { ...this.DEFAULTS, ...DayflowStorage.get("settings", {}) }; },

  formatTime(date) {
    return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: this.get().timeFormat === "12" });
  },

  init() {
    this.form = document.getElementById("settings-form");
    this.msg = document.getElementById("settings-msg");
    this.fill();
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));
  },

  fill() {
    const s = this.get(), f = this.form.elements;
    f.userName.value = s.userName; f.timeFormat.value = s.timeFormat;
    f.focusMin.value = s.focusMin; f.shortMin.value = s.shortMin; f.longMin.value = s.longMin; f.longEvery.value = s.longEvery;
    f.notifications.checked = s.notifications;
  },

  async handleSubmit(e) {
    e.preventDefault();
    const f = this.form.elements;
    const num = (el, min, max) => { const n = Number(el.value); return Number.isInteger(n) && n >= min && n <= max ? n : null; };
    const next = {
      userName: f.userName.value.trim(), timeFormat: f.timeFormat.value,
      focusMin: num(f.focusMin, 1, 180), shortMin: num(f.shortMin, 1, 60),
      longMin: num(f.longMin, 1, 90), longEvery: num(f.longEvery, 2, 10),
      notifications: f.notifications.checked
    };
    if (Object.values(next).includes(null)) { this.show("Revisa los tiempos: deben ser números enteros dentro del rango permitido.", true); return; }

    let note = "";
    if (next.notifications) {
      if (!("Notification" in window)) { next.notifications = false; note = " Tu navegador no admite notificaciones."; }
      else if (Notification.permission === "default") await Notification.requestPermission();
      if (next.notifications && Notification.permission !== "granted") { next.notifications = false; note = " El navegador bloqueó las notificaciones; puedes permitirlas en los ajustes del sitio."; }
    }
    DayflowStorage.set("settings", next);
    this.fill();
    document.dispatchEvent(new CustomEvent("dayflow:settings-changed"));
    this.show("Cambios guardados." + note, false);
  },

  show(text, isError) { this.msg.textContent = text; this.msg.style.color = isError ? "" : "var(--lavender-deep)"; }
};