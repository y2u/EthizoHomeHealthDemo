import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderApp } from '../../test/testUtils'
import {
  EmptyState,
  FieldNote,
  FormGrid,
  Input,
  KeyValue,
  MetricCard,
  Modal,
  Panel,
  Select,
  StatusLight,
  TaskOwnershipEditor,
  TextArea,
  WizardSteps,
  WorkflowTabs,
  WorkspaceHeader,
} from './Panel'

describe('shared UI components', () => {
  it('renders Panel title and subtitle', () => {
    renderApp(
      <>
        <Panel title="Clinical dashboard" subtitle="Review the active episode" tone="soft" density="compact">
          <p>Panel content</p>
        </Panel>
        <WorkspaceHeader
          eyebrow="Clinical"
          title="Workspace heading"
          subtitle="Header subtitle"
          meta={<span>Meta item</span>}
          actions={<button type="button">Header action</button>}
        >
          <span>Header child</span>
        </WorkspaceHeader>
      </>,
    )

    expect(screen.getByRole('heading', { name: 'Clinical dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Review the active episode')).toBeInTheDocument()
    expect(screen.getByText('Workspace heading')).toBeInTheDocument()
    expect(screen.getByText('Meta item')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Header action' })).toBeInTheDocument()
    expect(screen.getByText('Header child')).toBeInTheDocument()
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

  it('renders an open modal and closes from backdrop or close button', () => {
    const handleClose = vi.fn()

    renderApp(
      <Modal open title="Admission details" onClose={handleClose} size="xl">
        <p>Visible workspace</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog', { name: 'Admission details' })).toBeInTheDocument()
    expect(screen.getByText('Visible workspace')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(handleClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Visible workspace'))
    expect(handleClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('presentation'))
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('renders Input with an accessible label and emits change values', () => {
    const handleChange = vi.fn()

    const handleTextAreaChange = vi.fn()

    renderApp(
      <FormGrid>
        <Input label="Patient name" value="Ada Lovelace" onChange={handleChange} />
        <TextArea label="Clinical note" value="Stable" onChange={handleTextAreaChange} />
      </FormGrid>,
    )

    const input = screen.getByLabelText('Patient name')
    expect(input).toHaveValue('Ada Lovelace')

    fireEvent.change(input, { target: { value: 'Grace Hopper' } })
    fireEvent.change(screen.getByLabelText('Clinical note'), { target: { value: 'Improving' } })

    expect(handleChange).toHaveBeenCalledWith('Grace Hopper')
    expect(handleTextAreaChange).toHaveBeenCalledWith('Improving')
  })

  it('renders MetricCard label and value and Select options accessibly', () => {
    const handleChange = vi.fn()

    renderApp(
      <>
        <MetricCard label="Open QA" value={7} variant="spotlight" />
        <StatusLight label="Connectivity" value="Online" tone="success" />
        <StatusLight label="Sync" value="Offline" tone="error" compact />
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
    expect(screen.getByTitle('Connectivity: Online')).toBeInTheDocument()
    expect(screen.getByTitle('Sync: Offline')).toBeInTheDocument()

    const select = screen.getByLabelText('Owner role')
    expect(select).toHaveValue('QA')
    expect(screen.getByRole('option', { name: 'Clinical' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'QA' })).toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'Clinical' } })

    expect(handleChange).toHaveBeenCalledWith('Clinical')
  })

  it('renders tabs, wizard steps, key values, notes, and empty states', () => {
    const handleTabChange = vi.fn()
    const handleStepChange = vi.fn()

    renderApp(
      <>
        <WorkflowTabs
          activeTab="clinical"
          onChange={handleTabChange}
          tabs={[
            { label: 'Clinical', value: 'clinical' },
            { label: 'Review', value: 'review' },
          ]}
        />
        <WizardSteps
          activeStep="identity"
          onChange={handleStepChange}
          steps={[
            { label: 'Identity', value: 'identity' },
            { label: 'Coverage', value: 'coverage' },
          ]}
        />
        <KeyValue label="Episode status" value="Active" />
        <FieldNote text="A quiet helper note." />
        <EmptyState text="No records yet." />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Review' }))
    fireEvent.click(screen.getByRole('button', { name: /Coverage/ }))

    expect(handleTabChange).toHaveBeenCalledWith('review')
    expect(handleStepChange).toHaveBeenCalledWith('coverage')
    expect(screen.getByText('Episode status')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('A quiet helper note.')).toBeInTheDocument()
    expect(screen.getByText('No records yet.')).toBeInTheDocument()
  })

  it('renders QA task ownership controls and history actions', () => {
    const handleRoleChange = vi.fn()
    const handleUserChange = vi.fn()
    const handleNoteChange = vi.fn()
    const handleSave = vi.fn()
    const handleAssign = vi.fn()
    const handleClear = vi.fn()
    const handleEscalate = vi.fn()

    renderApp(
      <TaskOwnershipEditor
        task={{
          id: 10,
          episode_id: 1,
          task_type: 'order_followup',
          priority: 'high',
          status: 'open',
          title: 'Order follow-up',
          assigned_role: 'QA',
          assigned_user_name: 'Quinn QA Reviewer',
          escalation_note: 'Call physician office.',
          last_escalated_at: '2026-04-29 10:00:00',
          assignment_history: [
            { action: 'assigned', by: 'System', from: 'Unassigned', to: 'QA' },
            { action: 'escalated', by: 'Quinn', owner: 'QA', note: 'Second request.' },
            { action: 'updated' },
          ],
        }}
        draft={{
          assigned_role: 'QA',
          assigned_user_name: 'Quinn QA Reviewer',
          escalation_note: 'Follow up today.',
        }}
        onRoleChange={handleRoleChange}
        onUserChange={handleUserChange}
        onEscalationNoteChange={handleNoteChange}
        onSave={handleSave}
        onAssignToMe={handleAssign}
        onClear={handleClear}
        onEscalate={handleEscalate}
      />,
    )

    fireEvent.change(screen.getByLabelText('Owner role'), { target: { value: 'Billing' } })
    fireEvent.change(screen.getByLabelText('Assigned person'), { target: { value: 'Bianca Billing' } })
    fireEvent.change(screen.getByLabelText('Escalation note'), { target: { value: 'Escalated again.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save owner' }))
    fireEvent.click(screen.getByRole('button', { name: 'Assign to me' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    fireEvent.click(screen.getByRole('button', { name: 'Escalate' }))

    expect(handleRoleChange).toHaveBeenCalledWith('Billing')
    expect(handleUserChange).toHaveBeenCalledWith('Bianca Billing')
    expect(handleNoteChange).toHaveBeenCalledWith('Escalated again.')
    expect(handleSave).toHaveBeenCalled()
    expect(handleAssign).toHaveBeenCalled()
    expect(handleClear).toHaveBeenCalled()
    expect(handleEscalate).toHaveBeenCalled()
    expect(screen.getByText(/Latest escalation note/)).toBeInTheDocument()
    expect(screen.getByText(/Last escalated/)).toBeInTheDocument()
    expect(screen.getByText(/Assigned by System/)).toBeInTheDocument()
    expect(screen.getByText(/Escalated by Quinn/)).toBeInTheDocument()
    expect(screen.getByText('Updated.')).toBeInTheDocument()
  })
})
