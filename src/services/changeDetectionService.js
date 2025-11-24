
/**
 * Service to handle content change detection.
 * Centralizes logic for comparing protocol content to determine "edited" state.
 */

export default {
    /**
     * Compare current source with original source to check for changes.
     * Normalizes line endings but PRESERVES selection markers (*) to ensure
     * option changes are detected as edits.
     * 
     * @param {string} currentSource 
     * @param {string} originalSource 
     * @returns {boolean} true if content is different
     */
    isContentChanged(currentSource, originalSource) {
        const normCurrent = this.normalize(currentSource)
        const normOriginal = this.normalize(originalSource)
        return normCurrent !== normOriginal
    },

    normalize(str) {
        if (str == null) return ''
        // Normalize newlines to \n and trim whitespace
        // We DO NOT remove * here because we want selection changes to count as edits.
        return String(str).replace(/\r\n/g, '\n').trim()
    }
}
