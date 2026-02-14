import {
    MESSAGE_TYPES,
    showMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearMessages,
    getViewportInfo,
    updateMessagePositionManually
} from './messageCore.js';

export {
    MESSAGE_TYPES,
    showMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearMessages,
    getViewportInfo,
    updateMessagePositionManually
};

if (typeof window !== 'undefined') {
    window.showMessage = showMessage;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showWarning = showWarning;
    window.showInfo = showInfo;
    window.clearMessages = clearMessages;
    window.MESSAGE_TYPES = MESSAGE_TYPES;
}

