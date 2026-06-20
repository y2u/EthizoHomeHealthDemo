import type { ModuleProps } from './moduleTypes'
import { EmptyState, FieldNote, KeyValue, MetricCard, Panel } from '../components/ui'
import { formatDueAt, labelizeValue } from '../domain/formatters'

export function OverviewModule({ controller }: ModuleProps) {
  const {
    setActiveModule,
    openRoleWorkItem,
    selectedEpisode,
    selectedEpisodeSnapshot,
    roleDashboard,
    roleDashboardSections,
  } = controller

  return (
    <div className="overview-shell">
                <Panel title={roleDashboard.heading} subtitle={roleDashboard.subtitle} tone="emphasis">
                  <div className="overview-kpi-grid">
                    {roleDashboard.metrics.map((metric) => (
                      <MetricCard key={metric.label} label={metric.label} value={metric.value} variant="spotlight" />
                    ))}
                  </div>
                  <div className="overview-workboard">
                    {roleDashboard.items.length > 0 ? (
                      roleDashboardSections.map((section) => (
                        <div key={section.title} className="overview-workbucket">
                          <div className="overview-workbucket-header">
                            <strong>{section.title}</strong>
                            <span className="pill neutral">{section.items.length}</span>
                          </div>
                          <FieldNote text={section.description} />
                          {section.items.length > 0 ? (
                            section.items.map((item) => (
                              <div key={item.key} className="action-row">
                                <div>
                                  <strong>{item.title}</strong>
                                  <p className="muted">{item.detail}</p>
                                  <p className="muted">
                                    {item.ownerLabel ? `Owner: ${item.ownerLabel} · ` : ''}
                                    Priority: {labelizeValue(item.priority ?? 'medium')} · {formatDueAt(item.dueAt)}
                                  </p>
                                </div>
                                <div className="row-actions wrap">
                                  <span className={`pill ${(item.priority ?? 'medium').toLowerCase() === 'high' ? 'warn' : 'neutral'}`}>
                                    {labelizeValue(item.priority ?? 'medium')}
                                  </span>
                                  <button className="secondary-button" type="button" onClick={() => openRoleWorkItem(item)}>
                                    {item.buttonLabel}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <EmptyState text={`No items are currently grouped under ${section.title.toLowerCase()}.`} />
                          )}
                        </div>
                      ))
                    ) : (
                      <EmptyState text="No role-specific work is queued right now." />
                    )}
                  </div>
                </Panel>
                <div className="overview-side-grid">
                  <Panel title="Workflow Snapshot" subtitle="US home health sequence from intake through billing." tone="soft" density="compact">
                    <div className="timeline">
                      {[
                        'Patient registration and eligibility setup',
                        'Referral intake and order readiness',
                        'Episode creation from accepted referral',
                        'SOC visit plus OASIS completion',
                        'Episode activation and NOA billing trigger',
                        'Recurring visit scheduling and clinician documentation',
                        'Georgia EVV submission and QA review',
                        'PDGM episode billing and lifecycle management',
                      ].map((step, index) => (
                        <div key={step} className="timeline-step overview-timeline-step">
                          <span className="overview-step-index">{index + 1}</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                  <Panel title="Live Episode Focus" subtitle="Current cert period, PDGM, and compliance status." tone="emphasis">
                    {selectedEpisode ? (
                      <div className="detail-stack">
                        <div className="overview-episode-banner">
                          <div>
                            <strong>{selectedEpisode.patient_name}</strong>
                            <p className="muted">
                              Episode {selectedEpisode.id} · {labelizeValue(selectedEpisode.episode_status)}
                            </p>
                          </div>
                          <div className="row-actions wrap">
                            {selectedEpisode.pdgm_group_code ? <span className="pill neutral">{selectedEpisode.pdgm_group_code}</span> : null}
                            <button className="secondary-button" type="button" onClick={() => setActiveModule('Episodes')}>
                              Open episode
                            </button>
                          </div>
                        </div>
                        <KeyValue label="Patient" value={selectedEpisode.patient_name} />
                        <KeyValue label="Episode status" value={selectedEpisode.episode_status} />
                        <KeyValue label="OASIS version" value={selectedEpisode.oasis_version_required ?? 'Pending'} />
                        <KeyValue label="PDGM group" value={selectedEpisode.pdgm_group_code ?? 'Pending grouping'} />
                        <KeyValue label="Admission source" value={selectedEpisodeSnapshot?.admission_source ?? 'Pending intake review'} />
                        <KeyValue label="NOA due" value={selectedEpisode.noa_due_date ?? 'Set at activation'} />
                      </div>
                    ) : (
                      <EmptyState text="Create or convert a referral to start the episode workflow." />
                    )}
                  </Panel>
                </div>
              </div>
  )
}
