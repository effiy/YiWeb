/**
 * 新闻列表插件
 * author: liangliang
 * 
 * 提供新闻内容的展示和交互功能
 */

import BasePlugin from '../../js/core/basePlugin.js';

class NewsListPlugin extends BasePlugin {
  constructor(options = {}) {
    super({
      name: 'newsList',
      version: '1.0.0',
      ...options
    });

    this.newsData = [];
    this.loading = false;
    this.error = '';
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedCategories = new Set();
    this.clickedItems = new Set();
    this.hasNewsData = false;
    this.currentDateDisplay = '';

    this.container = null;
    this.newsElements = [];
  }

  /**
   * 初始化插件
   */
  init() {
    super.init();
    
    try {
      this.loadStyles();
      this.createNewsList();
      this.bindEvents();
      this.loadNewsData();
      this.log('新闻列表插件初始化完成');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 加载样式文件
   */
  loadStyles() {
    const cssFiles = [
      '/plugins/newsList/index.css'
    ];
    
    cssFiles.forEach(cssFile => {
      if (!document.querySelector(`link[href*="${cssFile}"]`)) {
        const link = this.createElement('link', {
          rel: 'stylesheet',
          href: cssFile,
          type: 'text/css'
        });
        document.head.appendChild(link);
      }
    });
  }

  /**
   * 创建新闻列表
   */
  createNewsList() {
    // 查找或创建主容器
    let mainContainer = this.findElement('.main-content');
    
    if (!mainContainer) {
      mainContainer = this.createElement('main', {
        className: 'main-content',
        role: 'main'
      });
      
      // 插入到页面中
      const body = document.body;
      const header = this.findElement('.header-row');
      if (header && header.nextSibling) {
        body.insertBefore(mainContainer, header.nextSibling);
      } else {
        body.appendChild(mainContainer);
      }
    }

    // 创建新闻列表容器
    const newsContainer = this.createElement('div', { className: 'news-container' });
    
    // 创建日期显示
    const dateDisplay = this.createElement('div', { className: 'date-display' });
    dateDisplay.textContent = this.currentDateDisplay || this.getCurrentDate();
    
    // 创建新闻列表
    const newsList = this.createElement('div', { 
      className: 'news-list',
      role: 'list',
      'aria-label': '新闻列表'
    });

    // 创建加载指示器
    const loadingIndicator = this.createElement('div', {
      className: 'loading-indicator',
      'aria-hidden': 'true'
    });
    loadingIndicator.innerHTML = '<div class="loading-spinner"></div>';

    // 创建错误显示
    const errorDisplay = this.createElement('div', {
      className: 'error-display',
      'aria-live': 'polite'
    });

    // 组装容器
    newsContainer.appendChild(dateDisplay);
    newsContainer.appendChild(newsList);
    newsContainer.appendChild(loadingIndicator);
    newsContainer.appendChild(errorDisplay);
    
    // 清空并添加新内容
    mainContainer.innerHTML = '';
    mainContainer.appendChild(newsContainer);
    
    this.container = newsContainer;
    this.newsList = newsList;
    this.loadingIndicator = loadingIndicator;
    this.errorDisplay = errorDisplay;
  }

  /**
   * 获取当前日期
   */
  getCurrentDate() {
    const now = new Date();
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    };
    return now.toLocaleDateString('zh-CN', options);
  }

  /**
   * 加载新闻数据
   */
  async loadNewsData() {
    this.setLoading(true);
    this.clearError();
    
    try {
      // 模拟API调用
      const response = await this.fetchNewsData();
      this.newsData = response.data || [];
      this.hasNewsData = this.newsData.length > 0;
      
      this.renderNews();
      this.emit('news-data-loaded', this.newsData);
    } catch (error) {
      this.setError('加载新闻数据失败: ' + error.message);
      this.emit('news-data-error', error);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 模拟获取新闻数据
   */
  async fetchNewsData() {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟新闻数据
    return {
      data: [
        {
          id: 1,
          title: 'AI技术突破：新型神经网络架构提升性能30%',
          content: '最新研究显示，新型神经网络架构在多个基准测试中表现优异，性能提升达到30%。这项技术有望在图像识别、自然语言处理等领域带来重大突破。',
          excerpt: '最新研究显示，新型神经网络架构在多个基准测试中表现优异...',
          url: 'https://example.com/news/1',
          publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          categories: ['AI技术'],
          source: '科技日报'
        },
        {
          id: 2,
          title: '数据分析工具更新：支持实时数据处理',
          content: '新一代数据分析工具发布，新增实时数据处理功能，支持流式数据分析和实时可视化，为大数据处理提供更强大的解决方案。',
          excerpt: '新一代数据分析工具发布，新增实时数据处理功能...',
          url: 'https://example.com/news/2',
          publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          categories: ['数据分析'],
          source: '数据科学周刊'
        },
        {
          id: 3,
          title: '编程语言排行榜：Python连续三年蝉联第一',
          content: '最新编程语言排行榜发布，Python凭借其在AI、数据科学等领域的广泛应用，连续三年蝉联最受欢迎编程语言榜首。',
          excerpt: '最新编程语言排行榜发布，Python连续三年蝉联第一...',
          url: 'https://example.com/news/3',
          publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          categories: ['代码开发'],
          source: '开发者社区'
        }
      ]
    };
  }

  /**
   * 渲染新闻列表
   */
  renderNews() {
    if (!this.newsList) return;

    this.newsList.innerHTML = '';
    this.newsElements = [];

    const displayData = this.searchQuery ? this.searchResults : this.newsData;
    
    if (displayData.length === 0) {
      this.showEmptyState();
      return;
    }

    displayData.forEach((item, index) => {
      const newsElement = this.createNewsItem(item, index);
      this.newsList.appendChild(newsElement);
      this.newsElements.push(newsElement);
    });
  }

  /**
   * 创建新闻项
   */
  createNewsItem(item, index) {
    const newsItem = this.createElement('article', {
      className: 'news-item',
      role: 'listitem',
      'data-news-id': item.id
    });

    // 检查是否应该高亮
    if (this.isHighlighted(item)) {
      this.addClass(newsItem, 'highlighted');
    }

    // 检查是否已点击
    if (this.clickedItems.has(item.id)) {
      this.addClass(newsItem, 'clicked');
    }

    // 新闻标题
    const title = this.createElement('h3', { className: 'news-title' });
    title.textContent = item.title;

    // 新闻摘要
    const excerpt = this.createElement('p', { className: 'news-excerpt' });
    excerpt.textContent = this.extractExcerpt(item);

    // 新闻元信息
    const meta = this.createElement('div', { className: 'news-meta' });
    
    const timeAgo = this.createElement('span', { className: 'news-time' });
    timeAgo.textContent = this.getTimeAgo(item.publishedAt);
    
    const source = this.createElement('span', { className: 'news-source' });
    source.textContent = item.source || '未知来源';

    meta.appendChild(timeAgo);
    meta.appendChild(source);

    // 分类标签
    const categories = this.createElement('div', { className: 'news-categories' });
    const categoryTags = this.getCategoryTag(item);
    
    categoryTags.forEach(tag => {
      const categoryTag = this.createElement('span', { className: 'category-tag' });
      categoryTag.textContent = tag;
      categories.appendChild(categoryTag);
    });

    // 组装新闻项
    newsItem.appendChild(title);
    newsItem.appendChild(excerpt);
    newsItem.appendChild(meta);
    newsItem.appendChild(categories);

    // 添加点击事件
    this.addEvent(newsItem, 'click', () => {
      this.handleNewsClick(item);
    });

    return newsItem;
  }

  /**
   * 显示空状态
   */
  showEmptyState() {
    const emptyState = this.createElement('div', { className: 'empty-state' });
    emptyState.innerHTML = `
      <div class="empty-icon">📰</div>
      <h3>暂无新闻</h3>
      <p>当前没有可显示的新闻内容</p>
    `;
    this.newsList.appendChild(emptyState);
  }

  /**
   * 设置加载状态
   */
  setLoading(loading) {
    this.loading = loading;
    if (this.loadingIndicator) {
      if (loading) {
        this.showElement(this.loadingIndicator);
      } else {
        this.hideElement(this.loadingIndicator);
      }
    }
  }

  /**
   * 设置错误信息
   */
  setError(message) {
    this.error = message;
    if (this.errorDisplay) {
      this.errorDisplay.textContent = message;
      this.showElement(this.errorDisplay);
    }
  }

  /**
   * 清除错误信息
   */
  clearError() {
    this.error = '';
    if (this.errorDisplay) {
      this.hideElement(this.errorDisplay);
    }
  }

  /**
   * 检查是否应该显示某个分类
   */
  shouldShowCategory(categoryKey) {
    return this.selectedCategories.size === 0 || this.selectedCategories.has(categoryKey);
  }

  /**
   * 检查新闻项是否高亮
   */
  isHighlighted(item) {
    if (!this.searchQuery) return false;
    const query = this.searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(query) || 
           (item.content && item.content.toLowerCase().includes(query));
  }

  /**
   * 获取分类标签
   */
  getCategoryTag(item) {
    if (item.categories && item.categories.length > 0) {
      return Array.isArray(item.categories) ? item.categories : [item.categories];
    }
    
    // 自动分类逻辑
    const title = item.title.toLowerCase();
    const content = (item.content || '').toLowerCase();
    
    if (title.includes('ai') || title.includes('人工智能') || content.includes('ai')) {
      return ['AI技术'];
    }
    if (title.includes('数据') || title.includes('分析') || content.includes('数据')) {
      return ['数据分析'];
    }
    if (title.includes('代码') || title.includes('开发') || title.includes('编程')) {
      return ['代码开发'];
    }
    if (title.includes('产品') || title.includes('手机') || title.includes('芯片')) {
      return ['科技产品'];
    }
    if (title.includes('商业') || title.includes('投资') || title.includes('融资')) {
      return ['商业资讯'];
    }
    
    return ['其他'];
  }

  /**
   * 获取时间差显示
   */
  getTimeAgo(isoDate) {
    if (!isoDate) return '未知时间';
    const now = new Date();
    const date = new Date(isoDate);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  }

  /**
   * 提取新闻摘要
   */
  extractExcerpt(item) {
    if (item.excerpt) return item.excerpt;
    if (item.content) {
      return item.content.substring(0, 150) + '...';
    }
    return '暂无摘要';
  }

  /**
   * 处理新闻点击
   */
  handleNewsClick(item) {
    this.clickedItems.add(item.id);
    this.log(`新闻点击: ${item.title}`);
    
    this.emit('news-click', {
      item,
      timestamp: Date.now()
    });

    // 更新UI
    const newsElement = this.findElement(`[data-news-id="${item.id}"]`);
    if (newsElement) {
      this.addClass(newsElement, 'clicked');
    }
  }

  /**
   * 搜索新闻
   */
  searchNews(query) {
    this.searchQuery = query;
    
    if (!query.trim()) {
      this.searchResults = [];
      this.renderNews();
      return;
    }

    const queryLower = query.toLowerCase();
    this.searchResults = this.newsData.filter(item => 
      item.title.toLowerCase().includes(queryLower) ||
      (item.content && item.content.toLowerCase().includes(queryLower))
    );

    this.renderNews();
    this.emit('news-search', {
      query,
      results: this.searchResults
    });
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听搜索事件
    document.addEventListener('searchHeader:search-input', (e) => {
      this.searchNews(e.detail);
    });

    // 监听搜索提交事件
    document.addEventListener('searchHeader:search-submit', (e) => {
      this.searchNews(e.detail);
    });
  }

  /**
   * 刷新新闻列表
   */
  refreshNews() {
    this.loadNewsData();
  }

  /**
   * 获取新闻数据
   */
  getNewsData() {
    return [...this.newsData];
  }

  /**
   * 设置新闻数据
   */
  setNewsData(data) {
    this.newsData = [...data];
    this.hasNewsData = this.newsData.length > 0;
    this.renderNews();
  }

  /**
   * 销毁插件
   */
  destroy() {
    // 清理新闻元素
    this.newsElements = [];
    
    // 清理数据
    this.newsData = [];
    this.searchResults = [];
    this.selectedCategories.clear();
    this.clickedItems.clear();
    
    super.destroy();
  }

  /**
   * 触发自定义事件
   */
  emit(eventName, data) {
    const event = new CustomEvent(`newsList:${eventName}`, {
      detail: data,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
}

export default NewsListPlugin; 