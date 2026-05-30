import { safeExecute, createError, ErrorTypes } from '/cdn/utils/core/error.js';
import { normalizeFilePath } from '../../utils/fileFieldNormalizer.js';
import { formatFileSizeCompact, sortFileTreeItems } from './fileTreeUtils.js';
import { enrichDocumentPageDescription, needsEnrichment, buildEnrichPrompt } from '/src/core/services/modules/documentEnrichService.js';
import * as GraphEngine from './graph/index.js';

const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
};

const fileTreeMethods = {
    filterTree(items, query) {
        if (!query) return items;

        const filtered = [];
        for (const item of items) {
            const itemName = (item.name || '').toLowerCase();
            const itemPath = (item.path || item.id || '').toLowerCase();
            const matches = itemName.includes(query) || itemPath.includes(query);

            if (item.type === 'folder' && item.children) {
                const filteredChildren = this.filterTree(item.children, query);
                if (matches || filteredChildren.length > 0) {
                    filtered.push({
                        ...item,
                        children: filteredChildren
                    });
                }
            } else if (matches) {
                filtered.push(item);
            }
        }
        return filtered;
    },
    toggleBatchMode() {
        this.$emit('toggle-batch-mode');
    },
    handleDownload() {
        this.$emit('download-project');
    },
    triggerUpload() {
        const input = this.$refs.uploadInput;
        if (input) {
            input.click();
        }
    },
    handleUpload(event) {
        const file = event.target.files?.[0];
        if (file) {
            this.$emit('upload-project', file);
        }
        if (event.target) {
            event.target.value = '';
        }
    },
    handleViewModeChange(mode) {
        return safeExecute(() => {
            if (mode === 'tree' || mode === 'cards') {
                this.$emit('view-mode-change', mode);
            }
        }, '视图模式切换处理');
    },
    sortFileTreeItems(items) {
        return sortFileTreeItems(items);
    },
    handleSessionSearchInput(event) {
        const value = event.target.value;
        if (this.sessionSearchDebounceTimer) {
            clearTimeout(this.sessionSearchDebounceTimer);
        }
        this.sessionSearchDebounceTimer = setTimeout(() => {
            this.$emit('session-search-change', value);
        }, 300);
    },
    handleSessionSearchClear() {
        const input = this.$refs.sessionSearchInput;
        if (input) {
            input.value = '';
        }
        this.$emit('session-search-change', '');
    },
    toggleCollapse() {
        return safeExecute(() => {
            this.$emit('toggle-collapse');
        }, '收起状态切换处理');
    },
    toggleFolder(key) {
        return safeExecute(() => {
            if (!key || typeof key !== 'string') {
                throw createError('文件夹Key无效', ErrorTypes.VALIDATION, '文件夹切换');
            }

            this.$emit('folder-toggle', key);
        }, '文件夹切换处理');
    },
    isFolderExpanded(key) {
        return safeExecute(() => {
            return this.expandedFolders && this.expandedFolders.has(key);
        }, '文件夹展开状态检查');
    },
    selectFile(key) {
        return safeExecute(() => {
            if (key == null) {
                throw createError('文件Key无效', ErrorTypes.VALIDATION, '文件选择');
            }
            const keyStr = String(key);

            const payload = {
                key: keyStr,
                path: keyStr,
                name: keyStr.split('/').pop(),
                type: 'file'
            };

            this.$emit('file-select', payload);
        }, '文件选择处理');
    },
    isFileSelected(key) {
        return safeExecute(() => {
            if (!key) return false;
            if (this.batchMode && this.selectedKeys) {
                const norm = normalizeFilePath(key);
                const keys = this.selectedKeys;
                if (keys instanceof Set) return keys.has(norm);
                if (Array.isArray(keys)) return keys.some(k => normalizeFilePath(k) === norm);
            }
            if (!this.selectedKey) return false;
            return normalizeFilePath(key) === normalizeFilePath(this.selectedKey);
        }, '文件选中状态检查');
    },
    getFileIcon(item) {
        return safeExecute(() => {
            if (item.type === 'folder') {
                return this.isFolderExpanded(item.key) ? '📂' : '📁';
            }

            const fileNameSource = (item && typeof item.name === 'string' && item.name)
                ? item.name
                : (typeof item.path === 'string' && item.path
                    ? item.path.split('/').pop()
                    : (typeof item.key === 'string'
                        ? item.key.split('/').pop()
                        : ''));
            const ext = fileNameSource && fileNameSource.includes('.')
                ? fileNameSource.split('.').pop().toLowerCase()
                : '';
            const iconMap = {
                'js': '📄',
                'ts': '📘',
                'vue': '💚',
                'css': '🎨',
                'html': '🌐',
                'json': '📋',
                'md': '📝',
                'txt': '📄'
            };

            return iconMap[ext] || '📄';
        }, '文件图标获取');
    },
    getFileSizeDisplay(item) {
        return safeExecute(() => {
            if (item.type === 'folder' || !item.size) return '';
            return formatFileSizeCompact(item.size);
        }, '文件大小计算');
    },
    getFileModifiedTime(item) {
        return safeExecute(() => {
            const ts = item.lastModified || item.modified;
            if (!ts) return '';

            const date = new Date(ts);
            return date.toLocaleDateString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }, '文件修改时间格式化');
    },
    getFileExtensionBadge(item) {
        return safeExecute(() => {
            const name = (item && typeof item.name === 'string' && item.name)
                ? item.name
                : (typeof item.path === 'string' && item.path
                    ? item.path.split('/').pop()
                    : '');
            if (!name || !name.includes('.')) return '';
            const ext = name.split('.').pop().toLowerCase();
            if (!ext || ext.length > 10) return '';
            return ext;
        }, '文件扩展名提取');
    },
    handleTagClick(key) {
        return safeExecute(() => {
            if (key == null) {
                throw createError('文件Key无效', ErrorTypes.VALIDATION, '标签点击');
            }
            const keyStr = String(key);

            if (this.batchMode) {
                this.$emit('batch-select-file', keyStr);
                return;
            }

            this.selectFile(keyStr);
        }, '标签点击处理');
    },
    toggleTag(tag) {
        return safeExecute(() => {
            const newTags = [...this.selectedTags];
            const index = newTags.indexOf(tag);
            if (index > -1) {
                newTags.splice(index, 1);
            } else {
                newTags.push(tag);
            }
            this.$emit('tag-select', newTags);
        }, '切换标签选择');
    },
    toggleNoTags() {
        this.$emit('tag-filter-no-tags', !this.tagFilterNoTags);
    },
    clearAllFilters() {
        this.$emit('tag-clear');
    },
    saveTagOrder(order) {
        try {
            localStorage.setItem('aicr_file_tag_order', JSON.stringify(order));
            this.$forceUpdate();
        } catch (e) {
            console.warn('[FileTree] 保存标签顺序失败:', e);
        }
    },
    handleDragStart(e, tag) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tag);
        e.currentTarget.classList.add('dragging');

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
    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');

        document.querySelectorAll('.tag-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
        });
    },
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        if (e.currentTarget.classList.contains('dragging')) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        document.querySelectorAll('.tag-item').forEach(item => {
            if (!item.classList.contains('dragging')) {
                item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
            }
        });

        if (e.clientY < midY) {
            e.currentTarget.classList.add('drag-over-top');
            e.currentTarget.classList.remove('drag-over-bottom');
        } else {
            e.currentTarget.classList.add('drag-over-bottom');
            e.currentTarget.classList.remove('drag-over-top');
        }

        e.currentTarget.classList.add('drag-hover');
    },
    handleDragLeave(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
        }
    },
    handleDrop(e, targetTag) {
        e.preventDefault();
        e.stopPropagation();

        const draggedTag = e.dataTransfer.getData('text/plain');

        if (draggedTag === targetTag) {
            return;
        }

        const currentOrder = this.sidebarStoryTags;
        const draggedIndex = currentOrder.indexOf(draggedTag);
        const targetIndex = currentOrder.indexOf(targetTag);

        if (draggedIndex === -1 || targetIndex === -1) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        let insertIndex = targetIndex;
        if (e.clientY < midY) {
            insertIndex = targetIndex;
        } else {
            insertIndex = targetIndex + 1;
        }

        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1);
        if (insertIndex > draggedIndex) {
            insertIndex--;
        }
        newOrder.splice(insertIndex, 0, draggedTag);

        this.saveTagOrder(newOrder);

        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-hover');
    },

    /* ====== 知识图谱视图 — 委托给 GraphEngine ====== */

    isGraphActive() {
        return GraphEngine.getGraphCtx() != null;
    },
    hasGraphNodes() {
        const state = GraphEngine.getState();
        return state.nodes && state.nodes.length > 0;
    },

    initGraph() {
        const canvas = this.$refs.graphCanvas;
        const container = this.$refs.graphContainer;
        if (!canvas || !container) return;

        GraphEngine.initGraph(canvas, container);
        this._buildAndRunGraph();
    },

    rebuildGraph() {
        const canvas = this.$refs.graphCanvas;
        const container = this.$refs.graphContainer;
        if (!canvas || !container) return;

        if (!GraphEngine.getGraphCtx()) {
            GraphEngine.initGraph(canvas, container);
        }
        this._buildAndRunGraph();
    },

    _buildAndRunGraph() {
        const ctx = {
            sessions: this.sessions,
            tree: this.tree,
            sortedTree: this.sortedTree,
            selectedTags: this.selectedTags,
            selectedSkillTags: this.selectedSkillTags,
            selectedTemplateTags: this.selectedTemplateTags,
            selectedRuleTags: this.selectedRuleTags,
            selectedAgentTags: this.selectedAgentTags
        };

        const isRebuild = GraphEngine.getState().nodes.length > 0;
        GraphEngine.buildAndLayout(ctx, isRebuild);

        GraphEngine.startForceSimulation(() => {
            GraphEngine.renderCurrentGraph();
            const mm = this.$refs.graphMiniMap;
            if (mm) GraphEngine.renderCurrentMiniMap(mm);
        });
    },

    applyGraphFilterHighlight() {
        const ctx = {
            sessions: this.sessions,
            tree: this.tree,
            sortedTree: this.sortedTree,
            selectedTags: this.selectedTags,
            selectedSkillTags: this.selectedSkillTags,
            selectedTemplateTags: this.selectedTemplateTags,
            selectedRuleTags: this.selectedRuleTags,
            selectedAgentTags: this.selectedAgentTags,
            tagFilterNoTags: this.tagFilterNoTags,
            W: (GraphEngine.getState())._graphW,
            H: (GraphEngine.getState())._graphH
        };
        GraphEngine.applyFilterHighlight(ctx);
    },

    getGraphZoomPercent() {
        return GraphEngine.getZoomPercent();
    },

    onGraphWheel(e) {
        GraphEngine.handleWheel(e.deltaY);
    },

    onGraphMouseMove(e) {
        const canvas = this.$refs.graphCanvas;
        if (!canvas) return;

        GraphEngine.handleMouseMove(e, canvas, (node, x, y) => {
            if (!node) {
                this.graphTooltip = null;
                return;
            }

            const E = GraphEngine.ENTITY;
            const TL = GraphEngine.TYPE_LABELS;
            const typeLabel = (TL[node.entityType] || {}).zh || '';

            const metaParts = [typeLabel];
            let descText = '';

            if (node.entityType === E.FILE) {
                if (node.size) metaParts.push(node.size > 1024 ? Math.round(node.size / 1024) + 'KB' : node.size + 'B');
                if (node.lastModified) {
                    metaParts.push(new Date(node.lastModified).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }));
                }
                if (node.extension) metaParts.push('.' + node.extension);
                descText = node.pageDescription || '';
            }
            if (node.entityType === E.PROJECT && node.extra) {
                const ex = node.extra;
                const infoParts = [];
                if (ex.storyCount) infoParts.push(ex.storyCount + ' 故事');
                if (ex.scenarioCount) infoParts.push(ex.scenarioCount + ' 场景');
                if (ex.skillCount) infoParts.push(ex.skillCount + ' 技能');
                if (ex.count) infoParts.push(ex.count + ' 文件');
                descText = infoParts.join(' · ');
            }
            if (node.entityType === E.STORY && node.extra) {
                if (node.extra.project) metaParts.push('属于 ' + node.extra.project);
                if (node._childrenKeys && node._childrenKeys.length) {
                    metaParts.push(node._childrenKeys.length + ' 个场景');
                }
            }
            if (node.entityType === E.SCENARIO && node.extra) {
                if (node.extra.story) metaParts.push('属于 ' + node.extra.story);
                if (node.extra.pageDescription) descText = node.extra.pageDescription;
            }
            if ((node.entityType === E.SKILL || node.entityType === E.TEMPLATE ||
                node.entityType === E.RULE || node.entityType === E.AGENT) && node.extra) {
                if (node.extra.project) metaParts.push('项目 ' + node.extra.project);
            }

            let codePreview = null;
            if (node.entityType === E.FILE && node.treeKey) {
                if (node._codePreview !== undefined) {
                    codePreview = node._codePreview;
                } else {
                    node._codePreview = null;
                    this._fetchCodePreview(node);
                }
            }

            // 钻取提示
            let actionHint = '';
            const layer = GraphEngine.getCurrentLayer();
            if (node.entityType === E.STORY && layer === 1) {
                actionHint = '点击查看场景';
            } else if (node.entityType === E.SCENARIO && layer === 2) {
                actionHint = '点击查看文件';
            }

            this.graphTooltip = {
                name: node.name,
                desc: descText || node.pageDescription || '',
                meta: metaParts.join(' · '),
                code: codePreview || (node._codePreview || null),
                action: actionHint
            };
            this.graphTooltipStyle = { left: (x + 14) + 'px', top: (y - 10) + 'px' };
        });
    },

    onGraphMouseDown(e) {
        GraphEngine.handleMouseDown(e, this.$refs.graphCanvas);
    },

    onGraphMouseUp() {
        GraphEngine.handleMouseUp(this.$refs.graphCanvas);
    },

    onGraphClick(e) {
        const currentLayer = GraphEngine.getCurrentLayer();
        const E = GraphEngine.ENTITY;

        const node = GraphEngine.handleClick(e, this.$refs.graphCanvas, (node) => {
            if (!node) return;

            // 图层导航：点击驱动钻取
            if (node.entityType === E.STORY && currentLayer === 1) {
                // L1 点击故事 → 进入 L2 故事+场景
                GraphEngine.navigateToLayer(2, node);
                return;
            }
            if (node.entityType === E.SCENARIO && currentLayer === 2) {
                // L2 点击场景 → 进入 L3 场景+文件
                GraphEngine.navigateToLayer(3, node);
                return;
            }

            // 业务交互
            if (node.entityType === E.FILE && node.treeKey) {
                this.handleTagClick(node.treeKey);
                return;
            }

            if (node.entityType === E.PROJECT) {
                this.$emit('tag-select', [node.name]);
            } else if (node.entityType === E.STORY && currentLayer !== 1) {
                const proj = node.extra && node.extra.project;
                const tags = proj ? [proj, node.name] : [node.name];
                this.$emit('tag-select', tags);
            } else if (node.entityType === E.SKILL) {
                this.$emit('skill-tag-toggle', node.name);
            } else if (node.entityType === E.TEMPLATE) {
                this.$emit('template-tag-toggle', node.name);
            } else if (node.entityType === E.RULE) {
                this.$emit('rule-tag-toggle', node.name);
            } else if (node.entityType === E.AGENT) {
                this.$emit('agent-tag-toggle', node.name);
            }
        });
    },

    onGraphMouseLeave() {
        this.graphTooltip = null;
        GraphEngine.handleMouseLeave();
    },

    onGraphDblClick() {
        const ctx = {
            sessions: this.sessions,
            tree: this.tree,
            sortedTree: this.sortedTree,
            selectedTags: this.selectedTags,
            selectedSkillTags: this.selectedSkillTags,
            selectedTemplateTags: this.selectedTemplateTags,
            selectedRuleTags: this.selectedRuleTags,
            selectedAgentTags: this.selectedAgentTags
        };
        GraphEngine.handleDblClick(ctx);
    },

    watchGraphResize() {
        const ctx = {
            sessions: this.sessions,
            tree: this.tree,
            sortedTree: this.sortedTree,
            selectedTags: this.selectedTags,
            selectedSkillTags: this.selectedSkillTags,
            selectedTemplateTags: this.selectedTemplateTags,
            selectedRuleTags: this.selectedRuleTags,
            selectedAgentTags: this.selectedAgentTags
        };
        GraphEngine.handleResize(this.$refs.graphCanvas, this.$refs.graphContainer, ctx);
    },

    onGraphZoomIn() {
        GraphEngine.zoomIn();
    },

    onGraphZoomOut() {
        GraphEngine.zoomOut();
    },

    onGraphZoomReset() {
        GraphEngine.zoomReset();
    },

    onGraphFocusFiltered() {
        GraphEngine.focusFiltered();
    },

    onMiniMapClick(e) {
        GraphEngine.handleMiniMapClick(e, this.$refs.graphMiniMap);
    },

    _fetchCodePreview(node) {
        if (!node || !node.treeKey) return;
        const sessions = this.sessions;
        if (!sessions) return;
        for (const s of sessions) {
            if (s.key === node.treeKey && s.pageDescription) {
                const lines = s.pageDescription.split('\n').slice(0, 15);
                node._codePreview = lines.join('\n');
                return;
            }
        }
        node._codePreview = '';
    },

    /* ====== 文档增强 ====== */

    graphNodeNeedsEnrich(node) {
        if (!node) return false;
        if (node.entityType === 'file' || node.entityType === 'scenario') {
            const desc = (node.extra && node.extra.pageDescription) || '';
            if (!desc || desc.trim().length < 10) return true;
            if (desc.startsWith('文件：') && desc.length < 50) return true;
        }
        return false;
    },

    async enrichGraphNode(node) {
        if (!node) return false;

        const E = GraphEngine.ENTITY;
        const entityType = node.entityType;
        let filePath = '';

        if (entityType === E.SCENARIO) {
            const storyName = node.extra && node.extra.story;
            const projName = node.extra && node.extra.project;
            const scName = node.name || '';
            filePath = `${projName}/docs/故事任务面板/${storyName}/${scName}.md`;
        } else if (entityType === E.FILE && node.treeKey) {
            filePath = node.treeKey;
        } else if (entityType === E.STORY) {
            const projName = node.extra && node.extra.project;
            filePath = `${projName}/docs/故事任务面板/${node.name}/故事任务.md`;
        } else {
            return false;
        }

        try {
            const prompt = buildEnrichPrompt(node);
            let aiSummary = '';

            if (typeof window.streamPrompt === 'function') {
                const aiUrl = `${window.API_URL}/`;
                const aiPayload = {
                    module_name: 'services.chat.chat_service',
                    method_name: 'chat',
                    parameters: {
                        messages: [{ role: 'user', content: prompt }],
                        model: 'gpt-4o-mini',
                        max_tokens: 300
                    }
                };
                const result = await window.streamPrompt(aiUrl, aiPayload, {}, (chunk) => {
                    aiSummary += chunk;
                });
                aiSummary = (result && result.data) || aiSummary;
            }

            if (!aiSummary || aiSummary.trim().length < 5) {
                const typeLabels = { project: '项目', story: '故事', scenario: '场景',
                    skill: '技能', template: '模板', rule: '规则', agent: '智能体', file: '文件' };
                const tl = typeLabels[entityType] || entityType;
                aiSummary = `${tl}：${node.name || ''}`;
            }

            await enrichDocumentPageDescription({
                cname: 'sessions',
                filePath,
                pageDescription: aiSummary.trim()
            });

            if (node.extra) {
                node.extra.pageDescription = aiSummary.trim();
            }

            if (this.sessions && Array.isArray(this.sessions)) {
                for (const s of this.sessions) {
                    const fp = s.file_path || s.filePath || '';
                    if (fp === filePath || s.key === filePath) {
                        s.pageDescription = aiSummary.trim();
                        break;
                    }
                }
            }

            GraphEngine.renderCurrentGraph();
            const mm = this.$refs.graphMiniMap;
            if (mm) GraphEngine.renderCurrentMiniMap(mm);
            return true;
        } catch (err) {
            console.error('[GraphEnrich] 补充节点描述失败:', err);
            return false;
        }
    },

    getNodesNeedingEnrich() {
        const state = GraphEngine.getState();
        if (!state.nodes) return [];
        return state.nodes.filter(n =>
            n._visible !== false && this.graphNodeNeedsEnrich(n)
        );
    },

    /* ====== 卡片编辑 ====== */

    onCardClick(file) {
        if (this.editingCardKey) return;
        this.handleTagClick(file.key);
    },

    startCardEdit(file) {
        this.editingCardKey = file.key;
        this.editingCardDesc = file.pageDescription || '';
    },

    cancelCardEdit() {
        this.editingCardKey = null;
        this.editingCardDesc = '';
    },

    async saveCardEdit(file) {
        if (!file || !file.key) return;
        this.cardSaving = true;
        try {
            await enrichDocumentPageDescription({
                cname: 'sessions',
                filePath: file.key,
                pageDescription: this.editingCardDesc,
            });
            file.pageDescription = this.editingCardDesc;
            if (this.sessions && Array.isArray(this.sessions)) {
                for (const s of this.sessions) {
                    if (s.key === file.key || s.file_path === file.key) {
                        s.pageDescription = this.editingCardDesc;
                        break;
                    }
                }
            }
            this.editingCardKey = null;
            this.editingCardDesc = '';
        } catch (err) {
            console.error('[FileTree] 保存描述失败:', err);
        } finally {
            this.cardSaving = false;
        }
    },
};

export { fileTreeMethods };
