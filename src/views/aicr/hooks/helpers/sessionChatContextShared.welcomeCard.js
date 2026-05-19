import { getIconClass } from '/cdn/icons/iconMap.js';

export const createSessionChatContextWelcomeCard = ({
    renderMarkdownHtml,
    formatDate,
    escapeHtml
}) => {
    const buildWelcomeCardHtml = (pageInfo, session = null) => {
        try {
            const sessionTags = session && Array.isArray(session.tags) ? session.tags.filter(t => t && t.trim()) : [];
            const sessionMessages = session && Array.isArray(session.messages) ? session.messages : [];
            const sessionCreatedAt = session && session.createdAt ? session.createdAt : null;
            const sessionUpdatedAt = session && session.updatedAt ? session.updatedAt : null;

            const hasSessionUrl = session && session.url && session.url.trim();
            const shouldShowUrl = !session || hasSessionUrl;

            let pageInfoHtml = '<div class="welcome-card">';

            const hasTitle = pageInfo && pageInfo.title && pageInfo.title.trim();
            const hasUrl = shouldShowUrl && pageInfo && pageInfo.url && pageInfo.url.trim();
            const hasDescription = pageInfo && pageInfo.description && pageInfo.description.trim();
            const hasAnyContent = hasTitle || hasUrl || hasDescription || sessionTags.length > 0 ||
                sessionMessages.length > 0 || sessionCreatedAt || sessionUpdatedAt;

            if (!hasAnyContent) {
                pageInfoHtml += `
                        <div class="welcome-card-header">
                            <span class="welcome-card-title">当前页面</span>
                        </div>
                        <div class="welcome-card-section">
                            <div class="welcome-card-empty">暂无页面信息</div>
                        </div>
                    `;
                pageInfoHtml += '</div>';
                return pageInfoHtml;
            }

            if (hasTitle) {
                pageInfoHtml += `
                        <div class="welcome-card-header">
                            <span class="welcome-card-title">${escapeHtml(pageInfo.title)}</span>
                        </div>
                    `;
            }

            if (hasUrl) {
                const urlId = `welcome-url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                pageInfoHtml += `
                        <div class="welcome-card-section">
                            <div class="welcome-card-section-header">
                                <div class="welcome-card-section-title">🔗 网址</div>
                                <button type="button" class="welcome-card-action-btn" data-copy-target="${urlId}" title="复制网址" aria-label="复制网址">
                                    <yi-icon name="copy"></yi-icon>
                                </button>
                            </div>
                            <a href="${escapeHtml(pageInfo.url)}" target="_blank" class="welcome-card-url" id="${urlId}">${escapeHtml(pageInfo.url)}</a>
                        </div>
                    `;
            }

            if (hasDescription) {
                const descId = `welcome-desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                pageInfoHtml += `
                        <div class="welcome-card-section welcome-card-description">
                            <div class="welcome-card-section-header">
                                <div class="welcome-card-section-title">📝 页面描述</div>
                                <button type="button" class="welcome-card-action-btn" data-copy-text="${escapeHtml(pageInfo.description)}" title="复制描述" aria-label="复制描述">
                                    <yi-icon name="copy"></yi-icon>
                                </button>
                            </div>
                            <div class="markdown-content md-preview-body" id="${descId}">${renderMarkdownHtml(pageInfo.description, { breaks: true, gfm: true })}</div>
                        </div>
                    `;
            }

            if (sessionTags.length > 0) {
                const tagsHtml = sessionTags.map(tag => {
                    const escapedTag = escapeHtml(tag);
                    return `<span class="welcome-card-tag">${escapedTag}</span>`;
                }).join('');
                pageInfoHtml += `
                        <div class="welcome-card-section">
                            <div class="welcome-card-section-title">🏷️ 标签</div>
                            <div class="welcome-card-tags">${tagsHtml}</div>
                        </div>
                    `;
            }

            if (sessionMessages.length > 0) {
                const userMessages = sessionMessages.filter(m => m.type === 'user' || m.role === 'user').length;
                pageInfoHtml += `
                        <div class="welcome-card-section">
                            <div class="welcome-card-section-title">💬 对话记录</div>
                            <div class="welcome-card-meta">
                                <span>共 ${sessionMessages.length} 条消息</span>
                                ${userMessages > 0 ? `<span>（用户: ${userMessages} 条）</span>` : ''}
                            </div>
                        </div>
                    `;
            }

            if (sessionCreatedAt || sessionUpdatedAt) {
                const createdDate = sessionCreatedAt ? new Date(sessionCreatedAt) : null;
                const updatedDate = sessionUpdatedAt ? new Date(sessionUpdatedAt) : null;
                const hasValidCreated = createdDate && !isNaN(createdDate.getTime());
                const hasValidUpdated = updatedDate && !isNaN(updatedDate.getTime());
                const isSameTime = hasValidCreated && hasValidUpdated &&
                    Math.abs(createdDate.getTime() - updatedDate.getTime()) < 60000;

                if (hasValidCreated || hasValidUpdated) {
                    pageInfoHtml += `
                            <div class="welcome-card-section">
                                <div class="welcome-card-section-title">⏰ 时间信息</div>
                                <div class="welcome-card-meta">
                                    ${hasValidCreated ? `<span>创建: ${escapeHtml(formatDate(createdDate))}</span>` : ''}
                                    ${hasValidUpdated && !isSameTime ? `<span>更新: ${escapeHtml(formatDate(updatedDate))}</span>` : ''}
                                </div>
                            </div>
                        `;
                }
            }

            pageInfoHtml += '</div>';
            return pageInfoHtml;
        } catch (_) {
            return '<div class="welcome-card"><div class="welcome-card-empty">构建欢迎卡片失败</div></div>';
        }
    };

    const buildWelcomeCardHtmlForSession = (session) => {
        if (!session) return '';
        try {
            const pageInfo = {
                title: session.title || '当前页面',
                url: session.url || '',
                description: session.pageDescription || ''
            };
            return buildWelcomeCardHtml(pageInfo, session);
        } catch (_) {
            return '';
        }
    };

    const bindWelcomeCardEvents = (container) => {
        if (!container) return;

        const copyButtons = container.querySelectorAll('[data-copy-target], [data-copy-text]');
        copyButtons.forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                let textToCopy = '';

                const copyTarget = btn.getAttribute('data-copy-target');
                if (copyTarget) {
                    const targetElement = container.querySelector(`#${copyTarget}`);
                    if (targetElement) {
                        textToCopy = targetElement.textContent || targetElement.innerText || '';
                    }
                }

                if (!textToCopy) {
                    const copyText = btn.getAttribute('data-copy-text');
                    if (copyText) {
                        textToCopy = copyText;
                    }
                }

                if (!textToCopy) return;

                const showOk = () => {
                    const icon = btn.querySelector('yi-icon i, .fas.fa-copy, .fas.fa-check');
                    if (!icon) return;
                    const originalClass = icon.className;
                    icon.className = getIconClass('success');
                    btn.style.color = 'rgba(34, 197, 94, 0.9)';
                    setTimeout(() => {
                        icon.className = originalClass;
                        btn.style.color = '';
                    }, 2000);
                };

                try {
                    await navigator.clipboard.writeText(textToCopy);
                    showOk();
                } catch (err) {
                    try {
                        const textArea = document.createElement('textarea');
                        textArea.value = textToCopy;
                        textArea.style.position = 'fixed';
                        textArea.style.opacity = '0';
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        showOk();
                    } catch (e2) {
                        try { console.warn('Copy failed:', err, e2); } catch (_) { }
                    }
                }
            });
        });
    };

    return {
        buildWelcomeCardHtml,
        buildWelcomeCardHtmlForSession,
        bindWelcomeCardEvents
    };
};
