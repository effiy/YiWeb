export function buildFileTreeFromSessions(allSessions) {
    const sessionsList = Array.isArray(allSessions) ? allSessions.filter(Boolean) : [];
    const treeRoots = [];
    const sessionPathMap = new Map();

    const normalizeFolders = (tags) => {
        if (!Array.isArray(tags)) return [];
        return tags
            .map(t => (t == null ? '' : String(t)).trim())
            .filter(t => t.length > 0 && String(t).toLowerCase() !== 'default');
    };

    const sanitizeFileName = (name) => String(name || '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/\//g, '-');

    const sortable = sessionsList.map((s) => {
        const folderParts = normalizeFolders(s.tags);
        const folderKey = folderParts.join('/');
        const baseName = sanitizeFileName(s.title || s.pageTitle || 'Untitled');
        const stableId = String(s.key || '');
        return { s, folderParts, folderKey, baseName, stableId };
    });

    sortable.sort((a, b) => {
        const folderCmp = (a.folderKey || '').localeCompare(b.folderKey || '', 'zh-CN');
        if (folderCmp !== 0) return folderCmp;
        const nameCmp = (a.baseName || '').localeCompare(b.baseName || '', 'zh-CN');
        if (nameCmp !== 0) return nameCmp;
        return (a.stableId || '').localeCompare(b.stableId || '', 'zh-CN');
    });

    for (const item of sortable) {
        const session = item.s;
        const pathTags = item.folderParts;

        let currentLevelChildren = treeRoots;
        let currentPath = '';

        for (const folderNameRaw of pathTags) {
            const folderName = String(folderNameRaw || '').trim();
            if (!folderName) continue;

            currentPath = currentPath ? currentPath + '/' + folderName : folderName;
            let folderNode = currentLevelChildren.find(c => c.name === folderName && c.type === 'folder');
            if (!folderNode) {
                folderNode = {
                    key: currentPath,
                    name: folderName,
                    type: 'folder',
                    children: []
                };
                currentLevelChildren.push(folderNode);
            }
            currentLevelChildren = folderNode.children;
        }

        const fileName = item.baseName;

        let uniqueName = fileName;
        let counter = 1;
        while (currentLevelChildren.find(c => c.name === uniqueName && c.type === 'file')) {
            uniqueName = `${fileName} (${counter})`;
            counter++;
        }

        const fileKey = currentPath ? currentPath + '/' + uniqueName : uniqueName;
        const sessionKey = session.key;

        currentLevelChildren.push({
            key: fileKey,
            name: uniqueName,
            type: 'file',
            content: '',
            size: 0,
            lastModified: session.updatedAt || session.createdAt,
            sessionKey: sessionKey
        });

        if (sessionKey != null) {
            sessionPathMap.set(String(sessionKey), fileKey);
        }
    }

    const sortNodes = (nodes) => {
        if (!nodes) return;
        nodes.sort((a, b) => {
            if (a.type === b.type) return (a.name || '').localeCompare(b.name || '', 'zh-CN');
            return a.type === 'folder' ? -1 : 1;
        });
        nodes.forEach(n => {
            if (n.children) sortNodes(n.children);
        });
    };
    sortNodes(treeRoots);

    const allFolders = new Set();
    const collectFolders = (nodes) => {
        if (!nodes) return;
        if (Array.isArray(nodes)) nodes.forEach(n => collectFolders(n));
        else {
            if (nodes.type === 'folder') {
                allFolders.add(nodes.key);
                if (nodes.children) collectFolders(nodes.children);
            }
        }
    };
    collectFolders(treeRoots);

    return { treeRoots, expandedFolders: allFolders, sessionPathMap };
}
