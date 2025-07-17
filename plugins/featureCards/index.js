/**
 * 功能卡片插件
 * author: liangliang
 * 
 * 提供功能卡片的展示和交互功能
 */

import BasePlugin from '../../js/core/basePlugin.js';

class FeatureCardsPlugin extends BasePlugin {
  constructor(options = {}) {
    super({
      name: 'featureCards',
      version: '1.0.0',
      ...options
    });

    this.cards = [
      {
        id: 'data-analysis',
        title: '智能数据分析',
        description: '运用先进的AI算法，将海量数据转化为精准洞察。从趋势预测到异常检测，让数据为您讲述完整的故事，助力科学决策。',
        icon: 'fas fa-chart-line',
        badge: '数据分析',
        features: ['🧠 知识问答', '📈 智能统计', '🔮 趋势预测'],
        stats: [
          { number: '100+', label: '工作流程' },
          { number: '∞', label: '生活场景' },
          { number: '99.9%', label: '学习效率' }
        ],
        hint: '🧪 上传数据开始智能分析',
        footerIcon: 'fas fa-flask',
        style: 'scientist-card',
        feature: '数据分析'
      },
      {
        id: 'code-writing',
        title: '智能代码助手',
        description: '从命令脚本到规范制度，AI助您快速生成高质量代码和文档。提供最佳实践指导和详细注释，让开发工作更加规范高效。',
        icon: 'fas fa-code',
        badge: '代码编写',
        features: ['💻 命令脚本', '📋 规范制度', '✨ 最佳实践'],
        stats: [
          { number: '100%', label: '规范制度' },
          { number: '∞', label: '脚本生成' },
          { number: '100+', label: '最佳实践' }
        ],
        hint: '⚡ 描述需求开始智能编码',
        footerIcon: 'fas fa-terminal',
        style: 'geek-card',
        feature: '代码编写'
      },
      {
        id: 'image-generation',
        title: 'AI艺术创作',
        description: '释放您的创意潜能，通过AI技术将文字描述转化为精美视觉作品。从文本生成图像到图像风格转换，为您提供全方位的AI艺术体验。',
        icon: 'fas fa-palette',
        badge: '生图创造',
        features: ['🖼️ 文字生图', '🎭 图像生图', '🎬 视频生成'],
        stats: [
          { number: '100+', label: '艺术风格' },
          { number: '∞', label: '生成速度' },
          { number: '4K', label: '高清画质' }
        ],
        hint: '🎨 描述创意开始艺术创作',
        footerIcon: 'fas fa-magic',
        style: 'artist-card',
        feature: '图表绘制'
      }
    ];

    this.container = null;
    this.cardElements = [];
  }

  /**
   * 初始化插件
   */
  init() {
    super.init();
    
    try {
      this.loadStyles();
      this.createFeatureCards();
      this.bindEvents();
      this.log('功能卡片插件初始化完成');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * 加载样式文件
   */
  loadStyles() {
    const cssFiles = [
      '/plugins/featureCards/index.css'
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
   * 创建功能卡片
   */
  createFeatureCards() {
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

    // 创建容器
    const container = this.createElement('div', { className: 'container' });
    const cardsContainer = this.createElement('div', { className: 'feature-cards-container' });
    const cardsGrid = this.createElement('div', {
      className: 'feature-cards-grid',
      role: 'grid',
      'aria-label': '功能卡片网格'
    });

    // 创建卡片
    this.cards.forEach((card, index) => {
      const cardElement = this.createCard(card, index);
      cardsGrid.appendChild(cardElement);
      this.cardElements.push(cardElement);
    });

    cardsContainer.appendChild(cardsGrid);
    container.appendChild(cardsContainer);
    
    // 清空并添加新内容
    mainContainer.innerHTML = '';
    mainContainer.appendChild(container);
    
    this.container = container;
  }

  /**
   * 创建单个卡片
   */
  createCard(cardData, index) {
    const cardRow = this.createElement('div', { role: 'row' });
    const card = this.createElement('article', {
      className: `feature-card ${cardData.style}`,
      'data-feature': cardData.feature,
      role: 'gridcell'
    });

    // 卡片头部
    const cardHeader = this.createElement('div', { className: 'card-header' });
    
    const cardIcon = this.createElement('div', { className: 'card-icon' });
    cardIcon.setAttribute('aria-hidden', 'true');
    cardIcon.innerHTML = `<i class="${cardData.icon}" aria-label="${cardData.title}图标"></i>`;
    
    const cardBadge = this.createElement('div', { className: 'card-badge' });
    cardBadge.textContent = cardData.badge;
    
    cardHeader.appendChild(cardIcon);
    cardHeader.appendChild(cardBadge);

    // 卡片内容
    const cardContent = this.createElement('div', { className: 'card-content' });
    
    const cardTitle = this.createElement('h3', { className: 'card-title' });
    cardTitle.innerHTML = `<i class="${cardData.icon}" aria-hidden="true"></i> ${cardData.title}`;
    
    const cardDescription = this.createElement('p', { className: 'card-description' });
    cardDescription.textContent = cardData.description;
    
    // 功能特性
    const cardFeatures = this.createElement('div', {
      className: 'card-features',
      role: 'list',
      'aria-label': '功能特性'
    });
    
    cardData.features.forEach(feature => {
      const featureTag = this.createElement('span', {
        className: 'feature-tag',
        role: 'listitem'
      });
      featureTag.textContent = feature;
      cardFeatures.appendChild(featureTag);
    });

    // 统计数据
    const cardStats = this.createElement('div', {
      className: 'card-stats',
      role: 'list',
      'aria-label': '统计数据'
    });
    
    cardData.stats.forEach(stat => {
      const statItem = this.createElement('div', {
        className: 'stat-item',
        role: 'listitem'
      });
      
      const statNumber = this.createElement('span', { className: 'stat-number' });
      statNumber.textContent = stat.number;
      
      const statLabel = this.createElement('span', { className: 'stat-label' });
      statLabel.textContent = stat.label;
      
      statItem.appendChild(statNumber);
      statItem.appendChild(statLabel);
      cardStats.appendChild(statItem);
    });

    cardContent.appendChild(cardTitle);
    cardContent.appendChild(cardDescription);
    cardContent.appendChild(cardFeatures);
    cardContent.appendChild(cardStats);

    // 卡片底部
    const cardFooter = this.createElement('div', { className: 'card-footer' });
    
    const cardHint = this.createElement('span', { className: 'card-hint' });
    cardHint.textContent = cardData.hint;
    
    const footerIcon = this.createElement('i', {
      className: cardData.footerIcon,
      'aria-hidden': 'true'
    });
    
    cardFooter.appendChild(cardHint);
    cardFooter.appendChild(footerIcon);

    // 组装卡片
    card.appendChild(cardHeader);
    card.appendChild(cardContent);
    card.appendChild(cardFooter);
    
    cardRow.appendChild(card);
    return cardRow;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    this.cardElements.forEach((cardElement, index) => {
      const card = cardElement.querySelector('.feature-card');
      if (card) {
        // 点击事件
        this.addEvent(card, 'click', () => {
          const feature = card.getAttribute('data-feature');
          this.handleCardClick(feature, this.cards[index]);
        });

        // 鼠标悬停事件
        this.addEvent(card, 'mouseenter', () => {
          this.addClass(card, 'hover');
        });

        this.addEvent(card, 'mouseleave', () => {
          this.removeClass(card, 'hover');
        });

        // 键盘事件
        this.addEvent(card, 'keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const feature = card.getAttribute('data-feature');
            this.handleCardClick(feature, this.cards[index]);
          }
        });
      }
    });
  }

  /**
   * 处理卡片点击
   */
  handleCardClick(feature, cardData) {
    this.log(`功能卡片点击: ${feature}`);
    
    // 触发自定义事件
    this.emit('card-click', {
      feature,
      cardData,
      timestamp: Date.now()
    });

    // 根据功能类型执行不同操作
    switch (feature) {
      case '数据分析':
        this.handleDataAnalysis();
        break;
      case '代码编写':
        this.handleCodeWriting();
        break;
      case '图表绘制':
        this.handleImageGeneration();
        break;
      default:
        this.log(`未知功能: ${feature}`, 'warn');
    }
  }

  /**
   * 处理数据分析功能
   */
  handleDataAnalysis() {
    this.log('启动数据分析功能');
    // 这里可以添加具体的业务逻辑
    this.emit('data-analysis-start');
  }

  /**
   * 处理代码编写功能
   */
  handleCodeWriting() {
    this.log('启动代码编写功能');
    // 这里可以添加具体的业务逻辑
    this.emit('code-writing-start');
  }

  /**
   * 处理图像生成功能
   */
  handleImageGeneration() {
    this.log('启动图像生成功能');
    // 这里可以添加具体的业务逻辑
    this.emit('image-generation-start');
  }

  /**
   * 添加新卡片
   */
  addCard(cardData) {
    this.cards.push(cardData);
    this.refreshCards();
  }

  /**
   * 移除卡片
   */
  removeCard(cardId) {
    const index = this.cards.findIndex(card => card.id === cardId);
    if (index !== -1) {
      this.cards.splice(index, 1);
      this.refreshCards();
    }
  }

  /**
   * 刷新卡片
   */
  refreshCards() {
    if (this.container) {
      this.createFeatureCards();
    }
  }

  /**
   * 获取卡片数据
   */
  getCards() {
    return [...this.cards];
  }

  /**
   * 设置卡片数据
   */
  setCards(cards) {
    this.cards = [...cards];
    this.refreshCards();
  }

  /**
   * 销毁插件
   */
  destroy() {
    // 清理卡片元素
    this.cardElements = [];
    
    super.destroy();
  }

  /**
   * 触发自定义事件
   */
  emit(eventName, data) {
    const event = new CustomEvent(`featureCards:${eventName}`, {
      detail: data,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
}

export default FeatureCardsPlugin; 