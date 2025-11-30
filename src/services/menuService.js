const helpLink = 'https://www.longnguctimmach.com/p/huong-dan-su-dung-phan-mem-quan-ly.html'

const schema = [
  {
    id: 'menu-file',
    domId: 'menu-file',
    labelKey: 'menuFile',
    icon: '📁',
    className: 'app-menu__root app-menu__root--file',
    children: [
      {
        id: 'menu-file-refresh',
        domId: 'menu-file-refresh',
        labelKey: 'menuFileRefresh',
        descriptionKey: 'menuFileRefreshDesc',
        action: 'refresh-protocols',
        icon: '🔄',
        className: 'app-menu__item app-menu__item--refresh'
      },
      {
        id: 'menu-file-google-sheet',
        domId: 'menu-file-google-sheet',
        labelKey: 'menuFileGoogleSheet',
        descriptionKey: 'menuFileGoogleSheetDesc',
        action: 'open-data-settings',
        icon: '🛠️',
        className: 'app-menu__item app-menu__item--settings'
      },
      {
        id: 'menu-file-edit-sheet',
        domId: 'menu-file-edit-sheet',
        labelKey: 'menuFileEditSheet',
        descriptionKey: 'menuFileEditSheetDesc',
        action: 'open-edit-sheet',
        icon: '✏️',
        className: 'app-menu__item app-menu__item--link'
      },
      {
        id: 'menu-file-new-design',
        domId: 'menu-file-new-design',
        labelKey: 'menuFileNewDesign',
        descriptionKey: 'menuFileNewDesignDesc',
        action: 'open-new-design',
        icon: '🧪',
        className: 'app-menu__item app-menu__item--soon'
      }
    ]
  },
  {
    id: 'menu-edit',
    domId: 'menu-edit',
    labelKey: 'menuEdit',
    icon: '✂️',
    className: 'app-menu__root app-menu__root--edit',
    children: [
      {
        id: 'menu-edit-copy',
        domId: 'menu-edit-copy',
        labelKey: 'menuEditCopy',
        descriptionKey: 'menuEditCopyDesc',
        action: 'copy-protocol',
        icon: '📋',
        shortcut: 'Ctrl + C',
        className: 'app-menu__item app-menu__item--copy'
      },
      {
        id: 'menu-edit-copy-source',
        domId: 'menu-edit-copy-source',
        labelKey: 'menuEditCopySource',
        descriptionKey: 'menuEditCopySourceDesc',
        action: 'copy-source',
        icon: '💾',
        shortcut: 'Ctrl + Alt + C',
        className: 'app-menu__item app-menu__item--copy-source'
      },
      {
        id: 'menu-edit-clear-drafts',
        domId: 'menu-edit-clear-drafts',
        labelKey: 'menuEditClearDrafts',
        descriptionKey: 'menuEditClearDraftsDesc',
        action: 'clear-drafts',
        icon: '🧹',
        className: 'app-menu__item app-menu__item--danger'
      },
      {
        id: 'menu-edit-reset-all',
        domId: 'menu-edit-reset-all',
        labelKey: 'menuEditResetAll',
        descriptionKey: 'menuEditResetAllDesc',
        action: 'reset-app',
        icon: '⚠️',
        className: 'app-menu__item app-menu__item--danger'
      }
    ]
  },
  {
    id: 'menu-tools',
    domId: 'menu-tools',
    labelKey: 'menuTools',
    icon: '🛎️',
    className: 'app-menu__root app-menu__root--tools',
    children: [
      {
        id: 'menu-tools-language',
        domId: 'menu-tools-language',
        labelKey: 'menuToolsLanguage',
        descriptionKey: 'menuToolsLanguageDesc',
        action: 'open-language-dialog',
        icon: '🌐',
        className: 'app-menu__item app-menu__item--language'
      },
      {
        id: 'menu-tools-font-size',
        domId: 'menu-tools-font-size',
        labelKey: 'menuToolsFontSize',
        descriptionKey: 'menuToolsFontSizeDesc',
        action: 'open-fontsize-dialog',
        icon: '🔠',
        className: 'app-menu__item app-menu__item--font'
      }
    ]
  },
  {
    id: 'menu-help',
    domId: 'menu-help',
    labelKey: 'menuHelp',
    icon: '💡',
    className: 'app-menu__root app-menu__root--help',
    children: [
      {
        id: 'menu-help-user-guide',
        domId: 'menu-help-user-guide',
        labelKey: 'menuHelpGuide',
        descriptionKey: 'menuHelpGuideDesc',
        action: 'open-help-link',
        icon: '📘',
        className: 'app-menu__item app-menu__item--link'
      },
      {
        id: 'menu-help-shortcuts',
        domId: 'menu-help-shortcuts',
        labelKey: 'menuHelpShortcuts',
        descriptionKey: 'menuHelpShortcutsDesc',
        action: 'open-shortcuts-dialog',
        icon: '⌨️',
        className: 'app-menu__item app-menu__item--shortcuts'
      },
      {
        id: 'menu-help-author',
        domId: 'menu-help-author',
        labelKey: 'menuHelpAuthor',
        descriptionKey: 'menuHelpAuthorDesc',
        action: 'open-author-dialog',
        icon: '👤',
        className: 'app-menu__item app-menu__item--author'
      }
    ]
  }
]

function translateNode(node, translate) {
  const t = typeof translate === 'function' ? translate : (key) => key
  return {
    ...node,
    label: node.labelKey ? t(node.labelKey) : node.label,
    description: node.descriptionKey ? t(node.descriptionKey) : node.description,
    children: Array.isArray(node.children)
      ? node.children.map((child) => translateNode(child, translate))
      : node.children
  }
}

function getMenuTree(translate) {
  return schema.map((item) => translateNode(item, translate))
}

function getHelpLink() {
  return helpLink
}

export default {
  getMenuTree,
  getHelpLink
}
