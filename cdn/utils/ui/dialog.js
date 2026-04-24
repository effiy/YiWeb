/**
 * 对话框工具函数
 * @author liangliang
 */

import { createApp, h } from 'vue';
import YiDialog from '/cdn/components/common/modals/YiDialog/index.js';

/**
 * 创建对话框实例
 */
function createDialogInstance(options) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const app = createApp({
    data() {
      return {
        visible: true,
        ...options
      };
    },
    render() {
      return h(YiDialog, {
        visible: this.visible,
        title: this.title,
        message: this.message,
        type: this.type,
        confirmText: this.confirmText,
        cancelText: this.cancelText,
        showCancel: this.showCancel,
        closeOnClickModal: this.closeOnClickModal,
        closeOnPressEscape: this.closeOnPressEscape,
        showClose: this.showClose,
        center: this.center,
        width: this.width,
        beforeClose: this.beforeClose,
        'onUpdate:visible': (val) => {
          this.visible = val;
          if (!val) {
            setTimeout(() => {
              app.unmount();
              document.body.removeChild(container);
            }, 300);
          }
        },
        onConfirm: () => {
          if (this.onConfirm) {
            this.onConfirm();
          }
        },
        onCancel: () => {
          if (this.onCancel) {
            this.onCancel();
          }
        },
        onClose: () => {
          if (this.onClose) {
            this.onClose();
          }
        }
      });
    }
  });

  app.mount(container);

  return {
    close: () => {
      app.unmount();
      document.body.removeChild(container);
    }
  };
}

/**
 * 显示提示对话框
 */
export function alert(message, title = '提示', options = {}) {
  return new Promise((resolve) => {
    createDialogInstance({
      type: 'info',
      title,
      message,
      showCancel: false,
      confirmText: '确定',
      center: true,
      ...options,
      onConfirm: () => {
        resolve(true);
      },
      onClose: () => {
        resolve(true);
      }
    });
  });
}

/**
 * 显示确认对话框
 */
export function confirm(message, title = '确认', options = {}) {
  return new Promise((resolve) => {
    createDialogInstance({
      type: 'confirm',
      title,
      message,
      showCancel: true,
      confirmText: '确定',
      cancelText: '取消',
      center: true,
      ...options,
      onConfirm: () => {
        resolve(true);
      },
      onCancel: () => {
        resolve(false);
      },
      onClose: () => {
        resolve(false);
      }
    });
  });
}

/**
 * 显示成功对话框
 */
export function success(message, title = '成功', options = {}) {
  return new Promise((resolve) => {
    createDialogInstance({
      type: 'success',
      title,
      message,
      showCancel: false,
      confirmText: '确定',
      center: true,
      ...options,
      onConfirm: () => {
        resolve(true);
      },
      onClose: () => {
        resolve(true);
      }
    });
  });
}

/**
 * 显示警告对话框
 */
export function warning(message, title = '警告', options = {}) {
  return new Promise((resolve) => {
    createDialogInstance({
      type: 'warning',
      title,
      message,
      showCancel: false,
      confirmText: '确定',
      center: true,
      ...options,
      onConfirm: () => {
        resolve(true);
      },
      onClose: () => {
        resolve(true);
      }
    });
  });
}

/**
 * 显示错误对话框
 */
export function error(message, title = '错误', options = {}) {
  return new Promise((resolve) => {
    createDialogInstance({
      type: 'error',
      title,
      message,
      showCancel: false,
      confirmText: '确定',
      center: true,
      ...options,
      onConfirm: () => {
        resolve(true);
      },
      onClose: () => {
        resolve(true);
      }
    });
  });
}

/**
 * 显示自定义对话框
 */
export function dialog(options) {
  return createDialogInstance(options);
}

/**
 * 导出默认对象
 */
export default {
  alert,
  confirm,
  success,
  warning,
  error,
  dialog
};
