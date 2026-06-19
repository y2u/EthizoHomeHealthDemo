import type { ModuleProps } from './moduleTypes'
import { EmptyState, FormGrid, Input, KeyValue, MetricCard, Panel, Select, WorkspaceHeader } from '../components/ui'
import { labelizeValue } from '../domain/formatters'

export function AdminModule({ controller }: ModuleProps) {
  const {
    user,
    dataset,
    adminSettingsForm,
    setAdminSettingsForm,
    auditFilterAction,
    setAuditFilterAction,
    auditFilterModel,
    setAuditFilterModel,
    auditFilterSearch,
    setAuditFilterSearch,
    adminReportPeriod,
    setAdminReportPeriod,
    editingAdminUserId,
    adminUserForm,
    setAdminUserForm,
    qapiForm,
    setQapiForm,
    resetAdminUserForm,
    loadAdminUserIntoForm,
    saveAdminSettings,
    saveAdminUser,
    exportAdminReport,
    saveQapiProject,
    captureSurveyReadinessAction,
    captureQualityMetricsAction,
    filteredAuditEvents,
    adminReportSummary,
    summarizeAuditDetails,
  } = controller

  return (
    <div className="module-stack">
                <WorkspaceHeader
                  eyebrow="Admin"
                  title="Administration"
                  subtitle="Manage access, security posture, audit review, and reporting from a cleaner operational control center."
                  meta={
                    <>
                      <span className="pill neutral">{dataset.adminUsers.length} users</span>
                      <span className="pill warn">
                        {dataset.adminUsers.filter((adminUser) => (adminUser.status ?? 'active') === 'suspended').length} suspended
                      </span>
                      <span className="pill neutral">{dataset.auditEvents.length} audit events</span>
                    </>
                  }
                />
              <div className="content-grid">
                <Panel
                  title="User Access"
                  subtitle="Manage release-3 user access, role coverage, MFA expectations, and account status from one admin surface."
                  tone="emphasis"
                >
                  <div className="stack">
                    {dataset.adminUsers.map((adminUser) => (
                      <div key={adminUser.id} className="action-row">
                        <div>
                          <strong>{adminUser.full_name}</strong>
                          <p className="muted">
                            {adminUser.email} · {adminUser.role}
                            {adminUser.mobile ? ` · ${adminUser.mobile}` : ''}
                          </p>
                          <p className="muted">
                            Status: {labelizeValue(adminUser.status ?? 'active')} · MFA: {adminUser.mfa_enabled ? 'Enabled' : 'Not enabled'} · Last login: {adminUser.last_login_at ?? 'Never'}
                          </p>
                        </div>
                        <div className="row-actions wrap">
                          <span className={`pill ${(adminUser.status ?? 'active') === 'suspended' ? 'warn' : 'neutral'}`}>{adminUser.status ?? 'active'}</span>
                          <button className="secondary-button" type="button" onClick={() => loadAdminUserIntoForm(adminUser)}>
                            Edit access
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="stack">
                    <strong>{editingAdminUserId !== null ? 'Edit user access' : 'Add user access'}</strong>
                    <FormGrid>
                      <Input label="Full name" value={adminUserForm.full_name} onChange={(value) => setAdminUserForm((current) => ({ ...current, full_name: value }))} />
                      <Input label="Email" value={adminUserForm.email} onChange={(value) => setAdminUserForm((current) => ({ ...current, email: value }))} />
                      <Select
                        label="Role"
                        value={adminUserForm.role}
                        onChange={(value) => setAdminUserForm((current) => ({ ...current, role: value }))}
                        options={[
                          { label: 'Intake', value: 'Intake' },
                          { label: 'Clinician', value: 'Clinician' },
                          { label: 'Billing', value: 'Billing' },
                          { label: 'QA', value: 'QA' },
                          { label: 'Admin', value: 'Admin' },
                        ]}
                      />
                      <Input label="Mobile" value={adminUserForm.mobile} onChange={(value) => setAdminUserForm((current) => ({ ...current, mobile: value }))} />
                      <Select
                        label="Status"
                        value={adminUserForm.status}
                        onChange={(value) => setAdminUserForm((current) => ({ ...current, status: value }))}
                        options={[
                          { label: 'Active', value: 'active' },
                          { label: 'Suspended', value: 'suspended' },
                        ]}
                      />
                      <Select
                        label="MFA enabled"
                        value={adminUserForm.mfa_enabled}
                        onChange={(value) => setAdminUserForm((current) => ({ ...current, mfa_enabled: value }))}
                        options={[
                          { label: 'Yes', value: 'yes' },
                          { label: 'No', value: 'no' },
                        ]}
                      />
                      <Input
                        label={editingAdminUserId !== null ? 'Reset password (optional)' : 'Initial password'}
                        value={adminUserForm.password}
                        onChange={(value) => setAdminUserForm((current) => ({ ...current, password: value }))}
                      />
                    </FormGrid>
                    <div className="row-actions wrap">
                      <button className="primary-button" type="button" onClick={() => void saveAdminUser()}>
                        {editingAdminUserId !== null ? 'Save user access' : 'Create user access'}
                      </button>
                      {editingAdminUserId !== null ? (
                        <button className="secondary-button" type="button" onClick={() => resetAdminUserForm()}>
                          Cancel edit
                        </button>
                      ) : null}
                    </div>
                  </div>
                </Panel>
                <Panel
                  title="Security Policy"
                  subtitle="Configure the baseline access and retention controls Release 3 needs for a production-oriented deployment."
                >
                  <FormGrid>
                    <Select
                      label="Require MFA"
                      value={adminSettingsForm.require_mfa}
                      onChange={(value) => setAdminSettingsForm((current) => ({ ...current, require_mfa: value }))}
                      options={[
                        { label: 'Yes', value: 'yes' },
                        { label: 'No', value: 'no' },
                      ]}
                    />
                    <Select
                      label="Enforce device attestation"
                      value={adminSettingsForm.enforce_device_attestation}
                      onChange={(value) => setAdminSettingsForm((current) => ({ ...current, enforce_device_attestation: value }))}
                      options={[
                        { label: 'Yes', value: 'yes' },
                        { label: 'No', value: 'no' },
                      ]}
                    />
                    <Input
                      label="Session timeout (minutes)"
                      value={adminSettingsForm.session_timeout_minutes}
                      onChange={(value) => setAdminSettingsForm((current) => ({ ...current, session_timeout_minutes: value }))}
                    />
                    <Input
                      label="Remember device window (days)"
                      value={adminSettingsForm.remember_device_days}
                      onChange={(value) => setAdminSettingsForm((current) => ({ ...current, remember_device_days: value }))}
                    />
                    <Input
                      label="Password rotation (days)"
                      value={adminSettingsForm.password_rotation_days}
                      onChange={(value) => setAdminSettingsForm((current) => ({ ...current, password_rotation_days: value }))}
                    />
                    <Input
                      label="Attachment retention (days)"
                      value={adminSettingsForm.attachment_retention_days}
                      onChange={(value) => setAdminSettingsForm((current) => ({ ...current, attachment_retention_days: value }))}
                    />
                    <Input
                      label="Allowed IP ranges"
                      value={adminSettingsForm.allowed_ip_ranges}
                      onChange={(value) => setAdminSettingsForm((current) => ({ ...current, allowed_ip_ranges: value }))}
                    />
                  </FormGrid>
                  <div className="row-actions wrap">
                    <button className="primary-button" type="button" onClick={() => void saveAdminSettings()}>
                      Save security policy
                    </button>
                  </div>
                </Panel>
                <Panel
                  title="Access Snapshot"
                  subtitle="Summarize the current policy posture for sessions, devices, PHI retention, and the signed-in operator."
                  tone="soft"
                  density="compact"
                >
                  <div className="detail-stack">
                    <KeyValue label="Signed-in user" value={`${user?.full_name ?? 'Unknown'} (${user?.role ?? 'Unknown'})`} />
                    <KeyValue label="MFA policy" value={dataset.securitySettings.require_mfa ? 'Required for all users' : 'Optional'} />
                    <KeyValue
                      label="Session policy"
                      value={`${dataset.securitySettings.session_timeout_minutes} minute timeout · ${dataset.securitySettings.remember_device_days} day remembered-device window`}
                    />
                    <KeyValue
                      label="Device trust"
                      value={dataset.securitySettings.enforce_device_attestation ? 'Device attestation enforced for field and office sessions' : 'Device attestation advisory only'}
                    />
                    <KeyValue
                      label="PHI retention"
                      value={`${dataset.securitySettings.attachment_retention_days} day attachment retention target`}
                    />
                    <KeyValue
                      label="Allowed IP ranges"
                      value={dataset.securitySettings.allowed_ip_ranges?.trim() ? dataset.securitySettings.allowed_ip_ranges : 'No IP ranges explicitly listed'}
                    />
                  </div>
                </Panel>
                <Panel
                  title="Operational Reporting"
                  subtitle="Track release-3 operations across payers, claims, QA, and recent activity, then export the same summaries when leadership needs a file."
                  tone="emphasis"
                >
                  <FormGrid>
                    <Select
                      label="Reporting period"
                      value={adminReportPeriod}
                      onChange={(value) => setAdminReportPeriod(value as 'last_7' | 'last_30' | 'all')}
                      options={[
                        { label: 'Last 7 days', value: 'last_7' },
                        { label: 'Last 30 days', value: 'last_30' },
                        { label: 'All data', value: 'all' },
                      ]}
                    />
                  </FormGrid>
                  <div className="hero-grid">
                    {adminReportSummary.metrics.map((metric) => (
                      <MetricCard key={`admin-report-${metric.label}`} label={metric.label} value={metric.value} />
                    ))}
                  </div>
                  <div className="content-grid">
                    <Panel title="Payer Mix" subtitle="Current episode volume by payer for the selected reporting window." tone="soft" density="compact">
                      <div className="stack">
                        {adminReportSummary.payerMix.length > 0 ? (
                          adminReportSummary.payerMix.map((item) => (
                            <div key={`payer-${item.label}`} className="action-row">
                              <div>
                                <strong>{item.label}</strong>
                              </div>
                              <div className="row-actions wrap">
                                <span className="pill neutral">{item.count}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No payer mix data is available for the selected reporting period." />
                        )}
                      </div>
                    </Panel>
                    <Panel title="Claim Outcomes" subtitle="Current claim distribution by billing status." tone="soft" density="compact">
                      <div className="stack">
                        {adminReportSummary.claimMix.length > 0 ? (
                          adminReportSummary.claimMix.map((item) => (
                            <div key={`claim-mix-${item.label}`} className="action-row">
                              <div>
                                <strong>{item.label}</strong>
                              </div>
                              <div className="row-actions wrap">
                                <span className="pill neutral">{item.count}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No claim status data is available for the selected reporting period." />
                        )}
                      </div>
                    </Panel>
                    <Panel title="QA Distribution" subtitle="Open and resolved QA workload by task type." tone="soft" density="compact">
                      <div className="stack">
                        {adminReportSummary.qaMix.length > 0 ? (
                          adminReportSummary.qaMix.map((item) => (
                            <div key={`qa-mix-${item.label}`} className="action-row">
                              <div>
                                <strong>{item.label}</strong>
                              </div>
                              <div className="row-actions wrap">
                                <span className="pill neutral">{item.count}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No QA mix data is available for the selected reporting period." />
                        )}
                      </div>
                    </Panel>
                    <Panel title="Recent Activity" subtitle="A simple activity roll-up to show the operational pace behind the current reporting window." tone="soft" density="compact">
                      <div className="stack">
                        {adminReportSummary.recentActivity.map((item) => (
                          <div key={`recent-${item.label}`} className="action-row">
                            <div>
                              <strong>{item.label}</strong>
                            </div>
                            <div className="row-actions wrap">
                              <span className="pill neutral">{item.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </div>
                  <div className="row-actions wrap">
                    <button className="secondary-button" type="button" onClick={() => exportAdminReport('summary')}>
                      Export summary CSV
                    </button>
                    <button className="secondary-button" type="button" onClick={() => exportAdminReport('claims')}>
                      Export claims CSV
                    </button>
                    <button className="secondary-button" type="button" onClick={() => exportAdminReport('qa')}>
                      Export QA CSV
                    </button>
                    <button className="secondary-button" type="button" onClick={() => exportAdminReport('audit')}>
                      Export audit CSV
                    </button>
                  </div>
                </Panel>
                <Panel
                  title="QAPI Infrastructure"
                  subtitle="Track improvement projects, owners, review cadence, and linked QA or audit evidence in a lightweight demo-ready program view."
                  tone="soft"
                >
                  <div className="content-grid">
                    <div className="stack">
                      {dataset.qapiProjects.length > 0 ? (
                        dataset.qapiProjects.map((project) => (
                          <div key={project.id} className="action-row">
                            <div>
                              <strong>{project.title}</strong>
                              <p className="muted">
                                {project.measure_name} · {project.owner_name} · {labelizeValue(project.review_cadence)}
                              </p>
                              <p className="muted">
                                Target: {project.target_value ?? 'Not set'} · Current: {project.current_value ?? 'Not set'} · Status: {labelizeValue(project.status)}
                              </p>
                              {project.intervention_plan ? <p className="muted">{project.intervention_plan}</p> : null}
                            </div>
                            <div className="row-actions wrap">
                              <span className={`pill ${project.status === 'active' ? 'neutral' : 'warn'}`}>{labelizeValue(project.status)}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState text="No QAPI projects are currently tracked." />
                      )}
                    </div>
                    <div className="stack">
                      <strong>Add QAPI project</strong>
                      <FormGrid>
                        <Input label="Title" value={qapiForm.title} onChange={(value) => setQapiForm((current) => ({ ...current, title: value }))} />
                        <Input label="Measure" value={qapiForm.measure_name} onChange={(value) => setQapiForm((current) => ({ ...current, measure_name: value }))} />
                        <Input label="Owner" value={qapiForm.owner_name} onChange={(value) => setQapiForm((current) => ({ ...current, owner_name: value }))} />
                        <Input label="Review cadence" value={qapiForm.review_cadence} onChange={(value) => setQapiForm((current) => ({ ...current, review_cadence: value }))} />
                        <Input label="Status" value={qapiForm.status} onChange={(value) => setQapiForm((current) => ({ ...current, status: value }))} />
                        <Input label="Target value" value={qapiForm.target_value} onChange={(value) => setQapiForm((current) => ({ ...current, target_value: value }))} />
                        <Input label="Current value" value={qapiForm.current_value} onChange={(value) => setQapiForm((current) => ({ ...current, current_value: value }))} />
                        <Input label="Intervention plan" value={qapiForm.intervention_plan} onChange={(value) => setQapiForm((current) => ({ ...current, intervention_plan: value }))} />
                        <Input label="Evidence summary" value={qapiForm.evidence_summary} onChange={(value) => setQapiForm((current) => ({ ...current, evidence_summary: value }))} />
                      </FormGrid>
                      <button className="primary-button" type="button" onClick={() => void saveQapiProject()}>
                        Save QAPI project
                      </button>
                    </div>
                  </div>
                </Panel>
                <Panel
                  title="Survey Readiness Dashboard"
                  subtitle="Aggregate patient rights, notices, orders aging, aide supervision, incidents, infections, authorization, and documentation integrity."
                  tone="emphasis"
                >
                  <div className="hero-grid">
                    {dataset.surveyReadinessSummary.category_scores.map((category) => (
                      <MetricCard key={`survey-${category.key}`} label={category.label} value={Math.round(category.score)} />
                    ))}
                  </div>
                  <div className="content-grid">
                    <div className="stack">
                      {dataset.surveyReadinessSummary.category_scores.map((category) => (
                        <div key={`survey-row-${category.key}`} className="action-row">
                          <div>
                            <strong>{category.label}</strong>
                            <p className="muted">
                              Score {category.score}% · {category.issue_count} open issue{category.issue_count === 1 ? '' : 's'} · {labelizeValue(category.status)}
                            </p>
                            <p className="muted">{category.summary}</p>
                          </div>
                          <span className={`pill ${category.status === 'green' ? 'neutral' : 'warn'}`}>{labelizeValue(category.status)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="stack">
                      <strong>Open compliance counts</strong>
                      {Object.entries(dataset.surveyReadinessSummary.open_counts).map(([key, value]) => (
                        <KeyValue key={`survey-count-${key}`} label={labelizeValue(key)} value={String(value)} />
                      ))}
                      <KeyValue label="Last generated" value={dataset.surveyReadinessSummary.generated_at} />
                      <KeyValue label="Snapshot history" value={String(dataset.surveyReadinessSummary.history.length)} />
                      <div className="row-actions wrap">
                        <button className="secondary-button" type="button" onClick={() => void captureSurveyReadinessAction()}>
                          Capture survey snapshot
                        </button>
                      </div>
                    </div>
                  </div>
                </Panel>
                <Panel
                  title="Star Rating and VBP Tracking"
                  subtitle="Show internal performance scorecards inspired by quality operations, not official CMS-calculated scores."
                  tone="soft"
                >
                  <div className="hero-grid">
                    {dataset.qualityMetricsSummary.metrics.map((metric) => (
                      <MetricCard key={`quality-${metric.key}`} label={metric.label} value={Math.round(metric.score)} />
                    ))}
                  </div>
                  <div className="stack">
                    {dataset.qualityMetricsSummary.metrics.map((metric) => (
                      <div key={`quality-row-${metric.key}`} className="action-row">
                        <div>
                          <strong>{metric.label}</strong>
                          <p className="muted">
                            Score {metric.score}% · {metric.numerator}/{metric.denominator}
                          </p>
                          {metric.note ? <p className="muted">{metric.note}</p> : null}
                        </div>
                        <div className="row-actions wrap">
                          <span className={`pill ${metric.score >= 85 ? 'neutral' : 'warn'}`}>{metric.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="row-actions wrap">
                    <button className="secondary-button" type="button" onClick={() => void captureQualityMetricsAction()}>
                      Capture quality snapshot
                    </button>
                  </div>
                </Panel>
                <Panel
                  title="Session Activity"
                  subtitle="Use recent login and audit activity as a lightweight session-administration view until full server-side session revocation is introduced."
                  density="compact"
                >
                  <div className="stack">
                    {dataset.sessionActivity.length > 0 ? (
                      dataset.sessionActivity.map((session) => (
                        <div key={session.user_id} className="action-row">
                          <div>
                            <strong>{session.full_name}</strong>
                            <p className="muted">
                              {session.email} · {session.role} · {labelizeValue(session.activity_state)}
                            </p>
                            <p className="muted">
                              Status: {labelizeValue(session.status)} · MFA: {session.mfa_enabled ? 'Enabled' : 'Not enabled'} · Last login: {session.last_login_at ?? 'Never'}
                            </p>
                            <p className="muted">
                              Recent activity: {session.recent_action ? `${labelizeValue(session.recent_action)} on ${session.recent_model ?? 'Unknown model'}` : 'No recent audit activity'} · {session.recent_at ?? 'No recent timestamp'}
                            </p>
                          </div>
                          <div className="row-actions wrap">
                            <span className={`pill ${session.activity_state === 'active_window' ? 'neutral' : 'warn'}`}>{labelizeValue(session.activity_state)}</span>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => {
                                const matchingUser = dataset.adminUsers.find((entry) => entry.id === session.user_id)
                                if (matchingUser) {
                                  loadAdminUserIntoForm(matchingUser)
                                }
                              }}
                            >
                              Open user
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="No session activity has been recorded yet." />
                    )}
                  </div>
                </Panel>
                <Panel
                  title="Audit Workspace"
                  subtitle="Review administrative, billing, and clinical workflow changes with simple filters and event detail summaries."
                  tone="emphasis"
                >
                  <FormGrid>
                    <Select
                      label="Action filter"
                      value={auditFilterAction}
                      onChange={setAuditFilterAction}
                      options={[
                        { label: 'All actions', value: 'All' },
                        ...Array.from(new Set(dataset.auditEvents.map((event) => event.action))).sort().map((action) => ({
                          label: labelizeValue(action),
                          value: action,
                        })),
                      ]}
                    />
                    <Select
                      label="Model filter"
                      value={auditFilterModel}
                      onChange={setAuditFilterModel}
                      options={[
                        { label: 'All models', value: 'All' },
                        ...Array.from(new Set(dataset.auditEvents.map((event) => event.model))).sort().map((model) => ({
                          label: model,
                          value: model,
                        })),
                      ]}
                    />
                    <Input label="Search" value={auditFilterSearch} onChange={setAuditFilterSearch} />
                  </FormGrid>
                  <div className="stack">
                    {filteredAuditEvents.length > 0 ? (
                      filteredAuditEvents.map((event) => (
                        <div key={event.id} className="action-row">
                          <div>
                            <strong>{labelizeValue(event.action)}</strong>
                            <p className="muted">
                              {event.actor_email} · {event.model} #{event.model_id}
                            </p>
                            <p className="muted">{summarizeAuditDetails(event.details)}</p>
                            <p className="muted">{event.created}</p>
                          </div>
                          <div className="row-actions wrap">
                            <span className="pill neutral">{event.model}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="No audit events match the current Admin filters." />
                    )}
                  </div>
                </Panel>
              </div>
              </div>
  )
}
