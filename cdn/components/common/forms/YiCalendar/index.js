import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

const componentOptions = {
    name: 'YiCalendar',
    html: '/cdn/components/common/forms/YiCalendar/template.html',
    css: '/cdn/components/common/forms/YiCalendar/index.css',
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
        getDateString(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
};

// 注册为 YiCalendar（标准名称）
registerGlobalComponent(componentOptions);

// 同时注册为 Calendar（兼容 news 页面）
registerGlobalComponent(componentOptions, { exposeName: 'Calendar', eventName: 'CalendarLoaded' });
