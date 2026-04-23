/**
 * 文件删除服务模块
 * 负责文件和文件夹的删除、重命名等操作
 * author: liangliang
 */

import { postData } from '/src/core/services/index.js';
import { getSessionSyncService } from '/src/core/services/aicr/sessionSyncService.js';

/**
 * 文件删除服务类
 * 提供文件和文件夹的删除、重命名功能
 */
class FileDeleteService {
    /**
     * 构造函数
     */
    constructor() {
        this.apiUrl = window.API_URL || 'https://api.effiy.cn';
    }

    /**
     * 提取文件标识符
     * @param {Object} file - 文件对象
     * @returns {Object} 包含 key 和 isFile 的对象
     */
    extractFileIdentifiers(file) {
        if (!file || typeof file !== 'object') {
            return { key: null, isFile: false };
        }

        const key = file.key || file.path ||
            (file.data && (file.data.key || file.data.path)) ||
            null;

        const isFile = file.type === 'file' ||
            (!file.type && key && !key.endsWith('/')) ||
            false;

        return { key, isFile };
    }

    /**
     * 删除单个文件
     * @param {Object} file - 文件对象
     * @returns {Promise<Object>} 删除结果
     */
    async deleteFile(file) {
        const { key, isFile } = this.extractFileIdentifiers(file);

        let finalKey = key;
        if (!finalKey && file) {
            finalKey = file.key || file.path || null;
        }

        const sessionKey = file?.sessionKey || finalKey;
        const staticPath = file?.path || finalKey;

        console.log('[FileDeleteService] 开始删除文件:', {
            key: finalKey,
            sessionKey,
            staticPath,
            isFile,
            fileType: file?.type
        });

        if (!finalKey && !sessionKey) {
            console.error('[FileDeleteService] ✗ 无法删除文件：缺少 key', { file });
            return {
                sessionSuccess: false,
                key: finalKey,
                isFile,
                error: '缺少 key'
            };
        }

        const result = {
            sessionSuccess: false,
            key: finalKey,
            isFile
        };

        if (isFile) {
            result.sessionSuccess = await this.deleteSession(sessionKey);

            try {
                const base = String(this.apiUrl || '').replace(/\/+$/, '');
                const endpoint = `${base}/delete-file`;
                const response = await postData(endpoint, {
                    target_file: staticPath
                });
                console.log('[FileDeleteService] 静态文件删除结果:', response);
            } catch (e) {
                console.warn('[FileDeleteService] 静态文件删除失败（可能是目录或已删除）:', e.message);
            }
        } else {
            if (!isFile) {
                console.debug('[FileDeleteService] ✗ 跳过会话删除（不是文件）:', { key: finalKey, type: file?.type });
            }
        }

        return result;
    }

    /**
     * 重命名文件
     * @param {string} oldPath - 旧路径
     * @param {string} newPath - 新路径
     * @returns {Promise<Object>} 操作结果
     */
    async renameFile(oldPath, newPath) {
        console.log('[FileDeleteService] 重命名文件:', oldPath, '->', newPath);
        try {
            const base = String(this.apiUrl || '').replace(/\/+$/, '');
            const endpoint = `${base}/rename-file`;
            const response = await postData(endpoint, {
                old_path: oldPath,
                new_path: newPath
            });
            return { success: true, response };
        } catch (e) {
            console.warn('[FileDeleteService] 静态文件重命名失败:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * 重命名文件夹
     * @param {string} oldPath - 旧路径
     * @param {string} newPath - 新路径
     * @returns {Promise<Object>} 操作结果
     */
    async renameFolder(oldPath, newPath) {
        console.log('[FileDeleteService] 重命名文件夹:', oldPath, '->', newPath);
        try {
            const base = String(this.apiUrl || '').replace(/\/+$/, '');
            const endpoint = `${base}/rename-folder`;
            const response = await postData(endpoint, {
                old_dir: oldPath,
                new_dir: newPath
            });
            return { success: true, response };
        } catch (e) {
            console.warn('[FileDeleteService] 静态文件夹重命名失败:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * 删除文件夹及其内容
     * @param {string} folderKey - 文件夹路径
     * @param {Array} allSessions - 所有会话列表
     * @returns {Promise<Object>} 删除结果
     */
    async deleteFolder(folderKey, allSessions) {
        if (!folderKey) return { success: false, error: '文件夹路径为空' };

        console.log('[FileDeleteService] 开始删除文件夹:', folderKey);

        const result = {
            folderKey,
            sessionResult: null,
            staticResult: null,
            success: false
        };

        try {
            const sessionSync = getSessionSyncService();
            result.sessionResult = await sessionSync.deleteSessionsByFolder(folderKey, allSessions);
            console.log('[FileDeleteService] 会话删除结果:', result.sessionResult);

            try {
                const base = String(this.apiUrl || '').replace(/\/+$/, '');
                const endpoint = `${base}/delete-folder`;
                const response = await postData(endpoint, {
                    target_dir: folderKey
                });
                result.staticResult = response;
                console.log('[FileDeleteService] 静态目录删除结果:', response);
            } catch (e) {
                console.warn('[FileDeleteService] 静态目录删除失败:', e);
                result.staticResult = { success: false, error: e.message };
            }

            result.success = result.sessionResult?.success !== false;

            return result;
        } catch (error) {
            console.error('[FileDeleteService] 文件夹删除失败:', error);
            return {
                ...result,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 批量删除文件
     * @param {Array} files - 文件列表
     * @returns {Promise<Array>} 删除结果列表
     */
    async deleteFiles(files) {
        if (!Array.isArray(files) || files.length === 0) {
            console.warn('[FileDeleteService] 批量删除：文件列表为空');
            return [];
        }

        console.log('[FileDeleteService] 开始批量删除，文件数:', files.length);

        const results = [];
        for (const file of files) {
            try {
                const result = await this.deleteFile(file);
                results.push(result);
            } catch (error) {
                console.error('[FileDeleteService] 批量删除单个文件失败:', error);
                results.push({
                    sessionSuccess: false,
                    error: error?.message,
                    file
                });
            }
        }

        const sessionSuccessCount = results.filter(r => r.sessionSuccess).length;
        console.log('[FileDeleteService] 批量删除完成:', {
            总数: files.length,
            会话成功: sessionSuccessCount
        });

        return results;
    }

    /**
     * 删除单个会话
     * @param {string} sessionKey - 会话Key
     * @returns {Promise<boolean>} 是否成功
     */
    async deleteSession(sessionKey) {
        try {
            const sessionSync = getSessionSyncService();
            const finalKey = sessionKey || sessionSync.generateSessionKey(sessionKey);
            await sessionSync.deleteSession(finalKey);
            console.log('[FileDeleteService] 会话删除成功:', finalKey);
            return true;
        } catch (error) {
            console.warn('[FileDeleteService] 会话删除失败:', error?.message);
            return false;
        }
    }
}

let fileDeleteServiceInstance = null;

/**
 * 获取文件删除服务单例
 * @returns {FileDeleteService} 文件删除服务实例
 */
export function getFileDeleteService() {
    if (!fileDeleteServiceInstance) {
        fileDeleteServiceInstance = new FileDeleteService();
    }
    return fileDeleteServiceInstance;
}
