// navigation.js — cambia de sección sin recargar la página y controla el menú móvil.
const DayflowNavigation = {
  init() {
    this.sidebar = document.getElementById("sidebar");
    this.scrim = document.getElementById("scrim");
    this.toggle = document.getElementById("menu-toggle");

    // Cualquier elemento con data-section funciona como enlace de navegación
    document.querySelectorAll("[data-section]").forEach((el) => {
      el.addEventListener("click", () => this.show(el.dataset.section));
    });
    this.toggle.addEventListener("click", () => this.setMenu(!this.sidebar.classList.contains("is-open")));
    this.scrim.addEventListener("click", () => this.setMenu(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") this.setMenu(false); });
  },

  show(sectionId) {
    document.querySelectorAll(".view").forEach((view) => { view.hidden = view.id !== sectionId; });
    document.querySelectorAll(".nav-link").forEach((link) => {
      const active = link.dataset.section === sectionId;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    this.setMenu(false);
    window.scrollTo(0, 0);
  },

  setMenu(open) {
    this.sidebar.classList.toggle("is-open", open);
    this.scrim.hidden = !open;
    this.toggle.setAttribute("aria-expanded", String(open));
  }
};