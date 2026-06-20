import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEthizoAppController } from '../hooks/useEthizoAppController'
import { renderApp } from '../test/testUtils'
import { EpisodesModule } from './EpisodesModule'

function Harness() {
  const controller = useEthizoAppController()
  return <EpisodesModule controller={controller} />
}

describe('EpisodesModule', () => {
  it('renders episode workspace', () => {
    renderApp(<Harness />)
    expect(screen.getByText('Episode Workspace')).toBeInTheDocument()
  })
})
