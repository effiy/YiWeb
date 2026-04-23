/**
 * 验证工具函数
 * author: liangliang
 */

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * 验证手机号格式（中国大陆）
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
export function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone.trim());
}

/**
 * 验证URL格式
 * @param {string} url - URL地址
 * @returns {boolean} 是否有效
 */
export function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * 验证身份证号格式（中国大陆）
 * @param {string} idCard - 身份证号
 * @returns {boolean} 是否有效
 */
export function isValidIdCard(idCard) {
    if (!idCard || typeof idCard !== 'string') return false;
    const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
    return idCardRegex.test(idCard.trim());
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @param {Object} options - 选项
 * @returns {Object} 验证结果 {valid, strength, message}
 */
export function validatePassword(password, options = {}) {
    const {
        minLength = 8,
        maxLength = 32,
        requireUppercase = true,
        requireLowercase = true,
        requireNumber = true,
        requireSpecial = false
    } = options;

    if (!password || typeof password !== 'string') {
        return { valid: false, strength: 0, message: '密码不能为空' };
    }

    if (password.length < minLength) {
        return { valid: false, strength: 0, message: `密码长度不能少于${minLength}位` };
    }

    if (password.length > maxLength) {
        return { valid: false, strength: 0, message: `密码长度不能超过${maxLength}位` };
    }

    let strength = 0;
    const checks = [];

    if (/[A-Z]/.test(password)) {
        strength++;
        checks.push('uppercase');
    } else if (requireUppercase) {
        return { valid: false, strength, message: '密码必须包含大写字母' };
    }

    if (/[a-z]/.test(password)) {
        strength++;
        checks.push('lowercase');
    } else if (requireLowercase) {
        return { valid: false, strength, message: '密码必须包含小写字母' };
    }

    if (/\d/.test(password)) {
        strength++;
        checks.push('number');
    } else if (requireNumber) {
        return { valid: false, strength, message: '密码必须包含数字' };
    }

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        strength++;
        checks.push('special');
    } else if (requireSpecial) {
        return { valid: false, strength, message: '密码必须包含特殊字符' };
    }

    return {
        valid: true,
        strength,
        checks,
        message: strength >= 3 ? '密码强度良好' : '密码强度较弱'
    };
}

/**
 * 验证必填字段
 * @param {*} value - 值
 * @returns {boolean} 是否有效
 */
export function isRequired(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
}

/**
 * 验证最小长度
 * @param {string|Array} value - 值
 * @param {number} min - 最小长度
 * @returns {boolean} 是否有效
 */
export function minLength(value, min) {
    if (!value) return false;
    const length = typeof value === 'string' ? value.trim().length : value.length;
    return length >= min;
}

/**
 * 验证最大长度
 * @param {string|Array} value - 值
 * @param {number} max - 最大长度
 * @returns {boolean} 是否有效
 */
export function maxLength(value, max) {
    if (!value) return true;
    const length = typeof value === 'string' ? value.trim().length : value.length;
    return length <= max;
}

/**
 * 验证数值范围
 * @param {number} value - 值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {boolean} 是否有效
 */
export function inRange(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return false;
    return num >= min && num <= max;
}

/**
 * 验证正则表达式
 * @param {string} value - 值
 * @param {RegExp|string} pattern - 正则表达式
 * @returns {boolean} 是否有效
 */
export function matchPattern(value, pattern) {
    if (!value || typeof value !== 'string') return false;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return regex.test(value);
}

/**
 * 表单验证器
 * @param {Object} data - 表单数据
 * @param {Object} rules - 验证规则
 * @returns {Object} 验证结果 {valid, errors}
 */
export function validateForm(data, rules) {
    const errors = {};
    let valid = true;

    for (const [field, fieldRules] of Object.entries(rules)) {
        const value = data[field];

        for (const rule of fieldRules) {
            const { type, message, ...params } = rule;

            let isValid = true;

            switch (type) {
                case 'required':
                    isValid = isRequired(value);
                    break;
                case 'email':
                    isValid = !value || isValidEmail(value);
                    break;
                case 'phone':
                    isValid = !value || isValidPhone(value);
                    break;
                case 'url':
                    isValid = !value || isValidUrl(value);
                    break;
                case 'minLength':
                    isValid = minLength(value, params.min);
                    break;
                case 'maxLength':
                    isValid = maxLength(value, params.max);
                    break;
                case 'range':
                    isValid = inRange(value, params.min, params.max);
                    break;
                case 'pattern':
                    isValid = matchPattern(value, params.pattern);
                    break;
                case 'custom':
                    isValid = params.validator(value, data);
                    break;
            }

            if (!isValid) {
                errors[field] = message || `${field} 验证失败`;
                valid = false;
                break;
            }
        }
    }

    return { valid, errors };
}

export default {
    isValidEmail,
    isValidPhone,
    isValidUrl,
    isValidIdCard,
    validatePassword,
    isRequired,
    minLength,
    maxLength,
    inRange,
    matchPattern,
    validateForm
};
