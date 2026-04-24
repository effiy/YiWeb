/**
 * 时间选择器工具函数
 * 提供统一的周、日计算逻辑，确保筛选器和卡片编辑/创建中的数据一致性
 * @author liangliang
 */

/**
 * 根据年月获取周列表
 * 与 useMethods.js 中的 getWeeksByMonth 保持一致
 * @param {number|string} year - 年份
 * @param {number|string} month - 月份
 * @returns {Array} 周列表
 */
export const getWeeksByMonth = (year, month) => {
    if (!year || !month) return [];
    
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    // 获取该月第一天和最后一天
    const firstDay = new Date(yearNum, monthNum - 1, 1);
    const lastDay = new Date(yearNum, monthNum, 0);
    
    const weeks = [];
    let currentWeek = 1;
    let currentDate = new Date(firstDay);
    
    // 找到该月第一个周一
    while (currentDate.getDay() !== 1 && currentDate <= lastDay) {
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 如果该月没有周一，从第一天开始
    if (currentDate > lastDay) {
        currentDate = new Date(firstDay);
    }
    
    while (currentDate <= lastDay) {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        // 确保周结束日期不超过月末
        if (weekEnd > lastDay) {
            weekEnd.setTime(lastDay.getTime());
        }
        
        const weekValue = currentWeek.toString().padStart(2, '0');
        const weekLabel = `第${currentWeek}周 (${weekStart.getDate()}-${weekEnd.getDate()}日)`;
        
        weeks.push({
            value: weekValue,
            label: weekLabel,
            startDate: weekStart,
            endDate: weekEnd
        });
        
        currentWeek++;
        currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return weeks;
};

/**
 * 根据年周获取日列表
 * 与 useMethods.js 中的 getDaysByWeek 保持一致
 * @param {number|string} year - 年份
 * @param {number|string} week - 周数
 * @returns {Array} 日列表
 */
export const getDaysByWeek = (year, week) => {
    if (!year || !week) return [];
    
    const yearNum = parseInt(year);
    const weekNum = parseInt(week);
    
    // 计算该周的第一天（周一）
    const jan1 = new Date(yearNum, 0, 1);
    const daysToFirstMonday = (8 - jan1.getDay()) % 7;
    const firstMonday = new Date(jan1);
    firstMonday.setDate(jan1.getDate() + daysToFirstMonday);
    
    // 计算目标周的周一
    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(targetMonday);
        currentDay.setDate(targetMonday.getDate() + i);
        
        const dayValue = currentDay.getDate().toString().padStart(2, '0');
        const dayLabel = `${currentDay.getDate()}日 (周${['日', '一', '二', '三', '四', '五', '六'][currentDay.getDay()]})`;
        
        days.push({
            value: dayValue,
            label: dayLabel,
            date: currentDay
        });
    }
    
    return days;
};

/**
 * 根据季度获取月份列表
 * @param {string} quarter - 季度
 * @returns {Array} 月份列表
 */
export const getMonthsByQuarter = (quarter) => {
    const monthsMap = {
        'Q1': [
            { value: '01', label: '1月' },
            { value: '02', label: '2月' },
            { value: '03', label: '3月' }
        ],
        'Q2': [
            { value: '04', label: '4月' },
            { value: '05', label: '5月' },
            { value: '06', label: '6月' }
        ],
        'Q3': [
            { value: '07', label: '7月' },
            { value: '08', label: '8月' },
            { value: '09', label: '9月' }
        ],
        'Q4': [
            { value: '10', label: '10月' },
            { value: '11', label: '11月' },
            { value: '12', label: '12月' }
        ]
    };
    return monthsMap[quarter] || [];
};

/**
 * 获取季度列表
 * @returns {Array} 季度列表
 */
export const getQuarters = () => {
    return [
        { value: 'Q1', label: '第一季度' },
        { value: 'Q2', label: '第二季度' },
        { value: 'Q3', label: '第三季度' },
        { value: 'Q4', label: '第四季度' }
    ];
};
