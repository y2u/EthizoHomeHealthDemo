import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEthizoAppController } from '../hooks/useEthizoAppController'
import { renderApp } from '../test/testUtils'
import { OverviewModule } from './OverviewModule'

function Harness() {
  const controller = useEthizoAppController()
  return <OverviewModule controller={controller} />
}

describe('OverviewModule', () => {
  it('renders workflow snapshot', () => {
    renderApp(<Harness />)
    expect(screen.getByText('Workflow Snapshot')).toBeInTheDocument()
  })
})
