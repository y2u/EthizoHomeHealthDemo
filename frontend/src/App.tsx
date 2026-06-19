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
} from './components/ui'
import {
  formatAddress,
  formatContact,
  formatCoverage,
  formatCurrency,
  formatDueAt,
  formatFileSize,
  formatNamePhone,
  formatPatientContacts,
  formatServiceLocation,
  formatStateCode,
  formatTaskAssignee,
  formatUsPhone,
  formatZipCode,
  labelizeValue,
} from './domain/formatters'
import { normalizeAdmissionSnapshot } from './domain/normalizers'
import { buildDemoEpisodeReviewSummary } from './domain/workflow'
import type { ModuleName } from './domain/workflow'
import { useEthizoAppController } from './hooks/useEthizoAppController'

const MODULES = ['Overview', 'Patients', 'Referrals', 'Episodes', 'Clinician', 'Billing', 'QA', 'Admin'] as const
const INSURANCE_OPTIONS = ['Medicare', 'Medicaid', 'Medicare Advantage', 'Commercial', 'Tricare', 'VA', 'Private Pay', 'Other'] as const
const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Other', 'Unknown'] as const
const REFERRAL_DOCUMENT_TYPES = ['face_to_face', 'physician_orders', 'insurance_card', 'medicare_card', 'plan_of_care', 'referral_packet', 'other'] as const
const REFERRAL_DOCUMENT_STATUSES = ['requested', 'received', 'reviewed', 'signed', 'rejected'] as const
const PHYSICIAN_ORDER_SCOPES = ['admission', 'plan_of_care', 'recertification', 'resume_of_care'] as const
const PHYSICIAN_ORDER_STATUSES = ['draft', 'sent_for_signature', 'received', 'signed', 'superseded'] as const
const HOMEBOUND_STATUS_OPTIONS = ['homebound', 'limited', 'not_homebound', 'pending'] as const
const FALL_RISK_OPTIONS = ['low', 'moderate', 'high'] as const
const HOSPITALIZATION_RISK_OPTIONS = ['routine', 'elevated', 'high'] as const

function App() {
  const controller = useEthizoAppController()
  const {
    user,
    mode,
    activeModule,
    setActiveModule,
    dataset,
    offlineQueue,
    setStatusMessage,
    sidebarCollapsed,
    setSidebarCollapsed,
    isBrowserOnline,
    toastMessages,
    patientWizardStep,
    setPatientWizardStep,
    referralWizardStep,
    setReferralWizardStep,
    episodeWorkspaceTab,
    setEpisodeWorkspaceTab,
    clinicianWorkspaceTab,
    setClinicianWorkspaceTab,
    patientModalOpen,
    setPatientModalOpen,
    referralModalOpen,
    setReferralModalOpen,
    episodeModal,
    setEpisodeModal,
    patientForm,
    setPatientForm,
    editingPatientId,
    referralForm,
    setReferralForm,
    editingReferralId,
    assessmentForm,
    setAssessmentForm,
    editingAssessmentId,
    assessmentSpeechDraft,
    setAssessmentSpeechDraft,
    assessmentSpeechDetectedFields,
    setAssessmentSpeechDetectedFields,
    isAssessmentListening,
    visitForm,
    setVisitForm,
    scheduleChangeForm,
    setScheduleChangeForm,
    documentationForm,
    setDocumentationForm,
    lifecycleForm,
    setLifecycleForm,
    intakeQueueOwnerFilter,
    setIntakeQueueOwnerFilter,
    intakeQueueBlockerFilter,
    setIntakeQueueBlockerFilter,
    billingQueueOwnerFilter,
    setBillingQueueOwnerFilter,
    billingQueueBlockerFilter,
    setBillingQueueBlockerFilter,
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
    claimLifecycleForm,
    setClaimLifecycleForm,
    evvLifecycleForm,
    setEvvLifecycleForm,
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
    coderReviewForm,
    setCoderReviewForm,
    communicationLogForm,
    setCommunicationLogForm,
    faxMessageForm,
    setFaxMessageForm,
    faxRoutingForm,
    setFaxRoutingForm,
    qapiForm,
    setQapiForm,
    complianceDocumentForm,
    setComplianceDocumentForm,
    patientNoticeForm,
    setPatientNoticeForm,
    medicationForm,
    setMedicationForm,
    allergyForm,
    setAllergyForm,
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
    claimTransactionForm,
    setClaimTransactionForm,
    remittanceForm,
    setRemittanceForm,
    insuranceIdLabel,
    insuranceIdHint,
    openNewPatientModal,
    openNewReferralModal,
    openEpisodeWorkspaceModal,
    prepareClaimLifecycleAction,
    prepareEvvLifecycleAction,
    resetAdminUserForm,
    loadAdminUserIntoForm,
    saveAdminSettings,
    saveAdminUser,
    exportAdminReport,
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
    loadCoderReviewIntoForm,
    loadReferralDocumentIntoForm,
    loadOrderIntoForm,
    autofillPhysicianOrderDraft,
    applyEpisodeContext,
    resolveNextEpisodeBlocker,
    openRoleWorkItem,
    savePatient,
    copyEmergencyToResponsibleParty,
    copyPatientPhoneToEmergencyContact,
    resetPatientForm,
    loadPatientIntoForm,
    copyPatientAddressToReferral,
    copyPatientPcpToReferral,
    chooseReferralPatient,
    resetReferralForm,
    loadReferralIntoForm,
    chooseVisitEpisode,
    loadRecommendationIntoVisitForm,
    scheduleRecommendationPlan,
    prepareScheduleChange,
    loadVisitDocumentationForm,
    saveVisitDocumentation,
    lockVisitDocumentation,
    rescheduleVisitChange,
    markVisitMissed,
    reassignVisitChange,
    saveReferral,
    convertReferral,
    updateReferralIntakeDocumentation,
    saveReferralDocument,
    savePhysicianOrder,
    downloadReferralDocument,
    saveEpisodeAdmissionDetails,
    addAssessment,
    addVisit,
    activateEpisode,
    runLifecycleTransition,
    completeQaTask,
    assignmentDraftForTask,
    setQaAssignmentDraft,
    saveQaTaskAssignment,
    escalateQaTask,
    submitClaim,
    runClaimLifecycleAction,
    submitEvv,
    runEvvLifecycleAction,
    prepareOasisSubmissionForSelectedEpisode,
    runOasisSubmissionAction,
    generatePlanOfCareForSelectedEpisode,
    savePlanOfCare,
    syncCoderReviewForSelectedEpisode,
    saveCoderReviewItem,
    saveCommunicationLogEntry,
    saveFaxMessage,
    routeFaxMessageAction,
    saveQapiProject,
    saveComplianceDocument,
    savePatientNotice,
    saveMedication,
    saveAllergy,
    saveVerbalOrder,
    saveAideSupervision,
    saveIncident,
    saveInfectionLog,
    saveAuthorization,
    saveEligibilityCheck,
    saveDmeSupplyOrder,
    saveCaseConference,
    saveClaimTransaction,
    saveRemittancePosting,
    captureSurveyReadinessAction,
    captureQualityMetricsAction,
    runBillingFollowUpAction,
    visitAction,
    syncOfflineActions,
    selectedEpisode,
    selectedReferral,
    selectedPatient,
    selectedPatientComplianceDocuments,
    selectedPatientNotices,
    selectedPatientMedications,
    selectedPatientAllergies,
    selectedEpisodeVerbalOrders,
    selectedEpisodeAideSupervision,
    selectedEpisodeIncidents,
    selectedEpisodeInfections,
    selectedEpisodeAuthorizations,
    selectedEpisodeEligibilityChecks,
    selectedEpisodeDmeSupplyOrders,
    selectedEpisodeCaseConferences,
    selectedEpisodeClaimTransactions,
    selectedEpisodeRemittancePostings,
    clinicianVisits,
    selectedClinicianEpisode,
    episodeReadiness,
    episodeReviewSummary,
    episodeInsights,
    episodeNextActionRecommendation,
    selectedEpisodeSnapshot,
    selectedEpisodeIntake,
    selectedClinicianEpisodeSnapshot,
    selectedEpisodeDocuments,
    selectedEpisodeOrders,
    selectedEpisodeOasisSubmissions,
    selectedEpisodePlansOfCare,
    selectedEpisodeCommunicationEntries,
    claimReadinessQueue,
    claimStatusLanes,
    denialQueueSections,
    evvQueueSections,
    billingFollowUpSections,
    roleDashboard,
    roleDashboardSections,
    filteredEpisodeIntakeQueue,
    filteredClaimReadinessQueue,
    filteredAuditEvents,
    adminReportSummary,
    schedulingRecommendations,
    weekOnePlan,
    connectionLightTone,
    syncLightTone,
    connectionLightLabel,
    syncLightLabel,
    speechRecognitionSupported,
    nameForPatient,
    deriveAdmissionSnapshot,
    summarizeIntakeReadiness,
    toApiDateTime,
    currentDateInputValue,
    currentDateTimeInputValue,
    documentationBlueprintForDiscipline,
    availableClaimActions,
    labelizeClaimAction,
    summarizeAuditDetails,
  } = controller

  return (
    <div className={sidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toastMessages.map((toast) => (
          <div key={toast.id} className={`toast-message ${toast.tone}`}>
            {toast.text}
          </div>
        ))}
      </div>
      <aside className={sidebarCollapsed ? 'sidebar collapsed' : 'sidebar'}>
        <div className="sidebar-toggle-row">
          <button
            className="secondary-button sidebar-toggle-button"
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {sidebarCollapsed ? '>>' : '<<'}
          </button>
        </div>
        <div className="brand-card">
          {!sidebarCollapsed ? <p className="eyebrow">Ethizo Home Health Care</p> : null}
          <h1>{sidebarCollapsed ? 'Ethizo' : 'Ethizo Home Health Care'}</h1>
          {!sidebarCollapsed ? <p className="brand-support">Responsive home health operations</p> : null}
        </div>

        <div className="sidebar-utility-row">
          {!sidebarCollapsed ? <p className="sidebar-user-name">Signed in as {user?.full_name ?? 'Loading'}.</p> : null}
          <div className="sidebar-indicator-group">
            <StatusLight label="Connectivity" value={connectionLightLabel} tone={connectionLightTone} compact={sidebarCollapsed} />
            <StatusLight label="Sync" value={syncLightLabel} tone={syncLightTone} compact={sidebarCollapsed} />
            <button className="secondary-button sync-compact-button" type="button" onClick={() => void syncOfflineActions()} title="Sync offline actions">
              {sidebarCollapsed ? 'S' : 'Sync'}
            </button>
          </div>
        </div>

        <nav className="module-list">
          {MODULES.map((moduleName) => (
            <button
              key={moduleName}
              className={moduleName === activeModule ? 'module-button active' : 'module-button'}
              onClick={() => setActiveModule(moduleName)}
              title={moduleName}
              aria-label={moduleName}
            >
              <span className="module-button-content">
                <ModuleIcon moduleName={moduleName} />
                {!sidebarCollapsed ? <span className="module-button-label">{moduleName}</span> : null}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Ethizo responsive workspace</p>
            <h2>Ethizo Home Health Care keeps intake, clinical, QA, billing, and admin work aligned in one workspace</h2>
            <p className="hero-support">A responsive home health operations platform designed for office teams and field clinicians.</p>
          </div>
          <div className="hero-grid">
            <MetricCard label="Patients" value={dataset.metrics.patients} />
            <MetricCard label="Referrals" value={dataset.metrics.referrals} />
            <MetricCard label="Episodes" value={dataset.metrics.episodes} />
            <MetricCard label="Visits Today" value={dataset.metrics.visitsToday} />
            <MetricCard label="Open QA" value={dataset.metrics.qaTasks} />
            <MetricCard label="Claims on Hold" value={dataset.metrics.claimsOnHold} />
          </div>
        </section>

        {activeModule === 'Overview' && (
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
        )}

        {activeModule === 'Patients' && (
          <div className="module-stack">
            <WorkspaceHeader
              eyebrow="Patients"
              title="Patient Registry"
              subtitle="Browse active patients and open the full registration form only when you need it."
              meta={
                <>
                  <span className="pill neutral">{dataset.patients.length} active</span>
                  <span className="pill neutral">{dataset.referrals.length} referrals</span>
                </>
              }
              actions={
                <button className="primary-button" type="button" onClick={openNewPatientModal}>
                  Add patient
                </button>
              }
            />
            <Panel title="Patient Registry" subtitle="Active patients ready for referral and episode workflows.">
              <div className="stack">
                {dataset.patients.map((patient) => (
                  <div key={patient.id} className="action-row">
                    <div>
                      <strong>{nameForPatient(patient)}</strong>
                      <p className="muted">{[patient.dob, patient.gender].filter(Boolean).join(' · ')}</p>
                      <p className="muted">{formatAddress(patient)}</p>
                      <p className="muted">{formatCoverage(patient)}</p>
                      <p className="muted">{formatPatientContacts(patient)}</p>
                      <p className="muted">Physician: {patient.primary_physician ?? 'Not set'}</p>
                    </div>
                    <div className="row-actions wrap">
                      <button className="secondary-button" type="button" onClick={() => loadPatientIntoForm(patient)}>
                        Edit patient
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <div className="content-grid">
              <Panel
                title="Patient Compliance Packet"
                subtitle="Track consent, HIPAA, patient rights, advance directives, emergency preparedness, grievances, and beneficiary notices."
                tone="soft"
              >
                {selectedPatient ? (
                  <div className="stack">
                    <div className="episode-focus-banner">
                      <div>
                        <strong>{nameForPatient(selectedPatient)}</strong>
                        <p className="muted">Compliance packet and notice inventory for the selected chart.</p>
                      </div>
                      <div className="row-actions wrap">
                        <span className="pill neutral">{selectedPatientComplianceDocuments.length} documents</span>
                        <span className="pill neutral">{selectedPatientNotices.length} notices</span>
                      </div>
                    </div>
                    {selectedPatientComplianceDocuments.map((document) => (
                      <div key={`compliance-document-${document.id}`} className="action-row">
                        <div>
                          <strong>{labelizeValue(document.document_type)}</strong>
                          <p className="muted">
                            {labelizeValue(document.status)} · {document.signed_at ?? 'Signature pending'} · {document.delivery_method ?? 'Delivery not captured'}
                          </p>
                          {document.notes ? <p className="muted">{document.notes}</p> : null}
                        </div>
                        <span className={`pill ${document.status === 'signed' || document.status === 'reviewed' ? 'neutral' : 'warn'}`}>
                          {labelizeValue(document.status)}
                        </span>
                      </div>
                    ))}
                    {selectedPatientNotices.map((notice) => (
                      <div key={`patient-notice-${notice.id}`} className="action-row">
                        <div>
                          <strong>{notice.notice_type}</strong>
                          <p className="muted">
                            {labelizeValue(notice.status)} · Delivered: {notice.delivered_at ?? 'Not delivered'} · Signed: {notice.signed_at ?? 'Not signed'}
                          </p>
                          <p className="muted">{notice.reason ?? 'No notice reason recorded.'}</p>
                          {notice.billing_impact ? <p className="muted">Billing impact: {notice.billing_impact}</p> : null}
                        </div>
                        <span className={`pill ${notice.status.includes('signed') || notice.status === 'not_due' ? 'neutral' : 'warn'}`}>
                          {labelizeValue(notice.status)}
                        </span>
                      </div>
                    ))}
                    <FormGrid>
                      <Input label="Document type" value={complianceDocumentForm.document_type} onChange={(value) => setComplianceDocumentForm((current) => ({ ...current, document_type: value }))} />
                      <Input label="Status" value={complianceDocumentForm.status} onChange={(value) => setComplianceDocumentForm((current) => ({ ...current, status: value }))} />
                      <Input label="Delivery method" value={complianceDocumentForm.delivery_method} onChange={(value) => setComplianceDocumentForm((current) => ({ ...current, delivery_method: value }))} />
                      <Input label="Signed at" type="datetime-local" value={complianceDocumentForm.signed_at} onChange={(value) => setComplianceDocumentForm((current) => ({ ...current, signed_at: value }))} />
                      <Input label="Notes" value={complianceDocumentForm.notes} onChange={(value) => setComplianceDocumentForm((current) => ({ ...current, notes: value }))} />
                    </FormGrid>
                    <button className="secondary-button" type="button" onClick={() => void saveComplianceDocument()}>
                      Add compliance document
                    </button>
                    <FormGrid>
                      <Input label="Notice type" value={patientNoticeForm.notice_type} onChange={(value) => setPatientNoticeForm((current) => ({ ...current, notice_type: value }))} />
                      <Input label="Notice status" value={patientNoticeForm.status} onChange={(value) => setPatientNoticeForm((current) => ({ ...current, status: value }))} />
                      <Input label="Reason" value={patientNoticeForm.reason} onChange={(value) => setPatientNoticeForm((current) => ({ ...current, reason: value }))} />
                      <Input label="Billing impact" value={patientNoticeForm.billing_impact} onChange={(value) => setPatientNoticeForm((current) => ({ ...current, billing_impact: value }))} />
                      <Input label="Delivered at" type="datetime-local" value={patientNoticeForm.delivered_at} onChange={(value) => setPatientNoticeForm((current) => ({ ...current, delivered_at: value }))} />
                      <Input label="Signed at" type="datetime-local" value={patientNoticeForm.signed_at} onChange={(value) => setPatientNoticeForm((current) => ({ ...current, signed_at: value }))} />
                    </FormGrid>
                    <button className="secondary-button" type="button" onClick={() => void savePatientNotice()}>
                      Add notice
                    </button>
                  </div>
                ) : (
                  <EmptyState text="Add a patient before building the compliance packet." />
                )}
              </Panel>
              <Panel
                title="Medication and Allergy Profile"
                subtitle="Maintain longitudinal medication reconciliation, high-risk teaching, medication changes, and allergy verification."
                tone="soft"
              >
                {selectedPatient ? (
                  <div className="stack">
                    {selectedPatientMedications.map((medication) => (
                      <div key={`medication-${medication.id}`} className="action-row">
                        <div>
                          <strong>{medication.medication_name}</strong>
                          <p className="muted">
                            {[medication.dosage, medication.route, medication.frequency].filter(Boolean).join(' · ') || 'Dose/frequency not captured'}
                          </p>
                          <p className="muted">
                            {labelizeValue(medication.status)} · Reconciled: {medication.reconciled_at ?? 'Pending'} · Teaching: {medication.teaching_completed ? 'Done' : 'Needed'}
                          </p>
                          {medication.change_reason ? <p className="muted">{medication.change_reason}</p> : null}
                        </div>
                        <span className={`pill ${medication.high_risk && !medication.teaching_completed ? 'warn' : 'neutral'}`}>
                          {medication.high_risk ? 'High risk' : 'Routine'}
                        </span>
                      </div>
                    ))}
                    {selectedPatientAllergies.map((allergy) => (
                      <div key={`allergy-${allergy.id}`} className="action-row">
                        <div>
                          <strong>{allergy.allergen}</strong>
                          <p className="muted">
                            {allergy.reaction ?? 'Reaction not captured'} · {labelizeValue(allergy.severity ?? 'severity pending')} · Verified {allergy.verified_at ?? 'Pending'}
                          </p>
                        </div>
                        <span className="pill warn">Allergy</span>
                      </div>
                    ))}
                    <FormGrid>
                      <Input label="Medication" value={medicationForm.medication_name} onChange={(value) => setMedicationForm((current) => ({ ...current, medication_name: value }))} />
                      <Input label="Dosage" value={medicationForm.dosage} onChange={(value) => setMedicationForm((current) => ({ ...current, dosage: value }))} />
                      <Input label="Route" value={medicationForm.route} onChange={(value) => setMedicationForm((current) => ({ ...current, route: value }))} />
                      <Input label="Frequency" value={medicationForm.frequency} onChange={(value) => setMedicationForm((current) => ({ ...current, frequency: value }))} />
                      <Select
                        label="High risk"
                        value={medicationForm.high_risk}
                        onChange={(value) => setMedicationForm((current) => ({ ...current, high_risk: value }))}
                        options={[
                          { label: 'Yes', value: 'yes' },
                          { label: 'No', value: 'no' },
                        ]}
                      />
                      <Select
                        label="Teaching complete"
                        value={medicationForm.teaching_completed}
                        onChange={(value) => setMedicationForm((current) => ({ ...current, teaching_completed: value }))}
                        options={[
                          { label: 'Yes', value: 'yes' },
                          { label: 'No', value: 'no' },
                        ]}
                      />
                      <Input label="Reconciled at" type="datetime-local" value={medicationForm.reconciled_at} onChange={(value) => setMedicationForm((current) => ({ ...current, reconciled_at: value }))} />
                      <Input label="Change reason" value={medicationForm.change_reason} onChange={(value) => setMedicationForm((current) => ({ ...current, change_reason: value }))} />
                    </FormGrid>
                    <button className="secondary-button" type="button" onClick={() => void saveMedication()}>
                      Add medication
                    </button>
                    <FormGrid>
                      <Input label="Allergen" value={allergyForm.allergen} onChange={(value) => setAllergyForm((current) => ({ ...current, allergen: value }))} />
                      <Input label="Reaction" value={allergyForm.reaction} onChange={(value) => setAllergyForm((current) => ({ ...current, reaction: value }))} />
                      <Input label="Severity" value={allergyForm.severity} onChange={(value) => setAllergyForm((current) => ({ ...current, severity: value }))} />
                      <Input label="Verified at" type="datetime-local" value={allergyForm.verified_at} onChange={(value) => setAllergyForm((current) => ({ ...current, verified_at: value }))} />
                    </FormGrid>
                    <button className="secondary-button" type="button" onClick={() => void saveAllergy()}>
                      Add allergy
                    </button>
                  </div>
                ) : (
                  <EmptyState text="Add a patient before building the medication and allergy profile." />
                )}
              </Panel>
            </div>
            <Modal
              open={patientModalOpen}
              title={editingPatientId !== null ? 'Edit patient' : 'Add patient'}
              onClose={() => {
                resetPatientForm()
                setPatientModalOpen(false)
              }}
            >
              <Panel title="Register Patient" subtitle="Capture complete demographics, insurance identity, emergency contact, and responsible party details.">
                <WizardSteps
                  steps={[
                    { label: 'Identity', value: 'identity' },
                    { label: 'Coverage', value: 'coverage' },
                    { label: 'Contacts', value: 'contacts' },
                  ]}
                  activeStep={patientWizardStep}
                  onChange={(value) => setPatientWizardStep(value as 'identity' | 'coverage' | 'contacts')}
                />
                {patientWizardStep === 'identity' && (
                  <FormGrid>
                    <Input label="First name" value={patientForm.first_name} onChange={(value) => setPatientForm((current) => ({ ...current, first_name: value }))} />
                    <Input label="Last name" value={patientForm.last_name} onChange={(value) => setPatientForm((current) => ({ ...current, last_name: value }))} />
                    <Input label="DOB" type="date" value={patientForm.dob} onChange={(value) => setPatientForm((current) => ({ ...current, dob: value }))} />
                    <Select
                      label="Gender"
                      value={patientForm.gender}
                      onChange={(value) => setPatientForm((current) => ({ ...current, gender: value }))}
                      options={GENDER_OPTIONS.map((option) => ({ label: option, value: option }))}
                    />
                    <Input label="Street address" value={patientForm.address1} onChange={(value) => setPatientForm((current) => ({ ...current, address1: value }))} />
                    <Input label="Address line 2" value={patientForm.address2} onChange={(value) => setPatientForm((current) => ({ ...current, address2: value }))} />
                    <Input label="City" value={patientForm.city} onChange={(value) => setPatientForm((current) => ({ ...current, city: value }))} />
                    <Input label="State" value={patientForm.state} onChange={(value) => setPatientForm((current) => ({ ...current, state: formatStateCode(value) }))} />
                    <Input label="ZIP code" value={patientForm.postal_code} onChange={(value) => setPatientForm((current) => ({ ...current, postal_code: formatZipCode(value) }))} />
                  </FormGrid>
                )}
                {patientWizardStep === 'coverage' && (
                  <>
                    <FormGrid>
                      <Select
                        label="Insurance"
                        value={patientForm.payer_type}
                        onChange={(value) => setPatientForm((current) => ({ ...current, payer_type: value }))}
                        options={INSURANCE_OPTIONS.map((option) => ({ label: option, value: option }))}
                      />
                      <Input
                        label={insuranceIdLabel}
                        value={patientForm.insurance_member_id}
                        onChange={(value) => setPatientForm((current) => ({ ...current, insurance_member_id: value.trim().toUpperCase() }))}
                      />
                      <Input label="Phone" value={patientForm.phone} onChange={(value) => setPatientForm((current) => ({ ...current, phone: formatUsPhone(value) }))} />
                      <Input label="Physician" value={patientForm.primary_physician} onChange={(value) => setPatientForm((current) => ({ ...current, primary_physician: value }))} />
                    </FormGrid>
                    <FieldNote text={insuranceIdHint} />
                  </>
                )}
                {patientWizardStep === 'contacts' && (
                  <FormGrid>
                    <Input
                      label="Emergency contact"
                      value={patientForm.emergency_contact_name}
                      onChange={(value) => setPatientForm((current) => ({ ...current, emergency_contact_name: value }))}
                    />
                    <Input
                      label="Emergency relationship"
                      value={patientForm.emergency_contact_relationship}
                      onChange={(value) => setPatientForm((current) => ({ ...current, emergency_contact_relationship: value }))}
                    />
                    <Input
                      label="Emergency phone"
                      value={patientForm.emergency_contact_phone}
                      onChange={(value) => setPatientForm((current) => ({ ...current, emergency_contact_phone: formatUsPhone(value) }))}
                    />
                    <div className="row-actions">
                      <button className="secondary-button" type="button" onClick={copyPatientPhoneToEmergencyContact}>
                        Copy patient phone
                      </button>
                    </div>
                    <Input
                      label="Responsible party"
                      value={patientForm.responsible_party_name}
                      onChange={(value) => setPatientForm((current) => ({ ...current, responsible_party_name: value }))}
                    />
                    <Input
                      label="Responsible relationship"
                      value={patientForm.responsible_party_relationship}
                      onChange={(value) => setPatientForm((current) => ({ ...current, responsible_party_relationship: value }))}
                    />
                    <Input
                      label="Responsible phone"
                      value={patientForm.responsible_party_phone}
                      onChange={(value) => setPatientForm((current) => ({ ...current, responsible_party_phone: formatUsPhone(value) }))}
                    />
                    <div className="row-actions">
                      <button className="secondary-button" type="button" onClick={copyEmergencyToResponsibleParty}>
                        Use emergency contact
                      </button>
                    </div>
                  </FormGrid>
                )}
                <div className="row-actions wrap wizard-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      setPatientWizardStep(
                        patientWizardStep === 'contacts' ? 'coverage' : patientWizardStep === 'coverage' ? 'identity' : 'identity',
                      )
                    }
                    disabled={patientWizardStep === 'identity'}
                  >
                    Back
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      setPatientWizardStep(
                        patientWizardStep === 'identity' ? 'coverage' : patientWizardStep === 'coverage' ? 'contacts' : 'contacts',
                      )
                    }
                    disabled={patientWizardStep === 'contacts'}
                  >
                    Next
                  </button>
                  <button className="primary-button" onClick={() => void savePatient()}>
                    {editingPatientId !== null ? 'Save patient changes' : 'Add patient'}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      resetPatientForm()
                      setPatientModalOpen(false)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </Panel>
            </Modal>
          </div>
        )}

        {activeModule === 'Referrals' && (
          <div className="module-stack">
            <WorkspaceHeader
              eyebrow="Referrals"
              title="Referral Queue"
              subtitle="Keep the queue visible and open the full intake form only when adding or correcting a referral."
              meta={
                <>
                  <span className="pill neutral">{dataset.referrals.length} referrals</span>
                  <span className="pill warn">
                    {dataset.referrals.filter((referral) => !referral.intake_ready).length} intake pending
                  </span>
                </>
              }
              actions={
                <button className="primary-button" type="button" onClick={openNewReferralModal}>
                  Add referral
                </button>
              }
            />
            <Panel title="Referral Queue" subtitle="Accepted referrals that can become episodes.">
              <div className="stack">
                {dataset.referrals.map((referral) => (
                  <div key={referral.id} className="action-row">
                    <div>
                      <strong>{referral.patient_name}</strong>
                      <p className="muted">
                        {referral.source_name} · {referral.admission_source} · {referral.primary_diagnosis}
                      </p>
                      <p className="muted">
                        {referral.referring_provider_name ?? 'Referrer pending'} · {referral.service_location_type ?? 'Service location pending'}
                      </p>
                      <p className="muted">
                        {referral.order_status ?? 'Order status pending'} · {referral.physician_orders_signed ? 'Signed orders received' : 'Signed orders pending'}
                      </p>
                    </div>
                    <div className="row-actions">
                      <span className="pill neutral">{referral.status}</span>
                      <button className="secondary-button" type="button" onClick={() => loadReferralIntoForm(referral)}>
                        Edit referral
                      </button>
                      <button className="secondary-button" onClick={() => void convertReferral(referral)} disabled={!referral.intake_ready}>
                        Create episode
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="eFax / Referral Inbox" subtitle="Capture inbound referral packets, classify them, and convert them into live referral work.">
              <div className="content-grid">
                <div className="stack">
                  {dataset.faxMessages.length > 0 ? (
                    dataset.faxMessages.map((fax) => (
                      <div key={fax.id} className="action-row">
                        <div>
                          <strong>{fax.source_name}</strong>
                          <p className="muted">
                            {fax.subject ?? 'Referral packet'} · {fax.packet_type} · Received {fax.received_at}
                          </p>
                          <p className="muted">
                            Status: {labelizeValue(fax.routing_status)} · Linked docs: {fax.linked_document_count}
                          </p>
                          {fax.route_note ? <p className="muted">{fax.route_note}</p> : null}
                        </div>
                        <div className="row-actions wrap">
                          <span className={`pill ${fax.routing_status === 'new' ? 'warn' : 'neutral'}`}>{labelizeValue(fax.routing_status)}</span>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() =>
                              setFaxRoutingForm((current) => ({
                                ...current,
                                fax_id: String(fax.id),
                                route_note: fax.route_note ?? '',
                              }))
                            }
                          >
                            Route packet
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="No inbound fax packets have been captured yet." />
                  )}
                </div>
                <div className="stack">
                  <strong>Add fax packet</strong>
                  <FormGrid>
                    <Input label="Source name" value={faxMessageForm.source_name} onChange={(value) => setFaxMessageForm((current) => ({ ...current, source_name: value }))} />
                    <Input label="From number" value={faxMessageForm.from_number} onChange={(value) => setFaxMessageForm((current) => ({ ...current, from_number: formatUsPhone(value) }))} />
                    <Input label="Subject" value={faxMessageForm.subject} onChange={(value) => setFaxMessageForm((current) => ({ ...current, subject: value }))} />
                    <Input label="Packet type" value={faxMessageForm.packet_type} onChange={(value) => setFaxMessageForm((current) => ({ ...current, packet_type: value }))} />
                    <Input label="Received at" type="datetime-local" value={faxMessageForm.received_at} onChange={(value) => setFaxMessageForm((current) => ({ ...current, received_at: value }))} />
                    <Input label="Linked document count" value={faxMessageForm.linked_document_count} onChange={(value) => setFaxMessageForm((current) => ({ ...current, linked_document_count: value }))} />
                    <Input label="Attachment note" value={faxMessageForm.attachment_note} onChange={(value) => setFaxMessageForm((current) => ({ ...current, attachment_note: value }))} />
                  </FormGrid>
                  <button className="primary-button" type="button" onClick={() => void saveFaxMessage()}>
                    Add fax packet
                  </button>
                  <strong>Route selected fax packet</strong>
                  <FormGrid>
                    <Select
                      label="Fax packet"
                      value={faxRoutingForm.fax_id}
                      onChange={(value) => setFaxRoutingForm((current) => ({ ...current, fax_id: value }))}
                      options={[
                        { label: 'Choose a packet', value: '' },
                        ...dataset.faxMessages.map((fax) => ({ label: `${fax.source_name} · ${labelizeValue(fax.routing_status)}`, value: String(fax.id) })),
                      ]}
                    />
                    <Input label="Routing status" value={faxRoutingForm.routing_status} onChange={(value) => setFaxRoutingForm((current) => ({ ...current, routing_status: value }))} />
                    <Select
                      label="Create referral"
                      value={faxRoutingForm.create_referral}
                      onChange={(value) => setFaxRoutingForm((current) => ({ ...current, create_referral: value }))}
                      options={[
                        { label: 'No', value: 'no' },
                        { label: 'Yes', value: 'yes' },
                      ]}
                    />
                    <Select
                      label="Patient"
                      value={faxRoutingForm.patient_id}
                      onChange={(value) => setFaxRoutingForm((current) => ({ ...current, patient_id: value }))}
                      options={dataset.patients.map((patient) => ({ label: nameForPatient(patient), value: String(patient.id) }))}
                    />
                    <Input label="Admission source" value={faxRoutingForm.admission_source} onChange={(value) => setFaxRoutingForm((current) => ({ ...current, admission_source: value }))} />
                    <Input label="Payer" value={faxRoutingForm.payer_type} onChange={(value) => setFaxRoutingForm((current) => ({ ...current, payer_type: value }))} />
                    <Input label="Diagnosis" value={faxRoutingForm.primary_diagnosis} onChange={(value) => setFaxRoutingForm((current) => ({ ...current, primary_diagnosis: value }))} />
                    <Input label="Planned SOC" type="date" value={faxRoutingForm.planned_soc_date} onChange={(value) => setFaxRoutingForm((current) => ({ ...current, planned_soc_date: value }))} />
                    <Input label="Requested disciplines" value={faxRoutingForm.requested_disciplines} onChange={(value) => setFaxRoutingForm((current) => ({ ...current, requested_disciplines: value }))} />
                    <Input label="Route note" value={faxRoutingForm.route_note} onChange={(value) => setFaxRoutingForm((current) => ({ ...current, route_note: value }))} />
                  </FormGrid>
                  <button className="secondary-button" type="button" onClick={() => void routeFaxMessageAction()}>
                    Route fax packet
                  </button>
                </div>
              </div>
            </Panel>
            <Modal
              open={referralModalOpen}
              title={editingReferralId !== null ? 'Edit referral' : 'Add referral'}
              onClose={() => {
                resetReferralForm(referralForm.patient_id)
                setReferralModalOpen(false)
              }}
            >
              <Panel title="Incoming Referral" subtitle="Capture referral source, physician details, face-to-face, caregiver, and service location.">
                <WizardSteps
                  steps={[
                    { label: 'Intake', value: 'intake' },
                    { label: 'Care Team', value: 'care_team' },
                    { label: 'Service', value: 'service' },
                  ]}
                  activeStep={referralWizardStep}
                  onChange={(value) => setReferralWizardStep(value as 'intake' | 'care_team' | 'service')}
                />
                {referralWizardStep === 'intake' && (
                  <FormGrid>
                    <Select
                      label="Patient"
                      value={referralForm.patient_id}
                      onChange={chooseReferralPatient}
                      options={dataset.patients.map((patient) => ({ label: nameForPatient(patient), value: String(patient.id) }))}
                    />
                    <Input label="Referral source" value={referralForm.source_name} onChange={(value) => setReferralForm((current) => ({ ...current, source_name: value }))} />
                    <Input label="Admission source" value={referralForm.admission_source} onChange={(value) => setReferralForm((current) => ({ ...current, admission_source: value }))} />
                    <Input label="Diagnosis" value={referralForm.primary_diagnosis} onChange={(value) => setReferralForm((current) => ({ ...current, primary_diagnosis: value }))} />
                    <Input label="Planned SOC" type="date" value={referralForm.planned_soc_date} onChange={(value) => setReferralForm((current) => ({ ...current, planned_soc_date: value }))} />
                    <Input label="Face-to-face date" type="date" value={referralForm.face_to_face_date} onChange={(value) => setReferralForm((current) => ({ ...current, face_to_face_date: value }))} />
                    <Select
                      label="Signed physician orders"
                      value={referralForm.physician_orders_signed}
                      onChange={(value) => setReferralForm((current) => ({ ...current, physician_orders_signed: value }))}
                      options={[
                        { label: 'Yes', value: 'yes' },
                        { label: 'No', value: 'no' },
                      ]}
                    />
                    <Input
                      label="Signed orders date/time"
                      type="datetime-local"
                      value={referralForm.physician_orders_signed_at}
                      onChange={(value) => setReferralForm((current) => ({ ...current, physician_orders_signed_at: value }))}
                    />
                    <Select
                      label="Insurance"
                      value={referralForm.payer_type}
                      onChange={(value) => setReferralForm((current) => ({ ...current, payer_type: value }))}
                      options={INSURANCE_OPTIONS.map((option) => ({ label: option, value: option }))}
                    />
                    <Input
                      label="Requested disciplines"
                      value={referralForm.requested_disciplines}
                      onChange={(value) => setReferralForm((current) => ({ ...current, requested_disciplines: value }))}
                    />
                    <Input
                      label="Order status"
                      value={referralForm.order_status}
                      onChange={(value) => setReferralForm((current) => ({ ...current, order_status: value }))}
                    />
                    <Input label="Notes" value={referralForm.notes} onChange={(value) => setReferralForm((current) => ({ ...current, notes: value }))} />
                  </FormGrid>
                )}
                {referralWizardStep === 'care_team' && (
                  <FormGrid>
                    <Input
                      label="Referring provider"
                      value={referralForm.referring_provider_name}
                      onChange={(value) => setReferralForm((current) => ({ ...current, referring_provider_name: value }))}
                    />
                    <Input
                      label="Referring phone"
                      value={referralForm.referring_provider_phone}
                      onChange={(value) => setReferralForm((current) => ({ ...current, referring_provider_phone: formatUsPhone(value) }))}
                    />
                    <Input label="PCP" value={referralForm.pcp_name} onChange={(value) => setReferralForm((current) => ({ ...current, pcp_name: value }))} />
                    <Input label="PCP phone" value={referralForm.pcp_phone} onChange={(value) => setReferralForm((current) => ({ ...current, pcp_phone: formatUsPhone(value) }))} />
                    <div className="row-actions">
                      <button className="secondary-button" type="button" onClick={copyPatientPcpToReferral}>
                        Use patient PCP
                      </button>
                    </div>
                    <Input
                      label="Caregiver"
                      value={referralForm.caregiver_name}
                      onChange={(value) => setReferralForm((current) => ({ ...current, caregiver_name: value }))}
                    />
                    <Input
                      label="Caregiver relationship"
                      value={referralForm.caregiver_relationship}
                      onChange={(value) => setReferralForm((current) => ({ ...current, caregiver_relationship: value }))}
                    />
                    <Input
                      label="Caregiver phone"
                      value={referralForm.caregiver_phone}
                      onChange={(value) => setReferralForm((current) => ({ ...current, caregiver_phone: formatUsPhone(value) }))}
                    />
                  </FormGrid>
                )}
                {referralWizardStep === 'service' && (
                  <>
                    <FormGrid>
                      <Input
                        label="Service location"
                        value={referralForm.service_location_type}
                        onChange={(value) => setReferralForm((current) => ({ ...current, service_location_type: value }))}
                      />
                      <Input
                        label="Service address"
                        value={referralForm.service_address1}
                        onChange={(value) => setReferralForm((current) => ({ ...current, service_address1: value }))}
                      />
                      <Input
                        label="Service city"
                        value={referralForm.service_city}
                        onChange={(value) => setReferralForm((current) => ({ ...current, service_city: value }))}
                      />
                      <Input
                        label="Service state"
                        value={referralForm.service_state}
                        onChange={(value) => setReferralForm((current) => ({ ...current, service_state: formatStateCode(value) }))}
                      />
                      <Input
                        label="Service ZIP"
                        value={referralForm.service_postal_code}
                        onChange={(value) => setReferralForm((current) => ({ ...current, service_postal_code: formatZipCode(value) }))}
                      />
                    </FormGrid>
                    <div className="row-actions">
                      <button className="secondary-button" type="button" onClick={copyPatientAddressToReferral}>
                        Use patient address
                      </button>
                    </div>
                  </>
                )}
                <div className="row-actions wrap wizard-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      setReferralWizardStep(
                        referralWizardStep === 'service' ? 'care_team' : referralWizardStep === 'care_team' ? 'intake' : 'intake',
                      )
                    }
                    disabled={referralWizardStep === 'intake'}
                  >
                    Back
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      setReferralWizardStep(
                        referralWizardStep === 'intake' ? 'care_team' : referralWizardStep === 'care_team' ? 'service' : 'service',
                      )
                    }
                    disabled={referralWizardStep === 'service'}
                  >
                    Next
                  </button>
                  <button className="primary-button" onClick={() => void saveReferral()}>
                    {editingReferralId !== null ? 'Save referral changes' : 'Capture referral'}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      resetReferralForm(referralForm.patient_id)
                      setReferralModalOpen(false)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </Panel>
            </Modal>
          </div>
        )}

        {activeModule === 'Episodes' && (
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
        )}

        {activeModule === 'Clinician' && (
          <div className="module-stack">
            <WorkspaceHeader
              eyebrow="Clinician"
              title="Clinician Workspace"
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
        )}

        {activeModule === 'Billing' && (
          <div className="module-stack">
            <WorkspaceHeader
              eyebrow="Billing"
              title="Billing Workspace"
              subtitle="Work claim lifecycle, EVV follow-up, and denial correction from one operational revenue-cycle view."
              meta={
                <>
                  <span className="pill warn">{dataset.metrics.claimsOnHold} on hold</span>
                  <span className="pill neutral">{dataset.claims.length} claims</span>
                  <span className="pill warn">
                    {dataset.evvRecords.filter((record) => record.status !== 'reconciled').length} EVV open
                  </span>
                </>
              }
            />
          <div className="content-grid">
            <Panel
              title="Unified Billing Follow-Up"
              subtitle="Work each episode from one place when denial correction, claim blockers, and EVV follow-up overlap."
              tone="emphasis"
            >
              <div className="stack">
                {billingFollowUpSections.map((section) => (
                  <div key={section.key} className="stack">
                    <strong>{section.title}</strong>
                    <FieldNote text={section.subtitle} />
                    {section.items.length > 0 ? (
                      section.items.map((item) => (
                        <div key={`billing-follow-up-${item.episode.id}`} className="action-row">
                          <div>
                            <strong>{item.patientName} · Episode {item.episode.id}</strong>
                            <p className="muted">
                              {item.state === 'claim_and_evv'
                                ? 'Claim and EVV follow-up are both still open.'
                                : item.state === 'claim_only'
                                  ? 'Claim-side follow-up is still open.'
                                  : 'EVV follow-up is still open.'}
                            </p>
                            {item.claimIssues.length > 0 ? <p className="muted">Claim: {item.claimIssues.join(' | ')}</p> : null}
                            {item.evvIssues.length > 0 ? <p className="muted">EVV: {item.evvIssues.join(' | ')}</p> : null}
                            <p className="muted">Next step: {item.nextAction.label}</p>
                          </div>
                          <div className="row-actions wrap">
                            <span className={`pill ${item.state === 'claim_and_evv' ? 'warn' : 'neutral'}`}>
                              {item.state === 'claim_and_evv' ? 'Claim + EVV' : item.state === 'claim_only' ? 'Claim only' : 'EVV only'}
                            </span>
                            <span className={`pill ${item.priority === 'high' ? 'warn' : 'neutral'}`}>{labelizeValue(item.priority)}</span>
                            <button className="secondary-button" type="button" onClick={() => runBillingFollowUpAction(item)}>
                              {item.nextAction.label}
                            </button>
                            <button className="secondary-button" type="button" onClick={() => applyEpisodeContext(item.episode)}>
                              Open episode
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        text={
                          section.key === 'claim_and_evv'
                            ? 'No episodes currently have both claim and EVV follow-up open.'
                            : section.key === 'claim_only'
                              ? 'No episodes currently have claim-only follow-up open.'
                              : 'No episodes currently have EVV-only follow-up open.'
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Claims and Billing" subtitle="NOA, episode billing, and PDGM-related holds." tone="emphasis">
              <div className="stack">
                {claimReadinessQueue.map((item) => (
                  <div key={item.claim.id} className="action-row">
                    <div>
                      <strong>{item.claim.claim_type.toUpperCase()} claim</strong>
                      <p className="muted">
                        {item.patientName} · Episode {item.claim.episode_id}{' '}
                        {item.claim.amount !== undefined && item.claim.amount !== null ? `· ${formatCurrency(item.claim.amount)}` : ''}
                      </p>
                      <p className="muted">
                        {item.claim.hold_reason ? item.claim.hold_reason : item.readyToBill ? 'Billing readiness complete.' : item.blockers[0]}
                      </p>
                      <p className="muted">
                        Owners: {item.relatedOwners.join(', ') || 'None'} · Assignees: {item.relatedAssignees.join(', ') || 'Unassigned'} · Priority: {labelizeValue(item.highestPriority ?? 'none')} · {formatDueAt(item.earliestDueAt)}
                      </p>
                      <p className="muted">
                        Submitted: {item.claim.submitted_at ?? 'Not submitted'} · Accepted: {item.claim.accepted_at ?? 'Pending'} · Paid: {item.claim.paid_at ?? 'Pending'}
                      </p>
                      {item.claim.corrected_from_claim_id ? (
                        <p className="muted">
                          Corrected from claim #{item.claim.corrected_from_claim_id}
                          {item.claim.correction_reason ? ` · ${item.claim.correction_reason}` : ''}
                        </p>
                      ) : null}
                      {item.claim.payer_claim_number ? <p className="muted">Payer claim #: {item.claim.payer_claim_number}</p> : null}
                      {item.claim.rejection_reason ? <p className="muted">Rejection: {item.claim.rejection_reason}</p> : null}
                      {item.claim.void_reason ? <p className="muted">Void reason: {item.claim.void_reason}</p> : null}
                      {item.escalationReasons[0] ? <p className="muted">Escalation: {item.escalationReasons[0]}</p> : null}
                    </div>
                    <div className="row-actions wrap">
                      <span className={`pill ${item.claim.hold_reason || !item.readyToBill ? 'warn' : 'neutral'}`}>{item.claim.status}</span>
                      {item.badges.map((badge) => (
                        <span key={`${item.claim.id}-${badge.label}`} className={`pill ${badge.tone}`}>
                          {badge.label}
                        </span>
                      ))}
                      <button className="secondary-button" onClick={() => void submitClaim(item.claim.id)}>
                        Submit claim
                      </button>
                      {availableClaimActions(item.claim).map((action) => (
                        <button
                          key={`${item.claim.id}-${action}`}
                          className="secondary-button"
                          type="button"
                          onClick={() => prepareClaimLifecycleAction(item.claim, action)}
                        >
                          {labelizeClaimAction(action)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="stack">
                <strong>Claim Lifecycle Update</strong>
                <FormGrid>
                  <Select
                    label="Claim"
                    value={claimLifecycleForm.claim_id}
                    onChange={(value) => setClaimLifecycleForm((current) => ({ ...current, claim_id: value }))}
                    options={[
                      { label: 'Choose a claim', value: '' },
                      ...dataset.claims.map((claim) => ({
                        label: `${claim.claim_type.toUpperCase()} · Episode ${claim.episode_id} · ${labelizeValue(claim.status)}`,
                        value: String(claim.id),
                      })),
                    ]}
                  />
                  <Select
                    label="Action"
                    value={claimLifecycleForm.action}
                    onChange={(value) => setClaimLifecycleForm((current) => ({ ...current, action: value }))}
                    options={[
                      { label: 'Accept claim', value: 'accept' },
                      { label: 'Reject claim', value: 'reject' },
                      { label: 'Create corrected claim', value: 'corrected' },
                      { label: 'Post payment', value: 'post_payment' },
                      { label: 'Void claim', value: 'void' },
                    ]}
                  />
                  <Input
                    label="Payer claim number"
                    value={claimLifecycleForm.payer_claim_number}
                    onChange={(value) => setClaimLifecycleForm((current) => ({ ...current, payer_claim_number: value }))}
                  />
                  <Input
                    label="Payment amount"
                    value={claimLifecycleForm.payment_amount}
                    onChange={(value) => setClaimLifecycleForm((current) => ({ ...current, payment_amount: value }))}
                  />
                  <Input
                    label="Remittance reference"
                    value={claimLifecycleForm.remittance_reference}
                    onChange={(value) => setClaimLifecycleForm((current) => ({ ...current, remittance_reference: value }))}
                  />
                  <Input
                    label="Rejection reason"
                    value={claimLifecycleForm.rejection_reason}
                    onChange={(value) => setClaimLifecycleForm((current) => ({ ...current, rejection_reason: value }))}
                  />
                  <Input
                    label="Void reason"
                    value={claimLifecycleForm.void_reason}
                    onChange={(value) => setClaimLifecycleForm((current) => ({ ...current, void_reason: value }))}
                  />
                  <Input
                    label="Correction reason"
                    value={claimLifecycleForm.correction_reason}
                    onChange={(value) => setClaimLifecycleForm((current) => ({ ...current, correction_reason: value }))}
                  />
                </FormGrid>
                <button className="primary-button" type="button" onClick={() => void runClaimLifecycleAction()}>
                  Apply claim action
                </button>
              </div>
            </Panel>
            <Panel
              title="EDI and Remittance Ledger"
              subtitle="Demo-ready 837I, 277, and 835/ERA tracking with payer control numbers and reconciliation notes."
              tone="soft"
            >
              <div className="content-grid">
                <div className="stack">
                  <strong>Claim transactions</strong>
                  {selectedEpisodeClaimTransactions.length > 0 ? (
                    selectedEpisodeClaimTransactions.map((transaction) => (
                      <div key={`claim-transaction-${transaction.id}`} className="action-row">
                        <div>
                          <strong>{transaction.transaction_type}</strong>
                          <p className="muted">
                            {labelizeValue(transaction.transaction_status)} · Payer control: {transaction.payer_control_number ?? 'Pending'} · {transaction.transmitted_at ?? 'Not transmitted'}
                          </p>
                          <p className="muted">{transaction.payload_summary ?? 'No payload summary recorded.'}</p>
                          {transaction.response_summary ? <p className="muted">Response: {transaction.response_summary}</p> : null}
                        </div>
                        <span className={`pill ${transaction.transaction_status === 'accepted' ? 'neutral' : 'warn'}`}>
                          {labelizeValue(transaction.transaction_status)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="No claim transactions are tracked for the selected episode." />
                  )}
                  <FormGrid>
                    <Select
                      label="Claim"
                      value={claimTransactionForm.claim_id}
                      onChange={(value) => setClaimTransactionForm((current) => ({ ...current, claim_id: value }))}
                      options={[
                        { label: 'Choose a claim', value: '' },
                        ...dataset.claims.map((claim) => ({ label: `${claim.claim_type.toUpperCase()} · Episode ${claim.episode_id}`, value: String(claim.id) })),
                      ]}
                    />
                    <Input label="Transaction type" value={claimTransactionForm.transaction_type} onChange={(value) => setClaimTransactionForm((current) => ({ ...current, transaction_type: value }))} />
                    <Input label="Status" value={claimTransactionForm.transaction_status} onChange={(value) => setClaimTransactionForm((current) => ({ ...current, transaction_status: value }))} />
                    <Input label="Payer control #" value={claimTransactionForm.payer_control_number} onChange={(value) => setClaimTransactionForm((current) => ({ ...current, payer_control_number: value }))} />
                    <Input label="Transmitted at" type="datetime-local" value={claimTransactionForm.transmitted_at} onChange={(value) => setClaimTransactionForm((current) => ({ ...current, transmitted_at: value }))} />
                    <Input label="Payload summary" value={claimTransactionForm.payload_summary} onChange={(value) => setClaimTransactionForm((current) => ({ ...current, payload_summary: value }))} />
                    <Input label="Response summary" value={claimTransactionForm.response_summary} onChange={(value) => setClaimTransactionForm((current) => ({ ...current, response_summary: value }))} />
                  </FormGrid>
                  <button className="secondary-button" type="button" onClick={() => void saveClaimTransaction()}>
                    Save claim transaction
                  </button>
                </div>
                <div className="stack">
                  <strong>835/ERA remittance</strong>
                  {selectedEpisodeRemittancePostings.length > 0 ? (
                    selectedEpisodeRemittancePostings.map((posting) => (
                      <div key={`remittance-${posting.id}`} className="action-row">
                        <div>
                          <strong>{posting.era_reference ?? `ERA ${posting.id}`}</strong>
                          <p className="muted">
                            Paid {formatCurrency(posting.payment_amount ?? 0)} · Adjusted {formatCurrency(posting.adjustment_amount ?? 0)} · {posting.posted_at ?? 'Not posted'}
                          </p>
                          <p className="muted">{posting.reason_codes ?? 'No reason codes recorded.'}</p>
                        </div>
                        <span className={`pill ${posting.reconciliation_status === 'posted' ? 'neutral' : 'warn'}`}>
                          {labelizeValue(posting.reconciliation_status)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="No remittance postings are tracked for the selected episode." />
                  )}
                  <FormGrid>
                    <Select
                      label="Claim"
                      value={remittanceForm.claim_id}
                      onChange={(value) => setRemittanceForm((current) => ({ ...current, claim_id: value }))}
                      options={[
                        { label: 'Choose a claim', value: '' },
                        ...dataset.claims.map((claim) => ({ label: `${claim.claim_type.toUpperCase()} · Episode ${claim.episode_id}`, value: String(claim.id) })),
                      ]}
                    />
                    <Input label="ERA reference" value={remittanceForm.era_reference} onChange={(value) => setRemittanceForm((current) => ({ ...current, era_reference: value }))} />
                    <Input label="Payment amount" value={remittanceForm.payment_amount} onChange={(value) => setRemittanceForm((current) => ({ ...current, payment_amount: value }))} />
                    <Input label="Adjustment amount" value={remittanceForm.adjustment_amount} onChange={(value) => setRemittanceForm((current) => ({ ...current, adjustment_amount: value }))} />
                    <Input label="Reason codes" value={remittanceForm.reason_codes} onChange={(value) => setRemittanceForm((current) => ({ ...current, reason_codes: value }))} />
                    <Input label="Posted at" type="datetime-local" value={remittanceForm.posted_at} onChange={(value) => setRemittanceForm((current) => ({ ...current, posted_at: value }))} />
                    <Input label="Reconciliation" value={remittanceForm.reconciliation_status} onChange={(value) => setRemittanceForm((current) => ({ ...current, reconciliation_status: value }))} />
                  </FormGrid>
                  <button className="secondary-button" type="button" onClick={() => void saveRemittancePosting()}>
                    Save remittance
                  </button>
                </div>
              </div>
            </Panel>
            <Panel
              title="Coder Review Queue"
              subtitle="Tie diagnosis reconciliation, claim-edit follow-up, utilization risk, and corrected-claim preparation into one coding work surface."
              tone="soft"
            >
              <div className="stack">
                <div className="row-actions wrap">
                  <button className="primary-button" type="button" onClick={() => void syncCoderReviewForSelectedEpisode()}>
                    Sync selected episode
                  </button>
                </div>
                {dataset.coderReviewItems.length > 0 ? (
                  dataset.coderReviewItems.map((item) => (
                    <div key={item.id} className="action-row">
                      <div>
                        <strong>{item.title}</strong>
                        <p className="muted">
                          Episode {item.episode_id} · {labelizeValue(item.category)} · {labelizeValue(item.priority)}
                        </p>
                        {item.details ? <p className="muted">{item.details}</p> : null}
                        {item.recommendation ? <p className="muted">Recommendation: {item.recommendation}</p> : null}
                        {item.correction_note ? <p className="muted">Correction note: {item.correction_note}</p> : null}
                      </div>
                      <div className="row-actions wrap">
                        <span className={`pill ${item.status === 'resolved' ? 'neutral' : 'warn'}`}>{labelizeValue(item.status)}</span>
                        <button className="secondary-button" type="button" onClick={() => loadCoderReviewIntoForm(item)}>
                          Update item
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No coder-review items are currently open. Sync an episode to build the queue from live blockers." />
                )}
                <FormGrid>
                  <Select
                    label="Coder review item"
                    value={coderReviewForm.item_id}
                    onChange={(value) => setCoderReviewForm((current) => ({ ...current, item_id: value }))}
                    options={[
                      { label: 'Choose an item', value: '' },
                      ...dataset.coderReviewItems.map((item) => ({ label: `${item.title} · Episode ${item.episode_id}`, value: String(item.id) })),
                    ]}
                  />
                  <Select
                    label="Status"
                    value={coderReviewForm.status}
                    onChange={(value) => setCoderReviewForm((current) => ({ ...current, status: value }))}
                    options={[
                      { label: 'Open', value: 'open' },
                      { label: 'Resolved', value: 'resolved' },
                    ]}
                  />
                  <Input
                    label="Recommendation"
                    value={coderReviewForm.recommendation}
                    onChange={(value) => setCoderReviewForm((current) => ({ ...current, recommendation: value }))}
                  />
                  <Input
                    label="Correction note"
                    value={coderReviewForm.correction_note}
                    onChange={(value) => setCoderReviewForm((current) => ({ ...current, correction_note: value }))}
                  />
                </FormGrid>
                <button className="secondary-button" type="button" onClick={() => void saveCoderReviewItem()}>
                  Save coder review item
                </button>
              </div>
            </Panel>
            <Panel
              title="Claim Status Lanes"
              subtitle="Separate submitted, accepted, denied/rework, and paid claims so Billing can work each state intentionally."
              tone="soft"
              density="compact"
            >
              <div className="stack">
                {claimStatusLanes.map((lane) => (
                  <div key={lane.key} className="stack">
                    <strong>{lane.title}</strong>
                    <FieldNote text={lane.subtitle} />
                    {lane.claims.length > 0 ? (
                      lane.claims.map((item) => (
                        <div key={`lane-${lane.key}-${item.claim.id}`} className="action-row">
                          <div>
                            <strong>{item.patientName} · {item.claim.claim_type.toUpperCase()} claim</strong>
                            <p className="muted">
                              Episode {item.claim.episode_id} · {labelizeValue(item.claim.status)}
                              {item.claim.amount !== undefined && item.claim.amount !== null ? ` · ${formatCurrency(item.claim.amount)}` : ''}
                            </p>
                            <p className="muted">
                              {item.claim.rejection_reason ?? item.claim.void_reason ?? item.claim.correction_reason ?? item.claim.hold_reason ?? 'No additional note recorded.'}
                            </p>
                          </div>
                          <div className="row-actions wrap">
                            <span className={`pill ${lane.key === 'paid' ? 'neutral' : lane.key === 'accepted' ? 'neutral' : 'warn'}`}>{item.claim.status}</span>
                            {availableClaimActions(item.claim).map((action) => (
                              <button
                                key={`lane-${item.claim.id}-${action}`}
                                className="secondary-button"
                                type="button"
                                onClick={() => prepareClaimLifecycleAction(item.claim, action)}
                              >
                                {labelizeClaimAction(action)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text={`No claims are currently in the ${lane.title.toLowerCase()} lane.`} />
                    )}
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Denial and Rework Queue"
              subtitle="Track rejected and voided claims through correction, readiness, and corrected resubmission."
              tone="emphasis"
            >
              <div className="stack">
                {denialQueueSections.map((section) => (
                  <div key={section.key} className="stack">
                    <strong>{section.title}</strong>
                    <FieldNote text={section.subtitle} />
                    {section.items.length > 0 ? (
                      section.items.map((item) => {
                        const focusedEpisode = item.workingClaim?.episode ?? item.baseClaim.episode
                        const correctedClaimId = item.workingClaim?.claim.id

                        return (
                          <div key={`denial-${item.baseClaim.claim.id}`} className="action-row">
                            <div>
                              <strong>
                                {item.baseClaim.patientName} · {item.baseClaim.claim.claim_type.toUpperCase()} claim
                              </strong>
                              <p className="muted">
                                Category: {item.categoryLabel} · Parent claim #{item.baseClaim.claim.id}
                                {correctedClaimId ? ` · Corrected claim #${correctedClaimId}` : ''}
                              </p>
                              <p className="muted">{item.summary}</p>
                              <p className="muted">{item.note}</p>
                              <p className="muted">
                                Owners: {item.owners.join(', ') || 'Billing'} · Assignees: {item.assignees.join(', ') || 'Unassigned'} · Priority: {labelizeValue(item.priority)} · {formatDueAt(item.earliestDueAt)}
                              </p>
                              {item.escalationReason ? <p className="muted">Escalation: {item.escalationReason}</p> : null}
                            </div>
                            <div className="row-actions wrap">
                              <span className={`pill ${item.queueState === 'ready_to_resubmit' ? 'neutral' : 'warn'}`}>
                                {item.queueState === 'ready_to_resubmit' ? 'Ready to resubmit' : 'Needs correction'}
                              </span>
                              <span className={`pill ${item.priority === 'high' ? 'warn' : 'neutral'}`}>{labelizeValue(item.priority)}</span>
                              {!item.workingClaim ? (
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() => prepareClaimLifecycleAction(item.baseClaim.claim, 'corrected')}
                                >
                                  Create corrected claim
                                </button>
                              ) : item.queueState === 'ready_to_resubmit' ? (
                                <button className="secondary-button" type="button" onClick={() => void submitClaim(correctedClaimId ?? item.baseClaim.claim.id)}>
                                  Submit corrected claim
                                </button>
                              ) : (
                                <button
                                  className="secondary-button"
                                  type="button"
                                  onClick={() =>
                                    focusedEpisode
                                      ? resolveNextEpisodeBlocker(buildDemoEpisodeReviewSummary(focusedEpisode, dataset), focusedEpisode)
                                      : undefined
                                  }
                                >
                                  Resolve blockers
                                </button>
                              )}
                              {focusedEpisode ? (
                                <button className="secondary-button" type="button" onClick={() => applyEpisodeContext(focusedEpisode)}>
                                  Open episode
                                </button>
                              ) : null}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <EmptyState
                        text={
                          section.key === 'needs_correction'
                            ? 'No denied claims are currently waiting on correction work.'
                            : 'No corrected claims are staged and ready to resubmit right now.'
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Billing Readiness Queue"
              subtitle="Claims blocked by intake documentation, coding, QA, or PDGM readiness."
              density="compact"
            >
              <FormGrid>
                <Select
                  label="Owner filter"
                  value={billingQueueOwnerFilter}
                  onChange={setBillingQueueOwnerFilter}
                  options={[
                    { label: 'All owners', value: 'All' },
                    { label: 'Intake', value: 'Intake' },
                    { label: 'Clinical', value: 'Clinical' },
                    { label: 'QA', value: 'QA' },
                    { label: 'Billing', value: 'Billing' },
                  ]}
                />
                <Select
                  label="Blocker filter"
                  value={billingQueueBlockerFilter}
                  onChange={setBillingQueueBlockerFilter}
                  options={[
                    { label: 'All blockers', value: 'All' },
                    { label: 'Face-to-face', value: 'Face-to-face' },
                    { label: 'Signed orders', value: 'Signed orders' },
                    { label: 'Documentation', value: 'Documentation' },
                  ]}
                />
              </FormGrid>
              <div className="stack">
                {filteredClaimReadinessQueue.filter((item) => !item.readyToBill || Boolean(item.claim.hold_reason)).length > 0 ? (
                  filteredClaimReadinessQueue
                    .filter((item) => !item.readyToBill || Boolean(item.claim.hold_reason))
                    .map((item) => {
                      const episode = item.episode
                      return (
                        <div key={`queue-${item.claim.id}`} className="action-row">
                          <div>
                            <strong>
                              {item.patientName} · {item.claim.claim_type.toUpperCase()} claim
                            </strong>
                            <p className="muted">Episode {item.claim.episode_id}</p>
                            <p className="muted">{item.blockers.join(' | ') || item.claim.hold_reason || 'Claim hold requires review.'}</p>
                            <p className="muted">
                              Owners: {item.relatedOwners.join(', ') || 'None'} · Assignees: {item.relatedAssignees.join(', ') || 'Unassigned'} · Priority: {labelizeValue(item.highestPriority ?? 'none')} · {formatDueAt(item.earliestDueAt)}
                            </p>
                            {item.escalationReasons[0] ? <p className="muted">Escalation: {item.escalationReasons[0]}</p> : null}
                          </div>
                          <div className="row-actions wrap">
                            {item.badges.map((badge) => (
                              <span key={`queue-${item.claim.id}-${badge.label}`} className={`pill ${badge.tone}`}>
                                {badge.label}
                              </span>
                            ))}
                            {episode ? (
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => resolveNextEpisodeBlocker(buildDemoEpisodeReviewSummary(episode, dataset), episode)}
                              >
                                Resolve next blocker
                              </button>
                            ) : null}
                            {episode ? (
                              <button className="secondary-button" onClick={() => applyEpisodeContext(episode)}>
                                Open episode
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <EmptyState text="No blocked claims match the current readiness filters." />
                )}
              </div>
            </Panel>
            <Panel
              title="EVV Operations Queue"
              subtitle="Work EVV exceptions, submission follow-up, and reconciliation in the order Billing needs to clear visits for payment."
              tone="soft"
              density="compact"
            >
              <div className="stack">
                {evvQueueSections.map((section) => (
                  <div key={section.key} className="stack">
                    <strong>{section.title}</strong>
                    <FieldNote text={section.subtitle} />
                    {section.items.length > 0 ? (
                      section.items.map((item) => (
                        <div key={`evv-queue-${item.record.id}`} className="action-row">
                          <div>
                            <strong>
                              {item.patientName} · Visit {item.record.visit_id}
                            </strong>
                            <p className="muted">
                              {item.visit ? `${item.visit.discipline} ${item.visit.visit_type.toUpperCase()} · ` : ''}
                              {item.categoryLabel} · {labelizeValue(item.record.status)}
                            </p>
                            <p className="muted">{item.summary}</p>
                            <p className="muted">{item.note}</p>
                            <p className="muted">
                              Priority: {labelizeValue(item.priority)} · {formatDueAt(item.dueAt)}
                            </p>
                          </div>
                          <div className="row-actions wrap">
                            <span className={`pill ${item.queueState === 'needs_fix' ? 'warn' : 'neutral'}`}>
                              {item.queueState === 'needs_fix'
                                ? 'Needs fix'
                                : item.queueState === 'ready_to_reconcile'
                                  ? 'Ready to reconcile'
                                  : 'Reconciled'}
                            </span>
                            <span className={`pill ${item.priority === 'high' ? 'warn' : 'neutral'}`}>{labelizeValue(item.priority)}</span>
                            {item.record.status === 'pending_submission' ? (
                              <button className="secondary-button" type="button" onClick={() => void submitEvv(item.record.id)}>
                                Submit EVV
                              </button>
                            ) : null}
                            {item.record.status === 'submitted' ? (
                              <button className="secondary-button" type="button" onClick={() => prepareEvvLifecycleAction(item.record, 'reconcile')}>
                                Reconcile
                              </button>
                            ) : null}
                            {item.record.status === 'submitted' ? (
                              <button className="secondary-button" type="button" onClick={() => prepareEvvLifecycleAction(item.record, 'exception')}>
                                Mark exception
                              </button>
                            ) : null}
                            {item.record.status === 'exception' ? (
                              <button className="secondary-button" type="button" onClick={() => prepareEvvLifecycleAction(item.record, 'reconcile')}>
                                Clear and reconcile
                              </button>
                            ) : null}
                            {item.record.status === 'exception' ? (
                              <button className="secondary-button" type="button" onClick={() => prepareEvvLifecycleAction(item.record, 'exception')}>
                                Update exception
                              </button>
                            ) : null}
                            {item.episode ? (
                              <button className="secondary-button" type="button" onClick={() => applyEpisodeContext(item.episode!)}>
                                Open episode
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        text={
                          section.key === 'needs_fix'
                            ? 'No EVV records currently need submission or exception cleanup.'
                            : section.key === 'ready_to_reconcile'
                              ? 'No EVV records are waiting on reconciliation right now.'
                              : 'No reconciled EVV records are available yet.'
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Georgia EVV" subtitle="Review and submit visit verification records.">
              <div className="stack">
                {dataset.evvRecords.map((record) => (
                  <div key={record.id} className="action-row">
                    <div>
                      <strong>Visit {record.visit_id}</strong>
                      <p className="muted">
                        {record.vendor_name} · {record.state_code}
                      </p>
                      <p className="muted">
                        Submitted: {record.submitted_at ?? 'Pending'} · Reconciled: {record.reconciled_at ?? 'Pending'}
                      </p>
                      {record.submission_reference ? <p className="muted">Vendor ref: {record.submission_reference}</p> : null}
                      {record.exception_reason ? <p className="muted">Exception: {record.exception_reason}</p> : null}
                    </div>
                    <div className="row-actions wrap">
                      <span className="pill neutral">{record.status}</span>
                      <button className="secondary-button" onClick={() => void submitEvv(record.id)}>
                        Submit EVV
                      </button>
                      <button className="secondary-button" type="button" onClick={() => prepareEvvLifecycleAction(record, 'exception')}>
                        Mark exception
                      </button>
                      <button className="secondary-button" type="button" onClick={() => prepareEvvLifecycleAction(record, 'reconcile')}>
                        Reconcile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="stack">
                <strong>EVV Exception Management</strong>
                <FormGrid>
                  <Select
                    label="EVV record"
                    value={evvLifecycleForm.record_id}
                    onChange={(value) => setEvvLifecycleForm((current) => ({ ...current, record_id: value }))}
                    options={[
                      { label: 'Choose an EVV record', value: '' },
                      ...dataset.evvRecords.map((record) => ({
                        label: `Visit ${record.visit_id} · ${labelizeValue(record.status)}`,
                        value: String(record.id),
                      })),
                    ]}
                  />
                  <Select
                    label="Action"
                    value={evvLifecycleForm.action}
                    onChange={(value) => setEvvLifecycleForm((current) => ({ ...current, action: value }))}
                    options={[
                      { label: 'Mark exception', value: 'exception' },
                      { label: 'Reconcile record', value: 'reconcile' },
                    ]}
                  />
                  <Input
                    label="Exception reason"
                    value={evvLifecycleForm.exception_reason}
                    onChange={(value) => setEvvLifecycleForm((current) => ({ ...current, exception_reason: value }))}
                  />
                </FormGrid>
                <button className="primary-button" type="button" onClick={() => void runEvvLifecycleAction()}>
                  Apply EVV action
                </button>
              </div>
            </Panel>
          </div>
          </div>
        )}

        {activeModule === 'QA' && (
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
        )}

        {activeModule === 'Admin' && (
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
        )}

        <footer className="footer-panel">
          <div>
            <strong>Selected patient</strong>
            <p className="muted">{selectedPatient ? `${nameForPatient(selectedPatient)} · ${selectedPatient.payer_type}` : 'No patient loaded'}</p>
          </div>
          <div>
            <strong>Workspace</strong>
            <p className="muted">{activeModule} · {mode === 'api' && isBrowserOnline ? 'Live API' : mode === 'api' ? 'Browser offline' : 'Demo mode'}</p>
          </div>
        </footer>
      </main>
    </div>
  )
}

function ModuleIcon({ moduleName }: { moduleName: ModuleName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (moduleName) {
    case 'Overview':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1.5" {...common} />
          <rect x="14" y="4" width="6" height="10" rx="1.5" {...common} />
          <rect x="4" y="14" width="6" height="6" rx="1.5" {...common} />
          <rect x="14" y="16" width="6" height="4" rx="1.5" {...common} />
        </svg>
      )
    case 'Patients':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" {...common} />
          <path d="M5.5 19c1.8-3 4.1-4.5 6.5-4.5s4.7 1.5 6.5 4.5" {...common} />
        </svg>
      )
    case 'Referrals':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 5.5h12v13H6z" {...common} />
          <path d="M9 9h6M9 12h6M9 15h4" {...common} />
          <path d="M15 5.5v4h4" {...common} />
        </svg>
      )
    case 'Episodes':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v16" {...common} />
          <path d="M7 8h10" {...common} />
          <path d="M7 12h10" {...common} />
          <path d="M7 16h10" {...common} />
        </svg>
      )
    case 'Clinician':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14" {...common} />
          <path d="M8 9h8" {...common} />
          <path d="M9 19h6" {...common} />
          <path d="M9.5 5h5" {...common} />
        </svg>
      )
    case 'Billing':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h12v12H6z" {...common} />
          <path d="M9 10.5c.7-.7 1.6-1 2.7-1 1.8 0 3.3.9 3.3 2.5 0 2.8-4.5 2-4.5 4.2 0 .3 0 .5.1.8" {...common} />
          <path d="M12 7.5v2M12 16.5v1" {...common} />
        </svg>
      )
    case 'QA':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 12.5l3 3 7-7" {...common} />
          <circle cx="12" cy="12" r="8" {...common} />
        </svg>
      )
    case 'Admin':
      return (
        <svg className="module-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.5l1.7 2.1 2.7.5.5 2.7 2.1 1.7-2.1 1.7-.5 2.7-2.7.5-1.7 2.1-1.7-2.1-2.7-.5-.5-2.7-2.1-1.7 2.1-1.7.5-2.7 2.7-.5z" {...common} />
          <circle cx="12" cy="12" r="2.5" {...common} />
        </svg>
      )
  }
}

export default App
