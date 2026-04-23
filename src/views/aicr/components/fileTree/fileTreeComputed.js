import { sortFileTreeRecursively } from './fileTreeUtils.js';

const fileTreeComputed = {
    allTags() {
        if (!Array.isArray(this.tree)) return [];

        // 只收集一级目录作为标签
        const tags = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder') {
                tags.add(item.name);
            }
        }

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

        // 统计一级目录下所有文件数量（包括子文件夹中的文件）
        const countFilesInFolder = (items) => {
            let fileCount = 0;
            if (!Array.isArray(items)) return fileCount;
            for (const item of items) {
                if (item.type === 'file') {
                    fileCount++;
                } else if (item.type === 'folder' && item.children) {
                    fileCount += countFilesInFolder(item.children);
                }
            }
            return fileCount;
        };

        // 遍历根目录
        for (const item of this.tree) {
            if (item.type === 'file') {
                noTagsCount++;
            } else if (item.type === 'folder') {
                counts[item.name] = countFilesInFolder(item.children || []);
            }
        }

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

        // 如果有任何筛选条件
        if (this.selectedTags.length > 0 || this.tagFilterNoTags) {
            const result = [];

            for (const item of this.tree) {
                if (item.type === 'folder') {
                    const isTagSelected = this.selectedTags.includes(item.name);
                    let shouldInclude = false;

                    if (this.selectedTags.length > 0) {
                        // 根据是否反向过滤决定是否包含该文件夹
                        shouldInclude = this.tagFilterReverse ? !isTagSelected : isTagSelected;
                    } else if (this.tagFilterNoTags) {
                        // 只选中无标签筛选时，不包含文件夹
                        shouldInclude = false;
                    }

                    if (shouldInclude) {
                        result.push(item);
                    }
                } else if (item.type === 'file') {
                    let shouldInclude = false;

                    if (this.tagFilterNoTags) {
                        // 无标签筛选时包含根目录文件
                        shouldInclude = true;
                    } else if (this.selectedTags.length > 0 && this.tagFilterReverse) {
                        // 反向过滤时也包含根目录文件
                        shouldInclude = true;
                    }

                    if (shouldInclude) {
                        result.push(item);
                    }
                }
            }

            filteredItems = result;
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
