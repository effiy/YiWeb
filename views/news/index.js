/**
 * 新闻页主入口
 * author: liangliang
 */
import { createStore } from '/views/news/data/store/index.js';
import { useComputed } from '/views/news/hooks/useComputed.js';
import { useMethods } from '/views/news/hooks/useMethods.js';

const App = {
  setup() {
    // 1. 创建响应式状态
    const store = createStore();

    // 2. 组合计算属性
    const computedProps = useComputed(store);

    // 3. 组合常用方法
    const methods = useMethods(store);

    // 4. 组件挂载时自动初始化
    // 这里可以根据需要添加额外的生命周期逻辑

    // 5. 返回所有需要暴露给模板的数据和方法
    return {
      ...store,         // 响应式数据
      ...computedProps, // 计算属性
      ...methods        // 方法
    };
  }
};

// 创建Vue应用并注册组件
const app = Vue.createApp(App);

// 注册search-header组件
app.component('search-header', {
  name: 'SearchHeader',
  props: {
    searchQuery: {
      type: String,
      default: ''
    },
    categories: {
      type: Array,
      default: () => []
    },
    selectedCategories: {
      type: Set,
      default: () => new Set()
    },
    sidebarCollapsed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:searchQuery', 'search-keydown', 'clear-search', 'toggle-category', 'toggle-sidebar'],
  template: `
    <header class="search-header">
      <div class="search-container">
        <div class="search-input-wrapper">
          <i class="fas fa-search search-icon"></i>
          <input 
            type="text" 
            class="search-input" 
            placeholder="搜索新闻..." 
            :value="searchQuery"
            @input="$emit('update:searchQuery', $event.target.value)"
            @keydown="$emit('search-keydown', $event)"
          />
          <button 
            v-if="searchQuery" 
            class="clear-search-btn"
            @click="$emit('clear-search')"
            aria-label="清除搜索"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div class="category-filters">
        <div class="category-list">
          <button 
            v-for="category in categories" 
            :key="category"
            class="category-btn"
            :class="{ active: selectedCategories.has(category) }"
            @click="$emit('toggle-category', category)"
          >
            {{ category }}
          </button>
        </div>
      </div>
      
      <button 
        class="sidebar-toggle-btn"
        @click="$emit('toggle-sidebar')"
        aria-label="切换侧边栏"
      >
        <i class="fas fa-bars"></i>
      </button>
    </header>
  `
});

// 注册news-list组件
app.component('news-list', {
  name: 'NewsList',
  props: {
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: ''
    },
    currentDateDisplay: {
      type: String,
      default: ''
    },
    searchQuery: {
      type: String,
      default: ''
    },
    searchResults: {
      type: Array,
      default: () => []
    },
    displayCategories: {
      type: Object,
      default: () => ({})
    },
    selectedCategories: {
      type: Set,
      default: () => new Set()
    },
    clickedItems: {
      type: Set,
      default: () => new Set()
    },
    hasNewsData: {
      type: Boolean,
      default: false
    }
  },
  emits: ['load-news-data', 'news-click'],
  methods: {
    // 检查是否应该显示某个分类
    shouldShowCategory(categoryKey) {
      return this.selectedCategories.size === 0 || this.selectedCategories.has(categoryKey);
    },
    
    // 检查新闻项是否高亮
    isHighlighted(item) {
      if (!this.searchQuery) return false;
      const query = this.searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(query) || 
             (item.content && item.content.toLowerCase().includes(query));
    },
    
    // 获取分类标签
    getCategoryTag(item) {
      // 优先显示 item.categories 中的标签
      if (item.categories && item.categories.length > 0) {
        // 如果 categories 是数组，返回数组
        if (Array.isArray(item.categories)) {
          return item.categories;
        }
        // 如果 categories 是字符串，返回包含该字符串的数组
        if (typeof item.categories === 'string') {
          return [item.categories];
        }
      }
      
      // 如果没有 categories，则使用自动分类
      const CATEGORIES = [
        { key: 'ai', title: 'AI技术' },
        { key: 'data', title: '数据分析' },
        { key: 'code', title: '代码开发' },
        { key: 'tech', title: '科技产品' },
        { key: 'business', title: '商业资讯' },
        { key: 'other', title: '其他' }
      ];
      
      // 简单的分类逻辑
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
    },
    
    // 获取时间差显示
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
    },
    
    // 提取新闻摘要
    extractExcerpt(item) {
      if (item.excerpt) return item.excerpt;
      if (item.content) {
        return item.content.substring(0, 150) + '...';
      }
      return '暂无摘要';
    },
    
    // 处理新闻点击
    handleNewsClick(item) {
      this.$emit('news-click', item);
    }
  },
  template: `
    <section class="news-list-container">
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载新闻数据...</p>
      </div>
      
      <div v-else-if="error" class="error-container">
        <div class="error-icon">⚠️</div>
        <p class="error-message">{{ error }}</p>
        <button @click="$emit('load-news-data')" class="retry-btn">重试</button>
      </div>
      
      <div v-else-if="!hasNewsData" class="empty-container">
        <div class="empty-icon">📰</div>
        <p class="empty-message">暂无新闻数据</p>
        <button @click="$emit('load-news-data')" class="load-btn">加载新闻</button>
      </div>
      
      <div v-else class="news-content">
        <div class="news-header">
          <h2 class="news-title">{{ currentDateDisplay }} 新闻</h2>
        </div>
        
        <div class="news-items">
          <article 
            v-for="item in searchResults" 
            :key="item.id || item.title"
            class="news-item"
            :class="{ 
              'highlighted': isHighlighted(item),
              'clicked': clickedItems.has(item.id || item.title)
            }"
            @click="handleNewsClick(item)"
          >
            <div class="news-item-header">
              <h3 class="news-item-title">{{ item.title }}</h3>
              <div class="news-item-meta">
                <span class="news-item-time">{{ getTimeAgo(item.publishedAt || item.date) }}</span>
                <div class="news-item-tags">
                  <span 
                    v-for="tag in getCategoryTag(item)" 
                    :key="tag"
                    class="news-item-tag"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="news-item-content">
              <p class="news-item-excerpt">{{ extractExcerpt(item) }}</p>
            </div>
            
            <div class="news-item-footer">
              <a 
                v-if="item.url" 
                :href="item.url" 
                target="_blank" 
                rel="noopener noreferrer"
                class="news-item-link"
                @click.stop
              >
                阅读原文 <i class="fas fa-external-link-alt"></i>
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  `
});

// 注册calendar组件
app.component('calendar', {
  name: 'Calendar',
  props: {
    currentDate: {
      type: Date,
      default: () => new Date()
    },
    currentDateDisplay: {
      type: String,
      default: ''
    },
    currentDateSubtitle: {
      type: String,
      default: ''
    },
    isToday: {
      type: Boolean,
      default: true
    },
    isFutureDate: {
      type: Boolean,
      default: false
    },
    sidebarCollapsed: {
      type: Boolean,
      default: false
    },
    calendarDate: {
      type: Date,
      default: () => new Date()
    },
    calendarTitle: {
      type: String,
      default: ''
    },
    isCurrentMonth: {
      type: Boolean,
      default: true
    },
    calendarDays: {
      type: Array,
      default: () => []
    },
    selectedDate: {
      type: Date,
      default: () => new Date()
    }
  },
  emits: ['go-to-previous-day', 'go-to-next-day', 'go-to-today', 'previous-month', 'next-month', 'select-date'],
  computed: {
    weekdays() {
      return ['日', '一', '二', '三', '四', '五', '六'];
    }
  },
  methods: {
    // 获取日期字符串
    getDateString(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  },
  template: `
    <div class="calendar-container">
      <div class="date-navigation" v-show="!sidebarCollapsed">
        <div class="date-display">
          <h3 class="current-date">{{ currentDateDisplay }}</h3>
          <p v-if="currentDateSubtitle" class="date-subtitle">{{ currentDateSubtitle }}</p>
        </div>
        
        <div class="date-controls">
          <button 
            class="nav-btn"
            @click="$emit('go-to-previous-day')"
            aria-label="前一天"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          
          <button 
            v-if="!isToday"
            class="today-btn"
            @click="$emit('go-to-today')"
            aria-label="回到今天"
          >
            今天
          </button>
          
          <button 
            class="nav-btn"
            @click="$emit('go-to-next-day')"
            :disabled="isFutureDate"
            aria-label="后一天"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
      
      <div class="mini-calendar" v-show="!sidebarCollapsed" role="region" aria-label="日历导航">
        <div class="calendar-header">
          <button 
            class="calendar-nav-btn"
            @click="$emit('previous-month')"
            aria-label="上个月"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          
          <div class="calendar-title" role="heading" aria-level="3">{{ calendarTitle }}</div>
          
          <button 
            class="calendar-nav-btn"
            @click="$emit('next-month')"
            aria-label="下个月"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
        
        <div class="calendar-weekdays" role="rowgroup">
          <div 
            v-for="weekday in weekdays" 
            :key="weekday"
            class="calendar-weekday"
            role="columnheader"
          >
            {{ weekday }}
          </div>
        </div>
        
        <div class="calendar-days" role="grid" :aria-label="\`\${calendarTitle}日历\`">
          <button 
            v-for="day in calendarDays"
            :key="getDateString(day.date)"
            class="calendar-day"
            :class="{
              'today': day.isToday,
              'selected': day.isSelected,
              'other-month': day.isOtherMonth
            }"
            @click="$emit('select-date', day.date)"
            :aria-label="\`\${day.date.getDate()}日\`"
          >
            {{ day.date.getDate() }}
          </button>
        </div>
      </div>
    </div>
  `
});

// 注册tag-statistics组件
app.component('tag-statistics', {
  name: 'TagStatistics',
  props: {
    tagStatistics: {
      type: Object,
      default: () => ({
        tags: [],
        totalCount: 0,
        maxCount: 0
      })
    },
    selectedTags: {
      type: Set,
      default: () => new Set()
    },
    hasNewsData: {
      type: Boolean,
      default: false
    },
    sidebarCollapsed: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle-tag'],
  methods: {
    // 切换标签选择状态
    toggleTag(tagName) {
      this.$emit('toggle-tag', tagName);
    }
  },
  template: `
    <div class="tag-statistics" v-show="!sidebarCollapsed && hasNewsData" role="region" aria-label="标签统计">
      <div class="tag-statistics-content">
        <h3 class="tag-statistics-title">标签统计</h3>
        
        <div v-if="tagStatistics.tags.length > 0" class="tag-list">
          <div 
            v-for="tag in tagStatistics.tags" 
            :key="tag.name"
            class="tag-item"
            :class="{ active: selectedTags.has(tag.name) }"
            @click="toggleTag(tag.name)"
          >
            <span class="tag-name">{{ tag.name }}</span>
            <span class="tag-count">{{ tag.count }}</span>
            <div 
              class="tag-bar"
              :style="{ width: tagStatistics.maxCount > 0 ? (tag.count / tagStatistics.maxCount * 100) + '%' : '0%' }"
            ></div>
          </div>
        </div>
        
        <div v-else class="no-tags">
          <p>暂无标签数据</p>
        </div>
      </div>
    </div>
  `
});

// 挂载应用
app.mount('#app'); 