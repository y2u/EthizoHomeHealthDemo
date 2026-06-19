import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderApp } from '../../test/testUtils'
import { Input, MetricCard, Modal, Panel, Select } from './Panel'

describe('shared UI components', () => {
  it('renders Panel title and subtitle', () => {
    renderApp(
      <Panel title="Clinical dashboard" subtitle="Review the active episode">
        <p>Panel content</p>
      </Panel>,
    )

    expect(screen.getByRole('heading', { name: 'Clinical dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Review the active episode')).toBeInTheDocument()
  })

  it('does not render Modal children when closed', () => {
    renderApp(
      <Modal open={false} title="Admission details" onClose={() => undefined}>
        <p>Hidden workspace</p>
      </Modal>,
    )

    expect(screen.queryByText('Hidden workspace')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders Input with an accessible label and emits change values', () => {
    const handleChange = vi.fn()

    renderApp(<Input label="Patient name" value="Ada Lovelace" onChange={handleChange} />)

    const input = screen.getByLabelText('Patient name')
    expect(input).toHaveValue('Ada Lovelace')

    fireEvent.change(input, { target: { value: 'Grace Hopper' } })

    expect(handleChange).toHaveBeenCalledWith('Grace Hopper')
  })

  it('renders MetricCard label and value and Select options accessibly', () => {
    const handleChange = vi.fn()

    renderApp(
      <>
        <MetricCard label="Open QA" value={7} />
        <Select
          label="Owner role"
          value="QA"
          onChange={handleChange}
          options={[
            { label: 'Clinical', value: 'Clinical' },
            { label: 'QA', value: 'QA' },
          ]}
        />
      </>,
    )

    expect(screen.getByText('Open QA')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()

    const select = screen.getByLabelText('Owner role')
    expect(select).toHaveValue('QA')
    expect(screen.getByRole('option', { name: 'Clinical' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'QA' })).toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'Clinical' } })

    expect(handleChange).toHaveBeenCalledWith('Clinical')
  })
})
