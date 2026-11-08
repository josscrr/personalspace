// music.js — playlists por enlace. Solo se aceptan enlaces https de Spotify y Apple Music,
// y el reproductor se construye a partir de partes ya validadas (nunca se pega el texto del usuario como HTML).
// Aquí NO hay inicio de sesión: no se guardan credenciales ni claves.
const DayflowMusic = {
  init() {
    this.form = document.getElementById("music-form");
    this.form.addEventListener("submit", (e) => this.add(e));
    document.getElementById("music-list").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-music]");
      if (!btn) return;
      if (btn.dataset.music === "remove" && confirm("¿Quitar esta playlist de Dayflow?")) {
        DayflowStorage.set("playlists", this.list().filter((p) => p.id !== btn.dataset.id));
        document.getElementById("music-player").innerHTML = "";
        this.render();
      }
      if (btn.dataset.music === "play") this.play(this.list().find((p) => p.id === btn.dataset.id));
    });
    this.render();
  },
  list() { return DayflowStorage.get("playlists", []); },

  parse(raw) {
    let u;
    try { u = new URL(raw.trim()); } catch { return null; }
    if (u.protocol !== "https:") return null;
    if (u.hostname === "open.spotify.com") {
      const m = u.pathname.match(/^(?:\/intl-[a-z]{2})?\/(playlist|album)\/([A-Za-z0-9]{22})$/);
      if (m) return { service: "spotify", url: `https://open.spotify.com/${m[1]}/${m[2]}`, embed: `https://open.spotify.com/embed/${m[1]}/${m[2]}` };
    }
    if (u.hostname === "music.apple.com") {
      const m = u.pathname.match(/^\/[a-z]{2}\/(playlist|album)\/[^/]+\/[A-Za-z0-9._-]+$/);
      if (m) return { service: "apple", url: `https://music.apple.com${u.pathname}`, embed: `https://embed.music.apple.com${u.pathname}` };
    }
    return null;
  },

  add(e) {
    e.preventDefault();
    const err = document.getElementById("music-error"), input = document.getElementById("music-url");
    const parsed = this.parse(input.value);
    if (!parsed) { err.textContent = "Ese enlace no es de una playlist o álbum de Spotify o Apple Music."; return; }
    if (this.list().some((p) => p.url === parsed.url)) { err.textContent = "Ya guardaste esa playlist."; return; }
    const name = document.getElementById("music-name").value.trim() || (parsed.service === "spotify" ? "Playlist de Spotify" : "Playlist de Apple Music");
    DayflowStorage.set("playlists", [...this.list(), { id: Date.now().toString(36), name, ...parsed }]);
    err.textContent = ""; this.form.reset(); this.render();
  },

  play(p) {
    if (!p) return;
    const box = document.getElementById("music-player");
    const frame = document.createElement("iframe");
    frame.src = p.embed; frame.title = p.name; frame.loading = "lazy";
    frame.allow = "autoplay; encrypted-media; clipboard-write";
    frame.height = p.service === "spotify" ? "352" : "450";
    box.replaceChildren(frame);
    frame.scrollIntoView({ behavior: "smooth", block: "nearest" });
  },

  render() {
    const items = this.list();
    document.getElementById("music-empty").hidden = items.length > 0;
    document.getElementById("music-list").innerHTML = items.map((p) => `<li class="task"><div class="task-body">
      <p class="task-title">${esc(p.name)}</p><p class="task-meta"><span class="chip">${p.service === "spotify" ? "Spotify" : "Apple Music"}</span></p></div>
      <div class="task-actions"><button class="link-btn" data-music="play" data-id="${p.id}">Escuchar</button>
      <a class="link-btn" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Abrir</a>
      <button class="link-btn danger" data-music="remove" data-id="${p.id}">Quitar</button></div></li>`).join("");
  }
};