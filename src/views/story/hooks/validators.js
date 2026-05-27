/**
 * 故事任务面板 - 数据验证与约束
 *
 * 集中管理所有数据校验逻辑：API 响应、故事对象、筛选输入、排序参数。
 * 所有验证函数提供安全默认值，避免畸形数据导致运行时错误。
 */

import { logWarn } from '/cdn/utils/core/log.js';

/* ---- 常量 ---- */

export const VALID_STATUSES = ['planning', 'design', 'develop', 'testing', 'operations'];

export const VALID_DOC_TYPES = ['story_task', 'scenario', 'implementation', 'test_report', 'retrospective'];

export const VALID_SORT_FIELDS = ['lastModified', 'createdAt', 'name', 'status', 'healthScore', 'fileCount'];

export const VALID_VIEW_MODES = ['board', 'cards', 'list'];

const MAX_SEARCH_LENGTH = 200;
const MAX_TAG_LENGTH = 500;
const MAX_STORIES = 5000;

/* ---- API 响应校验 ---- */

export function validateApiResponse(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('API 响应格式无效：非对象');
    }
    const list = data?.data?.list || data?.list;
    if (!Array.isArray(list)) {
        throw new Error('API 响应格式无效：缺少 list 数组');
    }
    return list;
}

export function validateApiItem(item, index) {
    if (!item || typeof item !== 'object') {
        logWarn(`[数据验证] 跳过无效记录 #${index}：非对象`);
        return false;
    }
    if (!item.file_path || typeof item.file_path !== 'string') {
        logWarn(`[数据验证] 跳过无效记录 #${index}：缺少 file_path`);
        return false;
    }
    return true;
}

/* ---- 故事对象校验 ---- */

const STORY_DEFAULTS = {
    name: '',
    status: 'planning',
    description: '',
    nextStep: '',
    projectTags: [],
    healthScore: 0,
    fileCount: 0,
    files: [],
    lastModified: 0,
    createdAt: 0,
};

export function validateStory(story) {
    for (const [key, defaultValue] of Object.entries(STORY_DEFAULTS)) {
        if (story[key] === undefined || story[key] === null) {
            story[key] = defaultValue;
        }
    }

    if (!Array.isArray(story.projectTags)) story.projectTags = [];
    if (!Array.isArray(story.files)) story.files = [];
    if (typeof story.healthScore !== 'number') story.healthScore = Number(story.healthScore) || 0;
    if (typeof story.fileCount !== 'number') story.fileCount = Number(story.fileCount) || 0;
    if (typeof story.lastModified !== 'number') story.lastModified = Number(story.lastModified) || 0;
    if (typeof story.createdAt !== 'number') story.createdAt = Number(story.createdAt) || 0;
    if (typeof story.name !== 'string') story.name = String(story.name || '');
    if (typeof story.status !== 'string' || !VALID_STATUSES.includes(story.status)) {
        story.status = 'planning';
    }
    if (typeof story.description !== 'string') story.description = String(story.description || '');
    if (typeof story.nextStep !== 'string') story.nextStep = String(story.nextStep || '');

    story.healthScore = Math.max(0, Math.min(5, Math.floor(story.healthScore)));
    story.fileCount = Math.max(0, story.fileCount);

    for (const f of story.files) {
        if (!f.fileName) f.fileName = (f.filePath || '').split('/').pop() || '';
        if (typeof f.updatedAt !== 'number') f.updatedAt = Number(f.updatedAt) || 0;
        if (typeof f.createdAt !== 'number') f.createdAt = Number(f.createdAt) || 0;
        if (typeof f.title !== 'string') f.title = '';
    }

    return story;
}

/* ---- 数据量约束 ---- */

export function validateStoryCount(stories, max) {
    if (!Array.isArray(stories)) return [];
    if (stories.length > max) {
        logWarn(`[数据验证] 故事数量 ${stories.length} 超过上限 ${max}，截断处理`);
        return stories.slice(0, max);
    }
    return stories;
}

/* ---- 筛选输入校验 ---- */

export function validateTag(tag) {
    if (typeof tag !== 'string') return false;
    if (tag.length === 0 || tag.length > MAX_TAG_LENGTH) return false;
    return true;
}

export function validateDocType(docType) {
    if (typeof docType !== 'string' || docType.length === 0) return false;
    return true;
}

export function sanitizeSearchQuery(query) {
    if (typeof query !== 'string') return '';
    return query.trim().slice(0, MAX_SEARCH_LENGTH);
}

/* ---- UI 参数校验 ---- */

export function validateSortField(field) {
    return VALID_SORT_FIELDS.includes(field) ? field : 'lastModified';
}

export function validateSortDirection(dir) {
    return dir === 'asc' ? 'asc' : 'desc';
}

export function validateViewMode(mode) {
    return VALID_VIEW_MODES.includes(mode) ? mode : 'board';
}

/* ---- 文件名校验 ---- */

export function validateFileName(fileName) {
    if (typeof fileName !== 'string') return false;
    if (fileName.length === 0 || fileName.length > 500) return false;
    if (fileName.includes('..') || fileName.includes('\0')) return false;
    return true;
}
