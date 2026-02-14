import { postData } from '/src/services/index.js';
import { getSessionSyncService } from '/src/services/aicr/sessionSyncService.js';

class FileDeleteService {
    constructor() {
        this.apiUrl = window.API_URL || 'https://api.effiy.cn';
    }

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
                    mongoSuccess: false,
                    sessionSuccess: false,
                    error: error?.message,
                    file
                });
            }
        }

        const successCount = results.filter(r => r.mongoSuccess).length;
        const sessionSuccessCount = results.filter(r => r.sessionSuccess).length;
        console.log('[FileDeleteService] 批量删除完成:', {
            总数: files.length,
            MongoDB成功: successCount,
            会话成功: sessionSuccessCount
        });

        return results;
    }

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
export function getFileDeleteService() {
    if (!fileDeleteServiceInstance) {
        fileDeleteServiceInstance = new FileDeleteService();
    }
    return fileDeleteServiceInstance;
}
