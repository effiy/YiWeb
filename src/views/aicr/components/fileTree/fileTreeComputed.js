import { sortFileTreeRecursively } from './fileTreeUtils.js';

const fileTreeComputed = {
    allTags() {
        if (!Array.isArray(this.tree)) return [];

        // 识别选中的一级标签（header 层级），用于联动过滤二级标签
        const firstLevelNames = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder') firstLevelNames.add(item.name);
        }
        const firstLevelTags = this.selectedTags.filter(t => firstLevelNames.has(t));

        // 未选一级标签时不显示二级标签；已选时仅显示匹配一级目录下的二级标签
        if (firstLevelTags.length === 0) return [];
        const tags = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder' && Array.isArray(item.children)) {
                if (firstLevelTags.length > 0 && !firstLevelTags.includes(item.name)) continue;
                for (const child of item.children) {
                    if (child.type === 'folder') {
                        tags.add(child.name);
                    }
                }
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

        // 识别选中的一级标签，联动过滤
        const firstLevelNames = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder') firstLevelNames.add(item.name);
        }
        const firstLevelTags = this.selectedTags.filter(t => firstLevelNames.has(t));

        // 未选一级标签时不统计；已选时仅统计匹配一级目录下的二级目录文件数
        if (firstLevelTags.length === 0) return { counts: {}, noTagsCount: 0 };
        for (const item of this.tree) {
            if (item.type === 'folder' && Array.isArray(item.children)) {
                if (firstLevelTags.length > 0 && !firstLevelTags.includes(item.name)) continue;
                for (const child of item.children) {
                    if (child.type === 'folder') {
                        counts[child.name] = (counts[child.name] || 0) + countFilesInFolder(child.children || []);
                    }
                }
            }
        }

        // 根级文件视为无标签
        for (const item of this.tree) {
            if (item.type === 'file') noTagsCount++;
        }

        return { counts, noTagsCount };
    },
    filteredTags() {
        const tags = this.allTags;

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
        if (this.tagFilterExpanded) {
            return this.filteredTags;
        }
        return this.filteredTags.slice(0, this.tagFilterVisibleCount);
    },
    hasMoreTags() {
        return this.filteredTags.length > this.tagFilterVisibleCount;
    },
    sortedTree() {
        if (!Array.isArray(this.tree)) return [];

        // 区分一级标签（header 层级）和二级标签（sidebar 层级）
        const firstLevelNames = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder') firstLevelNames.add(item.name);
        }
        const firstLevelTags = this.selectedTags.filter(t => firstLevelNames.has(t));
        const secondLevelTags = this.selectedTags.filter(t => !firstLevelNames.has(t));

        let filteredItems = this.tree;

        // 一级标签筛选
        if (firstLevelTags.length > 0 || this.tagFilterNoTags) {
            const result = [];

            for (const item of this.tree) {
                if (item.type === 'folder') {
                    const isTagSelected = firstLevelTags.includes(item.name);
                    let shouldInclude = false;

                    if (firstLevelTags.length > 0) {
                        shouldInclude = this.tagFilterReverse ? !isTagSelected : isTagSelected;
                    } else if (this.tagFilterNoTags) {
                        shouldInclude = false;
                    }

                    if (shouldInclude) {
                        result.push(item);
                    }
                } else if (item.type === 'file') {
                    let shouldInclude = false;

                    if (this.tagFilterNoTags) {
                        shouldInclude = true;
                    } else if (firstLevelTags.length > 0 && this.tagFilterReverse) {
                        shouldInclude = true;
                    }

                    if (shouldInclude) {
                        result.push(item);
                    }
                }
            }

            filteredItems = result;
        }

        // 二级标签筛选：过滤已选一级目录下的子目录
        if (secondLevelTags.length > 0) {
            filteredItems = filteredItems.map(item => {
                if (item.type !== 'folder' || !Array.isArray(item.children)) return item;
                const filteredChildren = item.children.filter(child => {
                    if (child.type === 'folder') {
                        return secondLevelTags.includes(child.name);
                    }
                    return true;
                });
                return { ...item, children: filteredChildren };
            });
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
