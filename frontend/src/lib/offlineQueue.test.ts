import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addOfflineAction, loadOfflineQueue, removeOfflineAction } from './offlineQueue'

const STORAGE_KEY = 'hhcm-offline-queue'

describe('offlineQueue', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY))
  afterEach(() => localStorage.removeItem(STORAGE_KEY))

  it('adds and removes queued clinician actions', () => {
    addOfflineAction({
      id: 'a1',
      action: 'check-in',
      visitId: 1,
      payload: { ok: true },
      createdAt: '2026-04-19T09:00:00Z',
    })
    expect(loadOfflineQueue()).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(1)

    removeOfflineAction('a1')

    expect(loadOfflineQueue()).toHaveLength(0)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(0)
  })
})
