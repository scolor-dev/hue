export interface CommandShortcut {
  id: string
  label: string
  icon: string
  command: string
  executionMode: 'current' | 'fixed'
  fixedPath: string
  promptEnabled: boolean
  promptMessage: string
  promptPlaceholder: string
}

export interface HueSettings {
  showHidden: boolean
  dateFormat: 'datetime' | 'date' | 'relative'
  previewWidth: number
  thumbSize: number
  language: string
  sortBy: 'name' | 'size' | 'date'
  sortAsc: boolean
  showExtensions: boolean
  confirmDelete: boolean
  favorites: string[]
  commandShortcuts: CommandShortcut[]
  startupMode: 'home' | 'last' | 'fixed'
  startupFixedPath: string
  lastPath: string
  clickToOpen: 'single' | 'double'
  disabledPlugins: string[]
  themePreset: string
  accentColor: string
}

export const defaultSettings: HueSettings = {
  showHidden: false,
  dateFormat: 'datetime',
  previewWidth: 220,
  thumbSize: 128,
  language: 'ja',
  sortBy: 'name',
  sortAsc: true,
  showExtensions: true,
  confirmDelete: true,
  favorites: [],
  commandShortcuts: [],
  startupMode: 'home',
  startupFixedPath: '',
  lastPath: '',
  clickToOpen: 'double',
  disabledPlugins: [],
  themePreset: 'dark',
  accentColor: '',
}

export type SettingsSection = 'general' | 'display' | 'preview' | 'shortcuts' | 'plugins' | 'keymap' | 'theme' | 'about' | 'run'
