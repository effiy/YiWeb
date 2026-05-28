import { getFirstLevelNames, extractStoryNames } from '/src/views/aicr/utils/filterHelpers.js';

const fileTreeComputed = {
    sidebarStoryTags() {
        if (!Array.isArray(this.tree)) return [];

        const firstLevelNames = getFirstLevelNames(this.tree);
        const firstLevelTags = this.selectedTags.filter(t => firstLevelNames.has(t));

        if (firstLevelTags.length === 0) return [];

        const selectedTypes = this.selectedTypeTags || [];
        const hasType = selectedTypes.length > 0;

        const allowedKeys = this.claudeFilterAllowedSessionKeys;
        const hasSessionFilter = allowedKeys && allowedKeys.size > 0;

        const tags = new Set();

        const countInScope = (items) => {
            if (!Array.isArray(items)) return 0;
            let count = 0;
            for (const item of items) {
                if (item.type === 'file') {
                    if (hasSessionFilter && (item.sessionKey == null || !allowedKeys.has(String(item.sessionKey)))) continue;
                    if (!hasType) { count++; continue; }
                    const fileName = (item.name || '').replace(/\.md$/i, '');
                    if (selectedTypes.includes(fileName)) count++;
                } else if (item.type === 'folder' && item.children) {
                    count += countInScope(item.children);
                }
            }
            return count;
        };

        const collectStories = (items, parentName = '') => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (item.type === 'folder') {
                    if (parentName === '故事任务面板') {
                        if (!hasType || countInScope(item.children || []) > 0) {
                            tags.add(item.name);
                        }
                    }
                    if (item.children) collectStories(item.children, item.name);
                }
            }
        };

        for (const item of this.tree) {
            if (item.type === 'folder' && firstLevelTags.includes(item.name)) {
                collectStories(item.children || []);
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
    sidebarStoryCounts() {
        const counts = {};
        let noTagsCount = 0;

        const selectedTypes = this.selectedTypeTags || [];
        const hasType = selectedTypes.length > 0;

        const allowedKeys = this.claudeFilterAllowedSessionKeys;
        const hasSessionFilter = allowedKeys && allowedKeys.size > 0;

        const countFilesInFolder = (items) => {
            let fileCount = 0;
            if (!Array.isArray(items)) return fileCount;
            for (const item of items) {
                if (item.type === 'file') {
                    if (hasSessionFilter && (item.sessionKey == null || !allowedKeys.has(String(item.sessionKey)))) continue;
                    if (!hasType) { fileCount++; continue; }
                    const fileName = (item.name || '').replace(/\.md$/i, '');
                    if (selectedTypes.includes(fileName)) fileCount++;
                } else if (item.type === 'folder' && item.children) {
                    fileCount += countFilesInFolder(item.children);
                }
            }
            return fileCount;
        };

        const firstLevelNames = getFirstLevelNames(this.tree);
        const firstLevelTags = this.selectedTags.filter(t => firstLevelNames.has(t));

        if (firstLevelTags.length === 0) return { counts: {}, noTagsCount: 0 };

        const collectCounts = (items, parentName = '') => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (item.type === 'folder') {
                    if (parentName === '故事任务面板') {
                        counts[item.name] = (counts[item.name] || 0) + countFilesInFolder(item.children || []);
                    }
                    if (item.children) collectCounts(item.children, item.name);
                }
            }
        };

        for (const item of this.tree) {
            if (item.type === 'folder' && firstLevelTags.includes(item.name)) {
                collectCounts(item.children || []);
            }
        }

        for (const item of this.tree) {
            if (item.type === 'file') {
                if (hasType) continue;
                if (hasSessionFilter && (item.sessionKey == null || !allowedKeys.has(String(item.sessionKey)))) continue;
                noTagsCount++;
            }
        }

        return { counts, noTagsCount };
    },
    filteredTags() {
        const tags = this.sidebarStoryTags;

        return tags.sort((a, b) => {
            const countA = this.sidebarStoryCounts.counts[a] || 0;
            const countB = this.sidebarStoryCounts.counts[b] || 0;
            if (countA !== countB) return countB - countA;

            return a.localeCompare(b, 'zh-CN');
        });
    },
    visibleTags() {
        return this.filteredTags;
    },
    hasMoreTags() {
        return false;
    },
    sortedTree() {
        if (!Array.isArray(this.tree)) return [];

        const firstLevelNames = getFirstLevelNames(this.tree);
        const storyNameSet = new Set(extractStoryNames(this.tree));
        const firstLevelTags = this.selectedTags.filter(t => firstLevelNames.has(t));
        const secondLevelTags = this.selectedTags.filter(t => storyNameSet.has(t));

        let filteredItems = this.tree;

        // 会话搜索
        const sessionQuery = this.sessionSearchQuery && this.sessionSearchQuery.trim()
            ? this.sessionSearchQuery.trim().toLowerCase()
            : '';
        if (sessionQuery) {
            filteredItems = filteredItems.filter(item => {
                if (item.type === 'folder') {
                    const nameMatch = (item.name || '').toLowerCase().includes(sessionQuery);
                    if (nameMatch) return true;
                    if (Array.isArray(item.children)) {
                        return item.children.some(child =>
                            (child.name || '').toLowerCase().includes(sessionQuery)
                        );
                    }
                    return false;
                }
                return (item.name || '').toLowerCase().includes(sessionQuery);
            });
        }

        // Skills/Templates 筛选
        const allowedKeys = this.claudeFilterAllowedSessionKeys;
        if (allowedKeys && allowedKeys.size > 0) {
            const filterBySession = (items) => {
                if (!Array.isArray(items)) return [];
                const result = [];
                for (const item of items) {
                    if (item.type === 'file') {
                        if (item.sessionKey != null && allowedKeys.has(String(item.sessionKey))) {
                            result.push(item);
                        }
                    } else if (item.type === 'folder' && item.children) {
                        const filteredChildren = filterBySession(item.children);
                        if (filteredChildren.length > 0) {
                            result.push({ ...item, children: filteredChildren });
                        }
                    }
                }
                return result;
            };
            filteredItems = filterBySession(filteredItems);
        }

        // 一级标签筛选
        if (firstLevelTags.length > 0 || this.tagFilterNoTags) {
            const result = [];

            for (const item of filteredItems) {
                if (item.type === 'folder') {
                    const isTagSelected = firstLevelTags.includes(item.name);
                    let shouldInclude = false;

                    if (firstLevelTags.length > 0) {
                        shouldInclude = isTagSelected;
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
                    }

                    if (shouldInclude) {
                        result.push(item);
                    }
                }
            }

            filteredItems = result;
        }

        // 二级标签筛选
        if (secondLevelTags.length > 0) {
            const filterByStory = (items, inMatchingStory = false, parentName = '') => {
                if (!Array.isArray(items)) return [];
                const result = [];
                for (const item of items) {
                    if (item.type === 'file') {
                        if (inMatchingStory) {
                            result.push(item);
                        }
                    } else if (item.type === 'folder') {
                        const isStory = (parentName === '故事任务面板');
                        const isMatch = isStory && secondLevelTags.includes(item.name);
                        if (isMatch) {
                            result.push(item);
                        } else if (item.children) {
                            const filtered = filterByStory(item.children, inMatchingStory, item.name);
                            if (filtered.length > 0) {
                                result.push({ ...item, children: filtered });
                            }
                        }
                    }
                }
                return result;
            };
            filteredItems = filterByStory(filteredItems);
        }

        // 类型筛选
        const selectedTypes = this.selectedTypeTags || [];
        if (selectedTypes.length > 0) {
            const filterByType = (items) => {
                if (!Array.isArray(items)) return [];
                const result = [];
                for (const item of items) {
                    if (item.type === 'file') {
                        const fileName = (item.name || '').replace(/\.md$/i, '');
                        if (selectedTypes.includes(fileName)) {
                            result.push(item);
                        }
                    } else if (item.type === 'folder' && item.children) {
                        const filteredChildren = filterByType(item.children);
                        if (filteredChildren.length > 0) {
                            result.push({ ...item, children: filteredChildren });
                        }
                    }
                }
                return result;
            };
            filteredItems = filterByType(filteredItems);
        }

        if (this.searchQuery && this.searchQuery.trim()) {
            return this.filterTree(filteredItems, this.searchQuery.trim().toLowerCase());
        }

        return filteredItems;
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
    },
    groupedFiles() {
        const groups = [];
        const collect = (items, storyName) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (item.type === 'file') {
                    const name = storyName || '未归类';
                    let group = groups.find(g => g.name === name);
                    if (!group) {
                        group = { name, files: [] };
                        groups.push(group);
                    }
                    group.files.push(item);
                } else if (item.type === 'folder' && Array.isArray(item.children)) {
                    collect(item.children, item.name);
                }
            }
        };
        collect(this.sortedTree, '');
        return groups;
    }
};

export { fileTreeComputed };
