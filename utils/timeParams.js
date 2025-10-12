// 时间参数处理工具函数
// 作者：liangliang

/**
 * 将年度、季度、月度、周、日转换为时间范围信息
 * @param {string} year - 年度 (如 "2024")
 * @param {string} quarter - 季度 (如 "Q1", "Q2", "Q3", "Q4")
 * @param {string} month - 月度 (如 "01", "02", ..., "12")
 * @param {string} week - 周 (如 "01", "02", ...)
 * @param {string} day - 日 (如 "01", "02", ..., "31")
 * @returns {Object} 包含时间范围信息的对象
 */
export const convertTimeParamsToDateRange = (year, quarter, month, week, day) => {
    try {
        if (!year) {
            return null;
        }

        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 1970 || yearNum > 3000) {
            throw new Error('无效的年份');
        }

        let startDate, endDate;

        if (day && week && month && quarter) {
            // 具体到日
            const monthNum = parseInt(month);
            const dayNum = parseInt(day);
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                throw new Error('无效的月份');
            }
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
                throw new Error('无效的日期');
            }
            
            startDate = new Date(yearNum, monthNum - 1, dayNum);
            endDate = new Date(yearNum, monthNum - 1, dayNum, 23, 59, 59, 999);
            
        } else if (week && month && quarter) {
            // 具体到周
            const monthNum = parseInt(month);
            const weekNum = parseInt(week);
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                throw new Error('无效的月份');
            }
            if (isNaN(weekNum) || weekNum < 1 || weekNum > 6) {
                throw new Error('无效的周数');
            }
            
            // 计算该月第一周的开始日期
            const firstDay = new Date(yearNum, monthNum - 1, 1);
            let currentWeek = 1;
            let currentDate = new Date(firstDay);
            
            // 找到该月第一个周一
            while (currentDate.getDay() !== 1 && currentDate <= new Date(yearNum, monthNum, 0)) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // 如果该月没有周一，从第一天开始
            if (currentDate > new Date(yearNum, monthNum, 0)) {
                currentDate = new Date(firstDay);
            }
            
            // 找到目标周
            while (currentWeek < weekNum && currentDate <= new Date(yearNum, monthNum, 0)) {
                currentDate.setDate(currentDate.getDate() + 7);
                currentWeek++;
            }
            
            startDate = new Date(currentDate);
            endDate = new Date(currentDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            
            // 确保周结束日期不超过月末
            const monthEnd = new Date(yearNum, monthNum, 0);
            if (endDate > monthEnd) {
                endDate = monthEnd;
                endDate.setHours(23, 59, 59, 999);
            }
            
        } else if (month && quarter) {
            // 具体到月份
            const monthNum = parseInt(month);
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
                throw new Error('无效的月份');
            }
            
            startDate = new Date(yearNum, monthNum - 1, 1); // 月份从0开始
            endDate = new Date(yearNum, monthNum, 0); // 获取当月最后一天
            
        } else if (quarter) {
            // 具体到季度
            const quarterMap = {
                'Q1': { start: 0, end: 2 },   // 1-3月
                'Q2': { start: 3, end: 5 },   // 4-6月
                'Q3': { start: 6, end: 8 },   // 7-9月
                'Q4': { start: 9, end: 11 }   // 10-12月
            };
            
            const quarterInfo = quarterMap[quarter];
            if (!quarterInfo) {
                throw new Error('无效的季度');
            }
            
            startDate = new Date(yearNum, quarterInfo.start, 1);
            endDate = new Date(yearNum, quarterInfo.end + 1, 0); // 获取季度最后一天
            
        } else {
            // 整年
            startDate = new Date(yearNum, 0, 1); // 1月1日
            endDate = new Date(yearNum, 11, 31); // 12月31日
        }

        return {
            timeRange: {
                year: year,
                quarter: quarter || null,
                month: month || null,
                week: week || null,
                day: day || null
            }
        };
        
    } catch (error) {
        console.error('[时间参数转换] 转换失败:', error);
        return null;
    }
};

/**
 * 构建时间查询URL参数
 * @param {string} year - 年度
 * @param {string} quarter - 季度
 * @param {string} month - 月度
 * @param {string} week - 周
 * @param {string} day - 日
 * @returns {string} URL查询参数字符串
 */
export const buildTimeQueryParams = (year, quarter, month, week, day) => {
    const dateRange = convertTimeParamsToDateRange(year, quarter, month, week, day);
    if (!dateRange) {
        return '';
    }

    const params = new URLSearchParams();
    
    // 只添加原始时间参数
    if (year) params.append('year', year);
    if (quarter) params.append('quarter', quarter);
    if (month) params.append('month', month);
    if (week) params.append('week', week);
    if (day) params.append('day', day);
    
    return params.toString();
};

/**
 * 验证时间参数的有效性
 * @param {string} year - 年度
 * @param {string} quarter - 季度  
 * @param {string} month - 月度
 * @param {string} week - 周
 * @param {string} day - 日
 * @returns {Object} 验证结果
 */
export const validateTimeParams = (year, quarter, month, week, day) => {
    const errors = [];
    
    if (!year) {
        errors.push('请选择年度');
        return { isValid: false, errors };
    }
    
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1970 || yearNum > 3000) {
        errors.push('年度必须在1970-3000之间');
    }
    
    if (quarter && !['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
        errors.push('季度必须是Q1、Q2、Q3或Q4');
    }
    
    if (month) {
        const monthNum = parseInt(month);
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            errors.push('月份必须在01-12之间');
        }
        
        // 验证月份与季度的匹配性
        if (quarter) {
            const quarterMonths = {
                'Q1': ['01', '02', '03'],
                'Q2': ['04', '05', '06'],
                'Q3': ['07', '08', '09'],
                'Q4': ['10', '11', '12']
            };
            
            if (!quarterMonths[quarter].includes(month)) {
                errors.push(`${month}月不属于${quarter}季度`);
            }
        }
    }
    
    if (week) {
        const weekNum = parseInt(week);
        if (isNaN(weekNum) || weekNum < 1 || weekNum > 6) {
            errors.push('周数必须在01-06之间');
        }
        
        // 验证周与月份的匹配性
        if (month) {
            const monthNum = parseInt(month);
            const daysInMonth = new Date(parseInt(year), monthNum, 0).getDate();
            const maxWeeks = Math.ceil(daysInMonth / 7);
            if (weekNum > maxWeeks) {
                errors.push(`${month}月最多有${maxWeeks}周`);
            }
        }
    }
    
    if (day) {
        const dayNum = parseInt(day);
        if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
            errors.push('日期必须在01-31之间');
        }
        
        // 验证日期与月份的匹配性
        if (month) {
            const monthNum = parseInt(month);
            const daysInMonth = new Date(parseInt(year), monthNum, 0).getDate();
            if (dayNum > daysInMonth) {
                errors.push(`${month}月只有${daysInMonth}天`);
            }
        }
        
        // 验证日期与周的匹配性
        if (week && month) {
            // 这里可以添加更复杂的周日期匹配验证
            // 暂时跳过，因为周的计算比较复杂
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * 格式化时间范围显示文本
 * @param {string} year - 年度
 * @param {string} quarter - 季度
 * @param {string} month - 月度
 * @param {string} week - 周
 * @param {string} day - 日
 * @returns {string} 格式化的显示文本
 */
export const formatTimeRangeText = (year, quarter, month, week, day) => {
    if (!year) return '未选择时间';
    
    let text = `${year}年`;
    
    if (quarter) {
        const quarterNames = {
            'Q1': '第一季度',
            'Q2': '第二季度', 
            'Q3': '第三季度',
            'Q4': '第四季度'
        };
        text += quarterNames[quarter];
        
        if (month) {
            text += `${parseInt(month)}月`;
            
            if (week) {
                const weekNum = parseInt(week);
                text += `第${weekNum}周`;
                
                if (day) {
                    text += `${parseInt(day)}日`;
                }
            }
        }
    }
    
    return text;
};

/**
 * 获取默认时间参数（当前年月）
 * @returns {Object} 包含year、quarter、month的对象
 */
export const getDefaultTimeParams = () => {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
    
    return { year, quarter, month };
};

/**
 * 检查是否为未来时间
 * @param {string} year - 年度
 * @param {string} quarter - 季度
 * @param {string} month - 月度
 * @returns {boolean} 是否为未来时间
 */
export const isFutureTime = (year, quarter, month) => {
    const dateRange = convertTimeParamsToDateRange(year, quarter, month);
    if (!dateRange) return false;
    
    const now = new Date();
    const startDate = new Date(dateRange.startDate);
    
    return startDate > now;
};

