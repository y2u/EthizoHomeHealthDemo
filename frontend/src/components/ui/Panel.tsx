import type { ReactNode } from 'react'
import { formatTaskAssignee, labelizeValue } from '../../domain/formatters'
import type { QaTask } from '../../lib/types'

export interface QaAssignmentDraft {
  assigned_role: string
  assigned_user_name: string
  escalation_note: string
}

export function MetricCard({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: number
  variant?: 'default' | 'spotlight'
}) {
  return (
    <div className={variant === 'spotlight' ? 'metric-card metric-card-spotlight' : 'metric-card'}>
      <span title={label}>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function WorkspaceHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  children,
}: {
  eyebrow?: string
  title: string
  subtitle: string
  meta?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="workspace-header">
      <div className="workspace-header-top">
        <div className="workspace-header-main">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h3>{title}</h3>
          <p className="muted">{subtitle}</p>
        </div>
        {actions ? <div className="workspace-header-actions">{actions}</div> : null}
      </div>
      {meta ? <div className="workspace-header-meta">{meta}</div> : null}
      {children ? <div className="workspace-header-bottom">{children}</div> : null}
    </section>
  )
}

export function StatusLight({
  label,
  value,
  tone,
  compact = false,
}: {
  label: string
  value: string
  tone: 'success' | 'error'
  compact?: boolean
}) {
  return (
    <div className={compact ? 'status-light compact' : 'status-light'} title={`${label}: ${value}`}>
      <span className={`status-light-dot ${tone}`} />
      {!compact ? (
        <span className="status-light-text">
          <strong>{label}</strong>
          <span>{value}</span>
        </span>
      ) : null}
    </div>
  )
}

export function Panel({
  title,
  subtitle,
  children,
  tone = 'default',
  density = 'default',
}: {
  title: string
  subtitle: string
  children: ReactNode
  tone?: 'default' | 'emphasis' | 'soft'
  density?: 'default' | 'compact'
}) {
  const panelClassName = ['panel']

  if (tone !== 'default') {
    panelClassName.push(`panel-${tone}`)
  }

  if (density === 'compact') {
    panelClassName.push('panel-compact')
  }

  return (
    <section className={panelClassName.join(' ')}>
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export function Modal({
  open,
  title,
  children,
  onClose,
  size = 'lg',
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'lg' | 'xl'
}) {
  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={size === 'xl' ? 'modal-shell modal-shell-xl' : 'modal-shell'}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-copy">
            <p className="eyebrow">Focused workspace</p>
            <h3>{title}</h3>
            <p className="muted">Complete the details below without losing your place in the main workspace.</p>
          </div>
          <button className="secondary-button modal-close-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  )
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="form-grid">{children}</div>
}

export function WorkflowTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: Array<{ label: string; value: string }>
  activeTab: string
  onChange: (value: string) => void
}) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`tab-button ${activeTab === tab.value ? 'active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function WizardSteps({
  steps,
  activeStep,
  onChange,
}: {
  steps: Array<{ label: string; value: string }>
  activeStep: string
  onChange: (value: string) => void
}) {
  return (
    <div className="wizard-steps">
      {steps.map((step, index) => (
        <button
          key={step.value}
          type="button"
          className={`wizard-step ${activeStep === step.value ? 'active' : ''}`}
          onClick={() => onChange(step.value)}
        >
          <span className="wizard-step-index">{index + 1}</span>
          <span>{step.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
    </label>
  )
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TaskOwnershipEditor({
  task,
  draft,
  onRoleChange,
  onUserChange,
  onEscalationNoteChange,
  onSave,
  onAssignToMe,
  onClear,
  onEscalate,
}: {
  task: QaTask
  draft: QaAssignmentDraft
  onRoleChange: (value: string) => void
  onUserChange: (value: string) => void
  onEscalationNoteChange: (value: string) => void
  onSave: () => void
  onAssignToMe: () => void
  onClear: () => void
  onEscalate: () => void
}) {
  return (
    <div className="stack">
      <FormGrid>
        <Select
          label="Owner role"
          value={draft.assigned_role}
          onChange={onRoleChange}
          options={[
            { label: 'Unassigned', value: '' },
            { label: 'Intake', value: 'Intake' },
            { label: 'Clinical', value: 'Clinical' },
            { label: 'Clinician', value: 'Clinician' },
            { label: 'QA', value: 'QA' },
            { label: 'Billing', value: 'Billing' },
            { label: 'Admin', value: 'Admin' },
          ]}
        />
        <Input label="Assigned person" value={draft.assigned_user_name} onChange={onUserChange} />
      </FormGrid>
      <TextArea label="Escalation note" value={draft.escalation_note} onChange={onEscalationNoteChange} />
      <div className="row-actions wrap">
        <span className="pill neutral">{formatTaskAssignee(task)}</span>
        <button className="secondary-button" type="button" onClick={onSave}>
          Save owner
        </button>
        <button className="secondary-button" type="button" onClick={onAssignToMe}>
          Assign to me
        </button>
        <button className="secondary-button" type="button" onClick={onClear}>
          Clear
        </button>
        <button className="secondary-button" type="button" onClick={onEscalate}>
          Escalate
        </button>
      </div>
      {task.escalation_note ? <FieldNote text={`Latest escalation note: ${task.escalation_note}`} /> : null}
      {task.last_escalated_at ? <FieldNote text={`Last escalated: ${task.last_escalated_at}`} /> : null}
      {task.assignment_history && task.assignment_history.length > 0 ? (
        <div className="stack">
          <strong>Ownership history</strong>
          {task.assignment_history
            .slice()
            .reverse()
            .slice(0, 3)
            .map((entry, index) => (
              <div key={`${task.id}-history-${index}`} className="timeline-step">
                {formatQaTaskHistoryEntry(entry)}
              </div>
            ))}
        </div>
      ) : null}
    </div>
  )
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="key-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return <p className="muted">{text}</p>
}

export function FieldNote({ text }: { text: string }) {
  return <p className="muted">{text}</p>
}

function formatQaTaskHistoryEntry(entry: Record<string, string>) {
  const timestamp = entry.timestamp ? `${entry.timestamp}: ` : ''
  const action = labelizeValue(entry.action ?? 'updated')
  if (entry.action === 'escalated') {
    return `${timestamp}${action} by ${entry.by ?? 'System'} for ${entry.owner ?? 'the current owner'}. ${entry.note ?? ''}`.trim()
  }
  if (entry.action === 'assigned' || entry.action === 'reassigned' || entry.action === 'cleared') {
    return `${timestamp}${action} by ${entry.by ?? 'System'} from ${entry.from ?? 'Unassigned'} to ${entry.to ?? 'Unassigned'}.`.trim()
  }

  return `${timestamp}${action}.`
}
