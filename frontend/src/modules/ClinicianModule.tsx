import type { ModuleProps } from './moduleTypes'
import { EmptyState, FieldNote, FormGrid, Input, KeyValue, Panel, Select, WorkflowTabs, WorkspaceHeader } from '../components/ui'
import { labelizeValue } from '../domain/formatters'

export function ClinicianModule({ controller }: ModuleProps) {
  const {
    dataset,
    offlineQueue,
    setStatusMessage,
    clinicianWorkspaceTab,
    setClinicianWorkspaceTab,
    visitForm,
    setVisitForm,
    scheduleChangeForm,
    setScheduleChangeForm,
    documentationForm,
    setDocumentationForm,
    chooseVisitEpisode,
    loadRecommendationIntoVisitForm,
    scheduleRecommendationPlan,
    prepareScheduleChange,
    loadVisitDocumentationForm,
    saveVisitDocumentation,
    rescheduleVisitChange,
    markVisitMissed,
    reassignVisitChange,
    addVisit,
    visitAction,
    clinicianVisits,
    selectedClinicianEpisode,
    selectedClinicianEpisodeSnapshot,
    schedulingRecommendations,
    weekOnePlan,
    nameForPatient,
    documentationBlueprintForDiscipline,
  } = controller

  return (
    <div className="module-stack">
                <WorkspaceHeader
                  eyebrow="Clinician"
                  title="Clinician Visit Workspace"
                  subtitle="Schedule visits, complete documentation, and manage field actions from one focused workspace."
                  meta={
                    <>
                      <span className="pill neutral">{clinicianVisits.length} visits</span>
                      <span className="pill warn">{offlineQueue.length} queued</span>
                      {selectedClinicianEpisode ? <span className="pill neutral">{selectedClinicianEpisode.patient_name}</span> : null}
                    </>
                  }
                >
                  <WorkflowTabs
                    tabs={[
                      { label: 'Scheduling', value: 'schedule' },
                      { label: 'Documentation', value: 'documentation' },
                      { label: 'Field Actions', value: 'field' },
                    ]}
                    activeTab={clinicianWorkspaceTab}
                    onChange={(value) => setClinicianWorkspaceTab(value as 'schedule' | 'documentation' | 'field')}
                  />
                </WorkspaceHeader>
                {clinicianWorkspaceTab === 'schedule' && (
                  <div className="content-grid clinician-grid">
                    <Panel title="Schedule Visits" subtitle="Create SOC, routine, PRN, ROC, recert, transfer, or discharge visits.">
                      <FormGrid>
                        <Select
                          label="Episode"
                          value={visitForm.episode_id}
                          onChange={chooseVisitEpisode}
                          options={dataset.episodes.map((episode) => ({ label: `${episode.patient_name} · Episode ${episode.id}`, value: String(episode.id) }))}
                        />
                        <Select
                          label="Patient"
                          value={visitForm.patient_id}
                          onChange={(value) => setVisitForm((current) => ({ ...current, patient_id: value }))}
                          options={dataset.patients.map((patient) => ({ label: nameForPatient(patient), value: String(patient.id) }))}
                        />
                        <Input label="Visit type" value={visitForm.visit_type} onChange={(value) => setVisitForm((current) => ({ ...current, visit_type: value }))} />
                        <Input label="Discipline" value={visitForm.discipline} onChange={(value) => setVisitForm((current) => ({ ...current, discipline: value }))} />
                        <Input label="Start" type="datetime-local" value={visitForm.scheduled_start} onChange={(value) => setVisitForm((current) => ({ ...current, scheduled_start: value }))} />
                        <Input label="End" type="datetime-local" value={visitForm.scheduled_end} onChange={(value) => setVisitForm((current) => ({ ...current, scheduled_end: value }))} />
                      </FormGrid>
                      <button className="primary-button" onClick={() => void addVisit()}>
                        Schedule visit
                      </button>
                    </Panel>
                    <Panel title="Scheduling Recommendations" subtitle="Episode-aware visit suggestions derived from requested disciplines and current activation status.">
                      {selectedClinicianEpisode && selectedClinicianEpisodeSnapshot ? (
                        <div className="stack">
                          <KeyValue label="Episode status" value={selectedClinicianEpisode.episode_status} />
                          <KeyValue
                            label="Requested disciplines"
                            value={(selectedClinicianEpisodeSnapshot.requested_disciplines ?? []).join(', ') || 'No disciplines captured'}
                          />
                          {schedulingRecommendations.length > 0 ? (
                            schedulingRecommendations.map((recommendation) => (
                              <div key={recommendation.key} className="action-row">
                                <div>
                                  <strong>{recommendation.title}</strong>
                                  <p className="muted">
                                    {recommendation.discipline} · {recommendation.visitType} · {recommendation.targetDateTime}
                                  </p>
                                  <p className="muted">{recommendation.rationale}</p>
                                </div>
                                <div className="row-actions wrap">
                                  <span className="pill neutral">{recommendation.requiresEvv ? 'EVV' : 'No EVV'}</span>
                                  <button className="secondary-button" type="button" onClick={() => loadRecommendationIntoVisitForm(recommendation)}>
                                    Load into form
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <EmptyState text="No recommendations yet. Activate the episode or capture requested disciplines first." />
                          )}
                        </div>
                      ) : (
                        <EmptyState text="Choose an episode to see discipline-based scheduling suggestions." />
                      )}
                    </Panel>
                    <Panel title="Week-One Frequency Plan" subtitle="Generate a first-week visit template from requested disciplines and the episode admission stage.">
                      {selectedClinicianEpisode && selectedClinicianEpisodeSnapshot ? (
                        <div className="stack">
                          {weekOnePlan.length > 0 ? (
                            <>
                              {weekOnePlan.map((recommendation) => (
                                <div key={recommendation.key} className="action-row">
                                  <div>
                                    <strong>{recommendation.title}</strong>
                                    <p className="muted">
                                      {recommendation.discipline} · {recommendation.visitType} · {recommendation.targetDateTime}
                                    </p>
                                    <p className="muted">{recommendation.frequencyHint ?? recommendation.rationale}</p>
                                  </div>
                                  <div className="row-actions wrap">
                                    <button className="secondary-button" type="button" onClick={() => loadRecommendationIntoVisitForm(recommendation)}>
                                      Load into form
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <button className="primary-button" type="button" onClick={() => void scheduleRecommendationPlan(weekOnePlan)}>
                                Schedule week-one plan
                              </button>
                            </>
                          ) : (
                            <EmptyState text="No week-one plan is available yet. Capture requested disciplines or activate the episode first." />
                          )}
                        </div>
                      ) : (
                        <EmptyState text="Choose an episode to generate a first-week visit template." />
                      )}
                    </Panel>
                    <Panel title="Schedule Change Review" subtitle="Missed visits and active-episode schedule changes should trigger QA and billing follow-up.">
                      <FormGrid>
                        <Select
                          label="Visit"
                          value={scheduleChangeForm.visit_id}
                          onChange={(value) => {
                            const visit = clinicianVisits.find((item) => item.id === Number(value))
                            if (visit) {
                              prepareScheduleChange(visit)
                            } else {
                              setScheduleChangeForm((current) => ({ ...current, visit_id: value }))
                            }
                          }}
                          options={[
                            { label: 'Choose visit', value: '' },
                            ...clinicianVisits.map((visit) => ({
                              label: `${visit.patient_name} · ${visit.discipline} ${visit.visit_type} · ${visit.scheduled_start}`,
                              value: String(visit.id),
                            })),
                          ]}
                        />
                        <Input
                          label="Visit type"
                          value={scheduleChangeForm.visit_type}
                          onChange={(value) => setScheduleChangeForm((current) => ({ ...current, visit_type: value }))}
                        />
                        <Input
                          label="Discipline"
                          value={scheduleChangeForm.discipline}
                          onChange={(value) => setScheduleChangeForm((current) => ({ ...current, discipline: value }))}
                        />
                        <Input
                          label="New start"
                          type="datetime-local"
                          value={scheduleChangeForm.scheduled_start}
                          onChange={(value) => setScheduleChangeForm((current) => ({ ...current, scheduled_start: value }))}
                        />
                        <Input
                          label="New end"
                          type="datetime-local"
                          value={scheduleChangeForm.scheduled_end}
                          onChange={(value) => setScheduleChangeForm((current) => ({ ...current, scheduled_end: value }))}
                        />
                        <Input
                          label="Reassign to clinician"
                          value={scheduleChangeForm.reassigned_clinician}
                          onChange={(value) => setScheduleChangeForm((current) => ({ ...current, reassigned_clinician: value }))}
                        />
                        <Input
                          label="Follow-up plan"
                          value={scheduleChangeForm.follow_up_plan}
                          onChange={(value) => setScheduleChangeForm((current) => ({ ...current, follow_up_plan: value }))}
                        />
                        <Input
                          label="Reason"
                          value={scheduleChangeForm.reason}
                          onChange={(value) => setScheduleChangeForm((current) => ({ ...current, reason: value }))}
                        />
                      </FormGrid>
                      <div className="row-actions wrap">
                        <button className="secondary-button" type="button" onClick={() => void rescheduleVisitChange()}>
                          Submit reschedule review
                        </button>
                        <button className="secondary-button" type="button" onClick={() => void reassignVisitChange()}>
                          Reassign visit
                        </button>
                        <button
                          className="primary-button"
                          type="button"
                          onClick={() => {
                            const visit = clinicianVisits.find((item) => item.id === Number(scheduleChangeForm.visit_id))
                            if (visit) {
                              void markVisitMissed(visit)
                            } else {
                              setStatusMessage('Choose a visit before marking it missed.')
                            }
                          }}
                        >
                          Mark selected visit missed
                        </button>
                      </div>
                    </Panel>
                  </div>
                )}
                {clinicianWorkspaceTab === 'documentation' && (
                  <div className="content-grid">
                    <Panel title="Visit Documentation" subtitle="Capture structured visit notes, submit charts for QA review, and prepare them for billing release.">
                      <FieldNote
                        text={documentationBlueprintForDiscipline(
                          clinicianVisits.find((visit) => visit.id === Number(documentationForm.visit_id))?.discipline ?? 'SN',
                        )}
                      />
                      <FormGrid>
                        <Select
                          label="Visit"
                          value={documentationForm.visit_id}
                          onChange={(value) => {
                            const visit = clinicianVisits.find((item) => item.id === Number(value))
                            if (visit) {
                              loadVisitDocumentationForm(visit)
                            } else {
                              setDocumentationForm((current) => ({ ...current, visit_id: value }))
                            }
                          }}
                          options={[
                            { label: 'Choose visit', value: '' },
                            ...clinicianVisits.map((visit) => ({
                              label: `${visit.patient_name} · ${visit.discipline} ${visit.visit_type} · ${visit.documentation_status ?? 'pending'}`,
                              value: String(visit.id),
                            })),
                          ]}
                        />
                        <Input label="Visit focus" value={documentationForm.visit_focus} onChange={(value) => setDocumentationForm((current) => ({ ...current, visit_focus: value }))} />
                        <Input label="Visit narrative" value={documentationForm.visit_narrative} onChange={(value) => setDocumentationForm((current) => ({ ...current, visit_narrative: value }))} />
                        <Input label="Interventions" value={documentationForm.interventions} onChange={(value) => setDocumentationForm((current) => ({ ...current, interventions: value }))} />
                        <Input label="Patient response" value={documentationForm.patient_response} onChange={(value) => setDocumentationForm((current) => ({ ...current, patient_response: value }))} />
                        <Input label="Vitals" value={documentationForm.vitals} onChange={(value) => setDocumentationForm((current) => ({ ...current, vitals: value }))} />
                        <Input label="Pain level" value={documentationForm.pain_level} onChange={(value) => setDocumentationForm((current) => ({ ...current, pain_level: value }))} />
                        <Input label="Teaching topics" value={documentationForm.teaching_topics} onChange={(value) => setDocumentationForm((current) => ({ ...current, teaching_topics: value }))} />
                        <Input label="Medication review" value={documentationForm.medication_review} onChange={(value) => setDocumentationForm((current) => ({ ...current, medication_review: value }))} />
                        <Input label="Wound care" value={documentationForm.wound_care} onChange={(value) => setDocumentationForm((current) => ({ ...current, wound_care: value }))} />
                        <Input label="Mobility status" value={documentationForm.mobility_status} onChange={(value) => setDocumentationForm((current) => ({ ...current, mobility_status: value }))} />
                        <Input label="ADL support" value={documentationForm.adl_support} onChange={(value) => setDocumentationForm((current) => ({ ...current, adl_support: value }))} />
                        <Input label="Psychosocial notes" value={documentationForm.psychosocial_notes} onChange={(value) => setDocumentationForm((current) => ({ ...current, psychosocial_notes: value }))} />
                        <Input label="Abnormal findings" value={documentationForm.abnormal_findings} onChange={(value) => setDocumentationForm((current) => ({ ...current, abnormal_findings: value }))} />
                        <Select
                          label="Physician contact needed"
                          value={documentationForm.physician_contact_needed}
                          onChange={(value) => setDocumentationForm((current) => ({ ...current, physician_contact_needed: value }))}
                          options={[
                            { label: 'No', value: 'no' },
                            { label: 'Yes', value: 'yes' },
                          ]}
                        />
                        <Input label="Follow-up plan" value={documentationForm.follow_up_plan} onChange={(value) => setDocumentationForm((current) => ({ ...current, follow_up_plan: value }))} />
                        <Input label="Next visit focus" value={documentationForm.next_visit_focus} onChange={(value) => setDocumentationForm((current) => ({ ...current, next_visit_focus: value }))} />
                        <Input label="QA review notes" value={documentationForm.qa_review_notes} onChange={(value) => setDocumentationForm((current) => ({ ...current, qa_review_notes: value }))} />
                      </FormGrid>
                      <div className="row-actions wrap">
                        <button className="secondary-button" type="button" onClick={() => void saveVisitDocumentation(false)}>
                          Save documentation
                        </button>
                        <button className="primary-button" type="button" onClick={() => void saveVisitDocumentation(true)}>
                          Submit to QA review
                        </button>
                      </div>
                    </Panel>
                  </div>
                )}
                {clinicianWorkspaceTab === 'field' && (
                  <div className="content-grid">
                    <Panel title="Field Visit Actions" subtitle="Location-based check-in/out with offline queueing.">
                      <div className="stack">
                        {clinicianVisits.map((visit) => (
                          <div key={visit.id} className="action-row">
                            <div>
                              <strong>
                                {visit.patient_name} · {visit.visit_type.toUpperCase()} {visit.discipline}
                              </strong>
                              <p className="muted">
                                {visit.scheduled_start} · {visit.clinician_name}
                              </p>
                              <p className="muted">
                                Documentation: {labelizeValue(visit.documentation_status ?? 'pending')}
                                {visit.reassigned_from_clinician ? ` · Reassigned from ${visit.reassigned_from_clinician}` : ''}
                              </p>
                              {visit.documentation_summary ? <p className="muted">Summary: {visit.documentation_summary}</p> : null}
                              {visit.follow_up_plan ? <p className="muted">Follow-up: {visit.follow_up_plan}</p> : null}
                              {visit.missed_reason ? <p className="muted">Missed reason: {visit.missed_reason}</p> : null}
                              {visit.qa_review_notes ? <p className="muted">QA notes: {visit.qa_review_notes}</p> : null}
                            </div>
                            <div className="row-actions wrap">
                              <span className={`pill ${visit.documentation_status === 'qa_review' || visit.documentation_status === 'exception_review' ? 'warn' : 'neutral'}`}>
                                {visit.documentation_status ?? 'pending'}
                              </span>
                              <span className={`pill ${visit.sync_status === 'queued' ? 'warn' : 'neutral'}`}>{visit.sync_status}</span>
                              <button className="secondary-button" type="button" onClick={() => loadVisitDocumentationForm(visit)}>
                                Document
                              </button>
                              <button className="secondary-button" type="button" onClick={() => prepareScheduleChange(visit)}>
                                Prep reschedule
                              </button>
                              <button className="secondary-button" type="button" onClick={() => void markVisitMissed(visit)}>
                                Missed
                              </button>
                              <button className="secondary-button" onClick={() => void visitAction(visit, 'check-in')}>
                                Check in
                              </button>
                              <button className="primary-button" onClick={() => void visitAction(visit, 'check-out')}>
                                Check out
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </div>
                )}
              </div>
  )
}
