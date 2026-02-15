export function findMermaidActionButton(actionName, diagramId) {
    const roots = [];
    const fullscreenModal = document.getElementById('mermaid-fullscreen-modal');
    if (fullscreenModal) roots.push(fullscreenModal);
    roots.push(document);

    for (const root of roots) {
        const buttons = Array.from(root.querySelectorAll(`button[onclick*="${actionName}"]`));
        for (const button of buttons) {
            const onclick = button.getAttribute('onclick') || '';
            if (onclick.includes(`'${diagramId}'`) || onclick.includes(`"${diagramId}"`)) {
                return button;
            }
        }
    }

    return null;
}

function getMermaidButtonIcon(button) {
    return button ? button.querySelector('i') : null;
}

function rememberMermaidButtonOriginal(button) {
    if (!button) return null;
    const icon = getMermaidButtonIcon(button);
    if (!icon) return null;

    if (typeof button._mermaidOriginalIconClass !== 'string') {
        button._mermaidOriginalIconClass = icon.className;
    }
    if (typeof button._mermaidOriginalIconColor !== 'string') {
        button._mermaidOriginalIconColor = icon.style.color || '';
    }

    return icon;
}

function restoreMermaidButton(button) {
    if (!button) return;
    const icon = getMermaidButtonIcon(button);
    if (!icon) return;

    if (button._mermaidRestoreTimer) {
        clearTimeout(button._mermaidRestoreTimer);
        button._mermaidRestoreTimer = null;
    }

    button.disabled = false;
    button.style.transition = '';
    button.style.transform = '';
    button.style.opacity = '';

    if (typeof button._mermaidOriginalIconClass === 'string') {
        icon.className = button._mermaidOriginalIconClass;
    }
    icon.style.color = typeof button._mermaidOriginalIconColor === 'string' ? button._mermaidOriginalIconColor : '';
    icon.style.transition = '';
}

export function setMermaidButtonLoading(button) {
    const icon = rememberMermaidButtonOriginal(button);
    if (!button || !icon) return;

    if (button._mermaidRestoreTimer) {
        clearTimeout(button._mermaidRestoreTimer);
        button._mermaidRestoreTimer = null;
    }

    button.disabled = true;
    button.style.opacity = '0.85';
    icon.className = 'fas fa-spinner fa-spin';
    icon.style.color = '';
}

export function flashMermaidButtonIcon(button, iconClass, color, durationMs = 600) {
    const icon = rememberMermaidButtonOriginal(button);
    if (!button || !icon) return;

    if (button._mermaidRestoreTimer) {
        clearTimeout(button._mermaidRestoreTimer);
        button._mermaidRestoreTimer = null;
    }

    button.style.transition = 'transform 0.2s ease';
    button.style.transform = 'scale(0.95)';
    icon.className = iconClass;
    icon.style.color = color;
    icon.style.transition = 'all 0.2s ease';

    button._mermaidRestoreTimer = setTimeout(() => {
        restoreMermaidButton(button);
    }, durationMs);
}

export function setMermaidButtonSuccess(button, durationMs = 700) {
    if (!button) return;
    button.disabled = true;
    flashMermaidButtonIcon(button, 'fas fa-check', 'var(--success, #22c55e)', durationMs);
}

export function setMermaidButtonError(button, durationMs = 900) {
    if (!button) return;
    button.disabled = true;
    flashMermaidButtonIcon(button, 'fas fa-times', 'var(--error, #ef4444)', durationMs);
}

export function showMermaidMessage(message, type = 'info') {
    if (window.showMessage && typeof window.showMessage === 'function') {
        window.showMessage(message, type);
        return;
    }

    const messageEl = document.createElement('div');
    messageEl.className = `mermaid-message mermaid-message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;

    document.body.appendChild(messageEl);

    setTimeout(() => {
        messageEl.style.opacity = '1';
        messageEl.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        messageEl.style.opacity = '0';
        messageEl.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageEl.parentNode) {
                document.body.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
}

