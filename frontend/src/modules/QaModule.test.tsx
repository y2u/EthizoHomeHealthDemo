import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEthizoAppController } from '../hooks/useEthizoAppController'
import { renderApp } from '../test/testUtils'
import { QaModule } from './QaModule'

function Harness() {
  const controller = useEthizoAppController()
  return <QaModule controller={controller} />
}

describe('QaModule', () => {
  it('renders QA workspace', () => {
    renderApp(<Harness />)
    expect(screen.getByText('QA Workspace')).toBeInTheDocument()
  })
})
