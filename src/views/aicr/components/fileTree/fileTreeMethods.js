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


    /* ── Cytoscape 节点样式表 (对齐 demos/cytoscape-graph) ── */
    _getFtCyStylesheet() {
        return [
            { selector:'node', style:{
                'shape':'round-rectangle','width':170,'height':46,
                'background-color':'#1e293b','border-color':'data(color)',
                'border-width':1.5,'border-opacity':1,
                'color':'#E2E8F0','label':'data(label)','font-size':'10.5px',
                'font-weight':'600','text-valign':'bottom','text-margin-y':4,
                'text-wrap':'ellipsis','text-max-width':'160px',
                'overlay-opacity':0,
                'transition-property':'border-color, border-width',
                'transition-duration':'0.2s',
            }},
            { selector:'node.hover',       style:{ 'border-color':'#60A5FA','border-width':3 }},
            { selector:'node.highlighted', style:{ 'border-color':'#E2E8F0','border-width':3 }},
            { selector:'node.dimmed',      style:{ 'opacity':0.12 }},
            { selector:'edge', style:{
                'width':1.2,'line-color':'#334155',
                'target-arrow-shape':'triangle','target-arrow-color':'#475569',
                'arrow-scale':0.8,'opacity':0.45,
                'curve-style':'bezier','overlay-opacity':0,
                'transition-property':'line-color, width, opacity, target-arrow-color',
                'transition-duration':'0.2s',
            }},
            { selector:'edge[label]', style:{
                'label':'data(label)','font-size':'8px',
                'color':'#64748B','text-rotation':'autorotate',
            }},
            { selector:'edge.hover',       style:{ 'line-color':'#60A5FA','width':2,'opacity':0.65,'target-arrow-color':'#60A5FA' }},
            { selector:'edge.highlighted', style:{ 'line-color':'#E2E8F0','width':2.5,'opacity':0.85,'target-arrow-color':'#E2E8F0' }},
            { selector:'edge.dimmed',      style:{ 'opacity':0.04 }},
        ];
    },

    /* ── 清除所有高亮状态 ── */
    _clearAllGraphHighlights(cy) {
        if (!cy || cy.destroyed()) return;
        cy.elements().removeClass('highlighted dimmed hover');
    },

    /* ====== 知识图谱视图 (Cytoscape.js) ====== */
    async initFileTreeGraph() {
        if (this._isDestroyed) return;
        if (typeof cytoscape === 'undefined') { console.warn('[FileTree] Cytoscape.js 未加载'); return; }
        if (typeof cytoscapeDagre !== 'undefined' && typeof cytoscapeDagre === 'function') {
            try { cytoscapeDagre(cytoscape); } catch (_) {}
        }
        const container = this.$refs.ftGraphContainer;
        if (!container) { console.warn('[FileTree] 图谱容器未找到'); return; }

        this._destroyFtGraph();

        let nodes, edges, fromApi = false;
        try {
            const apiBase = (window.API_URL && /^https?:\/\//i.test(window.API_URL)) ? String(window.API_URL).replace(/\/+$/, '') : '';
            if (apiBase) {
                const res = await fetch(`${apiBase}/read-file`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_file: 'docs/故事任务面板/故事依赖.json' }) });
                if (this._isDestroyed) return;
                if (res.ok) {
                    const json = await res.json();
                    if (this._isDestroyed) return;
                    if (json && (json.code === 200 || json.code === 0) && json.data) {
                        const raw = json.data.content;
                        if (raw) { const data = JSON.parse(raw); const r = this._buildGraphFromStoryDeps(data); nodes = r.nodes; edges = r.edges; fromApi = true; }
                    }
                }
            }
        } catch (e) {}
        if (this._isDestroyed) return;
        if (!fromApi) { const r = this._buildFileTreeGraphData(); nodes = r.nodes; edges = r.edges; }
        if (!nodes.length) { console.warn('[FileTree] 图谱无数据'); return; }

        const degree = {};
        for (const e of edges) { degree[e.source] = (degree[e.source] || 0) + 1; degree[e.target] = (degree[e.target] || 0) + 1; }
        const maxDeg = Math.max(1, ...Object.values(degree));

        const cyNodes = nodes.map(n => ({
            data: {
                id: n.id, label: n.label, color: n.color || '#64748B',
                kind: n.kind, key: n.key || n.file || '', file: n.file || '',
                ext: n.ext || '', depth: n.depth || 0,
                childCount: n.childCount || 0, type: n.type || '',
                groupName: n.group || '', description: n.description || '',
                keyFunctions: n.keyFunctions || [], mdFiles: n.mdFiles || [],
                degree: degree[n.id] || 0,
            },
        }));
        const cyEdges = edges.map(e => ({
            data: {
                id: `${e.source}_${e.target}`,
                source: e.source, target: e.target,
                label: e.label || '', relation: e.relation || '',
            },
        }));

        const nodeCount = nodes.length;
        // 节点 170×46，间距需大幅提升。dagre 参数: nodeSep(同级水平间隙) rankSep(层级垂直间隙) edgeSep(边间隙)
        const dagreOpts = nodeCount > 100 ? { rankSep: 180, nodeSep: 120, edgeSep: 40, ranker: 'tight-tree' }
            : nodeCount > 50 ? { rankSep: 150, nodeSep: 100, edgeSep: 30, ranker: 'network-simplex' }
            : { rankSep: 130, nodeSep: 80, edgeSep: 25, ranker: 'network-simplex' };

        const cy = cytoscape({
            container,
            elements: { nodes: cyNodes, edges: cyEdges },
            style: this._getFtCyStylesheet(),
            layout: {
                name: 'dagre',
                rankDir: 'TB',
                rankSep: dagreOpts.rankSep,
                nodeSep: dagreOpts.nodeSep,
                edgeSep: dagreOpts.edgeSep,
                ranker: dagreOpts.ranker,
                nodeDimensionsIncludeLabels: true,
                fit: true,
                padding: 50,
                animate: true,
                animationDuration: 400,
                animationEasing: 'ease-out',
            },
            minZoom: 0.06, maxZoom: 3.5,
            wheelSensitivity: 0.3,
            autoungrabify: false,
            autounselectify: false,
        });
        this._ftGraph = cy;
        this._wireGraphEvents(cy);

        if (fromApi && this._ftStoryTitle) { this.ftGraphTitle = this._ftStoryTitle; }
        else { const tl = (Array.isArray(this.tree) && this.tree.length === 1 && this.tree[0].type === 'folder') ? this.tree[0].name : ''; this.ftGraphTitle = tl ? `📁 ${tl}` : '文件图谱'; }
        this.ftGraphStatsText = `${nodes.length} 节点 · ${edges.length} 边`;
        this.ftGraphOverview = fromApi ? this._buildFtGraphOverviewFromDeps(nodes, edges) : this._buildFtGraphOverview(nodes, edges);

        // ResizeObserver
        this._ftResizeObserver = new ResizeObserver(() => {
            if (this._ftGraph && !this._ftGraph.destroyed()) {
                this._ftGraph.resize();
                this._ftGraph.fit(undefined, 30);
            }
        });
        this._ftResizeObserver.observe(container);

        // Escape 键监听
        this._onFtGraphKeydown = (e) => {
            if (!e || e.key !== 'Escape') return;
            if (!this._ftGraph || this._ftGraph.destroyed()) return;
            if (this.ftFilterType) { e.preventDefault(); this.ftFilterByStoryType(); return; }
            if (this._ftDrillNodeId) { e.preventDefault(); this.ftResetGraph(); }
            else if (this.ftSelectedNode) { e.preventDefault(); this.ftSelectedNode = null; }
        };
        document.addEventListener('keydown', this._onFtGraphKeydown, true);
    },

    /* ── Cytoscape 事件绑定 ── */
    _wireGraphEvents(cy) {
        let ftTapTimer = null;
        cy.on('tap', 'node', (evt) => {
            if (ftTapTimer) { clearTimeout(ftTapTimer); ftTapTimer = null; }
            const node = evt.target;
            ftTapTimer = setTimeout(() => {
                ftTapTimer = null;
                if (!cy.destroyed() && !node.removed()) this._selectFtNodeDetail(node, cy);
            }, 280);
        });
        cy.on('tap', (evt) => {
            if (evt.target !== cy) return;
            if (this._ftDrillNodeId) { this.ftResetGraph(); }
            this.ftSelectedNode = null;
        });
        cy.on('dbltap', 'node', (evt) => {
            if (ftTapTimer) { clearTimeout(ftTapTimer); ftTapTimer = null; }
            const node = evt.target;
            const model = node.data();
            this._ftDrillNodeId = model.id;
            const nb = new Set(); nb.add(model.id);
            cy.edges().forEach(e => { const d = e.data(); if (d.source === model.id) nb.add(d.target); if (d.target === model.id) nb.add(d.source); });
            this._clearAllGraphHighlights(cy);
            cy.nodes().forEach(n => { if (nb.has(n.data('id'))) n.addClass('highlighted'); else n.addClass('dimmed'); });
            cy.edges().forEach(e => { const d = e.data(); if (nb.has(d.source) && nb.has(d.target)) e.addClass('highlighted'); else e.addClass('dimmed'); });
            cy.animate({ center: { x: node.position('x'), y: node.position('y') }, zoom: Math.min(cy.zoom(), 1.2), duration: 420, easing: 'ease-out-cubic' }, {});
            this._selectFtNodeDetail(node, cy);
            this._updateFtBreadcrumb();
        });
        cy.on('dbltap', (evt) => {
            if (evt.target !== cy) return;
            this.ftResetGraph();
        });
        cy.on('mouseover', 'node', (evt) => {
            const id = evt.target.data('id');
            evt.target.addClass('hover');
            cy.edges().forEach(e => { const d = e.data(); if (d.source === id || d.target === id) e.addClass('hover'); });
        });
        cy.on('mouseout', 'node', (evt) => {
            evt.target.removeClass('hover');
            cy.edges().removeClass('hover');
        });
    },

    /* ── 从 故事依赖.json API 数据构建图谱 ── */
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

        this._ftStoryTitle = (data.story && data.story.name) || (data.project && data.project.name) || '依赖关系图';

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
            // 兼容 Cytoscape 格式：属性嵌套在 data 下
            const nd = (n.data && typeof n.data === 'object') ? n.data : n;
            // 按项目标签过滤：节点 file 路径的第一段匹配项目名
            if (hasTagFilter) {
                const file = nd.file || '';
                const topDir = file.split('/')[0];
                if (!activeProjectTags.has(topDir)) continue;
            }
            const id = `dn${++idCounter}`;
            nodeMap.set(nd.id, id);
            const color = GROUP_COLORS[nd.group] || TYPE_COLORS[nd.type] || '#64748B';
            nodes.push({
                id, label: nd.label || nd.id,
                kind: nd.type || 'source',
                color, type: nd.type || '', group: nd.group || '',
                file: nd.file || '', description: nd.description || '',
                keyFunctions: nd.keyFunctions || [],
                mdFiles: nd.mdFiles || [],
                relatedNodes: nd.relatedNodes || [],
            });
        }

        for (const e of (data.graph?.edges || [])) {
            // 兼容 Cytoscape 格式
            const ed = (e.data && typeof e.data === 'object') ? e.data : e;
            const srcId = nodeMap.get(ed.source);
            const tgtId = nodeMap.get(ed.target);
            if (srcId && tgtId) {
                edges.push({
                    id: `de_${srcId}_${tgtId}`,
                    source: srcId, target: tgtId,
                    label: ed.label || '', relation: ed.relation || ed.type || '',
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

        // 计算度分布
        const degree = {};
        for (const e of edges) {
            degree[e.source] = (degree[e.source] || 0) + 1;
            degree[e.target] = (degree[e.target] || 0) + 1;
        }

        // 构建节点详情列表
        const nodeList = [];
        for (const n of nodes) {
            const t = n.type || 'other';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
            if (t === 'scenario') scenarioCount++;
            if (t === 'story') storyCount++;
            const g = n.group || 'other';
            groupCounts[g] = (groupCounts[g] || 0) + 1;
            const d = degree[n.id] || 0;
            nodeList.push({
                id: n.id,
                label: n.label || n.id,
                type: n.type || '',
                group: n.group || '',
                file: n.file || '',
                description: (n.description || '').substring(0, 80),
                degree: d,
                color: n.color || '#64748B',
            });
        }
        // 按关联度降序排列
        nodeList.sort((a, b) => b.degree - a.degree);

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
            nodeList,
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

        // 计算度分布
        const degree = {};
        for (const e of edges) {
            degree[e.source] = (degree[e.source] || 0) + 1;
            degree[e.target] = (degree[e.target] || 0) + 1;
        }

        // 构建节点详情列表
        const nodeList = [];
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
            const d = degree[n.id] || 0;
            nodeList.push({
                id: n.id,
                label: n.label || n.id,
                kind: n.kind || 'file',
                ext: n.ext || '',
                depth: n.depth || 0,
                file: n.file || n.key || '',
                childCount: n.childCount || 0,
                degree: d,
                color: n.color || '#64748B',
            });
        }
        // 文件夹在前，然后按关联度降序
        nodeList.sort((a, b) => {
            if (a.kind === 'folder' && b.kind !== 'folder') return -1;
            if (a.kind !== 'folder' && b.kind === 'folder') return 1;
            return b.degree - a.degree;
        });

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
            nodeList,
        };
    },

    /* ── 选中节点详情 ── */
    _selectFtNodeDetail(node, cy) {
        const model = node.data();
        if (this._ftDrillNodeId) {
            const drillNode = cy.getElementById(this._ftDrillNodeId);
            if (drillNode && !drillNode.removed() && drillNode.data('id') !== model.id) {
                const nb = new Set(); nb.add(model.id);
                cy.edges().forEach(e => { const d = e.data(); if (d.source === model.id) nb.add(d.target); if (d.target === model.id) nb.add(d.source); });
                cy.elements().removeClass('highlighted dimmed');
                cy.nodes().forEach(n => { if (nb.has(n.data('id'))) n.addClass('highlighted'); else n.addClass('dimmed'); });
                cy.edges().forEach(e => { const d = e.data(); if (nb.has(d.source) && nb.has(d.target)) e.addClass('highlighted'); else e.addClass('dimmed'); });
            }
        } else {
            this._clearAllGraphHighlights(cy);
            node.addClass('highlighted');
            cy.edges().forEach(e => { const d = e.data(); if (d.source === model.id || d.target === model.id) e.addClass('highlighted'); });
        }

        const connected = [];
        const nbIds = new Set();
        cy.edges().forEach(e => {
            const d = e.data();
            if (d.source === model.id || d.target === model.id) {
                const isOut = d.source === model.id, tgtId = isOut ? d.target : d.source;
                nbIds.add(tgtId);
                connected.push({ edgeId: d.id, label: d.label || '', relation: d.relation || '', sourceId: d.source, targetId: tgtId, targetLabel: '', direction: isOut ? '→' : '←' });
            }
        });
        for (const c of connected) {
            const tgtNode = cy.getElementById(c.targetId);
            c.targetLabel = (tgtNode && !tgtNode.removed()) ? (tgtNode.data('label') || '') : '';
        }
        const neighbors = [];
        for (const nId of nbIds) {
            const n = cy.getElementById(nId);
            if (n && !n.removed()) { const nd = n.data(); neighbors.push({ id: nd.id, label: nd.label, color: nd.color, kind: nd.kind }); }
        }

        const isDepsData = !!(model.type || model.groupName);
        let roleSummary = '';
        if (!isDepsData) {
            if (model.kind === 'folder') roleSummary = `目录 · ${model.childCount || 0} 个子项`;
            else if (model.ext) roleSummary = `.${model.ext} 文件`;
            if (model.depth != null) roleSummary += (roleSummary ? ' · ' : '') + `深度 L${model.depth}`;
        } else {
            roleSummary = model.description || '';
        }
        const outgoing = connected.filter(c => c.direction === '→').length;
        const incoming = connected.filter(c => c.direction === '←').length;
        const depText = (outgoing || incoming) ? null : '孤立节点 · 无直接关联';

        this.ftSelectedNode = {
            _label: model.label, _color: model.color, _kind: model.kind, _key: model.key || model.file || '', _file: model.file || '', _ext: model.ext || '', _depth: model.depth, _connections: connected.length, _childCount: model.kind === 'folder' ? connected.filter(c => c.direction === '→').length : (model.childCount || null), _isDrilled: !!this._ftDrillNodeId, _roleSummary: roleSummary, _depText: depText, _outgoing: outgoing, _incoming: incoming, _edges: connected.slice(0, 20), _neighbors: neighbors.slice(0, 20), _type: model.type || '', _group: model.groupName || '', _description: model.description || '', _keyFunctions: model.keyFunctions || [], _mdFiles: model.mdFiles || [], _isDepsData: isDepsData,
        };
    },

    /* ── 点击节点列表定位 ── */
    ftFocusGraphNode(nodeId) {
        if (!this._ftGraph || this._ftGraph.destroyed() || !nodeId) return;
        const cy = this._ftGraph;
        const target = cy.getElementById(nodeId);
        if (!target || target.removed()) return;
        this._clearAllGraphHighlights(cy);
        target.addClass('highlighted');
        cy.edges().forEach(e => { const d = e.data(); if (d.source === nodeId || d.target === nodeId) e.addClass('highlighted'); });
        cy.animate({ center: { x: target.position('x'), y: target.position('y') }, zoom: 1.4, duration: 400, easing: 'ease-out' }, {});
        this._selectFtNodeDetail(target, cy);
    },

    /* ── 高亮边 ── */
    ftHighlightEdge(edgeId) {
        if (!this._ftGraph || this._ftGraph.destroyed() || !edgeId) return;
        const cy = this._ftGraph;
        const edge = cy.getElementById(edgeId);
        if (!edge || edge.removed()) return;
        this._clearAllGraphHighlights(cy);
        edge.addClass('highlighted');
        edge.style({ 'line-color': '#FBBF24', 'width': 3, 'opacity': 1, 'target-arrow-color': '#FBBF24' });
        const d = edge.data();
        [d.source, d.target].forEach(nid => { const n = cy.getElementById(nid); if (n && !n.removed()) n.addClass('highlighted'); });
        const mid = { x: (edge.sourceEndpoint().x + edge.targetEndpoint().x) / 2, y: (edge.sourceEndpoint().y + edge.targetEndpoint().y) / 2 };
        cy.animate({ center: mid, duration: 300, easing: 'ease-out' }, {});
        setTimeout(() => { if (!cy.destroyed() && !edge.removed()) edge.style({ 'line-color': '#334155', 'width': 1.2, 'opacity': 0.45, 'target-arrow-color': '#475569' }); }, 1500);
    },

    /* ── Story 类型筛选 ── */
    ftFilterByStoryType() {
        if (!this._ftGraph || this._ftGraph.destroyed()) return;
        const cy = this._ftGraph;
        if (this.ftFilterType === 'story') {
            this.ftFilterType = null; this.ftSelectedNode = null;
            this._clearAllGraphHighlights(cy);
            this._resetToInitLayout(cy);
            this.ftGraphOverview = this.ftGraphOverviewOriginal ? { ...this.ftGraphOverviewOriginal } : this.ftGraphOverview;
            this._updateFtBreadcrumb(); return;
        }
        const storyNodes = cy.nodes().filter(n => { const d = n.data(); return d.type === 'story' || d.kind === 'story'; });
        if (!storyNodes.length) return;
        this.ftFilterType = 'story'; this.ftSelectedNode = null;
        if (!this.ftGraphOverviewOriginal) this.ftGraphOverviewOriginal = { ...this.ftGraphOverview };
        this._clearAllGraphHighlights(cy);
        const storyIds = new Set(storyNodes.map(n => n.data('id')));
        cy.nodes().forEach(n => { if (storyIds.has(n.data('id'))) n.addClass('highlighted'); else n.addClass('dimmed'); });
        cy.edges().forEach(e => { const d = e.data(); if (storyIds.has(d.source) && storyIds.has(d.target)) e.addClass('highlighted'); else e.addClass('dimmed'); });
        cy.fit(undefined, 40); this._updateFtBreadcrumb();
    },

    /* ── 使用与初始化完全相同的 dagre 布局，无动画立即归位 ── */
    _resetToInitLayout(cy) {
        if (!cy || cy.destroyed()) return;
        const nodeCount = cy.nodes().length;
        const dagreOpts = nodeCount > 100 ? { rankSep: 180, nodeSep: 120, edgeSep: 40, ranker: 'tight-tree' }
            : nodeCount > 50 ? { rankSep: 150, nodeSep: 100, edgeSep: 30, ranker: 'network-simplex' }
            : { rankSep: 130, nodeSep: 80, edgeSep: 25, ranker: 'network-simplex' };
        try {
            cy.layout({
                name: 'dagre',
                rankDir: 'TB',
                rankSep: dagreOpts.rankSep,
                nodeSep: dagreOpts.nodeSep,
                edgeSep: dagreOpts.edgeSep,
                ranker: dagreOpts.ranker,
                nodeDimensionsIncludeLabels: true,
                animate: false,
                fit: true,
                padding: 50,
            }).run();
        } catch (_) {
            cy.fit(undefined, 50);
        }
    },

    /* ── 重置视图（清除筛选/下钻/选中，回到全景）── */
    ftResetGraph() {
        if (!this._ftGraph || this._ftGraph.destroyed()) return;
        this._ftDrillNodeId = null; this.ftFilterType = null; this.ftGraphOverviewOriginal = null; this.ftSelectedNode = null;
        this._clearAllGraphHighlights(this._ftGraph);
        this._resetToInitLayout(this._ftGraph);
        this._updateFtBreadcrumb();
    },

    /* ── 面包屑 ── */
    _updateFtBreadcrumb() {
        if (this._ftDrillNodeId && this._ftGraph && !this._ftGraph.destroyed()) {
            const node = this._ftGraph.getElementById(this._ftDrillNodeId);
            this.ftBreadcrumb = { drillNodeId: this._ftDrillNodeId, drillLabel: (node && !node.removed()) ? (node.data('label') || '') : '' };
        } else { this.ftBreadcrumb = { drillNodeId: null, drillLabel: '' }; }
    },

    /* ── 面包屑导航 ── */
    navigateFtBreadcrumb(item) {
        if (!item || item.action !== 'overview') return;
        if (!this._ftGraph || this._ftGraph.destroyed()) return;
        this._ftDrillNodeId = null; this.ftFilterType = null; this.ftSelectedNode = null;
        this._clearAllGraphHighlights(this._ftGraph);
        this._resetToInitLayout(this._ftGraph);
        if (this.ftGraphOverviewOriginal) { this.ftGraphOverview = { ...this.ftGraphOverviewOriginal }; this.ftGraphOverviewOriginal = null; }
        this._updateFtBreadcrumb();
    },

    /* ── 销毁 ── */
    _destroyFtGraph() {
        if (this._ftResizeObserver) { this._ftResizeObserver.disconnect(); this._ftResizeObserver = null; }
        if (this._onFtGraphKeydown) { document.removeEventListener('keydown', this._onFtGraphKeydown, true); this._onFtGraphKeydown = null; }
        if (this._ftGraph) { this._ftGraph.destroy(); this._ftGraph = null; }
        this._ftDrillNodeId = null; this.ftFilterType = null; this.ftGraphOverviewOriginal = null;
    },

    /* ── 筛选/下钻后重新聚焦 ── */
    _ftRefocusAfterFilter() {
        if (!this._ftGraph || this._ftGraph.destroyed()) return;
        const cy = this._ftGraph;
        if (this._ftDrillNodeId) {
            const drill = cy.getElementById(this._ftDrillNodeId);
            if (drill && !drill.removed()) {
                const nb = new Set(); nb.add(this._ftDrillNodeId);
                cy.edges().forEach(e => { const d = e.data(); if (d.source === this._ftDrillNodeId) nb.add(d.target); if (d.target === this._ftDrillNodeId) nb.add(d.source); });
                this._clearAllGraphHighlights(cy);
                cy.nodes().forEach(n => { if (nb.has(n.data('id'))) n.addClass('highlighted'); else n.addClass('dimmed'); });
                cy.edges().forEach(e => { const d = e.data(); if (nb.has(d.source) && nb.has(d.target)) e.addClass('highlighted'); else e.addClass('dimmed'); });
                cy.animate({ center: { x: drill.position('x'), y: drill.position('y') }, duration: 400, easing: 'ease-out' }, {});
            }
        } else if (this.ftFilterType) {
            this.ftFilterByStoryType();
        }
        this._updateFtBreadcrumb();
    },
};

export { fileTreeMethods };
