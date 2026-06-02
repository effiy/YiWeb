/**
 * 故事任务面板 - 知识图谱数据方法
 * 
 * 提供知识图谱数据的加载、查询和映射功能
 */

import { logInfo, logError } from '/cdn/utils/core/log.js';
import {
    getAllStories,
    getStoriesForFile,
    getStoryByDirectory,
    getKnowledgeGraphStats,
    refreshCache
} from '../utils/knowledgeGraphUtils.js';

export function createKnowledgeGraphMethods(state) {
    async function loadKnowledgeGraphData() {
        state.knowledgeGraphLoading.value = true;
        state.knowledgeGraphError.value = null;
        
        try {
            const stats = await getKnowledgeGraphStats();
            state.knowledgeGraphStats.value = stats;
            
            const allStories = await getAllStories();
            state.allStories.value = allStories;
            
            logInfo('[故事面板] 知识图谱数据已加载', stats);
        } catch (err) {
            state.knowledgeGraphError.value = err.message || '加载知识图谱数据失败';
            logError('[故事面板] 加载知识图谱数据失败:', err);
        } finally {
            state.knowledgeGraphLoading.value = false;
        }
    }

    async function findStoriesForFile(filePath) {
        if (!state.knowledgeGraphLoading.value && !state.knowledgeGraphStats.value) {
            await loadKnowledgeGraphData();
        }
        
        return await getStoriesForFile(filePath);
    }

    async function findStoryByDirectory(directory) {
        if (!state.knowledgeGraphLoading.value && !state.knowledgeGraphStats.value) {
            await loadKnowledgeGraphData();
        }
        
        return await getStoryByDirectory(directory);
    }

    async function refreshKnowledgeGraphCache() {
        state.knowledgeGraphLoading.value = true;
        state.knowledgeGraphError.value = null;

        try {
            await refreshCache();
            const stats = await getKnowledgeGraphStats();
            state.knowledgeGraphStats.value = stats;

            const allStories = await getAllStories();
            state.allStories.value = allStories;

            logInfo('[故事面板] 知识图谱缓存已刷新');
            return true;
        } catch (err) {
            state.knowledgeGraphError.value = err.message || '刷新知识图谱缓存失败';
            logError('[故事面板] 刷新知识图谱缓存失败:', err);
            return false;
        } finally {
            state.knowledgeGraphLoading.value = false;
        }
    }

    /**
     * 打开知识图谱可视化
     * @param {string} directory - 故事目录名称
     */
    async function openKnowledgeGraph(directory) {
        state.knowledgeGraphLoading.value = true;
        state.knowledgeGraphError.value = null;

        try {
            const graphPath = `/docs/故事任务面板/${directory}/知识图谱.json`;
            const response = await fetch(graphPath, { credentials: 'omit' });

            if (!response.ok) {
                throw new Error(`无法加载知识图谱: ${response.status}`);
            }

            const data = await response.json();
            const graph = data.graph || { nodes: [], edges: [] };

            state.knowledgeGraphData.value = graph;
            state.knowledgeGraphTitle.value = (data.story && data.story.name) || directory;
            state.showKnowledgeGraph.value = true;

            logInfo(`[故事面板] 已打开知识图谱: ${directory}`, {
                nodes: graph.nodes?.length || 0,
                edges: graph.edges?.length || 0,
            });
        } catch (err) {
            state.knowledgeGraphError.value = err.message || '加载知识图谱失败';
            logError('[故事面板] 打开知识图谱失败:', err);
        } finally {
            state.knowledgeGraphLoading.value = false;
        }
    }

    /**
     * 加载面板内联知识图谱（静默，不显示 loading）
     * @param {string} directory - 故事目录名称
     */
    async function loadPanelKnowledgeGraph(directory) {
        if (!directory) {
            state.panelKgGraphData.value = null;
            state.panelKgGraphTitle.value = '';
            return;
        }

        try {
            const graphPath = `/docs/故事任务面板/${directory}/知识图谱.json`;
            const response = await fetch(graphPath, { credentials: 'omit' });
            if (!response.ok) {
                state.panelKgGraphData.value = null;
                return;
            }
            const data = await response.json();
            state.panelKgGraphData.value = data.graph || { nodes: [], edges: [] };
            state.panelKgGraphTitle.value = (data.story && data.story.name) || directory;
        } catch (err) {
            state.panelKgGraphData.value = null;
        }
    },

    /**
     * 打开故事依赖关系图（从 故事依赖.json 加载）
     */
    async function openStoryDepsGraph() {
        state.knowledgeGraphLoading.value = true;
        try {
            const response = await fetch('/docs/故事任务面板/故事依赖.json', { credentials: 'omit' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            state.knowledgeGraphData.value = data.graph || { nodes: [], edges: [] };
            state.knowledgeGraphTitle.value = (data.story && data.story.name) || '故事依赖关系图';
            state.showKnowledgeGraph.value = true;
        } catch (err) {
            logError('[故事面板] 加载故事依赖图失败:', err);
        } finally {
            state.knowledgeGraphLoading.value = false;
        }
    },

    /**
     * 关闭知识图谱可视化
     */
    function closeKnowledgeGraph() {
        state.showKnowledgeGraph.value = false;
        state.knowledgeGraphData.value = { nodes: [], edges: [] };
        state.knowledgeGraphTitle.value = '';
    }

    /**
     * 根据 MD 文件名查找知识图谱中关联的所有节点
     * 实现 "点击MD文件 → 高亮图中相关节点" 联动
     * @param {string} storyDir - 故事目录名称
     * @param {string} mdFileName - MD 文件名
     * @returns {Promise<Array>} 相关节点 ID 数组
     */
    async function findNodesByMdFile(storyDir, mdFileName) {
        if (!storyDir || !mdFileName) return [];
        try {
            const { findNodesByMdFile: utilFindNodesByMdFile } = await import('../utils/knowledgeGraphUtils.js');
            const nodes = await utilFindNodesByMdFile(storyDir, mdFileName);
            return nodes;
        } catch (err) {
            logError('[故事面板] 查找 MD 文件关联节点失败:', err);
            return [];
        }
    },

    return {
        loadKnowledgeGraphData,
        findStoriesForFile,
        findStoryByDirectory,
        refreshKnowledgeGraphCache,
        openKnowledgeGraph,
        closeKnowledgeGraph,
        loadPanelKnowledgeGraph,
        openStoryDepsGraph,
        findNodesByMdFile,
    };
}
