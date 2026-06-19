import { afterEach, describe, expect, it } from 'vitest'
import { addOfflineAction, loadOfflineQueue, removeOfflineAction } from './offlineQueue'

describe('offlineQueue', () => {
  afterEach(() => localStorage.clear())

  it('adds and removes queued clinician actions', () => {
    addOfflineAction({
      id: 'a1',
      action: 'check-in',
      visitId: 1,
      payload: { ok: true },
      createdAt: '2026-04-19T09:00:00Z',
    })
    expect(loadOfflineQueue()).toHaveLength(1)
    removeOfflineAction('a1')
    expect(loadOfflineQueue()).toHaveLength(0)
  })
})
