/**
 * Mermaid - Preset Export
 * Contains commonly used plugins
 */

import { MermaidRenderer, createMermaidRenderer } from './core/index.js';
import { ToolbarPlugin } from './plugins/index.js';
import { FullscreenPlugin } from './plugins/index.js';
import { DownloadPlugin } from './plugins/index.js';
import { ClipboardPlugin } from './plugins/index.js';

export function createMermaidRendererWithPlugins(options = {}) {
  const renderer = createMermaidRenderer(options);
  renderer.use(ToolbarPlugin);
  renderer.use(FullscreenPlugin);
  renderer.use(DownloadPlugin);
  renderer.use(ClipboardPlugin);
  return renderer;
}

export { createMermaidRenderer };
export * from './core/index.js';
export * from './plugins/index.js';
