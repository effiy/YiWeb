/**
 * 文件字段规范化工具
 * 统一处理 projectTree、projectFiles、session、静态文件的字段规则
 * 确保新建、删除、修改、导入操作的数据一致性
 */

/**
 * 规范化文件路径/ID
 * 统一规则：
 * - 使用正斜杠 / 作为路径分隔符
 * - 移除开头的 ./ 和多余的 /
 * - 合并连续的 /
 * - 移除结尾的 /（除非是根路径）
 * - 不包含 projectId 前缀（在存储时统一处理）
 * 
 * @param {string} path - 文件路径或ID
 * @param {string} projectId - 项目ID（可选，用于移除前缀）
 * @returns {string} 规范化后的路径
 */
export function normalizeFilePath(path, projectId = null) {
    if (path == null || path === '') return '';
    
    try {
        let s = String(path);
        
        // 1. 统一路径分隔符（Windows路径转正斜杠）
        s = s.replace(/\\/g, '/');
        
        // 2. 移除开头的相对路径标记
        s = s.replace(/^\.\//, '');
        
        // 3. 移除开头的斜杠
        s = s.replace(/^\/+/, '');
        
        // 4. 合并连续的斜杠
        s = s.replace(/\/+/g, '/');
        
        // 5. 移除结尾的斜杠（除非是根路径）
        if (s.length > 1 && s.endsWith('/')) {
            s = s.replace(/\/+$/, '');
        }
        
        // 6. 如果提供了 projectId，移除开头的 projectId 前缀
        if (projectId && s) {
            const parts = s.split('/').filter(Boolean);
            // 去除所有开头的 projectId（不区分大小写）
            while (parts.length > 0 && parts[0].toLowerCase() === projectId.toLowerCase()) {
                parts.shift();
            }
            s = parts.length > 0 ? parts.join('/') : '';
        }
        
        return s;
    } catch (e) {
        console.warn('[normalizeFilePath] 规范化失败:', e, '原始路径:', path);
        return String(path || '');
    }
}

/**
 * 从文件路径提取文件名
 * @param {string} path - 文件路径
 * @returns {string} 文件名
 */
export function extractFileName(path) {
    if (!path || typeof path !== 'string') return '';
    const normalized = normalizeFilePath(path);
    const parts = normalized.split('/').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : '';
}

/**
 * 从文件路径提取目录路径
 * @param {string} path - 文件路径
 * @returns {string} 目录路径（不包含文件名）
 */
export function extractDirPath(path) {
    if (!path || typeof path !== 'string') return '';
    const normalized = normalizeFilePath(path);
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/');
}

/**
 * 规范化文件对象，统一字段结构
 * 统一字段规则：
 * - fileId: 规范化后的文件路径（不包含 projectId）
 * - id: 与 fileId 相同
 * - path: 与 fileId 相同
 * - name: 从路径提取的文件名
 * - projectId: 项目ID
 * - content: 文件内容（字符串）
 * - size: 文件大小（字节数）
 * - type: 'file' 或 'folder'
 * 
 * @param {Object} file - 文件对象（可能包含各种字段格式）
 * @param {string} projectId - 项目ID
 * @returns {Object} 规范化后的文件对象
 */
export function normalizeFileObject(file, projectId) {
    if (!file || typeof file !== 'object') {
        return null;
    }
    
    // 提取原始路径（支持多种字段）
    const rawPath = file.fileId || file.id || file.path || '';
    
    // 规范化路径
    const normalizedPath = normalizeFilePath(rawPath, projectId);
    
    if (!normalizedPath) {
        console.warn('[normalizeFileObject] 无法提取有效路径:', file);
        return null;
    }
    
    // 提取文件名
    const fileName = extractFileName(normalizedPath);
    
    // 提取文件大小
    let fileSize = 0;
    if (Number.isFinite(file.size)) {
        fileSize = file.size;
    } else if (file.content && typeof file.content === 'string') {
        // 如果没有 size，根据内容计算
        try {
            fileSize = new TextEncoder().encode(file.content).length;
        } catch (e) {
            fileSize = file.content.length;
        }
    }
    
    // 确定类型
    const fileType = file.type || (normalizedPath.endsWith('/') ? 'folder' : 'file');
    
    // 构建规范化对象
    const normalized = {
        // 统一标识字段（都指向规范化后的路径）
        fileId: normalizedPath,
        id: normalizedPath,
        path: normalizedPath,
        
        // 基本信息
        name: fileName || normalizedPath,
        projectId: projectId || file.projectId || '',
        type: fileType,
        
        // 内容字段
        content: file.content || '',
        size: fileSize,
        
        // 保留原始唯一标识（如果存在）
        key: file.key || file._id || null,
        _id: file._id || file.key || null,
        
        // 时间戳
        createdAt: file.createdAt || file.createdTime || Date.now(),
        updatedAt: file.updatedAt || file.updatedTime || Date.now(),
        modified: file.modified || file.updatedAt || file.updatedTime || Date.now()
    };
    
    return normalized;
}

/**
 * 规范化文件树节点
 * 统一字段规则：
 * - id: 节点路径（包含 projectId）
 * - name: 节点名称
 * - type: 'file' 或 'folder'
 * - path: 与 id 相同（包含 projectId）
 * - children: 子节点数组（仅文件夹有）
 * 
 * @param {Object} node - 文件树节点
 * @param {string} projectId - 项目ID
 * @returns {Object} 规范化后的节点
 */
export function normalizeTreeNode(node, projectId) {
    if (!node || typeof node !== 'object') {
        return null;
    }
    
    // 提取原始路径
    const rawPath = node.id || node.path || node.fileId || '';
    
    // 规范化路径（移除 projectId 前缀，以便后续统一添加）
    const normalizedPath = normalizeFilePath(rawPath, projectId);
    
    // 构建包含 projectId 的完整路径
    let fullPath = normalizedPath;
    if (projectId) {
        if (!normalizedPath || normalizedPath.trim() === '') {
            // 如果路径为空，使用 projectId 作为根节点
            fullPath = projectId;
        } else {
            // 规范化后的路径不包含 projectId，统一添加 projectId 前缀
            fullPath = `${projectId}/${normalizedPath}`;
        }
    }
    
    // 提取名称（使用规范化后的路径，不包含 projectId）
    const nodeName = node.name || extractFileName(normalizedPath) || (normalizedPath === projectId || !normalizedPath ? projectId : normalizedPath);
    
    // 规范化节点
    const normalized = {
        id: fullPath,
        name: nodeName,
        type: node.type || (normalizedPath.endsWith('/') ? 'folder' : 'file'),
        path: fullPath
    };
    
    // 如果是文件夹，处理子节点
    if (normalized.type === 'folder' && Array.isArray(node.children)) {
        normalized.children = node.children
            .map(child => normalizeTreeNode(child, projectId))
            .filter(Boolean);
    } else if (normalized.type === 'file') {
        // 文件节点可以包含额外信息
        if (Number.isFinite(node.size)) {
            normalized.size = node.size;
        }
        if (node.modified) {
            normalized.modified = node.modified;
        }
    }
    
    return normalized;
}

/**
 * 构建完整的文件路径（包含 projectId）
 * 用于存储到数据库或静态文件系统
 * 
 * @param {string} fileId - 规范化后的文件ID（不包含 projectId）
 * @param {string} projectId - 项目ID
 * @returns {string} 完整的文件路径
 */
export function buildFullFilePath(fileId, projectId) {
    if (!fileId || !projectId) return fileId || '';
    
    const normalized = normalizeFilePath(fileId);
    if (!normalized) return '';
    
    // 确保路径以 projectId 开头
    if (normalized.startsWith(projectId + '/')) {
        return normalized;
    }
    
    return `${projectId}/${normalized}`;
}

/**
 * 从完整路径提取文件ID（移除 projectId 前缀）
 * 
 * @param {string} fullPath - 完整路径（可能包含 projectId）
 * @param {string} projectId - 项目ID
 * @returns {string} 文件ID（不包含 projectId）
 */
export function extractFileIdFromFullPath(fullPath, projectId) {
    if (!fullPath) return '';
    
    return normalizeFilePath(fullPath, projectId);
}

