// 日历组件 - 负责日期导航和小日历显示

import { loadCSSFiles } from '/utils/baseView.js';

// 自动加载相关的CSS文件（统一使用工具函数）
loadCSSFiles([
    '/plugins/calendar/index.css'
]);
// 异步加载HTML模板
async function loadTemplate() {
    try {
        const response = await fetch('/plugins/calendar/index.html');
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

// 创建组件定义
const createCalendar = async () => {
    const template = await loadTemplate();
    
    return {
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
        template: template
    };
};

// 初始化组件并全局暴露
(async function initComponent() {
    try {
        const Calendar = await createCalendar();
        window.Calendar = Calendar;
        
        // 触发自定义事件，通知组件已加载完成
        window.dispatchEvent(new CustomEvent('CalendarLoaded', { detail: Calendar }));
    } catch (error) {
        console.error('Calendar 组件初始化失败:', error);
    }
})(); 
