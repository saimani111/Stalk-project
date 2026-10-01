const listeners = new Set();
let nextId = 0;

export const toast = {
  push(message, type = "info") {
    const entry = { id: ++nextId, message, type };
    listeners.forEach((fn) => fn(entry));
  },
  success(message) {
    this.push(message, "success");
  },
  error(message) {
    this.push(message, "error");
  },
  info(message) {
    this.push(message, "info");
  },
};

export const subscribeToasts = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
