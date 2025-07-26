export const useMethods = (store) => {
    const showError = (message) => {
        if (!message) return;
        alert(`❌ ${message}`);
        console.error('[错误]', message);
    };
    const showSuccess = (message) => {
        if (!message) return;
        console.log('[成功]', message);
    };
    const openLink = (link) => {
        if (!link) {
            showError('链接地址为空');
            return;
        }
        try {
            if (/^https?:\/\//.test(link)) {
                window.open(link, '_blank');
            } else {
                window.location.href = link;
            }
        } catch (err) {
            showError('打开链接失败: ' + (err && err.message ? err.message : '未知错误'));
        }
    };
    const copyExample = (command) => {
        if (!command) return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(command).then(() => {
                showSuccess('已复制到剪贴板');
            }, () => {
                showError('复制失败');
            });
        } else {
            // 兼容旧浏览器
            const textarea = document.createElement('textarea');
            textarea.value = command;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showSuccess('已复制到剪贴板');
            } catch (err) {
                showError('复制失败');
            }
            document.body.removeChild(textarea);
        }
    };
    const handleSearchInput = (e) => {
        store.setSearchKeyword(e.target.value);
    };
    const handleSearchKeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
        }
    };
    const clearSearch = () => {
        store.setSearchKeyword('');
    };
    const switchCategory = (category) => {
        store.setCurrentCategory(category);
    };
    const toggleTag = (tag) => {
        const idx = store.selectedTags.value.indexOf(tag);
        if (idx === -1) {
            store.selectedTags.value.push(tag);
        } else {
            store.selectedTags.value.splice(idx, 1);
        }
    };
    return {
        showError,
        showSuccess,
        openLink,
        handleSearchInput,
        handleSearchKeydown,
        clearSearch,
        switchCategory,
        toggleTag,
        copyExample
    };
}; 
