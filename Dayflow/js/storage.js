// storage.js — único lugar que habla con localStorage.
// Si algún día usamos una base de datos, solo se cambia este archivo.
const DayflowStorage = {
  PREFIX: "dayflow:",

  get(key, fallback) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      console.error("No se pudo leer", key, error);
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("No se pudo guardar", key, error);
      return false;
    }
  },

  remove(key) {
    try { localStorage.removeItem(this.PREFIX + key); }
    catch (error) { console.error("No se pudo borrar", key, error); }
  }
};