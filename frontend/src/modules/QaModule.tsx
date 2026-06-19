import type { ModuleProps } from './moduleTypes'
import { EmptyState, KeyValue, Panel, TaskOwnershipEditor, WorkspaceHeader } from '../components/ui'
import { formatDueAt, formatTaskAssignee, labelizeValue } from '../domain/formatters'

export function QaModule({ controller }: ModuleProps) {
  const {
    dataset,
    loadVisitDocumentationForm,
    lockVisitDocumentation,
    completeQaTask,
    assignmentDraftForTask,
    setQaAssignmentDraft,
    saveQaTaskAssignment,
    escalateQaTask,
  } = controller

  return (
    <div className="module-stack">
                <WorkspaceHeader
                  eyebrow="QA"
                  title="QA Workspace"
                  subtitle="Resolve chart review, intake, and compliance blockers before they ripple into billing."
                  meta={
                    <>
                      <span className="pill warn">{dataset.qaTasks.filter((task) => task.status === 'open').length} open tasks</span>
                      <span className="pill neutral">
                        {dataset.qaTasks.filter((task) => task.task_type === 'visit_documentation_review' && task.status === 'open').length} doc reviews
                      </span>
                    </>
                  }
                />
              <div className="content-grid">
                <Panel title="QA Work Queue" subtitle="OASIS review, claim holds, and chart compliance.">
                  <div className="stack">
                    {dataset.qaTasks.map((task) => (
                      <div key={task.id} className="action-row">
                        <div>
                          <strong>{task.title}</strong>
                          <p className="muted">
                            {task.task_type} · {task.details}
                          </p>
                          <p className="muted">
                            Owner: {formatTaskAssignee(task)} · Priority: {labelizeValue(task.priority)} · {formatDueAt(task.due_at)}
                          </p>
                          {task.escalation_reason ? <p className="muted">Escalation: {task.escalation_reason}</p> : null}
                        </div>
                        <div className="row-actions">
                          <span className={`pill ${task.status === 'open' ? 'warn' : 'neutral'}`}>{task.status}</span>
                          <button className="secondary-button" onClick={() => void completeQaTask(task.id)}>
                            Resolve
                          </button>
                        </div>
                        <TaskOwnershipEditor
                          task={task}
                          draft={assignmentDraftForTask(task)}
                          onRoleChange={(value) => setQaAssignmentDraft(task.id, { assigned_role: value })}
                          onUserChange={(value) => setQaAssignmentDraft(task.id, { assigned_user_name: value })}
                          onEscalationNoteChange={(value) => setQaAssignmentDraft(task.id, { escalation_note: value })}
                          onSave={() => void saveQaTaskAssignment(task)}
                          onAssignToMe={() => void saveQaTaskAssignment(task, 'assign_to_me')}
                          onClear={() => void saveQaTaskAssignment(task, 'clear')}
                          onEscalate={() => void escalateQaTask(task)}
                        />
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Documentation QA Release" subtitle="Lock completed visit documentation after review so billing can progress cleanly.">
                  <div className="stack">
                    {dataset.qaTasks.filter((task) => task.status === 'open' && task.task_type === 'visit_documentation_review').length > 0 ? (
                      dataset.qaTasks
                        .filter((task) => task.status === 'open' && task.task_type === 'visit_documentation_review')
                        .map((task) => {
                          const visit = dataset.visits.find((item) => item.id === task.visit_id)
                          return (
                            <div key={`doc-lock-${task.id}`} className="action-row">
                              <div>
                                <strong>{visit?.patient_name ?? `Visit ${task.visit_id}`}</strong>
                                <p className="muted">
                                  Visit {task.visit_id} · {visit?.discipline ?? 'Unknown discipline'} {visit?.visit_type ?? 'visit'}
                                </p>
                                <p className="muted">{task.details ?? 'Documentation submitted for review.'}</p>
                                <p className="muted">
                                  Current status: {labelizeValue(visit?.documentation_status ?? 'pending')} · {formatDueAt(task.due_at)}
                                </p>
                                {task.escalation_reason ? <p className="muted">Escalation: {task.escalation_reason}</p> : null}
                              </div>
                              <div className="row-actions wrap">
                                <button className="secondary-button" type="button" onClick={() => visit && loadVisitDocumentationForm(visit)}>
                                  Review notes
                                </button>
                                <button className="primary-button" type="button" onClick={() => void lockVisitDocumentation(task)}>
                                  Lock documentation
                                </button>
                              </div>
                            </div>
                          )
                        })
                    ) : (
                      <EmptyState text="No visit documentation charts are currently waiting on QA lock." />
                    )}
                  </div>
                </Panel>
                <Panel
                  title="OASIS Submission Queue"
                  subtitle="QA can track draft, submitted, accepted, and rejected OASIS packages alongside chart review."
                  tone="soft"
                >
                  <div className="stack">
                    {dataset.oasisSubmissions.length > 0 ? (
                      dataset.oasisSubmissions.map((submission) => (
                        <div key={submission.id} className="action-row">
                          <div>
                            <strong>{submission.submission_reference ?? `Submission ${submission.id}`}</strong>
                            <p className="muted">
                              Episode {submission.episode_id} · {labelizeValue(submission.submission_status)} · {submission.iqies_ready ? 'Ready' : 'Needs work'}
                            </p>
                            <p className="muted">{submission.readiness_notes ?? submission.rejection_note ?? 'No QA note recorded.'}</p>
                          </div>
                          <div className="row-actions wrap">
                            <span className={`pill ${submission.submission_status === 'rejected' ? 'warn' : 'neutral'}`}>{labelizeValue(submission.submission_status)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="No OASIS submission packages are in the queue yet." />
                    )}
                  </div>
                </Panel>
                <Panel title="Lifecycle Workflows" subtitle="Recertification, transfer, ROC, and death-at-home readiness.">
                  <div className="detail-stack">
                    <KeyValue label="Recertification" value="Create reassessment tasks during days 56-60 of the cert period." />
                    <KeyValue label="Transfer" value="Close scheduling and billing on the current episode, then generate transfer tasks." />
                    <KeyValue label="Resume of care" value="Track hospitalization gaps and restore visit cadence after ROC assessment." />
                    <KeyValue label="Death at home" value="Stop future visits, finalize documentation, and route billing to closure review." />
                  </div>
                </Panel>
              </div>
              </div>
  )
}
