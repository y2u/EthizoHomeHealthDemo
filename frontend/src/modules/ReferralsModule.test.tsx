import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEthizoAppController } from '../hooks/useEthizoAppController'
import { renderApp } from '../test/testUtils'
import { ReferralsModule } from './ReferralsModule'

function Harness() {
  const controller = useEthizoAppController()
  return <ReferralsModule controller={controller} />
}

describe('ReferralsModule', () => {
  it('renders referral queue', () => {
    renderApp(<Harness />)
    expect(screen.getAllByText('Referral Queue').length).toBeGreaterThan(0)
  })
})
