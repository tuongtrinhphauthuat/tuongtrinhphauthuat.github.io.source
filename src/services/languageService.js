import { ref } from 'vue';

const currentLang = ref('vi'); // Default to Vietnamese

const translations = {
    vi: {
        selectProtocol: 'Chọn một phác đồ để xem hoặc chỉnh sửa',
        resetTooltip: 'Đặt lại về mặc định — nhấp đúp để đặt lại ngay; nhấp đơn để mở xác nhận',
        toggleFullscreen: 'Chuyển đổi toàn màn hình (Ctrl+Shift+F)',
        confirmResetTitle: 'Xác nhận đặt lại',
        confirmResetMessage: 'Đặt lại phác đồ này về nội dung mặc định ban đầu? Hành động này không thể hoàn tác.',
        reset: 'Đặt lại',
        cancel: 'Hủy',
        show: 'Hiện',
        hide: 'Không hiện',
        copy: 'Sao chép',
        copySource: 'Sao chép mã nguồn',
        copied: 'Đã sao chép',
        copyError: 'Lỗi sao chép',
        sourceCopied: 'Đã sao chép mã nguồn',
        protocolCopiedToast: 'Đã sao chép phác đồ vào bộ nhớ tạm',
        sourceCopiedToast: 'Đã sao chép mã nguồn phác đồ vào bộ nhớ tạm',
        unsavedDraft: '(bản nháp chưa lưu)',
        resetToDefault: 'Đã đặt lại về mặc định',
        searchPlaceholder: 'Tìm kiếm (Dấu phẩy = OR, e.g. giáp, thùy)',
        refreshProtocols: 'Làm mới danh sách phác đồ',
        openSpreadsheet: 'Mở bảng tính để chỉnh sửa',
        settings: 'Cài đặt',
        shortcuts: 'Phím tắt',
        settingsTitle: 'Cài đặt nguồn dữ liệu',
        downloadUrl: 'URL tải xuống (XLSX)',
        editUrl: 'URL chỉnh sửa bảng tính',
        open: 'Mở',
        saveAndLoad: 'Lưu & Tải',
        settingsTip: 'Mẹo: nhấp vào trường URL để chọn tất cả văn bản để sao chép dễ dàng.',
        language: 'Ngôn ngữ',
        vietnamese: 'Tiếng Việt',
        english: 'Tiếng Anh',
        close: 'Đóng',
        shortcutCopy: 'Sao chép phác đồ hiện tại (khi không có văn bản nào được chọn)',
        shortcutCopySource: 'Sao chép mã nguồn phác đồ (văn bản nguồn thô)',
        shortcutFullscreen: 'Chuyển đổi chế độ toàn màn hình cho trình soạn thảo',
        shortcutReset: 'Nút đặt lại: Nhấp đúp để đặt lại ngay; nhấp đơn để mở hộp thoại xác nhận',
        shortcutNote: 'Lưu ý: Nếu bạn cập nhật bất kỳ phím tắt nào, hãy cập nhật thành phần này để giữ cho văn bản trợ giúp được đồng bộ.',
        loadingMessage: 'Đang tải phác đồ và phân tích nội dung…'
    },
    en: {
        selectProtocol: 'Select a protocol to view or edit',
        resetTooltip: 'Reset to default — double-click to reset immediately; single click opens confirmation',
        toggleFullscreen: 'Toggle full screen (Ctrl+Shift+F)',
        confirmResetTitle: 'Confirm reset',
        confirmResetMessage: 'Reset this protocol to its original default content? This cannot be undone.',
        reset: 'Reset',
        cancel: 'Cancel',
        show: 'Show',
        hide: 'Hide',
        copy: 'Copy',
        copySource: 'Copy source',
        copied: 'Copied',
        copyError: 'Copy error',
        sourceCopied: 'Source copied',
        protocolCopiedToast: 'Protocol copied to clipboard',
        sourceCopiedToast: 'Protocol source copied to clipboard',
        unsavedDraft: '(unsaved draft)',
        resetToDefault: 'Reset to default',
        searchPlaceholder: 'Search (Comma = OR, e.g. thyroid, lobe)',
        refreshProtocols: 'Refresh protocols',
        openSpreadsheet: 'Open spreadsheet for edit',
        settings: 'Settings',
        shortcuts: 'Shortcuts',
        settingsTitle: 'Protocol source settings',
        downloadUrl: 'Download (XLSX) URL',
        editUrl: 'Edit spreadsheet URL',
        open: 'Open',
        saveAndLoad: 'Save & Load',
        settingsTip: 'Tip: click the URL field to select all text for easy copying.',
        language: 'Language',
        vietnamese: 'Vietnamese',
        english: 'English',
        close: 'Close',
        shortcutCopy: 'Copy current protocol (when no text is selected)',
        shortcutCopySource: 'Copy protocol source (raw source text)',
        shortcutFullscreen: 'Toggle full screen mode for editor',
        shortcutReset: 'Reset button: Double-click to reset immediately; single-click opens confirmation dialog',
        shortcutNote: 'Note: If you update any shortcuts, update this component to keep the help text in sync.',
        loadingMessage: 'Loading protocols and parsing content…'
    }
};

function setLanguage(lang) {
    if (translations[lang]) {
        currentLang.value = lang;
    }
}

function t(key) {
    return translations[currentLang.value][key] || key;
}

export default {
    currentLang,
    setLanguage,
    t
};
