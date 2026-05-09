import { sortFileTreeRecursively } from './fileTreeUtils.js';

const fileTreeComputed = {
    allTags() {
        if (!Array.isArray(this.tree)) return [];

        // 收集一级目录名（header 层级的标签）
        const firstLevelFolders = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder') {
                firstLevelFolders.add(item.name);
            }
        }

        // header 中已选中的一级标签
        const selectedFirstLevel = this.selectedTags.filter(t => firstLevelFolders.has(t));

        let tags;
        if (selectedFirstLevel.length > 0) {
            // 显示下一层级：已选一级目录下的子目录名
            tags = new Set();
            for (const item of this.tree) {
                if (item.type === 'folder' && selectedFirstLevel.includes(item.name) && Array.isArray(item.children)) {
                    for (const child of item.children) {
                        if (child.type === 'folder') {
                            tags.add(child.name);
                        }
                    }
                }
            }
        } else {
            // 无选中时显示一级目录（与 header 一致）
            tags = firstLevelFolders;
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

        // 判断当前显示哪一层级的标签
        const firstLevelFolders = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder') firstLevelFolders.add(item.name);
        }
        const selectedFirstLevel = this.selectedTags.filter(t => firstLevelFolders.has(t));

        if (selectedFirstLevel.length > 0) {
            // 二级标签：统计已选一级目录下各子目录的文件数
            for (const item of this.tree) {
                if (item.type === 'folder' && selectedFirstLevel.includes(item.name) && Array.isArray(item.children)) {
                    for (const child of item.children) {
                        if (child.type === 'folder') {
                            counts[child.name] = (counts[child.name] || 0) + countFilesInFolder(child.children || []);
                        }
                    }
                }
            }
        } else {
            // 一级标签：统计各一级目录的文件数
            for (const item of this.tree) {
                if (item.type === 'file') {
                    noTagsCount++;
                } else if (item.type === 'folder') {
                    counts[item.name] = countFilesInFolder(item.children || []);
                }
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
