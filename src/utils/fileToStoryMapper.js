/**
 * 文件到故事映射的全局工具
 * 可以在任何地方使用来查询文件所属的故事和场景
 */

import { getStoriesForFile, getAllStories } from '/src/views/story/utils/knowledgeGraphUtils.js';

/**
 * 查询特定文件路径所属的所有故事和场景
 * @param {string} filePath - 文件路径
 * @param {boolean} verbose - 是否输出详细日志
 * @returns {Promise<Array>} 匹配的故事场景列表
 */
export async function findStoriesForFile(filePath, verbose = false) {
    const results = await getStoriesForFile(filePath);
    
    if (verbose && results.length > 0) {
        console.log(`📁 文件 ${filePath} 属于以下故事和场景:`);
        results.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.storyName} -> ${result.scenarioName}`);
            console.log(`     场景描述: ${result.scenarioDescription}`);
            console.log(`     文件引用: ${result.fileRef.file} - ${result.fileRef.description}`);
        });
    } else if (verbose) {
        console.log(`ℹ️ 文件 ${filePath} 未找到匹配的故事或场景`);
    }
    
    return results;
}

/**
 * 获取所有已加载的故事
 * @returns {Promise<Array>} 所有故事列表
 */
export async function getAllKnowledgeGraphStories() {
    return await getAllStories();
}

/**
 * 打印所有知识图谱数据
 */
export async function printAllKnowledgeGraphs() {
    const stories = await getAllStories();
    
    console.log('📚 所有知识图谱故事:');
    stories.forEach(story => {
        console.log(`\n=== ${story.name} (${story.directory}) ===`);
        console.log(`描述: ${story.description || '无'}`);
        console.log(`场景数量: ${story.scenarios.length}`);
        
        story.scenarios.forEach((scenario, index) => {
            console.log(`  ${index + 1}. ${scenario.name}: ${scenario.sourceFiles.length} 个文件`);
        });
    });
}

/**
 * 查找包含特定文件的所有故事
 * @param {string} fileName - 文件名或部分路径
 * @returns {Promise<Array>} 匹配的结果列表
 */
export async function searchFilesInStories(fileName) {
    const stories = await getAllStories();
    const results = [];
    
    stories.forEach(story => {
        story.scenarios.forEach(scenario => {
            const matchingFiles = scenario.sourceFiles.filter(fileRef => 
                fileRef.file.includes(fileName) || fileName.includes(fileRef.file)
            );
            
            if (matchingFiles.length > 0) {
                results.push({
                    storyDirectory: story.directory,
                    storyName: story.name,
                    scenarioName: scenario.name,
                    scenarioDescription: scenario.description,
                    matchingFiles
                });
            }
        });
    });
    
    return results;
}
