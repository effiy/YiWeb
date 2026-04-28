/**
 * Download Plugin
 * Adds download as SVG and PNG capability
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

function downloadSvg(diagram) {
  const svg = diagram.querySelector('svg');
  if (!svg) return;

  try {
    const svgStr = serializeSvg(svg);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const filename = `mermaid-diagram-${Date.now()}.svg`;
    triggerDownload(svgBlob, filename);
  } catch (e) {
    console.error('[DownloadPlugin] SVG download failed:', e);
  }
}

async function convertSvgToPng(svgElement, options = {}) {
  const {
    scale = 2,
    backgroundColor = 'white'
  } = options;

  return new Promise((resolve, reject) => {
    try {
      const svgStr = serializeSvg(svgElement);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();

      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          const width = img.width * scale;
          const height = img.height * scale;
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');

          if (backgroundColor) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
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

      img.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('SVG image load failed'));
      };

      img.src = url;
    } catch (e) {
      reject(e);
    }
  });
}

async function downloadPng(diagram) {
  const svg = diagram.querySelector('svg');
  if (!svg) return;

  try {
    const pngBlob = await convertSvgToPng(svg);
    const filename = `mermaid-diagram-${Date.now()}.png`;
    triggerDownload(pngBlob, filename);
  } catch (e) {
    console.error('[DownloadPlugin] PNG download failed:', e);
    downloadSvg(diagram);
  }
}

export const DownloadPlugin = {
  name: 'download',
  version: '1.1.0',

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
    btn.setAttribute('aria-label', '下载图片');
    btn.textContent = '📷';

    btn.addEventListener('click', () => downloadPng(diagram));

    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      downloadSvg(diagram);
    });

    toolbar.appendChild(btn);
  }
};
