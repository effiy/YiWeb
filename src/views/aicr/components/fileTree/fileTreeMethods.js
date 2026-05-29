import { safeExecute, createError, ErrorTypes } from '/cdn/utils/core/error.js';
import { normalizeFilePath } from '../../utils/fileFieldNormalizer.js';
import { formatFileSizeCompact, sortFileTreeItems } from './fileTreeUtils.js';

// ── 图谱实体常量（模块级，避免 Vue methods 代理问题） ──
const ENTITY = {
    PROJECT:  'project',
    STORY:    'story',
    SCENARIO: 'scenario',
    SKILL:    'skill',
    TEMPLATE: 'template',
    RULE:     'rule',
    AGENT:    'agent',
    FILE:     'file'
};

const ENTITY_COLORS = {
    project:  { fill: '#dbeafe', stroke: '#3b82f6', text: '#1e40af', badge: '#2563eb' },
    story:    { fill: '#d1fae5', stroke: '#10b981', text: '#065f46', badge: '#059669' },
    scenario: { fill: '#f0f9ff', stroke: '#0ea5e9', text: '#0369a1', badge: '#0284c7' },
    skill:    { fill: '#ede9fe', stroke: '#8b5cf6', text: '#5b21b6', badge: '#7c3aed' },
    template: { fill: '#fef3c7', stroke: '#f59e0b', text: '#92400e', badge: '#d97706' },
    rule:     { fill: '#ffe4e6', stroke: '#f43f5e', text: '#9f1239', badge: '#e11d48' },
    agent:    { fill: '#cffafe', stroke: '#06b6d4', text: '#155e75', badge: '#0891b2' },
    file:     { fill: '#ffffff', stroke: '#d1d5db', text: '#374151', badge: '#6b7280' }
};

const ENTITY_ICONS = {
    project: '\u{1F4E6}', story: '\u{1F4CB}', scenario: '\u{1F3AC}',
    skill: '\u{26A1}', template: '\u{1F4C4}', rule: '\u{1F4CF}',
    agent: '\u{1F916}', file: '\u{1F4C4}'
};

const ENTITY_SIZES = {
    project:  { w: 220, h: 52 },
    story:    { w: 180, h: 42 },
    scenario: { w: 170, h: 36 },
    skill:    { w: 155, h: 36 },
    template: { w: 155, h: 36 },
    rule:     { w: 155, h: 36 },
    agent:    { w: 155, h: 36 },
    file:     { w: 152, h: 30 }
};

const EXT_COLORS = {
    md: '#3b82f6', js: '#f59e0b', ts: '#2563eb', vue: '#10b981',
    css: '#ec4899', html: '#f97316', json: '#6366f1', yml: '#84cc16',
    py: '#8b5cf6', svg: '#ef4444', png: '#14b8a6', default: '#6b7280'
};

// ── 图层配置：每层可见的实体类型 ──
const LAYER_TYPES = {
    1: new Set(['project', 'story']),
    2: new Set(['story', 'scenario']),
    3: new Set(['scenario', 'file'])
};
const LAYER_LABELS = { 1: 'L1 概览', 2: 'L2 详情', 3: 'L3 深入' };
const LAYER_HINTS = { 1: '项目 + 故事', 2: '故事 + 场景', 3: '场景 + 文件' };

// 当前图层（模块级，不依赖 Vue 代理）
let _currentLayer = 1;

// ── 图谱运行时状态（模块级，Vue methods 不代理非函数属性） ──
let _graphState = {
    nodes: [],
    edges: [],
    nodeMap: null,
    hoveredKey: null,
    hoveredEdgeKeys: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    dragging: null,
    dragStartX: 0,
    dragStartY: 0,
    simRunning: false,
    simAlpha: 0,
    simTimer: null
};

// 图谱渲染上下文（每次 initGraph 时重新绑定）
let _graphCtx = null;
let _graphW = 0;
let _graphH = 0;

// 场景元数据缓存：scenarioKey -> { name, description, storyName, sourceFiles }
let _scenarioCache = new Map();

const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
};

const highlightText = (text, query) => {
    if (!query || !text) return escapeHtml(text);
    const escapedQuery = escapeHtml(query);
    const escapedText = escapeHtml(text);
    const regex = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
};

// ── 场景 Markdown 解析 ──
const _parseScenarioMarkdown = (mdContent, storyName, fileName) => {
    const result = { name: fileName || '', description: '', storyName: storyName || '', sourceFiles: [] };
    if (!mdContent) return result;

    // 解析标题：# 场景N · Title
    const titleMatch = mdContent.match(/^#\s*场景(\d+)\s*[·•]\s*(.+?)(?:\s*[|—].*)?$/m);
    if (titleMatch) {
        result.name = '场景' + titleMatch[1] + '·' + (titleMatch[2] || '').trim();
    }

    // 解析 §1 使用场景表 — 提取操作流行
    const s1Start = mdContent.indexOf('## §1');
    const s2Start = mdContent.indexOf('## §2');
    if (s1Start !== -1) {
        const s1Block = mdContent.substring(s1Start, s2Start !== -1 ? s2Start : mdContent.length);
        // 匹配表格中 **操作流** 行
        const opFlowMatch = s1Block.match(/\*\*操作流\*\*\s*\|\s*(.+?)(?:\n|$)/);
        if (opFlowMatch) {
            result.description = opFlowMatch[1].trim();
        } else {
            // 回退：取表格第一行非标题内容
            const rowMatch = s1Block.match(/^\|(.+)\|$/m);
            if (rowMatch) {
                const cells = rowMatch[1].split('|').map(c => c.trim());
                const descCell = cells.find(c => c && !/[\*\-]{2,}/.test(c) && c.length > 10);
                if (descCell) result.description = descCell;
            }
        }
    }

    // 解析 §7 关联源码表
    const s7Start = mdContent.indexOf('## §7');
    if (s7Start !== -1) {
        const s7Block = mdContent.substring(s7Start);
        const lines = s7Block.split('\n');
        let inTable = false, headerSkipped = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) { if (inTable) break; else continue; }
            if (trimmed.startsWith('## ') && inTable) break;
            if (trimmed.startsWith('|') && trimmed.includes('类型') && trimmed.includes('文件')) {
                inTable = true; headerSkipped = false; continue;
            }
            if (trimmed.startsWith('|') && (trimmed.includes('---') || trimmed.includes(':-'))) {
                headerSkipped = true; continue;
            }
            if (inTable && headerSkipped && trimmed.startsWith('|')) {
                const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
                if (cells.length >= 2) {
                    const type = cells[0] || '';
                    const filePath = (cells[1] || '').replace(/`/g, '');
                    const keyContent = cells[2] || '';
                    const desc = cells[3] || '';
                    if (filePath && !filePath.startsWith('---')) {
                        result.sourceFiles.push({ type, file: filePath, keyContent, desc });
                    }
                }
            }
        }
    }

    return result;
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
            if (!key || !this.selectedKey) return false;
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

    /* ====== 知识图谱视图（多实体依赖图谱） ====== */

    isGraphActive() {
        return !!_graphCtx;
    },
    hasGraphNodes() {
        return _graphState.nodes && _graphState.nodes.length > 0;
    },

    initGraph() {
        const canvas = this.$refs.graphCanvas;
        if (!canvas) return;
        const container = this.$refs.graphContainer;
        if (!container) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        _graphCtx = ctx;
        _graphW = rect.width;
        _graphH = rect.height;

        // 默认从 L1 开始
        _currentLayer = 1;
        this.graphCurrentLayer = 1;

        this._buildGraphData();
        this._startForceSimulation();
    },

    rebuildGraph() {
        // 保留已有节点位置，新节点随机散布
        const oldNodes = _graphState.nodes || [];
        const oldPositions = new Map();
        for (const n of oldNodes) {
            oldPositions.set(n.key, { x: n.x, y: n.y, vx: n.vx, vy: n.vy });
        }
        this._buildGraphData();
        // 恢复已有节点位置
        for (const n of _graphState.nodes) {
            const prev = oldPositions.get(n.key);
            if (prev) {
                n.x = prev.x;
                n.y = prev.y;
                n.vx = prev.vx;
                n.vy = prev.vy;
            }
        }
        // 用较低 alpha 快速微调，避免大幅跳动
        this._stopSimulation();
        _graphState.simAlpha = 0.15;
        _graphState.simRunning = true;
        this._forceStep();
    },

    // ── 核心：从 sessions + sortedTree 构建多实体知识图谱 ──
    _buildGraphData() {
        const E = ENTITY;
        const SZ = ENTITY_SIZES;
        const nodes = [];
        const edges = [];
        const nodeMap = new Map();

        const W = _graphW, H = _graphH;

        // 辅助：生成唯一 key
        const ekey = (type, name) => type + '::' + name;

        // 辅助：添加节点（去重）
        const addEntityNode = (type, name, extra = {}) => {
            const key = ekey(type, name);
            if (nodeMap.has(key)) return nodeMap.get(key);
            const sz = SZ[type] || SZ.file;
            const n = {
                key, name, entityType: type,
                w: sz.w, h: sz.h,
                x: W / 2 + (Math.random() - 0.5) * 300,
                y: H / 2 + (Math.random() - 0.5) * 300,
                vx: 0, vy: 0,
                extra,
                // 标记是否匹配当前筛选
                filterMatch: true
            };
            nodes.push(n);
            nodeMap.set(key, n);
            return n;
        };

        // 辅助：添加边（去重）
        const seenEdges = new Set();
        const addEdge = (fromKey, toKey, relType) => {
            const pair = fromKey < toKey ? fromKey + '|||' + toKey : toKey + '|||' + fromKey;
            if (seenEdges.has(pair)) return;
            seenEdges.add(pair);
            edges.push({ from: fromKey, to: toKey, type: relType });
        };

        // ── 1. 从 sessions 提取 projects, stories, skills, templates, rules, agents ──
        const sessions = this.sessions || [];
        const projectMap = new Map(); // projectName -> { storyNames: Set, skillNames: Set, templateNames: Set, ruleNames: Set, agentNames: Set, fileKeys: Set }
        const storyProjectMap = new Map(); // storyName -> projectName

        for (const s of sessions) {
            const fp = s.file_path || s.filePath || '';
            if (!fp) continue;
            const tags = Array.isArray(s.tags) ? s.tags : [];
            const proj = tags[0] || fp.split('/')[0] || '';
            if (!proj) continue;

            if (!projectMap.has(proj)) {
                projectMap.set(proj, {
                    storyNames: new Set(),
                    skillNames: new Set(),
                    templateNames: new Set(),
                    ruleNames: new Set(),
                    agentNames: new Set(),
                    fileKeys: new Set(),
                    scenarioNames: new Set(),
                    _scenarioMeta: new Map()
                });
            }
            const pdata = projectMap.get(proj);

            // 提取故事名 (故事任务面板/<name>/...)
            const parts = fp.split('/');
            const panelIdx = parts.indexOf('故事任务面板');
            if (panelIdx !== -1 && panelIdx + 1 < parts.length) {
                const storyName = parts[panelIdx + 1];
                pdata.storyNames.add(storyName);
                storyProjectMap.set(storyName, proj);

                // 提取场景名 (故事任务面板/<story>/场景*.md)
                if (panelIdx + 2 < parts.length) {
                    const scenarioBasename = parts[panelIdx + 2];
                    if (/^场景\d+[-_].*\.md$/.test(scenarioBasename)) {
                        const scName = scenarioBasename.replace(/\.md$/, '');
                        pdata.scenarioNames.add(scName);
                        if (!pdata._scenarioMeta.has(scName)) {
                            pdata._scenarioMeta.set(scName, {
                                storyName,
                                pageDescription: s.pageDescription || '',
                                sessionKey: s.key,
                                fileName: scName
                            });
                        }
                    }
                }
            }

            // 提取 skills
            const skillMatch = fp.match(/\/skills\/([^/]+)/);
            if (skillMatch) pdata.skillNames.add(skillMatch[1]);

            // 提取 templates
            const tmplMatch = fp.match(/\/templates\/([^/]+)/);
            if (tmplMatch) pdata.templateNames.add(tmplMatch[1]);

            // 提取 rules
            const ruleMatch = fp.match(/\/rules\/([^/]+)/);
            if (ruleMatch) pdata.ruleNames.add(ruleMatch[1]);

            // 提取 agents
            const agentMatch = fp.match(/\/agents\/([^/]+)/);
            if (agentMatch) pdata.agentNames.add(agentMatch[1]);

            // 文件 key
            if (s.key != null) pdata.fileKeys.add(String(s.key));
        }

        // ── 2. 确定当前筛选状态 ──
        const selectedProjects = new Set(this.selectedTags || []);
        const selectedSkills = new Set(this.selectedSkillTags || []);
        const selectedTemplates = new Set(this.selectedTemplateTags || []);
        const selectedRules = new Set(this.selectedRuleTags || []);
        const selectedAgents = new Set(this.selectedAgentTags || []);
        const hasProjectFilter = selectedProjects.size > 0;
        const hasStoryFilter = selectedProjects.size > 0; // 故事筛选联动项目
        const hasSkillFilter = selectedSkills.size > 0;
        const hasTemplateFilter = selectedTemplates.size > 0;
        const hasRuleFilter = selectedRules.size > 0;
        const hasAgentFilter = selectedAgents.size > 0;
        const hasAnyFilter = hasProjectFilter || hasSkillFilter || hasTemplateFilter || hasRuleFilter || hasAgentFilter;

        // 从 sortedTree 收集当前筛选下可见的文件 key（用于 filterMatch 判断）
        const visibleFileKeys = new Set();
        const collectFileKeys = (items) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (item.type === 'file') {
                    visibleFileKeys.add(item.key);
                    if (item.sessionKey != null) visibleFileKeys.add(String(item.sessionKey));
                } else if (item.type === 'folder' && item.children) {
                    collectFileKeys(item.children);
                }
            }
        };
        collectFileKeys(this.sortedTree);

        // ── 3. 构建实体节点 ──
        // 为每个项目添加节点
        const allProjects = [];
        for (const [projName, pdata] of projectMap) {
            const pn = addEntityNode(E.PROJECT, projName, {
                count: pdata.fileKeys.size,
                storyCount: pdata.storyNames.size,
                scenarioCount: pdata.scenarioNames.size,
                skillCount: pdata.skillNames.size,
                templateCount: pdata.templateNames.size,
                ruleCount: pdata.ruleNames.size,
                agentCount: pdata.agentNames.size
            });
            allProjects.push({ name: projName, node: pn, data: pdata });

            // 项目 → 故事
            for (const storyName of pdata.storyNames) {
                const sn = addEntityNode(E.STORY, storyName, { project: projName });
                addEdge(pn.key, sn.key, 'contains');
            }

            // 项目 → skills
            for (const skillName of pdata.skillNames) {
                const skn = addEntityNode(E.SKILL, skillName, { project: projName });
                addEdge(pn.key, skn.key, 'uses');
            }

            // 项目 → templates
            for (const tmplName of pdata.templateNames) {
                const tn = addEntityNode(E.TEMPLATE, tmplName, { project: projName });
                addEdge(pn.key, tn.key, 'uses');
            }

            // 项目 → rules
            for (const ruleName of pdata.ruleNames) {
                const rn = addEntityNode(E.RULE, ruleName, { project: projName });
                addEdge(pn.key, rn.key, 'uses');
            }

            // 项目 → agents
            for (const agentName of pdata.agentNames) {
                const an = addEntityNode(E.AGENT, agentName, { project: projName });
                addEdge(pn.key, an.key, 'uses');
            }

            // 项目 → 故事 → 场景
            for (const storyName of pdata.storyNames) {
                const storyKey = ekey(E.STORY, storyName);
                if (!nodeMap.has(storyKey)) continue;

                // 处理已知场景（从 sessions 中收集的）
                const knownScenarios = new Set();
                for (const scName of pdata.scenarioNames) {
                    const meta = pdata._scenarioMeta.get(scName) || {};
                    const scNode = addEntityNode(E.SCENARIO, scName, {
                        project: projName,
                        story: storyName,
                        pageDescription: meta.pageDescription || '',
                        sourceFiles: []
                    });
                    addEdge(storyKey, scNode.key, 'contains');
                    knownScenarios.add(scName);
                    _scenarioCache.set(scNode.key, { name: scName, description: '', storyName, sourceFiles: [] });
                }

                // 自动发现：如果某故事在 docs/故事任务面板/<storyName>/ 下有场景*.md 文件但未被 session 引用
                const discoverScenarios = true;
                if (discoverScenarios && pdata.storyNames.has(storyName)) {
                    // 通过文件树查找该故事目录下的场景文件
                    const storyDirPattern = '故事任务面板/' + storyName + '/';
                    const collectScenarioFiles = (items) => {
                        if (!Array.isArray(items)) return;
                        for (const item of items) {
                            if (item.type === 'file') {
                                const fp = item.filePath || item.key || '';
                                if (fp.includes(storyDirPattern) && /场景\d+[-_].*\.md$/.test(fp)) {
                                    const scName = (item.name || '').replace(/\.md$/, '');
                                    if (scName && !knownScenarios.has(scName)) {
                                        const scNode = addEntityNode(E.SCENARIO, scName, {
                                            project: projName,
                                            story: storyName,
                                            pageDescription: item.pageDescription || ''
                                        });
                                        addEdge(storyKey, scNode.key, 'contains');
                                        knownScenarios.add(scName);
                                        _scenarioCache.set(scNode.key, { name: scName, description: item.pageDescription || '', storyName, sourceFiles: [] });
                                    }
                                }
                            } else if (item.type === 'folder' && item.children) {
                                collectScenarioFiles(item.children);
                            }
                        }
                    };
                    collectScenarioFiles(this.tree);
                }
            }
        }

        // ── 4. 构建文件节点（从完整树，超出上限时优先可见文件） ──
        const MAX_FILE_NODES = 300;
        // 先从完整树收集所有文件
        const allFileItems = [];
        const collectAllFiles = (items) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (item.type === 'file') {
                    allFileItems.push(item);
                } else if (item.type === 'folder' && item.children) {
                    collectAllFiles(item.children);
                }
            }
        };
        collectAllFiles(this.tree);

        // 优先可见文件，然后补充其他文件直到上限
        const fileItemsToRender = [];
        const addedFileKeys = new Set();
        for (const item of allFileItems) {
            if (visibleFileKeys.has(item.key) && !addedFileKeys.has(item.key)) {
                fileItemsToRender.push(item);
                addedFileKeys.add(item.key);
            }
        }
        for (const item of allFileItems) {
            if (fileItemsToRender.length >= MAX_FILE_NODES) break;
            if (!addedFileKeys.has(item.key)) {
                fileItemsToRender.push(item);
                addedFileKeys.add(item.key);
            }
        }

        for (const item of fileItemsToRender) {
            const ext = item.extension || (item.name && item.name.includes('.') ? item.name.split('.').pop().toLowerCase() : '');
            const fileNode = addEntityNode(E.FILE, item.key, {
                treeItem: item,
                name: item.name,
                size: item.size,
                lastModified: item.lastModified,
                pageDescription: item.pageDescription || '',
                extension: ext
            });
            fileNode.name = item.name || '';
            fileNode.size = item.size;
            fileNode.lastModified = item.lastModified;
            fileNode.pageDescription = item.pageDescription || '';
            fileNode.extension = ext;
            fileNode.treeKey = item.key;

            // 关联文件到其项目节点
            const tags = item.tags || [];
            const projFromTag = tags[0];
            if (projFromTag && projectMap.has(projFromTag)) {
                const projKey = ekey(E.PROJECT, projFromTag);
                if (nodeMap.has(projKey)) {
                    addEdge(projKey, fileNode.key, 'contains');
                }
            }
        }

        // 移除未使用的 addFileNodes 和 walkTreeForFiles（已在上面整合）

        // ── 5. 补充跨实体边：skill/template/rule/agent → 其所属项目中的文件 ──
        for (const s of sessions) {
            const fp = s.file_path || s.filePath || '';
            if (!fp || s.key == null) continue;
            const fileKey = ekey(E.FILE, String(s.key));
            const fileNode = nodeMap.get(fileKey);
            if (!fileNode) continue; // 文件不在可见范围内

            const tags = Array.isArray(s.tags) ? s.tags : [];
            const proj = tags[0] || fp.split('/')[0] || '';

            // skill → file
            const skillMatch = fp.match(/\/skills\/([^/]+)/);
            if (skillMatch) {
                const skKey = ekey(E.SKILL, skillMatch[1]);
                if (nodeMap.has(skKey)) addEdge(skKey, fileKey, 'implements');
            }

            // template → file
            const tmplMatch = fp.match(/\/templates\/([^/]+)/);
            if (tmplMatch) {
                const tKey = ekey(E.TEMPLATE, tmplMatch[1]);
                if (nodeMap.has(tKey)) addEdge(tKey, fileKey, 'implements');
            }

            // rule → file
            const ruleMatch = fp.match(/\/rules\/([^/]+)/);
            if (ruleMatch) {
                const rKey = ekey(E.RULE, ruleMatch[1]);
                if (nodeMap.has(rKey)) addEdge(rKey, fileKey, 'implements');
            }

            // agent → file
            const agentMatch = fp.match(/\/agents\/([^/]+)/);
            if (agentMatch) {
                const aKey = ekey(E.AGENT, agentMatch[1]);
                if (nodeMap.has(aKey)) addEdge(aKey, fileKey, 'implements');
            }
        }

        // ── 6. 应用筛选高亮标记 ──
        if (hasAnyFilter) {
            for (const n of nodes) {
                let match = true;
                if (n.entityType === E.PROJECT) {
                    if (hasProjectFilter) match = selectedProjects.has(n.name);
                    if (match && hasSkillFilter) {
                        const pdata = projectMap.get(n.name);
                        match = pdata && selectedSkills.size > 0 &&
                            [...selectedSkills].some(sk => pdata.skillNames.has(sk));
                    }
                    if (match && hasTemplateFilter) {
                        const pdata = projectMap.get(n.name);
                        match = pdata && selectedTemplates.size > 0 &&
                            [...selectedTemplates].some(t => pdata.templateNames.has(t));
                    }
                    if (match && hasRuleFilter) {
                        const pdata = projectMap.get(n.name);
                        match = pdata && selectedRules.size > 0 &&
                            [...selectedRules].some(r => pdata.ruleNames.has(r));
                    }
                    if (match && hasAgentFilter) {
                        const pdata = projectMap.get(n.name);
                        match = pdata && selectedAgents.size > 0 &&
                            [...selectedAgents].some(a => pdata.agentNames.has(a));
                    }
                } else if (n.entityType === E.STORY) {
                    match = !hasProjectFilter || selectedProjects.has(n.extra.project);
                } else if (n.entityType === E.SKILL) {
                    match = selectedSkills.has(n.name);
                } else if (n.entityType === E.TEMPLATE) {
                    match = selectedTemplates.has(n.name);
                } else if (n.entityType === E.RULE) {
                    match = selectedRules.has(n.name);
                } else if (n.entityType === E.AGENT) {
                    match = selectedAgents.has(n.name);
                } else if (n.entityType === E.FILE) {
                    match = visibleFileKeys.has(n.treeKey) ||
                        visibleFileKeys.has(n.key.replace(E.FILE + '::', ''));
                }
                n.filterMatch = match;
            }
        }

        // ── 6.5 解析场景 Markdown 内容并建立场景→文件边 ──
        for (const n of nodes) {
            if (n.entityType !== E.SCENARIO) continue;
            const cached = _scenarioCache.get(n.key);
            const pageDesc = (n.extra && n.extra.pageDescription) || (cached && cached.description) || '';
            const storyName = (n.extra && n.extra.story) || (cached && cached.storyName) || '';
            const scName = n.name || (cached && cached.name) || '';

            // 尝试解析 markdown
            let parsed = null;
            if (pageDesc && pageDesc.length > 10) {
                parsed = _parseScenarioMarkdown(pageDesc, storyName, scName);
            }

            // 更新场景缓存
            if (parsed) {
                _scenarioCache.set(n.key, parsed);
                n.extra.pageDescription = parsed.description || pageDesc;
                // 创建场景→文件的 referencing 边
                for (const sf of parsed.sourceFiles) {
                    if (!sf.file) continue;
                    // 尝试匹配文件节点（部分路径匹配）
                    let matched = false;
                    for (const fn of nodes) {
                        if (fn.entityType !== E.FILE) continue;
                        const fp = fn.treeKey || fn.key || '';
                        if (fp.includes(sf.file) || sf.file.includes(fp.split('/').pop() || '')) {
                            addEdge(n.key, fn.key, 'references');
                            matched = true;
                        }
                    }
                    // 如果没有精确匹配，用文件路径创建轻量链接
                    if (!matched && sf.file) {
                        const fileKey = ekey(E.FILE, sf.file);
                        const existing = nodeMap.get(fileKey);
                        if (existing) {
                            addEdge(n.key, existing.key, 'references');
                        }
                    }
                }
            } else {
                _scenarioCache.set(n.key, {
                    name: scName, description: pageDesc || '', storyName, sourceFiles: []
                });
            }
        }

        // ── 6.6 初始化可视状态 ──
        // 所有节点默认可见，筛选后由 applyGraphFilter 控制隐藏
        for (const n of nodes) {
            n._visible = true;
        }

        // 建立父子关系映射（用于聚类锚定等）
        for (const n of nodes) {
            n._childrenKeys = [];
        }
        for (const e of edges) {
            if (e.type === 'contains' || e.type === 'references') {
                const fromNode = nodeMap.get(e.from);
                if (fromNode && fromNode._childrenKeys.indexOf(e.to) === -1) {
                    fromNode._childrenKeys.push(e.to);
                }
            }
        }

        // ── 7. 初始化布局：扇形聚类 ──
        const projectNodes = nodes.filter(n => n.entityType === E.PROJECT);
        const otherNodes = nodes.filter(n => n.entityType !== E.PROJECT);

        if (projectNodes.length > 0) {
            const centerX = W / 2, centerY = H / 2;
            const projectRadius = Math.min(W, H) * 0.22;

            // 项目节点围成内圈
            projectNodes.forEach((n, i) => {
                const angle = (2 * Math.PI * i) / projectNodes.length - Math.PI / 2;
                n.x = centerX + Math.cos(angle) * projectRadius;
                n.y = centerY + Math.sin(angle) * projectRadius;
                n._sectorAngle = angle;
                n._sectorSpan = (2 * Math.PI) / projectNodes.length;
            });

            // 将非项目节点分配到对应项目的扇形区域
            // 先建立项目→节点的映射
            const projectChildren = new Map();
            for (const pn of projectNodes) {
                projectChildren.set(pn.name, []);
            }
            const orphanNodes = [];

            for (const n of otherNodes) {
                const projName = n.extra && n.extra.project;
                if (projName && projectChildren.has(projName)) {
                    projectChildren.get(projName).push(n);
                } else {
                    // 尝试从边中找到关联的项目
                    let found = false;
                    for (const pn of projectNodes) {
                        const pkey = ekey(E.PROJECT, pn.name);
                        const edgeExists = edges.some(e =>
                            (e.from === pkey && e.to === n.key) ||
                            (e.to === pkey && e.from === n.key)
                        );
                        if (edgeExists) {
                            projectChildren.get(pn.name).push(n);
                            found = true;
                            break;
                        }
                    }
                    if (!found) orphanNodes.push(n);
                }
            }

            // 在每个项目扇形区域内排列其子节点
            for (const pn of projectNodes) {
                const children = projectChildren.get(pn.name) || [];
                const sectorCenter = pn._sectorAngle;
                const sectorHalf = pn._sectorSpan * 0.42;

                // 按实体类型分层：story → scenario → skill/template/rule/agent → file
                const layerOrder = [E.STORY, E.SCENARIO, E.SKILL, E.TEMPLATE, E.RULE, E.AGENT, E.FILE];
                const layers = {};
                for (const lt of layerOrder) layers[lt] = [];
                for (const c of children) {
                    (layers[c.entityType] || layers[E.FILE]).push(c);
                }

                // Stories+Scenarios 在同一视觉环（L2），Skills/Templates/Rules/Agents 在下一环（L3），Files 在最外环
                const layerRadii = [160, 175, 240, 240, 240, 240, 320];
                const layerSpreads = [0.7, 0.72, 0.78, 0.78, 0.78, 0.78, 0.88];

                for (let li = 0; li < layerOrder.length; li++) {
                    const layerNodes = layers[layerOrder[li]];
                    if (layerNodes.length === 0) continue;
                    const r = layerRadii[li];
                    const spread = layerSpreads[li];
                    const angleRange = sectorHalf * spread;

                    layerNodes.forEach((n, ni) => {
                        let a;
                        if (layerNodes.length === 1) {
                            a = sectorCenter;
                        } else {
                            const t = ni / (layerNodes.length - 1) - 0.5;
                            a = sectorCenter + t * angleRange * 2;
                        }
                        n.x = pn.x + Math.cos(a) * r;
                        n.y = pn.y + Math.sin(a) * r;
                        // 加少量随机偏移避免完全重叠
                        n.x += (Math.random() - 0.5) * 20;
                        n.y += (Math.random() - 0.5) * 20;
                    });
                }
            }

            // 孤立节点散布在外围
            const orphanRadius = Math.min(W, H) * 0.40;
            orphanNodes.forEach((n, i) => {
                const a = (2 * Math.PI * i) / Math.max(orphanNodes.length, 1);
                n.x = centerX + Math.cos(a) * orphanRadius + (Math.random() - 0.5) * 80;
                n.y = centerY + Math.sin(a) * orphanRadius + (Math.random() - 0.5) * 80;
            });
        } else {
            for (const n of otherNodes) {
                n.x = W / 2 + (Math.random() - 0.5) * Math.min(W, H) * 0.6;
                n.y = H / 2 + (Math.random() - 0.5) * Math.min(W, H) * 0.6;
            }
        }

        _graphState.nodes = nodes;
        _graphState.edges = edges;
        _graphState.nodeMap = nodeMap;

        // 初始化可见性：全量可见（筛选后再收缩）
        this._recomputeVisibility();
    },

    applyGraphFilterHighlight() {
        if (!_graphState.nodes || _graphState.nodes.length === 0) return;
        const E = ENTITY;
        const selectedProjects = new Set(this.selectedTags || []);
        const selectedSkills = new Set(this.selectedSkillTags || []);
        const selectedTemplates = new Set(this.selectedTemplateTags || []);
        const selectedRules = new Set(this.selectedRuleTags || []);
        const selectedAgents = new Set(this.selectedAgentTags || []);
        const hasAny = selectedProjects.size > 0 || selectedSkills.size > 0 ||
            selectedTemplates.size > 0 || selectedRules.size > 0 || selectedAgents.size > 0;

        // 收集当前可见文件 key
        const visibleFileKeys = new Set();
        const collectFileKeys = (items) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
                if (item.type === 'file') {
                    visibleFileKeys.add(item.key);
                    if (item.sessionKey != null) visibleFileKeys.add(String(item.sessionKey));
                } else if (item.type === 'folder' && item.children) {
                    collectFileKeys(item.children);
                }
            }
        };
        collectFileKeys(this.sortedTree);

        if (!hasAny) {
            for (const n of _graphState.nodes) {
                if (n.entityType === E.FILE) {
                    n.filterMatch = visibleFileKeys.has(n.treeKey) ||
                        visibleFileKeys.has(n.key.replace(E.FILE + '::', ''));
                } else {
                    n.filterMatch = true;
                }
            }
        } else {
            for (const n of _graphState.nodes) {
                let match = true;
                if (n.entityType === E.PROJECT) {
                    if (selectedProjects.size > 0) match = selectedProjects.has(n.name);
                } else if (n.entityType === E.STORY) {
                    match = selectedProjects.size === 0 || selectedProjects.has(n.extra.project);
                } else if (n.entityType === E.SKILL) {
                    match = selectedSkills.has(n.name);
                } else if (n.entityType === E.TEMPLATE) {
                    match = selectedTemplates.has(n.name);
                } else if (n.entityType === E.RULE) {
                    match = selectedRules.has(n.name);
                } else if (n.entityType === E.AGENT) {
                    match = selectedAgents.has(n.name);
                } else if (n.entityType === E.FILE) {
                    match = visibleFileKeys.has(n.treeKey) ||
                        visibleFileKeys.has(n.key.replace(E.FILE + '::', ''));
                }
                n.filterMatch = match;
            }
        }
        this._recomputeVisibility();
        this._renderGraph();
    },

    // ── 图层 + 筛选驱动可见性 ──
    _recomputeVisibility() {
        const { nodes, edges, nodeMap } = _graphState;
        if (!nodes) return;

        const allowedTypes = LAYER_TYPES[_currentLayer] || LAYER_TYPES[1];

        const hasAnyFilter = (this.selectedTags && this.selectedTags.length > 0) ||
            (this.selectedSkillTags && this.selectedSkillTags.length > 0) ||
            (this.selectedTemplateTags && this.selectedTemplateTags.length > 0) ||
            (this.selectedRuleTags && this.selectedRuleTags.length > 0) ||
            (this.selectedAgentTags && this.selectedAgentTags.length > 0);

        // 第一步：图层过滤 — 仅本层允许的类型可见
        for (const n of nodes) {
            n._visible = allowedTypes.has(n.entityType);
        }

        if (hasAnyFilter) {
            // 第二步：筛选过滤 — 在图层可见基础上，隐藏 filterMatch 为 false 的节点
            const visibleSet = new Set();
            for (const n of nodes) {
                if (n._visible && n.filterMatch !== false) {
                    visibleSet.add(n.key);
                }
            }
            // 保留与匹配节点有边相连的同层节点（避免孤立边）
            for (const e of edges) {
                if (visibleSet.has(e.from) || visibleSet.has(e.to)) {
                    const a = nodeMap.get(e.from);
                    const b = nodeMap.get(e.to);
                    if (a && allowedTypes.has(a.entityType)) visibleSet.add(e.from);
                    if (b && allowedTypes.has(b.entityType)) visibleSet.add(e.to);
                }
            }
            for (const n of nodes) {
                if (!visibleSet.has(n.key)) n._visible = false;
            }
        }

        // 边可见性：两端点均可见
        for (const e of edges) {
            const a = nodeMap.get(e.from);
            const b = nodeMap.get(e.to);
            e._visible = a && a._visible && b && b._visible;
        }
    },

    // ── 图层切换 ──
    _setLayer(level) {
        _currentLayer = Math.max(1, Math.min(3, level));
        this.graphCurrentLayer = _currentLayer;
        this._recomputeVisibility();
        this._renderGraph();
    },

    setGraphLayer(level) {
        this._setLayer(level);
    },

    // ── 力导向模拟（类型感知） ──
    _forceStep() {
        const { nodes, edges } = _graphState;
        const alpha = _graphState.simAlpha;
        if (alpha < 0.001) { this._stopSimulation(); return; }

        const W = _graphW, H = _graphH;
        const cx = W / 2, cy = H / 2;
        const E = ENTITY;

        // 斥力（库仑力）
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                let dx = b.x - a.x, dy = b.y - a.y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

                // 同类型实体间斥力更大，形成自然聚类间距
                let repulsion = 6000;
                if (a.entityType === b.entityType && a.entityType === E.PROJECT) repulsion = 30000;
                else if (a.entityType === b.entityType) repulsion = 12000;

                const force = repulsion / (dist * dist);
                const fx = (dx / dist) * force, fy = (dy / dist) * force;
                a.vx -= fx * alpha; a.vy -= fy * alpha;
                b.vx += fx * alpha; b.vy += fy * alpha;
            }
        }

        // 引力（弹簧力）
        for (const e of edges) {
            const a = _graphState.nodeMap.get(e.from);
            const b = _graphState.nodeMap.get(e.to);
            if (!a || !b) continue;

            let strength, idealLen;
            switch (e.type) {
                case 'contains':
                    strength = 0.04; idealLen = 150;
                    break;
                case 'uses':
                    strength = 0.02; idealLen = 200;
                    break;
                case 'implements':
                    strength = 0.015; idealLen = 130;
                    break;
                case 'references':
                    strength = 0.03; idealLen = 120;
                    break;
                default:
                    strength = 0.02; idealLen = 160;
            }

            let dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const force = (dist - idealLen) * strength;
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            a.vx += fx * alpha; a.vy += fy * alpha;
            b.vx -= fx * alpha; b.vy -= fy * alpha;
        }

        // 中心引力 — 项目节点较弱，文件节点适中
        for (const n of nodes) {
            const dx = cx - n.x, dy = cy - n.y;
            let g = 0.001;
            if (n.entityType === E.PROJECT) g = 0.003;
            else if (n.entityType === E.FILE) g = 0.0008;
            n.vx += dx * g * alpha;
            n.vy += dy * g * alpha;
        }

        // 聚类锚定力 — 非项目节点被拉向其关联的项目节点
        const projectNodes = nodes.filter(n => n.entityType === E.PROJECT);
        if (projectNodes.length > 0) {
            // 为每个非项目节点找到最近的项目节点
            for (const n of nodes) {
                if (n.entityType === E.PROJECT) continue;
                let bestP = null, bestD = Infinity;
                for (const pn of projectNodes) {
                    const d = (n.x - pn.x) ** 2 + (n.y - pn.y) ** 2;
                    if (d < bestD) { bestD = d; bestP = pn; }
                }
                if (bestP && bestD > 400) {
                    const dx2 = bestP.x - n.x, dy2 = bestP.y - n.y;
                    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                    // 锚定力随距离增长，但有上限
                    const anchorStrength = Math.min(0.006, dist2 * 0.000015);
                    n.vx += (dx2 / dist2) * anchorStrength * alpha;
                    n.vy += (dy2 / dist2) * anchorStrength * alpha;
                }
            }
        }

        // 应用速度 + 阻尼
        for (const n of nodes) {
            if (_graphState.dragging === n) { n.vx = 0; n.vy = 0; continue; }
            n.x += n.vx;
            n.y += n.vy;
            n.vx *= 0.42;
            n.vy *= 0.42;
            n.x = Math.max(40, Math.min(W - 40, n.x));
            n.y = Math.max(40, Math.min(H - 40, n.y));
        }

        _graphState.simAlpha *= 0.965;
        this._renderGraph();

        if (_graphState.simAlpha > 0.001) {
            _graphState.simTimer = requestAnimationFrame(() => this._forceStep());
        } else {
            this._stopSimulation();
        }
    },

    _startForceSimulation() {
        this._stopSimulation();
        _graphState.simAlpha = 0.5;
        _graphState.simRunning = true;
        this._forceStep();
    },

    _stopSimulation() {
        if (_graphState.simTimer) {
            cancelAnimationFrame(_graphState.simTimer);
            _graphState.simTimer = null;
        }
        _graphState.simRunning = false;
        _graphState.simAlpha = 0;
    },

    // ── 渲染 ──
    _renderGraph() {
        const ctx = _graphCtx;
        const w = _graphW, h = _graphH;
        if (!ctx) return;

        const { nodes, edges, nodeMap, zoom, panX, panY, hoveredKey } = _graphState;
        const E = ENTITY;

        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.translate(panX + w / 2, panY + h / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-w / 2, -h / 2);

        // ── 背景点阵（世界坐标，随内容移动） ──
        const dotSpacing = 32;
        const dotSize = 1.0;
        const viewLeft = w / 2 - (panX + w / 2) / zoom;
        const viewTop = h / 2 - (panY + h / 2) / zoom;
        const viewRight = viewLeft + w / zoom;
        const viewBottom = viewTop + h / zoom;
        const gridStartX = Math.floor(viewLeft / dotSpacing) * dotSpacing;
        const gridStartY = Math.floor(viewTop / dotSpacing) * dotSpacing;

        ctx.fillStyle = 'rgba(203,213,225,0.22)';
        for (let gx = gridStartX; gx <= viewRight; gx += dotSpacing) {
            for (let gy = gridStartY; gy <= viewBottom; gy += dotSpacing) {
                ctx.fillRect(gx - dotSize / 2, gy - dotSize / 2, dotSize, dotSize);
            }
        }

        // ── 项目聚类背景区域 ──
        const projectNodes = nodes.filter(n => n.entityType === E.PROJECT);
        if (projectNodes.length > 1) {
            const projectChildren = new Map();
            for (const pn of projectNodes) projectChildren.set(pn.key, []);
            for (const n of nodes) {
                if (n.entityType === E.PROJECT || n._visible === false) continue;
                // 找最近的 project 节点
                let bestP = null, bestD = Infinity;
                for (const pn of projectNodes) {
                    const d = (n.x - pn.x) ** 2 + (n.y - pn.y) ** 2;
                    if (d < bestD) { bestD = d; bestP = pn; }
                }
                if (bestP && bestD < 600 * 600) {
                    projectChildren.get(bestP.key).push(n);
                }
            }
            const clusterColors = [
                'rgba(59,130,246,0.025)', 'rgba(16,185,129,0.025)',
                'rgba(139,92,246,0.025)', 'rgba(245,158,11,0.025)',
                'rgba(244,63,94,0.025)', 'rgba(6,182,212,0.025)'
            ];
            const clusterBorders = [
                'rgba(59,130,246,0.08)', 'rgba(16,185,129,0.08)',
                'rgba(139,92,246,0.08)', 'rgba(245,158,11,0.08)',
                'rgba(244,63,94,0.08)', 'rgba(6,182,212,0.08)'
            ];
            let ci = 0;
            for (const pn of projectNodes) {
                const children = projectChildren.get(pn.key) || [];
                if (children.length === 0) { ci++; continue; }
                // 计算包围圈
                let maxR = 0;
                for (const c of children) {
                    const d = Math.sqrt((c.x - pn.x) ** 2 + (c.y - pn.y) ** 2) + Math.max(c.w, c.h) / 2;
                    if (d > maxR) maxR = d;
                }
                maxR = Math.max(maxR + 30, 120);
                ctx.beginPath();
                ctx.arc(pn.x, pn.y, maxR, 0, Math.PI * 2);
                ctx.fillStyle = clusterColors[ci % clusterColors.length];
                ctx.fill();
                ctx.strokeStyle = clusterBorders[ci % clusterBorders.length];
                ctx.lineWidth = 0.5;
                ctx.setLineDash([4, 8]);
                ctx.stroke();
                ctx.setLineDash([]);
                ci++;
            }
        }

        // ── 边渲染（贝塞尔曲线，仅可见边） ──
        for (const e of edges) {
            if (e._visible === false) continue;
            const a = nodeMap.get(e.from), b = nodeMap.get(e.to);
            if (!a || !b) continue;

            const isHovered = hoveredKey && (hoveredKey === a.key || hoveredKey === b.key);

            let strokeColor, lineWidth, dashPattern;
            const baseAlpha = 1;

            switch (e.type) {
                case 'contains':
                    strokeColor = isHovered ? '#60a5fa' : '#94a3b8';
                    lineWidth = isHovered ? 2.0 : 1;
                    dashPattern = [];
                    break;
                case 'uses':
                    strokeColor = isHovered ? '#a78bfa' : '#cbd5e1';
                    lineWidth = isHovered ? 1.6 : 0.8;
                    dashPattern = [6, 4];
                    break;
                case 'implements':
                    strokeColor = isHovered ? '#34d399' : '#e2e8f0';
                    lineWidth = isHovered ? 1.4 : 0.6;
                    dashPattern = [3, 5];
                    break;
                case 'references':
                    strokeColor = isHovered ? '#38bdf8' : '#e0f2fe';
                    lineWidth = isHovered ? 1.5 : 0.7;
                    dashPattern = [2, 6];
                    break;
                default:
                    strokeColor = '#d1d5db';
                    lineWidth = 0.6;
                    dashPattern = [];
            }

            ctx.beginPath();
            if (dashPattern.length > 0) ctx.setLineDash(dashPattern);

            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) {
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
            } else {
                const shrinkA = (a.w / 2 + 2) / dist;
                const shrinkB = (b.w / 2 + 2) / dist;
                const ax = a.x + dx * shrinkA, ay = a.y + dy * shrinkA;
                const bx = b.x - dx * shrinkB, by = b.y - dy * shrinkB;

                // 贝塞尔控制点：中点 + 垂直于边的偏移
                const mx = (ax + bx) / 2, my = (ay + by) / 2;
                const perpX = -(by - ay), perpY = (bx - ax);
                const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
                const curveOffset = Math.min(dist * 0.25, 60);
                const cx = mx + (perpX / perpLen) * curveOffset;
                const cy = my + (perpY / perpLen) * curveOffset;

                ctx.moveTo(ax, ay);
                ctx.quadraticCurveTo(cx, cy, bx, by);

                // 箭头标记（终点处）
                if (isHovered) {
                    const arrowSize = 5;
                    const ux = bx - cx, uy = by - cy;
                    const ul = Math.sqrt(ux * ux + uy * uy);
                    if (ul > arrowSize * 2) {
                        const uxn = ux / ul, uyn = uy / ul;
                        const p1x = bx - uxn * arrowSize + uyn * arrowSize * 0.5;
                        const p1y = by - uyn * arrowSize - uxn * arrowSize * 0.5;
                        const p2x = bx - uxn * arrowSize - uyn * arrowSize * 0.5;
                        const p2y = by - uyn * arrowSize + uxn * arrowSize * 0.5;
                        ctx.moveTo(p1x, p1y);
                        ctx.lineTo(bx, by);
                        ctx.lineTo(p2x, p2y);
                    }
                }
            }

            ctx.globalAlpha = baseAlpha;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            // 悬停时边类型标签
            if (isHovered) {
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                const perpX = -(b.y - a.y), perpY = (b.x - a.x);
                const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
                const curveOffset = Math.min(dist * 0.25, 60);
                const lx = mx + (perpX / perpLen) * curveOffset;
                const ly = my + (perpY / perpLen) * curveOffset;
                const relLabels = { contains: '包含', uses: '使用', implements: '实现', references: '引用' };
                const label = relLabels[e.type] || e.type;
                ctx.font = '9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
                const lm = ctx.measureText(label);
                const lw = lm.width + 8, lh = 16;
                ctx.fillStyle = 'rgba(255,255,255,0.94)';
                const lrx = lx - lw / 2, lry = ly - lh / 2;
                ctx.beginPath();
                ctx.moveTo(lrx + 4, lry);
                ctx.lineTo(lrx + lw - 4, lry);
                ctx.arcTo(lrx + lw, lry, lrx + lw, lry + 4, 4);
                ctx.lineTo(lrx + lw, lry + lh - 4);
                ctx.arcTo(lrx + lw, lry + lh, lrx + lw - 4, lry + lh, 4);
                ctx.lineTo(lrx + 4, lry + lh);
                ctx.arcTo(lrx, lry + lh, lrx, lry + lh - 4, 4);
                ctx.lineTo(lrx, lry + 4);
                ctx.arcTo(lrx, lry, lrx + 4, lry, 4);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.fillStyle = '#374151';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, lx, ly);
                ctx.textAlign = 'start';
                ctx.textBaseline = 'alphabetic';
            }
        }

        // ── 节点渲染（仅可见节点） ──
        for (const n of nodes) {
            if (n._visible === false) continue;
            const isHovered = hoveredKey === n.key;
            const isSel = n.entityType === E.FILE && n.treeKey && this.isFileSelected(n.treeKey);
            const isSearchMatch = n._searchMatch === true;
            const entityColors = ENTITY_COLORS[n.entityType] || ENTITY_COLORS.file;
            const rx = n.x - n.w / 2, ry = n.y - n.h / 2;

            const r = n.entityType === E.FILE ? 5 : (n.entityType === E.PROJECT ? 10 : 7);

            // 搜索匹配高亮光晕
            if (isSearchMatch) {
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 12;
            }
            // 悬停光晕
            else if (isHovered) {
                ctx.shadowColor = entityColors.stroke;
                ctx.shadowBlur = 10;
            }
            // 默认阴影
            else {
                ctx.shadowColor = 'rgba(0,0,0,0.08)';
                ctx.shadowBlur = 3;
            }

            // 背景
            ctx.beginPath();
            ctx.moveTo(rx + r, ry);
            ctx.lineTo(rx + n.w - r, ry);
            ctx.arcTo(rx + n.w, ry, rx + n.w, ry + r, r);
            ctx.lineTo(rx + n.w, ry + n.h - r);
            ctx.arcTo(rx + n.w, ry + n.h, rx + n.w - r, ry + n.h, r);
            ctx.lineTo(rx + r, ry + n.h);
            ctx.arcTo(rx, ry + n.h, rx, ry + n.h - r, r);
            ctx.lineTo(rx, ry + r);
            ctx.arcTo(rx, ry, rx + r, ry, r);
            ctx.closePath();

            let bg, border, borderW;
            if (isSearchMatch) {
                bg = '#fffbeb';
                border = '#f59e0b';
                borderW = 2.2;
            } else if (isSel) {
                bg = entityColors.fill;
                border = entityColors.stroke;
                borderW = 2.5;
            } else if (isHovered) {
                bg = entityColors.fill;
                border = entityColors.stroke;
                borderW = 2;
            } else {
                bg = entityColors.fill;
                border = entityColors.stroke;
                borderW = 1;
            }
            ctx.fillStyle = bg; ctx.fill();
            ctx.strokeStyle = border; ctx.lineWidth = borderW; ctx.stroke();

            // 重置阴影
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

            // 实体类型指示条（左侧色条）
            if (n.entityType !== E.FILE) {
                ctx.fillStyle = entityColors.badge;
                ctx.beginPath();
                ctx.moveTo(rx + 3, ry + 6);
                ctx.lineTo(rx + 3, ry + n.h - 6);
                ctx.lineWidth = 3;
                ctx.strokeStyle = entityColors.badge;
                ctx.lineCap = 'round';
                ctx.stroke();
            } else {
                // 文件节点：扩展名颜色条
                const ext = n.extension || '';
                const extColor = EXT_COLORS[ext] || EXT_COLORS.default;
                ctx.fillStyle = extColor;
                ctx.fillRect(rx, ry + 3, 3, n.h - 6);
            }

            // 图标
            const icon = ENTITY_ICONS[n.entityType] ||
                (n.entityType === E.FILE ? '\u{1F4C4}' : '\u{1F4C4}');
            const ix = rx + (n.entityType === E.FILE ? 10 : 12);
            const iy = n.entityType === E.PROJECT ? ry + 18 : ry + n.h / 2;
            ctx.font = (n.entityType === E.PROJECT ? '14px' : '11px') + ' sans-serif';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, ix, iy + 1);

            // 名称
            const labelX = ix + 18;
            const nameY = n.entityType === E.PROJECT ? ry + 18 : ry + n.h / 2;
            ctx.fillStyle = entityColors.text;
            const fontWeight = n.entityType === E.PROJECT ? '600' :
                (n.entityType === E.STORY ? '600' : '500');
            ctx.font = fontWeight + ' ' +
                (n.entityType === E.PROJECT ? '12.5px' :
                 n.entityType === E.STORY ? '11px' :
                 n.entityType === E.FILE ? '10px' : '10.5px') +
                ' -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
            ctx.textBaseline = 'middle';
            const maxTW = n.w - (n.entityType === E.FILE ? 60 : 65);
            let dt = n.name || '';
            const tm = ctx.measureText(dt);
            if (tm.width > maxTW) {
                let cut = Math.floor(dt.length * maxTW / tm.width) - 2;
                if (cut < 3) cut = 3;
                dt = dt.substring(0, cut) + '..';
            }
            ctx.fillText(dt, labelX, nameY, maxTW);

            // 项目节点：统计信息副标题 + 徽章
            if (n.entityType === E.PROJECT && n.extra) {
                const parts = [];
                if (n.extra.storyCount) parts.push(n.extra.storyCount + ' 故事');
                if (n.extra.scenarioCount) parts.push(n.extra.scenarioCount + ' 场景');
                if (n.extra.skillCount) parts.push(n.extra.skillCount + ' 技能');
                const subtitle = parts.join(' · ') || (n.extra.count + ' 文件');
                ctx.font = '9.5px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
                ctx.fillStyle = entityColors.text;
                ctx.globalAlpha = 0.65;
                ctx.fillText(subtitle, labelX, ry + 36, maxTW);
                ctx.globalAlpha = 1;

                // 文件数徽章
                const countStr = n.extra.count + ' 文件';
                ctx.font = '8.5px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
                const cm = ctx.measureText(countStr);
                const cw = cm.width + 8, ch = 14;
                const cbx = rx + n.w - cw - 4, cby = ry + n.h - ch - 3;
                ctx.fillStyle = entityColors.badge;
                ctx.beginPath();
                ctx.moveTo(cbx + 2, cby);
                ctx.lineTo(cbx + cw - 2, cby);
                ctx.arcTo(cbx + cw, cby, cbx + cw, cby + 2, 2);
                ctx.lineTo(cbx + cw, cby + ch - 2);
                ctx.arcTo(cbx + cw, cby + ch, cbx + cw - 2, cby + ch, 2);
                ctx.lineTo(cbx + 2, cby + ch);
                ctx.arcTo(cbx, cby + ch, cbx, cby + ch - 2, 2);
                ctx.lineTo(cbx, cby + 2);
                ctx.arcTo(cbx, cby, cbx + 2, cby, 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(countStr, cbx + cw / 2, cby + ch / 2 + 0.5);
                ctx.textAlign = 'start';
                ctx.textBaseline = 'alphabetic';
            }

            // 故事节点：项目名副标题 + 子节点计数
            if (n.entityType === E.STORY) {
                const proj = n.extra && n.extra.project;
                const childCount = (n._childrenKeys && n._childrenKeys.length) || 0;
                if (proj) {
                    ctx.font = '9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
                    ctx.fillStyle = entityColors.text;
                    ctx.globalAlpha = 0.55;
                    const subText = childCount > 0 ? proj + ' · ' + childCount + ' 场景' : proj;
                    const sm = ctx.measureText(subText);
                    const subX = labelX;
                    const subY = ry + n.h - 10;
                    ctx.fillText(subText, subX, subY, n.w - 65);
                    ctx.globalAlpha = 1;
                }
            }

            // 场景节点：显示描述片段
            if (n.entityType === E.SCENARIO) {
                const desc = n.extra && n.extra.pageDescription;
                if (desc) {
                    ctx.font = '8.5px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
                    ctx.fillStyle = entityColors.text;
                    ctx.globalAlpha = 0.50;
                    let shortDesc = desc.length > 24 ? desc.substring(0, 22) + '..' : desc;
                    ctx.fillText(shortDesc, labelX, ry + n.h - 10, n.w - 60);
                    ctx.globalAlpha = 1;
                }
            }

            // 技能/模板/规则/代理节点：显示所属项目
            if (n.entityType === E.SKILL || n.entityType === E.TEMPLATE ||
                n.entityType === E.RULE || n.entityType === E.AGENT) {
                const proj = n.extra && n.extra.project;
                if (proj) {
                    ctx.font = '9px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
                    ctx.fillStyle = entityColors.text;
                    ctx.globalAlpha = 0.55;
                    ctx.fillText(proj, labelX, ry + n.h - 10, n.w - 60);
                    ctx.globalAlpha = 1;
                }
            }

            // 文件大小标记
            if (n.entityType === E.FILE && n.size) {
                const sizeStr = n.size > 1024 ? Math.round(n.size / 1024) + 'KB' : n.size + 'B';
                ctx.font = '8px monospace';
                ctx.fillStyle = '#9ca3af';
                ctx.textAlign = 'right';
                ctx.fillText(sizeStr, rx + n.w - 6, iy);
                ctx.textAlign = 'start';
            }

            // 选中态光环
            if (isSel) {
                ctx.beginPath();
                ctx.moveTo(rx - 3 + r, ry - 3);
                ctx.lineTo(rx + n.w + 3 - r, ry - 3);
                ctx.arcTo(rx + n.w + 3, ry - 3, rx + n.w + 3, ry - 3 + r, r);
                ctx.lineTo(rx + n.w + 3, ry + n.h + 3 - r);
                ctx.arcTo(rx + n.w + 3, ry + n.h + 3, rx + n.w + 3 - r, ry + n.h + 3, r);
                ctx.lineTo(rx - 3 + r, ry + n.h + 3);
                ctx.arcTo(rx - 3, ry + n.h + 3, rx - 3, ry + n.h + 3 - r, r);
                ctx.lineTo(rx - 3, ry - 3 + r);
                ctx.arcTo(rx - 3, ry - 3, rx - 3 + r, ry - 3, r);
                ctx.closePath();
                ctx.strokeStyle = entityColors.stroke;
                ctx.lineWidth = 1.2;
                ctx.setLineDash([3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            ctx.globalAlpha = 1;
        }

        ctx.restore();
        this.renderMiniMap();
    },

    // ── 交互 ──
    _findNodeAt(sx, sy) {
        const { nodes, zoom, panX, panY } = _graphState;
        const w = _graphW, h = _graphH;
        const gx = (sx - panX - w / 2) / zoom + w / 2;
        const gy = (sy - panY - h / 2) / zoom + h / 2;
        for (let i = nodes.length - 1; i >= 0; i--) {
            const n = nodes[i];
            if (n._visible === false) continue;
            if (gx >= n.x - n.w / 2 && gx <= n.x + n.w / 2 &&
                gy >= n.y - n.h / 2 && gy <= n.y + n.h / 2) return n;
        }
        return null;
    },

    onGraphWheel(e) {
        const delta = e.deltaY > 0 ? 0.88 : 1.12;
        const newZoom = Math.max(0.2, Math.min(3.5, (_graphState.zoom || 1) * delta));
        _graphState.zoom = newZoom;
        this._renderGraph();
    },

    onGraphMouseMove(e) {
        const canvas = this.$refs.graphCanvas;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;

        if (_graphState.dragging && _graphState.dragging.__pan) {
            const dx = e.clientX - _graphState.dragStartX;
            const dy = e.clientY - _graphState.dragStartY;
            _graphState.panX += dx;
            _graphState.panY += dy;
            _graphState.dragStartX = e.clientX;
            _graphState.dragStartY = e.clientY;
            this._renderGraph();
            return;
        }

        const node = this._findNodeAt(x, y);
        if (node) {
            _graphState.hoveredKey = node.key;
            const E = ENTITY;
            const clickable = node.entityType === E.FILE || node.entityType === E.PROJECT ||
                node.entityType === E.STORY || node.entityType === E.SCENARIO ||
                node.entityType === E.SKILL || node.entityType === E.TEMPLATE ||
                node.entityType === E.RULE || node.entityType === E.AGENT;
            canvas.style.cursor = clickable ? 'pointer' : 'default';

            // Tooltip — 按实体类型展示丰富信息
            const typeLabels = { project: '项目', story: '故事', scenario: '场景', skill: 'Skill', template: 'Template', rule: 'Rule', agent: 'Agent', file: '文件' };
            const typeLabel = typeLabels[node.entityType] || '';
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
                if (ex.templateCount) infoParts.push(ex.templateCount + ' 模板');
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
            // 悬停代码文件时异步拉取前 15 行预览
            let codePreview = null;
            if (node.entityType === E.FILE && node.treeKey) {
                if (node._codePreview !== undefined) {
                    codePreview = node._codePreview;
                } else {
                    node._codePreview = null;
                    this._fetchCodePreview(node);
                }
            }
            this.graphTooltip = {
                name: node.name,
                desc: descText || node.pageDescription || '',
                meta: metaParts.join(' · '),
                code: codePreview || (node._codePreview || null)
            };
            this.graphTooltipStyle = { left: (x + 14) + 'px', top: (y - 10) + 'px' };
        } else {
            _graphState.hoveredKey = null;
            canvas.style.cursor = 'grab';
            this.graphTooltip = null;
        }
        this._renderGraph();
    },

    onGraphMouseDown(e) {
        const canvas = this.$refs.graphCanvas;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const node = this._findNodeAt(x, y);
        if (node) {
            _graphState.dragging = node;
            _graphState.dragStartX = e.clientX;
            _graphState.dragStartY = e.clientY;
        } else {
            _graphState.dragging = { __pan: true };
            _graphState.dragStartX = e.clientX;
            _graphState.dragStartY = e.clientY;
            canvas.style.cursor = 'grabbing';
        }
    },

    onGraphMouseUp() {
        const canvas = this.$refs.graphCanvas;
        if (canvas) canvas.style.cursor = _graphState.hoveredKey ? 'pointer' : 'grab';
        _graphState.dragging = null;
    },

    onGraphClick(e) {
        const canvas = this.$refs.graphCanvas;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const node = this._findNodeAt(x, y);
        if (!node) return;

        const E = ENTITY;

        // 文件节点：选中打开
        if (node.entityType === E.FILE && node.treeKey) {
            this.handleTagClick(node.treeKey);
            return;
        }

        // 项目节点：触发项目筛选
        if (node.entityType === E.PROJECT) {
            this.$emit('tag-select', [node.name]);
        } else if (node.entityType === E.STORY) {
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
    },

    onGraphMouseLeave() {
        _graphState.hoveredKey = null;
        this.graphTooltip = null;
        if (!_graphState.dragging) this._renderGraph();
    },

    _fetchCodePreview(node) {
        if (!node || !node.treeKey) return;
        // 从 sessions 中找到该文件的 pageDescription（内容已缓存在会话数据中）
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

    onGraphDblClick(e) {
        this._buildGraphData();
        this._startForceSimulation();
    },

    watchGraphResize() {
        const canvas = this.$refs.graphCanvas;
        const container = this.$refs.graphContainer;
        if (!canvas || !container) return;
        const rect = container.getBoundingClientRect();
        if (Math.abs(rect.width - _graphW) > 2 || Math.abs(rect.height - _graphH) > 2) {
            _graphW = rect.width;
            _graphH = rect.height;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            _graphCtx = ctx;
            this._buildGraphData();
            this._startForceSimulation();
        }
    },

    // ── 缩放控件 ──
    getGraphZoomPercent() {
        return Math.round((_graphState.zoom || 1) * 100);
    },

    onGraphZoomIn() {
        _graphState.zoom = Math.min(3.5, (_graphState.zoom || 1) * 1.25);
        this._renderGraph();
    },

    onGraphZoomOut() {
        _graphState.zoom = Math.max(0.2, (_graphState.zoom || 1) * 0.8);
        this._renderGraph();
    },

    onGraphZoomReset() {
        _graphState.zoom = 1;
        _graphState.panX = 0;
        _graphState.panY = 0;
        this._renderGraph();
    },

    onGraphFocusFiltered() {
        // 聚焦到匹配筛选的节点
        const matchingNodes = _graphState.nodes.filter(n => n.filterMatch !== false);
        if (matchingNodes.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of matchingNodes) {
            minX = Math.min(minX, n.x - n.w / 2);
            minY = Math.min(minY, n.y - n.h / 2);
            maxX = Math.max(maxX, n.x + n.w / 2);
            maxY = Math.max(maxY, n.y + n.h / 2);
        }
        const gw = maxX - minX + 40;
        const gh = maxY - minY + 40;
        const zoomX = _graphW / gw;
        const zoomY = _graphH / gh;
        const newZoom = Math.min(3.5, Math.max(0.2, Math.min(zoomX, zoomY) * 0.85));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        _graphState.zoom = newZoom;
        _graphState.panX = (_graphW / 2 - centerX) * newZoom;
        _graphState.panY = (_graphH / 2 - centerY) * newZoom;
        this._renderGraph();
    },

    // ── 图谱内搜索 ──
    onGraphSearchInput(e) {
        const query = (e.target.value || '').trim().toLowerCase();
        this.graphSearchQuery = query;
        if (!query || !_graphState.nodes || _graphState.nodes.length === 0) {
            this.graphSearchMatches = '';
            this.graphSearchIndex = 0;
            this.graphSearchTotal = 0;
            // 清除高亮
            for (const n of _graphState.nodes) n._searchMatch = false;
            this._renderGraph();
            return;
        }

        const matches = _graphState.nodes.filter(n => {
            const name = (n.name || '').toLowerCase();
            return name.includes(query);
        });
        for (const n of _graphState.nodes) n._searchMatch = false;
        for (const m of matches) m._searchMatch = true;

        this.graphSearchIndex = 0;
        this.graphSearchTotal = matches.length;
        this.graphSearchMatches = matches.length > 0 ? '找到 ' + matches.length + ' 个' : '无匹配';

        if (matches.length === 1) {
            this._focusNode(matches[0]);
            this.graphSearchIndex = 1;
        }

        this._renderGraph();
    },

    onGraphSearchNext() {
        const query = (this.graphSearchQuery || '').trim().toLowerCase();
        if (!query || this.graphSearchTotal === 0) return;

        const matches = _graphState.nodes.filter(n => {
            const name = (n.name || '').toLowerCase();
            return name.includes(query);
        });

        if (matches.length === 0) return;

        const idx = (this.graphSearchIndex % matches.length);
        this._focusNode(matches[idx]);
        this.graphSearchIndex = idx + 1;
        this.graphSearchMatches = (idx + 1) + ' / ' + matches.length;
    },

    onGraphSearchClear() {
        this.graphSearchQuery = '';
        this.graphSearchMatches = '';
        this.graphSearchIndex = 0;
        this.graphSearchTotal = 0;
        for (const n of _graphState.nodes) n._searchMatch = false;
        this._renderGraph();
    },

    _focusNode(node) {
        // 平移视口使节点居中
        _graphState.panX = (_graphW / 2 - node.x) * _graphState.zoom;
        _graphState.panY = (_graphH / 2 - node.y) * _graphState.zoom;
        this._renderGraph();
    },

    // ── 迷你地图 ──
    _needsMiniMap: true,

    renderMiniMap() {
        const miniCanvas = this.$refs.graphMiniMap;
        if (!miniCanvas) return;
        const mw = 160, mh = 120;
        miniCanvas.width = mw * 2;
        miniCanvas.height = mh * 2;
        miniCanvas.style.width = mw + 'px';
        miniCanvas.style.height = mh + 'px';
        const ctx = miniCanvas.getContext('2d');
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.clearRect(0, 0, mw, mh);

        // 背景
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fillRect(0, 0, mw, mh);

        const { nodes, edges, nodeMap, zoom, panX, panY } = _graphState;
        if (!nodes || nodes.length === 0) return;

        // 计算世界范围
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of nodes) {
            minX = Math.min(minX, n.x - n.w);
            minY = Math.min(minY, n.y - n.h);
            maxX = Math.max(maxX, n.x + n.w);
            maxY = Math.max(maxY, n.y + n.h);
        }
        const worldW = maxX - minX || 1;
        const worldH = maxY - minY || 1;
        const pad = 8;
        const scaleX = (mw - pad * 2) / worldW;
        const scaleY = (mh - pad * 2) / worldH;
        const scale = Math.min(scaleX, scaleY);
        const ox = pad - minX * scale;
        const oy = pad - minY * scale;

        const tx = (x) => ox + x * scale;
        const ty = (y) => oy + y * scale;

        // 聚类区域
        const projectNodes = nodes.filter(n => n.entityType === ENTITY.PROJECT);
        if (projectNodes.length > 1) {
            for (const pn of projectNodes) {
                let maxR = 0;
                for (const n of nodes) {
                    if (n.entityType === ENTITY.PROJECT || n.filterMatch === false) continue;
                    const d = Math.sqrt((n.x - pn.x) ** 2 + (n.y - pn.y) ** 2);
                    if (d < maxR || d < 300) maxR = Math.max(maxR, d);
                }
                if (maxR > 0) {
                    const colors = ENTITY_COLORS[ENTITY.PROJECT] || ENTITY_COLORS.file;
                    ctx.beginPath();
                    ctx.arc(tx(pn.x), ty(pn.y), Math.max(maxR * scale, 6), 0, Math.PI * 2);
                    ctx.fillStyle = colors.fill.replace(')', ',0.25)').replace('rgb', 'rgba');
                    if (colors.fill.startsWith('#')) {
                        ctx.fillStyle = 'rgba(59,130,246,0.12)';
                    }
                    ctx.fill();
                }
            }
        }

        // 边
        for (const e of edges) {
            const a = nodeMap.get(e.from), b = nodeMap.get(e.to);
            if (!a || !b) continue;
            ctx.beginPath();
            ctx.moveTo(tx(a.x), ty(a.y));
            ctx.lineTo(tx(b.x), ty(b.y));
            ctx.strokeStyle = 'rgba(209,213,219,0.4)';
            ctx.lineWidth = 0.3;
            ctx.stroke();
        }

        // 节点
        for (const n of nodes) {
            const sz = Math.max(1.5, Math.min(4, (n.w + n.h) / 2 * scale * 0.5));
            const colors = ENTITY_COLORS[n.entityType] || ENTITY_COLORS.file;
            ctx.fillStyle = n.filterMatch === false ? 'rgba(209,213,219,0.3)' : colors.stroke;
            ctx.fillRect(tx(n.x) - sz, ty(n.y) - sz, sz * 2, sz * 2);
        }

        // 视口框
        const vx = (_graphW / 2 - panX - _graphW / (2 * zoom)) * scale / zoom + ox;
        const vy = (_graphH / 2 - panY - _graphH / (2 * zoom)) * scale / zoom + oy;
        const vw = _graphW * scale / zoom;
        const vh = _graphH * scale / zoom;
        ctx.strokeStyle = 'rgba(59,130,246,0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(vx, vy, vw, vh);
    },

    onMiniMapClick(e) {
        const miniCanvas = this.$refs.graphMiniMap;
        if (!miniCanvas || !_graphState.nodes || _graphState.nodes.length === 0) return;
        const mw = 160, mh = 120;
        const rect = miniCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 计算世界范围（同 renderMiniMap）
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of _graphState.nodes) {
            minX = Math.min(minX, n.x - n.w);
            minY = Math.min(minY, n.y - n.h);
            maxX = Math.max(maxX, n.x + n.w);
            maxY = Math.max(maxY, n.y + n.h);
        }
        const worldW = maxX - minX || 1;
        const worldH = maxY - minY || 1;
        const pad = 8;
        const scaleX = (mw - pad * 2) / worldW;
        const scaleY = (mh - pad * 2) / worldH;
        const scale = Math.min(scaleX, scaleY);

        const worldX = (mx - pad) / scale + minX;
        const worldY = (my - pad) / scale + minY;

        _graphState.panX = (_graphW / 2 - worldX) * _graphState.zoom;
        _graphState.panY = (_graphH / 2 - worldY) * _graphState.zoom;
        this._renderGraph();
    },
};

export { fileTreeMethods };
