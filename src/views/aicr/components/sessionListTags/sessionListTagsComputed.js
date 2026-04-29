const sessionListTagsComputed = {
    filteredTags() {
        let tags = this.allTags || [];

        if (this.tagFilterSearchKeyword) {
            const keyword = this.tagFilterSearchKeyword.toLowerCase();
            tags = tags.filter(tag => tag.toLowerCase().includes(keyword));
        }

        return tags.sort((a, b) => {
            const isSelectedA = this.selectedTags && this.selectedTags.includes(a);
            const isSelectedB = this.selectedTags && this.selectedTags.includes(b);
            if (isSelectedA !== isSelectedB) return isSelectedA ? -1 : 1;

            const countA = this.tagCounts && this.tagCounts.counts ? (this.tagCounts.counts[a] || 0) : 0;
            const countB = this.tagCounts && this.tagCounts.counts ? (this.tagCounts.counts[b] || 0) : 0;
            if (countA !== countB) return countB - countA;

            return a.localeCompare(b, 'zh-CN');
        });
    },
    visibleTags() {
        if (this.tagFilterExpanded || this.tagFilterSearchKeyword) {
            return this.filteredTags;
        }
        return this.filteredTags.slice(0, this.tagFilterVisibleCount || 8);
    },
    hasMoreTags() {
        return this.filteredTags.length > (this.tagFilterVisibleCount || 8);
    }
};

export { sessionListTagsComputed };
