/**
 * 统一 Mermaid 全局版本
 * author: liangliang
 * 说明：兼容旧项目的全局变量版本（UMD）
 * 使用方法：<script src="shared/mermaid/global.js"></script>
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UnifiedMermaid = factory();
  }
}(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  // ============================================
  // 配置模块
  // ============================================
  const MERMAID_CONFIG = {
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'dark',
    themeVariables: {
      primaryTextColor: '#ffffff',
      primaryColor: '#4f46e5',
      primaryBorderColor: '#6366f1',
      lineColor: '#e5e7eb',
      sectionBkgColor: '#1e293b',
      altSectionBkgColor: '#334155',
      gridColor: '#374151',
      secondaryColor: '#7c3aed',
      tertiaryColor: '#a855f7',
      background: '#0f172a',
      mainBkg: '#1e293b',
      secondBkg: '#334155',
      tertiaryBkg: '#475569'
    },
    fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: 14,
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: 'basis',
      wrap: false
    },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
      mirrorActors: true,
      bottomMarginAdj: 1,
      useMaxWidth: false,
      rightAngles: false,
      showSequenceNumbers: false,
      wrap: false
    },
    gantt: {
      titleTopMargin: 25,
      barHeight: 20,
      fontSize: 11,
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      sectionFontSize: 11,
      numberSectionStyles: 4,
      useMaxWidth: false
    },
    gitgraph: {
      mainBranchName: 'main',
      showCommitLabel: true,
      showBranches: true,
      rotateCommitLabel: false
    },
    c4c: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      c4ShapeMargin: 50,
      c4ShapeInRow: 4,
      width: 216,
      height: 60,
      boxMargin: 10,
      c4ShapeTextMargin: 5,
      c4BoundaryInRow: 2,
      personFontSize: 14,
      personFontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      personFontWeight: 'normal',
      external_personFontSize: 14,
      external_personFontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      external_personFontWeight: 'normal'
    }
  };

  const VALID_DIAGRAM_TYPES = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
    'stateDiagram', 'stateDiagram-v2', 'gantt', 'pie',
    'gitgraph', 'erDiagram', 'journey', 'requirementDiagram',
    'c4Context', 'mindmap', 'timeline', 'sankey', 'xychart'
  ];

  function getMermaidConfig(customConfig = {}) {
    return {
      ...MERMAID_CONFIG,
      ...customConfig,
      themeVariables: {
        ...MERMAID_CONFIG.themeVariables,
        ...(customConfig.themeVariables || {})
      }
    };
  }

  // ============================================
  // 工具函数
  // ============================================
  function escapeHtml(str) {
    if (typeof str !== 'string' && str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeJs(str) {
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  // ============================================
  // UI 模块
  // ============================================
  const MermaidUi = {
    showToast: function(message, type) {
      type = type || 'info';
      if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
      }

      const existing = document.querySelector('.mermaid-toast');
      if (existing) existing.remove();

      const colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
      const toast = document.createElement('div');
      toast.className = 'mermaid-toast';
      toast.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: #1e293b; border: 1px solid rgba(255,255,255,0.12);
        padding: 12px 20px; border-radius: 12px; display: flex; align-items: center; gap: 10px;
        color: #f8fafc; font-size: 14px; z-index: 2147483649;
        animation: mermaid-toast-in 0.3s ease; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      `;
      toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
      document.body.appendChild(toast);

      setTimeout(() => toast.remove(), 3000);
    },

    getSvgFromContainer: function(diagramId) {
      const container = document.getElementById(diagramId);
      return container ? container.querySelector('svg') : null;
    },

    getCodeFromContainer: function(diagramId) {
      const container = document.getElementById(diagramId);
      return container ? container.getAttribute('data-mermaid-code') : null;
    },

    copyCode: async function(diagramId) {
      const code = this.getCodeFromContainer(diagramId);
      if (!code) {
        this.showToast('未找到图表代码', 'error');
        return;
      }
      try {
        await navigator.clipboard.writeText(code);
        this.showToast('代码已复制', 'success');
      } catch (e) {
        this.showToast('复制失败', 'error');
      }
    },

    downloadSvg: function(diagramId) {
      const svg = this.getSvgFromContainer(diagramId);
      if (!svg) {
        this.showToast('未找到图表', 'error');
        return;
      }
      try {
        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mermaid-diagram-${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.showToast('SVG 已下载', 'success');
      } catch (e) {
        this.showToast('下载失败', 'error');
      }
    },

    downloadPng: function(diagramId, scale) {
      const svg = this.getSvgFromContainer(diagramId);
      if (!svg) {
        this.showToast('未找到图表', 'error');
        return;
      }
      scale = scale || 2;

      try {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        img.onload = () => {
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((pngBlob) => {
            const pngUrl = URL.createObjectURL(pngBlob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `mermaid-diagram-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(pngUrl);
            URL.revokeObjectURL(url);
            this.showToast('PNG 已下载', 'success');
          }, 'image/png');
        };
        img.src = url;
      } catch (e) {
        this.showToast('下载失败', 'error');
      }
    },

    fullscreen: function(diagramId) {
      const svg = this.getSvgFromContainer(diagramId);
      if (!svg) {
        this.showToast('未找到图表', 'error');
        return;
      }
      this.openFullscreen(svg.outerHTML);
    },

    openFullscreen: function(svgContent) {
      this.closeFullscreen();
      const overlay = document.createElement('div');
      overlay.id = 'mermaid-fullscreen-overlay';
      overlay.innerHTML = `
        <div style="
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.9); z-index: 2147483649;
          display: flex; flex-direction: column; padding: 24px;
        ">
          <div style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 24px; background: #1e293b; border-radius: 12px 12px 0 0;
          ">
            <h3 style="margin: 0; color: #f8fafc; font-size: 16px;">Mermaid 图表</h3>
            <button onclick="UnifiedMermaid.Ui.closeFullscreen()" style="
              background: transparent; border: none; color: #94a3b8; cursor: pointer;
              padding: 8px; border-radius: 8px;
            ">✕</button>
          </div>
          <div style="
            flex: 1; overflow: auto; background: #0f172a;
            display: flex; align-items: center; justify-content: center; padding: 24px;
          ">
            <div style="background: #0f172a; padding: 24px; border-radius: 12px;">
              ${svgContent}
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay.firstElementChild);
    },

    closeFullscreen: function() {
      const el = document.getElementById('mermaid-fullscreen-overlay');
      if (el) el.remove();
    }
  };

  // ============================================
  // 渲染器模块
  // ============================================
  const MermaidRenderer = {
    isInitialized: false,
    config: { ...MERMAID_CONFIG },

    initialize: function(customConfig) {
      if (this.isInitialized) return true;
      if (typeof mermaid === 'undefined') {
        console.warn('[UnifiedMermaid] Mermaid.js 未加载');
        return false;
      }

      try {
        const finalConfig = getMermaidConfig(customConfig || {});
        mermaid.initialize(finalConfig);
        this.isInitialized = true;
        console.log('[UnifiedMermaid] 初始化成功');
        return true;
      } catch (e) {
        console.error('[UnifiedMermaid] 初始化失败:', e);
        return false;
      }
    },

    validateCode: function(code) {
      if (!code || typeof code !== 'string') {
        return { valid: false, error: '代码为空' };
      }
      const cleanCode = code.trim();
      if (!cleanCode) {
        return { valid: false, error: '代码为空' };
      }

      const lines = cleanCode.split('\n');
      let firstLine = '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('%%')) continue;
        firstLine = trimmed;
        break;
      }

      const matchedType = VALID_DIAGRAM_TYPES.find(t => firstLine.startsWith(t));
      if (!matchedType) {
        return {
          valid: false,
          error: `第一行不是有效的 Mermaid 图表类型: ${firstLine}`
        };
      }

      return { valid: true, type: matchedType, code: cleanCode };
    },

    adjustMermaidSize: function(mermaidDiv) {
      if (!mermaidDiv) return;
      const svg = mermaidDiv.querySelector('svg');
      if (!svg) return;

      try {
        const parent = mermaidDiv.parentElement;
        let maxWidth = parent ? parent.clientWidth - 32 : window.innerWidth - 100;
        maxWidth = Math.max(maxWidth, 100);

        let svgWidth, svgHeight;
        const widthAttr = svg.getAttribute('width');
        const heightAttr = svg.getAttribute('height');
        const viewBox = svg.getAttribute('viewBox');

        if (widthAttr && heightAttr) {
          svgWidth = parseFloat(widthAttr);
          svgHeight = parseFloat(heightAttr);
        } else if (viewBox) {
          const parts = viewBox.split(/\s+/);
          if (parts.length >= 4) {
            svgWidth = parseFloat(parts[2]);
            svgHeight = parseFloat(parts[3]);
          }
        }

        if (svgWidth && svgHeight) {
          if (!viewBox) {
            svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
          }
          if (svgWidth > maxWidth) {
            const scale = maxWidth / svgWidth;
            svgWidth = maxWidth;
            svgHeight = svgHeight * scale;
          }
          svg.setAttribute('width', svgWidth);
          svg.setAttribute('height', svgHeight);
          mermaidDiv.style.maxWidth = '100%';
        }
      } catch (e) {
        console.warn('[UnifiedMermaid] 尺寸调整失败', e);
      }
    },

    renderDiagram: async function(diagramId, code, options) {
      options = options || {};
      if (!this.isInitialized) {
        this.initialize();
      }

      const diagram = document.getElementById(diagramId);
      if (!diagram) {
        console.warn('[UnifiedMermaid] 未找到元素:', diagramId);
        return;
      }

      if (diagram.hasAttribute('data-mermaid-rendered')) {
        return;
      }

      const validation = this.validateCode(code);
      if (!validation.valid) {
        diagram.innerHTML = `
          <div style="padding: 16px; color: #ef4444; background: #1e293b; border-radius: 8px;">
            <strong>渲染失败:</strong> ${escapeHtml(validation.error)}
          </div>
        `;
        return;
      }

      try {
        const renderId = `mermaid-svg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(renderId, validation.code);

        diagram.innerHTML = svg;
        diagram.setAttribute('data-mermaid-rendered', 'true');
        diagram.setAttribute('data-mermaid-code', escapeHtml(code));

        const adjustSize = () => this.adjustMermaidSize(diagram);
        requestAnimationFrame(adjustSize);
        setTimeout(adjustSize, 100);
        setTimeout(adjustSize, 500);
      } catch (e) {
        console.error('[UnifiedMermaid] 渲染失败:', e);
        diagram.innerHTML = `
          <div style="padding: 16px; color: #ef4444; background: #1e293b; border-radius: 8px;">
            <strong>渲染失败:</strong> ${escapeHtml(e.message || e.toString())}
          </div>
        `;
      }
    },

    retryRender: function(diagramId, code) {
      const diagram = document.getElementById(diagramId);
      if (diagram) {
        diagram.removeAttribute('data-mermaid-rendered');
      }
      this.renderDiagram(diagramId, code);
    },

    updateConfig: function(newConfig) {
      this.config = getMermaidConfig(newConfig);
      if (this.isInitialized && typeof mermaid !== 'undefined') {
        mermaid.initialize(this.config);
      }
    }
  };

  // ============================================
  // 初始化函数
  // ============================================
  function init(options) {
    options = options || {};

    const renderer = Object.create(MermaidRenderer);
    const ui = Object.create(MermaidUi);

    if (typeof window !== 'undefined') {
      window.UnifiedMermaid = {
        Config: MERMAID_CONFIG,
        Renderer: renderer,
        Ui: ui,
        init,
        escapeHtml,
        escapeJs
      };

      // 兼容旧的全局变量
      window.mermaidRenderer = renderer;
      window.mermaidUi = ui;

      // 兼容旧的初始化函数
      window.initMermaid = function(config) {
        return renderer.initialize(config);
      };
      window.renderMermaidDiagram = function(diagramId, code, callback) {
        return renderer.renderDiagram(diagramId, code);
      };
    }

    if (options.autoInit !== false) {
      setTimeout(() => renderer.initialize(), 0);
    }

    return {
      Config: MERMAID_CONFIG,
      Renderer: renderer,
      Ui: ui
    };
  }

  // ============================================
  // 导出
  // ============================================
  return {
    Config: MERMAID_CONFIG,
    Renderer: MermaidRenderer,
    Ui: MermaidUi,
    init,
    escapeHtml,
    escapeJs,
    getMermaidConfig,
    VALID_DIAGRAM_TYPES
  };
}));

// 自动初始化
if (typeof window !== 'undefined') {
  window.UnifiedMermaid = window.UnifiedMermaid || {};
  if (window.UnifiedMermaid.autoInit !== false) {
    document.addEventListener('DOMContentLoaded', function() {
      if (window.UnifiedMermaid && window.UnifiedMermaid.init) {
        window.UnifiedMermaid.init();
      }
    });
  }
}
