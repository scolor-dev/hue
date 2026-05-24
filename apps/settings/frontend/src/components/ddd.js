// ============================================================
// JavaScript Utility Collection
// Purpose:
//   - Plugin runtime helpers
//   - Event system
//   - State store
//   - Async task queue
//   - String utilities
//   - Path utilities
//   - Theme helpers
//   - Command registry
// ============================================================

export class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event).push(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    const listeners = this.events.get(event);

    if (!listeners) {
      return;
    }

    const index = listeners.indexOf(listener);

    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  emit(event, payload) {
    const listeners = this.events.get(event);

    if (!listeners) {
      return;
    }

    for (const listener of listeners) {
      listener(payload);
    }
  }

  clear() {
    this.events.clear();
  }
}

export class StateStore {
  constructor(initialState = {}) {
    this.state = structuredClone(initialState);
    this.emitter = new EventEmitter();
  }

  getState() {
    return structuredClone(this.state);
  }

  set(key, value) {
    this.state[key] = value;

    this.emitter.emit("change", {
      key,
      value,
      state: this.getState(),
    });
  }

  get(key) {
    return this.state[key];
  }

  subscribe(listener) {
    return this.emitter.on("change", listener);
  }
}

export class TaskQueue {
  constructor() {
    this.queue = [];
    this.running = false;
  }

  add(task) {
    this.queue.push(task);
    this.run();
  }

  async run() {
    if (this.running) {
      return;
    }

    this.running = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();

      try {
        await task();
      } catch (error) {
        console.error("TaskQueue Error:", error);
      }
    }

    this.running = false;
  }
}

export const StringUtils = {
  capitalize(value) {
    if (!value) {
      return "";
    }

    return value[0].toUpperCase() + value.slice(1);
  },

  kebabCase(value) {
    return value
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/\s+/g, "-")
      .toLowerCase();
  },

  camelCase(value) {
    return value.replace(/[-_](.)/g, (_, char) => char.toUpperCase());
  },

  pad(value, length = 2) {
    return String(value).padStart(length, "0");
  },

  randomId(prefix = "id") {
    const random = Math.random().toString(36).slice(2);
    return `${prefix}-${random}`;
  },
};

export const PathUtils = {
  normalize(path) {
    return path.replace(/\\/g, "/");
  },

  join(...parts) {
    return this.normalize(parts.join("/"))
      .replace(/\/+/g, "/")
      .replace(/:\//, "://");
  },

  dirname(path) {
    const normalized = this.normalize(path);
    return normalized.split("/").slice(0, -1).join("/");
  },

  basename(path) {
    const normalized = this.normalize(path);
    return normalized.split("/").pop();
  },

  extname(path) {
    const file = this.basename(path);
    const index = file.lastIndexOf(".");

    if (index === -1) {
      return "";
    }

    return file.slice(index);
  },
};

export const ThemeUtils = {
  darkTheme() {
    return {
      background: "#0f1115",
      surface: "#181b22",
      border: "#2a3040",
      text: "#f5f7ff",
      accent: "#7c9dff",
    };
  },

  lightTheme() {
    return {
      background: "#ffffff",
      surface: "#f5f7fa",
      border: "#d8dde8",
      text: "#0f1115",
      accent: "#4b67ff",
    };
  },

  applyTheme(theme) {
    const root = document.documentElement;

    for (const [key, value] of Object.entries(theme)) {
      root.style.setProperty(`--${key}`, value);
    }
  },
};

export class CommandRegistry {
  constructor() {
    this.commands = new Map();
  }

  register(name, handler, description = "") {
    this.commands.set(name, {
      name,
      handler,
      description,
    });
  }

  async execute(name, ...args) {
    const command = this.commands.get(name);

    if (!command) {
      throw new Error(`Unknown command: ${name}`);
    }

    return await command.handler(...args);
  }

  list() {
    return [...this.commands.values()];
  }
}

export function createLogger(namespace = "app") {
  return {
    info(...args) {
      console.info(`[${namespace}]`, ...args);
    },

    warn(...args) {
      console.warn(`[${namespace}]`, ...args);
    },

    error(...args) {
      console.error(`[${namespace}]`, ...args);
    },

    debug(...args) {
      console.debug(`[${namespace}]`, ...args);
    },
  };
}

export async function sleep(ms = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retry(task, options = {}) {
  const {
    retries = 3,
    delay = 250,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

export function createPluginManifest(data = {}) {
  return {
    name: data.name ?? "plugin",
    version: data.version ?? "0.0.1",
    author: data.author ?? "unknown",
    description: data.description ?? "",
    entry: data.entry ?? "index.js",
    permissions: data.permissions ?? [],
    apiVersion: data.apiVersion ?? 1,
  };
}

export const RuntimeConstants = {
  APP_NAME: "Hue",
  ENGINE_NAME: "Primo",
  DEFAULT_FONT_SIZE: 14,
  DEFAULT_TAB_WIDTH: 2,
  DEFAULT_ENCODING: "utf-8",
  MAX_HISTORY_ITEMS: 100,
  MAX_RECENT_PROJECTS: 25,
};

export default {
  EventEmitter,
  StateStore,
  TaskQueue,
  StringUtils,
  PathUtils,
  ThemeUtils,
  CommandRegistry,
  createLogger,
  sleep,
  retry,
  createPluginManifest,
  RuntimeConstants,
};
