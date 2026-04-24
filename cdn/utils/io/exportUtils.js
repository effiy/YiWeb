/**
 * 导出工具函数
 * 支持按目录结构导出数据，每个item对应一个文件
 * author: liangliang
 */

// 等待JSZip加载完成
async function waitForJSZip() {
    // 如果已经加载，直接返回
    if (window.JSZip && typeof window.JSZip === 'function') {
        console.log('[ExportUtils] JSZip 已加载');
        return window.JSZip;
    }
    
    console.log('[ExportUtils] 等待 JSZip 加载...');
    
    // 等待JSZip加载
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // 10秒超时
        
        const checkJSZip = () => {
            attempts++;
            
            if (window.JSZip && typeof window.JSZip === 'function') {
                console.log('[ExportUtils] JSZip 加载成功');
                resolve(window.JSZip);
            } else if (attempts >= maxAttempts) {
                console.error('[ExportUtils] JSZip 加载超时');
                reject(new Error('JSZip库加载超时，请检查网络连接'));
            } else {
                setTimeout(checkJSZip, 100);
            }
        };
        
        checkJSZip();
    });
}

/**
 * 导出数据到ZIP文件
 * @param {Object} data - 要导出的数据对象
 * @param {string} filename - 导出文件名
 */
export async function exportToZip(data, filename = 'export') {
    try {
        // 等待JSZip加载完成
        const JSZip = await waitForJSZip();
        
        const zip = new JSZip();
        
        // 创建目录结构
        const dailyChecklistDir = zip.folder('每日清单');
        const projectFilesDir = zip.folder('项目文件');
        const newsDir = zip.folder('新闻');
        
        // 导出每日清单数据
        if (data.dailyChecklist && data.dailyChecklist.length > 0) {
            data.dailyChecklist.forEach((item, index) => {
                const content = formatDailyChecklistItem(item);
                const fileName = generateItemFileName(item, '每日清单', index);
                dailyChecklistDir.file(`${fileName}.md`, content);
            });
        }
        
        // 导出项目文件数据
        if (data.projectFiles && data.projectFiles.length > 0) {
            data.projectFiles.forEach((item, index) => {
                const content = formatProjectFileItem(item);
                const fileName = generateItemFileName(item, '项目文件', index);
                projectFilesDir.file(`${fileName}.md`, content);
            });
        }
        
        // 导出新闻数据
        if (data.news && data.news.length > 0) {
            data.news.forEach((item, index) => {
                const content = formatNewsItem(item);
                const fileName = generateItemFileName(item, '新闻', index);
                newsDir.file(`${fileName}.md`, content);
            });
        }
        
        // 生成ZIP文件
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // 生成优化的文件名
        const optimizedFileName = generateOptimizedFileName('YiWeb数据导出', '', data);
        
        // 下载文件
        downloadBlob(zipBlob, `${optimizedFileName}.zip`);
        
        console.log('[ExportUtils] 导出成功');
        return true;
    } catch (error) {
        console.error('[ExportUtils] 导出失败:', error);
        return false;
    }
}

/**
 * 格式化每日清单项目
 * @param {Object} item - 每日清单项目
 * @returns {string} 格式化后的内容
 */
function formatDailyChecklistItem(item) {
    const lines = [];
    lines.push(`# 每日清单 - ${item.time || '未知时间'}`);
    lines.push('');
    lines.push(`**时段名称**: ${item.name || '未知'}`);
    lines.push(`**主要活动**: ${item.mainActivity || '未知'}`);
    lines.push(`**完成状态**: ${item.completed ? '✅ 已完成' : '❌ 未完成'}`);
    lines.push(`**是否当前时段**: ${item.isCurrent ? '是' : '否'}`);
    lines.push('');
    
    if (item.checklist && item.checklist.length > 0) {
        lines.push('## 清单项目');
        item.checklist.forEach((checkItem, index) => {
            const status = checkItem.completed ? '✅' : '❌';
            lines.push(`${index + 1}. ${status} ${checkItem.text}`);
        });
        lines.push('');
    }
    
    if (item.dataFields && item.dataFields.length > 0) {
        lines.push('## 数据追踪');
        item.dataFields.forEach(field => {
            lines.push(`- **${field.label}**: ${field.value || field.placeholder || '未填写'}`);
        });
        lines.push('');
    }
    
    if (item.phoneReminder) {
        lines.push('## 手机提醒');
        lines.push(`📱 ${item.phoneReminder}`);
        lines.push('');
    }
    
    lines.push(`**导出时间**: ${new Date().toLocaleString('zh-CN')}`);
    
    return lines.join('\n');
}

/**
 * 格式化项目文件项目
 * @param {Object} item - 项目文件项目
 * @returns {string} 格式化后的内容
 */
function formatProjectFileItem(item) {
    const lines = [];
    lines.push(`# 项目文件 - ${item.fileName || '未知文件'}`);
    lines.push('');
    lines.push(`**文件名**: ${item.fileName || '未知'}`);
    lines.push(`**文件路径**: ${item.filePath || '未知'}`);
    lines.push(`**文件类型**: ${item.fileType || '未知'}`);
    lines.push(`**文件大小**: ${item.fileSize || '未知'}`);
    lines.push(`**最后修改时间**: ${item.lastModified ? new Date(item.lastModified).toLocaleString('zh-CN') : '未知'}`);
    lines.push(`**创建时间**: ${item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '未知'}`);
    lines.push('');
    
    if (item.description) {
        lines.push('## 文件描述');
        lines.push(item.description);
        lines.push('');
    }
    
    if (item.tags && item.tags.length > 0) {
        lines.push('## 标签');
        lines.push(item.tags.map(tag => `#${tag}`).join(' '));
        lines.push('');
    }
    
    if (item.content) {
        lines.push('## 文件内容');
        lines.push('```');
        lines.push(item.content);
        lines.push('```');
        lines.push('');
    }
    
    lines.push(`**导出时间**: ${new Date().toLocaleString('zh-CN')}`);
    
    return lines.join('\n');
}

/**
 * 格式化新闻项目
 * @param {Object} item - 新闻项目
 * @returns {string} 格式化后的内容
 */
function formatNewsItem(item) {
    const lines = [];
    lines.push(`# 新闻 - ${item.title || '未知标题'}`);
    lines.push('');
    lines.push(`**标题**: ${item.title || '未知'}`);
    lines.push(`**来源**: ${item.link ? `[${new URL(item.link).hostname}](${item.link})` : '未知'}`);
    lines.push(`**发布时间**: ${item.isoDate ? new Date(item.isoDate).toLocaleString('zh-CN') : '未知'}`);
    lines.push(`**分类**: ${item.category || '未知'}`);
    lines.push('');
    
    if (item.contentSnippet || item.content) {
        lines.push('## 内容摘要');
        lines.push(item.contentSnippet || item.content || '无摘要');
        lines.push('');
    }
    
    if (item.description) {
        lines.push('## 详细描述');
        lines.push(item.description);
        lines.push('');
    }
    
    if (item.tags && item.tags.length > 0) {
        lines.push('## 标签');
        lines.push(item.tags.map(tag => `#${tag}`).join(' '));
        lines.push('');
    }
    
    if (item.link) {
        lines.push('## 原文链接');
        lines.push(`[查看原文](${item.link})`);
        lines.push('');
    }
    
    lines.push(`**导出时间**: ${new Date().toLocaleString('zh-CN')}`);
    
    return lines.join('\n');
}

/**
 * 下载Blob文件
 * @param {Blob} blob - 要下载的Blob对象
 * @param {string} filename - 文件名
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = String(filename || '').replace(/\s+/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 获取当前日期字符串
 * @returns {string} 格式化的日期字符串
 */
function getCurrentDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}`;
}

/**
 * 生成优化的文件名
 * @param {string} baseName - 基础文件名
 * @param {string} category - 分类名称（可选）
 * @param {Object} data - 数据对象（可选）
 * @returns {string} 优化后的文件名
 */
function generateOptimizedFileName(baseName, category = '', data = null) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
    
    let fileName = baseName;
    
    // 添加分类信息
    if (category) {
        fileName += `_${category}`;
    }
    
    // 添加数据统计信息
    if (data) {
        const stats = [];
        if (data.dailyChecklist && data.dailyChecklist.length > 0) {
            stats.push(`清单${data.dailyChecklist.length}项`);
        }
        if (data.projectFiles && data.projectFiles.length > 0) {
            stats.push(`文件${data.projectFiles.length}个`);
        }
        if (data.news && data.news.length > 0) {
            stats.push(`新闻${data.news.length}条`);
        }
        
        if (stats.length > 0) {
            fileName += `_${stats.join('_')}`;
        }
    }
    
    // 添加日期时间
    fileName += `_${dateStr}_${timeStr}`;
    
    return String(fileName || '').replace(/\s+/g, '_');
}

/**
 * 生成优化的item文件名
 * @param {Object} item - 数据项
 * @param {string} category - 分类名称
 * @param {number} index - 索引
 * @returns {string} 优化后的文件名
 */
function generateItemFileName(item, category, index) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    
    let fileName = category;
    
    switch (category) {
        case '每日清单':
            // 使用时段名称，不添加每日清单前缀
            const timeSlot = item.time || item.name || `时段${index + 1}`;
            const cleanTimeSlot = timeSlot.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '_');
            fileName = cleanTimeSlot;
            break;
            
        case '项目文件':
            // 使用文件名，如果文件类型不是unknown则添加文件类型
            const fileName_part = item.fileName || item.fileId || `文件${index + 1}`;
            const fileType = item.fileType;
            // 移除原有的文件扩展名，避免重复
            const baseFileName = fileName_part.replace(/\.[^/.]+$/, '');
            const cleanFileName = baseFileName.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '_');
            
            if (fileType && fileType !== 'unknown') {
                fileName = `${cleanFileName}_${fileType}`;
            } else {
                fileName = cleanFileName;
            }
            break;
            
        case '新闻':
            // 使用标题和来源，不添加新闻前缀，不添加日期后缀
            const title = item.title || `新闻${index + 1}`;
            const source = item.link ? new URL(item.link).hostname : '未知来源';
            const cleanTitle = title.substring(0, 30).replace(/\s+/g, '_').replace(/[<>:"/\\|?*\n\r]/g, '_');
            const cleanSource = source.replace(/\s+/g, '_').replace(/[<>:"/\\|?*]/g, '_');
            fileName = `${cleanTitle}_${cleanSource}`;
            break;
            
        default:
            fileName = `${category}_${index + 1}`;
    }
    
    // 添加日期（可选，但新闻和项目文件不添加日期后缀）
    if (category !== '新闻' && category !== '项目文件' && (item.isoDate || item.timestamp || item.createdAt)) {
        const itemDate = new Date(item.isoDate || item.timestamp || item.createdAt);
        const itemDateStr = itemDate.toISOString().slice(0, 10);
        fileName += `_${itemDateStr}`;
    }
    
    // 确保文件名不超过100个字符
    if (fileName.length > 100) {
        fileName = fileName.substring(0, 97) + '...';
    }
    
    return String(fileName || '').replace(/\s+/g, '_');
}

/**
 * 导出单个分类的数据
 * @param {Array} data - 数据数组
 * @param {string} category - 分类名称
 * @param {string} filename - 文件名前缀
 */
export async function exportCategoryData(data, category, filename = 'export') {
    if (!data || data.length === 0) {
        console.warn(`[ExportUtils] ${category} 数据为空，跳过导出`);
        return false;
    }
    
    try {
        // 等待JSZip加载完成
        const JSZip = await waitForJSZip();
        const zip = new JSZip();
        const categoryDir = zip.folder(String(category || '').replace(/\s+/g, '_'));
        
        data.forEach((item, index) => {
            let content = '';
            switch (category) {
                case '每日清单':
                    content = formatDailyChecklistItem(item);
                    break;
                case '项目文件':
                    content = formatProjectFileItem(item);
                    break;
                case '新闻':
                    content = formatNewsItem(item);
                    break;
                default:
                    content = JSON.stringify(item, null, 2);
            }
            const fileName = generateItemFileName(item, category, index);
            categoryDir.file(`${String(fileName || '').replace(/\s+/g, '_')}.md`, content);
        });
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // 生成优化的文件名
        const optimizedFileName = generateOptimizedFileName(filename, category, { [category.toLowerCase()]: data });
        
        downloadBlob(zipBlob, `${optimizedFileName}.zip`);
        
        console.log(`[ExportUtils] ${category} 导出成功`);
        return true;
    } catch (error) {
        console.error(`[ExportUtils] ${category} 导出失败:`, error);
        return false;
    }
}

// 导出到全局
window.ExportUtils = {
    exportToZip,
    exportCategoryData
};
