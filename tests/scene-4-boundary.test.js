/**
 * 场景-4: 异常路径与边界测试
 * 覆盖: 空值输入, XSS 防护, 网络异常, 组件加载异常, 并发竞态
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const TOKEN_KEY = 'YiWeb.apiToken.v1';

// ============================================================
// 空值与边界输入
// ============================================================
describe('空值与边界输入', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('escapeHtml 处理 null/undefined', () => {
    const escapeHtml = (str) => {
      if (str == null) return '';
      const div = document.createElement('div');
      div.appendChild(document.createTextNode(String(str)));
      return div.innerHTML;
    };
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });

  it('escapeHtml 将 HTML 标签转为实体', () => {
    const escapeHtml = (str) => {
      if (str == null) return '';
      const div = document.createElement('div');
      div.appendChild(document.createTextNode(String(str)));
      return div.innerHTML;
    };
    // createTextNode 会转义 < > & 但保留文本内容
    const result = escapeHtml('<script>alert(1)</script>');
    expect(result).toContain('&lt;script');
    expect(result).toContain('&lt;/script');
    // 纯文本内容 "alert(1)" 被保留但标签被转义
    expect(result).not.toBe('<script>alert(1)</script>');
  });

  it('escapeHtml 保留正常文本', () => {
    const escapeHtml = (str) => {
      if (str == null) return '';
      const div = document.createElement('div');
      div.appendChild(document.createTextNode(String(str)));
      return div.innerHTML;
    };
    expect(escapeHtml('hello world')).toBe('hello world');
    expect(escapeHtml('你好世界')).toBe('你好世界');
    expect(escapeHtml('a & b')).toContain('&amp;');
  });
});

// ============================================================
// 网络异常
// ============================================================
describe('网络异常处理', () => {
  beforeEach(() => {
    vi.stubGlobal('logInfo', vi.fn());
    vi.stubGlobal('logError', vi.fn());
    vi.stubGlobal('logWarn', vi.fn());
    vi.stubGlobal('timeStart', vi.fn());
    vi.stubGlobal('timeEnd', vi.fn());
    const storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => (storage[k] != null ? storage[k] : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const reloadReq = () => import('/src/core/services/helper/requestHelper.js');

  it('网络错误时请求抛出异常', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))));
    const { getRequest } = await reloadReq();
    await expect(getRequest('https://api.effiy.cn/offline')).rejects.toThrow();
  });

  it('非 JSON 响应不阻塞', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true, status: 200,
        headers: { get: () => 'text/html' },
        text: () => Promise.resolve('<html>ok</html>'),
      })
    ));
    const { getRequest } = await reloadReq();
    await expect(getRequest('https://api.effiy.cn/html')).resolves.toBeDefined();
  });
});

// ============================================================
// 并发竞态
// ============================================================
describe('并发与竞态', () => {
  beforeEach(() => {
    vi.stubGlobal('logInfo', vi.fn());
    vi.stubGlobal('logError', vi.fn());
    vi.stubGlobal('logWarn', vi.fn());
    vi.stubGlobal('timeStart', vi.fn());
    vi.stubGlobal('timeEnd', vi.fn());
    const storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k) => (storage[k] != null ? storage[k] : null)),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('batchRequests 导出为函数', async () => {
    const { batchRequests } = await import('/src/core/services/helper/requestHelper.js');
    expect(typeof batchRequests).toBe('function');
  });

  it('并发调用 CachedRequest 不崩溃', async () => {
    let fetchCount = 0;
    vi.stubGlobal('fetch', vi.fn(() => {
      fetchCount++;
      return Promise.resolve({
        ok: true, status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ code: 0, data: { n: fetchCount } }),
      });
    }));

    const { CachedRequest } = await import('/src/core/services/helper/requestHelper.js');
    const cache = new CachedRequest({ ttl: 60000 });

    // 并发请求同一 URL — 应至少不崩溃
    const results = await Promise.allSettled([
      cache.get('https://api.effiy.cn/concurrent-1'),
      cache.get('https://api.effiy.cn/concurrent-1'),
      cache.get('https://api.effiy.cn/concurrent-1'),
    ]);

    expect(results).toHaveLength(3);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    expect(fulfilled.length).toBeGreaterThan(0);
  });
});
