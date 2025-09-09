// 标签统计组件 - 负责标签统计和筛选功能

import { loadCSSFiles } from '/utils/baseView.js';

// 自动加载相关的CSS文件（统一使用工具函数）
loadCSSFiles([
    '/views/news/plugins/tagStatistics/index.css'
]);
// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/views/news/plugins/tagStatistics/index.html');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('加载模板失败:', error);
        // 回退到内联模板
        return;
    }
}

const createTagStatistics = async () => {
  const template = await loadTemplate();
  
  return {
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
    data() {
        return {
            clickTimeout: null
        };
    },
    methods: {
        // 切换标签选择状态
        toggleTag(tagName, event) {
            // 防抖处理，避免重复点击
            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
            }
            
            // 添加视觉反馈
            const tagElement = event?.target?.closest('.tag-item');
            if (tagElement) {
                tagElement.classList.add('clicked');
                setTimeout(() => {
                    tagElement.classList.remove('clicked');
                }, 300);
            }
            
            this.clickTimeout = setTimeout(() => {
                this.$emit('toggle-tag', tagName);
            }, 100);
        }
    },
    template: template
  };
};

// 初始化组件并全局暴露
(async function initComponent() {
  try {
      const TagStatistics = await createTagStatistics();
      window.TagStatistics = TagStatistics;
      
      // 触发自定义事件，通知组件已加载完成
      window.dispatchEvent(new CustomEvent('TagStatisticsLoaded', { detail: TagStatistics }));
  } catch (error) {
      console.error('TagStatistics 组件初始化失败:', error);
  }
})(); 

