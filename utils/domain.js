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
        // 代码托管平台
        'github.com': 'GitHub',
        'github.io': 'GitHub Pages',
        'gitlab.com': 'GitLab',
        'bitbucket.org': 'Bitbucket',
        'gitee.com': 'Gitee',
        'sourceforge.net': 'SourceForge',
        
        // 技术问答社区
        'stackoverflow.com': 'Stack Overflow',
        'stackexchange.com': 'Stack Exchange',
        'segmentfault.com': '思否',
        
        // 技术博客平台
        'medium.com': 'Medium',
        'dev.to': 'Dev.to',
        'hashnode.com': 'Hashnode',
        'devblogs.microsoft.com': 'Microsoft DevBlogs',
        
        // 视频平台
        'youtube.com': 'YouTube',
        'youtu.be': 'YouTube',
        'bilibili.com': '哔哩哔哩',
        'vimeo.com': 'Vimeo',
        
        // 中文技术社区
        'zhihu.com': '知乎',
        'juejin.cn': '掘金',
        'csdn.net': 'CSDN',
        'infoq.cn': 'InfoQ',
        'oschina.net': '开源中国',
        '51cto.com': '51CTO',
        'cnblogs.com': '博客园',
        'iteye.com': 'ITeye',
        
        // 技术社区和论坛
        'hackernews.com': 'Hacker News',
        'news.ycombinator.com': 'Hacker News',
        'reddit.com': 'Reddit',
        'lobste.rs': 'Lobsters',
        'discord.com': 'Discord',
        'slack.com': 'Slack',
        
        // 技术文档和教程
        'developer.mozilla.org': 'MDN',
        'w3schools.com': 'W3Schools',
        'freecodecamp.org': 'FreeCodeCamp',
        'tutorialspoint.com': 'TutorialsPoint',
        'geeksforgeeks.org': 'GeeksforGeeks',
        'docs.microsoft.com': 'Microsoft Docs',
        'web.dev': 'Web.dev',
        
        // 编程挑战和练习
        'leetcode.com': 'LeetCode',
        'codewars.com': 'Codewars',
        'hackerrank.com': 'HackerRank',
        'codecademy.com': 'Codecademy',
        'exercism.io': 'Exercism',
        'topcoder.com': 'TopCoder',
        
        // 代码编辑器
        'codepen.io': 'CodePen',
        'jsfiddle.net': 'JSFiddle',
        
        // 云服务和平台
        'aws.amazon.com': 'AWS',
        'azure.microsoft.com': 'Azure',
        'cloud.google.com': 'Google Cloud',
        'heroku.com': 'Heroku',
        'vercel.com': 'Vercel',
        'netlify.com': 'Netlify',
        
        // 设计工具
        'figma.com': 'Figma',
        'sketch.com': 'Sketch',
        'adobe.com': 'Adobe',
        'canva.com': 'Canva',
        'dribbble.com': 'Dribbble',
        'behance.net': 'Behance',
        
        // 新闻和资讯
        'techcrunch.com': 'TechCrunch',
        'theverge.com': 'The Verge',
        'arstechnica.com': 'Ars Technica',
        'engadget.com': 'Engadget',
        'wired.com': 'Wired',
        'reuters.com': 'Reuters',
        'bbc.com': 'BBC',
        
        // 社交媒体
        'twitter.com': 'Twitter',
        'linkedin.com': 'LinkedIn',
        'facebook.com': 'Facebook',
        'instagram.com': 'Instagram',
        'tiktok.com': 'TikTok'
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
    
    // 定义域名分类规则映射
    const domainRules = [
        // GitHub 相关
        {
            patterns: ['github.com', 'github.io'],
            category: {
                key: 'github',
                icon: 'fab fa-github',
                color: '#24292e'
            }
        },
        // Stack Overflow 相关
        {
            patterns: ['stackoverflow.com', 'stackexchange.com'],
            category: {
                key: 'stackoverflow',
                icon: 'fab fa-stack-overflow',
                color: '#f48024'
            }
        },
        // 技术博客平台
        {
            patterns: ['medium.com', 'dev.to', 'hashnode.com', 'devblogs.microsoft.com'],
            category: {
                key: 'tech-blog',
                icon: 'fas fa-blog',
                color: '#00ab6c'
            }
        },
        // 视频平台
        {
            patterns: ['youtube.com', 'youtu.be', 'bilibili.com', 'vimeo.com'],
            category: {
                key: 'video',
                icon: 'fab fa-youtube',
                color: '#ff0000'
            }
        },
        // 中文技术社区
        {
            patterns: ['zhihu.com', 'juejin.cn', 'csdn.net', 'segmentfault.com', 'infoq.cn', 'oschina.net', '51cto.com', 'cnblogs.com', 'iteye.com'],
            category: {
                key: 'chinese-tech',
                icon: 'fas fa-globe-asia',
                color: '#1890ff'
            }
        },
        // 技术社区和论坛
        {
            patterns: ['reddit.com', 'hackernews.com', 'news.ycombinator.com', 'lobste.rs', 'discord.com', 'slack.com'],
            category: {
                key: 'community',
                icon: 'fas fa-users',
                color: '#ff6b35'
            }
        },
        // 技术文档和教程
        {
            patterns: ['developer.mozilla.org', 'w3schools.com', 'freecodecamp.org', 'tutorialspoint.com', 'geeksforgeeks.org', 'docs.microsoft.com', 'web.dev'],
            category: {
                key: 'documentation',
                icon: 'fas fa-book',
                color: '#4caf50'
            }
        },
        // 编程挑战和练习
        {
            patterns: ['leetcode.com', 'codewars.com', 'hackerrank.com', 'codecademy.com', 'exercism.io', 'topcoder.com'],
            category: {
                key: 'coding-challenge',
                icon: 'fas fa-code',
                color: '#9c27b0'
            }
        },
        // 代码托管和协作
        {
            patterns: ['gitlab.com', 'bitbucket.org', 'sourceforge.net', 'gitee.com'],
            category: {
                key: 'code-hosting',
                icon: 'fab fa-git-alt',
                color: '#f39c12'
            }
        },
        // 云服务和平台
        {
            patterns: ['aws.amazon.com', 'azure.microsoft.com', 'cloud.google.com', 'heroku.com', 'vercel.com', 'netlify.com'],
            category: {
                key: 'cloud-platform',
                icon: 'fas fa-cloud',
                color: '#3498db'
            }
        },
        // 设计工具
        {
            patterns: ['figma.com', 'sketch.com', 'adobe.com', 'canva.com', 'dribbble.com', 'behance.net'],
            category: {
                key: 'design-tools',
                icon: 'fas fa-palette',
                color: '#e74c3c'
            }
        },
        // 新闻和资讯
        {
            patterns: ['techcrunch.com', 'theverge.com', 'arstechnica.com', 'engadget.com', 'wired.com', 'reuters.com', 'bbc.com'],
            category: {
                key: 'tech-news',
                icon: 'fas fa-newspaper',
                color: '#2c3e50'
            }
        },
        // 社交媒体
        {
            patterns: ['twitter.com', 'linkedin.com', 'facebook.com', 'instagram.com', 'tiktok.com'],
            category: {
                key: 'social-media',
                icon: 'fas fa-share-alt',
                color: '#8e44ad'
            }
        }
    ];
    
    // 遍历规则进行匹配
    for (const rule of domainRules) {
        for (const pattern of rule.patterns) {
            if (mainDomain.includes(pattern)) {
                return {
                    key: rule.category.key,
                    title: displayName,
                    icon: rule.category.icon,
                    color: rule.category.color
                };
            }
        }
    }
    
    // 如果没有匹配到任何规则，返回其他分类
    return {
        key: 'other',
        title: displayName,
        icon: 'fas fa-external-link-alt',
        color: '#6c757d'
    };
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
