const fileTreeComputed = {
    allTags() {
        if (!Array.isArray(this.tree)) return [];

        // 联动一级标签：一级标签选中后才显示对应的二级标签
        const firstLevelNames = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder') firstLevelNames.add(item.name);
        }
        const firstLevelTags = this.selectedTags.filter(t => firstLevelNames.has(t));

        // 未选一级标签时不显示二级标签；已选时仅显示匹配一级目录下的二级标签
        if (firstLevelTags.length === 0) return [];

        const selectedPrefixes = this.selectedPrefixTags || [];
        const hasPrefix = selectedPrefixes.length > 0;
        const selectedSuffixes = this.selectedSuffixTags || [];
        const hasSuffix = selectedSuffixes.length > 0;

        const getSuffix = (name) => {
            const lastDot = name.lastIndexOf('.');
            const base = lastDot > 0 ? name.substring(0, lastDot) : name;
            const parts = base.split('-');
            if (parts.length <= 1) return null;
            return parts[parts.length - 1];
        };

        const fileMatchesPrefix = (name) => {
            if (!hasPrefix) return true;
            const sepIdx = Math.min(
                ...['-', '_', '.'].map(s => { const i = name.indexOf(s); return i === -1 ? Infinity : i; })
            );
            if (sepIdx === Infinity || sepIdx === 0) return false;
            return selectedPrefixes.includes(name.substring(0, sepIdx));
        };

        const fileMatchesSuffix = (name) => {
            if (!hasSuffix) return true;
            const suffix = getSuffix(name);
            if (!suffix) return false;
            return selectedSuffixes.includes(suffix);
        };

        const fileMatches = (name) => fileMatchesPrefix(name) && fileMatchesSuffix(name);

        const folderHasMatchingFile = (items) => {
            if (!Array.isArray(items)) return false;
            for (const item of items) {
                if (item.type === 'file' && fileMatches(item.name || '')) return true;
                if (item.type === 'folder' && item.children && folderHasMatchingFile(item.children)) return true;
            }
            return false;
        };

        const tags = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder' && Array.isArray(item.children)) {
                if (!firstLevelTags.includes(item.name)) continue;
                for (const child of item.children) {
                    if (child.type === 'folder') {
                        if ((hasPrefix || hasSuffix) && !folderHasMatchingFile(child.children || [])) continue;
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

        // 联动一级标签：仅统计选中一级目录下的二级目录文件数
        const firstLevelNames = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder') firstLevelNames.add(item.name);
        }
        const firstLevelTags = this.selectedTags.filter(t => firstLevelNames.has(t));

        if (firstLevelTags.length === 0) return { counts: {}, noTagsCount: 0 };

        const selectedPrefixes = this.selectedPrefixTags || [];
        const hasPrefix = selectedPrefixes.length > 0;
        const selectedSuffixes = this.selectedSuffixTags || [];
        const hasSuffix = selectedSuffixes.length > 0;

        const getSuffix = (name) => {
            const lastDot = name.lastIndexOf('.');
            const base = lastDot > 0 ? name.substring(0, lastDot) : name;
            const parts = base.split('-');
            if (parts.length <= 1) return null;
            return parts[parts.length - 1];
        };

        const fileMatchesPrefix = (name) => {
            if (!hasPrefix) return true;
            const sepIdx = Math.min(
                ...['-', '_', '.'].map(s => { const i = name.indexOf(s); return i === -1 ? Infinity : i; })
            );
            if (sepIdx === Infinity || sepIdx === 0) return false;
            return selectedPrefixes.includes(name.substring(0, sepIdx));
        };

        const fileMatchesSuffix = (name) => {
            if (!hasSuffix) return true;
            const suffix = getSuffix(name);
            if (!suffix) return false;
            return selectedSuffixes.includes(suffix);
        };

        const fileMatches = (name) => fileMatchesPrefix(name) && fileMatchesSuffix(name);

        const countMatchingFilesInFolder = (items) => {
            let fileCount = 0;
            if (!Array.isArray(items)) return fileCount;
            for (const item of items) {
                if (item.type === 'file') {
                    if (fileMatches(item.name || '')) fileCount++;
                } else if (item.type === 'folder' && item.children) {
                    fileCount += countMatchingFilesInFolder(item.children);
                }
            }
            return fileCount;
        };

        for (const item of this.tree) {
            if (item.type === 'folder' && Array.isArray(item.children)) {
                if (!firstLevelTags.includes(item.name)) continue;
                for (const child of item.children) {
                    if (child.type === 'folder') {
                        counts[child.name] = (counts[child.name] || 0) + countMatchingFilesInFolder(child.children || []);
                    }
                }
            }
        }

        // 根级文件视为无标签
        for (const item of this.tree) {
            if (item.type === 'file') {
                if (fileMatches(item.name || '')) noTagsCount++;
            }
        }

        return { counts, noTagsCount };
    },
    filteredTags() {
        const tags = this.allTags;

        // 稳定排序：按文件数量降序，数量相同按名称排序
        // 不按选中状态排序，避免点击标签时位置跳变
        return tags.sort((a, b) => {
            const countA = this.tagCounts.counts[a] || 0;
            const countB = this.tagCounts.counts[b] || 0;
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

        // 区分一级标签（header 层级）和二级标签（sidebar 层级）
        const firstLevelNames = new Set();
        for (const item of this.tree) {
            if (item.type === 'folder') firstLevelNames.add(item.name);
        }
        const firstLevelTags = this.selectedTags.filter(t => firstLevelNames.has(t));
        const secondLevelTags = this.selectedTags.filter(t => !firstLevelNames.has(t));

        let filteredItems = this.tree;

        // 会话搜索：按顶层文件夹名称过滤
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

        // 前缀标签筛选
        if (this.selectedPrefixTags && this.selectedPrefixTags.length > 0) {
            const prefixSet = new Set(this.selectedPrefixTags);
            const getFilePrefix = (name) => {
                const sepIdx = Math.min(
                    ...['-', '_', '.'].map(s => {
                        const i = name.indexOf(s);
                        return i === -1 ? Infinity : i;
                    })
                );
                if (sepIdx !== Infinity && sepIdx > 0) {
                    return name.substring(0, sepIdx);
                }
                return null;
            };
            const filterByPrefix = (items) => {
                if (!Array.isArray(items)) return [];
                const result = [];
                for (const item of items) {
                    if (item.type === 'file') {
                        const prefix = getFilePrefix(item.name || '');
                        if (prefix && prefixSet.has(prefix)) {
                            result.push(item);
                        }
                    } else if (item.type === 'folder') {
                        const filteredChildren = item.children ? filterByPrefix(item.children) : [];
                        if (filteredChildren.length > 0) {
                            result.push({ ...item, children: filteredChildren });
                        }
                    }
                }
                return result;
            };
            filteredItems = filterByPrefix(filteredItems);
        }

        // 后缀标签筛选
        if (this.selectedSuffixTags && this.selectedSuffixTags.length > 0) {
            const suffixSet = new Set(this.selectedSuffixTags);
            const getFileSuffix = (name) => {
                const lastDot = name.lastIndexOf('.');
                const base = lastDot > 0 ? name.substring(0, lastDot) : name;
                const parts = base.split('-');
                if (parts.length <= 1) return null;
                return parts[parts.length - 1];
            };
            const filterBySuffix = (items) => {
                if (!Array.isArray(items)) return [];
                const result = [];
                for (const item of items) {
                    if (item.type === 'file') {
                        const suffix = getFileSuffix(item.name || '');
                        if (suffix && suffixSet.has(suffix)) {
                            result.push(item);
                        }
                    } else if (item.type === 'folder') {
                        const filteredChildren = item.children ? filterBySuffix(item.children) : [];
                        if (filteredChildren.length > 0) {
                            result.push({ ...item, children: filteredChildren });
                        }
                    }
                }
                return result;
            };
            filteredItems = filterBySuffix(filteredItems);
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
