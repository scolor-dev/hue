import type { HueSettings } from './types'
import { defaultSettings } from './types'

const BASE = '/api'

export async function fetchSettings(): Promise<HueSettings> {
  try {
    const res = await fetch(`${BASE}/settings`)
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch {
    return { ...defaultSettings }
  }
}

export async function saveSettings(s: HueSettings): Promise<void> {
  await fetch(`${BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(s),
  })
}
