/**
 * 日期处理工具函数
 * 提供统一的日期格式化、计算和比较功能
 * author: liangliang
 */

/**
 * 格式化日期为字符串 (YYYY-MM-DD)
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
    if (!(date instanceof Date)) {
        throw new Error('参数必须是Date对象');
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 获取日期字符串 (用于比较)
 * @param {Date} date - 日期对象
 * @returns {string} 日期字符串
 */
export function getDateString(date) {
    if (!(date instanceof Date)) {
        throw new Error('参数必须是Date对象');
    }
    return formatDate(date);
}

/**
 * 计算两个日期之间的天数差
 * @param {Date} date1 - 第一个日期
 * @param {Date} date2 - 第二个日期
 * @returns {number} 天数差
 */
export function getDaysDifference(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / oneDay);
}

/**
 * 检查日期是否为今天
 * @param {Date} date - 要检查的日期
 * @param {Date} today - 今天的日期
 * @returns {boolean} 是否为今天
 */
export function isToday(date, today = new Date()) {
    return getDateString(date) === getDateString(today);
}

/**
 * 检查日期是否为未来日期
 * @param {Date} date - 要检查的日期
 * @param {Date} today - 今天的日期
 * @returns {boolean} 是否为未来日期
 */
export function isFutureDate(date, today = new Date()) {
    return getDateString(date) > getDateString(today);
}

/**
 * 获取相对时间显示文本
 * @param {Date} date - 目标日期
 * @param {Date} today - 今天的日期
 * @returns {string} 相对时间文本
 */
export function getRelativeDateText(date, today = new Date()) {
    const todayStr = getDateString(today);
    const currentStr = getDateString(date);
    
    if (currentStr === todayStr) {
        return '今天';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getDateString(yesterday);
    
    if (currentStr === yesterdayStr) {
        return '昨天';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getDateString(tomorrow);
    
    if (currentStr === tomorrowStr) {
        return '明天';
    }
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekday = date.toLocaleDateString('zh-CN', { weekday: 'long' });
    
    return `${month}月${day}日 ${weekday}`;
}

/**
 * 获取时间差显示文本
 * @param {string|Date} isoDate - ISO日期字符串或Date对象
 * @returns {string} 时间差文本
 */
export function getTimeAgo(isoDate) {
    if (!isoDate) return '未知时间';
    
    const now = new Date();
    const date = isoDate instanceof Date ? isoDate : new Date(isoDate);
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
}

/**
 * 生成日历天数数组
 * @param {Date} month - 月份日期
 * @param {Function} hasDataCallback - 检查日期是否有数据的回调函数
 * @returns {Array} 日历天数数组
 */
export function generateCalendarDays(month, hasDataCallback = null) {
    const year = month.getFullYear();
    const monthNum = month.getMonth();
    
    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);
    const firstDayWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const prevMonth = new Date(year, monthNum, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    const days = [];
    
    // 上个月的日期
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = new Date(year, monthNum - 1, day);
        days.push({
            date,
            isCurrentMonth: false,
            hasData: hasDataCallback ? hasDataCallback(date) : false
        });
    }
    
    // 当前月的日期
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthNum, day);
        days.push({
            date,
            isCurrentMonth: true,
            hasData: hasDataCallback ? hasDataCallback(date) : false
        });
    }
    
    // 下个月的日期
    const remainingDays = 42 - days.length; // 6行7列 = 42
    for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, monthNum + 1, day);
        days.push({
            date,
            isCurrentMonth: false,
            hasData: hasDataCallback ? hasDataCallback(date) : false
        });
    }
    
    return days;
} 