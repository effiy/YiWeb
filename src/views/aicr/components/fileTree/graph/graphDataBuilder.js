/**
 * 图谱数据构建器 — 从 sessions + fileTree 构建多实体知识图谱
 *
 * 参考 Understand-Anything 多实体知识图谱设计：
 *   8 种实体类型 → PROJECT, STORY, SCENARIO, SKILL, TEMPLATE, RULE, AGENT, FILE
 *   4 种关系类型 → contains, uses, implements, references
 *   场景 Markdown 解析 → 提取 sourceFiles 并创建 references 边
 */

import { ENTITY, ENTITY_SIZES, RENDER } from './constants.js';

let _scenarioCache = new Map();

export function clearScenarioCache() {
    _scenarioCache = new Map();
}

export function getScenarioCache() {
    return _scenarioCache;
}

/**
 * 解析场景 Markdown 内容
 */
function parseScenarioMarkdown(mdContent, storyName, fileName) {
    const result = { name: fileName || '', description: '', storyName: storyName || '', sourceFiles: [] };
    if (!mdContent) return result;

    const titleMatch = mdContent.match(/^#\s*场景(\d+)\s*[·•]\s*(.+?)(?:\s*[|—].*)?$/m);
    if (titleMatch) {
        result.name = '场景' + titleMatch[1] + '·' + (titleMatch[2] || '').trim();
    }

    const s1Start = mdContent.indexOf('## §1');
    const s2Start = mdContent.indexOf('## §2');
    if (s1Start !== -1) {
        const s1Block = mdContent.substring(s1Start, s2Start !== -1 ? s2Start : mdContent.length);
        const opFlowMatch = s1Block.match(/\*\*操作流\*\*\s*\|\s*(.+?)(?:\n|$)/);
        if (opFlowMatch) {
            result.description = opFlowMatch[1].trim();
        } else {
            const rowMatch = s1Block.match(/^\|(.+)\|$/m);
            if (rowMatch) {
                const cells = rowMatch[1].split('|').map(c => c.trim());
                const descCell = cells.find(c => c && !/[\*\-]{2,}/.test(c) && c.length > 10);
                if (descCell) result.description = descCell;
            }
        }
    }

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
}

/**
 * 构建图谱数据
 *
 * @param {Object} ctx - 上下文对象，需提供:
 *   ctx.sessions - 会话数据数组
 *   ctx.tree - 完整文件树
 *   ctx.sortedTree - 当前筛选后的文件树
 *   ctx.selectedTags - 选中项目标签
 *   ctx.selectedSkillTags - 选中技能标签
 *   ctx.selectedTemplateTags - 选中模板标签
 *   ctx.selectedRuleTags - 选中规则标签
 *   ctx.selectedAgentTags - 选中智能体标签
 *   ctx.W - 画布宽度
 *   ctx.H - 画布高度
 * @param {Object} [oldPositions] - 重建时保留的旧节点位置 Map<key, {x, y, vx, vy}>
 * @returns {{ nodes: Array, edges: Array, nodeMap: Map }}
 */
export function buildGraphData(ctx, oldPositions) {
    const E = ENTITY;
    const SZ = ENTITY_SIZES;
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();
    const W = ctx.W, H = ctx.H;

    const ekey = (type, name) => type + '::' + name;

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
            filterMatch: true,
            _visible: true,
            _childrenKeys: []
        };
        // 恢复旧位置
        if (oldPositions && oldPositions.has(key)) {
            const prev = oldPositions.get(key);
            n.x = prev.x; n.y = prev.y;
            n.vx = prev.vx; n.vy = prev.vy;
        }
        nodes.push(n);
        nodeMap.set(key, n);
        return n;
    };

    const seenEdges = new Set();
    const addEdge = (fromKey, toKey, relType) => {
        const pair = fromKey < toKey ? fromKey + '|||' + toKey : toKey + '|||' + fromKey;
        if (seenEdges.has(pair)) return;
        seenEdges.add(pair);
        edges.push({ from: fromKey, to: toKey, type: relType, _visible: true });
    };

    // ── 1. 从 sessions 提取项目、故事、技能等元数据 ──
    const sessions = ctx.sessions || [];
    const projectMap = new Map();
    const storyProjectMap = new Map();

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

        // 提取故事名
        const parts = fp.split('/');
        const panelIdx = parts.indexOf('故事任务面板');
        if (panelIdx !== -1 && panelIdx + 1 < parts.length) {
            const storyName = parts[panelIdx + 1];
            pdata.storyNames.add(storyName);
            storyProjectMap.set(storyName, proj);

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

        const skillMatch = fp.match(/\/skills\/([^/]+)/);
        if (skillMatch) pdata.skillNames.add(skillMatch[1]);

        const tmplMatch = fp.match(/\/templates\/([^/]+)/);
        if (tmplMatch) pdata.templateNames.add(tmplMatch[1]);

        const ruleMatch = fp.match(/\/rules\/([^/]+)/);
        if (ruleMatch) pdata.ruleNames.add(ruleMatch[1]);

        const agentMatch = fp.match(/\/agents\/([^/]+)/);
        if (agentMatch) pdata.agentNames.add(agentMatch[1]);

        if (s.key != null) pdata.fileKeys.add(String(s.key));
    }

    // ── 2. 确定筛选状态 ──
    const selectedProjects = new Set(ctx.selectedTags || []);
    const selectedSkills = new Set(ctx.selectedSkillTags || []);
    const selectedTemplates = new Set(ctx.selectedTemplateTags || []);
    const selectedRules = new Set(ctx.selectedRuleTags || []);
    const selectedAgents = new Set(ctx.selectedAgentTags || []);
    const hasProjectFilter = selectedProjects.size > 0;
    const hasSkillFilter = selectedSkills.size > 0;
    const hasTemplateFilter = selectedTemplates.size > 0;
    const hasRuleFilter = selectedRules.size > 0;
    const hasAgentFilter = selectedAgents.size > 0;
    const hasAnyFilter = hasProjectFilter || hasSkillFilter || hasTemplateFilter ||
        hasRuleFilter || hasAgentFilter;

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
    collectFileKeys(ctx.sortedTree);

    // ── 3. 构建实体节点 ──
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

        for (const storyName of pdata.storyNames) {
            const sn = addEntityNode(E.STORY, storyName, { project: projName });
            addEdge(pn.key, sn.key, 'contains');
        }

        for (const skillName of pdata.skillNames) {
            const skn = addEntityNode(E.SKILL, skillName, { project: projName });
            addEdge(pn.key, skn.key, 'uses');
        }

        for (const tmplName of pdata.templateNames) {
            const tn = addEntityNode(E.TEMPLATE, tmplName, { project: projName });
            addEdge(pn.key, tn.key, 'uses');
        }

        for (const ruleName of pdata.ruleNames) {
            const rn = addEntityNode(E.RULE, ruleName, { project: projName });
            addEdge(pn.key, rn.key, 'uses');
        }

        for (const agentName of pdata.agentNames) {
            const an = addEntityNode(E.AGENT, agentName, { project: projName });
            addEdge(pn.key, an.key, 'uses');
        }

        // 项目 → 故事 → 场景
        for (const storyName of pdata.storyNames) {
            const storyKey = ekey(E.STORY, storyName);
            if (!nodeMap.has(storyKey)) continue;

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

            // 自动发现场景文件
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
                                _scenarioCache.set(scNode.key, {
                                    name: scName,
                                    description: item.pageDescription || '',
                                    storyName,
                                    sourceFiles: []
                                });
                            }
                        }
                    } else if (item.type === 'folder' && item.children) {
                        collectScenarioFiles(item.children);
                    }
                }
            };
            collectScenarioFiles(ctx.tree);
        }
    }

    // ── 4. 构建文件节点 ──
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
    collectAllFiles(ctx.tree);

    const fileItemsToRender = [];
    const addedFileKeys = new Set();
    for (const item of allFileItems) {
        if (visibleFileKeys.has(item.key) && !addedFileKeys.has(item.key)) {
            fileItemsToRender.push(item);
            addedFileKeys.add(item.key);
        }
    }
    for (const item of allFileItems) {
        if (fileItemsToRender.length >= RENDER.MAX_FILE_NODES) break;
        if (!addedFileKeys.has(item.key)) {
            fileItemsToRender.push(item);
            addedFileKeys.add(item.key);
        }
    }

    for (const item of fileItemsToRender) {
        const ext = item.extension || (item.name && item.name.includes('.') ? item.name.split('.').pop().toLowerCase() : '');
        const tags = item.tags || [];
        const projFromTag = tags[0] || '';
        const fileNode = addEntityNode(E.FILE, item.key, {
            treeItem: item,
            name: item.name,
            size: item.size,
            lastModified: item.lastModified,
            pageDescription: item.pageDescription || '',
            extension: ext,
            project: projFromTag
        });
        fileNode.name = item.name || '';
        fileNode.size = item.size;
        fileNode.lastModified = item.lastModified;
        fileNode.pageDescription = item.pageDescription || '';
        fileNode.extension = ext;
        fileNode.treeKey = item.key;
        fileNode._projectName = projFromTag;

        if (projFromTag && projectMap.has(projFromTag)) {
            const projKey = ekey(E.PROJECT, projFromTag);
            if (nodeMap.has(projKey)) {
                addEdge(projKey, fileNode.key, 'contains');
            }
        }
    }

    // ── 5. 补充跨实体边 ──
    for (const s of sessions) {
        const fp = s.file_path || s.filePath || '';
        if (!fp || s.key == null) continue;
        const fileKey = ekey(E.FILE, String(s.key));
        const fileNode = nodeMap.get(fileKey);
        if (!fileNode) continue;

        const skillMatch = fp.match(/\/skills\/([^/]+)/);
        if (skillMatch) {
            const skKey = ekey(E.SKILL, skillMatch[1]);
            if (nodeMap.has(skKey)) addEdge(skKey, fileKey, 'implements');
        }

        const tmplMatch = fp.match(/\/templates\/([^/]+)/);
        if (tmplMatch) {
            const tKey = ekey(E.TEMPLATE, tmplMatch[1]);
            if (nodeMap.has(tKey)) addEdge(tKey, fileKey, 'implements');
        }

        const ruleMatch = fp.match(/\/rules\/([^/]+)/);
        if (ruleMatch) {
            const rKey = ekey(E.RULE, ruleMatch[1]);
            if (nodeMap.has(rKey)) addEdge(rKey, fileKey, 'implements');
        }

        const agentMatch = fp.match(/\/agents\/([^/]+)/);
        if (agentMatch) {
            const aKey = ekey(E.AGENT, agentMatch[1]);
            if (nodeMap.has(aKey)) addEdge(aKey, fileKey, 'implements');
        }
    }

    // ── 6. 应用筛选标记（直接匹配，各维度交叉约束） ──
    if (hasAnyFilter) {
        // 收集选中项目下的所有故事名，用于故事→文件的关联
        const selectedStoryNames = new Set();
        for (const [projName, pdata] of projectMap) {
            if (selectedProjects.has(projName)) {
                for (const sn of pdata.storyNames) selectedStoryNames.add(sn);
            }
        }

        for (const n of nodes) {
            let match = true;
            const projName = n.extra && n.extra.project;
            if (n.entityType === E.PROJECT) {
                match = !hasProjectFilter || selectedProjects.has(n.name);
            } else if (n.entityType === E.STORY) {
                match = !hasProjectFilter || (projName && selectedProjects.has(projName));
            } else if (n.entityType === E.SCENARIO) {
                match = !hasProjectFilter || (projName && selectedProjects.has(projName));
            } else if (n.entityType === E.SKILL) {
                if (hasSkillFilter) match = selectedSkills.has(n.name);
                if (match && hasProjectFilter) match = projName && selectedProjects.has(projName);
            } else if (n.entityType === E.TEMPLATE) {
                if (hasTemplateFilter) match = selectedTemplates.has(n.name);
                if (match && hasProjectFilter) match = projName && selectedProjects.has(projName);
            } else if (n.entityType === E.RULE) {
                if (hasRuleFilter) match = selectedRules.has(n.name);
                if (match && hasProjectFilter) match = projName && selectedProjects.has(projName);
            } else if (n.entityType === E.AGENT) {
                if (hasAgentFilter) match = selectedAgents.has(n.name);
                if (match && hasProjectFilter) match = projName && selectedProjects.has(projName);
            } else if (n.entityType === E.FILE) {
                if (hasProjectFilter) {
                    match = projName && selectedProjects.has(projName);
                }
                if (match) {
                    match = visibleFileKeys.has(n.treeKey) ||
                        visibleFileKeys.has(n.key.replace(E.FILE + '::', ''));
                }
            }
            n.filterMatch = match;
        }
    }

    // ── 7. 解析场景 Markdown 建立场景→文件 references 边 ──
    for (const n of nodes) {
        if (n.entityType !== E.SCENARIO) continue;
        const cached = _scenarioCache.get(n.key);
        const pageDesc = (n.extra && n.extra.pageDescription) || (cached && cached.description) || '';
        const storyName = (n.extra && n.extra.story) || (cached && cached.storyName) || '';
        const scName = n.name || (cached && cached.name) || '';

        let parsed = null;
        if (pageDesc && pageDesc.length > 10) {
            parsed = parseScenarioMarkdown(pageDesc, storyName, scName);
        }

        if (parsed) {
            _scenarioCache.set(n.key, parsed);
            n.extra.pageDescription = parsed.description || pageDesc;
            for (const sf of parsed.sourceFiles) {
                if (!sf.file) continue;
                let matched = false;
                for (const fn of nodes) {
                    if (fn.entityType !== E.FILE) continue;
                    const fp = fn.treeKey || fn.key || '';
                    if (fp.includes(sf.file) || sf.file.includes(fp.split('/').pop() || '')) {
                        addEdge(n.key, fn.key, 'references');
                        matched = true;
                    }
                }
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

    // ── 8. 建立父子关系映射 ──
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

    return { nodes, edges, nodeMap };
}

/**
 * 根据筛选条件重新计算 filterMatch 并更新可见性
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Map} nodeMap
 * @param {Object} ctx
 * @param {number} currentLayer
 */
export function recomputeFilterHighlight(nodes, edges, nodeMap, ctx) {
    const E = ENTITY;
    const selectedProjects = new Set(ctx.selectedTags || []);
    const selectedSkills = new Set(ctx.selectedSkillTags || []);
    const selectedTemplates = new Set(ctx.selectedTemplateTags || []);
    const selectedRules = new Set(ctx.selectedRuleTags || []);
    const selectedAgents = new Set(ctx.selectedAgentTags || []);
    const hasAny = selectedProjects.size > 0 || selectedSkills.size > 0 ||
        selectedTemplates.size > 0 || selectedRules.size > 0 || selectedAgents.size > 0;

    const hasProjectFilter = selectedProjects.size > 0;
    const hasSkillFilter = selectedSkills.size > 0;
    const hasTemplateFilter = selectedTemplates.size > 0;
    const hasRuleFilter = selectedRules.size > 0;
    const hasAgentFilter = selectedAgents.size > 0;

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
    collectFileKeys(ctx.sortedTree);

    if (!hasAny) {
        for (const n of nodes) {
            if (n.entityType === E.FILE) {
                n.filterMatch = visibleFileKeys.has(n.treeKey) ||
                    visibleFileKeys.has(n.key.replace(E.FILE + '::', ''));
            } else {
                n.filterMatch = true;
            }
        }
    } else {
        for (const n of nodes) {
            let match = true;
            const projName = n.extra && n.extra.project;
            if (n.entityType === E.PROJECT) {
                match = !hasProjectFilter || selectedProjects.has(n.name);
            } else if (n.entityType === E.STORY) {
                match = !hasProjectFilter || (projName && selectedProjects.has(projName));
            } else if (n.entityType === E.SCENARIO) {
                match = !hasProjectFilter || (projName && selectedProjects.has(projName));
            } else if (n.entityType === E.SKILL) {
                if (hasSkillFilter) match = selectedSkills.has(n.name);
                if (match && hasProjectFilter) match = projName && selectedProjects.has(projName);
            } else if (n.entityType === E.TEMPLATE) {
                if (hasTemplateFilter) match = selectedTemplates.has(n.name);
                if (match && hasProjectFilter) match = projName && selectedProjects.has(projName);
            } else if (n.entityType === E.RULE) {
                if (hasRuleFilter) match = selectedRules.has(n.name);
                if (match && hasProjectFilter) match = projName && selectedProjects.has(projName);
            } else if (n.entityType === E.AGENT) {
                if (hasAgentFilter) match = selectedAgents.has(n.name);
                if (match && hasProjectFilter) match = projName && selectedProjects.has(projName);
            } else if (n.entityType === E.FILE) {
                const fileProj = (n.extra && n.extra.treeItem && n.extra.treeItem.tags && n.extra.treeItem.tags[0]) || '';
                if (hasProjectFilter) {
                    match = (fileProj && selectedProjects.has(fileProj)) ||
                        (projName && selectedProjects.has(projName));
                }
                if (match) {
                    match = visibleFileKeys.has(n.treeKey) ||
                        visibleFileKeys.has(n.key.replace(E.FILE + '::', ''));
                }
            }
            n.filterMatch = match;
        }
    }
}

/**
 * 根据图层 + 筛选重新计算节点/边可见性
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @param {Map} nodeMap
 * @param {number} currentLayer
 * @param {boolean} hasAnyFilter
 * @param {Set} allowedTypes
 */
export function recomputeVisibility(nodes, edges, nodeMap, currentLayer, hasAnyFilter, allowedTypes) {
    for (const n of nodes) {
        n._visible = allowedTypes.has(n.entityType);
    }

    if (hasAnyFilter) {
        for (const n of nodes) {
            if (n._visible && n.filterMatch === false) {
                n._visible = false;
            }
        }
    }

    for (const e of edges) {
        const a = nodeMap.get(e.from);
        const b = nodeMap.get(e.to);
        e._visible = a && a._visible && b && b._visible;
    }
}
