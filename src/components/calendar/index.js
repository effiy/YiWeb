// 日历组件 - 负责日期导航和小日历显示
import { defineComponent } from '/src/utils/componentLoader.js';

(async function initComponent() {
    try {
        await defineComponent({
            name: 'Calendar',
            css: '/src/components/calendar/index.css',
            html: '/src/components/calendar/index.html',
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
            }
        });
        
        // 触发自定义事件，通知组件已加载完成
        // 虽然 defineComponent 已经注册了 window.Calendar，但为了兼容可能的事件监听者，保留此事件
        if (window.Calendar) {
            window.dispatchEvent(new CustomEvent('CalendarLoaded', { detail: window.Calendar }));
        }
    } catch (error) {
        console.error('Calendar 组件初始化失败:', error);
    }
})();
