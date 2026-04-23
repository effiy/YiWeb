/**
 * 国际化工具
 * @author liangliang
 */

/**
 * 国际化管理器
 */
export class I18n {
  constructor(options = {}) {
    this.locale = options.locale || 'zh-CN';
    this.fallbackLocale = options.fallbackLocale || 'en';
    this.messages = options.messages || {};
    this.dateTimeFormats = options.dateTimeFormats || {};
    this.numberFormats = options.numberFormats || {};
    this.missingHandler = options.missingHandler || null;
  }

  /**
   * 设置当前语言
   */
  setLocale(locale) {
    if (this.messages[locale]) {
      this.locale = locale;
      this.emit('locale-changed', locale);
      return true;
    }
    return false;
  }

  /**
   * 获取当前语言
   */
  getLocale() {
    return this.locale;
  }

  /**
   * 添加语言包
   */
  addMessages(locale, messages) {
    if (!this.messages[locale]) {
      this.messages[locale] = {};
    }
    Object.assign(this.messages[locale], messages);
  }

  /**
   * 翻译文本
   */
  t(key, params = {}) {
    const message = this.getMessage(key);

    if (!message) {
      if (this.missingHandler) {
        return this.missingHandler(this.locale, key, params);
      }
      return key;
    }

    return this.interpolate(message, params);
  }

  /**
   * 获取消息
   */
  getMessage(key) {
    // 尝试当前语言
    let message = this.getNestedValue(this.messages[this.locale], key);

    // 尝试回退语言
    if (!message && this.fallbackLocale !== this.locale) {
      message = this.getNestedValue(this.messages[this.fallbackLocale], key);
    }

    return message;
  }

  /**
   * 获取嵌套值
   */
  getNestedValue(obj, path) {
    if (!obj) return null;

    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * 插值替换
   */
  interpolate(message, params) {
    if (typeof message !== 'string') return message;

    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  /**
   * 复数处理
   */
  tc(key, count, params = {}) {
    const message = this.getMessage(key);

    if (!message) return key;

    // 简单的复数规则
    let text;
    if (typeof message === 'object') {
      if (count === 0 && message.zero) {
        text = message.zero;
      } else if (count === 1 && message.one) {
        text = message.one;
      } else if (message.other) {
        text = message.other;
      } else {
        text = message.one || message.other || '';
      }
    } else {
      text = message;
    }

    return this.interpolate(text, { count, ...params });
  }

  /**
   * 日期格式化
   */
  d(date, format = 'short') {
    const formats = this.dateTimeFormats[this.locale];
    if (!formats || !formats[format]) {
      return date.toLocaleDateString(this.locale);
    }

    return new Intl.DateTimeFormat(this.locale, formats[format]).format(date);
  }

  /**
   * 数字格式化
   */
  n(number, format = 'decimal') {
    const formats = this.numberFormats[this.locale];
    if (!formats || !formats[format]) {
      return number.toLocaleString(this.locale);
    }

    return new Intl.NumberFormat(this.locale, formats[format]).format(number);
  }

  /**
   * 事件监听
   */
  on(event, handler) {
    if (!this._events) this._events = {};
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(handler);
  }

  /**
   * 触发事件
   */
  emit(event, ...args) {
    if (!this._events || !this._events[event]) return;
    this._events[event].forEach(handler => handler(...args));
  }
}

/**
 * 创建国际化实例
 */
export function createI18n(options) {
  return new I18n(options);
}

/**
 * 默认语言包
 */
export const defaultMessages = {
  'zh-CN': {
    common: {
      confirm: '确认',
      cancel: '取消',
      ok: '确定',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      add: '添加',
      search: '搜索',
      reset: '重置',
      submit: '提交',
      close: '关闭',
      back: '返回',
      next: '下一步',
      prev: '上一步',
      loading: '加载中...',
      noData: '暂无数据',
      error: '错误',
      success: '成功',
      warning: '警告',
      info: '提示'
    },
    validation: {
      required: '此字段为必填项',
      email: '请输入有效的邮箱地址',
      phone: '请输入有效的手机号码',
      url: '请输入有效的URL',
      minLength: '最少需要 {min} 个字符',
      maxLength: '最多允许 {max} 个字符',
      min: '最小值为 {min}',
      max: '最大值为 {max}',
      pattern: '格式不正确'
    },
    message: {
      deleteConfirm: '确定要删除吗？',
      saveSuccess: '保存成功',
      deleteSuccess: '删除成功',
      operationSuccess: '操作成功',
      operationFailed: '操作失败'
    }
  },
  'en': {
    common: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      ok: 'OK',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      reset: 'Reset',
      submit: 'Submit',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      prev: 'Previous',
      loading: 'Loading...',
      noData: 'No Data',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info'
    },
    validation: {
      required: 'This field is required',
      email: 'Please enter a valid email address',
      phone: 'Please enter a valid phone number',
      url: 'Please enter a valid URL',
      minLength: 'Minimum {min} characters required',
      maxLength: 'Maximum {max} characters allowed',
      min: 'Minimum value is {min}',
      max: 'Maximum value is {max}',
      pattern: 'Invalid format'
    },
    message: {
      deleteConfirm: 'Are you sure you want to delete?',
      saveSuccess: 'Saved successfully',
      deleteSuccess: 'Deleted successfully',
      operationSuccess: 'Operation successful',
      operationFailed: 'Operation failed'
    }
  }
};

/**
 * 默认日期时间格式
 */
export const defaultDateTimeFormats = {
  'zh-CN': {
    short: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit'
    },
    datetime: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }
  },
  'en': {
    short: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit'
    },
    datetime: {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }
  }
};

/**
 * 默认数字格式
 */
export const defaultNumberFormats = {
  'zh-CN': {
    decimal: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currency: {
      style: 'currency',
      currency: 'CNY'
    },
    percent: {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  },
  'en': {
    decimal: {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    },
    currency: {
      style: 'currency',
      currency: 'USD'
    },
    percent: {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }
  }
};

/**
 * 全局国际化实例
 */
let globalI18n = null;

/**
 * 设置全局国际化实例
 */
export function setGlobalI18n(i18n) {
  globalI18n = i18n;
}

/**
 * 获取全局国际化实例
 */
export function getGlobalI18n() {
  if (!globalI18n) {
    globalI18n = createI18n({
      locale: 'zh-CN',
      fallbackLocale: 'en',
      messages: defaultMessages,
      dateTimeFormats: defaultDateTimeFormats,
      numberFormats: defaultNumberFormats
    });
  }
  return globalI18n;
}

/**
 * 快捷翻译函数
 */
export function t(key, params) {
  return getGlobalI18n().t(key, params);
}

/**
 * 快捷复数翻译函数
 */
export function tc(key, count, params) {
  return getGlobalI18n().tc(key, count, params);
}

/**
 * 快捷日期格式化函数
 */
export function d(date, format) {
  return getGlobalI18n().d(date, format);
}

/**
 * 快捷数字格式化函数
 */
export function n(number, format) {
  return getGlobalI18n().n(number, format);
}
