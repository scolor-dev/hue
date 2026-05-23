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
}

export type SettingsSection = 'general' | 'display' | 'preview' | 'about'
