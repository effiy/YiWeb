/**
 * YiDialog - 对话框组件
 * @author liangliang
 */
import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

registerGlobalComponent({
  name: 'YiDialog',
  html: '/cdn/components/common/modals/YiDialog/template.html',
  css: '/cdn/components/common/modals/YiDialog/index.css',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    message: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'info', // info, success, warning, error, confirm
      validator: (value) => ['info', 'success', 'warning', 'error', 'confirm'].includes(value)
    },
    confirmText: {
      type: String,
      default: '确定'
    },
    cancelText: {
      type: String,
      default: '取消'
    },
    showCancel: {
      type: Boolean,
      default: false
    },
    closeOnClickModal: {
      type: Boolean,
      default: true
    },
    closeOnPressEscape: {
      type: Boolean,
      default: true
    },
    showClose: {
      type: Boolean,
      default: true
    },
    beforeClose: {
      type: Function,
      default: null
    },
    center: {
      type: Boolean,
      default: false
    },
    width: {
      type: String,
      default: '420px'
    }
  },
  emits: ['update:visible', 'confirm', 'cancel', 'close'],
  data() {
    return {
      loading: false
    };
  },
  computed: {
    dialogClass() {
      return [
        'yi-dialog',
        `yi-dialog--${this.type}`,
        {
          'yi-dialog--center': this.center
        }
      ];
    },
    dialogStyle() {
      return {
        width: this.width
      };
    },
    iconClass() {
      const iconMap = {
        info: 'ℹ️',
        success: '✓',
        warning: '⚠',
        error: '✕',
        confirm: '?'
      };
      return iconMap[this.type];
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.addEscapeListener();
        document.body.style.overflow = 'hidden';
      } else {
        this.removeEscapeListener();
        document.body.style.overflow = '';
      }
    }
  },
  mounted() {
    if (this.visible) {
      this.addEscapeListener();
    }
  },
  beforeUnmount() {
    this.removeEscapeListener();
    document.body.style.overflow = '';
  },
  methods: {
    async handleClose() {
      if (this.beforeClose) {
        const shouldClose = await this.beforeClose('close');
        if (shouldClose === false) return;
      }
      this.$emit('update:visible', false);
      this.$emit('close');
    },
    async handleConfirm() {
      if (this.beforeClose) {
        this.loading = true;
        try {
          const shouldClose = await this.beforeClose('confirm');
          if (shouldClose === false) {
            this.loading = false;
            return;
          }
        } catch (error) {
          this.loading = false;
          return;
        }
        this.loading = false;
      }
      this.$emit('update:visible', false);
      this.$emit('confirm');
    },
    async handleCancel() {
      if (this.beforeClose) {
        const shouldClose = await this.beforeClose('cancel');
        if (shouldClose === false) return;
      }
      this.$emit('update:visible', false);
      this.$emit('cancel');
    },
    handleMaskClick() {
      if (this.closeOnClickModal) {
        this.handleClose();
      }
    },
    handleEscape(e) {
      if (this.visible && this.closeOnPressEscape && e.key === 'Escape') {
        this.handleClose();
      }
    },
    addEscapeListener() {
      document.addEventListener('keydown', this.handleEscape);
    },
    removeEscapeListener() {
      document.removeEventListener('keydown', this.handleEscape);
    }
  }
});
