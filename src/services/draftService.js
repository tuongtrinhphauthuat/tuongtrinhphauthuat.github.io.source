const STORAGE_PREFIX = 'protocol_draft_';

export default {
    saveDraft(id, content, title = null, originalSource = null) {
        if (!id) return;
        try {
            const data = { content, title, originalSource };
            localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save draft', e);
        }
    },

    getDraft(id) {
        if (!id) return null;
        const raw = localStorage.getItem(STORAGE_PREFIX + id);
        if (!raw) return null;
        try {
            const data = JSON.parse(raw);
            if (data && typeof data === 'object' && 'content' in data) {
                return data;
            }
            // Legacy: raw string is content
            return { content: raw, title: null };
        } catch (e) {
            // Legacy: raw string is content
            return { content: raw, title: null };
        }
    },

    clearDraft(id) {
        if (!id) return;
        localStorage.removeItem(STORAGE_PREFIX + id);
    },

    hasDraft(id) {
        if (!id) return false;
        return !!localStorage.getItem(STORAGE_PREFIX + id);
    },

    clearAllDrafts() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                keys.push(key);
            }
        }
        keys.forEach(k => localStorage.removeItem(k));
    }
}
