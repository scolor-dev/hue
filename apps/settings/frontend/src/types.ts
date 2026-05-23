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
  language: 'ja' | 'en'
  sortBy: 'name' | 'size' | 'date'
  sortAsc: boolean
  showExtensions: boolean
  confirmDelete: boolean
  favorites: string[]
  commandShortcuts: CommandShortcut[]
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
}

export type SettingsSection = 'general' | 'display' | 'preview' | 'shortcuts' | 'about'
