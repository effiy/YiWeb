import { safeExecute, createError, ErrorTypes } from '/cdn/utils/core/error.js';
import { normalizeFilePath } from '../../utils/fileFieldNormalizer.js';
import { formatFileSizeCompact, sortFileTreeItems } from './fileTreeUtils.js';
import { enrichDocumentPageDescription, needsEnrichment, buildEnrichPrompt } from '/src/core/services/modules/documentEnrichService.js';
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

    /* ====== 知识图谱视图 (Cytoscape) ====== */

    async initFileTreeGraph() {
        if (typeof cytoscape === 'undefined') {
            console.warn('[FileTree] Cytoscape.js 未加载');
            return;
        }
        const container = this.$refs.ftGraphContainer;
        if (!container) {
            console.warn('[FileTree] 图谱容器未找到');
            return;
        }

        // 清理旧实例
        if (this._ftCy) { this._ftCy.destroy(); this._ftCy = null; }
        if (this._ftResizeObserver) { this._ftResizeObserver.disconnect(); this._ftResizeObserver = null; }
        this._ftDrillNodeId = null;

        // 优先通过 read-file API 获取最新 story-deps.json 数据
        let nodes, edges, fromApi = false;
        try {
            const apiBase = (window.API_URL && /^https?:\/\//i.test(window.API_URL))
                ? String(window.API_URL).replace(/\/+$/, '')
                : '';
            if (apiBase) {
                const res = await fetch(`${apiBase}/read-file`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target_file: 'docs/故事任务面板/story-deps.json' })
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json && (json.code === 200 || json.code === 0) && json.data) {
                        const raw = json.data.content;
                        if (raw) {
                            const data = JSON.parse(raw);
                            const graphResult = this._buildGraphFromStoryDeps(data);
                            nodes = graphResult.nodes;
                            edges = graphResult.edges;
                            fromApi = true;
                        }
                    }
                }
            }
        } catch (e) {
            // API 不可用时静默回退
        }

        // 回退：使用本地文件树数据
        if (!fromApi) {
            const result = this._buildFileTreeGraphData();
            nodes = result.nodes;
            edges = result.edges;
        }

        if (!nodes.length) {
            console.warn('[FileTree] 图谱无数据');
            return;
        }

        // 计算度分布用于自适应 sizing
        const degree = {};
        for (const e of edges) { degree[e.source] = (degree[e.source] || 0) + 1; degree[e.target] = (degree[e.target] || 0) + 1; }
        const maxDeg = Math.max(1, ...Object.values(degree));

        const elements = [];
        for (const n of nodes) {
            const d = degree[n.id] || 0;
            const size = 16 + (d / maxDeg) * 20;
            elements.push({
                group: 'nodes',
                data: {
                    id: n.id, label: n.label,
                    color: n.color, kind: n.kind,
                    key: n.key || n.file || '',
                    file: n.file || '',
                    ext: n.ext || '', depth: n.depth || 0,
                    childCount: n.childCount || 0,
                    type: n.type || '', group: n.group || '',
                    description: n.description || '',
                    keyFunctions: n.keyFunctions || [],
                    mdFiles: n.mdFiles || [],
                    degree: d, size: size,
                },
            });
        }
        for (const e of edges) {
            elements.push({
                group: 'edges',
                data: {
                    id: `${e.source}_${e.target}`,
                    source: e.source, target: e.target,
                    label: e.label || '', relation: e.relation || '',
                },
            });
        }

        const cy = cytoscape({
            container, elements,
            style: [
                { selector: 'node', style: {
                    'background-color': 'data(color)', 'label': 'data(label)',
                    'color': '#E2E8F0', 'font-size': '10px', 'font-weight': '500',
                    'text-valign': 'bottom', 'text-halign': 'center',
                    'text-margin-y': 6, 'text-max-width': '120px',
                    'text-wrap': 'ellipsis',
                    'width': 'data(size)', 'height': 'data(size)',
                    'border-width': 2, 'border-color': 'data(color)', 'border-opacity': 0.35,
                    'shape': 'ellipse',
                    'transition-property': 'border-color, border-width, opacity',
                    'transition-duration': 150,
                }},
                { selector: 'node:selected', style: {
                    'border-width': 3, 'border-color': '#FFFFFF', 'border-opacity': 0.95,
                    'shadow-blur': 12, 'shadow-color': 'data(color)', 'shadow-opacity': 0.4,
                }},
                { selector: 'node.highlighted', style: {
                    'border-width': 3, 'border-color': '#FFFFFF', 'border-opacity': 0.9,
                }},
                { selector: 'node.dimmed', style: { 'opacity': 0.12 }},
                { selector: 'edge', style: {
                    'width': 1.2, 'line-color': '#334155', 'target-arrow-color': '#475569',
                    'target-arrow-shape': 'triangle', 'arrow-scale': 0.7,
                    'curve-style': 'bezier', 'label': 'data(label)',
                    'color': '#64748B', 'font-size': '8px',
                    'text-rotation': 'autorotate', 'opacity': 0.45,
                }},
                { selector: 'edge.highlighted', style: {
                    'width': 2.5, 'line-color': '#E2E8F0', 'target-arrow-color': '#E2E8F0',
                    'opacity': 0.85,
                }},
                { selector: 'edge.dimmed', style: { 'opacity': 0.04 }},
            ],
            layout: { name: 'preset' },
            minZoom: 0.06, maxZoom: 3.5, wheelSensitivity: 0.25,
        });

        this._ftCy = cy;

        // ── 交互：Hover ──
        cy.on('mouseover', 'node', (evt) => {
            const node = evt.target;
            cy.nodes().not(node).addClass('dimmed');
            cy.edges().addClass('dimmed');
            node.connectedEdges().removeClass('dimmed').addClass('highlighted');
            node.connectedEdges().connectedNodes().removeClass('dimmed');
            node.addClass('highlighted');
            container.style.cursor = 'pointer';
        });
        cy.on('mouseout', 'node', () => {
            cy.elements().removeClass('highlighted dimmed');
            container.style.cursor = '';
        });

        // ── 交互：单击 → 选中并展示详情 ──
        cy.on('tap', 'node', (evt) => {
            this._selectFtNodeDetail(evt.target, cy);
        });

        // ── 交互：单击空白 → 取消选中（若处于下钻则退出） ──
        cy.on('tap', (evt) => {
            if (evt.target === cy) {
                if (this._ftDrillNodeId) {
                    this._ftDrillNodeId = null;
                    cy.elements().removeClass('highlighted dimmed');
                    cy.fit(undefined, 40);
                }
                this.ftSelectedNode = null;
            }
        });

        // ── 交互：双击节点 → 下钻聚焦邻域 ──
        cy.on('dbltap', 'node', (evt) => {
            const node = evt.target;
            const nd = node.data();
            this._ftDrillNodeId = nd.id;

            // 脉冲动画
            node.style({
                'border-width': 6, 'border-color': '#FFFFFF', 'border-opacity': 1,
                'transition-duration': 100,
            });
            setTimeout(() => {
                if (!node.removed()) {
                    node.style({
                        'border-width': 3, 'border-color': '#FBBF24', 'border-opacity': 0.9,
                    });
                }
            }, 300);

            // 下钻视图
            cy.elements().removeClass('highlighted dimmed');
            const neighbors = node.closedNeighborhood();
            cy.nodes().not(neighbors.nodes()).addClass('dimmed');
            cy.edges().not(neighbors.edges()).addClass('dimmed');
            node.addClass('highlighted');
            neighbors.nodes().removeClass('dimmed');
            neighbors.edges().removeClass('dimmed').addClass('highlighted');
            cy.fit(neighbors.nodes(), 50);
            this._selectFtNodeDetail(node, cy);
        });

        // ── 交互：双击空白 → 退出下钻 ──
        cy.on('dbltap', (evt) => {
            if (evt.target !== cy) return;
            this._ftDrillNodeId = null;
            cy.elements().removeClass('highlighted dimmed');
            cy.fit(undefined, 40);
            this.ftSelectedNode = null;
        });

        // ── 布局（多策略 fallback） ──
        const layouts = [
            { name: 'dagre', rankDir: 'TB', spacingFactor: 1.35, nodeDimensionsIncludeLabels: true, animate: true, animationDuration: 400, fit: true, padding: 40 },
            { name: 'breadthfirst', directed: true, spacingFactor: 1.25, animate: true, fit: true, padding: 40 },
            { name: 'cose', animate: true, animationDuration: 500, fit: true, padding: 40, nodeRepulsion: 5000, idealEdgeLength: 90 },
            { name: 'grid', animate: false, fit: true, padding: 40 },
        ];
        for (const opts of layouts) {
            try { cy.layout(opts).run(); break; } catch (_) {}
        }

        // ── 标题 / 统计 ──
        if (fromApi && this._ftStoryTitle) {
            this.ftGraphTitle = this._ftStoryTitle;
        } else {
            const topLevelName = (Array.isArray(this.tree) && this.tree.length === 1 && this.tree[0].type === 'folder')
                ? this.tree[0].name
                : '';
            this.ftGraphTitle = topLevelName ? `📁 ${topLevelName}` : '文件图谱';
        }
        this.ftGraphStatsText = `${nodes.length} 节点 · ${edges.length} 边`;

        // ── 构建总览数据 ──
        this.ftGraphOverview = fromApi
            ? this._buildFtGraphOverviewFromDeps(nodes, edges)
            : this._buildFtGraphOverview(nodes, edges);

        // ── 自适应视图：ResizeObserver ──
        this._ftResizeObserver = new ResizeObserver(() => {
            if (this._ftCy) {
                this._ftCy.resize();
                this._ftCy.fit(undefined, 30);
            }
        });
        this._ftResizeObserver.observe(container);

        // ── 键盘：Esc 取消选中 / 退出下钻 ──
        this._onFtGraphKeydown = (e) => {
            if (!e || e.key !== 'Escape') return;
            if (!this._ftCy) return;
            if (this._ftDrillNodeId) {
                e.preventDefault();
                this._ftDrillNodeId = null;
                this._ftCy.elements().removeClass('highlighted dimmed');
                this._ftCy.fit(undefined, 40);
                this.ftSelectedNode = null;
            } else if (this.ftSelectedNode) {
                e.preventDefault();
                this.ftSelectedNode = null;
            }
        };
        document.addEventListener('keydown', this._onFtGraphKeydown, true);
    },

    /* ── 从 story-deps.json API 数据构建图谱 ── */
    _buildGraphFromStoryDeps(data) {
        const TYPE_COLORS = {
            source: '#3B82F6',
            test: '#10B981',
            scenario: '#F59E0B',
            story: '#8B5CF6',
        };
        const GROUP_COLORS = {
            'L1-View': '#3B82F6', 'L2-Config': '#6366F1', 'L2-Service': '#8B5CF6',
            'L3-Foundation': '#06B6D4', 'Other': '#64748B',
        };

        this._ftStoryTitle = (data.story && data.story.name) || '依赖关系图';

        const activeProjectTags = new Set();
        if (Array.isArray(this.selectedTags)) {
            this.selectedTags.forEach(t => activeProjectTags.add(t));
        }
        const hasTagFilter = activeProjectTags.size > 0;

        const nodes = [];
        const edges = [];
        const nodeMap = new Map();
        let idCounter = 0;

        for (const n of (data.graph?.nodes || [])) {
            // 按项目标签过滤：节点 file 路径的第一段匹配项目名
            if (hasTagFilter) {
                const file = n.file || '';
                const topDir = file.split('/')[0];
                if (!activeProjectTags.has(topDir)) continue;
            }
            const id = `dn${++idCounter}`;
            nodeMap.set(n.id, id);
            const color = GROUP_COLORS[n.group] || TYPE_COLORS[n.type] || '#64748B';
            nodes.push({
                id, label: n.label || n.id,
                kind: n.type || 'source',
                color, type: n.type || '', group: n.group || '',
                file: n.file || '', description: n.description || '',
                keyFunctions: n.keyFunctions || [],
                mdFiles: n.mdFiles || [],
                relatedNodes: n.relatedNodes || [],
            });
        }

        for (const e of (data.graph?.edges || [])) {
            const srcId = nodeMap.get(e.source);
            const tgtId = nodeMap.get(e.target);
            if (srcId && tgtId) {
                edges.push({
                    id: `de_${srcId}_${tgtId}`,
                    source: srcId, target: tgtId,
                    label: e.label || '', relation: e.relation || '',
                });
            }
        }

        return { nodes, edges };
    },

    /* ── 从 story-deps 构建总览 ── */
    _buildFtGraphOverviewFromDeps(nodes, edges) {
        const typeCounts = {};
        const groupCounts = {};
        const relationCounts = {};
        let scenarioCount = 0;
        let storyCount = 0;

        for (const n of nodes) {
            const t = n.type || 'other';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
            if (t === 'scenario') scenarioCount++;
            if (t === 'story') storyCount++;
            const g = n.group || 'other';
            groupCounts[g] = (groupCounts[g] || 0) + 1;
        }
        for (const e of edges) {
            const r = e.relation || 'other';
            relationCounts[r] = (relationCounts[r] || 0) + 1;
        }

        const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
        const topGroups = Object.entries(groupCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const topRelations = Object.entries(relationCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

        return {
            title: this._ftStoryTitle || '依赖关系图',
            totalNodes: nodes.length,
            totalEdges: edges.length,
            scenarioCount, storyCount,
            topTypes, topGroups, topRelations,
        };
    },

    /* ── 构建图谱数据 ── */
    _buildFileTreeGraphData() {
        const activeProjectTags = new Set();
        if (Array.isArray(this.selectedTags)) {
            this.selectedTags.forEach(t => activeProjectTags.add(t));
        }
        const hasTagFilter = activeProjectTags.size > 0;

        // 节点配色：按文件类型分层
        const EXT_COLORS = {
            md: '#3B82F6', json: '#10B981', js: '#F59E0B', ts: '#6366F1',
            css: '#06B6D4', html: '#EF4444', vue: '#8B5CF6',
            py: '#3B82F6', go: '#06B6D4', java: '#F97316',
            yaml: '#EC4899', yml: '#EC4899', toml: '#A855F7',
            xml: '#F59E0B', sh: '#10B981', svg: '#F97316',
            png: '#06B6D4', jpg: '#06B6D4', jpeg: '#06B6D4', gif: '#06B6D4', webp: '#06B6D4',
        };
        const FOLDER_COLOR = '#F59E0B';
        const DEFAULT_COLOR = '#64748B';

        const nodes = [];
        const edges = [];
        const nodeMap = new Map();
        let idCounter = 0;

        const walk = (items, parentId, depth = 0) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                const name = item.name || item.fileName || item.key || '';
                // 顶层目录受标签筛选影响
                if (depth === 0 && hasTagFilter) {
                    if (!activeProjectTags.has(name)) continue;
                }
                const id = `n${++idCounter}`;
                const isFolder = item.type === 'folder' || (item.children && item.children.length > 0);
                const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
                const color = isFolder ? FOLDER_COLOR : (EXT_COLORS[ext] || DEFAULT_COLOR);

                const node = {
                    id, label: name.length > 30 ? name.substring(0, 28) + '…' : name,
                    kind: isFolder ? 'folder' : 'file',
                    key: normalizeFilePath(item.key || item.path || name),
                    file: item.key || item.path || name,
                    color, ext, depth,
                    childCount: isFolder && Array.isArray(item.children) ? item.children.length : 0,
                };
                nodeMap.set(item.key || item.path || id, id);
                nodes.push(node);

                if (parentId) {
                    const relLabel = isFolder ? '' : '∈';
                    edges.push({ source: parentId, target: id, label: relLabel, relation: 'contains' });
                }

                if (isFolder && item.children) {
                    walk(item.children, id, depth + 1);
                }
            }
        };

        walk(this.tree || [], null);

        return { nodes, edges };
    },

    /* ── 构建图谱总览 ── */
    _buildFtGraphOverview(nodes, edges) {
        const extCounts = {};
        let folderCount = 0;
        let fileCount = 0;
        const topFolders = [];

        for (const n of nodes) {
            if (n.kind === 'folder') {
                folderCount++;
                if (n.depth === 0) {
                    topFolders.push({ name: n.label, childCount: n.childCount || 0 });
                }
            } else {
                fileCount++;
                const ext = n.ext || '(无扩展名)';
                extCounts[ext] = (extCounts[ext] || 0) + 1;
            }
        }

        const topExtensions = Object.entries(extCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        const title = (Array.isArray(this.tree) && this.tree.length === 1 && this.tree[0].type === 'folder')
            ? this.tree[0].name
            : '';

        return {
            title,
            totalNodes: nodes.length,
            totalEdges: edges.length,
            folderCount,
            fileCount,
            topExtensions,
            topFolders,
        };
    },

    /* ── 选中节点详情 ── */
    _selectFtNodeDetail(node, cy) {
        const nd = node.data();

        // 下钻模式中保持 dim 状态
        if (this._ftDrillNodeId) {
            const drillNode = cy.getElementById(this._ftDrillNodeId);
            if (drillNode.length && drillNode.id() !== nd.id) {
                cy.elements().removeClass('highlighted');
                const neighbors = node.closedNeighborhood();
                neighbors.nodes().removeClass('dimmed');
                neighbors.edges().removeClass('dimmed').addClass('highlighted');
                node.addClass('highlighted');
            }
        } else {
            cy.elements().removeClass('highlighted dimmed');
            node.addClass('highlighted');
            node.connectedEdges().addClass('highlighted');
            node.connectedEdges().connectedNodes().removeClass('dimmed');
        }

        // 收集关联边（带 edgeId 支持面板点击高亮）
        const connectedEdges = node.connectedEdges();
        const connected = connectedEdges.map(e => {
            const src = e.source().data();
            const tgt = e.target().data();
            const isOut = src.id === nd.id;
            return {
                edgeId: e.id(),
                label: e.data('label'),
                relation: e.data('relation'),
                sourceId: src.id,
                targetId: isOut ? tgt.id : src.id,
                targetLabel: isOut ? tgt.label : src.label,
                direction: isOut ? '→' : '←',
            };
        });

        // 收集邻居节点
        const neighborIds = new Set(connected.map(c => c.targetId));
        const neighbors = cy.nodes()
            .filter(n => neighborIds.has(n.data('id')))
            .map(n => ({
                id: n.data('id'), label: n.data('label'), color: n.data('color'), kind: n.data('kind'),
            }));

        // 子节点数（仅目录）
        const childEdges = connectedEdges.filter(e => e.source().id() === nd.id);

        // 检测数据类型：story-deps 数据有 type/group 字段
        const isDepsData = !!(nd.type || nd.group);

        // 架构角色描述
        let roleSummary;
        if (isDepsData) {
            const typeLabel = nd.type === 'source' ? '📄 源文件' :
                nd.type === 'test' ? '🧪 测试' :
                nd.type === 'scenario' ? '📋 场景' :
                nd.type === 'story' ? '📖 故事' : nd.type;
            const parts = [typeLabel];
            if (nd.group) parts.push(nd.group);
            if (nd.description) parts.push(nd.description);
            roleSummary = parts.join(' · ');
        } else {
            const kindLabel = nd.kind === 'folder' ? '📁 目录' : '📄 文件';
            const depthLabel = nd.depth != null ? `深度 L${nd.depth}` : '';
            const sizeLabel = nd.degree != null ? `${nd.degree} 个关联` : '';
            const roleParts = [kindLabel, depthLabel, sizeLabel].filter(Boolean);
            roleSummary = roleParts.length ? roleParts.join(' · ') : '';
        }

        // 依赖关系文本
        const outgoing = connected.filter(c => c.direction === '→').length;
        const incoming = connected.length - outgoing;
        const depParts = [];
        if (outgoing > 0) depParts.push(`出边 ${outgoing} 条`);
        if (incoming > 0) depParts.push(`入边 ${incoming} 条`);
        const depText = depParts.length ? depParts.join('，') : '孤立节点';

        this.ftSelectedNode = {
            _label: nd.label,
            _color: nd.color,
            _kind: nd.kind,
            _key: nd.key || nd.file || '',
            _file: nd.file || '',
            _ext: nd.ext || '',
            _depth: nd.depth,
            _connections: connected.length,
            _childCount: nd.kind === 'folder' ? childEdges.length : null,
            _isDrilled: !!this._ftDrillNodeId,
            _roleSummary: roleSummary,
            _depText: depText,
            _outgoing: outgoing,
            _incoming: incoming,
            _edges: connected.slice(0, 20),
            _neighbors: neighbors.slice(0, 20),
            // story-deps 扩展字段
            _type: nd.type || '',
            _group: nd.group || '',
            _description: nd.description || '',
            _keyFunctions: nd.keyFunctions || [],
            _mdFiles: nd.mdFiles || [],
            _isDepsData: isDepsData,
        };
    },

    /* ── 外部调用：定位节点 ── */
    ftFocusGraphNode(nodeId) {
        if (!this._ftCy || !nodeId) return;
        const cy = this._ftCy;
        const target = cy.getElementById(nodeId);
        if (!target.length) return;

        // 清除旧状态
        cy.elements().removeClass('highlighted dimmed');
        target.addClass('highlighted');
        target.connectedEdges().addClass('highlighted');

        // 动画聚焦
        cy.animate({ center: { eles: target }, zoom: 1.4 }, { duration: 400 });
        this._selectFtNodeDetail(target, cy);
    },

    /* ── 详情面板：点击关联边 → 脉冲高亮 ── */
    ftHighlightEdge(edgeId) {
        if (!this._ftCy || !edgeId) return;
        const cy = this._ftCy;
        const edge = cy.getElementById(edgeId);
        if (!edge.length) return;

        cy.elements().removeClass('highlighted');
        edge.addClass('highlighted');
        edge.style({
            'line-color': '#FBBF24', 'target-arrow-color': '#FBBF24',
            'width': 3, 'opacity': 1, 'transition-duration': 150,
        });
        edge.connectedNodes().addClass('highlighted');
        cy.animate({ center: { eles: edge }, zoom: cy.zoom() }, { duration: 300 });

        setTimeout(() => {
            if (!edge.removed()) {
                edge.style({
                    'line-color': '#334155', 'target-arrow-color': '#475569',
                    'width': 1.2, 'opacity': 0.45,
                });
            }
        }, 1500);
    },

    /* ── 适应视图 ── */
    ftFitGraph() {
        if (this._ftCy) {
            this._ftDrillNodeId = null;
            this.ftSelectedNode = null;
            this._ftCy.elements().removeClass('highlighted dimmed');
            this._ftCy.fit(undefined, 30);
        }
    },

    /* ── 重置布局 ── */
    ftResetGraph() {
        if (!this._ftCy) return;
        this._ftDrillNodeId = null;
        this.ftSelectedNode = null;
        this._ftCy.elements().removeClass('highlighted dimmed');
        const layouts = [
            { name: 'dagre', rankDir: 'TB', spacingFactor: 1.35, nodeDimensionsIncludeLabels: true, animate: true, fit: true, padding: 40 },
            { name: 'breadthfirst', directed: true, spacingFactor: 1.25, animate: true, fit: true, padding: 40 },
            { name: 'cose', animate: true, fit: true, padding: 40, nodeRepulsion: 5000, idealEdgeLength: 90 },
        ];
        for (const opts of layouts) {
            try { this._ftCy.layout(opts).run(); return; } catch (_) {}
        }
    },

    /* ── 销毁 ── */
    _destroyFtCy() {
        if (this._ftResizeObserver) {
            this._ftResizeObserver.disconnect();
            this._ftResizeObserver = null;
        }
        if (this._onFtGraphKeydown) {
            document.removeEventListener('keydown', this._onFtGraphKeydown, true);
            this._onFtGraphKeydown = null;
        }
        if (this._ftCy) { this._ftCy.destroy(); this._ftCy = null; }
        this._ftDrillNodeId = null;
    },
};

export { fileTreeMethods };
