export type Lang = 'ja' | 'en'

export const translations = {
  ja: {
    settings: '設定',
    saved: '保存しました',
    nav: { general: '一般', display: '表示', preview: 'プレビュー', about: 'バージョン情報' },
    general: {
      title: '一般',
      language: '言語', languageDesc: 'UIの表示言語',
      confirmDelete: '削除の確認', confirmDeleteDesc: 'ファイル削除前に確認ダイアログを表示',
      showHidden: '隠しファイルの表示', showHiddenDesc: '隠し属性のファイルを表示する',
    },
    display: {
      title: '表示',
      dateFormat: '日付フォーマット', dateFormatDesc: 'ファイル一覧の更新日時の形式',
      dateTime: '日時 (2026-05-23 12:00)', dateOnly: '日付のみ (2026-05-23)', relative: '相対 (3分前)',
      showExtensions: '拡張子を表示', showExtensionsDesc: 'ファイル名に拡張子を含める',
      sortBy: 'ソート基準', sortByDesc: 'ファイル一覧の並び順',
      sortName: '名前', sortSize: 'サイズ', sortDate: '更新日時',
      sortAsc: '昇順', sortAscDesc: 'ソートの方向',
    },
    preview: {
      title: 'プレビュー',
      panelWidth: 'デフォルトパネル幅',
      thumbSize: 'サムネイルサイズ',
    },
    about: {
      title: 'バージョン情報',
      appDesc: 'AI-powered Windows ファイルマネージャー',
      stack: '技術スタック',
      roles: {
        'メイン UI': 'メイン UI',
        'ネイティブコア': 'ネイティブコア',
        'プラグイン': 'プラグイン',
        '設定 UI': '設定 UI',
        'バックエンド': 'バックエンド',
        'フロントエンド型': 'フロントエンド型',
        'リアルタイム同期': 'リアルタイム同期',
      } as Record<string, string>,
    },
  },
  en: {
    settings: 'Settings',
    saved: 'Saved',
    nav: { general: 'General', display: 'Display', preview: 'Preview', about: 'About' },
    general: {
      title: 'General',
      language: 'Language', languageDesc: 'UI display language',
      confirmDelete: 'Confirm Delete', confirmDeleteDesc: 'Show confirmation dialog before deleting files',
      showHidden: 'Show Hidden Files', showHiddenDesc: 'Show files with the hidden attribute',
    },
    display: {
      title: 'Display',
      dateFormat: 'Date Format', dateFormatDesc: 'Format for modified date in file list',
      dateTime: 'Date & Time (2026-05-23 12:00)', dateOnly: 'Date only (2026-05-23)', relative: 'Relative (3 min ago)',
      showExtensions: 'Show Extensions', showExtensionsDesc: 'Include file extension in file name',
      sortBy: 'Sort By', sortByDesc: 'Sort order for file list',
      sortName: 'Name', sortSize: 'Size', sortDate: 'Modified',
      sortAsc: 'Ascending', sortAscDesc: 'Sort direction',
    },
    preview: {
      title: 'Preview',
      panelWidth: 'Default Panel Width',
      thumbSize: 'Thumbnail Size',
    },
    about: {
      title: 'About',
      appDesc: 'AI-powered Windows File Manager',
      stack: 'Tech Stack',
      roles: {
        'メイン UI': 'Main UI',
        'ネイティブコア': 'Native Core',
        'プラグイン': 'Plugins',
        '設定 UI': 'Settings UI',
        'バックエンド': 'Backend',
        'フロントエンド型': 'Frontend Types',
        'リアルタイム同期': 'Real-time Sync',
      } as Record<string, string>,
    },
  },
} as const

export type T = typeof translations.ja
