import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../test/testUtils'
import { useEthizoAppController } from '../hooks/useEthizoAppController'
import { PatientsModule } from './PatientsModule'

function Harness() {
  const controller = useEthizoAppController()
  return <PatientsModule controller={controller} />
}

describe('PatientsModule', () => {
  it('renders patient registry and compliance packet', () => {
    renderApp(<Harness />)
    expect(screen.getAllByText('Patient Registry').length).toBeGreaterThan(0)
    expect(screen.getByText('Patient Compliance Packet')).toBeInTheDocument()
    expect(screen.getByText('Medication and Allergy Profile')).toBeInTheDocument()
  })
})
