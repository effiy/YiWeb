function formatFileSizeCompact(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    let idx = 0;
    let val = n;
    while (val >= k && idx < units.length - 1) {
        val = val / k;
        idx++;
    }
    const decimals = idx === 0 ? 0 : 1;
    const factor = Math.pow(10, decimals);
    const truncated = Math.floor(val * factor) / factor;
    return decimals === 0 ? `${truncated}${units[idx]}` : `${truncated.toFixed(decimals)}${units[idx]}`;
}

const sortFileTreeItems = (items) => {
    if (!Array.isArray(items)) return items;

    return items.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') {
            return -1;
        }
        if (a.type !== 'folder' && b.type === 'folder') {
            return 1;
        }

        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB, 'zh-CN');
    });
};

const sortFileTreeRecursively = (node) => {
    if (!node || typeof node !== 'object') return node;

    if (node.type === 'folder' && Array.isArray(node.children)) {
        node.children = sortFileTreeItems(node.children);
        node.children.forEach(child => sortFileTreeRecursively(child));
    }

    return node;
};

export { formatFileSizeCompact, sortFileTreeItems, sortFileTreeRecursively };
