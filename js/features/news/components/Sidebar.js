// 侧边栏组件 - 整合日历和标签统计功能

const Sidebar = {
    name: 'Sidebar',
    props: {
        sidebarCollapsed: {
            type: Boolean,
            default: false
        },
        // 日历相关props
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
        },
        // 标签统计相关props
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
        }
    },
    emits: [
        'go-to-previous-day', 
        'go-to-next-day', 
        'go-to-today', 
        'previous-month', 
        'next-month', 
        'select-date',
        'toggle-tag'
    ],
    template: `
        <aside class="sidebar-navigation" :class="{ collapsed: sidebarCollapsed }" role="complementary" aria-label="日期导航">
            <calendar
                :current-date="currentDate"
                :current-date-display="currentDateDisplay"
                :current-date-subtitle="currentDateSubtitle"
                :is-today="isToday"
                :is-future-date="isFutureDate"
                :sidebar-collapsed="sidebarCollapsed"
                :calendar-date="calendarDate"
                :calendar-title="calendarTitle"
                :is-current-month="isCurrentMonth"
                :calendar-days="calendarDays"
                :selected-date="selectedDate"
                @go-to-previous-day="$emit('go-to-previous-day')"
                @go-to-next-day="$emit('go-to-next-day')"
                @go-to-today="$emit('go-to-today')"
                @previous-month="$emit('previous-month')"
                @next-month="$emit('next-month')"
                @select-date="$emit('select-date', $event)"
            ></calendar>
            
            <tag-statistics
                :tag-statistics="tagStatistics"
                :selected-tags="selectedTags"
                :has-news-data="hasNewsData"
                :sidebar-collapsed="sidebarCollapsed"
                @toggle-tag="$emit('toggle-tag', $event)"
            ></tag-statistics>
        </aside>
    `
};

// 全局暴露组件
window.Sidebar = Sidebar; 
