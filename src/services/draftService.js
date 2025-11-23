const STORAGE_PREFIX = 'protocol_draft_';

export default {
    saveDraft(id, content) {
        if (!id) return;
        try {
            localStorage.setItem(STORAGE_PREFIX + id, content);
        } catch (e) {
            console.error('Failed to save draft', e);
        }
    },

    getDraft(id) {
        if (!id) return null;
        return localStorage.getItem(STORAGE_PREFIX + id);
    },

    clearDraft(id) {
        if (!id) return;
        localStorage.removeItem(STORAGE_PREFIX + id);
    },

    hasDraft(id) {
        if (!id) return false;
        return !!localStorage.getItem(STORAGE_PREFIX + id);
    }
}
