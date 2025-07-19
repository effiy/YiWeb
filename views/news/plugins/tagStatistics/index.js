// 标签统计组件 - 负责标签统计和筛选功能

// 自动加载相关的CSS文件
(function loadCSS() {
  const cssFiles = [
      '/views/news/plugins/tagStatistics/index.css'
  ];
  
  cssFiles.forEach(cssFile => {
      // 检查是否已经加载过该CSS文件
      if (!document.querySelector(`link[href*="${cssFile}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = cssFile;
          link.type = 'text/css';
          document.head.appendChild(link);
      }
  });
})();
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
    methods: {
        // 切换标签选择状态
        toggleTag(tagName) {
            this.$emit('toggle-tag', tagName);
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

