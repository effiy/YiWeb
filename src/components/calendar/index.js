// 日历组件 - 负责日期导航和小日历显示
import { registerGlobalComponent } from '/src/utils/view/componentLoader.js';

registerGlobalComponent({
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
