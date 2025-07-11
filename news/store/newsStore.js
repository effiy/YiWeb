// 状态管理

import { CATEGORIES } from '../config/constants.js';

// 从全局Vue对象中解构需要的函数
const { ref } = Vue;

// 创建响应式状态
export const createNewsStore = () => {
    // 响应式数据
    const newsData = ref([]);
    const loading = ref(true);
    const error = ref(null);
    const errorMessage = ref('');
    const searchQuery = ref('');
    const selectedCategories = ref(new Set());
    const selectedTags = ref(new Set());
    const clickedItems = ref(new Set());
    const searchHistory = ref([]);
    
    // 侧边栏收缩状态
    const sidebarCollapsed = ref(false);
    
    // 日期管理
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentDate = ref(new Date(today));
    
    // 日历相关数据
    const calendarMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1));
    const weekdays = ref(['日', '一', '二', '三', '四', '五', '六']);
    
    // 分类数据
    const categories = ref(CATEGORIES);

    return {
        // 响应式数据
        newsData,
        loading,
        error,
        errorMessage,
        searchQuery,
        selectedCategories,
        selectedTags,
        clickedItems,
        searchHistory,
        categories,
        sidebarCollapsed,
        currentDate,
        calendarMonth,
        weekdays,
        today
    };
}; 