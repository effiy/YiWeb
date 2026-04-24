/**
 * Download Plugin
 * Adds download as SVG/PNG capability
 */

function serializeSvg(svg) {
  const serializer = new XMLSerializer();
  let svgStr = serializer.serializeToString(svg);

  // 添加XML命名空间（如果缺失）
  if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!svgStr.includes('xmlns:xlink="http://www.w3.org/1999/xlink"')) {
    svgStr = svgStr.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }

  return svgStr;
}

function svgToPngBlob(svg, scale = 2) {
  return new Promise((resolve, reject) => {
    const svgStr = serializeSvg(svg);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        const finalScale = scale * dpr;

        const width = (img.width || 800) * finalScale;
        const height = (img.height || 600) * finalScale;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 填充背景色（暗色主题）
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.scale(finalScale, finalScale);
        ctx.drawImage(img, 0, 0);

        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        }, 'image/png');
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function downloadPng(diagram) {
  const svg = diagram.querySelector('svg');
  if (!svg) return;

  try {
    const blob = await svgToPngBlob(svg, 1);
    const filename = `mermaid-diagram-${Date.now()}.png`;
    triggerDownload(blob, filename);
  } catch (e) {
    console.error('[DownloadPlugin] PNG download failed:', e);
  }
}

export const DownloadPlugin = {
  name: 'download',
  version: '1.0.0',

  afterRender({ diagram, code, renderer }) {
    const wrapper = diagram.parentElement;
    if (!wrapper) return;

    const toolbar = wrapper.querySelector('.mermaid-toolbar');
    if (!toolbar) return;

    // 检查是否已有下载按钮
    let btn = toolbar.querySelector('[data-action="download"]');
    if (btn) return;

    // 创建下载按钮
    btn = document.createElement('button');
    btn.className = 'mermaid-toolbar-btn';
    btn.setAttribute('data-testid', 'mermaid-toolbar-download-btn');
    btn.setAttribute('data-action', 'download');
    btn.setAttribute('aria-label', '下载 PNG');
    btn.textContent = '⬇';

    btn.addEventListener('click', () => downloadPng(diagram));

    toolbar.appendChild(btn);
  }
};