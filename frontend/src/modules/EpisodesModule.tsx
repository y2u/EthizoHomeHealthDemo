import type { ModuleProps } from './moduleTypes'
import { EmptyState, FieldNote, FormGrid, Input, KeyValue, Modal, Panel, Select, TaskOwnershipEditor, TextArea, WorkflowTabs, WorkspaceHeader } from '../components/ui'
import { formatContact, formatDueAt, formatFileSize, formatNamePhone, formatServiceLocation, formatStateCode, formatTaskAssignee, formatUsPhone, formatZipCode, labelizeValue } from '../domain/formatters'
import { normalizeAdmissionSnapshot } from '../domain/normalizers'

const REFERRAL_DOCUMENT_TYPES = ['face_to_face', 'physician_orders', 'insurance_card', 'medicare_card', 'plan_of_care', 'referral_packet', 'other'] as const
const REFERRAL_DOCUMENT_STATUSES = ['requested', 'received', 'reviewed', 'signed', 'rejected'] as const
const PHYSICIAN_ORDER_SCOPES = ['admission', 'plan_of_care', 'recertification', 'resume_of_care'] as const
const PHYSICIAN_ORDER_STATUSES = ['draft', 'sent_for_signature', 'received', 'signed', 'superseded'] as const
const HOMEBOUND_STATUS_OPTIONS = ['homebound', 'limited', 'not_homebound', 'pending'] as const
const FALL_RISK_OPTIONS = ['low', 'moderate', 'high'] as const
const HOSPITALIZATION_RISK_OPTIONS = ['routine', 'elevated', 'high'] as const

export function EpisodesModule({ controller }: ModuleProps) {
  const {
    dataset,
    episodeWorkspaceTab,
    setEpisodeWorkspaceTab,
    episodeModal,
    setEpisodeModal,
    assessmentForm,
    setAssessmentForm,
    editingAssessmentId,
    assessmentSpeechDraft,
    setAssessmentSpeechDraft,
    assessmentSpeechDetectedFields,
    setAssessmentSpeechDetectedFields,
    isAssessmentListening,
    lifecycleForm,
    setLifecycleForm,
    intakeQueueOwnerFilter,
    setIntakeQueueOwnerFilter,
    intakeQueueBlockerFilter,
    setIntakeQueueBlockerFilter,
    intakeDocumentationForm,
    setIntakeDocumentationForm,
    referralDocumentForm,
    setReferralDocumentForm,
    editingReferralDocumentId,
    referralDocumentAttachment,
    setReferralDocumentAttachment,
    orderForm,
    setOrderForm,
    editingOrderId,
    orderDraftHighlights,
    episodeAdmissionForm,
    setEpisodeAdmissionForm,
    oasisSubmissionForm,
    setOasisSubmissionForm,
    planOfCareForm,
    setPlanOfCareForm,
    communicationLogForm,
    setCommunicationLogForm,
    verbalOrderForm,
    setVerbalOrderForm,
    aideSupervisionForm,
    setAideSupervisionForm,
    incidentForm,
    setIncidentForm,
    infectionForm,
    setInfectionForm,
    authorizationForm,
    setAuthorizationForm,
    eligibilityForm,
    setEligibilityForm,
    dmeSupplyForm,
    setDmeSupplyForm,
    caseConferenceForm,
    setCaseConferenceForm,
    openEpisodeWorkspaceModal,
    syncEpisodeAdmissionForm,
    applyAssessmentSpeechTranscript,
    stopAssessmentDictation,
    startAssessmentDictation,
    resetAssessmentForm,
    loadAssessmentIntoForm,
    resetReferralDocumentForm,
    resetOrderForm,
    loadOasisSubmissionIntoForm,
    loadPlanOfCareIntoForm,
    loadReferralDocumentIntoForm,
    loadOrderIntoForm,
    autofillPhysicianOrderDraft,
    applyEpisodeContext,
    resolveNextEpisodeBlocker,
    updateReferralIntakeDocumentation,
    saveReferralDocument,
    savePhysicianOrder,
    downloadReferralDocument,
    saveEpisodeAdmissionDetails,
    addAssessment,
    activateEpisode,
    runLifecycleTransition,
    assignmentDraftForTask,
    setQaAssignmentDraft,
    saveQaTaskAssignment,
    escalateQaTask,
    prepareOasisSubmissionForSelectedEpisode,
    runOasisSubmissionAction,
    generatePlanOfCareForSelectedEpisode,
    savePlanOfCare,
    saveCommunicationLogEntry,
    saveVerbalOrder,
    saveAideSupervision,
    saveIncident,
    saveInfectionLog,
    saveAuthorization,
    saveEligibilityCheck,
    saveDmeSupplyOrder,
    saveCaseConference,
    selectedEpisode,
    selectedReferral,
    selectedEpisodeVerbalOrders,
    selectedEpisodeAideSupervision,
    selectedEpisodeIncidents,
    selectedEpisodeInfections,
    selectedEpisodeAuthorizations,
    selectedEpisodeEligibilityChecks,
    selectedEpisodeDmeSupplyOrders,
    selectedEpisodeCaseConferences,
    episodeReadiness,
    episodeReviewSummary,
    episodeInsights,
    episodeNextActionRecommendation,
    selectedEpisodeSnapshot,
    selectedEpisodeIntake,
    selectedEpisodeDocuments,
    selectedEpisodeOrders,
    selectedEpisodeOasisSubmissions,
    selectedEpisodePlansOfCare,
    selectedEpisodeCommunicationEntries,
    filteredEpisodeIntakeQueue,
    speechRecognitionSupported,
    deriveAdmissionSnapshot,
    summarizeIntakeReadiness,
    toApiDateTime,
    currentDateInputValue,
    currentDateTimeInputValue,
  } = controller

  return (
    <div className="module-stack">
                <WorkspaceHeader
                  eyebrow="Episodes"
                  title="Episode Workspace"
                  subtitle="Move between admission, clinical, and review work without losing the current episode context."
                  meta={
                    <>
                      <span className="pill neutral">{dataset.episodes.length} episodes</span>
                      {selectedEpisode ? <span className="pill neutral">{labelizeValue(selectedEpisode.episode_status)}</span> : null}
                      {selectedEpisode?.pdgm_group_code ? <span className="pill neutral">{selectedEpisode.pdgm_group_code}</span> : null}
                    </>
                  }
                  actions={
                    selectedEpisode ? (
                      <>
                        <button className="secondary-button" type="button" onClick={() => setEpisodeModal('lifecycle')}>
                          Lifecycle actions
                        </button>
                        <button className="primary-button" type="button" onClick={() => void activateEpisode(selectedEpisode.id)}>
                          Activate episode
                        </button>
                      </>
                    ) : undefined
                  }
                >
                  <WorkflowTabs
                    tabs={[
                      { label: 'Clinical', value: 'clinical' },
                      { label: 'Admission', value: 'admission' },
                      { label: 'Review', value: 'review' },
                    ]}
                    activeTab={episodeWorkspaceTab}
                    onChange={(value) => setEpisodeWorkspaceTab(value as 'clinical' | 'admission' | 'review')}
                  />
                </WorkspaceHeader>
                <div className={`content-grid episodes-grid episodes-${episodeWorkspaceTab}`}>
                {episodeWorkspaceTab === 'clinical' && (
                <Panel
                  title="Clinical Workspace"
                  subtitle="Review assessments from the board and open the full SOC/OASIS workflow only when you need to chart or edit."
                  tone="emphasis"
                >
                  {selectedEpisode ? (
                    <div className="detail-stack">
                      <div className="episode-focus-banner">
                        <div>
                          <strong>{selectedEpisode.patient_name}</strong>
                          <p className="muted">Episode {selectedEpisode.id} · {labelizeValue(selectedEpisode.episode_status)}</p>
                        </div>
                        <div className="row-actions wrap">
                          <span className="pill neutral">{selectedEpisode.oasis_version_required ?? 'OASIS pending'}</span>
                        </div>
                      </div>
                      <KeyValue label="Selected episode" value={`${selectedEpisode.patient_name} · Episode ${selectedEpisode.id}`} />
                      <KeyValue label="Episode status" value={labelizeValue(selectedEpisode.episode_status)} />
                      <KeyValue label="Required OASIS" value={selectedEpisode.oasis_version_required ?? 'Pending'} />
                      <div className="row-actions wrap">
                        <button className="primary-button" type="button" onClick={() => openEpisodeWorkspaceModal('assessment')}>
                          Open SOC and OASIS
                        </button>
                        <button className="secondary-button" onClick={() => void activateEpisode(selectedEpisode.id)}>
                          Activate current episode
                        </button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode to start clinical work." />
                  )}
                  <div className="stack">
                    {dataset.assessments
                      .filter((assessment) => assessment.episode_id === Number(assessmentForm.episode_id))
                      .sort((left, right) => right.completed_at.localeCompare(left.completed_at))
                      .map((assessment) => (
                        <div key={assessment.id} className="action-row">
                          <div>
                            <strong>{labelizeValue(assessment.assessment_type)} · {assessment.oasis_version}</strong>
                            <p className="muted">
                              {assessment.principal_diagnosis_code} · Functional {assessment.functional_score} · {labelizeValue(assessment.status)}
                            </p>
                            <p className="muted">
                              Homebound: {labelizeValue(assessment.homebound_status ?? 'pending')} · Medication reconciliation: {assessment.medication_reconciliation_completed ? 'Completed' : 'Pending'}
                            </p>
                            {assessment.clinical_summary ? <p className="muted">{assessment.clinical_summary}</p> : null}
                          </div>
                          <div className="row-actions">
                            <span className="pill neutral">{assessment.oasis_version}</span>
                            <button className="secondary-button" type="button" onClick={() => loadAssessmentIntoForm(assessment)}>
                              Edit assessment
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </Panel>
                )}
                {episodeWorkspaceTab === 'clinical' && (
                <Panel
                  title="Clinical Decision Support"
                  subtitle="Use demo-ready alerts and integrity scoring to spot risky charting gaps before QA or billing finds them later."
                  tone="soft"
                >
                  {selectedEpisode && episodeInsights ? (
                    <div className="detail-stack">
                      <KeyValue label="Assessment integrity" value={`${episodeInsights.documentation_integrity.assessment_score}%`} />
                      <KeyValue label="Visit integrity" value={`${episodeInsights.documentation_integrity.visit_score}%`} />
                      <KeyValue label="Overall score" value={`${episodeInsights.documentation_integrity.overall_score}%`} />
                      <div className="stack episode-review-section">
                        <strong>Clinical alerts</strong>
                        {episodeInsights.clinical_decision_support.length > 0 ? (
                          episodeInsights.clinical_decision_support.map((alert, index) => (
                            <div key={`${alert.summary}-${index}`} className="timeline-step">
                              <strong>{labelizeValue(alert.severity)}</strong>: {alert.summary} Next: {alert.resolution_hint}
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No clinical decision-support alerts are currently flagged for this episode." />
                        )}
                      </div>
                      <div className="stack episode-review-section">
                        <strong>Integrity blockers</strong>
                        {episodeInsights.documentation_integrity.blockers.length > 0 ? (
                          episodeInsights.documentation_integrity.blockers.map((blocker) => <div key={blocker} className="timeline-step">{blocker}</div>)
                        ) : (
                          <EmptyState text="No documentation-integrity blockers are currently preventing a clean release." />
                        )}
                      </div>
                      <div className="stack episode-review-section">
                        <strong>Warnings</strong>
                        {episodeInsights.documentation_integrity.warnings.length > 0 ? (
                          episodeInsights.documentation_integrity.warnings.map((warning) => <div key={warning} className="timeline-step">{warning}</div>)
                        ) : (
                          <EmptyState text="No additional integrity warnings are currently surfaced." />
                        )}
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode to load decision-support and documentation-integrity details." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'review' && (
                <Panel title="Episode Board" subtitle="NOA timing, PDGM grouping, and certification periods." tone="soft" density="compact">
                  <div className="stack">
                    {dataset.episodes.map((episode) => (
                      (() => {
                        const snapshot =
                          normalizeAdmissionSnapshot(episode.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, dataset.referrals)
                        const intakeStatus = summarizeIntakeReadiness(snapshot)
                        return (
                          <div key={episode.id} className={selectedEpisode?.id === episode.id ? 'episode-card selected' : 'episode-card'}>
                            <div className="episode-card-header">
                              <strong>{episode.patient_name}</strong>
                              <div className="row-actions wrap">
                                <span className="pill neutral">{labelizeValue(episode.episode_status)}</span>
                              </div>
                            </div>
                            <p className="muted">
                              Cert {episode.cert_start_date} to {episode.cert_end_date}
                            </p>
                            <div className="detail-stack">
                              <KeyValue label="Status" value={episode.episode_status} />
                              <KeyValue label="OASIS" value={episode.oasis_version_required ?? 'Pending'} />
                              <KeyValue label="PDGM" value={episode.pdgm_group_code ?? 'Pending'} />
                              <KeyValue label="NOA due" value={episode.noa_due_date ?? 'Pending'} />
                            </div>
                            <div className="row-actions wrap">
                              {intakeStatus.badges.map((badge) => (
                                <span key={`${episode.id}-${badge.label}`} className={`pill ${badge.tone}`}>
                                  {badge.label}
                                </span>
                              ))}
                            </div>
                            <div className="row-actions">
                              <button className="secondary-button" onClick={() => applyEpisodeContext(episode)}>
                                Use this episode
                              </button>
                              <button className="secondary-button" onClick={() => void activateEpisode(episode.id)}>
                                Activate this episode
                              </button>
                            </div>
                          </div>
                        )
                      })()
                    ))}
                  </div>
                </Panel>
                )}
                {episodeWorkspaceTab === 'admission' && (
                <Panel
                  title="Admission Readiness Summary"
                  subtitle="Inherited referral intake details that follow the episode into admission and SOC prep."
                  tone="emphasis"
                >
                  {selectedEpisode && selectedEpisodeSnapshot ? (
                    <div className="detail-stack">
                      <div className="episode-focus-banner">
                        <div>
                          <strong>{selectedEpisode.patient_name}</strong>
                          <p className="muted">Admission readiness snapshot for Episode {selectedEpisode.id}</p>
                        </div>
                        <div className="row-actions wrap">
                          <span className={`pill ${selectedEpisodeSnapshot.physician_orders_signed ? 'neutral' : 'warn'}`}>
                            {selectedEpisodeSnapshot.physician_orders_signed ? 'Orders signed' : 'Orders pending'}
                          </span>
                        </div>
                      </div>
                      <KeyValue label="Referral source" value={selectedEpisodeSnapshot.referral_source ?? 'Not captured'} />
                      <KeyValue label="Admission source" value={selectedEpisodeSnapshot.admission_source ?? 'Not captured'} />
                      <KeyValue label="Face-to-face" value={selectedEpisodeSnapshot.face_to_face_date ?? 'Not captured'} />
                      <KeyValue
                        label="Signed orders"
                        value={selectedEpisodeSnapshot.physician_orders_signed ? `Received${selectedEpisodeSnapshot.physician_orders_signed_at ? ` · ${selectedEpisodeSnapshot.physician_orders_signed_at}` : ''}` : 'Pending'}
                      />
                      <KeyValue label="Referring provider" value={formatNamePhone(selectedEpisodeSnapshot.referring_provider_name, selectedEpisodeSnapshot.referring_provider_phone)} />
                      <KeyValue label="PCP" value={formatNamePhone(selectedEpisodeSnapshot.pcp_name, selectedEpisodeSnapshot.pcp_phone)} />
                      <KeyValue label="Caregiver" value={formatContact(selectedEpisodeSnapshot.caregiver_name, selectedEpisodeSnapshot.caregiver_relationship, selectedEpisodeSnapshot.caregiver_phone)} />
                      <KeyValue label="Disciplines" value={(selectedEpisodeSnapshot.requested_disciplines ?? []).join(', ') || 'Not captured'} />
                      <KeyValue label="Orders" value={selectedEpisodeSnapshot.order_status ?? 'Not captured'} />
                      <KeyValue label="Service location" value={formatServiceLocation(selectedEpisodeSnapshot)} />
                      <KeyValue label="Notes" value={selectedEpisodeSnapshot.notes ?? 'No intake notes captured'} />
                      <KeyValue label="Referral documents" value={String(selectedEpisodeDocuments.length)} />
                      <KeyValue label="Physician order packets" value={String(selectedEpisodeOrders.length)} />
                      <div className="row-actions wrap">
                        <button
                          className="secondary-button"
                          onClick={() =>
                            void updateReferralIntakeDocumentation(
                              selectedEpisode,
                              { face_to_face_date: intakeDocumentationForm.face_to_face_date },
                              'Face-to-face documentation recorded.',
                            )
                          }
                        >
                          Mark face-to-face received
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() =>
                            void updateReferralIntakeDocumentation(
                              selectedEpisode,
                              {
                                physician_orders_signed: true,
                                physician_orders_signed_at: toApiDateTime(intakeDocumentationForm.physician_orders_signed_at),
                                order_status: 'signed',
                              },
                              'Signed physician orders recorded.',
                            )
                          }
                        >
                          Mark signed orders received
                        </button>
                        <button className="primary-button" type="button" onClick={() => openEpisodeWorkspaceModal('admission')}>
                          Edit admission details
                        </button>
                        <button className="secondary-button" type="button" onClick={() => openEpisodeWorkspaceModal('documents')}>
                          Manage referral documents
                        </button>
                        <button className="secondary-button" type="button" onClick={() => openEpisodeWorkspaceModal('orders')}>
                          Manage physician orders
                        </button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode to review inherited admission-readiness details." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'admission' && (
                <Panel
                  title="Supporting Records"
                  subtitle="Keep document and order management available without leaving the episode, but open the heavy workflows only when needed."
                  tone="soft"
                  density="compact"
                >
                  {selectedReferral ? (
                    <div className="stack">
                      <div className="row-actions wrap">
                        <button className="primary-button" type="button" onClick={() => openEpisodeWorkspaceModal('documents')}>
                          Open document tracker
                        </button>
                        <button className="secondary-button" type="button" onClick={() => openEpisodeWorkspaceModal('orders')}>
                          Open physician orders
                        </button>
                      </div>
                      <div className="stack">
                        {selectedEpisodeDocuments.length > 0 ? (
                          selectedEpisodeDocuments.slice(0, 3).map((document) => (
                            <div key={document.id} className="action-row">
                              <div>
                                <strong>{labelizeValue(document.document_type)}</strong>
                                <p className="muted">
                                  {labelizeValue(document.document_status)} · {document.source_name ?? 'Source not captured'}
                                </p>
                                <p className="muted">
                                  Received: {document.received_at ?? 'Not captured'} · Signed: {document.signed_at ?? 'Not captured'}
                                </p>
                                <p className="muted">
                                  Attachment: {document.original_file_name ?? 'No file attached'}
                                  {document.file_size ? ` · ${formatFileSize(document.file_size)}` : ''}
                                </p>
                                {document.document_note ? <p className="muted">{document.document_note}</p> : null}
                              </div>
                              <div className="row-actions wrap">
                                <span className={`pill ${document.document_status === 'signed' || document.document_status === 'reviewed' ? 'neutral' : 'warn'}`}>
                                  {labelizeValue(document.document_status)}
                                </span>
                                <button className="secondary-button" type="button" onClick={() => loadReferralDocumentIntoForm(document)}>
                                  Open document
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No referral documents have been captured yet for this intake record." />
                        )}
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode linked to a referral to manage intake documents." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'admission' && (
                <Panel
                  title="Order Snapshot"
                  subtitle="Review active order status at a glance and open the full order workspace only when you need to update a packet."
                  tone="soft"
                  density="compact"
                >
                  {selectedEpisode ? (
                    <div className="stack">
                      <div className="row-actions wrap">
                        <button className="primary-button" type="button" onClick={() => openEpisodeWorkspaceModal('orders')}>
                          Open physician order workflow
                        </button>
                      </div>
                      {orderDraftHighlights.length > 0 ? (
                        <div className="stack">
                          <FieldNote text="Recent chart highlights included in this draft:" />
                          {orderDraftHighlights.map((highlight, index) => (
                            <p key={`${highlight}-${index}`} className="muted">
                              {highlight}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <div className="stack">
                        {selectedEpisodeOrders.length > 0 ? (
                          selectedEpisodeOrders.slice(0, 3).map((order) => (
                            <div key={order.id} className="action-row">
                              <div>
                                <strong>{labelizeValue(order.order_scope)} · v{order.version_number}</strong>
                                <p className="muted">
                                  {labelizeValue(order.order_status)} · {order.active ? 'Active' : 'Superseded'}
                                </p>
                                <p className="muted">
                                  Sent: {order.sent_at ?? 'Not captured'} · Received: {order.received_at ?? 'Not captured'} · Signed: {order.signed_at ?? 'Not captured'}
                                </p>
                                <p className="muted">
                                  Signer: {order.signer_name ?? 'Not captured'}
                                </p>
                                {order.order_summary ? <p className="muted">{order.order_summary}</p> : null}
                                {order.order_note ? <p className="muted">{order.order_note}</p> : null}
                              </div>
                              <div className="row-actions wrap">
                                <span className={`pill ${order.order_status === 'signed' ? 'neutral' : 'warn'}`}>
                                  {labelizeValue(order.order_status)}
                                </span>
                                <button className="secondary-button" type="button" onClick={() => loadOrderIntoForm(order)}>
                                  Open order
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No physician order packets have been created for this episode yet." />
                        )}
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode to manage physician order packets." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'admission' && (
                <Panel
                  title="Care Coordination and Communication"
                  subtitle="Track provider, caregiver, and internal handoff communication directly on the episode and assign follow-up ownership."
                  tone="soft"
                >
                  {selectedEpisode ? (
                    <div className="content-grid">
                      <div className="stack">
                        {selectedEpisodeCommunicationEntries.length > 0 ? (
                          selectedEpisodeCommunicationEntries.map((entry) => (
                            <div key={entry.id} className="action-row">
                              <div>
                                <strong>{entry.contact_name}</strong>
                                <p className="muted">
                                  {entry.contact_role ?? 'Contact'} · {labelizeValue(entry.method)} · {entry.topic}
                                </p>
                                {entry.outcome ? <p className="muted">{entry.outcome}</p> : null}
                                <p className="muted">
                                  Follow-up: {entry.follow_up_owner ?? 'None assigned'} · {entry.follow_up_due_at ?? 'No due date'}
                                </p>
                              </div>
                              <div className="row-actions wrap">
                                <span className={`pill ${entry.status === 'follow_up_due' ? 'warn' : 'neutral'}`}>{labelizeValue(entry.status)}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No communication log entries are recorded for this episode yet." />
                        )}
                      </div>
                      <div className="stack">
                        <strong>Add communication entry</strong>
                        <FormGrid>
                          <Input label="Contact name" value={communicationLogForm.contact_name} onChange={(value) => setCommunicationLogForm((current) => ({ ...current, contact_name: value }))} />
                          <Input label="Contact role" value={communicationLogForm.contact_role} onChange={(value) => setCommunicationLogForm((current) => ({ ...current, contact_role: value }))} />
                          <Input label="Method" value={communicationLogForm.method} onChange={(value) => setCommunicationLogForm((current) => ({ ...current, method: value }))} />
                          <Input label="Topic" value={communicationLogForm.topic} onChange={(value) => setCommunicationLogForm((current) => ({ ...current, topic: value }))} />
                          <Input label="Outcome" value={communicationLogForm.outcome} onChange={(value) => setCommunicationLogForm((current) => ({ ...current, outcome: value }))} />
                          <Input label="Follow-up owner" value={communicationLogForm.follow_up_owner} onChange={(value) => setCommunicationLogForm((current) => ({ ...current, follow_up_owner: value }))} />
                          <Input label="Follow-up due" type="datetime-local" value={communicationLogForm.follow_up_due_at} onChange={(value) => setCommunicationLogForm((current) => ({ ...current, follow_up_due_at: value }))} />
                        </FormGrid>
                        <button className="primary-button" type="button" onClick={() => void saveCommunicationLogEntry()}>
                          Log communication
                        </button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode to manage care-coordination communication." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'review' && (
                <Panel
                  title="Episode Readiness"
                  subtitle="See why activation or billing progression is blocked before chasing the wrong step."
                  tone="emphasis"
                >
                  {selectedEpisode && episodeReadiness ? (
                    <div className="detail-stack">
                      <div className="episode-focus-banner">
                        <div>
                          <strong>{selectedEpisode.patient_name}</strong>
                          <p className="muted">Activation readiness for Episode {selectedEpisode.id}</p>
                        </div>
                        <div className="row-actions wrap">
                          <span className={`pill ${episodeReadiness.ready_to_activate ? 'neutral' : 'warn'}`}>
                            {episodeReadiness.ready_to_activate ? 'Ready to activate' : 'Blocked'}
                          </span>
                        </div>
                      </div>
                      <KeyValue label="SOC visit completed" value={episodeReadiness.soc_visit_completed ? 'Yes' : 'No'} />
                      <KeyValue label="Final OASIS exists" value={episodeReadiness.finalized_assessment_exists ? 'Yes' : 'No'} />
                      <KeyValue label="Face-to-face on file" value={selectedEpisodeIntake.faceToFaceComplete ? 'Yes' : 'No'} />
                      <KeyValue label="Signed orders on file" value={selectedEpisodeIntake.signedOrdersComplete ? 'Yes' : 'No'} />
                      <KeyValue label="Open QA tasks" value={String(episodeReadiness.open_qa_tasks)} />
                      <KeyValue label="Pending EVV records" value={String(episodeReadiness.pending_evv_records)} />
                      <KeyValue label="Claim holds" value={String(episodeReadiness.claim_holds)} />
                      <KeyValue label="Ready to activate" value={episodeReadiness.ready_to_activate ? 'Yes' : 'No'} />
                      <div className="row-actions wrap">
                        {selectedEpisodeIntake.badges.map((badge) => (
                          <span key={badge.label} className={`pill ${badge.tone}`}>
                            {badge.label}
                          </span>
                        ))}
                      </div>
                      <div className="stack">
                        {episodeReadiness.blockers.length > 0 ? (
                          episodeReadiness.blockers.map((blocker) => <div key={blocker} className="timeline-step">{blocker}</div>)
                        ) : (
                          <EmptyState text="No current blockers for activation readiness." />
                        )}
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode to load readiness details." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'review' && (
                <Panel
                  title="Orders, Aide Supervision, and Event Controls"
                  subtitle="Manage verbal orders, aide supervision, incidents, and infection surveillance before QA release or billing."
                  tone="soft"
                >
                  {selectedEpisode ? (
                    <div className="content-grid">
                      <div className="stack">
                        <strong>Verbal and oral orders</strong>
                        {selectedEpisodeVerbalOrders.length > 0 ? (
                          selectedEpisodeVerbalOrders.map((order) => (
                            <div key={`verbal-order-${order.id}`} className="action-row">
                              <div>
                                <strong>{order.ordered_service ?? 'Verbal order'}</strong>
                                <p className="muted">
                                  {order.physician_name} · {labelizeValue(order.status)} · Received {order.received_at ?? 'Pending'}
                                </p>
                                <p className="muted">
                                  Read-back: {order.read_back_completed ? 'Completed' : 'Pending'} · Signature: {order.physician_signed_at ?? 'Pending'}
                                </p>
                                <p className="muted">{order.order_summary}</p>
                              </div>
                              <span className={`pill ${order.status === 'signed' ? 'neutral' : 'warn'}`}>{labelizeValue(order.status)}</span>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No verbal orders are tracked for this episode." />
                        )}
                        <FormGrid>
                          <Input label="Physician" value={verbalOrderForm.physician_name} onChange={(value) => setVerbalOrderForm((current) => ({ ...current, physician_name: value }))} />
                          <Input label="Source" value={verbalOrderForm.order_source} onChange={(value) => setVerbalOrderForm((current) => ({ ...current, order_source: value }))} />
                          <Input label="Ordered service" value={verbalOrderForm.ordered_service} onChange={(value) => setVerbalOrderForm((current) => ({ ...current, ordered_service: value }))} />
                          <Input label="Received by" value={verbalOrderForm.received_by} onChange={(value) => setVerbalOrderForm((current) => ({ ...current, received_by: value }))} />
                          <Input label="Received at" type="datetime-local" value={verbalOrderForm.received_at} onChange={(value) => setVerbalOrderForm((current) => ({ ...current, received_at: value }))} />
                          <Select
                            label="Read-back"
                            value={verbalOrderForm.read_back_completed}
                            onChange={(value) => setVerbalOrderForm((current) => ({ ...current, read_back_completed: value }))}
                            options={[
                              { label: 'Completed', value: 'yes' },
                              { label: 'Pending', value: 'no' },
                            ]}
                          />
                          <Input label="Status" value={verbalOrderForm.status} onChange={(value) => setVerbalOrderForm((current) => ({ ...current, status: value }))} />
                          <Input label="Summary" value={verbalOrderForm.order_summary} onChange={(value) => setVerbalOrderForm((current) => ({ ...current, order_summary: value }))} />
                        </FormGrid>
                        <button className="secondary-button" type="button" onClick={() => void saveVerbalOrder()}>
                          Add verbal order
                        </button>
                        <strong>HHA supervision</strong>
                        {selectedEpisodeAideSupervision.length > 0 ? (
                          selectedEpisodeAideSupervision.map((event) => (
                            <div key={`aide-supervision-${event.id}`} className="action-row">
                              <div>
                                <strong>{event.aide_name}</strong>
                                <p className="muted">
                                  {event.supervising_clinician ?? 'Supervisor pending'} · {labelizeValue(event.status)} · Next due {event.next_due_at ?? 'Not scheduled'}
                                </p>
                                <p className="muted">{event.care_plan_tasks ?? 'Care-plan tasks not captured.'}</p>
                              </div>
                              <span className={`pill ${event.status === 'completed' ? 'neutral' : 'warn'}`}>{labelizeValue(event.status)}</span>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="No aide supervision events are tracked for this episode." />
                        )}
                        <FormGrid>
                          <Input label="Aide" value={aideSupervisionForm.aide_name} onChange={(value) => setAideSupervisionForm((current) => ({ ...current, aide_name: value }))} />
                          <Input label="Supervisor" value={aideSupervisionForm.supervising_clinician} onChange={(value) => setAideSupervisionForm((current) => ({ ...current, supervising_clinician: value }))} />
                          <Input label="Supervised at" type="datetime-local" value={aideSupervisionForm.supervised_at} onChange={(value) => setAideSupervisionForm((current) => ({ ...current, supervised_at: value }))} />
                          <Input label="Next due" type="datetime-local" value={aideSupervisionForm.next_due_at} onChange={(value) => setAideSupervisionForm((current) => ({ ...current, next_due_at: value }))} />
                          <Input label="Care-plan tasks" value={aideSupervisionForm.care_plan_tasks} onChange={(value) => setAideSupervisionForm((current) => ({ ...current, care_plan_tasks: value }))} />
                          <Input label="Findings" value={aideSupervisionForm.findings} onChange={(value) => setAideSupervisionForm((current) => ({ ...current, findings: value }))} />
                        </FormGrid>
                        <button className="secondary-button" type="button" onClick={() => void saveAideSupervision()}>
                          Record supervision
                        </button>
                      </div>
                      <div className="stack">
                        <strong>Incidents and infections</strong>
                        {[...selectedEpisodeIncidents, ...selectedEpisodeInfections].length > 0 ? (
                          <>
                            {selectedEpisodeIncidents.map((incident) => (
                              <div key={`incident-${incident.id}`} className="action-row">
                                <div>
                                  <strong>{labelizeValue(incident.event_type)}</strong>
                                  <p className="muted">
                                    {labelizeValue(incident.severity ?? 'severity pending')} · {labelizeValue(incident.status)} · {incident.occurred_at ?? 'Date pending'}
                                  </p>
                                  <p className="muted">{incident.description ?? 'No description recorded.'}</p>
                                  <p className="muted">Follow-up: {incident.follow_up_owner ?? 'Unassigned'} · QAPI: {incident.qapi_linked ? 'Linked' : 'Not linked'}</p>
                                </div>
                                <span className={`pill ${incident.status === 'closed' ? 'neutral' : 'warn'}`}>{labelizeValue(incident.status)}</span>
                              </div>
                            ))}
                            {selectedEpisodeInfections.map((infection) => (
                              <div key={`infection-${infection.id}`} className="action-row">
                                <div>
                                  <strong>{labelizeValue(infection.infection_type)}</strong>
                                  <p className="muted">
                                    {labelizeValue(infection.status)} · Physician notified: {infection.physician_notified ? 'Yes' : 'No'} · {infection.identified_at ?? 'Date pending'}
                                  </p>
                                  <p className="muted">{infection.intervention_summary ?? 'No intervention summary recorded.'}</p>
                                </div>
                                <span className={`pill ${infection.status === 'closed' ? 'neutral' : 'warn'}`}>{labelizeValue(infection.status)}</span>
                              </div>
                            ))}
                          </>
                        ) : (
                          <EmptyState text="No incidents or infection logs are tracked for this episode." />
                        )}
                        <FormGrid>
                          <Input label="Incident type" value={incidentForm.event_type} onChange={(value) => setIncidentForm((current) => ({ ...current, event_type: value }))} />
                          <Input label="Severity" value={incidentForm.severity} onChange={(value) => setIncidentForm((current) => ({ ...current, severity: value }))} />
                          <Input label="Occurred at" type="datetime-local" value={incidentForm.occurred_at} onChange={(value) => setIncidentForm((current) => ({ ...current, occurred_at: value }))} />
                          <Input label="Description" value={incidentForm.description} onChange={(value) => setIncidentForm((current) => ({ ...current, description: value }))} />
                          <Input label="Follow-up owner" value={incidentForm.follow_up_owner} onChange={(value) => setIncidentForm((current) => ({ ...current, follow_up_owner: value }))} />
                          <Input label="Status" value={incidentForm.status} onChange={(value) => setIncidentForm((current) => ({ ...current, status: value }))} />
                        </FormGrid>
                        <button className="secondary-button" type="button" onClick={() => void saveIncident()}>
                          Record incident
                        </button>
                        <FormGrid>
                          <Input label="Infection type" value={infectionForm.infection_type} onChange={(value) => setInfectionForm((current) => ({ ...current, infection_type: value }))} />
                          <Input label="Identified at" type="datetime-local" value={infectionForm.identified_at} onChange={(value) => setInfectionForm((current) => ({ ...current, identified_at: value }))} />
                          <Input label="Source" value={infectionForm.source} onChange={(value) => setInfectionForm((current) => ({ ...current, source: value }))} />
                          <Input label="Interventions" value={infectionForm.intervention_summary} onChange={(value) => setInfectionForm((current) => ({ ...current, intervention_summary: value }))} />
                          <Input label="Status" value={infectionForm.status} onChange={(value) => setInfectionForm((current) => ({ ...current, status: value }))} />
                        </FormGrid>
                        <button className="secondary-button" type="button" onClick={() => void saveInfectionLog()}>
                          Record infection log
                        </button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode before managing orders, supervision, incidents, and infections." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'review' && (
                <Panel
                  title="Payer Controls, Supplies, and Case Conference"
                  subtitle="Keep eligibility, authorization limits, DME/supplies, and interdisciplinary conference notes tied to the episode."
                  tone="soft"
                >
                  {selectedEpisode ? (
                    <div className="content-grid">
                      <div className="stack">
                        <strong>Eligibility and authorizations</strong>
                        {selectedEpisodeEligibilityChecks.map((check) => (
                          <div key={`eligibility-${check.id}`} className="action-row">
                            <div>
                              <strong>{check.payer_type}</strong>
                              <p className="muted">
                                {labelizeValue(check.check_status)} · {check.checked_at ?? 'Check date pending'} · {check.response_reference ?? 'No response reference'}
                              </p>
                              <p className="muted">{check.coverage_summary ?? 'Coverage summary not captured.'}</p>
                            </div>
                            <span className={`pill ${check.check_status === 'eligible' ? 'neutral' : 'warn'}`}>{labelizeValue(check.check_status)}</span>
                          </div>
                        ))}
                        {selectedEpisodeAuthorizations.map((authorization) => (
                          <div key={`authorization-${authorization.id}`} className="action-row">
                            <div>
                              <strong>{authorization.authorization_number ?? authorization.payer_type}</strong>
                              <p className="muted">
                                {labelizeValue(authorization.status)} · {authorization.used_visits}/{authorization.authorized_visits ?? 0} visits used · Expires {authorization.expiration_date ?? 'Pending'}
                              </p>
                              <p className="muted">{authorization.verification_notes ?? 'No verification note captured.'}</p>
                            </div>
                            <span className={`pill ${authorization.status === 'approved' ? 'neutral' : 'warn'}`}>{labelizeValue(authorization.status)}</span>
                          </div>
                        ))}
                        <FormGrid>
                          <Input label="Payer" value={eligibilityForm.payer_type} onChange={(value) => setEligibilityForm((current) => ({ ...current, payer_type: value }))} />
                          <Input label="Eligibility status" value={eligibilityForm.check_status} onChange={(value) => setEligibilityForm((current) => ({ ...current, check_status: value }))} />
                          <Input label="Checked at" type="datetime-local" value={eligibilityForm.checked_at} onChange={(value) => setEligibilityForm((current) => ({ ...current, checked_at: value }))} />
                          <Input label="Coverage summary" value={eligibilityForm.coverage_summary} onChange={(value) => setEligibilityForm((current) => ({ ...current, coverage_summary: value }))} />
                        </FormGrid>
                        <button className="secondary-button" type="button" onClick={() => void saveEligibilityCheck()}>
                          Save eligibility
                        </button>
                        <FormGrid>
                          <Input label="Payer" value={authorizationForm.payer_type} onChange={(value) => setAuthorizationForm((current) => ({ ...current, payer_type: value }))} />
                          <Input label="Authorization #" value={authorizationForm.authorization_number} onChange={(value) => setAuthorizationForm((current) => ({ ...current, authorization_number: value }))} />
                          <Input label="Authorized visits" value={authorizationForm.authorized_visits} onChange={(value) => setAuthorizationForm((current) => ({ ...current, authorized_visits: value }))} />
                          <Input label="Used visits" value={authorizationForm.used_visits} onChange={(value) => setAuthorizationForm((current) => ({ ...current, used_visits: value }))} />
                          <Input label="Expires" type="date" value={authorizationForm.expiration_date} onChange={(value) => setAuthorizationForm((current) => ({ ...current, expiration_date: value }))} />
                          <Input label="Status" value={authorizationForm.status} onChange={(value) => setAuthorizationForm((current) => ({ ...current, status: value }))} />
                        </FormGrid>
                        <button className="secondary-button" type="button" onClick={() => void saveAuthorization()}>
                          Save authorization
                        </button>
                      </div>
                      <div className="stack">
                        <strong>DME, supplies, and case conferences</strong>
                        {selectedEpisodeDmeSupplyOrders.map((order) => (
                          <div key={`dme-${order.id}`} className="action-row">
                            <div>
                              <strong>{order.item_name}</strong>
                              <p className="muted">
                                {order.order_type} · {labelizeValue(order.status)} · Delivered {order.delivered_at ?? 'Pending'}
                              </p>
                              <p className="muted">
                                POC linked: {order.plan_of_care_linked ? 'Yes' : 'No'} · Usage documented: {order.usage_documented ? 'Yes' : 'No'}
                              </p>
                            </div>
                            <span className={`pill ${order.status === 'delivered' ? 'neutral' : 'warn'}`}>{labelizeValue(order.status)}</span>
                          </div>
                        ))}
                        {selectedEpisodeCaseConferences.map((conference) => (
                          <div key={`case-conference-${conference.id}`} className="action-row">
                            <div>
                              <strong>{conference.conference_date ?? 'Case conference'}</strong>
                              <p className="muted">{conference.participants ?? 'Participants pending'}</p>
                              <p className="muted">{conference.decisions ?? 'Decisions pending'}</p>
                              <p className="muted">Follow-up: {conference.follow_up_owner ?? 'Unassigned'} · {conference.follow_up_due_at ?? 'No due date'}</p>
                            </div>
                            <span className={`pill ${conference.status === 'completed' ? 'neutral' : 'warn'}`}>{labelizeValue(conference.status)}</span>
                          </div>
                        ))}
                        <FormGrid>
                          <Input label="Item" value={dmeSupplyForm.item_name} onChange={(value) => setDmeSupplyForm((current) => ({ ...current, item_name: value }))} />
                          <Input label="Type" value={dmeSupplyForm.order_type} onChange={(value) => setDmeSupplyForm((current) => ({ ...current, order_type: value }))} />
                          <Input label="Status" value={dmeSupplyForm.status} onChange={(value) => setDmeSupplyForm((current) => ({ ...current, status: value }))} />
                          <Input label="Delivered at" type="datetime-local" value={dmeSupplyForm.delivered_at} onChange={(value) => setDmeSupplyForm((current) => ({ ...current, delivered_at: value }))} />
                          <Input label="Billing relevance" value={dmeSupplyForm.billing_relevance} onChange={(value) => setDmeSupplyForm((current) => ({ ...current, billing_relevance: value }))} />
                        </FormGrid>
                        <button className="secondary-button" type="button" onClick={() => void saveDmeSupplyOrder()}>
                          Save DME/supply
                        </button>
                        <FormGrid>
                          <Input label="Conference date" type="datetime-local" value={caseConferenceForm.conference_date} onChange={(value) => setCaseConferenceForm((current) => ({ ...current, conference_date: value }))} />
                          <Input label="Participants" value={caseConferenceForm.participants} onChange={(value) => setCaseConferenceForm((current) => ({ ...current, participants: value }))} />
                          <Input label="Decisions" value={caseConferenceForm.decisions} onChange={(value) => setCaseConferenceForm((current) => ({ ...current, decisions: value }))} />
                          <Input label="Follow-up owner" value={caseConferenceForm.follow_up_owner} onChange={(value) => setCaseConferenceForm((current) => ({ ...current, follow_up_owner: value }))} />
                          <Input label="Status" value={caseConferenceForm.status} onChange={(value) => setCaseConferenceForm((current) => ({ ...current, status: value }))} />
                        </FormGrid>
                        <button className="secondary-button" type="button" onClick={() => void saveCaseConference()}>
                          Save case conference
                        </button>
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode before managing payer controls, supplies, and case conferences." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'review' && (
                <Panel
                  title="Pre-Bill Episode Summary"
                  subtitle="Review the whole episode story before pushing QA or billing down the wrong path."
                  tone="emphasis"
                >
                  {selectedEpisode && episodeReviewSummary ? (
                    <div className="detail-stack">
                      <div className="episode-focus-banner">
                        <div>
                          <strong>{selectedEpisode.patient_name}</strong>
                          <p className="muted">Pre-bill review for Episode {selectedEpisode.id}</p>
                        </div>
                        <div className="row-actions wrap">
                          <span className={`pill ${episodeReviewSummary.ready_to_bill ? 'neutral' : 'warn'}`}>
                            {episodeReviewSummary.ready_to_bill ? 'Ready to bill' : 'Billing blocked'}
                          </span>
                        </div>
                      </div>
                      {episodeNextActionRecommendation ? (
                        <div className="row-actions wrap">
                          <span className="pill warn">Next: {episodeNextActionRecommendation.label}</span>
                          <button className="secondary-button" type="button" onClick={() => resolveNextEpisodeBlocker(episodeReviewSummary, selectedEpisode)}>
                            Resolve next blocker
                          </button>
                        </div>
                      ) : null}
                      {episodeNextActionRecommendation ? <FieldNote text={episodeNextActionRecommendation.reason} /> : null}
                      <KeyValue label="Episode status" value={labelizeValue(episodeReviewSummary.episode_status)} />
                      <KeyValue label="Ready to activate" value={episodeReviewSummary.ready_to_activate ? 'Yes' : 'No'} />
                      <KeyValue label="Ready to bill" value={episodeReviewSummary.ready_to_bill ? 'Yes' : 'No'} />
                      <KeyValue label="Open QA tasks" value={String(episodeReviewSummary.open_qa_tasks)} />
                      <KeyValue label="Pending EVV" value={String(episodeReviewSummary.pending_evv_records)} />
                      <KeyValue label="Unsigned active orders" value={String(episodeReviewSummary.unsigned_active_orders)} />
                      <KeyValue label="Completed visits" value={String(episodeReviewSummary.completed_visits)} />
                      <KeyValue label="Locked visit charts" value={String(episodeReviewSummary.locked_visits)} />
                      <div className="stack episode-review-section">
                        <strong>Activation blockers</strong>
                        {episodeReviewSummary.activation_blockers.length > 0 ? (
                          episodeReviewSummary.activation_blockers.map((blocker) => <div key={`activation-${blocker}`} className="timeline-step">{blocker}</div>)
                        ) : (
                          <EmptyState text="No activation blockers remain." />
                        )}
                      </div>
                      <div className="stack episode-review-section">
                        <strong>Billing blockers</strong>
                        {episodeReviewSummary.billing_blockers.length > 0 ? (
                          episodeReviewSummary.billing_blockers.map((blocker) => <div key={`billing-${blocker}`} className="timeline-step">{blocker}</div>)
                        ) : (
                          <EmptyState text="No billing blockers remain." />
                        )}
                      </div>
                      <div className="stack episode-review-section">
                        <strong>Claim hold reasons</strong>
                        {episodeReviewSummary.hold_reasons.length > 0 ? (
                          episodeReviewSummary.hold_reasons.map((reason) => <div key={reason} className="timeline-step">{reason}</div>)
                        ) : (
                          <EmptyState text="No current claim holds are recorded." />
                        )}
                      </div>
                      <div className="stack episode-review-section">
                        <strong>Open QA work</strong>
                        {episodeReviewSummary.open_task_titles.length > 0 ? (
                          episodeReviewSummary.open_task_titles.map((title) => <div key={title} className="timeline-step">{title}</div>)
                        ) : (
                          <EmptyState text="No open QA tasks are tied to this episode." />
                        )}
                      </div>
                      <div className="stack episode-review-section">
                        <strong>Active order packets</strong>
                        {episodeReviewSummary.active_order_summaries.length > 0 ? (
                          episodeReviewSummary.active_order_summaries.map((summary) => <div key={summary} className="timeline-step">{summary}</div>)
                        ) : (
                          <EmptyState text="No active physician orders are currently attached to this episode." />
                        )}
                      </div>
                      <div className="stack episode-review-section">
                        <strong>Recent chart highlights</strong>
                        {episodeReviewSummary.recent_visit_highlights.length > 0 ? (
                          episodeReviewSummary.recent_visit_highlights.map((highlight) => <div key={highlight} className="timeline-step">{highlight}</div>)
                        ) : (
                          <EmptyState text="No recent documented visit highlights are available yet." />
                        )}
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode to load the pre-bill summary." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'review' && (
                <Panel
                  title="OASIS Submission Readiness"
                  subtitle="Prepare demo iQIES-ready export packages, track acknowledgments, and route rejected submissions back to QA."
                  tone="soft"
                >
                  {selectedEpisode ? (
                    <div className="stack">
                      <div className="row-actions wrap">
                        <button className="primary-button" type="button" onClick={() => void prepareOasisSubmissionForSelectedEpisode()}>
                          Prepare submission package
                        </button>
                      </div>
                      {selectedEpisodeOasisSubmissions.length > 0 ? (
                        selectedEpisodeOasisSubmissions.map((submission) => (
                          <div key={submission.id} className="action-row">
                            <div>
                              <strong>{submission.submission_reference ?? `Submission ${submission.id}`}</strong>
                              <p className="muted">
                                {labelizeValue(submission.submission_status)} · {submission.iqies_ready ? 'iQIES ready' : 'Needs completion'}
                              </p>
                              <p className="muted">{submission.readiness_notes ?? 'No readiness notes recorded.'}</p>
                              <p className="muted">
                                Submitted: {submission.submitted_at ?? 'Not submitted'} · Ack: {submission.acknowledgment_status ?? 'Pending'}
                              </p>
                            </div>
                            <div className="row-actions wrap">
                              <span className={`pill ${submission.iqies_ready ? 'neutral' : 'warn'}`}>{submission.iqies_ready ? 'Ready' : 'Draft'}</span>
                              <button className="secondary-button" type="button" onClick={() => loadOasisSubmissionIntoForm(submission)}>
                                Update submission
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState text="No OASIS submission packages have been prepared yet for this episode." />
                      )}
                      <FormGrid>
                        <Select
                          label="Submission"
                          value={oasisSubmissionForm.submission_id}
                          onChange={(value) => setOasisSubmissionForm((current) => ({ ...current, submission_id: value }))}
                          options={[
                            { label: 'Choose a submission', value: '' },
                            ...selectedEpisodeOasisSubmissions.map((submission) => ({
                              label: `${submission.submission_reference ?? `Submission ${submission.id}`} · ${labelizeValue(submission.submission_status)}`,
                              value: String(submission.id),
                            })),
                          ]}
                        />
                        <Select
                          label="Status"
                          value={oasisSubmissionForm.submission_status}
                          onChange={(value) => setOasisSubmissionForm((current) => ({ ...current, submission_status: value }))}
                          options={[
                            { label: 'Draft', value: 'draft' },
                            { label: 'Ready', value: 'ready' },
                            { label: 'Submitted', value: 'submitted' },
                            { label: 'Accepted', value: 'accepted' },
                            { label: 'Rejected', value: 'rejected' },
                          ]}
                        />
                        <Input
                          label="Acknowledgment note"
                          value={oasisSubmissionForm.acknowledgment_note}
                          onChange={(value) => setOasisSubmissionForm((current) => ({ ...current, acknowledgment_note: value }))}
                        />
                        <Input
                          label="Rejection note"
                          value={oasisSubmissionForm.rejection_note}
                          onChange={(value) => setOasisSubmissionForm((current) => ({ ...current, rejection_note: value }))}
                        />
                      </FormGrid>
                      <button className="secondary-button" type="button" onClick={() => void runOasisSubmissionAction()}>
                        Save submission update
                      </button>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode to manage OASIS submission readiness." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'review' && (
                <Panel
                  title="Plan of Care (485)"
                  subtitle="Generate a 485-style summary from assessment, orders, and recent charting, then maintain versioned physician review states."
                  tone="soft"
                >
                  {selectedEpisode ? (
                    <div className="stack">
                      <div className="row-actions wrap">
                        <button className="primary-button" type="button" onClick={() => void generatePlanOfCareForSelectedEpisode()}>
                          Generate plan of care
                        </button>
                      </div>
                      {selectedEpisodePlansOfCare.length > 0 ? (
                        selectedEpisodePlansOfCare.map((plan) => (
                          <div key={plan.id} className="action-row">
                            <div>
                              <strong>Version {plan.version_number}</strong>
                              <p className="muted">
                                {labelizeValue(plan.review_status)} · Effective {plan.effective_date ?? 'Pending'}
                              </p>
                              {plan.plan_summary ? <p className="muted">{plan.plan_summary}</p> : null}
                              {plan.goal_summary ? <p className="muted">Goals: {plan.goal_summary}</p> : null}
                            </div>
                            <div className="row-actions wrap">
                              <span className={`pill ${plan.review_status === 'approved' || plan.review_status === 'physician_reviewed' ? 'neutral' : 'warn'}`}>
                                {labelizeValue(plan.review_status)}
                              </span>
                              <button className="secondary-button" type="button" onClick={() => loadPlanOfCareIntoForm(plan)}>
                                Edit plan
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState text="No plan-of-care versions have been generated for this episode yet." />
                      )}
                      <FormGrid>
                        <Select
                          label="Plan"
                          value={planOfCareForm.plan_id}
                          onChange={(value) => setPlanOfCareForm((current) => ({ ...current, plan_id: value }))}
                          options={[
                            { label: 'Choose a plan', value: '' },
                            ...selectedEpisodePlansOfCare.map((plan) => ({ label: `Version ${plan.version_number} · ${labelizeValue(plan.review_status)}`, value: String(plan.id) })),
                          ]}
                        />
                        <Select
                          label="Review status"
                          value={planOfCareForm.review_status}
                          onChange={(value) => setPlanOfCareForm((current) => ({ ...current, review_status: value }))}
                          options={[
                            { label: 'Draft', value: 'draft' },
                            { label: 'Physician reviewed', value: 'physician_reviewed' },
                            { label: 'Approved', value: 'approved' },
                          ]}
                        />
                        <Input label="Plan summary" value={planOfCareForm.plan_summary} onChange={(value) => setPlanOfCareForm((current) => ({ ...current, plan_summary: value }))} />
                        <Input label="Goal summary" value={planOfCareForm.goal_summary} onChange={(value) => setPlanOfCareForm((current) => ({ ...current, goal_summary: value }))} />
                        <Input label="Intervention summary" value={planOfCareForm.intervention_summary} onChange={(value) => setPlanOfCareForm((current) => ({ ...current, intervention_summary: value }))} />
                        <Input label="Physician review note" value={planOfCareForm.physician_review_note} onChange={(value) => setPlanOfCareForm((current) => ({ ...current, physician_review_note: value }))} />
                      </FormGrid>
                      <textarea className="input-control" rows={5} value={planOfCareForm.printable_content} onChange={(event) => setPlanOfCareForm((current) => ({ ...current, printable_content: event.target.value }))} />
                      <button className="secondary-button" type="button" onClick={() => void savePlanOfCare()}>
                        Save plan of care
                      </button>
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode to manage plan-of-care versions." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'review' && (
                <Panel
                  title="PDGM and Utilization Review"
                  subtitle="Expose the PDGM derivation story and warn when projected visit utilization creates demo LUPA risk."
                  tone="soft"
                >
                  {selectedEpisode && episodeInsights ? (
                    <div className="detail-stack">
                      <KeyValue label="PDGM group" value={episodeInsights.pdgm_breakdown.group_code || 'Pending'} />
                      <KeyValue label="Clinical group" value={episodeInsights.pdgm_breakdown.clinical_group} />
                      <KeyValue label="Timing" value={episodeInsights.pdgm_breakdown.timing} />
                      <KeyValue label="Functional level" value={episodeInsights.pdgm_breakdown.functional_level} />
                      <KeyValue label="Comorbidity" value={episodeInsights.pdgm_breakdown.comorbidity_adjustment} />
                      <KeyValue label="Admission source" value={episodeInsights.pdgm_breakdown.admission_source} />
                      <KeyValue label="Projected visits" value={String(episodeInsights.utilization_risk.projected_visits)} />
                      <KeyValue label="LUPA threshold" value={String(episodeInsights.utilization_risk.threshold_visits)} />
                      <KeyValue label="Risk level" value={labelizeValue(episodeInsights.utilization_risk.risk_level)} />
                      <FieldNote text={episodeInsights.pdgm_breakdown.explanation} />
                      <FieldNote text={episodeInsights.utilization_risk.warning_note ?? 'No current utilization warning.'} />
                      <FieldNote text={episodeInsights.utilization_risk.recommended_action ?? ''} />
                    </div>
                  ) : (
                    <EmptyState text="Choose an episode to review PDGM breakdown and utilization risk." />
                  )}
                </Panel>
                )}
                {episodeWorkspaceTab === 'admission' && (
                <Panel
                  title="Intake Documentation Queue"
                  subtitle="Episodes needing face-to-face or signed-order follow-up before activation and clean billing."
                  density="compact"
                >
                  <FormGrid>
                    <Select
                      label="Owner filter"
                      value={intakeQueueOwnerFilter}
                      onChange={setIntakeQueueOwnerFilter}
                      options={[
                        { label: 'All owners', value: 'All' },
                        { label: 'Intake', value: 'Intake' },
                        { label: 'Clinical', value: 'Clinical' },
                      ]}
                    />
                    <Select
                      label="Blocker filter"
                      value={intakeQueueBlockerFilter}
                      onChange={setIntakeQueueBlockerFilter}
                      options={[
                        { label: 'All blockers', value: 'All' },
                        { label: 'Face-to-face', value: 'Face-to-face' },
                        { label: 'Signed orders', value: 'Signed orders' },
                        { label: 'Documentation', value: 'Documentation' },
                      ]}
                    />
                  </FormGrid>
                  <div className="stack">
                    {filteredEpisodeIntakeQueue.length > 0 ? (
                      filteredEpisodeIntakeQueue.map((item) => (
                        <div key={item.task.id} className="action-row">
                          <div>
                            <strong>{item.episode.patient_name}</strong>
                            <p className="muted">
                              Episode {item.episode.id} · {item.task.title}
                            </p>
                            <p className="muted">{item.task.details ?? 'Documentation follow-up required.'}</p>
                            <p className="muted">
                              Owner: {formatTaskAssignee(item.task)} · Priority: {labelizeValue(item.task.priority)} · {formatDueAt(item.task.due_at)}
                            </p>
                            {item.task.escalation_reason ? <p className="muted">Escalation: {item.task.escalation_reason}</p> : null}
                          </div>
                          <div className="row-actions wrap">
                            {item.badges.map((badge) => (
                              <span key={`${item.episode.id}-${badge.label}`} className={`pill ${badge.tone}`}>
                                {badge.label}
                              </span>
                            ))}
                            <button
                              className="secondary-button"
                              onClick={() =>
                                void updateReferralIntakeDocumentation(
                                  item.episode,
                                  item.blocker === 'face_to_face'
                                    ? { face_to_face_date: currentDateInputValue() }
                                    : {
                                        physician_orders_signed: true,
                                        physician_orders_signed_at: toApiDateTime(currentDateTimeInputValue()),
                                        order_status: 'signed',
                                      },
                                  item.blocker === 'face_to_face'
                                    ? 'Face-to-face documentation recorded.'
                                    : 'Signed physician orders recorded.',
                                )
                              }
                            >
                              {item.blocker === 'face_to_face' ? 'Mark received today' : 'Mark signed now'}
                            </button>
                            <button className="secondary-button" onClick={() => applyEpisodeContext(item.episode)}>
                              Review episode
                            </button>
                          </div>
                        <TaskOwnershipEditor
                          task={item.task}
                          draft={assignmentDraftForTask(item.task)}
                          onRoleChange={(value) => setQaAssignmentDraft(item.task.id, { assigned_role: value })}
                          onUserChange={(value) => setQaAssignmentDraft(item.task.id, { assigned_user_name: value })}
                          onEscalationNoteChange={(value) => setQaAssignmentDraft(item.task.id, { escalation_note: value })}
                          onSave={() => void saveQaTaskAssignment(item.task)}
                          onAssignToMe={() => void saveQaTaskAssignment(item.task, 'assign_to_me')}
                          onClear={() => void saveQaTaskAssignment(item.task, 'clear')}
                          onEscalate={() => void escalateQaTask(item.task)}
                        />
                        </div>
                      ))
                    ) : (
                      <EmptyState text="No intake-documentation tasks match the current filters." />
                    )}
                  </div>
                </Panel>
                )}
                {episodeWorkspaceTab === 'review' && (
                <Panel title="Lifecycle Actions" subtitle="Run recertification, transfer, ROC, discharge, and death-at-home workflows from a focused action dialog.">
                  <div className="row-actions wrap">
                    <button className="primary-button" type="button" onClick={() => openEpisodeWorkspaceModal('lifecycle')}>
                      Open lifecycle action
                    </button>
                  </div>
                </Panel>
                )}
                </div>
                <Modal
                  open={episodeModal === 'assessment'}
                  title="SOC and OASIS"
                  onClose={() => {
                    stopAssessmentDictation()
                    setEpisodeModal(null)
                  }}
                  size="xl"
                >
                  <Panel title="SOC and OASIS" subtitle="Complete version-aware assessments and activate episodes.">
                    <div className="speech-capture-panel">
                      <div className="speech-capture-header">
                        <div>
                          <strong>Voice capture</strong>
                          <p className="muted">
                            Dictate your SOC/OASIS note in plain language and Ethizo will map what it can into the structured assessment fields.
                          </p>
                        </div>
                        <div className="row-actions wrap">
                          <span className={`pill ${isAssessmentListening ? 'warn' : 'neutral'}`}>
                            {isAssessmentListening ? 'Listening' : speechRecognitionSupported ? 'Ready' : 'Manual only'}
                          </span>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              if (isAssessmentListening) {
                                stopAssessmentDictation(true)
                              } else {
                                startAssessmentDictation()
                              }
                            }}
                          >
                            {isAssessmentListening ? 'Stop dictation' : 'Start dictation'}
                          </button>
                          <button className="secondary-button" type="button" onClick={() => applyAssessmentSpeechTranscript(assessmentSpeechDraft)}>
                            Apply to form
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => {
                              stopAssessmentDictation()
                              setAssessmentSpeechDraft('')
                              setAssessmentSpeechDetectedFields([])
                            }}
                          >
                            Clear note
                          </button>
                        </div>
                      </div>
                      <TextArea label="Dictated SOC/OASIS note" value={assessmentSpeechDraft} onChange={setAssessmentSpeechDraft} />
                      <FieldNote
                        text={
                          speechRecognitionSupported
                            ? 'Say phrases like “diagnosis code I50.32, homebound because patient fatigues after 10 feet, medication reconciliation completed, fall risk high, care plan goals improve endurance and medication adherence.”'
                            : 'Speech recognition is not supported in this browser session. You can still paste a dictated note here and choose Apply to form.'
                        }
                      />
                      {assessmentSpeechDetectedFields.length > 0 ? (
                        <FieldNote text={`Detected fields: ${assessmentSpeechDetectedFields.join(', ')}`} />
                      ) : null}
                    </div>
                    <FormGrid>
                      <Select
                        label="Episode"
                        value={assessmentForm.episode_id}
                        onChange={(value) => {
                          const episode = dataset.episodes.find((item) => item.id === Number(value))
                          if (episode) {
                            applyEpisodeContext(episode)
                            return
                          }
                          setAssessmentForm((current) => ({ ...current, episode_id: value }))
                        }}
                        options={dataset.episodes.map((episode) => ({ label: `${episode.patient_name} · Episode ${episode.id}`, value: String(episode.id) }))}
                      />
                      <Input label="Completed at" type="datetime-local" value={assessmentForm.completed_at} onChange={(value) => setAssessmentForm((current) => ({ ...current, completed_at: value }))} />
                      <Select
                        label="Assessment type"
                        value={assessmentForm.assessment_type}
                        onChange={(value) => setAssessmentForm((current) => ({ ...current, assessment_type: value }))}
                        options={[
                          { label: 'SOC', value: 'soc' },
                          { label: 'ROC', value: 'roc' },
                          { label: 'Recertification', value: 'recertification' },
                          { label: 'Transfer', value: 'transfer' },
                          { label: 'Discharge', value: 'discharge' },
                        ]}
                      />
                      <Input label="Diagnosis code" value={assessmentForm.principal_diagnosis_code} onChange={(value) => setAssessmentForm((current) => ({ ...current, principal_diagnosis_code: value }))} />
                      <Input label="Functional score" value={assessmentForm.functional_score} onChange={(value) => setAssessmentForm((current) => ({ ...current, functional_score: value }))} />
                      <Input label="Comorbidity" value={assessmentForm.comorbidity_level} onChange={(value) => setAssessmentForm((current) => ({ ...current, comorbidity_level: value }))} />
                      <Select
                        label="Assessment status"
                        value={assessmentForm.status}
                        onChange={(value) => setAssessmentForm((current) => ({ ...current, status: value }))}
                        options={[
                          { label: 'Final', value: 'final' },
                          { label: 'Draft', value: 'draft' },
                          { label: 'Locked', value: 'locked' },
                        ]}
                      />
                      <Select
                        label="Medication reconciliation"
                        value={assessmentForm.medication_reconciliation_completed}
                        onChange={(value) => setAssessmentForm((current) => ({ ...current, medication_reconciliation_completed: value }))}
                        options={[
                          { label: 'Completed', value: 'yes' },
                          { label: 'Pending', value: 'no' },
                        ]}
                      />
                      <Select
                        label="Homebound status"
                        value={assessmentForm.homebound_status}
                        onChange={(value) => setAssessmentForm((current) => ({ ...current, homebound_status: value }))}
                        options={HOMEBOUND_STATUS_OPTIONS.map((option) => ({ label: labelizeValue(option), value: option }))}
                      />
                      <Select
                        label="Fall risk"
                        value={assessmentForm.fall_risk_level}
                        onChange={(value) => setAssessmentForm((current) => ({ ...current, fall_risk_level: value }))}
                        options={FALL_RISK_OPTIONS.map((option) => ({ label: labelizeValue(option), value: option }))}
                      />
                      <Select
                        label="Hospitalization risk"
                        value={assessmentForm.hospitalization_risk}
                        onChange={(value) => setAssessmentForm((current) => ({ ...current, hospitalization_risk: value }))}
                        options={HOSPITALIZATION_RISK_OPTIONS.map((option) => ({ label: labelizeValue(option), value: option }))}
                      />
                      <Select
                        label="Emergency prep reviewed"
                        value={assessmentForm.emergency_preparedness_reviewed}
                        onChange={(value) => setAssessmentForm((current) => ({ ...current, emergency_preparedness_reviewed: value }))}
                        options={[
                          { label: 'Reviewed', value: 'yes' },
                          { label: 'Not reviewed', value: 'no' },
                        ]}
                      />
                      <Input label="OASIS M1033 risk" value={assessmentForm.oasis_m1033} onChange={(value) => setAssessmentForm((current) => ({ ...current, oasis_m1033: value }))} />
                      <Input label="OASIS M1860 ambulation" value={assessmentForm.oasis_m1860} onChange={(value) => setAssessmentForm((current) => ({ ...current, oasis_m1860: value }))} />
                      <Input label="OASIS M2020 oral meds" value={assessmentForm.oasis_m2020} onChange={(value) => setAssessmentForm((current) => ({ ...current, oasis_m2020: value }))} />
                    </FormGrid>
                    <div className="stack">
                      <TextArea label="Homebound narrative" value={assessmentForm.homebound_narrative} onChange={(value) => setAssessmentForm((current) => ({ ...current, homebound_narrative: value }))} />
                      <TextArea label="Clinical summary" value={assessmentForm.clinical_summary} onChange={(value) => setAssessmentForm((current) => ({ ...current, clinical_summary: value }))} />
                      <TextArea label="Care plan goals" value={assessmentForm.care_plan_goals} onChange={(value) => setAssessmentForm((current) => ({ ...current, care_plan_goals: value }))} />
                    </div>
                    <FormGrid>
                      <Input label="Medication issues" value={assessmentForm.medication_issues} onChange={(value) => setAssessmentForm((current) => ({ ...current, medication_issues: value }))} />
                      <Input label="High-risk medications" value={assessmentForm.high_risk_meds} onChange={(value) => setAssessmentForm((current) => ({ ...current, high_risk_meds: value }))} />
                      <Select
                        label="Wounds present"
                        value={assessmentForm.wound_present}
                        onChange={(value) => setAssessmentForm((current) => ({ ...current, wound_present: value }))}
                        options={[
                          { label: 'No', value: 'no' },
                          { label: 'Yes', value: 'yes' },
                        ]}
                      />
                      <Input label="Caregiver availability" value={assessmentForm.caregiver_availability} onChange={(value) => setAssessmentForm((current) => ({ ...current, caregiver_availability: value }))} />
                    </FormGrid>
                    <div className="stack">
                      <TextArea label="Wound notes" value={assessmentForm.wound_notes} onChange={(value) => setAssessmentForm((current) => ({ ...current, wound_notes: value }))} />
                      <TextArea label="Caregiver notes" value={assessmentForm.caregiver_notes} onChange={(value) => setAssessmentForm((current) => ({ ...current, caregiver_notes: value }))} />
                      <TextArea label="Risk notes" value={assessmentForm.risk_notes} onChange={(value) => setAssessmentForm((current) => ({ ...current, risk_notes: value }))} />
                    </div>
                    <div className="row-actions wrap">
                      <button className="primary-button" onClick={() => void addAssessment()}>
                        {editingAssessmentId !== null ? 'Save assessment changes' : 'Add assessment'}
                      </button>
                      <button className="secondary-button" type="button" onClick={() => resetAssessmentForm(Number(assessmentForm.episode_id))}>
                        {editingAssessmentId !== null ? 'Cancel edit' : 'Reset form'}
                      </button>
                    </div>
                  </Panel>
                </Modal>
                <Modal open={episodeModal === 'admission'} title="Admission details" onClose={() => setEpisodeModal(null)} size="xl">
                  <Panel title="Admission Details" subtitle="Update inherited referral details and intake documentation for the selected episode.">
                    {selectedEpisode ? (
                      <div className="detail-stack">
                        <FormGrid>
                          <Input
                            label="Face-to-face date"
                            type="date"
                            value={intakeDocumentationForm.face_to_face_date}
                            onChange={(value) => setIntakeDocumentationForm((current) => ({ ...current, face_to_face_date: value }))}
                          />
                          <Input
                            label="Signed orders date/time"
                            type="datetime-local"
                            value={intakeDocumentationForm.physician_orders_signed_at}
                            onChange={(value) => setIntakeDocumentationForm((current) => ({ ...current, physician_orders_signed_at: value }))}
                          />
                        </FormGrid>
                        <FormGrid>
                          <Input label="Admission source" value={episodeAdmissionForm.admission_source} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, admission_source: value }))} />
                          <Input label="Requested disciplines" value={episodeAdmissionForm.requested_disciplines} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, requested_disciplines: value }))} />
                          <Input label="Referring provider" value={episodeAdmissionForm.referring_provider_name} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, referring_provider_name: value }))} />
                          <Input label="Referring phone" value={episodeAdmissionForm.referring_provider_phone} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, referring_provider_phone: formatUsPhone(value) }))} />
                          <Input label="PCP" value={episodeAdmissionForm.pcp_name} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, pcp_name: value }))} />
                          <Input label="PCP phone" value={episodeAdmissionForm.pcp_phone} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, pcp_phone: formatUsPhone(value) }))} />
                          <Input label="Caregiver" value={episodeAdmissionForm.caregiver_name} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, caregiver_name: value }))} />
                          <Input label="Caregiver relationship" value={episodeAdmissionForm.caregiver_relationship} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, caregiver_relationship: value }))} />
                          <Input label="Caregiver phone" value={episodeAdmissionForm.caregiver_phone} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, caregiver_phone: formatUsPhone(value) }))} />
                          <Input label="Service location" value={episodeAdmissionForm.service_location_type} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, service_location_type: value }))} />
                          <Input label="Service address" value={episodeAdmissionForm.service_address1} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, service_address1: value }))} />
                          <Input label="Service city" value={episodeAdmissionForm.service_city} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, service_city: value }))} />
                          <Input label="Service state" value={episodeAdmissionForm.service_state} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, service_state: formatStateCode(value) }))} />
                          <Input label="Service ZIP" value={episodeAdmissionForm.service_postal_code} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, service_postal_code: formatZipCode(value) }))} />
                          <Input label="Admission notes" value={episodeAdmissionForm.notes} onChange={(value) => setEpisodeAdmissionForm((current) => ({ ...current, notes: value }))} />
                        </FormGrid>
                        <div className="row-actions wrap">
                          <button className="secondary-button" onClick={() => void updateReferralIntakeDocumentation(selectedEpisode, { face_to_face_date: intakeDocumentationForm.face_to_face_date }, 'Face-to-face documentation recorded.')}>
                            Mark face-to-face received
                          </button>
                          <button
                            className="secondary-button"
                            onClick={() =>
                              void updateReferralIntakeDocumentation(
                                selectedEpisode,
                                {
                                  physician_orders_signed: true,
                                  physician_orders_signed_at: toApiDateTime(intakeDocumentationForm.physician_orders_signed_at),
                                  order_status: 'signed',
                                },
                                'Signed physician orders recorded.',
                              )
                            }
                          >
                            Mark signed orders received
                          </button>
                          <button className="primary-button" onClick={() => void saveEpisodeAdmissionDetails()}>
                            Save admission details
                          </button>
                          <button className="secondary-button" type="button" onClick={() => syncEpisodeAdmissionForm(selectedEpisode)}>
                            Reset to saved details
                          </button>
                        </div>
                      </div>
                    ) : (
                      <EmptyState text="Choose an episode to edit admission details." />
                    )}
                  </Panel>
                </Modal>
                <Modal open={episodeModal === 'documents'} title="Referral documents" onClose={() => setEpisodeModal(null)} size="xl">
                  <Panel title="Referral Document Tracker" subtitle="Manage face-to-face, physician orders, and other intake artifacts as explicit referral documents.">
                    {selectedReferral ? (
                      <div className="stack">
                        <FormGrid>
                          <Select
                            label="Document type"
                            value={referralDocumentForm.document_type}
                            onChange={(value) =>
                              setReferralDocumentForm((current) => ({
                                ...current,
                                document_type: value,
                                document_status: value === 'physician_orders' ? current.document_status : current.document_status === 'signed' ? 'received' : current.document_status,
                              }))
                            }
                            options={REFERRAL_DOCUMENT_TYPES.map((option) => ({ label: labelizeValue(option), value: option }))}
                          />
                          <Select
                            label="Document status"
                            value={referralDocumentForm.document_status}
                            onChange={(value) => setReferralDocumentForm((current) => ({ ...current, document_status: value }))}
                            options={REFERRAL_DOCUMENT_STATUSES.map((option) => ({ label: labelizeValue(option), value: option }))}
                          />
                          <Input label="Source" value={referralDocumentForm.source_name} onChange={(value) => setReferralDocumentForm((current) => ({ ...current, source_name: value }))} />
                          <Input label="Received at" type="datetime-local" value={referralDocumentForm.received_at} onChange={(value) => setReferralDocumentForm((current) => ({ ...current, received_at: value }))} />
                          <Input label="Signed at" type="datetime-local" value={referralDocumentForm.signed_at} onChange={(value) => setReferralDocumentForm((current) => ({ ...current, signed_at: value }))} />
                          <Input label="Document note" value={referralDocumentForm.document_note} onChange={(value) => setReferralDocumentForm((current) => ({ ...current, document_note: value }))} />
                          <label className="field">
                            <span>Attachment</span>
                            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(event) => setReferralDocumentAttachment(event.target.files?.[0] ?? null)} />
                          </label>
                        </FormGrid>
                        <p className="muted">
                          {referralDocumentAttachment
                            ? `Selected attachment: ${referralDocumentAttachment.name}`
                            : editingReferralDocumentId !== null
                              ? 'Choose a file only if you want to replace the current attachment.'
                              : 'Attach a PDF, image, or Word document up to 10 MB.'}
                        </p>
                        <div className="row-actions wrap">
                          <button className="primary-button" type="button" onClick={() => void saveReferralDocument()}>
                            {editingReferralDocumentId !== null ? 'Save document changes' : 'Add document'}
                          </button>
                          {editingReferralDocumentId !== null ? (
                            <button className="secondary-button" type="button" onClick={() => resetReferralDocumentForm(referralDocumentForm.document_type)}>
                              Cancel edit
                            </button>
                          ) : null}
                        </div>
                        <div className="stack">
                          {selectedEpisodeDocuments.length > 0 ? (
                            selectedEpisodeDocuments.map((document) => (
                              <div key={document.id} className="action-row">
                                <div>
                                  <strong>{labelizeValue(document.document_type)}</strong>
                                  <p className="muted">
                                    {labelizeValue(document.document_status)} · {document.source_name ?? 'Source not captured'}
                                  </p>
                                  <p className="muted">
                                    Received: {document.received_at ?? 'Not captured'} · Signed: {document.signed_at ?? 'Not captured'}
                                  </p>
                                  <p className="muted">
                                    Attachment: {document.original_file_name ?? 'No file attached'}
                                    {document.file_size ? ` · ${formatFileSize(document.file_size)}` : ''}
                                  </p>
                                  {document.document_note ? <p className="muted">{document.document_note}</p> : null}
                                </div>
                                <div className="row-actions wrap">
                                  <span className={`pill ${document.document_status === 'signed' || document.document_status === 'reviewed' ? 'neutral' : 'warn'}`}>
                                    {labelizeValue(document.document_status)}
                                  </span>
                                  <button className="secondary-button" type="button" onClick={() => void downloadReferralDocument(document)} disabled={!document.original_file_name}>
                                    Download
                                  </button>
                                  <button className="secondary-button" type="button" onClick={() => loadReferralDocumentIntoForm(document)}>
                                    Edit document
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <EmptyState text="No referral documents have been captured yet for this intake record." />
                          )}
                        </div>
                      </div>
                    ) : (
                      <EmptyState text="Choose an episode linked to a referral to manage intake documents." />
                    )}
                  </Panel>
                </Modal>
                <Modal open={episodeModal === 'orders'} title="Physician orders" onClose={() => setEpisodeModal(null)} size="xl">
                  <Panel title="Physician Order Workflow" subtitle="Track versioned order packets for admission, plan of care, recertification, and ROC with explicit signature status.">
                    {selectedEpisode ? (
                      <div className="stack">
                        <FormGrid>
                          <Select label="Order scope" value={orderForm.order_scope} onChange={(value) => setOrderForm((current) => ({ ...current, order_scope: value }))} options={PHYSICIAN_ORDER_SCOPES.map((option) => ({ label: labelizeValue(option), value: option }))} />
                          <Select label="Order status" value={orderForm.order_status} onChange={(value) => setOrderForm((current) => ({ ...current, order_status: value }))} options={PHYSICIAN_ORDER_STATUSES.map((option) => ({ label: labelizeValue(option), value: option }))} />
                          <Input label="Signer" value={orderForm.signer_name} onChange={(value) => setOrderForm((current) => ({ ...current, signer_name: value }))} />
                          <Input label="Sent at" type="datetime-local" value={orderForm.sent_at} onChange={(value) => setOrderForm((current) => ({ ...current, sent_at: value }))} />
                          <Input label="Received at" type="datetime-local" value={orderForm.received_at} onChange={(value) => setOrderForm((current) => ({ ...current, received_at: value }))} />
                          <Input label="Signed at" type="datetime-local" value={orderForm.signed_at} onChange={(value) => setOrderForm((current) => ({ ...current, signed_at: value }))} />
                          <Input label="Order summary" value={orderForm.order_summary} onChange={(value) => setOrderForm((current) => ({ ...current, order_summary: value }))} />
                          <Input label="Order note" value={orderForm.order_note} onChange={(value) => setOrderForm((current) => ({ ...current, order_note: value }))} />
                        </FormGrid>
                        <div className="row-actions wrap">
                          <button className="primary-button" type="button" onClick={() => void savePhysicianOrder()}>
                            {editingOrderId !== null ? 'Save order changes' : 'Create order version'}
                          </button>
                          <button className="secondary-button" type="button" onClick={() => void autofillPhysicianOrderDraft()}>
                            Autofill from chart
                          </button>
                          {editingOrderId !== null ? (
                            <button className="secondary-button" type="button" onClick={() => resetOrderForm(orderForm.order_scope)}>
                              Cancel edit
                            </button>
                          ) : null}
                        </div>
                        {orderDraftHighlights.length > 0 ? (
                          <div className="stack">
                            <FieldNote text="Recent chart highlights included in this draft:" />
                            {orderDraftHighlights.map((highlight, index) => (
                              <p key={`${highlight}-${index}`} className="muted">
                                {highlight}
                              </p>
                            ))}
                          </div>
                        ) : null}
                        <div className="stack">
                          {selectedEpisodeOrders.length > 0 ? (
                            selectedEpisodeOrders.map((order) => (
                              <div key={order.id} className="action-row">
                                <div>
                                  <strong>{labelizeValue(order.order_scope)} · v{order.version_number}</strong>
                                  <p className="muted">
                                    {labelizeValue(order.order_status)} · {order.active ? 'Active' : 'Superseded'}
                                  </p>
                                  <p className="muted">
                                    Sent: {order.sent_at ?? 'Not captured'} · Received: {order.received_at ?? 'Not captured'} · Signed: {order.signed_at ?? 'Not captured'}
                                  </p>
                                  <p className="muted">Signer: {order.signer_name ?? 'Not captured'}</p>
                                  {order.order_summary ? <p className="muted">{order.order_summary}</p> : null}
                                  {order.order_note ? <p className="muted">{order.order_note}</p> : null}
                                </div>
                                <div className="row-actions wrap">
                                  <span className={`pill ${order.order_status === 'signed' ? 'neutral' : 'warn'}`}>
                                    {labelizeValue(order.order_status)}
                                  </span>
                                  <button className="secondary-button" type="button" onClick={() => loadOrderIntoForm(order)}>
                                    Edit order
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <EmptyState text="No physician order packets have been created for this episode yet." />
                          )}
                        </div>
                      </div>
                    ) : (
                      <EmptyState text="Choose an episode to manage physician order packets." />
                    )}
                  </Panel>
                </Modal>
                <Modal open={episodeModal === 'lifecycle'} title="Lifecycle action" onClose={() => setEpisodeModal(null)}>
                  <Panel title="Lifecycle Actions" subtitle="Release 1 workflow handling for recertification, transfer, ROC, discharge, and death at home.">
                    <FormGrid>
                      <Select
                        label="Transition"
                        value={lifecycleForm.transition_type}
                        onChange={(value) => setLifecycleForm((current) => ({ ...current, transition_type: value }))}
                        options={[
                          { label: 'Recertify', value: 'recertify' },
                          { label: 'Transfer', value: 'transfer' },
                          { label: 'Resume of Care', value: 'resume_care' },
                          { label: 'Discharge', value: 'discharge' },
                          { label: 'Death at Home', value: 'death_at_home' },
                        ]}
                      />
                      <Input label="Effective date" type="date" value={lifecycleForm.effective_date} onChange={(value) => setLifecycleForm((current) => ({ ...current, effective_date: value }))} />
                      <Input label="Clinician" value={lifecycleForm.clinician_name} onChange={(value) => setLifecycleForm((current) => ({ ...current, clinician_name: value }))} />
                      <Input label="Note" value={lifecycleForm.note} onChange={(value) => setLifecycleForm((current) => ({ ...current, note: value }))} />
                    </FormGrid>
                    <button className="primary-button" onClick={() => void runLifecycleTransition()}>
                      Run lifecycle action
                    </button>
                  </Panel>
                </Modal>
              </div>
  )
}
