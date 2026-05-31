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

    initFileTreeGraph() {
        if (typeof cytoscape === 'undefined') {
            console.warn('[FileTree] Cytoscape.js 未加载');
            return;
        }
        const container = this.$refs.ftGraphContainer;
        if (!container) {
            console.warn('[FileTree] 图谱容器未找到');
            return;
        }

        if (this._ftCy) { this._ftCy.destroy(); this._ftCy = null; }

        const { nodes, edges } = this._buildFileTreeGraphData();
        if (!nodes.length) {
            console.warn('[FileTree] 图谱无数据: tree=', this.tree?.length, 'nodes=0');
            return;
        }

        const colors = {
            folder: '#F59E0B', file: '#64748B', md: '#3B82F6', json: '#10B981',
            js: '#F59E0B', css: '#06B6D4', html: '#EF4444', other: '#8B5CF6',
        };
        function nodeColor(n) {
            if (n.kind === 'folder') return colors.folder;
            if (n.kind === 'file') {
                const ext = (n.label || '').split('.').pop();
                return colors[ext] || colors.other;
            }
            return colors.other;
        }

        const elements = [];
        for (const n of nodes) {
            const deg = (n._deg || 0);
            elements.push({
                group: 'nodes',
                data: {
                    id: n.id, label: n.label,
                    color: nodeColor(n), kind: n.kind,
                    key: n.key || '', file: n.file || '', weight: 18 + Math.min(deg * 4, 18),
                },
            });
        }
        for (const e of edges) {
            elements.push({
                group: 'edges',
                data: { id: `${e.source}_${e.target}`, source: e.source, target: e.target },
            });
        }

        const cy = cytoscape({
            container, elements,
            style: [
                { selector: 'node', style: {
                    'background-color': 'data(color)', 'label': 'data(label)',
                    'color': '#E2E8F0', 'font-size': '9px', 'text-valign': 'bottom',
                    'text-halign': 'center', 'text-margin-y': 5, 'text-max-width': '100px',
                    'width': 'data(weight)', 'height': 'data(weight)',
                    'border-width': 1.5, 'border-color': 'data(color)', 'border-opacity': 0.3,
                    'shape': 'ellipse',
                }},
                { selector: 'node:selected', style: { 'border-width': 2, 'border-color': '#FFF', 'border-opacity': 0.8 }},
                { selector: 'node.dimmed', style: { 'opacity': 0.12 }},
                { selector: 'node.highlighted', style: { 'border-width': 2.5, 'border-color': '#FFF', 'border-opacity': 0.8 }},
                { selector: 'edge', style: { 'width': 0.8, 'line-color': '#334155', 'opacity': 0.4, 'curve-style': 'bezier' }},
                { selector: 'edge.highlighted', style: { 'width': 2, 'line-color': '#94A3B8', 'opacity': 0.7 }},
                { selector: 'edge.dimmed', style: { 'opacity': 0.03 }},
            ],
            layout: { name: 'preset' },
            minZoom: 0.05, maxZoom: 3, wheelSensitivity: 0.3,
        });

        this._ftCy = cy;

        // Hover
        cy.on('mouseover', 'node', (evt) => {
            const n = evt.target;
            cy.nodes().not(n).addClass('dimmed');
            cy.edges().addClass('dimmed');
            n.connectedEdges().removeClass('dimmed').addClass('highlighted');
            n.connectedEdges().connectedNodes().removeClass('dimmed');
            n.addClass('highlighted');
        });
        cy.on('mouseout', 'node', () => cy.elements().removeClass('highlighted dimmed'));

        // Click → 展示节点详情 + 选中文件
        cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            const nd = node.data();
            // 构建详情
            const connected = node.connectedEdges();
            const neighborIds = new Set();
            const neighbors = [];
            connected.forEach(e => {
                const src = e.source().data();
                const tgt = e.target().data();
                const other = src.id === nd.id ? tgt : src;
                if (!neighborIds.has(other.id)) {
                    neighborIds.add(other.id);
                    neighbors.push({ id: other.id, label: other.label, color: other.color });
                }
            });
            this.ftSelectedNode = {
                _label: nd.label,
                _color: nd.color,
                _kind: nd.kind,
                _ext: (nd.label || '').split('.').pop(),
                _connections: connected.length,
                _description: nd.description || (nd.kind === 'folder' ? `目录: ${nd.label}` : `文件: ${nd.key || nd.label}`),
                _neighbors: neighbors.slice(0, 15),
            };
            // 如果是文件，触发打开
            if (nd.kind === 'file' && nd.key) {
                this.handleTagClick(nd.key);
            }
        });

        // Tap background → 关闭详情
        cy.on('tap', (evt) => {
            if (evt.target === cy) {
                this.ftSelectedNode = null;
            }
        });

        // Layout
        const layouts = [
            { name: 'cose', animate: false, fit: true, padding: 20, nodeRepulsion: 4000, idealEdgeLength: 60 },
            { name: 'breadthfirst', directed: false, spacingFactor: 1.2, animate: false, fit: true, padding: 20 },
            { name: 'grid', animate: false, fit: true, padding: 20 },
        ];
        for (const opts of layouts) {
            try { cy.layout(opts).run(); break; } catch (_) {}
        }
    },

    ftFocusGraphNode(nodeId) {
        if (!this._ftCy || !nodeId) return;
        const target = this._ftCy.getElementById(nodeId);
        if (!target.length) return;
        this._ftCy.animate({ center: { eles: target }, zoom: 1.3 }, { duration: 300 });
        target.emit('tap');
    },

    _buildFileTreeGraphData() {
        // 收集激活的标签筛选
        const activeTags = new Set();
        const addTags = (arr) => { if (Array.isArray(arr)) arr.forEach(t => activeTags.add(t)); };
        addTags(this.selectedTags);
        addTags(this.selectedSkillTags);
        addTags(this.selectedTemplateTags);
        addTags(this.selectedRuleTags);
        addTags(this.selectedAgentTags);
        const hasTagFilter = activeTags.size > 0;

        const nodes = [];
        const edges = [];
        const nodeMap = new Map();
        let idCounter = 0;

        const walk = (items, parentId, depth = 0) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                const name = item.name || item.fileName || item.key || '';
                // 标签过滤：仅顶层目录受标签筛选影响
                if (depth === 0 && hasTagFilter) {
                    if (!activeTags.has(name)) continue;
                }
                const id = `n${++idCounter}`;
                const isFolder = item.type === 'folder' || (item.children && item.children.length > 0);
                const ext = name.split('.').pop() || '';

                const node = {
                    id, label: name.length > 28 ? name.substring(0, 26) + '…' : name,
                    kind: isFolder ? 'folder' : 'file',
                    key: normalizeFilePath(item.key || item.path || name),
                    file: item.key || item.path || name,
                };
                nodeMap.set(item.key || item.path || id, id);
                nodes.push(node);

                if (parentId) {
                    edges.push({ source: parentId, target: id });
                }

                if (isFolder && item.children) {
                    walk(item.children, id, depth + 1);
                }
            }
        };

        walk(this.tree || [], null);

        // Calculate degree for sizing
        const deg = {};
        for (const e of edges) { deg[e.source] = (deg[e.source] || 0) + 1; deg[e.target] = (deg[e.target] || 0) + 1; }
        for (const n of nodes) { n._deg = deg[n.id] || 0; }

        return { nodes, edges };
    },

    _destroyFtCy() {
        if (this._ftCy) { this._ftCy.destroy(); this._ftCy = null; }
    },
};

export { fileTreeMethods };
