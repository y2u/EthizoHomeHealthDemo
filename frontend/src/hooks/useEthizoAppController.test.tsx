import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEthizoAppController } from './useEthizoAppController'

describe('useEthizoAppController', () => {
  it('starts unauthenticated before entering a workspace', () => {
    const { result } = renderHook(() => useEthizoAppController())
    expect(result.current.user).toBeNull()
    expect(result.current.loginForm.email).toBe('intake@harborhomehealth.test')
  })

  it('can enter demo mode with demo dataset and module navigation', () => {
    const { result } = renderHook(() => useEthizoAppController())
    act(() => result.current.enterDemoMode())
    expect(result.current.mode).toBe('demo')
    expect(result.current.dataset.patients.length).toBeGreaterThan(0)
    act(() => result.current.setActiveModule('Patients'))
    expect(result.current.activeModule).toBe('Patients')
  })
})
