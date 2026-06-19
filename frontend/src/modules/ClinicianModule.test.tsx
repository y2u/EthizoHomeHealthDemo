import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEthizoAppController } from '../hooks/useEthizoAppController'
import { renderApp } from '../test/testUtils'
import { ClinicianModule } from './ClinicianModule'

function Harness() {
  const controller = useEthizoAppController()
  return <ClinicianModule controller={controller} />
}

describe('ClinicianModule', () => {
  it('renders clinician visit workspace', () => {
    renderApp(<Harness />)
    expect(screen.getByText('Clinician Workspace')).toBeInTheDocument()
  })
})
