import { registerGlobalComponent } from '/cdn/utils/view/componentLoader.js';

// ── 颜色与样式常量（对标 Understand-Anything 视觉风格）──

const GROUP_COLORS = {
    'L1-Views':        '#3B82F6',
    'L2-Services':     '#F59E0B',
    'L3-Framework':    '#8B5CF6',
    'Tests':           '#EF4444',
    'Documentation':   '#6B7280',
    'External':        '#9CA3AF',
    'L0-Entry':        '#10B981',
    '视图工厂':          '#8B5CF6',
    '组件系统':          '#8B5CF6',
    '基础设施':          '#8B5CF6',
    '配置':             '#F59E0B',
    '服务聚合':          '#F59E0B',
    '数据操作':          '#F59E0B',
    '请求工具':          '#F59E0B',
    '认证':             '#F59E0B',
    '同步服务':          '#F59E0B',
    '视图入口':          '#3B82F6',
    '共享工具':          '#3B82F6',
    '知识图谱':          '#3B82F6',
    '通用组件':          '#06B6D4',
    '业务组件':          '#06B6D4',
    '渲染系统':          '#06B6D4',
    '①事件层':          '#3B82F6',
    '②方法层':          '#6366F1',
    '③状态层':          '#8B5CF6',
    '④派生层':          '#A855F7',
    '⑤数据层':          '#F59E0B',
    '⑥网络层':          '#F97316',
    '⑦认证层':          '#EF4444',
    '⑧错误层':          '#DC2626',
    '⑨校验层':          '#10B981',
    '⑩渲染层':          '#06B6D4',
    '外部':             '#9CA3AF',
    '输入面':           '#EF4444',
    '接口面':           '#F59E0B',
    '存储面':           '#8B5CF6',
    '认证面':           '#EC4899',
    '渲染面':           '#06B6D4',
    '文档':             '#6B7280',
    '测试':             '#EF4444',
    '🔴 高风险':        '#EF4444',
    '🟡 中风险':        '#F59E0B',
    '🟢 低风险':        '#10B981',
    '⚠️ 违规':         '#DC2626',
    '消费者':           '#3B82F6',
    '检查模式':          '#3B82F6',
    '规则引擎':          '#F59E0B',
    '输出':             '#10B981',
    '规则项':           '#8B5CF6',
    '参照基线':          '#6B7280',
};

const TYPE_LABELS = {
    'view': '视图', 'service': '服务', 'framework': '框架', 'utility': '工具',
    'component': '组件', 'config': '配置', 'test': '测试', 'doc': '文档',
    'entry': '入口', 'external': '外部', 'event': '事件', 'method': '方法',
    'state': '状态', 'computed': '计算', 'cache': '缓存', 'render': '渲染',
    'input_surface': '输入面', 'api_surface': '接口面', 'storage_surface': '存储面',
    'auth_surface': '认证面', 'render_surface': '渲染面', 'documentation': '文档',
    'consumer': '消费者', 'check': '检查', 'engine': '引擎', 'output': '输出',
    'rule': '规则', 'baseline': '基线',
};

const RELATION_LABELS = {
    'imports': '导入', 'contains': '包含', 'depends_on': '依赖', 'tests': '测试',
    're_exports': '重导出', 'creates': '创建', 'triggers': '触发', 'mutates': '变更',
    'calls': '调用', 'derives': '派生', 'checks': '检查', 'injects': '注入',
    'validates': '校验', 'manages': '管理', 'protects': '保护', 'cooperates': '协作',
    'reads': '读取', 'reads_writes': '读写', 'belongs_to': '属于', 'layer_depends': '分层依赖',
    'loads': '加载', 'registered_by': '注册', 'used_by': '使用', 'documents': '记录',
    'parallel': '并行', 'compares': '对比', 'executes': '执行', 'drives': '驱动',
    'produces': '产出', 'implements': '实现',
};

function getNodeColor(node) {
    if (node.group && GROUP_COLORS[node.group]) return GROUP_COLORS[node.group];
    if (node.type && GROUP_COLORS[node.type]) return GROUP_COLORS[node.type];
    return '#94A3B8';
}

function getTypeLabel(type) {
    return TYPE_LABELS[type] || type || '未知';
}

// ── Cytoscape 样式表 ──

const CY_STYLESHEET = [
    {
        selector: 'node',
        style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'color': '#E2E8F0',
            'font-size': '10px',
            'font-family': 'Inter, system-ui, sans-serif',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 6,
            'text-max-width': '120px',
            'text-wrap': 'ellipsis',
            'width': 'mapData(importance, 0, 100, 24, 48)',
            'height': 'mapData(importance, 0, 100, 24, 48)',
            'border-width': 2,
            'border-color': 'data(color)',
            'border-opacity': 0.4,
            'shape': 'ellipse',
            'transition-property': 'background-color, border-color, width, height',
            'transition-duration': 200,
        },
    },
    {
        selector: 'node:selected',
        style: {
            'border-width': 3,
            'border-color': '#FFFFFF',
            'border-opacity': 0.9,
            'shadow-blur': 16,
            'shadow-color': 'data(color)',
            'shadow-opacity': 0.5,
            'shadow-offset-x': 0,
            'shadow-offset-y': 0,
        },
    },
    {
        selector: 'node.highlighted',
        style: {
            'border-width': 3,
            'border-color': '#FFFFFF',
            'border-opacity': 0.9,
            'z-index': 9999,
        },
    },
    {
        selector: 'node.dimmed',
        style: {
            'opacity': 0.15,
        },
    },
    {
        selector: 'node.found',
        style: {
            'border-width': 3,
            'border-color': '#F59E0B',
            'border-opacity': 1,
            'shadow-blur': 12,
            'shadow-color': '#F59E0B',
            'shadow-opacity': 0.6,
        },
    },
    {
        selector: 'edge',
        style: {
            'width': 1.2,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.7,
            'curve-style': 'bezier',
            'label': 'data(label)',
            'color': '#64748B',
            'font-size': '8px',
            'text-rotation': 'autorotate',
            'text-margin-y': -4,
            'opacity': 0.6,
            'transition-property': 'line-color, target-arrow-color, opacity, width',
            'transition-duration': 200,
        },
    },
    {
        selector: 'edge.dimmed',
        style: {
            'opacity': 0.05,
        },
    },
    {
        selector: 'edge.highlighted',
        style: {
            'width': 2.5,
            'line-color': '#E2E8F0',
            'target-arrow-color': '#E2E8F0',
            'opacity': 0.9,
            'z-index': 9998,
        },
    },
];

// ── 图例分组提取 ──

function extractLegendGroups(nodes) {
    const seen = new Set();
    const groups = [];
    for (const n of nodes) {
        const g = n.group || n.type;
        if (!g || seen.has(g)) continue;
        seen.add(g);
        groups.push({ name: g, color: getNodeColor(n) });
    }
    return groups;
}

// ── Vue 组件 ──

registerGlobalComponent({
    name: 'KnowledgeGraphViewer',
    html: '/src/views/story/components/knowledgeGraphViewer/template.html',
    css: '/src/views/story/components/knowledgeGraphViewer/index.css',
    props: {
        graphData:      { type: Object, default: () => ({ nodes: [], edges: [] }) },
        title:          { type: String, default: '知识图谱' },
        height:         { type: Number, default: 0 },
        highlightFile:  { type: String, default: '' },
    },
    emits: ['close', 'node-click'],
    data() {
        return {
            cy: null,
            searchQuery: '',
            showLabels: true,
            selectedNode: null,
            resizeObserver: null,
        };
    },
    computed: {
        legendGroups() {
            return extractLegendGroups(this.graphData?.nodes || []);
        },
    },
    watch: {
        graphData: {
            deep: true,
            handler() {
                this.$nextTick(() => this.initCy());
            },
        },
        highlightFile: {
            handler(file) {
                if (file && this.cy) this._highlightFileNode(file);
            },
        },
    },
    methods: {
        /* ── 初始化 Cytoscape ── */

        initCy() {
            if (typeof cytoscape === 'undefined') {
                console.warn('[KG] Cytoscape.js 未加载');
                return;
            }

            // 销毁旧实例
            if (this.cy) {
                this.cy.destroy();
                this.cy = null;
            }

            const container = this.$refs.cyContainer;
            if (!container) return;

            const nodes = (this.graphData?.nodes || []).map(n => ({
                data: {
                    id: n.id,
                    label: n.label || n.id,
                    color: getNodeColor(n),
                    group: n.group || n.type || '',
                    type: n.type || '',
                    description: n.description || '',
                    file: n.file || '',
                    functions: (n.keyFunctions || []).join(', '),
                    riskLevel: n.riskLevel || '',
                    mdFiles: n.mdFiles ? JSON.stringify(n.mdFiles) : '',
                    importance: (n.riskLevel && n.riskLevel.includes('🔴')) ? 80 :
                               (n.riskLevel && n.riskLevel.includes('🟡')) ? 50 : 30,
                },
            }));

            const edges = (this.graphData?.edges || []).map(e => ({
                data: {
                    id: `${e.source}_${e.relation}_${e.target}`,
                    source: e.source,
                    target: e.target,
                    label: e.label || '',
                    relation: e.relation || '',
                },
            }));

            const cy = cytoscape({
                container,
                elements: { nodes, edges },
                style: CY_STYLESHEET,
                layout: { name: 'preset' },
                minZoom: 0.1,
                maxZoom: 3,
                wheelSensitivity: 0.3,
                autoungrabify: false,
                autounselectify: false,
            });

            this.cy = cy;
            this._bindCyEvents(cy);
            this._runDagreLayout(cy);
            this._setupResizeObserver(container);
        },

        /* ── 布局（dagre 分层布局，对标 Understand-Anything）── */

        _runDagreLayout(cy) {
            const layouts = [
                {
                    name: 'dagre',
                    rankDir: 'TB',
                    spacingFactor: 1.4,
                    nodeDimensionsIncludeLabels: true,
                    animate: true,
                    animationDuration: 400,
                    animationEasing: 'ease-out',
                    fit: true,
                    padding: 40,
                },
                {
                    name: 'breadthfirst',
                    directed: true,
                    spacingFactor: 1.3,
                    animate: true,
                    animationDuration: 400,
                    fit: true,
                    padding: 40,
                },
                {
                    name: 'cose',
                    animate: true,
                    animationDuration: 500,
                    fit: true,
                    padding: 40,
                    nodeRepulsion: 8000,
                    idealEdgeLength: 120,
                    gravity: 0.3,
                },
                {
                    name: 'grid',
                    animate: false,
                    fit: true,
                    padding: 40,
                },
            ];

            for (const opts of layouts) {
                try {
                    cy.layout(opts).run();
                    return; // 成功后退出
                } catch (e) {
                    console.warn(`[KG] 布局 "${opts.name}" 失败，尝试下一个:`, e.message || e);
                }
            }
        },

        /* ── 事件绑定 ── */

        _bindCyEvents(cy) {
            const container = this.$refs.cyContainer;

            // 点击节点
            cy.on('tap', 'node', (evt) => {
                const node = evt.target;
                this._selectNode(node, cy);
            });

            // 点击空白取消选中
            cy.on('tap', (evt) => {
                if (evt.target === cy) {
                    cy.elements().removeClass('highlighted dimmed');
                    this.selectedNode = null;
                }
            });

            // 悬浮效果
            cy.on('mouseover', 'node', (evt) => {
                const node = evt.target;
                cy.nodes().not(node).addClass('dimmed');
                cy.edges().addClass('dimmed');
                node.connectedEdges().removeClass('dimmed').addClass('highlighted');
                node.connectedEdges().connectedNodes().removeClass('dimmed');
                node.addClass('highlighted');
                if (container) container.style.cursor = 'pointer';
            });

            cy.on('mouseout', 'node', () => {
                cy.elements().removeClass('highlighted dimmed');
                if (container) container.style.cursor = '';
            });
        },

        _selectNode(node, cy) {
            cy.elements().removeClass('highlighted dimmed found');
            node.addClass('highlighted');
            node.connectedEdges().removeClass('dimmed').addClass('highlighted');
            node.connectedEdges().connectedNodes().removeClass('dimmed');
            cy.elements().difference(node.connectedEdges()).difference(node.connectedEdges().connectedNodes()).difference(node).addClass('dimmed');

            const data = node.data();
            let mdFilesParsed = [];
            try {
                if (data.mdFiles) {
                    mdFilesParsed = typeof data.mdFiles === 'string' ? JSON.parse(data.mdFiles) : data.mdFiles;
                }
            } catch (_) { mdFilesParsed = []; }

            this.selectedNode = {
                _label: data.label,
                _color: data.color,
                _typeLabel: getTypeLabel(data.type),
                _type: data.type,
                _group: data.group,
                _description: data.description,
                _file: data.file,
                _functions: data.functions,
                _riskLevel: data.riskLevel,
                _edgeCount: node.connectedEdges().length,
                _mdFiles: mdFilesParsed,
            };

            // 通知父组件节点被点击
            this.$emit('node-click', {
                id: data.id,
                label: data.label,
                type: data.type,
                group: data.group,
                file: data.file,
                description: data.description,
                mdFiles: mdFilesParsed,
            });
        },

        /* ── 搜索 ── */

        onSearch() {
            const cy = this.cy;
            if (!cy) return;
            const q = (this.searchQuery || '').trim().toLowerCase();

            cy.elements().removeClass('found dimmed highlighted');

            if (!q) {
                this.selectedNode = null;
                return;
            }

            const found = cy.nodes().filter(n => {
                const data = n.data();
                return (data.label || '').toLowerCase().includes(q) ||
                       (data.id || '').toLowerCase().includes(q) ||
                       (data.file || '').toLowerCase().includes(q) ||
                       (data.description || '').toLowerCase().includes(q);
            });

            if (found.length > 0) {
                found.addClass('found');
                cy.nodes().not(found).addClass('dimmed');
                cy.edges().addClass('dimmed');
                found.connectedEdges().removeClass('dimmed');
                if (found.length === 1) {
                    this._selectNode(found.first(), cy);
                } else if (found.length <= 20) {
                    cy.fit(found, 60);
                }
            } else {
                cy.nodes().addClass('dimmed');
                cy.edges().addClass('dimmed');
            }
        },

        clearSearch() {
            this.searchQuery = '';
            if (this.cy) {
                this.cy.elements().removeClass('found dimmed highlighted');
                this.cy.fit(undefined, 40);
            }
            this.selectedNode = null;
        },

        /* ── 文件联动 ── */

        _highlightFileNode(file) {
            if (!this.cy || !file) return;
            const cy = this.cy;
            // 查找 file 字段匹配的节点
            const match = cy.nodes().filter(n => {
                const nf = (n.data('file') || '').replace(/\\/g, '/');
                const f = file.replace(/\\/g, '/');
                return nf && (nf === f || nf.endsWith(f) || f.endsWith(nf) || nf.includes(f) || f.includes(nf));
            });
            if (match.length > 0) {
                const node = match.first();
                cy.elements().removeClass('highlighted dimmed found');
                node.addClass('found');
                cy.animate({ center: { eles: node }, zoom: 1.2 }, { duration: 400 });
                this._selectNode(node, cy);
            }
        },

        highlightNodeByFile(file) {
            this._highlightFileNode(file);
        },

        /**
         * 根据节点 ID 列表高亮多个节点
         * 用于 MD 文件 → 图谱节点联动
         * @param {string[]} nodeIds
         */
        highlightNodesByIds(nodeIds) {
            if (!this.cy || !Array.isArray(nodeIds) || nodeIds.length === 0) return;
            const cy = this.cy;
            cy.elements().removeClass('highlighted dimmed found');

            const idSet = new Set(nodeIds);
            const matched = cy.nodes().filter(n => idSet.has(n.data('id')));

            if (matched.length === 0) return;

            if (matched.length === 1) {
                // 单个节点：选中并居中
                const node = matched.first();
                node.addClass('found');
                cy.animate({ center: { eles: node }, zoom: 1.2 }, { duration: 400 });
                this._selectNode(node, cy);
            } else {
                // 多个节点：全部高亮，其余 dim，自适应视图
                matched.addClass('found');
                cy.nodes().not(matched).addClass('dimmed');
                cy.edges().addClass('dimmed');
                matched.connectedEdges().removeClass('dimmed').addClass('highlighted');
                cy.fit(matched, 60);
                this.selectedNode = null;
            }
        },

        /**
         * 高亮关联到指定 MD 文件的节点（通过 mdFiles 数据字段匹配）
         * @param {string} mdFileName - MD 文件名
         */
        highlightNodesByMdFile(mdFileName) {
            if (!this.cy || !mdFileName) return;
            const cy = this.cy;
            cy.elements().removeClass('highlighted dimmed found');

            const matched = cy.nodes().filter(n => {
                const mdFiles = n.data('mdFiles');
                if (!mdFiles) return false;
                try {
                    const mf = typeof mdFiles === 'string' ? JSON.parse(mdFiles) : mdFiles;
                    if (!Array.isArray(mf)) return false;
                    return mf.some(m => {
                        const f = m.file || '';
                        return f === mdFileName || f.includes(mdFileName) || mdFileName.includes(f);
                    });
                } catch (_) { return false; }
            });

            if (matched.length === 0) return;

            matched.addClass('found');
            cy.nodes().not(matched).addClass('dimmed');
            cy.edges().addClass('dimmed');
            matched.connectedEdges().removeClass('dimmed').addClass('highlighted');
            if (matched.length <= 10) {
                cy.fit(matched, 60);
            }
            this.selectedNode = null;
        },

        /* ── 视图控制 ── */

        fitGraph() {
            if (this.cy) {
                this.cy.fit(undefined, 40);
                this.selectedNode = null;
                this.cy.elements().removeClass('highlighted dimmed found');
            }
        },

        resetLayout() {
            if (this.cy) {
                this._runDagreLayout(this.cy);
                this.selectedNode = null;
                this.cy.elements().removeClass('highlighted dimmed found');
            }
        },

        zoomIn() {
            if (this.cy) this.cy.zoom({ level: this.cy.zoom() * 1.2, renderedPosition: { x: 0, y: 0 } });
        },

        zoomOut() {
            if (this.cy) this.cy.zoom({ level: this.cy.zoom() * 0.8, renderedPosition: { x: 0, y: 0 } });
        },

        toggleLabels() {
            this.showLabels = !this.showLabels;
            if (this.cy) {
                this.cy.style().selector('node').style('label', this.showLabels ? 'data(label)' : '').update();
            }
        },

        /* ── Resize ── */

        _setupResizeObserver(container) {
            if (this.resizeObserver) this.resizeObserver.disconnect();
            this.resizeObserver = new ResizeObserver(() => {
                if (this.cy) {
                    this.cy.resize();
                    this.cy.fit(undefined, 40);
                }
            });
            this.resizeObserver.observe(container);
        },

        cleanup() {
            if (this.resizeObserver) this.resizeObserver.disconnect();
            if (this.cy) { this.cy.destroy(); this.cy = null; }
        },
    },
    mounted() {
        this.$nextTick(() => this.initCy());
    },
    beforeUnmount() {
        this.cleanup();
    },
});
