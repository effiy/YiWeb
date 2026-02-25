/**
 * Mermaid UI 交互组件
 * author: liangliang
 * 说明：提供复制代码、下载、全屏等交互功能
 */

/**
 * Mermaid UI 管理器
 */
export class MermaidUi {
  constructor(options = {}) {
    this.options = {
      downloadFilename: 'mermaid-diagram',
      ...options
    };
    this.fullscreenData = null;
  }

  /**
   * 从容器获取 Mermaid 代码
   */
  getCodeFromContainer(diagramId) {
    const container = document.getElementById(diagramId);
    if (!container) {
      console.warn('[MermaidUi] 未找到图表容器:', diagramId);
      return null;
    }
    return container.getAttribute('data-mermaid-code');
  }

  /**
   * 从容器获取 SVG
   */
  getSvgFromContainer(diagramId) {
    const container = document.getElementById(diagramId);
    if (!container) {
      console.warn('[MermaidUi] 未找到图表容器:', diagramId);
      return null;
    }
    const svg = container.querySelector('svg');
    if (!svg) {
      console.warn('[MermaidUi] 未找到 SVG 元素');
      return null;
    }
    return svg;
  }

  /**
   * 复制代码到剪贴板
   */
  async copyCode(diagramId) {
    const code = this.getCodeFromContainer(diagramId);
    if (!code) {
      this.showToast('未找到图表代码', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.showToast('代码已复制到剪贴板', 'success');
    } catch (error) {
      // 降级方案
      try {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showToast('代码已复制到剪贴板', 'success');
      } catch (fallbackError) {
        console.error('[MermaidUi] 复制失败:', fallbackError);
        this.showToast('复制失败', 'error');
      }
    }
  }

  /**
   * 下载 SVG
   */
  downloadSvg(diagramId) {
    const svg = this.getSvgFromContainer(diagramId);
    if (!svg) {
      this.showToast('未找到图表', 'error');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const filename = `${this.options.downloadFilename}-${Date.now()}.svg`;
      this.downloadFile(url, filename);

      URL.revokeObjectURL(url);
      this.showToast('SVG 已下载', 'success');
    } catch (error) {
      console.error('[MermaidUi] SVG 下载失败:', error);
      this.showToast('下载失败', 'error');
    }
  }

  /**
   * 下载 PNG
   */
  downloadPng(diagramId, scale = 2) {
    const svg = this.getSvgFromContainer(diagramId);
    if (!svg) {
      this.showToast('未找到图表', 'error');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          const pngUrl = URL.createObjectURL(blob);
          const filename = `${this.options.downloadFilename}-${Date.now()}.png`;
          this.downloadFile(pngUrl, filename);
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
          this.showToast('PNG 已下载', 'success');
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        this.showToast('PNG 转换失败', 'error');
      };

      img.src = url;
    } catch (error) {
      console.error('[MermaidUi] PNG 下载失败:', error);
      this.showToast('下载失败', 'error');
    }
  }

  /**
   * 下载 PDF（简单实现，需要 jsPDF 或其他库支持）
   */
  downloadPdf(diagramId) {
    this.showToast('PDF 下载需要额外的库支持', 'info');
  }

  /**
   * 通用下载文件方法
   */
  downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * 全屏查看
   */
  fullscreen(diagramId) {
    const svg = this.getSvgFromContainer(diagramId);
    if (!svg) {
      this.showToast('未找到图表', 'error');
      return;
    }

    const svgClone = svg.cloneNode(true);
    this.fullscreenData = {
      diagramId,
      svgContent: svgClone.outerHTML
    };

    this.openFullscreen(this.fullscreenData.svgContent);
  }

  /**
   * 打开全屏查看器
   */
  openFullscreen(svgContent) {
    // 移除已存在的全屏遮罩
    this.closeFullscreen();

    const overlay = document.createElement('div');
    overlay.innerHTML = this.buildFullscreenHtml(svgContent);
    document.body.appendChild(overlay.firstElementChild);

    // ESC 键关闭
    document.addEventListener('keydown', this.handleEscKey);
  }

  /**
   * 关闭全屏查看器
   */
  closeFullscreen() {
    const existing = document.getElementById('mermaid-fullscreen-overlay');
    if (existing) {
      existing.remove();
    }
    document.removeEventListener('keydown', this.handleEscKey);
  }

  /**
   * ESC 键处理
   */
  handleEscKey = (event) => {
    if (event.key === 'Escape') {
      this.closeFullscreen();
    }
  }

  /**
   * 构建全屏 HTML（使用模板）
   */
  buildFullscreenHtml(svgContent) {
    return `
      <div class="mermaid-fullscreen-overlay" id="mermaid-fullscreen-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 2147483649;
        display: flex;
        flex-direction: column;
        padding: 24px;
      ">
        <div class="mermaid-fullscreen-header" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #1e293b;
          border-radius: 12px 12px 0 0;
        ">
          <h3 style="margin: 0; color: #f8fafc; font-size: 16px;">Mermaid 图表</h3>
          <button
            onclick="window.mermaidUi.closeFullscreen()"
            style="
              background: transparent;
              border: none;
              color: #94a3b8;
              cursor: pointer;
              padding: 8px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              transition: all 150ms ease;
            "
            onmouseover="this.style.background='#334155'; this.style.color='#e2e8f0';"
            onmouseout="this.style.background='transparent'; this.style.color='#94a3b8';"
          >
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="mermaid-fullscreen-content" style="
          flex: 1;
          overflow: auto;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        ">
          <div class="mermaid-fullscreen-svg" style="
            background: #0f172a;
            padding: 24px;
            border-radius: 12px;
          ">
            ${svgContent}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 显示 Toast 提示
   */
  showToast(message, type = 'info') {
    // 如果有全局 toast 函数，优先使用
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }

    // 内置简单 Toast
    const existing = document.querySelector('.mermaid-toast');
    if (existing) {
      existing.remove();
    }

    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    const icons = {
      success: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>',
      error: '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>',
      warning: '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>',
      info: '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>'
    };

    const toast = document.createElement('div');
    toast.className = 'mermaid-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      border: 1px solid rgba(255,255,255,0.12);
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #f8fafc;
      font-size: 14px;
      z-index: 2147483649;
      animation: mermaid-toast-in 0.3s ease;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    `;

    toast.innerHTML = `
      <svg style="width: 18px; height: 18px; color: ${colors[type]}; flex-shrink: 0;" fill="currentColor" viewBox="0 0 20 20">
        ${icons[type] || icons.info}
      </svg>
      <span>${this.escapeHtml(message)}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'mermaid-toast-out 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);

    // 添加动画样式
    if (!document.getElementById('mermaid-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'mermaid-toast-styles';
      style.textContent = `
        @keyframes mermaid-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes mermaid-toast-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * HTML 转义
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// 创建全局实例
export function createMermaidUi(options = {}) {
  return new MermaidUi(options);
}

export default MermaidUi;
