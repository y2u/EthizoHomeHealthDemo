import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEthizoAppController } from '../hooks/useEthizoAppController'
import { renderApp } from '../test/testUtils'
import { AdminModule } from './AdminModule'

function Harness() {
  const controller = useEthizoAppController()
  return <AdminModule controller={controller} />
}

describe('AdminModule', () => {
  it('renders survey readiness dashboard', () => {
    renderApp(<Harness />)
    expect(screen.getByText('Survey Readiness Dashboard')).toBeInTheDocument()
  })
})
