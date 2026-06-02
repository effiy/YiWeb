/**
 * 自主测试 — 文件扫描器
 *
 * 提供文件发现、内容读取、扩展名分类能力。
 * 浏览器环境通过 fetch 读取文件；测试环境通过 createMockScanner 提供内存假数据。
 *
 * 导出：
 *   scanProjectFiles(rootDir)       — 获取项目文件列表（需后端目录接口支持）
 *   scanFileContent(filePath)       — 读取单个文件内容
 *   classifyByExtension(files)      — 按扩展名分类（md/js/json/html/css/其他）
 *   createMockScanner(fileMap)      — 创建内存 mock scanner（供测试用）
 */

import { logInfo, logError } from '/cdn/utils/core/log.js';

const FILE_CATEGORIES = {
    md: { category: 'document', extensions: ['.md'] },
    js: { category: 'code', extensions: ['.js'] },
    json: { category: 'config', extensions: ['.json'] },
    html: { category: 'template', extensions: ['.html'] },
    css: { category: 'style', extensions: ['.css'] },
    binary: { category: 'binary', extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'] },
};

/* ── 真实文件扫描（浏览器 fetch） ── */

/**
 * 扫描项目文件列表（需要服务端提供目录列举接口）
 * 如无此类接口，调用方应手动传入已知文件列表。
 */
export async function scanProjectFiles(rootDir) {
    try {
        const response = await fetch(`${rootDir}/_file_list.json`, { credentials: 'omit' });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.files) ? data.files : [];
    } catch {
        return [];
    }
}

/**
 * 读取单个文件内容（fetch）
 * @param {string} filePath — 相对于项目根目录的文件路径
 * @returns {Promise<string>} 文件文本内容
 */
export async function scanFileContent(filePath) {
    try {
        const response = await fetch(`/${filePath}`, { credentials: 'omit' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.text();
    } catch (err) {
        logError(`[Scanner] 读取文件失败: ${filePath}`, err.message);
        throw err;
    }
}

/* ── 扩展名分类 ── */

/**
 * 按扩展名将文件分类
 * @param {string[]} files — 文件路径数组
 * @returns {{ documents: string[], code: string[], configs: string[], templates: string[], styles: string[], binaries: string[], other: string[] }}
 */
export function classifyByExtension(files) {
    const result = {
        documents: [],
        code: [],
        configs: [],
        templates: [],
        styles: [],
        binaries: [],
        other: [],
    };

    for (const f of files) {
        const ext = '.' + (f.split('.').pop() || '').toLowerCase();
        if (FILE_CATEGORIES.md.extensions.includes(ext)) {
            result.documents.push(f);
        } else if (FILE_CATEGORIES.js.extensions.includes(ext)) {
            result.code.push(f);
        } else if (FILE_CATEGORIES.json.extensions.includes(ext)) {
            result.configs.push(f);
        } else if (FILE_CATEGORIES.html.extensions.includes(ext)) {
            result.templates.push(f);
        } else if (FILE_CATEGORIES.css.extensions.includes(ext)) {
            result.styles.push(f);
        } else if (FILE_CATEGORIES.binary.extensions.includes(ext)) {
            result.binaries.push(f);
        } else {
            result.other.push(f);
        }
    }
    return result;
}

/**
 * 获取文件扩展名对应的类别
 * @param {string} filePath
 * @returns {string} 'document' | 'code' | 'config' | 'template' | 'style' | 'binary' | 'other'
 */
export function getFileCategory(filePath) {
    const ext = '.' + (filePath.split('.').pop() || '').toLowerCase();
    for (const [key, cat] of Object.entries(FILE_CATEGORIES)) {
        if (cat.extensions.includes(ext)) {
            return cat.category;
        }
    }
    return 'other';
}

/* ── Mock Scanner（测试专用） ── */

/**
 * 创建内存文件扫描器，供测试使用。
 *
 * @param {{ [filePath: string]: string }} fileMap — { 'CLAUDE.md': '...', 'src/app.js': '...', ... }
 * @returns {object} mockScanner — 实现 scanFileContent / classifyByExtension / getFileCategory
 *
 * 用法：
 *   const scanner = createMockScanner({ 'CLAUDE.md': '# Project\n...', 'src/app.js': 'console.log(1)' });
 *   const content = await scanner.scanFileContent('CLAUDE.md');
 *   const classified = scanner.classifyByExtension(Object.keys(scanner._fileMap));
 */
export function createMockScanner(fileMap) {
    const _fileMap = { ...fileMap };

    const mockScanner = {
        _fileMap,

        async scanFileContent(filePath) {
            // 支持模糊匹配：尝试精确匹配，然后按文件名尾部匹配
            if (_fileMap[filePath] !== undefined) {
                return _fileMap[filePath];
            }
            // 尝试移除开头的 / 或 ./ 后匹配
            const clean = filePath.replace(/^[./\\]+/, '');
            if (_fileMap[clean] !== undefined) {
                return _fileMap[clean];
            }
            // 按文件名结尾匹配
            for (const [k, v] of Object.entries(_fileMap)) {
                if (k.endsWith(filePath) || filePath.endsWith(k)) {
                    return v;
                }
            }
            throw new Error(`文件不存在: ${filePath}`);
        },

        classifyByExtension(files) {
            return classifyByExtension(files);
        },

        getFileCategory(filePath) {
            return getFileCategory(filePath);
        },

        /** 获取所有文件列表 */
        listFiles() {
            return Object.keys(_fileMap);
        },

        /** 检查文件是否存在于 mock 中 */
        fileExists(filePath) {
            const clean = filePath.replace(/^[./\\]+/, '');
            if (_fileMap[filePath] !== undefined) return true;
            if (_fileMap[clean] !== undefined) return true;
            for (const k of Object.keys(_fileMap)) {
                if (k.endsWith(filePath) || filePath.endsWith(k)) return true;
            }
            return false;
        },
    };

    return mockScanner;
}
