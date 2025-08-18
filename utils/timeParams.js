// 时间参数处理工具函数
// 作者：liangliang

/**
 * 将年度、季度、月度转换为时间范围信息
 * @param {string} year - 年度 (如 "2024")
 * @param {string} quarter - 季度 (如 "Q1", "Q2", "Q3", "Q4")
 * @param {string} month - 月度 (如 "01", "02", ..., "12")
 * @returns {Object} 包含时间范围信息的对象
 */
export const convertTimeParamsToDateRange = (year, quarter, month) => {
    try {
        if (!year) {
            return null;
        }

        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 1970 || yearNum > 3000) {
            throw new Error('无效的年份');
        }

        let startDate, endDate;

        if (month && quarter) {
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
                month: month || null
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
 * @returns {string} URL查询参数字符串
 */
export const buildTimeQueryParams = (year, quarter, month) => {
    const dateRange = convertTimeParamsToDateRange(year, quarter, month);
    if (!dateRange) {
        return '';
    }

    const params = new URLSearchParams();
    
    // 只添加原始时间参数
    if (year) params.append('year', year);
    if (quarter) params.append('quarter', quarter);
    if (month) params.append('month', month);
    
    return params.toString();
};

/**
 * 验证时间参数的有效性
 * @param {string} year - 年度
 * @param {string} quarter - 季度  
 * @param {string} month - 月度
 * @returns {Object} 验证结果
 */
export const validateTimeParams = (year, quarter, month) => {
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
 * @returns {string} 格式化的显示文本
 */
export const formatTimeRangeText = (year, quarter, month) => {
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

