import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEthizoAppController } from '../hooks/useEthizoAppController'
import { renderApp } from '../test/testUtils'
import { BillingModule } from './BillingModule'

function Harness() {
  const controller = useEthizoAppController()
  return <BillingModule controller={controller} />
}

describe('BillingModule', () => {
  it('renders billing workspace', () => {
    renderApp(<Harness />)
    expect(screen.getByText('Billing Workspace')).toBeInTheDocument()
  })
})
