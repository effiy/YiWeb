/**
 * Markdown Plugin System
 * Manages plugin lifecycle and hooks
 */

export class PluginContext {
  constructor(options = {}) {
    this._options = options;
    this._state = {};
    this._hooks = {};
  }

  get options() {
    return this._options;
  }

  getState(key) {
    return this._state[key];
  }

  setState(key, value) {
    this._state[key] = value;
  }

  registerHook(name, fn) {
    if (!this._hooks[name]) {
      this._hooks[name] = [];
    }
    this._hooks[name].push(fn);
  }

  getHooks(name) {
    return this._hooks[name] || [];
  }
}

export class PluginManager {
  constructor() {
    this._plugins = [];
    this._context = null;
  }

  setContext(context) {
    this._context = context;
  }

  use(plugin, pluginOptions = {}) {
    if (!plugin || typeof plugin !== 'object') {
      throw new Error('Plugin must be an object');
    }
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a name property');
    }
    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a version property');
    }

    const pluginWithOptions = {
      ...plugin,
      priority: plugin.priority ?? 100,
      _pluginOptions: pluginOptions
    };

    this._plugins.push(pluginWithOptions);
    this._plugins.sort((a, b) => a.priority - b.priority);

    // Call onInit if available
    if (plugin.onInit && this._context) {
      plugin.onInit(this._context);
    }

    return this;
  }

  getPlugins() {
    return [...this._plugins];
  }

  async preprocess(markdown) {
    let result = markdown;
    for (const plugin of this._plugins) {
      if (plugin.preprocess && typeof plugin.preprocess === 'function') {
        result = plugin.preprocess(result);
      }
    }
    return result;
  }

  async postprocess(html) {
    let result = html;
    for (const plugin of this._plugins) {
      if (plugin.postprocess && typeof plugin.postprocess === 'function') {
        result = plugin.postprocess(result);
      }
    }
    return result;
  }

  extendRenderer(renderer) {
    for (const plugin of this._plugins) {
      if (plugin.extendRenderer && typeof plugin.extendRenderer === 'function') {
        plugin.extendRenderer(renderer);
      }
    }
  }

  onAfterRender(element) {
    for (const plugin of this._plugins) {
      if (plugin.onAfterRender && typeof plugin.onAfterRender === 'function') {
        plugin.onAfterRender(element);
      }
    }
  }
}
