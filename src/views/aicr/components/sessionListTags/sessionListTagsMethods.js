const sessionListTagsMethods = {
    updateTagSearch(keyword) {
        this.$emit('tag-filter-search', keyword);
    },
    toggleTag(tag) {
        const currentTags = this.selectedTags || [];
        const newTags = [...currentTags];
        const index = newTags.indexOf(tag);
        if (index > -1) {
            newTags.splice(index, 1);
        } else {
            newTags.push(tag);
        }
        this.$emit('tag-select', newTags);
    },
    toggleReverse() {
        this.$emit('tag-filter-reverse', !this.tagFilterReverse);
    },
    toggleNoTags() {
        this.$emit('tag-filter-no-tags', !this.tagFilterNoTags);
    },
    toggleExpand() {
        this.$emit('tag-filter-expand', !this.tagFilterExpanded);
    },
    clearAllFilters() {
        this.$emit('tag-clear');
    },
    saveTagOrder(order) {
        try {
            localStorage.setItem('aicr_file_tag_order', JSON.stringify(order));
            this.tagOrderVersion = (this.tagOrderVersion || 0) + 1;
        } catch (e) {
            console.warn('[SessionListTags] 保存标签顺序失败:', e);
        }
    },
    handleDragStart(e, tag) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tag);
        e.currentTarget.classList.add('dragging');

        // 缓存拖拽方向，避免 dragover 高频事件中触发强制同步布局
        this._dragDirectionHorizontal = this.isHorizontalDrag();

        const dragImage = e.currentTarget.cloneNode(true);
        dragImage.style.opacity = '0.8';
        dragImage.style.transform = 'rotate(3deg)';
        dragImage.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);

        setTimeout(() => {
            if (dragImage.parentNode) {
                dragImage.parentNode.removeChild(dragImage);
            }
        }, 0);
    },
    isHorizontalDrag() {
        const header = this.$el ? this.$el.closest('.aicr-header') : document.querySelector('.aicr-header');
        if (!header) return false;
        return getComputedStyle(header).flexDirection === 'row';
    },
    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');

        const container = this.$el || document;
        container.querySelectorAll('.tag-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right', 'drag-hover');
        });

        delete this._dragDirectionHorizontal;
    },
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        if (e.currentTarget.classList.contains('dragging')) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const isHorizontal = this._dragDirectionHorizontal !== undefined
            ? this._dragDirectionHorizontal
            : this.isHorizontalDrag();

        const container = this.$el || document;
        container.querySelectorAll('.tag-item').forEach(item => {
            if (!item.classList.contains('dragging')) {
                item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right', 'drag-hover');
            }
        });

        if (isHorizontal) {
            const midX = rect.left + rect.width / 2;
            if (e.clientX < midX) {
                e.currentTarget.classList.add('drag-over-left');
                e.currentTarget.classList.remove('drag-over-right');
            } else {
                e.currentTarget.classList.add('drag-over-right');
                e.currentTarget.classList.remove('drag-over-left');
            }
        } else {
            const midY = rect.top + rect.height / 2;
            if (e.clientY < midY) {
                e.currentTarget.classList.add('drag-over-top');
                e.currentTarget.classList.remove('drag-over-bottom');
            } else {
                e.currentTarget.classList.add('drag-over-bottom');
                e.currentTarget.classList.remove('drag-over-top');
            }
        }

        e.currentTarget.classList.add('drag-hover');
    },
    handleDragLeave(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right', 'drag-hover');
        }
    },
    handleDrop(e, targetTag) {
        e.preventDefault();
        e.stopPropagation();

        const draggedTag = e.dataTransfer.getData('text/plain');

        if (draggedTag === targetTag) {
            return;
        }

        const currentOrder = this.allTags || [];
        const draggedIndex = currentOrder.indexOf(draggedTag);
        const targetIndex = currentOrder.indexOf(targetTag);

        if (draggedIndex === -1 || targetIndex === -1) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const isHorizontal = this._dragDirectionHorizontal !== undefined
            ? this._dragDirectionHorizontal
            : this.isHorizontalDrag();
        let insertIndex = targetIndex;

        if (isHorizontal) {
            const midX = rect.left + rect.width / 2;
            if (e.clientX >= midX) {
                insertIndex = targetIndex + 1;
            }
        } else {
            const midY = rect.top + rect.height / 2;
            if (e.clientY >= midY) {
                insertIndex = targetIndex + 1;
            }
        }

        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1);
        if (insertIndex > draggedIndex) {
            insertIndex--;
        }
        newOrder.splice(insertIndex, 0, draggedTag);

        this.saveTagOrder(newOrder);

        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-left', 'drag-over-right', 'drag-hover');
    }
};

export { sessionListTagsMethods };
