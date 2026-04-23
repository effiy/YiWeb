/**
 * YiBadge - 徽章组件
 * @author liangliang
 */
import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
  name: 'YiBadge',
  html: '/cdn/components/common/data-display/YiBadge/template.html',
  css: '/cdn/components/common/data-display/YiBadge/index.css',
  props: {
    value: {
      type: [String, Number],
      default: ''
    },
    max: {
      type: Number,
      default: 99
    },
    isDot: {
      type: Boolean,
      default: false
    },
    hidden: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'danger',
      validator: (value) => ['primary', 'success', 'warning', 'danger', 'info'].includes(value)
    },
    showZero: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    badgeClass() {
      return [
        'yi-badge',
        `yi-badge--${this.type}`
      ];
    },
    content() {
      if (this.isDot) return '';

      const value = this.value;
      if (typeof value === 'number' && typeof this.max === 'number') {
        return value > this.max ? `${this.max}+` : value;
      }
      return value;
    },
    showBadge() {
      if (this.hidden) return false;
      if (this.isDot) return true;

      const value = this.value;
      if (value === 0 || value === '0') {
        return this.showZero;
      }
      return !!value || value === 0;
    }
  }
});
