/**
 * 统一 Mermaid 渲染器
 * author: liangliang
 * 说明：提供统一的 Mermaid 图表渲染功能
 */

import {
  getMermaidConfig,
  VALID_DIAGRAM_TYPES,
  updateThemeFromCSS
} from './config.js';

/**
 * Mermaid 渲染管理器类
 */
export class MermaidRenderer {
  constructor(options = {}) {
    this.isInitialized = false;
    this.renderQueue = [];
    this.debugMode = options.debugMode || false;
    this.options = {
      autoAdjustSize: true,
      showLoading: true,
      showErrorDetails: true,
      enableRetry: true,
      maxRetries: 2,
      ...options
    };
    this.config = getMermaidConfig(options.config || {});
    this._stats = {
      total: 0,
      rendered: 0,
      errors: 0,
      retries: 0
    };
  }

  /**
   * 初始化 Mermaid
   */
  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    if (typeof mermaid === 'undefined') {
      console.warn('[MermaidRenderer] Mermaid.js 未加载');
      return false;
    }

    try {
      // 尝试从 CSS 变量更新主题
      const cssTheme = updateThemeFromCSS();
      if (cssTheme.themeVariables) {
        this.config.themeVariables = {
          ...this.config.themeVariables,
          ...cssTheme.themeVariables
        };
      }

      mermaid.initialize(this.config);
      this.isInitialized = true;
      this.log('初始化成功');

      // 处理队列中的渲染任务
      this.processRenderQueue();
      return true;
    } catch (error) {
      console.error('[MermaidRenderer] 初始化失败:', error);
      return false;
    }
  }

  /**
   * 记录日志
   */
  log(...args) {
    if (this.debugMode) {
      console.log('[MermaidRenderer]', ...args);
    }
  }

  /**
   * 处理渲染队列
   */
  processRenderQueue() {
    if (this.renderQueue.length === 0) return;

    this.log(`处理 ${this.renderQueue.length} 个队列中的渲染任务`);

    const tasks = [...this.renderQueue];
    this.renderQueue = [];

    tasks.forEach(task => {
      this.renderDiagram(task.diagramId, task.code, task.options);
    });
  }

  /**
   * 验证 Mermaid 代码
   */
  validateCode(code) {
    if (!code || typeof code !== 'string') {
      return {
        valid: false,
        error: '代码为空或不是字符串'
      };
    }

    const cleanCode = code.trim();
    if (!cleanCode) {
      return {
        valid: false,
        error: '代码为空（去除空白后）'
      };
    }

    // 检查第一条有效语句是否是有效的 Mermaid 语法
    const lines = cleanCode.split('\n');
    let firstLine = '';
    for (const rawLine of lines) {
      const line = String(rawLine || '').trim();
      if (!line) continue;
      if (line.startsWith('%%')) continue;
      firstLine = line;
      break;
    }

    if (!firstLine) {
      return {
        valid: false,
        error: '代码为空（仅包含空白或注释）'
      };
    }

    const matchedType = VALID_DIAGRAM_TYPES.find(type =>
      firstLine.startsWith(type)
    );

    if (!matchedType) {
      return {
        valid: false,
        error: `第一行不是有效的 Mermaid 图表类型。找到: "${firstLine}"，期望: ${VALID_DIAGRAM_TYPES.join(', ')}`
      };
    }

    return {
      valid: true,
      type: matchedType,
      code: cleanCode
    };
  }

  /**
   * 清理和解码代码
   */
  cleanCode(code) {
    if (!code) return '';

    // 解码 HTML 实体
    let decoded = code;
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = code;
      decoded = tempDiv.textContent || tempDiv.innerText || '';
    } catch (error) {
      console.warn('[MermaidRenderer] HTML 解码失败，使用原始代码');
    }

    // 手动解码常见实体
    const entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&#x20;': ' ',
      '&#32;': ' '
    };

    for (const [entity, replacement] of Object.entries(entities)) {
      decoded = decoded.replace(new RegExp(entity, 'g'), replacement);
    }

    // 清理代码格式
    return decoded
      .trim()
      .replace(/^\s+/gm, '')
      .replace(/\s+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  /**
   * 渲染单个图表
   */
  async renderDiagram(diagramId, code, options = {}) {
    const {
      showLoading = this.options.showLoading,
      onSuccess = null,
      onError = null,
      container = null,
      retryCount = 0,
      maxRetries = this.options.maxRetries
    } = options;

    this._stats.total++;

    // 确保已初始化
    if (!this.isInitialized) {
      this.renderQueue.push({ diagramId, code, options });
      await this.initialize();
      return;
    }

    const diagram = container || document.getElementById(diagramId);
    if (!diagram) {
      const error = new Error(`未找到图表元素: ${diagramId}`);
      console.warn(`[MermaidRenderer] ${error.message}`);
      this._stats.errors++;
      if (onError) onError(error);
      return;
    }

    // 检查是否已经渲染过
    if (diagram.hasAttribute('data-mermaid-rendered')) {
      this.log(`图表 ${diagramId} 已经渲染过了`);
      return;
    }

    // 清理和验证代码
    const cleanCode = this.cleanCode(code);
    const validation = this.validateCode(cleanCode);

    if (!validation.valid) {
      const error = new Error(validation.error);
      this._stats.errors++;
      const errorHtml = this.createErrorHtml(validation.error, cleanCode);
      diagram.innerHTML = errorHtml;
      if (onError) onError(error);
      return;
    }

    // 显示加载指示器
    if (showLoading) {
      diagram.innerHTML = this.createLoadingHtml();
    }

    try {
      const renderId = `mermaid-svg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { svg } = await mermaid.render(renderId, validation.code);

      diagram.innerHTML = svg;
      diagram.setAttribute('data-mermaid-rendered', 'true');
      diagram.setAttribute('data-mermaid-code', this.escapeHtml(validation.code));

      this.log(`图表 ${diagramId} 渲染成功`);
      this._stats.rendered++;

      // 调整图表尺寸
      if (this.options.autoAdjustSize) {
        this.adjustSizeAfterRender(diagram);
      }

      if (onSuccess) onSuccess(svg);
    } catch (error) {
      console.error(`[MermaidRenderer] 图表 ${diagramId} 渲染失败:`, error);

      // 重试机制
      if (this.options.enableRetry && retryCount < maxRetries && this.shouldRetry(error)) {
        this._stats.retries++;
        this.log(`尝试重试渲染图表 ${diagramId} (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          this.renderDiagram(diagramId, code, {
            ...options,
            retryCount: retryCount + 1,
            showLoading: false
          });
        }, 1000 * (retryCount + 1));
        return;
      }

      this._stats.errors++;
      const errorHtml = this.createErrorHtml(error.message, validation.code, {
        retryCount,
        maxRetries,
        canRetry: retryCount < maxRetries,
        diagramId: diagramId
      });
      diagram.innerHTML = errorHtml;

      if (onError) onError(error);
    }
  }

  /**
   * 渲染后调整尺寸
   */
  adjustSizeAfterRender(diagram) {
    const adjustSize = () => {
      const svg = diagram.querySelector('svg');
      if (svg) {
        const hasContent = svg.children.length > 0 || svg.innerHTML.trim().length > 0;
        if (hasContent) {
          this.adjustMermaidSize(diagram);
        } else {
          setTimeout(adjustSize, 100);
        }
      } else {
        setTimeout(adjustSize, 100);
      }
    };

    requestAnimationFrame(() => adjustSize());
    setTimeout(() => adjustSize(), 100);
    setTimeout(() => adjustSize(), 500);
  }

  /**
   * 批量渲染图表
   */
  async renderDiagrams(selector = '.mermaid-diagram-container') {
    const diagrams = document.querySelectorAll(selector);
    this.log(`找到 ${diagrams.length} 个图表容器`);

    const renderPromises = Array.from(diagrams).map(diagram => {
      const code = diagram.getAttribute('data-mermaid-code');
      if (!code) {
        console.warn(`[MermaidRenderer] 图表 ${diagram.id} 没有代码数据`);
        return Promise.resolve();
      }

      return this.renderDiagram(diagram.id, code, {
        container: diagram,
        showLoading: true
      });
    });

    await Promise.all(renderPromises);
  }

  /**
   * 创建加载指示器 HTML
   */
  createLoadingHtml() {
    return `
      <div class="mermaid-loading" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        color: var(--text-muted, #94a3b8);
      ">
        <div class="mermaid-spinner" style="
          width: 40px;
          height: 40px;
          border: 3px solid var(--bg-tertiary, #334155);
          border-top-color: var(--primary, #667eea);
          border-radius: 50%;
          animation: mermaid-spin 1s linear infinite;
          margin-bottom: 16px;
        "></div>
        <span>正在渲染图表...</span>
      </div>
      <style>
        @keyframes mermaid-spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(error) {
    const retryableErrors = [
      'Network error',
      'Timeout',
      'Connection failed',
      'Service unavailable',
      'Temporary failure'
    ];

    const errorMessage = error.message || error.toString();
    return retryableErrors.some(retryableError =>
      errorMessage.toLowerCase().includes(retryableError.toLowerCase())
    );
  }

  /**
   * 创建错误 HTML
   */
  createErrorHtml(errorMessage, code, options = {}) {
    const {
      retryCount = 0,
      maxRetries = 0,
      canRetry = false,
      diagramId = null
    } = options;

    const escapedError = this.escapeHtml(errorMessage);
    const escapedCode = this.escapeHtml(code);

    return `
      <div class="mermaid-error" style="
        background: var(--bg-secondary, #1e293b);
        border: 1px solid var(--border-error, rgba(239,68,68,0.3));
        border-radius: var(--radius-lg, 0.75rem);
        padding: 16px;
        color: var(--text-error, #ef4444);
      ">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <svg style="width: 20px; height: 20px; flex-shrink: 0;" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <strong>图表渲染失败</strong>
        </div>
        <p style="margin: 0 0 12px 0; font-size: 14px;">${escapedError}</p>
        <details style="margin-bottom: 8px;">
          <summary style="cursor: pointer; font-size: 13px;">查看原始代码</summary>
          <pre style="
            background: var(--bg-tertiary, #334155);
            padding: 12px;
            border-radius: var(--radius-md, 0.5rem);
            overflow-x: auto;
            font-size: 12px;
            margin-top: 8px;
            color: var(--text-secondary, #e2e8f0);
          "><code>${escapedCode}</code></pre>
        </details>
        ${canRetry && diagramId ? `
          <button
            onclick="window.mermaidRenderer.retryRender('${this.escapeJs(diagramId)}', '${this.escapeJs(code)}')"
            style="
              background: var(--primary, #667eea);
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: var(--radius-md, 0.5rem);
              cursor: pointer;
              font-size: 13px;
            "
          >
            重试 (${retryCount + 1}/${maxRetries})
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * 重试渲染
   */
  async retryRender(diagramId, code) {
    const diagram = document.getElementById(diagramId);
    if (diagram) {
      diagram.removeAttribute('data-mermaid-rendered');
    }
    await this.renderDiagram(diagramId, code);
  }

  /**
   * HTML 转义
   */
  escapeHtml(str) {
    if (typeof str !== 'string' && str == null) return '';
    const unescaped = String(str)
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    return unescaped
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 转义 JavaScript 字符串
   */
  escapeJs(str) {
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * 调整 Mermaid 图表尺寸
   */
  adjustMermaidSize(mermaidDiv) {
    if (!mermaidDiv) return;

    const svg = mermaidDiv.querySelector('svg');
    if (!svg) return;

    try {
      const parent = mermaidDiv.parentElement;
      let maxContainerWidth = parent
        ? parent.clientWidth - 32
        : window.innerWidth - 100;

      maxContainerWidth = Math.max(maxContainerWidth, 100);

      let svgWidth, svgHeight;

      try {
        const bbox = svg.getBBox();
        if (bbox && bbox.width > 0 && bbox.height > 0) {
          svgWidth = bbox.width;
          svgHeight = bbox.height;
        }
      } catch (e) { }

      if (!svgWidth || !svgHeight) {
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
      }

      if (!svgWidth || !svgHeight) {
        svgWidth = svg.clientWidth || svg.offsetWidth || svg.scrollWidth;
        svgHeight = svg.clientHeight || svg.offsetHeight || svg.scrollHeight;
      }

      svgWidth = Math.max(0, svgWidth || 0);
      svgHeight = Math.max(0, svgHeight || 0);

      if (svgWidth > 0 && svgHeight > 0) {
        if (!svg.getAttribute('viewBox')) {
          svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        }

        if (svgWidth > maxContainerWidth && maxContainerWidth > 0) {
          const scale = maxContainerWidth / svgWidth;
          svgWidth = maxContainerWidth;
          svgHeight = svgHeight * scale;
          svgWidth = Math.max(0, svgWidth);
          svgHeight = Math.max(0, svgHeight);
        }

        if (svgWidth > 0 && svgHeight > 0) {
          svg.setAttribute('width', svgWidth);
          svg.setAttribute('height', svgHeight);
        }

        mermaidDiv.style.width = 'auto';
        mermaidDiv.style.height = 'auto';
        mermaidDiv.style.maxWidth = '100%';
        mermaidDiv.style.minWidth = '0';
      }
    } catch (e) {
      console.warn('[MermaidRenderer] 尺寸调整失败', e);
      mermaidDiv.style.maxWidth = '100%';
      mermaidDiv.style.overflowX = 'auto';
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig) {
    this.config = getMermaidConfig(newConfig);
    if (this.isInitialized && typeof mermaid !== 'undefined') {
      mermaid.initialize(this.config);
    }
  }

  /**
   * 重置渲染状态
   */
  resetRenderedState(selector = '.mermaid-diagram-container') {
    const diagrams = document.querySelectorAll(selector);
    diagrams.forEach(diagram => {
      diagram.removeAttribute('data-mermaid-rendered');
      diagram.innerHTML = diagram.getAttribute('data-mermaid-code') || '';
    });
  }

  /**
   * 获取渲染统计信息
   */
  getStats() {
    const diagrams = document.querySelectorAll('.mermaid-diagram-container');
    const rendered = document.querySelectorAll('.mermaid-diagram-container[data-mermaid-rendered="true"]');
    const errors = document.querySelectorAll('.mermaid-error');

    return {
      ...this._stats,
      domTotal: diagrams.length,
      domRendered: rendered.length,
      domErrors: errors.length,
      isInitialized: this.isInitialized,
      queueLength: this.renderQueue.length
    };
  }

  /**
   * 重新渲染所有图表
   */
  async reRenderAll() {
    this.log('开始重新渲染所有图表');
    this.resetRenderedState();
    await this.renderDiagrams();
    const stats = this.getStats();
    this.log('重新渲染完成:', stats);
    return stats;
  }

  /**
   * 设置调试模式
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    this.log(`调试模式 ${enabled ? '已启用' : '已禁用'}`);
  }

  /**
   * 获取调试信息
   */
  getDebugInfo() {
    return {
      version: '2.0.0',
      isInitialized: this.isInitialized,
      config: this.config,
      stats: this.getStats(),
      mermaidVersion: typeof mermaid !== 'undefined' ? mermaid.version || 'unknown' : 'not loaded',
      debugMode: this.debugMode,
      renderQueue: this.renderQueue.length
    };
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.isInitialized = false;
    this.renderQueue = [];
    this.log('实例已销毁');
  }
}

// 创建全局实例的工厂函数
export function createMermaidRenderer(options = {}) {
  return new MermaidRenderer(options);
}

// 默认导出
export default MermaidRenderer;
