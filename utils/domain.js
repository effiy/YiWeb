/**
 * 域名相关工具函数
 * author: liangliang
 */

/**
 * 从URL中提取域名
 * @param {string} url - 完整的URL
 * @returns {string} 域名，如果提取失败返回空字符串
 */
export function extractDomain(url) {
    if (!url || typeof url !== 'string') {
        return '';
    }
    
    try {
        // 确保URL有协议
        let urlToProcess = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            urlToProcess = 'https://' + url;
        }
        
        const urlObj = new URL(urlToProcess);
        return urlObj.hostname;
    } catch (error) {
        console.warn('[extractDomain] URL解析失败:', url, error);
        return '';
    }
}

/**
 * 从域名中提取主域名（去掉www前缀）
 * @param {string} domain - 完整域名
 * @returns {string} 主域名
 */
export function getMainDomain(domain) {
    if (!domain) return '';
    
    // 去掉www前缀
    if (domain.startsWith('www.')) {
        return domain.substring(4);
    }
    
    return domain;
}

/**
 * 获取域名的显示名称（用于分类显示）
 * @param {string} domain - 完整域名
 * @returns {string} 显示名称
 */
export function getDomainDisplayName(domain) {
    if (!domain) return '未知来源';
    
    const mainDomain = getMainDomain(domain);
    
    // 常见域名的中文显示名称映射
    const domainNames = {
        'github.com': 'GitHub',
        'stackoverflow.com': 'Stack Overflow',
        'medium.com': 'Medium',
        'dev.to': 'Dev.to',
        'hackernews.com': 'Hacker News',
        'reddit.com': 'Reddit',
        'youtube.com': 'YouTube',
        'twitter.com': 'Twitter',
        'linkedin.com': 'LinkedIn',
        'zhihu.com': '知乎',
        'juejin.cn': '掘金',
        'csdn.net': 'CSDN',
        'segmentfault.com': '思否',
        'infoq.cn': 'InfoQ',
        'oschina.net': '开源中国',
        '51cto.com': '51CTO',
        'cnblogs.com': '博客园',
        'iteye.com': 'ITeye',
        'developer.mozilla.org': 'MDN',
        'w3schools.com': 'W3Schools',
        'freecodecamp.org': 'FreeCodeCamp',
        'codepen.io': 'CodePen',
        'jsfiddle.net': 'JSFiddle',
        'codewars.com': 'Codewars',
        'leetcode.com': 'LeetCode',
        'geeksforgeeks.org': 'GeeksforGeeks',
        'tutorialspoint.com': 'TutorialsPoint',
        'w3schools.com': 'W3Schools'
    };
    
    return domainNames[mainDomain] || mainDomain;
}

/**
 * 根据域名获取分类信息
 * @param {string} domain - 完整域名
 * @returns {Object} 分类信息
 */
export function getDomainCategory(domain) {
    if (!domain) {
        return {
            key: 'unknown',
            title: '未知来源',
            icon: 'fas fa-question-circle',
            color: '#6c757d'
        };
    }
    
    const mainDomain = getMainDomain(domain);
    const displayName = getDomainDisplayName(domain);
    
    // 根据域名特征进行分类
    if (mainDomain.includes('github.com')) {
        return {
            key: 'github',
            title: displayName,
            icon: 'fab fa-github',
            color: '#24292e'
        };
    } else if (mainDomain.includes('stackoverflow.com')) {
        return {
            key: 'stackoverflow',
            title: displayName,
            icon: 'fab fa-stack-overflow',
            color: '#f48024'
        };
    } else if (mainDomain.includes('medium.com') || mainDomain.includes('dev.to')) {
        return {
            key: 'tech-blog',
            title: displayName,
            icon: 'fas fa-blog',
            color: '#00ab6c'
        };
    } else if (mainDomain.includes('youtube.com')) {
        return {
            key: 'video',
            title: displayName,
            icon: 'fab fa-youtube',
            color: '#ff0000'
        };
    } else if (mainDomain.includes('zhihu.com') || mainDomain.includes('juejin.cn') || 
               mainDomain.includes('csdn.net') || mainDomain.includes('segmentfault.com')) {
        return {
            key: 'chinese-tech',
            title: displayName,
            icon: 'fas fa-globe-asia',
            color: '#1890ff'
        };
    } else if (mainDomain.includes('reddit.com') || mainDomain.includes('hackernews.com')) {
        return {
            key: 'community',
            title: displayName,
            icon: 'fas fa-users',
            color: '#ff6b35'
        };
    } else if (mainDomain.includes('developer.mozilla.org') || mainDomain.includes('w3schools.com')) {
        return {
            key: 'documentation',
            title: displayName,
            icon: 'fas fa-book',
            color: '#4caf50'
        };
    } else if (mainDomain.includes('leetcode.com') || mainDomain.includes('codewars.com')) {
        return {
            key: 'coding-challenge',
            title: displayName,
            icon: 'fas fa-code',
            color: '#9c27b0'
        };
    } else {
        return {
            key: 'other',
            title: displayName,
            icon: 'fas fa-external-link-alt',
            color: '#6c757d'
        };
    }
}

/**
 * 从新闻项中提取域名分类信息
 * @param {Object} item - 新闻项
 * @returns {Object} 域名分类信息
 */
export function extractDomainCategory(item) {
    if (!item || !item.link) {
        return getDomainCategory('');
    }
    
    const domain = extractDomain(item.link);
    return getDomainCategory(domain);
}
