import { sortFileTreeRecursively } from './fileTreeUtils.js';

const fileTreeComputed = {
    allTags() {
        if (!Array.isArray(this.tree)) return [];

        const tags = new Set();
        const traverse = (items) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (item.type === 'folder') {
                    tags.add(item.name);
                    if (item.children) traverse(item.children);
                } else if (item.type === 'file') {
                }
            }
        };
        traverse(this.tree);

        const allTagsArray = Array.from(tags).sort();

        try {
            const saved = localStorage.getItem('aicr_file_tag_order');
            const savedOrder = saved ? JSON.parse(saved) : null;

            if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
                const orderedTags = savedOrder.filter(tag => tags.has(tag));
                const newTags = allTagsArray.filter(tag => !savedOrder.includes(tag));
                return [...orderedTags, ...newTags];
            }
        } catch (e) {
            console.warn('[FileTree] 加载标签顺序失败:', e);
        }

        return allTagsArray;
    },
    tagCounts() {
        const counts = {};
        let noTagsCount = 0;

        const traverse = (items, parentTags = []) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (item.type === 'folder') {
                    const currentTags = [...parentTags, item.name];
                    if (item.children) traverse(item.children, currentTags);
                } else if (item.type === 'file') {
                    if (parentTags.length === 0) {
                        noTagsCount++;
                    } else {
                        for (const tag of parentTags) {
                            counts[tag] = (counts[tag] || 0) + 1;
                        }
                    }
                }
            }
        };

        traverse(this.tree);
        return { counts, noTagsCount };
    },
    filteredTags() {
        let tags = this.allTags;

        if (this.tagFilterSearchKeyword) {
            const keyword = this.tagFilterSearchKeyword.toLowerCase();
            tags = tags.filter(tag => tag.toLowerCase().includes(keyword));
        }

        return tags.sort((a, b) => {
            const isSelectedA = this.selectedTags.includes(a);
            const isSelectedB = this.selectedTags.includes(b);
            if (isSelectedA !== isSelectedB) return isSelectedA ? -1 : 1;

            const countA = this.tagCounts.counts[a] || 0;
            const countB = this.tagCounts.counts[b] || 0;
            if (countA !== countB) return countB - countA;

            return a.localeCompare(b, 'zh-CN');
        });
    },
    visibleTags() {
        if (this.tagFilterExpanded || this.tagFilterSearchKeyword) {
            return this.filteredTags;
        }
        return this.filteredTags.slice(0, this.tagFilterVisibleCount);
    },
    hasMoreTags() {
        return this.filteredTags.length > this.tagFilterVisibleCount;
    },
    sortedTree() {
        if (!Array.isArray(this.tree)) return [];

        let filteredItems = this.tree;

        if (this.selectedTags.length > 0 || this.tagFilterNoTags) {
            const filterByTags = (items, parentTags = []) => {
                const result = [];
                for (const item of items) {
                    if (item.type === 'folder') {
                        const currentTags = [...parentTags, item.name];
                        const children = filterByTags(item.children || [], currentTags);
                        if (children.length > 0) {
                            result.push({ ...item, children });
                        }
                    } else if (item.type === 'file') {
                        let match = false;

                        if (this.tagFilterNoTags && parentTags.length === 0) {
                            match = true;
                        } else if (this.selectedTags.length > 0) {
                            const hasSelectedTag = parentTags.some(tag => this.selectedTags.includes(tag));

                            if (this.tagFilterReverse) {
                                match = !hasSelectedTag;
                            } else {
                                match = hasSelectedTag;
                            }
                        } else if (!this.tagFilterNoTags) {
                            match = true;
                        }

                        if (match) {
                            result.push(item);
                        }
                    }
                }
                return result;
            };

            filteredItems = filterByTags(this.tree);
        }

        const sorted = filteredItems.map(item => sortFileTreeRecursively(item));

        if (this.searchQuery && this.searchQuery.trim()) {
            return this.filterTree(sorted, this.searchQuery.trim().toLowerCase());
        }

        return sorted;
    },
    flattenedFiles() {
        const files = [];
        const flatten = (items) => {
            if (!Array.isArray(items)) return;
            items.forEach(item => {
                if (item.type === 'file') {
                    files.push(item);
                } else if (item.type === 'folder' && Array.isArray(item.children)) {
                    flatten(item.children);
                }
            });
        };

        flatten(this.sortedTree);
        return files;
    }
};

export { fileTreeComputed };
