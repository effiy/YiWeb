/**
 * 故事任务面板 - 编辑方法
 *
 * 提供故事描述和依赖关系的编辑保存能力。
 * 描述更新走 update_document API，依赖更新走 update_document 写回 JSON 文档。
 */

import { logInfo, logWarn, logError } from '/cdn/utils/core/log.js';
import { enrichDocumentPageDescription } from '/src/core/services/modules/documentEnrichService.js';
import { postData } from '/src/core/services/modules/crud.js';

const SERVICE_MODULE = 'services.database.data_service';
const DEPS_FILE_PATH = '故事任务面板/story-deps.json';

export function createStoryEditMethods(state) {

    async function updateStoryDescription(name, description) {
        state.saving.value = true;
        try {
            const filePath = `故事任务面板/${name}/${name}-故事任务.md`;
            await enrichDocumentPageDescription({
                cname: 'sessions',
                filePath,
                pageDescription: description,
            });
            // 同步更新内存中的 stories
            const story = state.stories.value.find(s => s.name === name);
            if (story) {
                story.description = description;
            }
            logInfo('[故事面板] 描述已更新:', name);
            return true;
        } catch (err) {
            logError('[故事面板] 描述更新失败:', err);
            return false;
        } finally {
            state.saving.value = false;
        }
    }

    async function updateStoryDeps(updatedStories) {
        state.saving.value = true;
        try {
            const payload = {
                module_name: SERVICE_MODULE,
                method_name: 'update_document',
                parameters: {
                    cname: 'sessions',
                    file_path: DEPS_FILE_PATH,
                    data: {
                        content: JSON.stringify({
                            version: '1.0.0',
                            generatedAt: new Date().toISOString().slice(0, 10),
                            stories: updatedStories,
                        }),
                    },
                },
            };
            const url = `${window.API_URL}/`;
            await postData(url, payload);
            // 同步内存
            state.storyDeps.value = updatedStories;
            logInfo('[故事面板] 依赖数据已更新');
            return true;
        } catch (err) {
            logError('[故事面板] 依赖更新失败:', err);
            return false;
        } finally {
            state.saving.value = false;
        }
    }

    async function addDependency(storyDir, depDirectory, relation) {
        const stories = JSON.parse(JSON.stringify(state.storyDeps.value));
        const story = stories.find(s => s.directory === storyDir);
        if (!story) {
            logWarn('[故事面板] 未找到故事:', storyDir);
            return false;
        }
        if (!Array.isArray(story.dependsOn)) {
            story.dependsOn = [];
        }
        if (story.dependsOn.some(d => d.directory === depDirectory)) {
            logWarn('[故事面板] 依赖已存在:', depDirectory);
            return false;
        }
        story.dependsOn.push({ directory: depDirectory, relation });
        const ok = await updateStoryDeps(stories);
        if (ok) {
            await state.fetchStories();
        }
        return ok;
    }

    async function removeDependency(storyDir, depDirectory) {
        const stories = JSON.parse(JSON.stringify(state.storyDeps.value));
        const story = stories.find(s => s.directory === storyDir);
        if (!story || !Array.isArray(story.dependsOn)) return false;
        story.dependsOn = story.dependsOn.filter(d => d.directory !== depDirectory);
        const ok = await updateStoryDeps(stories);
        if (ok) {
            await state.fetchStories();
        }
        return ok;
    }

    return {
        updateStoryDescription,
        updateStoryDeps,
        addDependency,
        removeDependency,
    };
}
