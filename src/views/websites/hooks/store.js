/**
 * 网站标签管理页面数据存储管理
 * author: liangliang
 */

import { getData } from '/src/services/index.js';

// 兼容Vue2和Vue3的ref获取方式
const vueRef = typeof Vue !== 'undefined' && Vue.ref ? Vue.ref : (val) => ({ value: val });

/**
 * 数据存储工厂函数
 * 管理网站数据、标签数据、过滤器数据、加载状态和错误信息
 * @returns {Object} store对象，包含sites, tags, filterBtns, loading, error等方法
 */
export const createStore = () => {
    // 网站数据
    const sites = vueRef([]);
    // 标签数据
    const tags = vueRef([]);
    // 过滤器按钮数据
    const filterBtns = vueRef([]);
    // 当前选中的分类
    const currentCategory = vueRef('all');
    // 搜索关键词
    const searchKeyword = vueRef('');
    // 加载状态
    const loading = vueRef(false);
    // 错误信息
    const error = vueRef(null);

    // 选中的标签
    const selectedTags = vueRef([]);

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    const generateId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    };

    /**
     * 异步加载网站数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadSites = async () => {
        loading.value = true;
        error.value = null;
        try {
            // 支持本地mock和远程接口切换
            const data = await getData('https://data.effiy.cn/mock/websites/sites.json');
            if (Array.isArray(data)) {
                // 为每个网站对象添加urlExpanded属性
                sites.value = data.map(site => ({
                    ...site,
                    urlExpanded: false
                }));
            } else {
                // 如果没有数据，使用默认数据
                sites.value = getDefaultSites();
            }
        } catch (err) {
            console.warn('加载网站数据失败，使用默认数据:', err);
            sites.value = getDefaultSites();
        } finally {
            loading.value = false;
        }
    };

    /**
     * 异步加载过滤器按钮数据
     * 支持多次调用，自动处理加载状态和错误
     */
    const loadFilterBtns = async () => {
        try {
            const data = await getData('https://data.effiy.cn/mock/websites/filterBtns.json');
            if (Array.isArray(data)) {
                filterBtns.value = data;
            } else {
                // 使用默认过滤器
                filterBtns.value = getDefaultFilterBtns();
            }
        } catch (err) {
            console.warn('加载过滤器数据失败，使用默认数据:', err);
            filterBtns.value = getDefaultFilterBtns();
        }
    };

    /**
     * 获取默认网站数据
     * @returns {Array} 默认网站数据
     */
    const getDefaultSites = () => {
        return [
            {
                id: '1',
                name: 'GitHub',
                url: 'https://github.com',
                description: '全球最大的代码托管平台，支持Git版本控制',
                category: '开发工具',
                tags: ['代码托管', 'Git', '开源'],
                favicon: 'https://github.com/favicon.ico',
                createdAt: '2024-01-15T10:00:00Z',
                urlExpanded: false
            },
            {
                id: '2',
                name: 'Stack Overflow',
                url: 'https://stackoverflow.com',
                description: '程序员问答社区，解决编程问题的最佳平台',
                category: '学习资源',
                tags: ['问答', '编程', '社区'],
                favicon: 'https://stackoverflow.com/favicon.ico',
                createdAt: '2024-01-16T14:30:00Z',
                urlExpanded: false
            },
            {
                id: '3',
                name: 'MDN Web Docs',
                url: 'https://developer.mozilla.org',
                description: 'Mozilla开发者网络，Web开发文档和教程',
                category: '学习资源',
                tags: ['文档', 'Web开发', '教程'],
                favicon: 'https://developer.mozilla.org/favicon.ico',
                createdAt: '2024-01-17T09:15:00Z',
                urlExpanded: false
            },
            {
                id: '4',
                name: 'Vue.js',
                url: 'https://vuejs.org',
                description: '渐进式JavaScript框架，易学易用',
                category: '开发工具',
                tags: ['Vue', 'JavaScript', '前端'],
                favicon: 'https://vuejs.org/favicon.ico',
                createdAt: '2024-01-18T16:45:00Z',
                urlExpanded: false
            },
            {
                id: '5',
                name: 'CSS-Tricks',
                url: 'https://css-tricks.com',
                description: 'CSS技巧和前端开发资源',
                category: '学习资源',
                tags: ['CSS', '前端', '技巧'],
                favicon: 'https://css-tricks.com/favicon.ico',
                createdAt: '2024-01-19T11:20:00Z',
                urlExpanded: false
            }
        ];
    };

    /**
     * 获取默认过滤器按钮数据
     * @returns {Array} 默认过滤器按钮数据
     */
    const getDefaultFilterBtns = () => {
        return [
            { id: 'all', name: '全部', icon: 'fas fa-globe', active: true },
            { id: '开发工具', name: '开发工具', icon: 'fas fa-code', active: false },
            { id: '学习资源', name: '学习资源', icon: 'fas fa-graduation-cap', active: false },
            { id: '设计工具', name: '设计工具', icon: 'fas fa-palette', active: false },
            { id: '效率工具', name: '效率工具', icon: 'fas fa-rocket', active: false }
        ];
    };

    /**
     * 切换当前分类
     * @param {string} category - 分类ID
     */
    const setCurrentCategory = (category) => {
        if (category && typeof category === 'string') {
            currentCategory.value = category;
            // 更新过滤器按钮状态
            filterBtns.value.forEach(btn => {
                btn.active = btn.id === category;
            });
        }
    };

    /**
     * 设置搜索关键词
     * @param {string} keyword - 搜索关键词
     */
    const setSearchKeyword = (keyword) => {
        if (typeof keyword === 'string') {
            searchKeyword.value = keyword.trim();
        }
    };

    /**
     * 添加新网站
     * @param {Object} siteData - 网站数据
     */
    const addSite = (siteData) => {
        const newSite = {
            ...siteData,
            id: generateId(),
            createdAt: new Date().toISOString()
        };
        sites.value.unshift(newSite);
        // 更新标签列表
        updateTagsList();
    };

    /**
     * 更新网站
     * @param {Object} siteData - 网站数据
     */
    const updateSite = (siteData) => {
        const index = sites.value.findIndex(site => site.id === siteData.id);
        if (index !== -1) {
            sites.value[index] = {
                ...sites.value[index],
                ...siteData,
                updatedAt: new Date().toISOString()
            };
            // 更新标签列表
            updateTagsList();
        }
    };

    /**
     * 删除网站
     * @param {string} siteId - 网站ID
     */
    const deleteSite = (siteId) => {
        const index = sites.value.findIndex(site => site.id === siteId);
        if (index !== -1) {
            sites.value.splice(index, 1);
            // 更新标签列表
            updateTagsList();
        }
    };

    /**
     * 更新标签列表
     */
    const updateTagsList = () => {
        const allTags = new Set();
        sites.value.forEach(site => {
            if (Array.isArray(site.tags)) {
                site.tags.forEach(tag => allTags.add(tag));
            }
        });
        tags.value = Array.from(allTags).sort();
    };

    /**
     * 添加新标签
     * @param {string} tagName - 标签名称
     */
    const addTag = (tagName) => {
        if (tagName && !tags.value.includes(tagName)) {
            tags.value.push(tagName);
            tags.value.sort();
        }
    };

    /**
     * 删除标签
     * @param {string} tagName - 标签名称
     */
    const deleteTag = (tagName) => {
        const index = tags.value.indexOf(tagName);
        if (index !== -1) {
            tags.value.splice(index, 1);
        }
    };

    /**
     * 获取标签使用次数
     * @param {string} tagName - 标签名称
     * @returns {number} 使用次数
     */
    const getTagCount = (tagName) => {
        return sites.value.filter(site => 
            Array.isArray(site.tags) && site.tags.includes(tagName)
        ).length;
    };



    // 自动初始化加载
    loadSites();
    loadFilterBtns();

    // 便于扩展：后续可添加更多数据和方法
    return {
        sites,                    // 网站数据
        tags,                     // 标签数据
        filterBtns,              // 过滤器按钮数据
        currentCategory,         // 当前选中的分类
        searchKeyword,           // 搜索关键词
        loading,                 // 加载状态
        error,                   // 错误信息
        selectedTags,            // 选中的标签
        loadSites,               // 手动刷新网站数据方法
        loadFilterBtns,          // 手动刷新过滤器数据方法
        setCurrentCategory,      // 切换分类方法
        setSearchKeyword,        // 设置搜索关键词方法
        addSite,                 // 添加网站方法
        updateSite,              // 更新网站方法
        deleteSite,              // 删除网站方法
        updateTagsList,          // 更新标签列表方法
        addTag,                  // 添加标签方法
        deleteTag,               // 删除标签方法
        getTagCount,             // 获取标签使用次数方法

        generateId               // 生成唯一ID方法
    };
}; 

