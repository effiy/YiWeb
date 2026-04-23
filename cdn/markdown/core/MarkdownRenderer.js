/**
 * Markdown Renderer
 * Core markdown rendering with plugin support
 */

import { PluginContext, PluginManager } from './PluginSystem.js';

export class MarkdownRenderer {
  constructor(options = {}) {
    this.options = {
      breaks: true,
      gfm: true,
      ...options
    };

    this._pluginContext = new PluginContext(this.options);
    this._pluginManager = new PluginManager();
    this._pluginManager.setContext(this._pluginContext);

    this._markedRenderer = null;
    this._interactionsBound = false;
  }

  use(plugin, pluginOptions = {}) {
    this._pluginManager.use(plugin, pluginOptions);
    return this;
  }

  _ensureMarkedRenderer() {
    if (this._markedRenderer) return this._markedRenderer;

    if (typeof window === 'undefined' || typeof window.marked === 'undefined') {
      return null;
    }

    try {
      const renderer = new window.marked.Renderer();
      this._pluginManager.extendRenderer(renderer);
      this._markedRenderer = renderer;
      return renderer;
    } catch (e) {
      console.warn('[MarkdownRenderer] Failed to create marked renderer:', e);
      return null;
    }
  }

  _ensureInteractions() {
    if (this._interactionsBound) return;
    this._interactionsBound = true;

    if (typeof window === 'undefined' || typeof window.document === 'undefined') return;

    // Global event delegation for interactions
    document.addEventListener('click', (e) => {
      const target = e?.target;
      if (!target || typeof target.closest !== 'function') return;

      // Accordion interactions
      const accordionTrigger = target.closest('.md-accordion-trigger');
      if (accordionTrigger) {
        const accordion = accordionTrigger.closest('.md-accordion');
        if (accordion) {
          const panel = accordion.querySelector('.md-accordion-panel');
          if (panel) {
            const isOpen = accordion.classList.contains('is-open');
            if (isOpen) {
              accordion.classList.remove('is-open');
              accordionTrigger.setAttribute('aria-expanded', 'false');
              panel.hidden = true;
            } else {
              accordion.classList.add('is-open');
              accordionTrigger.setAttribute('aria-expanded', 'true');
              panel.hidden = false;
            }
          }
        }
      }
    }, { passive: false });
  }

  async render(markdown, options = {}) {
    const raw = markdown ?? '';
    if (!raw) return '';

    const renderOptions = { ...this.options, ...options };

    // Preprocess
    let processed = await this._pluginManager.preprocess(raw);

    if (typeof window === 'undefined' || typeof window.marked === 'undefined') {
      // Fallback for server-side
      return processed.replace(/\n/g, '<br/>');
    }

    this._ensureMarkedRenderer();
    this._ensureInteractions();

    try {
      const breaks = renderOptions.breaks ?? true;
      const gfm = renderOptions.gfm ?? true;

      let rendered;
      if (typeof window.marked.parse === 'function') {
        rendered = window.marked.parse(processed, {
          renderer: this._markedRenderer || undefined,
          breaks,
          gfm
        });
      } else {
        rendered = window.marked(processed);
      }

      // Postprocess
      rendered = await this._pluginManager.postprocess(rendered);

      return rendered;
    } catch (e) {
      console.warn('[MarkdownRenderer] Render failed:', e);
      return processed.replace(/\n/g, '<br/>');
    }
  }

  renderAll(selector = '.md-view') {
    if (typeof window === 'undefined' || typeof window.document === 'undefined') return;

    const elements = document.querySelectorAll(selector);
    elements.forEach(async (element) => {
      const markdown = element.getAttribute('data-markdown') || '';
      if (markdown) {
        const html = await this.render(markdown);
        element.innerHTML = html;
        this._pluginManager.onAfterRender(element);
      }
    });
  }

  setOptions(options) {
    this.options = { ...this.options, ...options };
    this._pluginContext = new PluginContext(this.options);
    this._pluginManager.setContext(this._pluginContext);
  }
}
