import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls patient compliance document endpoint with auth', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    } as Response)

    await api.patientComplianceDocuments('token-1', 7)

    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toMatch(/\/patients\/7\/compliance-documents$/)
    expect(options).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-1' }),
      }),
    )
  })

  it('throws API error messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: 'Denied' }),
    } as Response)

    await expect(api.claims('bad-token')).rejects.toThrow('Denied')
  })
})
