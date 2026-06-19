import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import type { QaAssignmentDraft } from '../components/ui'
import { api } from '../lib/api'
import {
  formatStateCode,
  formatTaskAssignee,
  formatUsPhone,
  formatZipCode,
  labelizeValue,
} from '../domain/formatters'
import {
  normalizeAdmissionSnapshot,
  normalizeAssessmentAnswers,
  normalizeAssessmentPayload,
  normalizeDateTimeString,
  normalizeDocumentationPayload,
  normalizeQaTaskHistory,
  normalizeQapiProjects,
  normalizeQaTasksForUi,
} from '../domain/normalizers'
import {
  buildAdmissionSnapshotFromReferral,
  buildAdminReportSummary,
  buildBillingFollowUpSections,
  buildClaimReadinessQueue,
  buildClaimStatusLanes,
  buildDenialQueueSections,
  buildDemoEpisodeInsights,
  buildDemoEpisodeReviewSummary,
  buildDemoPhysicianOrder,
  buildDemoPhysicianOrderDraft,
  buildDocumentationQaTasksForReferral,
  buildDocumentationSummary,
  buildEpisodeIntakeQueue,
  buildEvvQueueSections,
  buildRoleDashboardConfig,
  buildVisitRecommendations,
  buildWeekOneFrequencyPlan,
  computeDemoReadiness,
  evaluateDemoBillingReadiness,
  normalizeDemoReferralOrderStatus,
  normalizeOrderStatus,
  type BillingFollowUpItem,
  type ModuleName,
  type RoleDashboardSection,
  type RoleWorkItem,
  type StatusBadge,
  type VisitRecommendation,
} from '../domain/workflow'
import { createDemoDataset } from '../lib/demoData'
import { addOfflineAction, loadOfflineQueue, removeOfflineAction } from '../lib/offlineQueue'
import type {
  AppDataset,
  AppUser,
  Assessment,
  AssessmentClinicalPayload,
  AideSupervisionEvent,
  AuditEvent,
  CaseConference,
  Claim,
  ClaimTransaction,
  CoderReviewItem,
  CommunicationLogEntry,
  DashboardMetrics,
  DmeSupplyOrder,
  Episode,
  EpisodeAdmissionSnapshot,
  EpisodeInsightSummary,
  EpisodeReadiness,
  EpisodeReviewSummary,
  EvvRecord,
  FaxMessage,
  IncidentReport,
  InfectionLog,
  OfflineAction,
  OasisSubmission,
  Patient,
  PatientAllergy,
  PatientComplianceDocument,
  PatientMedication,
  PatientNotice,
  PayerAuthorization,
  PhysicianOrder,
  PlanOfCare,
  QaTask,
  QapiProject,
  Referral,
  ReferralDocument,
  RemittancePosting,
  SecuritySettings,
  SessionActivity,
  SurveyReadinessSummary,
  User,
  VerbalOrder,
  Visit,
} from '../lib/types'

const EMPTY_DATASET: AppDataset = createDemoDataset()
const QA_GENERIC_HOLD = 'Unresolved QA tasks must be completed before submission.'
const MISSED_VISIT_HOLD = 'Missed visit requires QA and billing review before submission.'
const FREQUENCY_CHANGE_HOLD = 'Schedule change requires QA and billing review before submission.'
const VISIT_REASSIGNMENT_HOLD = 'Visit reassignment requires QA and billing review before submission.'
const VISIT_DOCUMENTATION_HOLD = 'Visit documentation requires QA lock before submission.'
interface ToastMessage {
  id: string
  text: string
  tone: 'success' | 'error' | 'info'
}

interface EpisodeNextActionRecommendation {
  label: string
  reason: string
}

type EpisodeWorkspaceModal = 'assessment' | 'admission' | 'documents' | 'orders' | 'lifecycle' | null

interface AssessmentFormState {
  episode_id: string
  assessment_type: string
  completed_at: string
  principal_diagnosis_code: string
  functional_score: string
  comorbidity_level: string
  status: string
  medication_reconciliation_completed: string
  homebound_status: string
  homebound_narrative: string
  fall_risk_level: string
  hospitalization_risk: string
  emergency_preparedness_reviewed: string
  care_plan_goals: string
  clinical_summary: string
  medication_issues: string
  high_risk_meds: string
  wound_present: string
  wound_notes: string
  caregiver_availability: string
  caregiver_notes: string
  risk_notes: string
  oasis_m1033: string
  oasis_m1860: string
  oasis_m2020: string
}

interface BrowserSpeechRecognitionAlternative {
  transcript: string
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean
  0: BrowserSpeechRecognitionAlternative
  length: number
}

interface BrowserSpeechRecognitionResultList {
  [index: number]: BrowserSpeechRecognitionResult
  length: number
}

interface BrowserSpeechRecognitionEvent extends Event {
  results: BrowserSpeechRecognitionResultList
}

interface BrowserSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
  }
}

export function useEthizoAppController() {
  const [token, setToken] = useState<string>('')
  const [user, setUser] = useState<User | null>(null)
  const [mode, setMode] = useState<'api' | 'demo'>('demo')
  const [activeModule, setActiveModule] = useState<ModuleName>('Overview')
  const [dataset, setDataset] = useState<AppDataset>(EMPTY_DATASET)
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>(() => loadOfflineQueue())
  const [statusMessage, setStatusMessage] = useState<string>('Loading workspace...')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isBrowserOnline, setIsBrowserOnline] = useState(() => navigator.onLine)
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([])
  const [patientWizardStep, setPatientWizardStep] = useState<'identity' | 'coverage' | 'contacts'>('identity')
  const [referralWizardStep, setReferralWizardStep] = useState<'intake' | 'care_team' | 'service'>('intake')
  const [episodeWorkspaceTab, setEpisodeWorkspaceTab] = useState<'clinical' | 'admission' | 'review'>('clinical')
  const [clinicianWorkspaceTab, setClinicianWorkspaceTab] = useState<'schedule' | 'documentation' | 'field'>('schedule')
  const [patientModalOpen, setPatientModalOpen] = useState(false)
  const [referralModalOpen, setReferralModalOpen] = useState(false)
  const [episodeModal, setEpisodeModal] = useState<EpisodeWorkspaceModal>(null)

  const [patientForm, setPatientForm] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    gender: 'Female',
    payer_type: 'Medicare',
    insurance_member_id: '',
    phone: '',
    address1: '',
    address2: '',
    city: 'Atlanta',
    state: 'GA',
    postal_code: '',
    primary_physician: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    responsible_party_name: '',
    responsible_party_relationship: '',
    responsible_party_phone: '',
  })
  const [editingPatientId, setEditingPatientId] = useState<number | null>(null)

  const [referralForm, setReferralForm] = useState({
    patient_id: '1',
    source_name: '',
    admission_source: 'Hospital discharge',
    payer_type: 'Medicare',
    primary_diagnosis: '',
    face_to_face_date: '2026-04-15',
    physician_orders_signed: 'yes',
    physician_orders_signed_at: '2026-04-16T14:30',
    referring_provider_name: '',
    referring_provider_phone: '',
    pcp_name: '',
    pcp_phone: '',
    caregiver_name: '',
    caregiver_relationship: '',
    caregiver_phone: '',
    service_location_type: 'Patient home',
    service_address1: '',
    service_city: 'Atlanta',
    service_state: 'GA',
    service_postal_code: '',
    planned_soc_date: '2026-04-19',
    intake_ready: true,
    requested_disciplines: 'SN, PT',
    order_status: 'received',
    notes: '',
  })
  const [editingReferralId, setEditingReferralId] = useState<number | null>(null)

  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormState>({
    episode_id: '1',
    assessment_type: 'soc',
    completed_at: '2026-04-19T09:30',
    principal_diagnosis_code: 'I50.32',
    functional_score: '14',
    comorbidity_level: 'low',
    status: 'final',
    medication_reconciliation_completed: 'yes',
    homebound_status: 'homebound',
    homebound_narrative: '',
    fall_risk_level: 'moderate',
    hospitalization_risk: 'elevated',
    emergency_preparedness_reviewed: 'yes',
    care_plan_goals: '',
    clinical_summary: '',
    medication_issues: '',
    high_risk_meds: '',
    wound_present: 'no',
    wound_notes: '',
    caregiver_availability: '',
    caregiver_notes: '',
    risk_notes: '',
    oasis_m1033: '1',
    oasis_m1860: '3',
    oasis_m2020: '2',
  })
  const [editingAssessmentId, setEditingAssessmentId] = useState<number | null>(null)
  const [assessmentSpeechDraft, setAssessmentSpeechDraft] = useState('')
  const [assessmentSpeechDetectedFields, setAssessmentSpeechDetectedFields] = useState<string[]>([])
  const [isAssessmentListening, setIsAssessmentListening] = useState(false)
  const assessmentRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)

  const [visitForm, setVisitForm] = useState({
    episode_id: '1',
    patient_id: '1',
    visit_type: 'routine',
    discipline: 'SN',
    scheduled_start: '2026-04-21T10:00',
    scheduled_end: '2026-04-21T11:00',
    clinician_name: 'Nina Clinician',
    requires_evv: true,
  })
  const [scheduleChangeForm, setScheduleChangeForm] = useState({
    visit_id: '',
    visit_type: 'routine',
    discipline: 'SN',
    scheduled_start: '2026-04-22T10:00',
    scheduled_end: '2026-04-22T11:00',
    reassigned_clinician: 'Nina Clinician',
    follow_up_plan: '',
    reason: '',
  })
  const [documentationForm, setDocumentationForm] = useState({
    visit_id: '',
    visit_focus: '',
    visit_narrative: '',
    interventions: '',
    patient_response: '',
    vitals: '',
    pain_level: '',
    teaching_topics: '',
    medication_review: '',
    wound_care: '',
    mobility_status: '',
    adl_support: '',
    psychosocial_notes: '',
    abnormal_findings: '',
    physician_contact_needed: 'no',
    follow_up_plan: '',
    next_visit_focus: '',
    qa_review_notes: '',
  })
  const [apiEpisodeReadiness, setApiEpisodeReadiness] = useState<EpisodeReadiness | null>(null)
  const [apiEpisodeReviewSummary, setApiEpisodeReviewSummary] = useState<EpisodeReviewSummary | null>(null)
  const [apiEpisodeInsights, setApiEpisodeInsights] = useState<EpisodeInsightSummary | null>(null)
  const [lifecycleForm, setLifecycleForm] = useState({
    transition_type: 'recertify',
    effective_date: '2026-04-27',
    note: '',
    clinician_name: 'Nina Clinician',
  })
  const [intakeQueueOwnerFilter, setIntakeQueueOwnerFilter] = useState('All')
  const [intakeQueueBlockerFilter, setIntakeQueueBlockerFilter] = useState('All')
  const [billingQueueOwnerFilter, setBillingQueueOwnerFilter] = useState('All')
  const [billingQueueBlockerFilter, setBillingQueueBlockerFilter] = useState('All')
  const [adminSettingsForm, setAdminSettingsForm] = useState({
    require_mfa: 'yes',
    session_timeout_minutes: '30',
    remember_device_days: '14',
    password_rotation_days: '90',
    attachment_retention_days: '365',
    allowed_ip_ranges: '',
    enforce_device_attestation: 'yes',
  })
  const [auditFilterAction, setAuditFilterAction] = useState('All')
  const [auditFilterModel, setAuditFilterModel] = useState('All')
  const [auditFilterSearch, setAuditFilterSearch] = useState('')
  const [adminReportPeriod, setAdminReportPeriod] = useState<'last_7' | 'last_30' | 'all'>('last_30')
  const [editingAdminUserId, setEditingAdminUserId] = useState<number | null>(null)
  const [adminUserForm, setAdminUserForm] = useState({
    full_name: '',
    email: '',
    role: 'Intake',
    mobile: '',
    status: 'active',
    mfa_enabled: 'yes',
    password: '',
  })
  const [claimLifecycleForm, setClaimLifecycleForm] = useState({
    claim_id: '',
    action: 'accept',
    payer_claim_number: '',
    rejection_reason: '',
    payment_amount: '',
    remittance_reference: '',
    void_reason: '',
    correction_reason: '',
  })
  const [evvLifecycleForm, setEvvLifecycleForm] = useState({
    record_id: '',
    action: 'reconcile',
    exception_reason: '',
  })
  const [qaAssignmentDrafts, setQaAssignmentDrafts] = useState<Record<number, QaAssignmentDraft>>({})
  const [intakeDocumentationForm, setIntakeDocumentationForm] = useState({
    face_to_face_date: '',
    physician_orders_signed_at: '',
  })
  const [referralDocumentForm, setReferralDocumentForm] = useState({
    document_type: 'face_to_face',
    document_status: 'received',
    source_name: '',
    received_at: currentDateTimeInputValue(),
    signed_at: currentDateTimeInputValue(),
    document_note: '',
  })
  const [editingReferralDocumentId, setEditingReferralDocumentId] = useState<number | null>(null)
  const [referralDocumentAttachment, setReferralDocumentAttachment] = useState<File | null>(null)
  const [orderForm, setOrderForm] = useState({
    order_scope: 'plan_of_care',
    order_status: 'draft',
    signer_name: '',
    sent_at: currentDateTimeInputValue(),
    received_at: currentDateTimeInputValue(),
    signed_at: currentDateTimeInputValue(),
    order_summary: '',
    order_note: '',
  })
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null)
  const [orderDraftHighlights, setOrderDraftHighlights] = useState<string[]>([])
  const [episodeAdmissionForm, setEpisodeAdmissionForm] = useState({
    admission_source: '',
    referring_provider_name: '',
    referring_provider_phone: '',
    pcp_name: '',
    pcp_phone: '',
    caregiver_name: '',
    caregiver_relationship: '',
    caregiver_phone: '',
    service_location_type: '',
    service_address1: '',
    service_city: '',
    service_state: '',
    service_postal_code: '',
    requested_disciplines: '',
    notes: '',
  })
  const [oasisSubmissionForm, setOasisSubmissionForm] = useState({
    submission_id: '',
    submission_status: 'submitted',
    acknowledgment_note: '',
    rejection_note: '',
  })
  const [planOfCareForm, setPlanOfCareForm] = useState({
    plan_id: '',
    review_status: 'draft',
    plan_summary: '',
    goal_summary: '',
    intervention_summary: '',
    printable_content: '',
    physician_review_note: '',
  })
  const [coderReviewForm, setCoderReviewForm] = useState({
    item_id: '',
    status: 'open',
    correction_note: '',
    recommendation: '',
  })
  const [communicationLogForm, setCommunicationLogForm] = useState({
    contact_name: '',
    contact_role: 'Provider',
    method: 'phone',
    topic: '',
    outcome: '',
    follow_up_owner: '',
    follow_up_due_at: currentDateTimeInputValue(),
  })
  const [faxMessageForm, setFaxMessageForm] = useState({
    source_name: '',
    from_number: '',
    subject: '',
    packet_type: 'referral_packet',
    received_at: currentDateTimeInputValue(),
    attachment_note: '',
    linked_document_count: '1',
  })
  const [faxRoutingForm, setFaxRoutingForm] = useState({
    fax_id: '',
    routing_status: 'classified',
    route_note: '',
    create_referral: 'no',
    patient_id: '1',
    admission_source: 'Hospital discharge',
    payer_type: 'Medicare',
    primary_diagnosis: '',
    planned_soc_date: '2026-04-19',
    requested_disciplines: 'SN',
  })
  const [qapiForm, setQapiForm] = useState({
    title: '',
    measure_name: 'Documentation timeliness',
    owner_name: '',
    review_cadence: 'monthly',
    status: 'active',
    target_value: '',
    current_value: '',
    intervention_plan: '',
    evidence_summary: '',
  })
  const [complianceDocumentForm, setComplianceDocumentForm] = useState({
    document_type: 'consent',
    status: 'signed',
    delivery_method: 'tablet_signature',
    signed_at: '2026-04-19T08:35',
    notes: 'Reviewed and signed during admission.',
  })
  const [patientNoticeForm, setPatientNoticeForm] = useState({
    notice_type: 'HHCCN',
    status: 'delivered_signed',
    reason: 'Admission notice reviewed with patient.',
    billing_impact: 'No claim hold.',
    delivered_at: '2026-04-19T08:45',
    signed_at: '2026-04-19T08:46',
  })
  const [medicationForm, setMedicationForm] = useState({
    medication_name: 'Furosemide',
    dosage: '40 mg',
    route: 'PO',
    frequency: 'Daily',
    status: 'active',
    high_risk: 'yes',
    teaching_completed: 'yes',
    reconciled_at: '2026-04-19T09:05',
    prescriber_name: 'Dr. Hayes',
    change_reason: 'SOC medication reconciliation.',
  })
  const [allergyForm, setAllergyForm] = useState({
    allergen: 'Penicillin',
    reaction: 'Rash',
    severity: 'moderate',
    verified_at: '2026-04-19T09:00',
  })
  const [verbalOrderForm, setVerbalOrderForm] = useState({
    physician_name: 'Dr. Hayes',
    order_source: 'phone',
    order_summary: 'Add PRN SN visit for symptom assessment.',
    ordered_service: 'SN PRN visit',
    received_by: 'RN Case Manager',
    read_back_completed: 'yes',
    received_at: '2026-04-21T15:10',
    status: 'sent_for_signature',
  })
  const [aideSupervisionForm, setAideSupervisionForm] = useState({
    aide_name: 'Lena Aide',
    supervising_clinician: 'RN Case Manager',
    supervision_type: 'onsite',
    supervised_at: '2026-04-24T10:30',
    next_due_at: '2026-05-08T10:30',
    status: 'completed',
    care_plan_tasks: 'Bathing assistance, transfers, meal setup reminders.',
    findings: 'Aide followed the care plan safely.',
  })
  const [incidentForm, setIncidentForm] = useState({
    event_type: 'fall',
    severity: 'moderate',
    occurred_at: '2026-04-25T18:00',
    description: 'Patient reported a near fall during transfer.',
    follow_up_owner: 'RN Case Manager',
    follow_up_due_at: '2026-04-26T12:00',
    qapi_linked: 'yes',
    status: 'open',
  })
  const [infectionForm, setInfectionForm] = useState({
    infection_type: 'suspected_uti',
    identified_at: '2026-04-26T09:00',
    source: 'Clinician assessment',
    intervention_summary: 'Physician notified; hydration and symptom monitoring taught.',
    physician_notified: 'yes',
    qapi_linked: 'no',
    status: 'monitoring',
  })
  const [authorizationForm, setAuthorizationForm] = useState({
    payer_type: 'Medicare Advantage',
    authorization_number: 'AUTH-DEMO-1001',
    authorized_visits: '12',
    used_visits: '2',
    effective_date: '2026-04-19',
    expiration_date: '2026-06-17',
    status: 'approved',
    verification_notes: 'Verified through demo eligibility adapter.',
  })
  const [eligibilityForm, setEligibilityForm] = useState({
    payer_type: 'Medicare',
    check_status: 'eligible',
    checked_at: '2026-04-18T11:20',
    coverage_summary: 'Coverage active for home health benefit.',
    response_reference: 'ELG-DEMO-001',
  })
  const [dmeSupplyForm, setDmeSupplyForm] = useState({
    item_name: 'Digital scale',
    order_type: 'DME',
    status: 'delivered',
    ordered_at: '2026-04-19T11:00',
    delivered_at: '2026-04-20T14:00',
    usage_documented: 'yes',
    plan_of_care_linked: 'yes',
    billing_relevance: 'Supports CHF monitoring plan.',
  })
  const [caseConferenceForm, setCaseConferenceForm] = useState({
    conference_date: '2026-04-26T13:00',
    participants: 'RN Case Manager, PT, QA Reviewer, Scheduler',
    decisions: 'Continue SN and PT plan; monitor CHF action-plan adherence.',
    follow_up_owner: 'RN Case Manager',
    follow_up_due_at: '2026-05-03T13:00',
    cadence: 'weekly',
    status: 'completed',
  })
  const [claimTransactionForm, setClaimTransactionForm] = useState({
    claim_id: '',
    transaction_type: '837I',
    transaction_status: 'created',
    payer_control_number: '',
    payload_summary: 'Demo claim transaction generated for clearinghouse review.',
    response_summary: '',
    transmitted_at: '2026-04-22T09:00',
  })
  const [remittanceForm, setRemittanceForm] = useState({
    claim_id: '',
    era_reference: 'ERA-DEMO',
    payment_amount: '0',
    adjustment_amount: '0',
    reason_codes: 'Demo remittance posting.',
    posted_at: '2026-04-29T10:15',
    reconciliation_status: 'posted',
  })
  const isMedicarePayer = patientForm.payer_type === 'Medicare' || patientForm.payer_type === 'Medicare Advantage'
  const requiresInsuranceMemberId = !['Private Pay', 'Medicare', 'Medicare Advantage'].includes(patientForm.payer_type)
  const insuranceIdLabel = isMedicarePayer ? 'Medicare number' : requiresInsuranceMemberId ? 'Insurance member ID' : 'Member ID (optional)'
  const insuranceIdHint = isMedicarePayer
    ? 'Required for Medicare and Medicare Advantage patients.'
    : requiresInsuranceMemberId
      ? `Required for ${patientForm.payer_type} patients.`
      : 'Private pay patients can leave this blank.'

  function openNewPatientModal() {
    resetPatientForm()
    setPatientWizardStep('identity')
    setPatientModalOpen(true)
  }

  function openNewReferralModal() {
    resetReferralForm(referralForm.patient_id)
    setReferralWizardStep('intake')
    setReferralModalOpen(true)
  }

  function openEpisodeWorkspaceModal(modal: Exclude<EpisodeWorkspaceModal, null>) {
    const episode = selectedEpisode ?? dataset.episodes[0]
    if (!episode) {
      setStatusMessage('Create or select an episode first.')
      return
    }

    applyEpisodeContext(episode)
    if (modal === 'assessment') {
      setEpisodeWorkspaceTab('clinical')
    } else if (modal === 'lifecycle') {
      setEpisodeWorkspaceTab('review')
    } else {
      setEpisodeWorkspaceTab('admission')
    }
    setEpisodeModal(modal)
  }

  function prepareClaimLifecycleAction(claim: Claim, action: 'accept' | 'reject' | 'post_payment' | 'void' | 'corrected') {
    setClaimLifecycleForm({
      claim_id: String(claim.id),
      action,
      payer_claim_number: claim.payer_claim_number ?? '',
      rejection_reason: claim.rejection_reason ?? '',
      payment_amount: claim.payment_amount !== undefined && claim.payment_amount !== null ? String(claim.payment_amount) : claim.amount !== undefined && claim.amount !== null ? String(claim.amount) : '',
      remittance_reference: claim.remittance_reference ?? '',
      void_reason: claim.void_reason ?? '',
      correction_reason: claim.rejection_reason ?? claim.void_reason ?? claim.correction_reason ?? '',
    })
  }

  function prepareEvvLifecycleAction(record: EvvRecord, action: 'exception' | 'reconcile') {
    setEvvLifecycleForm({
      record_id: String(record.id),
      action,
      exception_reason: record.exception_reason ?? '',
    })
  }

  function syncAdminSettingsForm(settings: SecuritySettings) {
    setAdminSettingsForm({
      require_mfa: settings.require_mfa ? 'yes' : 'no',
      session_timeout_minutes: String(settings.session_timeout_minutes),
      remember_device_days: String(settings.remember_device_days),
      password_rotation_days: String(settings.password_rotation_days),
      attachment_retention_days: String(settings.attachment_retention_days),
      allowed_ip_ranges: settings.allowed_ip_ranges ?? '',
      enforce_device_attestation: settings.enforce_device_attestation ? 'yes' : 'no',
    })
  }

  const pushToastMessage = useEffectEvent((message: string) => {
    const toastId = crypto.randomUUID()
    const tone = deriveToastTone(message)
    setToastMessages((current) => [...current, { id: toastId, text: message, tone }].slice(-4))

    window.setTimeout(() => {
      setToastMessages((current) => current.filter((toast) => toast.id !== toastId))
    }, 4800)
  })

  function resetAdminUserForm() {
    setAdminUserForm({
      full_name: '',
      email: '',
      role: 'Intake',
      mobile: '',
      status: 'active',
      mfa_enabled: 'yes',
      password: '',
    })
    setEditingAdminUserId(null)
  }

  function loadAdminUserIntoForm(userRecord: AppUser) {
    setAdminUserForm({
      full_name: userRecord.full_name,
      email: userRecord.email,
      role: userRecord.role,
      mobile: userRecord.mobile ?? '',
      status: userRecord.status ?? 'active',
      mfa_enabled: userRecord.mfa_enabled ? 'yes' : 'no',
      password: '',
    })
    setEditingAdminUserId(userRecord.id)
    setStatusMessage(`Editing user access for ${userRecord.full_name}.`)
  }

  const seedDemoWorkspace = useEffectEvent(() => {
    setUser({
      id: 1,
      full_name: 'Marina Intake',
      email: 'intake@harborhomehealth.test',
      role: 'Intake',
    })
    const demoDataset = createDemoDataset()
    setDataset(recalculate(demoDataset))
    syncAdminSettingsForm(demoDataset.securitySettings)
    const firstEpisode = demoDataset.episodes[0]
    if (firstEpisode) {
      resetAssessmentForm(firstEpisode.id)
      setVisitForm((current) => ({
        ...current,
        episode_id: String(firstEpisode.id),
        patient_id: String(firstEpisode.patient_id),
        visit_type: current.visit_type === 'routine' ? 'soc' : current.visit_type,
      }))
      syncIntakeDocumentationForm(firstEpisode)
      syncEpisodeAdmissionForm(firstEpisode)
    }
    setStatusMessage('Demo mode enabled. Start modeling your workflows immediately.')
  })

  const initializeApiSession = useEffectEvent(async (authToken: string, authUser: User) => {
    await hydrateFromApi(authToken, authUser)
    setStatusMessage('Connected to CakePHP API.')
  })

  useEffect(() => {
    void (async () => {
      try {
        const response = await api.login('intake@harborhomehealth.test', 'demo1234')
        if (response.token && response.user) {
          setToken(response.token)
          setUser(response.user)
          setMode('api')
          await initializeApiSession(response.token, response.user)
          return
        }
      } catch {
        setMode('demo')
      }

      seedDemoWorkspace()
    })()
  }, [])

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true)
    const handleOffline = () => setIsBrowserOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!statusMessage || statusMessage === 'Loading workspace...') {
      return
    }

    const timeout = window.setTimeout(() => {
      pushToastMessage(statusMessage)
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [statusMessage])

  async function hydrateFromApi(authToken: string, authUser: User) {
    const [dashboard, adminSettings, adminUsers, sessionActivity, auditEvents, patients, referrals, referralDocuments, physicianOrders, episodes, assessments, visits, evv, claims, claimTransactions, remittancePostings, qa, oasisSubmissions, planOfCare, coderReview, communicationLog, faxInbox, qapiProjects, qualityMetrics, surveyReadiness] = await Promise.all([
      api.dashboard(authToken),
      api.adminSettings(authToken),
      api.adminUsers(authToken),
      api.sessionActivity(authToken),
      api.auditEvents(authToken),
      api.patients(authToken),
      api.referrals(authToken),
      api.referralDocuments(authToken),
      api.physicianOrders(authToken),
      api.episodes(authToken),
      api.assessments(authToken),
      api.visits(authToken),
      api.evv(authToken),
      api.claims(authToken),
      api.claimTransactions(authToken),
      api.remittancePostings(authToken),
      api.qa(authToken),
      api.oasisSubmissions(authToken),
      api.planOfCare(authToken),
      api.coderReview(authToken),
      api.communicationLog(authToken),
      api.faxInbox(authToken),
      api.qapiProjects(authToken),
      api.qualityMetrics(authToken),
      api.surveyReadiness(authToken),
    ])

    const apiPatients = patients.data ?? []
    const apiEpisodes = episodes.data ?? []
    const patientIndex = new Map<number, Patient>(apiPatients.map((patient) => [patient.id, patient]))
    const [
      patientComplianceDocuments,
      patientNotices,
      patientMedications,
      patientAllergies,
      verbalOrders,
      aideSupervisionEvents,
      incidentReports,
      infectionLogs,
      payerAuthorizations,
      eligibilityChecks,
      dmeSupplyOrders,
      caseConferences,
    ] = await Promise.all([
      Promise.all(apiPatients.map((patient) => api.patientComplianceDocuments(authToken, patient.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiPatients.map((patient) => api.patientNotices(authToken, patient.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiPatients.map((patient) => api.patientMedications(authToken, patient.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiPatients.map((patient) => api.patientAllergies(authToken, patient.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiEpisodes.map((episode) => api.episodeVerbalOrders(authToken, episode.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiEpisodes.map((episode) => api.episodeAideSupervision(authToken, episode.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiEpisodes.map((episode) => api.episodeIncidents(authToken, episode.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiEpisodes.map((episode) => api.episodeInfections(authToken, episode.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiEpisodes.map((episode) => api.episodeAuthorizations(authToken, episode.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiEpisodes.map((episode) => api.episodeEligibilityChecks(authToken, episode.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiEpisodes.map((episode) => api.episodeDmeSupplyOrders(authToken, episode.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
      Promise.all(apiEpisodes.map((episode) => api.episodeCaseConferences(authToken, episode.id))).then((responses) => responses.flatMap((response) => response.data ?? [])),
    ])

    const nextDataset = {
      metrics: dashboard.metrics as DashboardMetrics,
      patients: apiPatients,
      referrals: (referrals.data ?? []).map((referral) => ({
        ...referral,
        patient_name: referral.patient_name ?? nameForPatient(patientIndex.get(referral.patient_id)),
      })),
      referralDocuments: referralDocuments.data ?? [],
      physicianOrders: physicianOrders.data ?? [],
      patientComplianceDocuments,
      patientNotices,
      patientMedications,
      patientAllergies,
      verbalOrders,
      aideSupervisionEvents,
      incidentReports,
      infectionLogs,
      payerAuthorizations,
      eligibilityChecks,
      claimTransactions: claimTransactions.data ?? [],
      remittancePostings: remittancePostings.data ?? [],
      dmeSupplyOrders,
      caseConferences,
      surveyReadinessSummary: surveyReadiness.data ?? createDemoDataset().surveyReadinessSummary,
      episodes: apiEpisodes.map((episode) => ({
        ...episode,
        admission_readiness_snapshot: normalizeAdmissionSnapshot(episode.admission_readiness_snapshot),
        patient_name: episode.patient_name ?? nameForPatient(patientIndex.get(episode.patient_id)),
      })),
      assessments: (assessments.data ?? []).map((assessment) => ({
        ...assessment,
        answers: normalizeAssessmentAnswers(assessment.answers),
        assessment_payload: normalizeAssessmentPayload(assessment.assessment_payload),
      })),
      visits: (visits.data ?? []).map((visit) => ({
        ...visit,
        patient_name: visit.patient_name ?? nameForPatient(patientIndex.get(visit.patient_id)),
      })),
      evvRecords: evv.data ?? [],
      claims: claims.data ?? [],
      qaTasks: normalizeQaTasksForUi(qa.data ?? []),
      oasisSubmissions: oasisSubmissions.data ?? [],
      planOfCares: planOfCare.data ?? [],
      coderReviewItems: coderReview.data ?? [],
      communicationLogEntries: communicationLog.data ?? [],
      faxMessages: faxInbox.data ?? [],
      qapiProjects: normalizeQapiProjects(qapiProjects.data ?? []),
      qualityMetricsSummary: qualityMetrics.data ?? createDemoDataset().qualityMetricsSummary,
      episodeInsights: [],
      securitySettings: adminSettings.data ?? createDemoDataset().securitySettings,
      adminUsers: adminUsers.data ?? [],
      sessionActivity: sessionActivity.data ?? [],
      auditEvents: auditEvents.data ?? [],
    }

    setUser(authUser)
    setDataset(nextDataset)
    syncAdminSettingsForm(nextDataset.securitySettings)
    resetAdminUserForm()
    const firstEpisode = nextDataset.episodes[0]
    if (firstEpisode) {
      resetAssessmentForm(firstEpisode.id)
      setVisitForm((current) => ({
        ...current,
        episode_id: String(firstEpisode.id),
        patient_id: String(firstEpisode.patient_id),
        visit_type: current.visit_type === 'routine' ? 'soc' : current.visit_type,
      }))
      syncIntakeDocumentationForm(firstEpisode)
      syncEpisodeAdmissionForm(firstEpisode)
    }
  }

  async function saveAdminSettings() {
    const payload = {
      require_mfa: adminSettingsForm.require_mfa === 'yes',
      session_timeout_minutes: Number(adminSettingsForm.session_timeout_minutes),
      remember_device_days: Number(adminSettingsForm.remember_device_days),
      password_rotation_days: Number(adminSettingsForm.password_rotation_days),
      attachment_retention_days: Number(adminSettingsForm.attachment_retention_days),
      allowed_ip_ranges: adminSettingsForm.allowed_ip_ranges.trim(),
      enforce_device_attestation: adminSettingsForm.enforce_device_attestation === 'yes',
    }

    try {
      if (mode === 'api' && token) {
        await api.updateAdminSettings(token, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Admin security settings saved.')
      } else {
        const nextSettings: SecuritySettings = {
          ...dataset.securitySettings,
          ...payload,
        }
        const nextAuditEvent: AuditEvent = {
          id: nextAuditId(dataset.auditEvents),
          actor_email: user?.email ?? 'demo@ethizo.local',
          action: 'admin_settings_updated',
          model: 'AppSetting',
          model_id: nextSettings.id ?? 1,
          details: payload,
          created: new Date().toISOString().slice(0, 19).replace('T', ' '),
        }
        setDataset((current) =>
          recalculate({
            ...current,
            securitySettings: nextSettings,
            auditEvents: [nextAuditEvent, ...current.auditEvents],
          }),
        )
        setStatusMessage('Admin security settings updated in demo mode.')
      }
    } catch (error) {
      setStatusMessage((error as Error).message)
    }
  }

  async function saveAdminUser() {
    const payload = {
      full_name: adminUserForm.full_name.trim(),
      email: adminUserForm.email.trim(),
      role: adminUserForm.role as AppUser['role'],
      mobile: adminUserForm.mobile.trim(),
      status: adminUserForm.status.trim(),
      mfa_enabled: adminUserForm.mfa_enabled === 'yes',
      password: adminUserForm.password.trim(),
    }

    try {
      if (mode === 'api' && token) {
        if (editingAdminUserId !== null) {
          await api.updateAdminUser(token, editingAdminUserId, payload)
        } else {
          await api.addAdminUser(token, payload)
        }
        await hydrateFromApi(token, user!)
        setStatusMessage(editingAdminUserId !== null ? 'User access updated.' : 'User access created.')
      } else {
        const nextUser: AppUser = {
          id: editingAdminUserId ?? nextAdminUserId(dataset.adminUsers),
          full_name: payload.full_name,
          email: payload.email,
          role: payload.role,
          mobile: payload.mobile || null,
          status: payload.status,
          mfa_enabled: payload.mfa_enabled,
          last_login_at:
            editingAdminUserId !== null
              ? dataset.adminUsers.find((entry) => entry.id === editingAdminUserId)?.last_login_at ?? null
              : null,
        }
        const nextAuditEvent: AuditEvent = {
          id: nextAuditId(dataset.auditEvents),
          actor_email: user?.email ?? 'demo@ethizo.local',
          action: editingAdminUserId !== null ? 'admin_user_updated' : 'admin_user_added',
          model: 'User',
          model_id: nextUser.id,
          details: {
            email: nextUser.email,
            role: nextUser.role,
            status: nextUser.status,
            mfa_enabled: nextUser.mfa_enabled,
          },
          created: new Date().toISOString().slice(0, 19).replace('T', ' '),
        }
        const nextUsers =
          editingAdminUserId !== null
            ? dataset.adminUsers.map((entry) => (entry.id === editingAdminUserId ? nextUser : entry))
            : [...dataset.adminUsers, nextUser].sort((left, right) => left.full_name.localeCompare(right.full_name))
        const nextSessions = rebuildDemoSessionActivity(nextUsers, dataset.sessionActivity)
        setDataset((current) =>
          recalculate({
            ...current,
            adminUsers: nextUsers,
            sessionActivity: nextSessions,
            auditEvents: [nextAuditEvent, ...current.auditEvents],
          }),
        )
        setStatusMessage(editingAdminUserId !== null ? 'User access updated in demo mode.' : 'User access created in demo mode.')
      }
      resetAdminUserForm()
    } catch (error) {
      setStatusMessage((error as Error).message)
    }
  }

  function exportAdminReport(kind: 'summary' | 'claims' | 'qa' | 'audit') {
    if (kind === 'summary') {
      const rows = [
        ['Section', 'Label', 'Value'],
        ...adminReportSummary.metrics.map((item) => ['Metric', item.label, String(item.value)]),
        ...adminReportSummary.payerMix.map((item) => ['Payer mix', item.label, String(item.count)]),
        ...adminReportSummary.claimMix.map((item) => ['Claim mix', item.label, String(item.count)]),
        ...adminReportSummary.qaMix.map((item) => ['QA mix', item.label, String(item.count)]),
        ...adminReportSummary.recentActivity.map((item) => ['Recent activity', item.label, String(item.count)]),
      ]
      downloadCsvFile(`ethizo-admin-summary-${adminReportPeriod}.csv`, rows)
      setStatusMessage('Admin summary export generated.')
      return
    }

    if (kind === 'claims') {
      const rows = [
        ['Claim ID', 'Patient', 'Episode ID', 'Type', 'Status', 'Amount', 'Hold Reason', 'Submitted At', 'Accepted At', 'Paid At'],
        ...dataset.claims.map((claim) => {
          const episode = dataset.episodes.find((entry) => entry.id === claim.episode_id)
          return [
            String(claim.id),
            episode?.patient_name ?? `Episode ${claim.episode_id}`,
            String(claim.episode_id),
            claim.claim_type,
            claim.status,
            claim.amount !== undefined && claim.amount !== null ? String(claim.amount) : '',
            claim.hold_reason ?? '',
            claim.submitted_at ?? '',
            claim.accepted_at ?? '',
            claim.paid_at ?? '',
          ]
        }),
      ]
      downloadCsvFile('ethizo-claims-report.csv', rows)
      setStatusMessage('Claim lifecycle export generated.')
      return
    }

    if (kind === 'qa') {
      const rows = [
        ['Task ID', 'Title', 'Type', 'Priority', 'Status', 'Owner', 'Due At', 'Details'],
        ...dataset.qaTasks.map((task) => [
          String(task.id),
          task.title,
          task.task_type,
          task.priority,
          task.status,
          formatTaskAssignee(task),
          task.due_at ?? '',
          task.details ?? '',
        ]),
      ]
      downloadCsvFile('ethizo-qa-report.csv', rows)
      setStatusMessage('QA queue export generated.')
      return
    }

    const rows = [
      ['Event ID', 'Actor', 'Action', 'Model', 'Model ID', 'Created', 'Details'],
      ...filteredAuditEvents.map((event) => [
        String(event.id),
        event.actor_email,
        event.action,
        event.model,
        String(event.model_id),
        event.created,
        summarizeAuditDetails(event.details),
      ]),
    ]
    downloadCsvFile('ethizo-audit-report.csv', rows)
    setStatusMessage('Audit export generated.')
  }

  function syncIntakeDocumentationForm(episode?: Episode) {
    const snapshot =
      normalizeAdmissionSnapshot(episode?.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, dataset.referrals)
    setIntakeDocumentationForm({
      face_to_face_date: snapshot?.face_to_face_date ?? currentDateInputValue(),
      physician_orders_signed_at: snapshot?.physician_orders_signed_at
        ? toDateTimeInputValue(snapshot.physician_orders_signed_at)
        : currentDateTimeInputValue(),
    })
  }

  function syncEpisodeAdmissionForm(episode?: Episode) {
    const snapshot =
      normalizeAdmissionSnapshot(episode?.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, dataset.referrals)
    setEpisodeAdmissionForm({
      admission_source: snapshot?.admission_source ?? '',
      referring_provider_name: snapshot?.referring_provider_name ?? '',
      referring_provider_phone: snapshot?.referring_provider_phone ?? '',
      pcp_name: snapshot?.pcp_name ?? '',
      pcp_phone: snapshot?.pcp_phone ?? '',
      caregiver_name: snapshot?.caregiver_name ?? '',
      caregiver_relationship: snapshot?.caregiver_relationship ?? '',
      caregiver_phone: snapshot?.caregiver_phone ?? '',
      service_location_type: snapshot?.service_location_type ?? 'Patient home',
      service_address1: snapshot?.service_address1 ?? '',
      service_city: snapshot?.service_city ?? 'Atlanta',
      service_state: snapshot?.service_state ?? 'GA',
      service_postal_code: snapshot?.service_postal_code ?? '',
      requested_disciplines: (snapshot?.requested_disciplines ?? []).join(', '),
      notes: snapshot?.notes ?? '',
    })
  }

  function applyAssessmentSpeechTranscript(transcript: string, silent = false) {
    const normalizedTranscript = transcript.trim()
    if (!normalizedTranscript) {
      setAssessmentSpeechDetectedFields([])
      if (!silent) {
        setStatusMessage('Add or dictate a SOC/OASIS narrative before applying voice capture.')
      }
      return
    }

    const extraction = parseAssessmentSpeechTranscript(normalizedTranscript, assessmentForm)
    setAssessmentForm((current) => ({ ...current, ...extraction.fields }))
    setAssessmentSpeechDetectedFields(extraction.detectedFields)

    if (!silent) {
      setStatusMessage(
        extraction.detectedFields.length > 0
          ? `Voice capture updated ${extraction.detectedFields.length} SOC/OASIS fields.`
          : 'Voice capture note saved, but no structured SOC/OASIS fields were detected yet.',
      )
    }
  }

  function stopAssessmentDictation(showToast = false) {
    assessmentRecognitionRef.current?.stop()
    assessmentRecognitionRef.current = null
    setIsAssessmentListening(false)
    if (showToast) {
      setStatusMessage('SOC/OASIS dictation stopped.')
    }
  }

  function startAssessmentDictation() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      setStatusMessage('Browser speech recognition is not available here. Paste your dictated note into the box and choose Apply to form.')
      return
    }

    if (isAssessmentListening) {
      return
    }

    const recognition = new Recognition()
    const startingDraft = assessmentSpeechDraft.trim()

    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let sessionTranscript = ''
      for (let index = 0; index < event.results.length; index += 1) {
        sessionTranscript += `${event.results[index][0].transcript} `
      }
      const nextTranscript = [startingDraft, sessionTranscript.trim()].filter(Boolean).join(startingDraft ? '\n' : '')
      setAssessmentSpeechDraft(nextTranscript)
      applyAssessmentSpeechTranscript(nextTranscript, true)
    }

    recognition.onerror = () => {
      const shouldAnnounce = assessmentRecognitionRef.current === recognition
      assessmentRecognitionRef.current = null
      setIsAssessmentListening(false)
      if (shouldAnnounce) {
        setStatusMessage('SOC/OASIS dictation ran into a browser speech error. You can keep typing or paste the narrative into the voice box.')
      }
    }

    recognition.onend = () => {
      const shouldAnnounce = assessmentRecognitionRef.current === recognition
      assessmentRecognitionRef.current = null
      setIsAssessmentListening(false)
      if (shouldAnnounce) {
        setStatusMessage('SOC/OASIS dictation captured and applied to the form.')
      }
    }

    assessmentRecognitionRef.current = recognition
    setIsAssessmentListening(true)
    recognition.start()
  }

  function resetAssessmentForm(episodeId?: number) {
    stopAssessmentDictation()
    setEditingAssessmentId(null)
    setAssessmentSpeechDraft('')
    setAssessmentSpeechDetectedFields([])
    setAssessmentForm({
      episode_id: String(episodeId ?? selectedEpisode?.id ?? dataset.episodes[0]?.id ?? 1),
      assessment_type: 'soc',
      completed_at: currentDateTimeInputValue(),
      principal_diagnosis_code: extractDiagnosisCode(selectedEpisode?.primary_diagnosis ?? dataset.episodes[0]?.primary_diagnosis ?? '') || 'I50.32',
      functional_score: '14',
      comorbidity_level: 'low',
      status: 'final',
      medication_reconciliation_completed: 'yes',
      homebound_status: 'homebound',
      homebound_narrative: '',
      fall_risk_level: 'moderate',
      hospitalization_risk: 'elevated',
      emergency_preparedness_reviewed: 'yes',
      care_plan_goals: '',
      clinical_summary: '',
      medication_issues: '',
      high_risk_meds: '',
      wound_present: 'no',
      wound_notes: '',
      caregiver_availability: '',
      caregiver_notes: '',
      risk_notes: '',
      oasis_m1033: '1',
      oasis_m1860: '3',
      oasis_m2020: '2',
    })
  }

  function loadAssessmentIntoForm(assessment: Assessment) {
    stopAssessmentDictation()
    setEpisodeWorkspaceTab('clinical')
    setEpisodeModal('assessment')
    const payload = normalizeAssessmentPayload(assessment.assessment_payload)
    const answers = normalizeAssessmentAnswers(assessment.answers)
    setEditingAssessmentId(assessment.id)
    setAssessmentSpeechDraft('')
    setAssessmentSpeechDetectedFields([])
    setAssessmentForm({
      episode_id: String(assessment.episode_id),
      assessment_type: assessment.assessment_type,
      completed_at: toDateTimeInputValue(assessment.completed_at),
      principal_diagnosis_code: assessment.principal_diagnosis_code,
      functional_score: String(assessment.functional_score),
      comorbidity_level: assessment.comorbidity_level,
      status: assessment.status,
      medication_reconciliation_completed: assessment.medication_reconciliation_completed ? 'yes' : 'no',
      homebound_status: assessment.homebound_status ?? 'pending',
      homebound_narrative: assessment.homebound_narrative ?? '',
      fall_risk_level: assessment.fall_risk_level ?? 'moderate',
      hospitalization_risk: assessment.hospitalization_risk ?? 'routine',
      emergency_preparedness_reviewed: assessment.emergency_preparedness_reviewed ? 'yes' : 'no',
      care_plan_goals: assessment.care_plan_goals ?? '',
      clinical_summary: assessment.clinical_summary ?? '',
      medication_issues: payload?.medication_review?.issues ?? '',
      high_risk_meds: payload?.medication_review?.high_risk_meds ?? '',
      wound_present: payload?.wounds?.present ? 'yes' : 'no',
      wound_notes: payload?.wounds?.notes ?? '',
      caregiver_availability: payload?.caregiver_support?.availability ?? '',
      caregiver_notes: payload?.caregiver_support?.notes ?? '',
      risk_notes: payload?.risk_notes ?? '',
      oasis_m1033: answers.M1033 ?? '1',
      oasis_m1860: answers.M1860 ?? '3',
      oasis_m2020: answers.M2020 ?? '2',
    })
    setStatusMessage(`Loaded assessment ${assessment.id} for editing.`)
  }

  function resetReferralDocumentForm(documentType = 'face_to_face') {
    setReferralDocumentForm({
      document_type: documentType,
      document_status: documentType === 'physician_orders' ? 'received' : 'received',
      source_name: '',
      received_at: currentDateTimeInputValue(),
      signed_at: currentDateTimeInputValue(),
      document_note: '',
    })
    setEditingReferralDocumentId(null)
    setReferralDocumentAttachment(null)
  }

  function resetOrderForm(scope = 'plan_of_care') {
    setOrderDraftHighlights([])
    setOrderForm({
      order_scope: scope,
      order_status: scope === 'admission' ? 'received' : 'draft',
      signer_name: '',
      sent_at: currentDateTimeInputValue(),
      received_at: currentDateTimeInputValue(),
      signed_at: currentDateTimeInputValue(),
      order_summary: '',
      order_note: '',
    })
    setEditingOrderId(null)
  }

  function resetOasisSubmissionForm() {
    setOasisSubmissionForm({
      submission_id: '',
      submission_status: 'submitted',
      acknowledgment_note: '',
      rejection_note: '',
    })
  }

  function loadOasisSubmissionIntoForm(submission: OasisSubmission) {
    setOasisSubmissionForm({
      submission_id: String(submission.id),
      submission_status: submission.submission_status,
      acknowledgment_note: submission.acknowledgment_note ?? '',
      rejection_note: submission.rejection_note ?? '',
    })
  }

  function resetPlanOfCareForm() {
    setPlanOfCareForm({
      plan_id: '',
      review_status: 'draft',
      plan_summary: '',
      goal_summary: '',
      intervention_summary: '',
      printable_content: '',
      physician_review_note: '',
    })
  }

  function loadPlanOfCareIntoForm(plan: PlanOfCare) {
    setPlanOfCareForm({
      plan_id: String(plan.id),
      review_status: plan.review_status,
      plan_summary: plan.plan_summary ?? '',
      goal_summary: plan.goal_summary ?? '',
      intervention_summary: plan.intervention_summary ?? '',
      printable_content: plan.printable_content ?? '',
      physician_review_note: plan.physician_review_note ?? '',
    })
  }

  function loadCoderReviewIntoForm(item: CoderReviewItem) {
    setCoderReviewForm({
      item_id: String(item.id),
      status: item.status,
      correction_note: item.correction_note ?? '',
      recommendation: item.recommendation ?? '',
    })
  }

  function loadReferralDocumentIntoForm(document: ReferralDocument) {
    setEpisodeWorkspaceTab('admission')
    setEpisodeModal('documents')
    setReferralDocumentForm({
      document_type: document.document_type,
      document_status: document.document_status,
      source_name: document.source_name ?? '',
      received_at: document.received_at ? toDateTimeInputValue(document.received_at) : currentDateTimeInputValue(),
      signed_at: document.signed_at ? toDateTimeInputValue(document.signed_at) : currentDateTimeInputValue(),
      document_note: document.document_note ?? '',
    })
    setEditingReferralDocumentId(document.id)
    setReferralDocumentAttachment(null)
    setStatusMessage(`Editing ${labelizeValue(document.document_type)} document ${document.id}.`)
  }

  function loadOrderIntoForm(order: PhysicianOrder) {
    setEpisodeWorkspaceTab('admission')
    setEpisodeModal('orders')
    setOrderDraftHighlights([])
    setOrderForm({
      order_scope: order.order_scope,
      order_status: order.order_status,
      signer_name: order.signer_name ?? '',
      sent_at: order.sent_at ? toDateTimeInputValue(order.sent_at) : currentDateTimeInputValue(),
      received_at: order.received_at ? toDateTimeInputValue(order.received_at) : currentDateTimeInputValue(),
      signed_at: order.signed_at ? toDateTimeInputValue(order.signed_at) : currentDateTimeInputValue(),
      order_summary: order.order_summary ?? '',
      order_note: order.order_note ?? '',
    })
    setEditingOrderId(order.id)
    setStatusMessage(`Editing ${labelizeValue(order.order_scope)} order v${order.version_number}.`)
  }

  async function autofillPhysicianOrderDraft(scopeOverride?: string) {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before generating an order draft.')
      return
    }

    const scope = scopeOverride ?? orderForm.order_scope

    if (mode === 'api' && token) {
      try {
        const response = await api.episodeOrderDraft(token, selectedEpisode.id, scope)
        const draft = response.data
        if (!draft) {
          setStatusMessage('No draft data was returned for this episode.')
          return
        }
        setOrderForm((current) => ({
          ...current,
          order_scope: scope,
          order_summary: draft.order_summary,
          order_note: draft.order_note,
        }))
        setOrderDraftHighlights(draft.recent_visit_highlights ?? [])
        setStatusMessage(`Loaded a ${labelizeValue(scope)} order draft from the current chart.`)
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const draft = buildDemoPhysicianOrderDraft(dataset, selectedEpisode, scope)
    setOrderForm((current) => ({
      ...current,
      order_scope: scope,
      order_summary: draft.order_summary,
      order_note: draft.order_note,
    }))
    setOrderDraftHighlights(draft.recent_visit_highlights)
    setStatusMessage(`Loaded a ${labelizeValue(scope)} order draft in demo mode.`)
  }

  function applyEpisodeContext(episode: Episode | Pick<Episode, 'id' | 'patient_id'>) {
    const episodeId = String(episode.id)
    const patientId = String(episode.patient_id)
    setAssessmentForm((current) => ({ ...current, episode_id: episodeId }))
    setVisitForm((current) => ({
      ...current,
      episode_id: episodeId,
      patient_id: patientId,
      visit_type: current.visit_type === 'routine' ? 'soc' : current.visit_type,
    }))
    const resolvedEpisode = 'admission_readiness_snapshot' in episode ? episode : dataset.episodes.find((item) => item.id === episode.id)
    syncIntakeDocumentationForm(resolvedEpisode)
    syncEpisodeAdmissionForm(resolvedEpisode)
    resetReferralDocumentForm()
    resetOrderForm()
    resetOasisSubmissionForm()
    resetPlanOfCareForm()
  }

  function latestAssessmentForEpisode(episodeId: number) {
    return dataset.assessments
      .filter((assessment) => assessment.episode_id === episodeId)
      .sort((left, right) => right.completed_at.localeCompare(left.completed_at))[0]
  }

  function firstUnsignedActiveOrderForEpisode(episodeId: number) {
    return dataset.physicianOrders
      .filter((order) => order.episode_id === episodeId && order.active && (order.order_status !== 'signed' || !order.signed_at))
      .sort((left, right) => left.order_scope.localeCompare(right.order_scope) || right.version_number - left.version_number)[0]
  }

  function firstVisitDocumentationQaTaskForEpisode(episodeId: number) {
    return dataset.qaTasks
      .filter((task) => task.episode_id === episodeId && task.status === 'open' && task.task_type === 'visit_documentation_review')
      .sort((left, right) => `${left.due_at ?? ''}`.localeCompare(`${right.due_at ?? ''}`))[0]
  }

  function firstPendingEvvRecordForEpisode(episodeId: number) {
    const visitIds = new Set(dataset.visits.filter((visit) => visit.episode_id === episodeId).map((visit) => visit.id))
    return dataset.evvRecords.find((record) => visitIds.has(record.visit_id) && ['pending_submission', 'exception'].includes(record.status))
  }

  function recommendEpisodeNextAction(summary: EpisodeReviewSummary): EpisodeNextActionRecommendation {
    const activationAndBillingBlockers = [...summary.activation_blockers, ...summary.billing_blockers].join(' ').toLowerCase()

    if (activationAndBillingBlockers.includes('face-to-face')) {
      return {
        label: 'Record face-to-face',
        reason: 'Intake documentation is still blocking the episode.',
      }
    }
    if (
      activationAndBillingBlockers.includes('signed physician orders') ||
      activationAndBillingBlockers.includes('active physician order') ||
      activationAndBillingBlockers.includes('order packet') ||
      summary.unsigned_active_orders > 0
    ) {
      return {
        label: 'Open order workflow',
        reason: 'Unsigned or incomplete physician orders are blocking release.',
      }
    }
    if (
      activationAndBillingBlockers.includes('clinical summary') ||
      activationAndBillingBlockers.includes('care plan goals') ||
      activationAndBillingBlockers.includes('homebound') ||
      activationAndBillingBlockers.includes('medication reconciliation') ||
      activationAndBillingBlockers.includes('diagnosis') ||
      activationAndBillingBlockers.includes('oasis')
    ) {
      return {
        label: 'Open assessment',
        reason: 'The assessment packet needs clinical or coding follow-up.',
      }
    }
    if (activationAndBillingBlockers.includes('documentation')) {
      return {
        label: 'Open chart review',
        reason: 'Visit documentation still needs completion or QA release.',
      }
    }
    if (summary.pending_evv_records > 0) {
      return {
        label: 'Review EVV',
        reason: 'Pending or exception EVV records are blocking billing.',
      }
    }
    if (summary.open_qa_tasks > 0) {
      return {
        label: 'Open QA queue',
        reason: 'There are still unresolved QA tasks on the episode.',
      }
    }

    return {
      label: 'Review episode',
      reason: 'Open the episode workspace for a final review.',
    }
  }

  function resolveNextEpisodeBlocker(summary: EpisodeReviewSummary, episode: Episode) {
    const recommendation = recommendEpisodeNextAction(summary)
    const blockersText = [...summary.activation_blockers, ...summary.billing_blockers].join(' ').toLowerCase()

    applyEpisodeContext(episode)

    if (blockersText.includes('face-to-face')) {
      setActiveModule('Episodes')
      setEpisodeWorkspaceTab('admission')
      setEpisodeModal('admission')
      setStatusMessage('Episode opened for intake follow-up. Use the intake documentation controls to record face-to-face documentation.')
      return
    }

    if (
      blockersText.includes('signed physician orders') ||
      blockersText.includes('active physician order') ||
      blockersText.includes('order packet') ||
      summary.unsigned_active_orders > 0
    ) {
      const order = firstUnsignedActiveOrderForEpisode(episode.id)
      setActiveModule('Episodes')
      if (order) {
        loadOrderIntoForm(order)
        setStatusMessage(`Opened ${labelizeValue(order.order_scope)} order v${order.version_number} for signature follow-up.`)
      } else {
        setStatusMessage('Episode opened for physician order follow-up.')
      }
      return
    }

    if (
      blockersText.includes('clinical summary') ||
      blockersText.includes('care plan goals') ||
      blockersText.includes('homebound') ||
      blockersText.includes('medication reconciliation') ||
      blockersText.includes('diagnosis') ||
      blockersText.includes('oasis')
    ) {
      const assessment = latestAssessmentForEpisode(episode.id)
      setActiveModule('Episodes')
      if (assessment) {
        loadAssessmentIntoForm(assessment)
        setStatusMessage(`Opened ${labelizeValue(assessment.assessment_type)} assessment ${assessment.id} for clinical follow-up.`)
      } else {
        setStatusMessage('Episode opened for assessment follow-up.')
      }
      return
    }

    if (blockersText.includes('documentation')) {
      const documentationTask = firstVisitDocumentationQaTaskForEpisode(episode.id)
      const visit = documentationTask
        ? dataset.visits.find((item) => item.id === documentationTask.visit_id)
        : dataset.visits.find(
            (item) => item.episode_id === episode.id && ['completed', 'qa_review', 'locked'].includes(item.status) && item.documentation_status !== 'locked',
          )
      if (documentationTask && visit) {
        setActiveModule('QA')
        loadVisitDocumentationForm(visit)
        setStatusMessage(`Opened visit ${visit.id} for QA documentation release.`)
        return
      }
      if (visit) {
        setActiveModule('Clinician')
        loadVisitDocumentationForm(visit)
        setStatusMessage(`Opened visit ${visit.id} for documentation follow-up.`)
        return
      }
    }

    if (summary.pending_evv_records > 0) {
      const record = firstPendingEvvRecordForEpisode(episode.id)
      setActiveModule('Billing')
      setStatusMessage(record ? `Opened Billing to review EVV record ${record.id}.` : 'Opened Billing to review pending EVV issues.')
      return
    }

    if (summary.open_qa_tasks > 0) {
      setActiveModule('QA')
      setStatusMessage('Opened QA to continue unresolved episode work.')
      return
    }

    setActiveModule('Episodes')
    setStatusMessage(`${recommendation.reason} Episode workspace opened for review.`)
  }

  function openRoleWorkItem(item: RoleWorkItem) {
    if (item.episodeId) {
      const episode = dataset.episodes.find((entry) => entry.id === item.episodeId)
      if (episode) {
        applyEpisodeContext(episode)
      }
    }

    if (item.actionType === 'patients') {
      setActiveModule('Patients')
      setStatusMessage(item.detail)
      return
    }

    if (item.actionType === 'referrals') {
      setActiveModule('Referrals')
      setStatusMessage(item.detail)
      return
    }

    if (item.actionType === 'visit_documentation' && item.visitId) {
      const visit = dataset.visits.find((entry) => entry.id === item.visitId)
      if (visit) {
        setActiveModule('Clinician')
        loadVisitDocumentationForm(visit)
        setStatusMessage(item.detail)
        return
      }
    }

    if (item.actionType === 'order' && item.episodeId) {
      const order = firstUnsignedActiveOrderForEpisode(item.episodeId)
      setActiveModule('Episodes')
      if (order) {
        loadOrderIntoForm(order)
      }
      setStatusMessage(item.detail)
      return
    }

    if (item.actionType === 'qa') {
      if (item.visitId) {
        const visit = dataset.visits.find((entry) => entry.id === item.visitId)
        if (visit) {
          loadVisitDocumentationForm(visit)
        }
      }
      setActiveModule('QA')
      setStatusMessage(item.detail)
      return
    }

    if (item.actionType === 'billing') {
      setActiveModule('Billing')
      setStatusMessage(item.detail)
      return
    }

    setActiveModule(item.module)
    setStatusMessage(item.detail)
  }

  function recalculate(next: AppDataset): AppDataset {
    const normalizedQaTasks = normalizeQaTasksForUi(next.qaTasks)
    const visitsToday = next.visits.filter((visit) => visit.scheduled_start.startsWith('2026-04-19')).length
    const qaTasks = normalizedQaTasks.filter((task) => task.status === 'open').length
    const claimsOnHold = next.claims.filter((claim) => Boolean(claim.hold_reason)).length

    return {
      ...next,
      qaTasks: normalizedQaTasks,
      metrics: {
        patients: next.patients.length,
        referrals: next.referrals.length,
        episodes: next.episodes.length,
        visitsToday,
        qaTasks,
        claimsOnHold,
      },
    }
  }

  async function savePatient() {
    const payload = {
      ...patientForm,
      first_name: patientForm.first_name.trim(),
      last_name: patientForm.last_name.trim(),
      insurance_member_id: patientForm.insurance_member_id.trim(),
      medicare_number: patientForm.payer_type.startsWith('Medicare') ? patientForm.insurance_member_id.trim() : '',
      phone: formatUsPhone(patientForm.phone),
      address1: patientForm.address1.trim(),
      address2: patientForm.address2.trim(),
      city: patientForm.city.trim(),
      state: patientForm.state.trim().toUpperCase(),
      postal_code: patientForm.postal_code.trim(),
      primary_physician: patientForm.primary_physician.trim(),
      emergency_contact_name: patientForm.emergency_contact_name.trim(),
      emergency_contact_relationship: patientForm.emergency_contact_relationship.trim(),
      emergency_contact_phone: formatUsPhone(patientForm.emergency_contact_phone),
      responsible_party_name: patientForm.responsible_party_name.trim(),
      responsible_party_relationship: patientForm.responsible_party_relationship.trim(),
      responsible_party_phone: formatUsPhone(patientForm.responsible_party_phone),
      status: 'active',
    }

    try {
      if (mode === 'api' && token) {
        if (editingPatientId !== null) {
          await api.updatePatient(token, editingPatientId, payload)
        } else {
          await api.addPatient(token, payload)
        }
        await hydrateFromApi(token, user!)
        setStatusMessage(editingPatientId !== null ? 'Patient updated.' : 'Patient registered in the API.')
      } else {
        const nextPatient: Patient = {
          id: editingPatientId ?? dataset.patients.length + 1,
          ...payload,
        }
        setDataset((current) =>
          recalculate(
            editingPatientId !== null
              ? applyDemoPatientUpdate(current, nextPatient)
              : { ...current, patients: [nextPatient, ...current.patients] },
          ),
        )
        setStatusMessage(editingPatientId !== null ? 'Patient updated in demo mode.' : 'Patient added in demo mode.')
      }
    } catch (error) {
      setStatusMessage((error as Error).message)
      return
    }

    resetPatientForm()
    setPatientModalOpen(false)
  }

  function copyEmergencyToResponsibleParty() {
    setPatientForm((current) => ({
      ...current,
      responsible_party_name: current.emergency_contact_name,
      responsible_party_relationship: current.emergency_contact_relationship,
      responsible_party_phone: current.emergency_contact_phone,
    }))
    setStatusMessage('Responsible party copied from emergency contact.')
  }

  function copyPatientPhoneToEmergencyContact() {
    setPatientForm((current) => ({
      ...current,
      emergency_contact_phone: formatUsPhone(current.phone),
    }))
    setStatusMessage('Emergency contact phone copied from the patient phone number.')
  }

  function resetPatientForm() {
    setPatientWizardStep('identity')
    setPatientForm({
      first_name: '',
      last_name: '',
      dob: '',
      gender: 'Female',
      payer_type: 'Medicare',
      insurance_member_id: '',
      phone: '',
      address1: '',
      address2: '',
      city: 'Atlanta',
      state: 'GA',
      postal_code: '',
      primary_physician: '',
      emergency_contact_name: '',
      emergency_contact_relationship: '',
      emergency_contact_phone: '',
      responsible_party_name: '',
      responsible_party_relationship: '',
      responsible_party_phone: '',
    })
    setEditingPatientId(null)
  }

  function loadPatientIntoForm(patient: Patient) {
    setPatientWizardStep('identity')
    setPatientModalOpen(true)
    setPatientForm({
      first_name: patient.first_name,
      last_name: patient.last_name,
      dob: patient.dob,
      gender: patient.gender ?? 'Unknown',
      payer_type: patient.payer_type,
      insurance_member_id: patient.payer_type.startsWith('Medicare')
        ? patient.medicare_number ?? patient.insurance_member_id ?? ''
        : patient.insurance_member_id ?? '',
      phone: patient.phone ?? '',
      address1: patient.address1 ?? '',
      address2: patient.address2 ?? '',
      city: patient.city ?? 'Atlanta',
      state: patient.state ?? 'GA',
      postal_code: patient.postal_code ?? '',
      primary_physician: patient.primary_physician ?? '',
      emergency_contact_name: patient.emergency_contact_name ?? '',
      emergency_contact_relationship: patient.emergency_contact_relationship ?? '',
      emergency_contact_phone: patient.emergency_contact_phone ?? '',
      responsible_party_name: patient.responsible_party_name ?? '',
      responsible_party_relationship: patient.responsible_party_relationship ?? '',
      responsible_party_phone: patient.responsible_party_phone ?? '',
    })
    setEditingPatientId(patient.id)
    setStatusMessage(`Editing patient ${nameForPatient(patient)}.`)
  }

  function copyPatientAddressToReferral() {
    const patient = dataset.patients.find((item) => item.id === Number(referralForm.patient_id))
    if (!patient) {
      setStatusMessage('Choose a patient before copying the service location.')
      return
    }

    setReferralForm((current) => ({
      ...current,
      service_address1: patient.address1 ?? '',
      service_city: patient.city ?? '',
      service_state: patient.state ?? '',
      service_postal_code: patient.postal_code ?? '',
    }))
    setStatusMessage('Service location copied from the patient address.')
  }

  function copyPatientPcpToReferral() {
    const patient = dataset.patients.find((item) => item.id === Number(referralForm.patient_id))
    if (!patient) {
      setStatusMessage('Choose a patient before copying PCP details.')
      return
    }

    setReferralForm((current) => ({
      ...current,
      pcp_name: patient.primary_physician ?? '',
    }))
    setStatusMessage('PCP copied from the patient record.')
  }

  function chooseReferralPatient(patientId: string) {
    const patient = dataset.patients.find((item) => item.id === Number(patientId))
    setReferralForm((current) => ({
      ...current,
      patient_id: patientId,
      payer_type: patient?.payer_type ?? current.payer_type,
      pcp_name: patient?.primary_physician ?? current.pcp_name,
      caregiver_name: patient?.emergency_contact_name ?? current.caregiver_name,
      caregiver_relationship: patient?.emergency_contact_relationship ?? current.caregiver_relationship,
      caregiver_phone: patient?.emergency_contact_phone ?? current.caregiver_phone,
      service_address1: patient?.address1 ?? current.service_address1,
      service_city: patient?.city ?? current.service_city,
      service_state: patient?.state ?? current.service_state,
      service_postal_code: patient?.postal_code ?? current.service_postal_code,
    }))
  }

  function resetReferralForm(patientId = referralForm.patient_id) {
    setReferralWizardStep('intake')
    const patient = dataset.patients.find((item) => item.id === Number(patientId))
    setReferralForm({
      patient_id: patientId,
      source_name: '',
      admission_source: 'Hospital discharge',
      payer_type: patient?.payer_type ?? 'Medicare',
      primary_diagnosis: '',
      face_to_face_date: '2026-04-15',
      physician_orders_signed: 'yes',
      physician_orders_signed_at: '2026-04-16T14:30',
      referring_provider_name: '',
      referring_provider_phone: '',
      pcp_name: patient?.primary_physician ?? '',
      pcp_phone: '',
      caregiver_name: patient?.emergency_contact_name ?? '',
      caregiver_relationship: patient?.emergency_contact_relationship ?? '',
      caregiver_phone: patient?.emergency_contact_phone ?? '',
      service_location_type: 'Patient home',
      service_address1: patient?.address1 ?? '',
      service_city: patient?.city ?? 'Atlanta',
      service_state: patient?.state ?? 'GA',
      service_postal_code: patient?.postal_code ?? '',
      planned_soc_date: '2026-04-19',
      intake_ready: true,
      requested_disciplines: 'SN, PT',
      order_status: 'received',
      notes: '',
    })
    setEditingReferralId(null)
  }

  function loadReferralIntoForm(referral: Referral) {
    setReferralWizardStep('intake')
    setReferralModalOpen(true)
    setReferralForm({
      patient_id: String(referral.patient_id),
      source_name: referral.source_name,
      admission_source: referral.admission_source ?? 'Hospital discharge',
      payer_type: referral.payer_type,
      primary_diagnosis: referral.primary_diagnosis,
      face_to_face_date: referral.face_to_face_date ?? '',
      physician_orders_signed: referral.physician_orders_signed ? 'yes' : 'no',
      physician_orders_signed_at: referral.physician_orders_signed_at ? toDateTimeInputValue(referral.physician_orders_signed_at) : '',
      referring_provider_name: referral.referring_provider_name ?? '',
      referring_provider_phone: referral.referring_provider_phone ?? '',
      pcp_name: referral.pcp_name ?? '',
      pcp_phone: referral.pcp_phone ?? '',
      caregiver_name: referral.caregiver_name ?? '',
      caregiver_relationship: referral.caregiver_relationship ?? '',
      caregiver_phone: referral.caregiver_phone ?? '',
      service_location_type: referral.service_location_type ?? 'Patient home',
      service_address1: referral.service_address1 ?? '',
      service_city: referral.service_city ?? 'Atlanta',
      service_state: referral.service_state ?? 'GA',
      service_postal_code: referral.service_postal_code ?? '',
      planned_soc_date: referral.planned_soc_date,
      intake_ready: referral.intake_ready,
      requested_disciplines: normalizeDisciplines(referral.requested_disciplines).join(', '),
      order_status: referral.order_status ?? 'received',
      notes: referral.notes ?? '',
    })
    setEditingReferralId(referral.id)
    setStatusMessage(`Editing referral ${referral.id} for ${referral.patient_name}.`)
  }

  function chooseVisitEpisode(episodeId: string) {
    const episode = dataset.episodes.find((item) => item.id === Number(episodeId))
    const snapshot = normalizeAdmissionSnapshot(episode?.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, dataset.referrals)
    const recommendedDiscipline = snapshot?.requested_disciplines?.[0] ?? 'SN'
    const recommendedVisitType = recommendedDiscipline === 'SN' ? 'routine' : `${recommendedDiscipline.toLowerCase()}_eval`

    setVisitForm((current) => ({
      ...current,
      episode_id: episodeId,
      patient_id: episode ? String(episode.patient_id) : current.patient_id,
      discipline: recommendedDiscipline,
      visit_type: current.visit_type === 'routine' ? recommendedVisitType : current.visit_type,
    }))
  }

  function loadRecommendationIntoVisitForm(recommendation: VisitRecommendation) {
    setVisitForm((current) => ({
      ...current,
      visit_type: recommendation.visitType,
      discipline: recommendation.discipline,
      scheduled_start: recommendation.targetDateTime,
      scheduled_end: addMinutesToDateTimeLocal(recommendation.targetDateTime, recommendation.durationMinutes),
      requires_evv: recommendation.requiresEvv,
    }))
    setStatusMessage(`${recommendation.title} loaded into the scheduling form.`)
  }

  async function scheduleRecommendationPlan(recommendations: VisitRecommendation[]) {
    if (!selectedClinicianEpisode || recommendations.length === 0) {
      setStatusMessage('Choose an episode with a recommended plan before scheduling visits.')
      return
    }

    const plannedVisits = recommendations.map((recommendation) => ({
      episode_id: selectedClinicianEpisode.id,
      patient_id: selectedClinicianEpisode.patient_id,
      visit_type: recommendation.visitType,
      discipline: recommendation.discipline,
      scheduled_start: toApiDateTime(recommendation.targetDateTime),
      scheduled_end: toApiDateTime(addMinutesToDateTimeLocal(recommendation.targetDateTime, recommendation.durationMinutes)),
      clinician_name: visitForm.clinician_name,
      requires_evv: recommendation.requiresEvv,
      status: 'scheduled',
      documentation_status: 'pending',
      sync_status: 'synced',
    }))

    if (mode === 'api' && token) {
      for (const payload of plannedVisits) {
        await api.addVisit(token, payload)
      }
      await hydrateFromApi(token, user!)
      setStatusMessage(`Scheduled ${plannedVisits.length} week-one visit(s) from the episode plan.`)
      return
    }

    const patient = dataset.patients.find((item) => item.id === selectedClinicianEpisode.patient_id)
    setDataset((current) =>
      recalculate({
        ...current,
        visits: [
          ...current.visits,
          ...plannedVisits.map((payload, index) => ({
            id: current.visits.length + index + 1,
            ...payload,
            patient_name: nameForPatient(patient),
          })),
        ],
      }),
    )
    setStatusMessage(`Scheduled ${plannedVisits.length} week-one visit(s) in demo mode.`)
  }

  function prepareScheduleChange(visit: Visit) {
    setScheduleChangeForm({
      visit_id: String(visit.id),
      visit_type: visit.visit_type,
      discipline: visit.discipline,
      scheduled_start: toDateTimeInputValue(visit.scheduled_start),
      scheduled_end: toDateTimeInputValue(visit.scheduled_end),
      reassigned_clinician: visit.clinician_name,
      follow_up_plan: visit.follow_up_plan ?? '',
      reason: '',
    })
    setStatusMessage(`Loaded visit ${visit.id} into the schedule change form.`)
  }

  function loadVisitDocumentationForm(visit: Visit) {
    const payload = normalizeDocumentationPayload(visit.documentation_payload)
    setDocumentationForm({
      visit_id: String(visit.id),
      visit_focus: payload?.visit_focus ?? defaultVisitFocusForDiscipline(visit.discipline),
      visit_narrative: payload?.visit_narrative ?? '',
      interventions: payload?.interventions ?? '',
      patient_response: payload?.patient_response ?? '',
      vitals: payload?.vitals ?? '',
      pain_level: payload?.pain_level ?? '',
      teaching_topics: payload?.teaching_topics ?? '',
      medication_review: payload?.medication_review ?? '',
      wound_care: payload?.wound_care ?? '',
      mobility_status: payload?.mobility_status ?? '',
      adl_support: payload?.adl_support ?? '',
      psychosocial_notes: payload?.psychosocial_notes ?? '',
      abnormal_findings: payload?.abnormal_findings ?? '',
      physician_contact_needed: payload?.physician_contact_needed ? 'yes' : 'no',
      follow_up_plan: payload?.follow_up_plan ?? visit.follow_up_plan ?? '',
      next_visit_focus: payload?.next_visit_focus ?? '',
      qa_review_notes: visit.qa_review_notes ?? '',
    })
    setStatusMessage(`Loaded visit ${visit.id} into the documentation form.`)
  }

  async function saveVisitDocumentation(submitForQa: boolean) {
    const visitId = Number(documentationForm.visit_id)
    if (!visitId) {
      setStatusMessage('Choose a visit before saving documentation.')
      return
    }

    const payload = {
      visit_focus: documentationForm.visit_focus.trim(),
      visit_narrative: documentationForm.visit_narrative.trim(),
      interventions: documentationForm.interventions.trim(),
      patient_response: documentationForm.patient_response.trim(),
      vitals: documentationForm.vitals.trim(),
      pain_level: documentationForm.pain_level.trim(),
      teaching_topics: documentationForm.teaching_topics.trim(),
      medication_review: documentationForm.medication_review.trim(),
      wound_care: documentationForm.wound_care.trim(),
      mobility_status: documentationForm.mobility_status.trim(),
      adl_support: documentationForm.adl_support.trim(),
      psychosocial_notes: documentationForm.psychosocial_notes.trim(),
      abnormal_findings: documentationForm.abnormal_findings.trim(),
      physician_contact_needed: documentationForm.physician_contact_needed === 'yes',
      follow_up_plan: documentationForm.follow_up_plan.trim(),
      next_visit_focus: documentationForm.next_visit_focus.trim(),
      submit_for_qa: submitForQa,
    }

    if (mode === 'api' && token) {
      try {
        await api.documentVisit(token, visitId, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage(submitForQa ? 'Visit documentation submitted for QA review.' : 'Visit documentation saved.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const targetVisit = dataset.visits.find((visit) => visit.id === visitId)
    if (!targetVisit) {
      setStatusMessage('Selected visit could not be found.')
      return
    }

    const summary = buildDocumentationSummary(payload)
    const nextQaTasks = submitForQa
      ? upsertDemoVisitDocumentationQaTask(dataset.qaTasks, targetVisit, summary)
      : dataset.qaTasks

    setDataset((current) =>
      recalculate({
        ...current,
        visits: current.visits.map((visit) =>
          visit.id === visitId
            ? {
                ...visit,
                documentation_payload: {
                  visit_focus: payload.visit_focus,
                  visit_narrative: payload.visit_narrative,
                  interventions: payload.interventions,
                  patient_response: payload.patient_response,
                  vitals: payload.vitals,
                  pain_level: payload.pain_level,
                  teaching_topics: payload.teaching_topics,
                  medication_review: payload.medication_review,
                  wound_care: payload.wound_care,
                  mobility_status: payload.mobility_status,
                  adl_support: payload.adl_support,
                  psychosocial_notes: payload.psychosocial_notes,
                  abnormal_findings: payload.abnormal_findings,
                  physician_contact_needed: payload.physician_contact_needed,
                  follow_up_plan: payload.follow_up_plan,
                  next_visit_focus: payload.next_visit_focus,
                },
                documentation_summary: summary || visit.documentation_summary,
                follow_up_plan: payload.follow_up_plan || visit.follow_up_plan,
                documentation_status: submitForQa
                  ? 'qa_review'
                  : visit.status === 'completed'
                    ? 'completed'
                    : visit.documentation_status,
              }
            : visit,
        ),
        qaTasks: nextQaTasks,
        claims: syncQaDrivenClaimHolds(current.claims, nextQaTasks),
      }),
    )
    setStatusMessage(submitForQa ? 'Visit documentation submitted for QA review in demo mode.' : 'Visit documentation saved in demo mode.')
  }

  async function lockVisitDocumentation(taskOrVisit: QaTask | Visit) {
    const visitId = 'visit_id' in taskOrVisit
      ? (typeof taskOrVisit.visit_id === 'number' ? taskOrVisit.visit_id : 0)
      : taskOrVisit.id

    if (!visitId) {
      setStatusMessage('Choose a visit documentation task before locking the chart.')
      return
    }

    const payload = {
      qa_review_notes: documentationForm.qa_review_notes.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.lockVisitDocumentation(token, visitId, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Visit documentation locked and released from QA review.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const nextQaTasks = dataset.qaTasks.map((task) =>
      task.visit_id === visitId && task.task_type === 'visit_documentation_review' && task.status === 'open'
        ? { ...task, status: 'resolved' }
        : task,
    )

    setDataset((current) =>
      recalculate({
        ...current,
        visits: current.visits.map((visit) =>
          visit.id === visitId
            ? {
                ...visit,
                status: 'locked',
                documentation_status: 'locked',
                qa_review_notes: payload.qa_review_notes || visit.qa_review_notes,
              }
            : visit,
        ),
        qaTasks: nextQaTasks,
        claims: syncQaDrivenClaimHolds(current.claims, nextQaTasks),
      }),
    )
    setStatusMessage('Visit documentation locked in demo mode.')
  }

  async function rescheduleVisitChange() {
    const visitId = Number(scheduleChangeForm.visit_id)
    if (!visitId) {
      setStatusMessage('Choose a visit to reschedule first.')
      return
    }

    const payload = {
      visit_type: scheduleChangeForm.visit_type,
      discipline: scheduleChangeForm.discipline,
      scheduled_start: toApiDateTime(scheduleChangeForm.scheduled_start),
      scheduled_end: toApiDateTime(scheduleChangeForm.scheduled_end),
      follow_up_plan: scheduleChangeForm.follow_up_plan.trim(),
      reason: scheduleChangeForm.reason.trim() || 'Schedule changed after activation.',
    }

    if (mode === 'api' && token) {
      try {
        await api.rescheduleVisit(token, visitId, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Visit rescheduled and routed for QA review.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const targetVisit = dataset.visits.find((visit) => visit.id === visitId)
    if (!targetVisit) {
      setStatusMessage('Selected visit could not be found.')
      return
    }

    const changedTiming = targetVisit.scheduled_start.slice(0, 10) !== payload.scheduled_start.slice(0, 10)
    const changedPlan = targetVisit.visit_type !== payload.visit_type || targetVisit.discipline !== payload.discipline
    const episode = dataset.episodes.find((item) => item.id === targetVisit.episode_id)
    const shouldReview = episode?.episode_status === 'active' || changedTiming || changedPlan
    const reviewDetails = `Schedule changed from ${targetVisit.discipline} ${targetVisit.visit_type} on ${targetVisit.scheduled_start} to ${payload.discipline} ${payload.visit_type} on ${payload.scheduled_start}. ${payload.reason}`
    const nextQaTasks = shouldReview
      ? [
          {
            id: dataset.qaTasks.length + 1,
            episode_id: targetVisit.episode_id,
            visit_id: visitId,
            task_type: 'frequency_change',
            priority: 'medium',
            status: 'open',
            title: 'Review frequency or schedule change after activation',
            details: reviewDetails,
            assigned_role: 'QA',
            due_at: payload.scheduled_start,
          } satisfies QaTask,
          ...dataset.qaTasks,
        ]
      : dataset.qaTasks

    setDataset((current) =>
      recalculate({
        ...current,
        visits: current.visits.map((visit) =>
          visit.id === visitId
            ? {
                ...visit,
                visit_type: payload.visit_type,
                discipline: payload.discipline,
                scheduled_start: payload.scheduled_start,
                scheduled_end: payload.scheduled_end,
                sync_status: 'rescheduled',
                status: 'scheduled',
                documentation_status: shouldReview ? 'qa_review' : 'pending',
                follow_up_plan: payload.follow_up_plan || visit.follow_up_plan,
                documentation_summary: appendSummary(visit.documentation_summary, `Rescheduled from ${targetVisit.scheduled_start}. ${payload.reason}`),
              }
            : visit,
        ),
        qaTasks: nextQaTasks,
        claims: syncQaDrivenClaimHolds(current.claims, nextQaTasks),
      }),
    )
    setStatusMessage('Visit rescheduled in demo mode and routed for review.')
  }

  async function markVisitMissed(visit: Visit) {
    const reason = scheduleChangeForm.visit_id === String(visit.id) && scheduleChangeForm.reason.trim() !== ''
      ? scheduleChangeForm.reason.trim()
      : 'Visit missed and requires follow-up review.'
    const followUpPlan = scheduleChangeForm.visit_id === String(visit.id) && scheduleChangeForm.follow_up_plan.trim() !== ''
      ? scheduleChangeForm.follow_up_plan.trim()
      : 'Care team to confirm patient status and determine whether rescheduling is required.'

    if (mode === 'api' && token) {
      try {
        await api.markVisitMissed(token, visit.id, { reason, follow_up_plan: followUpPlan })
        await hydrateFromApi(token, user!)
        setStatusMessage('Visit marked missed and routed for QA review.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const nextQaTasks = [
      {
        id: dataset.qaTasks.length + 1,
        episode_id: visit.episode_id,
        visit_id: visit.id,
        task_type: 'missed_visit',
        priority: 'high',
        status: 'open',
        title: 'Review missed visit and follow-up actions',
        details: `${reason} Follow-up plan: ${followUpPlan}`,
        assigned_role: 'QA',
        due_at: visit.scheduled_start,
      } satisfies QaTask,
      ...dataset.qaTasks,
    ]

    setDataset((current) =>
      recalculate({
        ...current,
        visits: current.visits.map((item) =>
          item.id === visit.id
            ? {
                ...item,
                status: 'missed',
                sync_status: 'missed',
                documentation_status: 'exception_review',
                missed_reason: reason,
                follow_up_plan: followUpPlan,
                documentation_summary: appendSummary(item.documentation_summary, `Missed visit: ${reason} Follow-up plan: ${followUpPlan}`),
              }
            : item,
        ),
        qaTasks: nextQaTasks,
        claims: syncQaDrivenClaimHolds(current.claims, nextQaTasks),
      }),
    )
    setStatusMessage('Visit marked missed in demo mode and routed for review.')
  }

  async function reassignVisitChange() {
    const visitId = Number(scheduleChangeForm.visit_id)
    if (!visitId) {
      setStatusMessage('Choose a visit to reassign first.')
      return
    }

    const payload = {
      clinician_name: scheduleChangeForm.reassigned_clinician.trim(),
      reason: scheduleChangeForm.reason.trim() || 'Visit staffing assignment updated.',
      follow_up_plan: scheduleChangeForm.follow_up_plan.trim() || 'New clinician to confirm visit timing and documentation readiness.',
    }

    if (payload.clinician_name === '') {
      setStatusMessage('Enter the new clinician before reassigning the visit.')
      return
    }

    if (mode === 'api' && token) {
      try {
        await api.reassignVisit(token, visitId, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Visit reassigned and routed for staffing review.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const targetVisit = dataset.visits.find((visit) => visit.id === visitId)
    if (!targetVisit) {
      setStatusMessage('Selected visit could not be found.')
      return
    }

    const nextQaTasks = [
      {
        id: dataset.qaTasks.length + 1,
        episode_id: targetVisit.episode_id,
        visit_id: visitId,
        task_type: 'visit_reassignment',
        priority: 'medium',
        status: 'open',
        title: 'Review visit reassignment and staffing handoff',
        details: `${targetVisit.clinician_name} reassigned to ${payload.clinician_name}. ${payload.reason} Follow-up plan: ${payload.follow_up_plan}`,
        assigned_role: 'QA',
        due_at: targetVisit.scheduled_start,
      } satisfies QaTask,
      ...dataset.qaTasks,
    ]

    setDataset((current) =>
      recalculate({
        ...current,
        visits: current.visits.map((visit) =>
          visit.id === visitId
            ? {
                ...visit,
                clinician_name: payload.clinician_name,
                reassigned_from_clinician: targetVisit.clinician_name,
                sync_status: 'reassigned',
                documentation_status: 'qa_review',
                follow_up_plan: payload.follow_up_plan,
                documentation_summary: appendSummary(
                  visit.documentation_summary,
                  `Reassigned from ${targetVisit.clinician_name} to ${payload.clinician_name}. ${payload.reason} Follow-up plan: ${payload.follow_up_plan}`,
                ),
              }
            : visit,
        ),
        qaTasks: nextQaTasks,
        claims: syncQaDrivenClaimHolds(current.claims, nextQaTasks),
      }),
    )
    setStatusMessage('Visit reassigned in demo mode and routed for staffing review.')
  }

  async function saveReferral() {
    const payload = {
      ...referralForm,
      patient_id: Number(referralForm.patient_id),
      source_name: referralForm.source_name.trim(),
      admission_source: referralForm.admission_source.trim(),
      primary_diagnosis: referralForm.primary_diagnosis.trim(),
      face_to_face_date: referralForm.face_to_face_date,
      physician_orders_signed: referralForm.physician_orders_signed === 'yes',
      physician_orders_signed_at:
        referralForm.physician_orders_signed === 'yes' && referralForm.physician_orders_signed_at !== ''
          ? toApiDateTime(referralForm.physician_orders_signed_at)
          : '',
      referring_provider_name: referralForm.referring_provider_name.trim(),
      referring_provider_phone: formatUsPhone(referralForm.referring_provider_phone),
      pcp_name: referralForm.pcp_name.trim(),
      pcp_phone: formatUsPhone(referralForm.pcp_phone),
      caregiver_name: referralForm.caregiver_name.trim(),
      caregiver_relationship: referralForm.caregiver_relationship.trim(),
      caregiver_phone: formatUsPhone(referralForm.caregiver_phone),
      service_location_type: referralForm.service_location_type.trim(),
      service_address1: referralForm.service_address1.trim(),
      service_city: referralForm.service_city.trim(),
      service_state: referralForm.service_state.trim().toUpperCase(),
      service_postal_code: referralForm.service_postal_code.trim(),
      requested_disciplines: referralForm.requested_disciplines.split(',').map((entry) => entry.trim()),
      order_status: referralForm.order_status,
      notes: referralForm.notes.trim(),
      status: 'accepted',
    }

    try {
      if (mode === 'api' && token) {
        if (editingReferralId !== null) {
          await api.updateReferral(token, editingReferralId, payload)
        } else {
          await api.addReferral(token, payload)
        }
        await hydrateFromApi(token, user!)
        setStatusMessage(editingReferralId !== null ? 'Referral updated.' : 'Referral captured and added to intake.')
      } else {
        const patient = dataset.patients.find((item) => item.id === Number(referralForm.patient_id))
        const nextReferral: Referral = {
          id: editingReferralId ?? dataset.referrals.length + 1,
          patient_id: Number(referralForm.patient_id),
          patient_name: nameForPatient(patient),
          source_name: payload.source_name,
          admission_source: payload.admission_source,
          payer_type: referralForm.payer_type,
          primary_diagnosis: payload.primary_diagnosis,
          requested_disciplines: payload.requested_disciplines,
          order_status: payload.order_status,
          physician_orders_signed: payload.physician_orders_signed,
          physician_orders_signed_at: typeof payload.physician_orders_signed_at === 'string' ? payload.physician_orders_signed_at : undefined,
          face_to_face_date: payload.face_to_face_date,
          referring_provider_name: payload.referring_provider_name,
          referring_provider_phone: payload.referring_provider_phone,
          pcp_name: payload.pcp_name,
          pcp_phone: payload.pcp_phone,
          caregiver_name: payload.caregiver_name,
          caregiver_relationship: payload.caregiver_relationship,
          caregiver_phone: payload.caregiver_phone,
          service_location_type: payload.service_location_type,
          service_address1: payload.service_address1,
          service_city: payload.service_city,
          service_state: payload.service_state,
          service_postal_code: payload.service_postal_code,
          planned_soc_date: referralForm.planned_soc_date,
          intake_ready: referralForm.intake_ready,
          status: 'accepted',
          notes: payload.notes,
        }
        setDataset((current) =>
          recalculate(
            editingReferralId !== null
              ? applyDemoReferralUpdate(current, nextReferral)
              : { ...current, referrals: [nextReferral, ...current.referrals] },
          ),
        )
        setStatusMessage(editingReferralId !== null ? 'Referral updated in demo mode.' : 'Referral added in demo mode.')
      }
    } catch (error) {
      setStatusMessage((error as Error).message)
      return
    }

    resetReferralForm(referralForm.patient_id)
    setReferralModalOpen(false)
  }

  async function convertReferral(referral: Referral) {
    if (mode === 'api' && token) {
      const response = await api.convertReferral(token, referral.id)
      await hydrateFromApi(token, user!)
      if (response.data) {
        applyEpisodeContext(response.data)
      }
      setStatusMessage(`Referral ${referral.id} converted into an episode.`)
      return
    }

    const certStart = referral.planned_soc_date
    const certEnd = shiftDate(certStart, 59)
    const episode: Episode = {
      id: dataset.episodes.length + 1,
      patient_id: referral.patient_id,
      patient_name: referral.patient_name,
      referral_id: referral.id,
      cert_start_date: certStart,
      cert_end_date: certEnd,
      episode_status: 'pending_admission',
      payer_type: referral.payer_type,
      primary_diagnosis: referral.primary_diagnosis,
      admission_readiness_snapshot: buildAdmissionSnapshotFromReferral(referral),
      oasis_version_required: resolveOasisVersion(`${certStart}T00:00`),
    }
    const documentationTasks = buildDocumentationQaTasksForReferral(episode.id, referral, dataset.qaTasks.length + 2, certStart)
    const admissionOrder: PhysicianOrder = {
      id: dataset.physicianOrders.length + 1,
      referral_id: referral.id,
      episode_id: episode.id,
      order_scope: 'admission',
      version_number: 1,
      order_status: normalizeDemoReferralOrderStatus(referral.order_status, referral.physician_orders_signed),
      active: true,
      received_at: referral.physician_orders_signed_at ?? undefined,
      signed_at: referral.physician_orders_signed_at ?? undefined,
      signer_name: referral.referring_provider_name,
      order_summary: `Admission physician order packet for planned SOC on ${certStart}.`,
      order_note: 'Created automatically from referral intake during episode conversion.',
    }
    const baseQaTasks = [
      {
        id: dataset.qaTasks.length + 1,
        episode_id: episode.id,
        task_type: 'admission_readiness',
        priority: 'high',
        status: 'open',
        title: 'Review SOC readiness and physician orders',
        details: 'Episode created from referral and waiting for SOC completion.',
        assigned_role: 'Clinical',
        due_at: `${certStart} 09:00:00`,
      },
      ...documentationTasks,
      ...dataset.qaTasks,
    ]
    const nextQaTasks = admissionOrder.order_status === 'signed'
      ? baseQaTasks
      : syncDemoOrderQaTasks(baseQaTasks, admissionOrder)

    const next = recalculate({
      ...dataset,
      referrals: dataset.referrals.map((item) => (item.id === referral.id ? { ...item, status: 'converted_to_episode' } : item)),
      episodes: [episode, ...dataset.episodes],
      physicianOrders: [admissionOrder, ...dataset.physicianOrders],
      qaTasks: nextQaTasks,
    })

    setDataset(next)
    applyEpisodeContext(episode)
    setStatusMessage(`Referral ${referral.id} converted into a pending admission episode.`)
  }

  async function updateReferralIntakeDocumentation(
    episode: Episode,
    updates: { face_to_face_date?: string; physician_orders_signed?: boolean; physician_orders_signed_at?: string; order_status?: string },
    successMessage: string,
  ) {
    if (!episode.referral_id) {
      setStatusMessage('This episode is not linked to a referral record.')
      return
    }

    if (mode === 'api' && token) {
      try {
        await api.updateReferralIntakeDocs(token, episode.referral_id, updates)
        await hydrateFromApi(token, user!)
        setStatusMessage(successMessage)
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    setDataset((current) => recalculate(applyDemoIntakeDocumentationUpdate(current, episode, updates)))
    setStatusMessage(`${successMessage} in demo mode.`)
  }

  async function saveReferralDocument() {
    if (!selectedReferral) {
      setStatusMessage('Choose an episode linked to a referral before managing intake documents.')
      return
    }

    const payload = {
      document_type: referralDocumentForm.document_type,
      document_status: referralDocumentForm.document_status,
      source_name: referralDocumentForm.source_name.trim(),
      received_at: referralDocumentForm.received_at ? toApiDateTime(referralDocumentForm.received_at) : '',
      signed_at:
        referralDocumentForm.document_type === 'physician_orders' && referralDocumentForm.document_status === 'signed'
          ? toApiDateTime(referralDocumentForm.signed_at)
          : '',
      document_note: referralDocumentForm.document_note.trim(),
    }

    if (mode === 'api' && token) {
      try {
        let savedDocumentId = editingReferralDocumentId
        if (editingReferralDocumentId !== null) {
          await api.updateReferralDocument(token, editingReferralDocumentId, payload)
        } else {
          const response = await api.addReferralDocument(token, selectedReferral.id, payload)
          savedDocumentId = response.data?.id ?? null
        }
        if (savedDocumentId !== null && referralDocumentAttachment) {
          await api.uploadReferralDocumentAttachment(token, savedDocumentId, referralDocumentAttachment)
        }
        await hydrateFromApi(token, user!)
        resetReferralDocumentForm(referralDocumentForm.document_type)
        setEpisodeModal(null)
        setStatusMessage(
          referralDocumentAttachment
            ? 'Referral document and attachment saved.'
            : editingReferralDocumentId !== null
              ? 'Referral document updated.'
              : 'Referral document added.',
        )
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const nextDocument: ReferralDocument = {
      id: editingReferralDocumentId ?? dataset.referralDocuments.length + 1,
      referral_id: selectedReferral.id,
      document_type: payload.document_type,
      document_status: payload.document_status,
      source_name: payload.source_name || undefined,
      received_at: payload.received_at || undefined,
      signed_at: payload.signed_at || undefined,
      original_file_name: referralDocumentAttachment?.name,
      mime_type: referralDocumentAttachment?.type || undefined,
      file_size: referralDocumentAttachment?.size,
      document_note: payload.document_note || undefined,
    }

    setDataset((current) => recalculate(applyDemoReferralDocumentUpsert(current, nextDocument)))
    resetReferralDocumentForm(referralDocumentForm.document_type)
    setEpisodeModal(null)
    setStatusMessage(editingReferralDocumentId !== null ? 'Referral document updated in demo mode.' : 'Referral document added in demo mode.')
  }

  async function savePhysicianOrder() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before managing physician orders.')
      return
    }

    const payload = {
      order_scope: orderForm.order_scope,
      order_status: orderForm.order_status,
      signer_name: orderForm.signer_name.trim(),
      sent_at: orderForm.sent_at ? toApiDateTime(orderForm.sent_at) : '',
      received_at: orderForm.received_at ? toApiDateTime(orderForm.received_at) : '',
      signed_at: orderForm.order_status === 'signed' && orderForm.signed_at ? toApiDateTime(orderForm.signed_at) : '',
      order_summary: orderForm.order_summary.trim(),
      order_note: orderForm.order_note.trim(),
    }

    if (mode === 'api' && token) {
      try {
        if (editingOrderId !== null) {
          await api.updatePhysicianOrder(token, editingOrderId, payload)
        } else {
          await api.addEpisodeOrder(token, selectedEpisode.id, payload)
        }
        await hydrateFromApi(token, user!)
        resetOrderForm(orderForm.order_scope)
        setEpisodeModal(null)
        setStatusMessage(editingOrderId !== null ? 'Physician order updated.' : 'Physician order version created.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const nextOrder = buildDemoPhysicianOrder(dataset, selectedEpisode, payload, editingOrderId)
    setDataset((current) => recalculate(applyDemoPhysicianOrderUpsert(current, nextOrder)))
    resetOrderForm(orderForm.order_scope)
    setEpisodeModal(null)
    setStatusMessage(editingOrderId !== null ? 'Physician order updated in demo mode.' : 'Physician order version created in demo mode.')
  }

  async function downloadReferralDocument(document: ReferralDocument) {
    if (mode === 'api' && token) {
      try {
        const { blob, fileName } = await api.downloadReferralDocument(token, document.id)
        const url = URL.createObjectURL(blob)
        const link = window.document.createElement('a')
        link.href = url
        link.download = fileName
        window.document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
        setStatusMessage(`Downloaded ${fileName}.`)
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    setStatusMessage(document.original_file_name ? `Demo mode: attachment ${document.original_file_name} is registered.` : 'Demo mode: this document has no attached file.')
  }

  async function saveEpisodeAdmissionDetails() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before updating admission details.')
      return
    }

    const payload = {
      admission_source: episodeAdmissionForm.admission_source.trim(),
      referring_provider_name: episodeAdmissionForm.referring_provider_name.trim(),
      referring_provider_phone: formatUsPhone(episodeAdmissionForm.referring_provider_phone),
      pcp_name: episodeAdmissionForm.pcp_name.trim(),
      pcp_phone: formatUsPhone(episodeAdmissionForm.pcp_phone),
      caregiver_name: episodeAdmissionForm.caregiver_name.trim(),
      caregiver_relationship: episodeAdmissionForm.caregiver_relationship.trim(),
      caregiver_phone: formatUsPhone(episodeAdmissionForm.caregiver_phone),
      service_location_type: episodeAdmissionForm.service_location_type.trim(),
      service_address1: episodeAdmissionForm.service_address1.trim(),
      service_city: episodeAdmissionForm.service_city.trim(),
      service_state: formatStateCode(episodeAdmissionForm.service_state),
      service_postal_code: formatZipCode(episodeAdmissionForm.service_postal_code),
      requested_disciplines: episodeAdmissionForm.requested_disciplines
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      notes: episodeAdmissionForm.notes.trim(),
    }

    if (mode === 'api' && token) {
      try {
        const response = await api.updateEpisodeAdmission(token, selectedEpisode.id, payload)
        await hydrateFromApi(token, user!)
        if (response.data) {
          applyEpisodeContext(response.data)
        }
        setEpisodeModal(null)
        setStatusMessage('Episode admission details updated.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const nextDataset = recalculate(applyDemoEpisodeAdmissionUpdate(dataset, selectedEpisode, payload))
    setDataset(nextDataset)
    syncEpisodeAdmissionForm(nextDataset.episodes.find((episode) => episode.id === selectedEpisode.id))
    setEpisodeModal(null)
    setStatusMessage('Episode admission details updated in demo mode.')
  }

  async function addAssessment() {
    const completedAt = toApiDateTime(assessmentForm.completed_at)
    const answers = {
      M0110: '1',
      M1033: assessmentForm.oasis_m1033,
      M1860: assessmentForm.oasis_m1860,
      M2020: assessmentForm.oasis_m2020,
    }
    const assessmentPayload: AssessmentClinicalPayload = {
      medication_review: {
        issues: assessmentForm.medication_issues.trim(),
        high_risk_meds: assessmentForm.high_risk_meds.trim(),
      },
      wounds: {
        present: assessmentForm.wound_present === 'yes',
        notes: assessmentForm.wound_notes.trim(),
      },
      caregiver_support: {
        availability: assessmentForm.caregiver_availability.trim(),
        notes: assessmentForm.caregiver_notes.trim(),
      },
      risk_notes: assessmentForm.risk_notes.trim(),
    }
    const payload = {
      episode_id: Number(assessmentForm.episode_id),
      assessment_type: assessmentForm.assessment_type,
      completed_at: completedAt,
      principal_diagnosis_code: assessmentForm.principal_diagnosis_code,
      functional_score: Number(assessmentForm.functional_score),
      comorbidity_level: assessmentForm.comorbidity_level,
      status: assessmentForm.status,
      medication_reconciliation_completed: assessmentForm.medication_reconciliation_completed === 'yes',
      homebound_status: assessmentForm.homebound_status,
      homebound_narrative: assessmentForm.homebound_narrative.trim(),
      fall_risk_level: assessmentForm.fall_risk_level,
      hospitalization_risk: assessmentForm.hospitalization_risk,
      emergency_preparedness_reviewed: assessmentForm.emergency_preparedness_reviewed === 'yes',
      care_plan_goals: assessmentForm.care_plan_goals.trim(),
      clinical_summary: assessmentForm.clinical_summary.trim(),
      assessment_payload: assessmentPayload,
      answers,
    }

    if (mode === 'api' && token) {
      try {
        if (editingAssessmentId !== null) {
          await api.updateAssessment(token, editingAssessmentId, payload)
          await hydrateFromApi(token, user!)
          setStatusMessage('Assessment updated and sent to QA.')
        } else {
          await api.addAssessment(token, payload)
          await hydrateFromApi(token, user!)
          setStatusMessage('Assessment added and sent to QA.')
        }
        resetAssessmentForm(Number(assessmentForm.episode_id))
        setEpisodeModal(null)
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const assessment: Assessment = {
      id: editingAssessmentId ?? dataset.assessments.length + 1,
      episode_id: payload.episode_id,
      assessment_type: payload.assessment_type,
      completed_at: payload.completed_at,
      oasis_version: resolveOasisVersion(payload.completed_at),
      status: payload.status,
      principal_diagnosis_code: payload.principal_diagnosis_code,
      functional_score: payload.functional_score,
      comorbidity_level: payload.comorbidity_level,
      medication_reconciliation_completed: payload.medication_reconciliation_completed,
      homebound_status: payload.homebound_status,
      homebound_narrative: payload.homebound_narrative,
      fall_risk_level: payload.fall_risk_level,
      hospitalization_risk: payload.hospitalization_risk,
      emergency_preparedness_reviewed: payload.emergency_preparedness_reviewed,
      care_plan_goals: payload.care_plan_goals,
      clinical_summary: payload.clinical_summary,
      answers,
      assessment_payload: assessmentPayload,
    }

    setDataset((current) =>
      recalculate({
        ...current,
        assessments:
          editingAssessmentId !== null
            ? current.assessments.map((item) => (item.id === editingAssessmentId ? assessment : item))
            : [assessment, ...current.assessments],
        qaTasks: [
          {
            id:
              current.qaTasks.find((task) => task.assessment_id === assessment.id && task.task_type === 'assessment_review')?.id ??
              current.qaTasks.length + 1,
            episode_id: assessment.episode_id,
            assessment_id: assessment.id,
            task_type: 'assessment_review',
            priority: 'high',
            status: 'open',
            title: `Review ${assessment.oasis_version} and coding`,
            details: `Assessment requires QA review before billing release. Homebound ${assessment.homebound_status}. Medication reconciliation ${assessment.medication_reconciliation_completed ? 'completed' : 'pending'}.`,
            assigned_role: 'QA',
            due_at: assessment.completed_at,
          },
          ...current.qaTasks.filter((task) => !(task.assessment_id === assessment.id && task.task_type === 'assessment_review')),
        ],
      }),
    )
    resetAssessmentForm(Number(assessmentForm.episode_id))
    setEpisodeModal(null)
    setStatusMessage(editingAssessmentId !== null ? 'Assessment updated in demo mode.' : 'Assessment added in demo mode.')
  }

  async function addVisit() {
    const payload = {
      episode_id: Number(visitForm.episode_id),
      patient_id: Number(visitForm.patient_id),
      visit_type: visitForm.visit_type,
      discipline: visitForm.discipline,
      scheduled_start: toApiDateTime(visitForm.scheduled_start),
      scheduled_end: toApiDateTime(visitForm.scheduled_end),
      clinician_name: visitForm.clinician_name,
      requires_evv: visitForm.requires_evv,
      status: 'scheduled',
      sync_status: 'synced',
    }

    if (mode === 'api' && token) {
      await api.addVisit(token, payload)
      await hydrateFromApi(token, user!)
      setStatusMessage('Visit scheduled.')
      return
    }

    const patient = dataset.patients.find((item) => item.id === payload.patient_id)
    const visit: Visit = {
      id: dataset.visits.length + 1,
      ...payload,
      documentation_status: 'pending',
      patient_name: nameForPatient(patient),
    }

    setDataset((current) => recalculate({ ...current, visits: [...current.visits, visit] }))
    setStatusMessage('Visit scheduled in demo mode.')
  }

  async function activateEpisode(episodeId: number) {
    if (mode === 'api' && token) {
      try {
        await api.activateEpisode(token, episodeId)
        await hydrateFromApi(token, user!)
        const readiness = await api.episodeReadiness(token, episodeId)
        setApiEpisodeReadiness(readiness.data ?? null)
        setStatusMessage('Episode activated and NOA draft created.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const socVisit = dataset.visits.find(
      (visit) => visit.episode_id === episodeId && visit.visit_type === 'soc' && ['completed', 'locked'].includes(visit.status),
    )
    const assessment = dataset.assessments
      .filter((item) => item.episode_id === episodeId && ['final', 'locked'].includes(item.status))
      .sort((left, right) => right.completed_at.localeCompare(left.completed_at))[0]
    const episode = dataset.episodes.find((item) => item.id === episodeId)
    if (!socVisit || !assessment) {
      setStatusMessage('Episode needs a completed SOC visit and finalized OASIS before activation.')
      return
    }
    const assessmentBlockers = assessmentActivationBlockers(assessment)
    if (assessmentBlockers.length > 0) {
      setStatusMessage(assessmentBlockers[0])
      return
    }

    const snapshot =
      normalizeAdmissionSnapshot(episode?.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, dataset.referrals)
    if (!snapshot?.face_to_face_date) {
      setStatusMessage('Episode cannot activate until face-to-face documentation is captured on the referral.')
      return
    }
    if (!snapshot?.physician_orders_signed || !snapshot?.physician_orders_signed_at) {
      setStatusMessage('Episode cannot activate until physician orders are signed.')
      return
    }
    const pdgmAdmissionSource = mapPdgmAdmissionSource(snapshot?.admission_source)

    const nextEpisodes = dataset.episodes.map((episode) =>
      episode.id === episodeId
        ? {
            ...episode,
            episode_status: 'active',
            start_of_care_date: socVisit.actual_start?.slice(0, 10) ?? socVisit.scheduled_start.slice(0, 10),
            noa_due_date: shiftDate(socVisit.actual_start?.slice(0, 10) ?? socVisit.scheduled_start.slice(0, 10), 5),
            pdgm_group_code: createPdgmGroup(
              assessment.principal_diagnosis_code,
              assessment.functional_score,
              assessment.comorbidity_level,
              pdgmAdmissionSource,
            ),
            oasis_version_required: assessment.oasis_version,
          }
        : episode,
    )

    const claim: Claim = {
      id: dataset.claims.length + 1,
      episode_id: episodeId,
      claim_type: 'noa',
      status: 'draft',
    }

    setDataset((current) => recalculate({ ...current, episodes: nextEpisodes, claims: [claim, ...current.claims] }))
    setStatusMessage('Episode activated in demo mode.')
  }

  async function runLifecycleTransition() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before running a lifecycle transition.')
      return
    }

    if (mode === 'api' && token) {
      try {
        await api.transitionEpisode(token, selectedEpisode.id, lifecycleForm)
        await hydrateFromApi(token, user!)
        const readiness = await api.episodeReadiness(token, selectedEpisode.id)
        setApiEpisodeReadiness(readiness.data ?? null)
        setEpisodeModal(null)
        setStatusMessage(`Lifecycle action ${lifecycleForm.transition_type.replace('_', ' ')} recorded.`)
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const effectiveDate = lifecycleForm.effective_date
    const updatedEpisodes = dataset.episodes.map((episode) =>
      episode.id === selectedEpisode.id
        ? {
            ...episode,
            episode_status: mapDemoTransitionStatus(lifecycleForm.transition_type),
          }
        : episode,
    )
    const createdVisits = ['recertify', 'resume_care'].includes(lifecycleForm.transition_type)
      ? [
          {
            id: dataset.visits.length + 1,
            episode_id: selectedEpisode.id,
            patient_id: selectedEpisode.patient_id,
            patient_name: selectedEpisode.patient_name,
            visit_type: lifecycleForm.transition_type === 'recertify' ? 'recertification' : 'roc',
            discipline: 'SN',
            scheduled_start: `${effectiveDate} 09:00:00`,
            scheduled_end: `${effectiveDate} 10:00:00`,
            clinician_name: lifecycleForm.clinician_name,
            status: 'scheduled',
            requires_evv: false,
            documentation_status: 'pending',
            sync_status: 'synced',
            documentation_summary: 'Lifecycle transition created this visit.',
          } satisfies Visit,
        ]
      : []
    const createdOrders = ['recertify', 'resume_care'].includes(lifecycleForm.transition_type)
      ? [
          buildDemoPhysicianOrder(
            dataset,
            selectedEpisode,
            {
              order_scope: lifecycleForm.transition_type === 'recertify' ? 'recertification' : 'resume_of_care',
              order_status: 'sent_for_signature',
              signer_name: '',
              sent_at: `${effectiveDate} 09:00:00`,
              received_at: '',
              signed_at: '',
              order_summary: `${labelizeTransition(lifecycleForm.transition_type)} physician order packet created by lifecycle transition.`,
              order_note: lifecycleForm.note || demoTransitionDetails(lifecycleForm.transition_type),
            },
            null,
          ),
        ]
      : []

    const updatedVisits = dataset.visits.map((visit) =>
      ['transfer', 'discharge', 'death_at_home'].includes(lifecycleForm.transition_type) &&
      visit.episode_id === selectedEpisode.id &&
      visit.status === 'scheduled' &&
      visit.scheduled_start >= `${effectiveDate} 00:00:00`
        ? { ...visit, status: 'held_for_qa', documentation_summary: 'Lifecycle transition placed this visit on hold.' }
        : visit,
    )

    const nextQaTask: QaTask = {
      id: dataset.qaTasks.length + 1,
      episode_id: selectedEpisode.id,
      task_type: lifecycleForm.transition_type,
      priority: ['death_at_home', 'transfer'].includes(lifecycleForm.transition_type) ? 'high' : 'medium',
      status: 'open',
      title: demoTransitionTitle(lifecycleForm.transition_type),
      details: lifecycleForm.note || demoTransitionDetails(lifecycleForm.transition_type),
      assigned_role: ['recertify', 'resume_care'].includes(lifecycleForm.transition_type) ? 'Clinical' : 'QA',
      due_at: `${effectiveDate} 09:00:00`,
    }
    const qaTasksWithTransition = [nextQaTask, ...dataset.qaTasks]
    const qaTasksWithOrders = createdOrders.reduce(
      (tasks, order) => syncDemoOrderQaTasks(tasks, order),
      qaTasksWithTransition,
    )

    const updatedClaims = dataset.claims.map((claim) =>
      ['transfer', 'discharge', 'death_at_home'].includes(lifecycleForm.transition_type) && claim.episode_id === selectedEpisode.id
        ? { ...claim, hold_reason: `${labelizeTransition(lifecycleForm.transition_type)} requires billing review before submission.` }
        : claim,
    )

    setDataset((current) =>
      recalculate({
        ...current,
        episodes: updatedEpisodes,
        physicianOrders: [...createdOrders, ...current.physicianOrders],
        visits: [...updatedVisits, ...createdVisits],
        qaTasks: qaTasksWithOrders,
        claims: updatedClaims,
      }),
    )
    setEpisodeModal(null)
    setStatusMessage(`Lifecycle action ${labelizeTransition(lifecycleForm.transition_type)} recorded in demo mode.`)
  }

  async function completeQaTask(taskId: number) {
    if (mode === 'api' && token) {
      await api.resolveQa(token, taskId)
      await hydrateFromApi(token, user!)
      setStatusMessage('QA task resolved.')
      return
    }

    setDataset((current) =>
      recalculate({
        ...current,
        qaTasks: current.qaTasks.map((task) => (task.id === taskId ? { ...task, status: 'resolved' } : task)),
        claims: syncQaDrivenClaimHolds(
          current.claims,
          current.qaTasks.map((task) => (task.id === taskId ? { ...task, status: 'resolved' } : task)),
        ),
      }),
    )
    setStatusMessage('QA task resolved in demo mode.')
  }

  function assignmentDraftForTask(task: QaTask): QaAssignmentDraft {
    return qaAssignmentDrafts[task.id] ?? {
      assigned_role: task.assigned_role ?? '',
      assigned_user_name: task.assigned_user_name ?? '',
      escalation_note: task.escalation_note ?? '',
    }
  }

  function setQaAssignmentDraft(taskId: number, patch: Partial<QaAssignmentDraft>) {
    setQaAssignmentDrafts((current) => {
      const existing = current[taskId] ?? {
        assigned_role: '',
        assigned_user_name: '',
        escalation_note: '',
      }

      return {
        ...current,
        [taskId]: {
          ...existing,
          ...patch,
        },
      }
    })
  }

  async function saveQaTaskAssignment(task: QaTask, assignmentMode: 'save' | 'assign_to_me' | 'clear' = 'save') {
    const draft = assignmentDraftForTask(task)
    const assignedRole =
      assignmentMode === 'assign_to_me'
        ? user?.role ?? task.assigned_role ?? ''
        : assignmentMode === 'clear'
          ? ''
          : draft.assigned_role.trim()
    const assignedUserName =
      assignmentMode === 'assign_to_me'
        ? user?.full_name ?? ''
        : assignmentMode === 'clear'
          ? ''
          : draft.assigned_user_name.trim()

    if (mode === 'api' && token) {
      await api.assignQa(token, task.id, {
        assigned_role: assignedRole,
        assigned_user_name: assignedUserName,
        assign_to_me: assignmentMode === 'assign_to_me',
      })
      await hydrateFromApi(token, user!)
    } else {
      const assignedAt = assignedRole || assignedUserName ? toApiDateTime(currentDateTimeInputValue()) : undefined
      setDataset((current) =>
        recalculate({
          ...current,
          qaTasks: current.qaTasks.map((entry) =>
            entry.id === task.id
              ? {
                  ...entry,
                  assigned_role: assignedRole || undefined,
                  assigned_user_name: assignedUserName || undefined,
                  assigned_at: assignedAt,
                  assignment_history: appendQaTaskHistory(entry.assignment_history, {
                    timestamp: assignedAt ?? toApiDateTime(currentDateTimeInputValue()),
                    action:
                      assignedRole || assignedUserName
                        ? (entry.assigned_role || entry.assigned_user_name ? 'reassigned' : 'assigned')
                        : 'cleared',
                    by: user?.full_name ?? 'System',
                    from: formatTaskAssignee(entry),
                    to: assignedRole || assignedUserName ? formatTaskAssignee({ assigned_role: assignedRole, assigned_user_name: assignedUserName }) : 'Unassigned',
                  }),
                }
              : entry,
          ),
        }),
      )
    }

    setQaAssignmentDrafts((current) => ({
      ...current,
      [task.id]: {
        assigned_role: assignedRole,
        assigned_user_name: assignedUserName,
        escalation_note: draft.escalation_note,
      },
    }))
    setStatusMessage(
      assignmentMode === 'clear'
        ? 'Task assignment cleared.'
        : assignmentMode === 'assign_to_me'
          ? 'Task assigned to you.'
          : 'Task assignment saved.',
    )
  }

  async function escalateQaTask(task: QaTask) {
    const draft = assignmentDraftForTask(task)
    const escalationNote = draft.escalation_note.trim()
    if (!escalationNote) {
      setStatusMessage('Enter an escalation note before escalating this task.')
      return
    }

    if (mode === 'api' && token) {
      await api.escalateQa(token, task.id, {
        escalation_note: escalationNote,
      })
      await hydrateFromApi(token, user!)
    } else {
      const escalatedAt = toApiDateTime(currentDateTimeInputValue())
      setDataset((current) =>
        recalculate({
          ...current,
          qaTasks: current.qaTasks.map((entry) =>
            entry.id === task.id
              ? {
                  ...entry,
                  base_priority: entry.base_priority ?? entry.priority,
                  priority: 'high',
                  escalation_note: escalationNote,
                  last_escalated_at: escalatedAt,
                  assignment_history: appendQaTaskHistory(entry.assignment_history, {
                    timestamp: escalatedAt,
                    action: 'escalated',
                    by: user?.full_name ?? 'System',
                    owner: formatTaskAssignee(entry),
                    note: escalationNote,
                  }),
                }
              : entry,
          ),
        }),
      )
    }

    setQaAssignmentDrafts((current) => ({
      ...current,
      [task.id]: {
        assigned_role: draft.assigned_role,
        assigned_user_name: draft.assigned_user_name,
        escalation_note: escalationNote,
      },
    }))
    setStatusMessage('Escalation note recorded and task urgency refreshed.')
  }

  async function submitClaim(claimId: number) {
    if (mode === 'api' && token) {
      try {
        await api.submitClaim(token, claimId)
        await hydrateFromApi(token, user!)
        setStatusMessage('Claim submitted to the billing adapter.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const hasOpenQa = dataset.qaTasks.some((task) => task.status === 'open')
    const claim = dataset.claims.find((item) => item.id === claimId)
    const billingReadiness = claim ? evaluateDemoBillingReadiness(claim, dataset) : { ready_to_bill: false, primary_blocker: 'Claim not found.', blockers: ['Claim not found.'] }
    const holdReason = hasOpenQa
      ? QA_GENERIC_HOLD
      : billingReadiness.ready_to_bill
        ? undefined
        : billingReadiness.blockers.join(' | ')
    setDataset((current) =>
      recalculate({
        ...current,
        claims: current.claims.map((claim) =>
          claim.id === claimId
            ? {
                ...claim,
                status: hasOpenQa || !billingReadiness.ready_to_bill ? 'draft' : 'submitted',
                hold_reason: holdReason,
                submission_reference: hasOpenQa || !billingReadiness.ready_to_bill ? undefined : `CLM-${claimId.toString().padStart(4, '0')}`,
                submitted_at: hasOpenQa || !billingReadiness.ready_to_bill ? undefined : new Date().toISOString().slice(0, 19).replace('T', ' '),
              }
            : claim,
        ),
      }),
    )
    setStatusMessage(
      hasOpenQa
        ? 'Claim stayed on hold because QA tasks are still open.'
        : billingReadiness.ready_to_bill
          ? 'Claim submitted in demo mode.'
          : billingReadiness.primary_blocker,
    )
  }

  async function runClaimLifecycleAction() {
    const claimId = Number(claimLifecycleForm.claim_id)
    if (!claimId) {
      setStatusMessage('Choose a claim before applying a lifecycle action.')
      return
    }

    const claim = dataset.claims.find((item) => item.id === claimId)
    if (!claim) {
      setStatusMessage('Selected claim could not be found.')
      return
    }

    if (mode === 'api' && token) {
      try {
        if (claimLifecycleForm.action === 'accept') {
          await api.acceptClaim(token, claimId, {
            payer_claim_number: claimLifecycleForm.payer_claim_number.trim(),
          })
          setStatusMessage('Claim marked accepted.')
        } else if (claimLifecycleForm.action === 'reject') {
          await api.rejectClaim(token, claimId, {
            rejection_reason: claimLifecycleForm.rejection_reason.trim(),
          })
          setStatusMessage('Claim marked rejected.')
        } else if (claimLifecycleForm.action === 'corrected') {
          await api.resubmitCorrectedClaim(token, claimId, {
            correction_reason: claimLifecycleForm.correction_reason.trim(),
            amount: claimLifecycleForm.payment_amount.trim() || claim.amount,
          })
          setStatusMessage('Corrected claim draft created.')
        } else if (claimLifecycleForm.action === 'post_payment') {
          await api.postClaimPayment(token, claimId, {
            payment_amount: claimLifecycleForm.payment_amount.trim(),
            remittance_reference: claimLifecycleForm.remittance_reference.trim(),
          })
          setStatusMessage('Claim payment posted.')
        } else {
          await api.voidClaim(token, claimId, {
            void_reason: claimLifecycleForm.void_reason.trim(),
          })
          setStatusMessage('Claim voided.')
        }
        await hydrateFromApi(token, user!)
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    setDataset((current) =>
      recalculate({
        ...current,
        claims: current.claims.map((entry) => {
          if (entry.id !== claimId) {
            return entry
          }

          if (claimLifecycleForm.action === 'accept') {
            return {
              ...entry,
              status: 'accepted',
              accepted_at: now,
              payer_claim_number: claimLifecycleForm.payer_claim_number.trim() || entry.payer_claim_number,
              rejected_at: undefined,
              rejection_reason: undefined,
              voided_at: undefined,
              void_reason: undefined,
            }
          }

          if (claimLifecycleForm.action === 'reject') {
            return {
              ...entry,
              status: 'rejected',
              rejected_at: now,
              rejection_reason: claimLifecycleForm.rejection_reason.trim(),
              accepted_at: undefined,
              paid_at: undefined,
              payment_amount: undefined,
              remittance_reference: undefined,
            }
          }

          if (claimLifecycleForm.action === 'corrected') {
            return entry
          }

          if (claimLifecycleForm.action === 'post_payment') {
            return {
              ...entry,
              status: 'paid',
              paid_at: now,
              accepted_at: entry.accepted_at ?? now,
              payment_amount: claimLifecycleForm.payment_amount.trim(),
              remittance_reference: claimLifecycleForm.remittance_reference.trim() || undefined,
              rejected_at: undefined,
              rejection_reason: undefined,
              voided_at: undefined,
              void_reason: undefined,
            }
          }

          return {
            ...entry,
            status: 'voided',
            voided_at: now,
            void_reason: claimLifecycleForm.void_reason.trim(),
          }
        }).concat(
          claimLifecycleForm.action === 'corrected'
            ? [
                {
                  ...claim,
                  id: current.claims.reduce((max, entry) => Math.max(max, entry.id), 0) + 1,
                  status: 'draft',
                  hold_reason: undefined,
                  submission_reference: undefined,
                  submitted_at: undefined,
                  payer_claim_number: undefined,
                  accepted_at: undefined,
                  rejected_at: undefined,
                  rejection_reason: undefined,
                  payment_amount: undefined,
                  remittance_reference: undefined,
                  paid_at: undefined,
                  voided_at: undefined,
                  void_reason: undefined,
                  corrected_from_claim_id: claimId,
                  correction_reason: claimLifecycleForm.correction_reason.trim(),
                },
              ]
            : [],
        ),
      }),
    )

    setStatusMessage(
      claimLifecycleForm.action === 'accept'
        ? 'Claim marked accepted in demo mode.'
        : claimLifecycleForm.action === 'reject'
          ? 'Claim marked rejected in demo mode.'
          : claimLifecycleForm.action === 'corrected'
            ? 'Corrected claim draft created in demo mode.'
          : claimLifecycleForm.action === 'post_payment'
            ? 'Claim payment posted in demo mode.'
            : 'Claim voided in demo mode.',
    )
  }

  async function submitEvv(recordId: number) {
    if (mode === 'api' && token) {
      await api.submitEvv(token, recordId)
      await hydrateFromApi(token, user!)
      setStatusMessage('EVV record submitted.')
      return
    }

    setDataset((current) =>
      recalculate({
        ...current,
        evvRecords: current.evvRecords.map((record) =>
          record.id === recordId
            ? {
                ...record,
                status: 'submitted',
                submitted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
                submission_reference: `EVV-${recordId.toString().padStart(4, '0')}`,
              }
            : record,
        ),
      }),
    )
    setStatusMessage('EVV record submitted in demo mode.')
  }

  async function runEvvLifecycleAction() {
    const recordId = Number(evvLifecycleForm.record_id)
    if (!recordId) {
      setStatusMessage('Choose an EVV record before applying a lifecycle action.')
      return
    }

    if (mode === 'api' && token) {
      try {
        if (evvLifecycleForm.action === 'exception') {
          await api.markEvvException(token, recordId, {
            exception_reason: evvLifecycleForm.exception_reason.trim(),
          })
          setStatusMessage('EVV record marked with an exception.')
        } else {
          await api.reconcileEvv(token, recordId)
          setStatusMessage('EVV record reconciled.')
        }
        await hydrateFromApi(token, user!)
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    setDataset((current) =>
      recalculate({
        ...current,
        evvRecords: current.evvRecords.map((record) =>
          record.id === recordId
            ? evvLifecycleForm.action === 'exception'
              ? {
                  ...record,
                  status: 'exception',
                  exception_reason: evvLifecycleForm.exception_reason.trim(),
                  reconciled_at: undefined,
                }
              : {
                  ...record,
                  status: 'reconciled',
                  reconciled_at: now,
                  exception_reason: undefined,
                }
            : record,
        ),
      }),
    )
    setStatusMessage(evvLifecycleForm.action === 'exception' ? 'EVV exception recorded in demo mode.' : 'EVV record reconciled in demo mode.')
  }

  async function prepareOasisSubmissionForSelectedEpisode() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before preparing an OASIS submission package.')
      return
    }

    if (mode === 'api' && token) {
      try {
        const response = await api.prepareOasisSubmission(token, selectedEpisode.id)
        if (response.data) {
          loadOasisSubmissionIntoForm(response.data)
        }
        await hydrateFromApi(token, user!)
        setStatusMessage('OASIS submission package prepared.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const nextId = dataset.oasisSubmissions.reduce((max, item) => Math.max(max, item.id), 0) + 1
    const submission: OasisSubmission = {
      id: nextId,
      episode_id: selectedEpisode.id,
      assessment_id: latestAssessmentForEpisode(selectedEpisode.id)?.id,
      submission_status: episodeInsights?.documentation_integrity.blockers.length ? 'draft' : 'ready',
      iqies_ready: (episodeInsights?.documentation_integrity.blockers.length ?? 0) === 0,
      submission_reference: `IQIES-DEMO-${String(nextId).padStart(3, '0')}`,
      readiness_notes: episodeInsights?.documentation_integrity.blockers.join(' | ') || 'Submission package is ready for demo export.',
    }
    setDataset((current) => recalculate({ ...current, oasisSubmissions: [submission, ...current.oasisSubmissions] }))
    loadOasisSubmissionIntoForm(submission)
    setStatusMessage('OASIS submission package prepared in demo mode.')
  }

  async function runOasisSubmissionAction() {
    const submissionId = Number(oasisSubmissionForm.submission_id)
    if (!submissionId) {
      setStatusMessage('Choose an OASIS submission package before applying a status update.')
      return
    }

    const payload = {
      submission_status: oasisSubmissionForm.submission_status,
      acknowledgment_note: oasisSubmissionForm.acknowledgment_note.trim(),
      rejection_note: oasisSubmissionForm.rejection_note.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.updateOasisSubmission(token, submissionId, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('OASIS submission updated.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    setDataset((current) =>
      recalculate({
        ...current,
        oasisSubmissions: current.oasisSubmissions.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                submission_status: payload.submission_status,
                acknowledged_at: ['accepted', 'rejected'].includes(payload.submission_status) ? now : item.acknowledged_at,
                submitted_at: payload.submission_status === 'submitted' ? now : item.submitted_at,
                acknowledgment_status: payload.submission_status === 'accepted' ? 'accepted' : payload.submission_status === 'rejected' ? 'rejected' : item.acknowledgment_status,
                acknowledgment_note: payload.acknowledgment_note || item.acknowledgment_note,
                rejection_note: payload.rejection_note || item.rejection_note,
              }
            : item,
        ),
      }),
    )
    setStatusMessage('OASIS submission updated in demo mode.')
  }

  async function generatePlanOfCareForSelectedEpisode() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before generating a plan of care.')
      return
    }

    if (mode === 'api' && token) {
      try {
        const response = await api.generatePlanOfCare(token, selectedEpisode.id)
        if (response.data) {
          loadPlanOfCareIntoForm(response.data)
        }
        await hydrateFromApi(token, user!)
        setStatusMessage('Plan of care generated.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const assessment = latestAssessmentForEpisode(selectedEpisode.id)
    const nextId = dataset.planOfCares.reduce((max, item) => Math.max(max, item.id), 0) + 1
    const plan: PlanOfCare = {
      id: nextId,
      episode_id: selectedEpisode.id,
      assessment_id: assessment?.id,
      physician_order_id: selectedEpisodeOrders[0]?.id,
      version_number: dataset.planOfCares.filter((item) => item.episode_id === selectedEpisode.id).length + 1,
      review_status: 'draft',
      effective_date: selectedEpisode.cert_start_date,
      plan_summary: `485-ready plan of care for ${selectedEpisode.primary_diagnosis}.`,
      goal_summary: assessment?.care_plan_goals ?? '',
      intervention_summary: assessment?.clinical_summary ?? '',
      printable_content: `ETHIZO HOME HEALTH CARE DEMO - PLAN OF CARE (485 READY)\nEpisode ${selectedEpisode.id}`,
      physician_review_note: '',
    }
    setDataset((current) => recalculate({ ...current, planOfCares: [plan, ...current.planOfCares] }))
    loadPlanOfCareIntoForm(plan)
    setStatusMessage('Plan of care generated in demo mode.')
  }

  async function savePlanOfCare() {
    const planId = Number(planOfCareForm.plan_id)
    if (!planId) {
      setStatusMessage('Generate or choose a plan of care before saving changes.')
      return
    }

    const payload = {
      review_status: planOfCareForm.review_status,
      plan_summary: planOfCareForm.plan_summary.trim(),
      goal_summary: planOfCareForm.goal_summary.trim(),
      intervention_summary: planOfCareForm.intervention_summary.trim(),
      printable_content: planOfCareForm.printable_content.trim(),
      physician_review_note: planOfCareForm.physician_review_note.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.updatePlanOfCare(token, planId, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Plan of care updated.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    setDataset((current) =>
      recalculate({
        ...current,
        planOfCares: current.planOfCares.map((item) => (item.id === planId ? { ...item, ...payload } : item)),
      }),
    )
    setStatusMessage('Plan of care updated in demo mode.')
  }

  async function syncCoderReviewForSelectedEpisode() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before syncing coder review.')
      return
    }

    if (mode === 'api' && token) {
      try {
        const response = await api.syncCoderReview(token, selectedEpisode.id)
        const firstItem = response.data?.[0]
        if (firstItem) {
          loadCoderReviewIntoForm(firstItem)
        }
        await hydrateFromApi(token, user!)
        setStatusMessage('Coder review queue refreshed.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const nextId = dataset.coderReviewItems.reduce((max, item) => Math.max(max, item.id), 0) + 1
    const item: CoderReviewItem = {
      id: nextId,
      episode_id: selectedEpisode.id,
      claim_id: dataset.claims.find((entry) => entry.episode_id === selectedEpisode.id)?.id,
      assessment_id: latestAssessmentForEpisode(selectedEpisode.id)?.id,
      category: episodeInsights?.utilization_risk.risk_level === 'high' ? 'utilization' : 'documentation',
      status: 'open',
      priority: episodeInsights?.utilization_risk.risk_level === 'high' ? 'high' : 'medium',
      title: episodeInsights?.utilization_risk.risk_level === 'high' ? 'LUPA protection review needed' : 'Documentation review needed',
      details:
        episodeInsights?.utilization_risk.risk_level === 'high'
          ? episodeInsights.utilization_risk.warning_note ?? ''
          : episodeReviewSummary?.billing_blockers[0] ?? 'Review billing blockers and reconcile coding guidance.',
      recommendation:
        episodeInsights?.utilization_risk.risk_level === 'high'
          ? episodeInsights.utilization_risk.recommended_action ?? ''
          : 'Resolve documentation and coding blockers before corrected-claim preparation.',
    }
    setDataset((current) => recalculate({ ...current, coderReviewItems: [item, ...current.coderReviewItems] }))
    loadCoderReviewIntoForm(item)
    setStatusMessage('Coder review queue refreshed in demo mode.')
  }

  async function saveCoderReviewItem() {
    const itemId = Number(coderReviewForm.item_id)
    if (!itemId) {
      setStatusMessage('Choose a coder review item before saving.')
      return
    }

    const payload = {
      status: coderReviewForm.status,
      correction_note: coderReviewForm.correction_note.trim(),
      recommendation: coderReviewForm.recommendation.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.updateCoderReview(token, itemId, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Coder review item updated.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    setDataset((current) =>
      recalculate({
        ...current,
        coderReviewItems: current.coderReviewItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                ...payload,
                resolved_at: payload.status === 'resolved' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : item.resolved_at,
              }
            : item,
        ),
      }),
    )
    setStatusMessage('Coder review item updated in demo mode.')
  }

  async function saveCommunicationLogEntry() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before logging communication.')
      return
    }

    const payload = {
      contact_name: communicationLogForm.contact_name.trim(),
      contact_role: communicationLogForm.contact_role.trim(),
      method: communicationLogForm.method.trim(),
      topic: communicationLogForm.topic.trim(),
      outcome: communicationLogForm.outcome.trim(),
      follow_up_owner: communicationLogForm.follow_up_owner.trim(),
      follow_up_due_at: toApiDateTime(communicationLogForm.follow_up_due_at),
    }

    if (mode === 'api' && token) {
      try {
        await api.addCommunicationLog(token, selectedEpisode.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Communication entry logged.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const nextId = dataset.communicationLogEntries.reduce((max, item) => Math.max(max, item.id), 0) + 1
    const entry: CommunicationLogEntry = {
      id: nextId,
      episode_id: selectedEpisode.id,
      entry_type: 'coordination',
      contact_name: payload.contact_name,
      contact_role: payload.contact_role,
      method: payload.method,
      topic: payload.topic,
      outcome: payload.outcome,
      follow_up_owner: payload.follow_up_owner,
      follow_up_due_at: payload.follow_up_due_at,
      status: payload.follow_up_due_at ? 'follow_up_due' : 'logged',
      created: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    setDataset((current) => recalculate({ ...current, communicationLogEntries: [entry, ...current.communicationLogEntries] }))
    setStatusMessage('Communication entry logged in demo mode.')
  }

  async function saveFaxMessage() {
    const payload = {
      source_name: faxMessageForm.source_name.trim(),
      from_number: faxMessageForm.from_number.trim(),
      subject: faxMessageForm.subject.trim(),
      packet_type: faxMessageForm.packet_type,
      received_at: toApiDateTime(faxMessageForm.received_at),
      attachment_note: faxMessageForm.attachment_note.trim(),
      linked_document_count: Number(faxMessageForm.linked_document_count || '0'),
    }

    if (mode === 'api' && token) {
      try {
        await api.addFaxMessage(token, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Fax packet added to the inbox.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const nextId = dataset.faxMessages.reduce((max, item) => Math.max(max, item.id), 0) + 1
    const message: FaxMessage = {
      id: nextId,
      referral_id: undefined,
      source_name: payload.source_name,
      from_number: payload.from_number,
      subject: payload.subject,
      packet_type: payload.packet_type,
      routing_status: 'new',
      received_at: payload.received_at,
      attachment_note: payload.attachment_note,
      linked_document_count: payload.linked_document_count,
    }
    setDataset((current) => recalculate({ ...current, faxMessages: [message, ...current.faxMessages] }))
    setFaxRoutingForm((current) => ({ ...current, fax_id: String(message.id), primary_diagnosis: current.primary_diagnosis || selectedEpisode?.primary_diagnosis || '' }))
    setStatusMessage('Fax packet added in demo mode.')
  }

  async function routeFaxMessageAction() {
    const faxId = Number(faxRoutingForm.fax_id)
    if (!faxId) {
      setStatusMessage('Choose a fax packet before routing it.')
      return
    }

    const payload = {
      routing_status: faxRoutingForm.routing_status,
      route_note: faxRoutingForm.route_note.trim(),
      create_referral: faxRoutingForm.create_referral === 'yes',
      patient_id: Number(faxRoutingForm.patient_id),
      admission_source: faxRoutingForm.admission_source,
      payer_type: faxRoutingForm.payer_type,
      primary_diagnosis: faxRoutingForm.primary_diagnosis.trim(),
      planned_soc_date: faxRoutingForm.planned_soc_date,
      requested_disciplines: csvToArray(faxRoutingForm.requested_disciplines),
    }

    if (mode === 'api' && token) {
      try {
        await api.routeFaxMessage(token, faxId, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Fax packet routed.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const currentPatient = dataset.patients.find((patient) => patient.id === Number(faxRoutingForm.patient_id))
    const maybeNewReferral =
      payload.create_referral && currentPatient
        ? {
            id: dataset.referrals.reduce((max, item) => Math.max(max, item.id), 0) + 1,
            patient_id: currentPatient.id,
            patient_name: nameForPatient(currentPatient),
            source_name: dataset.faxMessages.find((item) => item.id === faxId)?.source_name ?? 'Fax inbox',
            admission_source: payload.admission_source,
            payer_type: payload.payer_type,
            primary_diagnosis: payload.primary_diagnosis || 'R69 Unspecified illness',
            requested_disciplines: payload.requested_disciplines,
            order_status: 'pending',
            planned_soc_date: payload.planned_soc_date,
            intake_ready: false,
            status: 'received',
          }
        : null

    setDataset((current) =>
      recalculate({
        ...current,
        faxMessages: current.faxMessages.map((item) =>
          item.id === faxId
            ? {
                ...item,
                referral_id: maybeNewReferral?.id ?? item.referral_id,
                routing_status: payload.create_referral ? 'converted_to_referral' : payload.routing_status,
                route_note: payload.route_note,
              }
            : item,
        ),
        referrals: maybeNewReferral ? [maybeNewReferral as Referral, ...current.referrals] : current.referrals,
      }),
    )
    setStatusMessage(payload.create_referral ? 'Fax packet converted into a referral in demo mode.' : 'Fax packet routed in demo mode.')
  }

  async function saveQapiProject() {
    const payload = {
      title: qapiForm.title.trim(),
      measure_name: qapiForm.measure_name.trim(),
      owner_name: qapiForm.owner_name.trim(),
      review_cadence: qapiForm.review_cadence,
      status: qapiForm.status,
      target_value: qapiForm.target_value.trim(),
      current_value: qapiForm.current_value.trim(),
      intervention_plan: qapiForm.intervention_plan.trim(),
      evidence_summary: qapiForm.evidence_summary.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.addQapiProject(token, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('QAPI project saved.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const nextId = dataset.qapiProjects.reduce((max, item) => Math.max(max, item.id), 0) + 1
    const project: QapiProject = {
      id: nextId,
      ...payload,
      linked_task_ids: [],
      linked_audit_event_ids: [],
      last_reviewed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    setDataset((current) => recalculate({ ...current, qapiProjects: [project, ...current.qapiProjects] }))
    setStatusMessage('QAPI project saved in demo mode.')
  }

  async function saveComplianceDocument() {
    if (!selectedPatient) {
      setStatusMessage('Choose a patient before adding a compliance document.')
      return
    }

    const payload = {
      episode_id: selectedEpisode?.id,
      document_type: complianceDocumentForm.document_type,
      status: complianceDocumentForm.status,
      delivery_method: complianceDocumentForm.delivery_method,
      signed_at: complianceDocumentForm.signed_at ? toApiDateTime(complianceDocumentForm.signed_at) : '',
      notes: complianceDocumentForm.notes.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.addPatientComplianceDocument(token, selectedPatient.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Compliance document added.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const document: PatientComplianceDocument = {
      id: dataset.patientComplianceDocuments.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      patient_id: selectedPatient.id,
      episode_id: payload.episode_id,
      document_type: payload.document_type,
      status: payload.status,
      delivery_method: payload.delivery_method,
      signed_at: payload.signed_at,
      notes: payload.notes,
    }
    setDataset((current) => recalculate({ ...current, patientComplianceDocuments: [document, ...current.patientComplianceDocuments] }))
    setStatusMessage('Compliance document added in demo mode.')
  }

  async function savePatientNotice() {
    if (!selectedPatient) {
      setStatusMessage('Choose a patient before adding a notice.')
      return
    }

    const payload = {
      episode_id: selectedEpisode?.id,
      notice_type: patientNoticeForm.notice_type,
      status: patientNoticeForm.status,
      reason: patientNoticeForm.reason.trim(),
      billing_impact: patientNoticeForm.billing_impact.trim(),
      delivered_at: patientNoticeForm.delivered_at ? toApiDateTime(patientNoticeForm.delivered_at) : '',
      signed_at: patientNoticeForm.signed_at ? toApiDateTime(patientNoticeForm.signed_at) : '',
    }

    if (mode === 'api' && token) {
      try {
        await api.addPatientNotice(token, selectedPatient.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Patient notice added.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const notice: PatientNotice = {
      id: dataset.patientNotices.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      patient_id: selectedPatient.id,
      episode_id: payload.episode_id,
      notice_type: payload.notice_type,
      status: payload.status,
      reason: payload.reason,
      billing_impact: payload.billing_impact,
      delivered_at: payload.delivered_at,
      signed_at: payload.signed_at,
    }
    setDataset((current) => recalculate({ ...current, patientNotices: [notice, ...current.patientNotices] }))
    setStatusMessage('Patient notice added in demo mode.')
  }

  async function saveMedication() {
    if (!selectedPatient) {
      setStatusMessage('Choose a patient before adding medication.')
      return
    }

    const payload = {
      episode_id: selectedEpisode?.id,
      medication_name: medicationForm.medication_name.trim(),
      dosage: medicationForm.dosage.trim(),
      route: medicationForm.route.trim(),
      frequency: medicationForm.frequency.trim(),
      status: medicationForm.status,
      high_risk: medicationForm.high_risk === 'yes',
      teaching_completed: medicationForm.teaching_completed === 'yes',
      reconciled_at: medicationForm.reconciled_at ? toApiDateTime(medicationForm.reconciled_at) : '',
      prescriber_name: medicationForm.prescriber_name.trim(),
      change_reason: medicationForm.change_reason.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.addPatientMedication(token, selectedPatient.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Medication profile updated.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const medication: PatientMedication = {
      id: dataset.patientMedications.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      patient_id: selectedPatient.id,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, patientMedications: [medication, ...current.patientMedications] }))
    setStatusMessage('Medication profile updated in demo mode.')
  }

  async function saveAllergy() {
    if (!selectedPatient) {
      setStatusMessage('Choose a patient before adding an allergy.')
      return
    }

    const payload = {
      allergen: allergyForm.allergen.trim(),
      reaction: allergyForm.reaction.trim(),
      severity: allergyForm.severity,
      verified_at: allergyForm.verified_at ? toApiDateTime(allergyForm.verified_at) : '',
    }

    if (mode === 'api' && token) {
      try {
        await api.addPatientAllergy(token, selectedPatient.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Allergy added.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const allergy: PatientAllergy = {
      id: dataset.patientAllergies.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      patient_id: selectedPatient.id,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, patientAllergies: [allergy, ...current.patientAllergies] }))
    setStatusMessage('Allergy added in demo mode.')
  }

  async function saveVerbalOrder() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before adding a verbal order.')
      return
    }

    const payload = {
      physician_name: verbalOrderForm.physician_name.trim(),
      order_source: verbalOrderForm.order_source.trim(),
      order_summary: verbalOrderForm.order_summary.trim(),
      ordered_service: verbalOrderForm.ordered_service.trim(),
      received_by: verbalOrderForm.received_by.trim(),
      read_back_completed: verbalOrderForm.read_back_completed === 'yes',
      received_at: verbalOrderForm.received_at ? toApiDateTime(verbalOrderForm.received_at) : '',
      status: verbalOrderForm.status,
    }

    if (mode === 'api' && token) {
      try {
        await api.addEpisodeVerbalOrder(token, selectedEpisode.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Verbal order added.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const order: VerbalOrder = {
      id: dataset.verbalOrders.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      episode_id: selectedEpisode.id,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, verbalOrders: [order, ...current.verbalOrders] }))
    setStatusMessage('Verbal order added in demo mode.')
  }

  async function saveAideSupervision() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before adding aide supervision.')
      return
    }

    const payload = {
      aide_name: aideSupervisionForm.aide_name.trim(),
      supervising_clinician: aideSupervisionForm.supervising_clinician.trim(),
      supervision_type: aideSupervisionForm.supervision_type,
      supervised_at: aideSupervisionForm.supervised_at ? toApiDateTime(aideSupervisionForm.supervised_at) : '',
      next_due_at: aideSupervisionForm.next_due_at ? toApiDateTime(aideSupervisionForm.next_due_at) : '',
      status: aideSupervisionForm.status,
      care_plan_tasks: aideSupervisionForm.care_plan_tasks.trim(),
      findings: aideSupervisionForm.findings.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.addEpisodeAideSupervision(token, selectedEpisode.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Aide supervision recorded.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const event: AideSupervisionEvent = {
      id: dataset.aideSupervisionEvents.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      episode_id: selectedEpisode.id,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, aideSupervisionEvents: [event, ...current.aideSupervisionEvents] }))
    setStatusMessage('Aide supervision recorded in demo mode.')
  }

  async function saveIncident() {
    if (!selectedEpisode || !selectedPatient) {
      setStatusMessage('Choose an episode before adding an incident.')
      return
    }

    const payload = {
      patient_id: selectedPatient.id,
      event_type: incidentForm.event_type,
      severity: incidentForm.severity,
      occurred_at: incidentForm.occurred_at ? toApiDateTime(incidentForm.occurred_at) : '',
      description: incidentForm.description.trim(),
      follow_up_owner: incidentForm.follow_up_owner.trim(),
      follow_up_due_at: incidentForm.follow_up_due_at ? toApiDateTime(incidentForm.follow_up_due_at) : '',
      qapi_linked: incidentForm.qapi_linked === 'yes',
      status: incidentForm.status,
    }

    if (mode === 'api' && token) {
      try {
        await api.addEpisodeIncident(token, selectedEpisode.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Incident recorded.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const incident: IncidentReport = {
      id: dataset.incidentReports.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      episode_id: selectedEpisode.id,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, incidentReports: [incident, ...current.incidentReports] }))
    setStatusMessage('Incident recorded in demo mode.')
  }

  async function saveInfectionLog() {
    if (!selectedEpisode || !selectedPatient) {
      setStatusMessage('Choose an episode before adding an infection log.')
      return
    }

    const payload = {
      patient_id: selectedPatient.id,
      infection_type: infectionForm.infection_type,
      identified_at: infectionForm.identified_at ? toApiDateTime(infectionForm.identified_at) : '',
      source: infectionForm.source.trim(),
      intervention_summary: infectionForm.intervention_summary.trim(),
      physician_notified: infectionForm.physician_notified === 'yes',
      qapi_linked: infectionForm.qapi_linked === 'yes',
      status: infectionForm.status,
    }

    if (mode === 'api' && token) {
      try {
        await api.addEpisodeInfection(token, selectedEpisode.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Infection log recorded.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const infection: InfectionLog = {
      id: dataset.infectionLogs.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      episode_id: selectedEpisode.id,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, infectionLogs: [infection, ...current.infectionLogs] }))
    setStatusMessage('Infection log recorded in demo mode.')
  }

  async function saveAuthorization() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before adding authorization.')
      return
    }

    const payload = {
      payer_type: authorizationForm.payer_type,
      authorization_number: authorizationForm.authorization_number.trim(),
      authorized_visits: Number(authorizationForm.authorized_visits || '0'),
      used_visits: Number(authorizationForm.used_visits || '0'),
      effective_date: authorizationForm.effective_date,
      expiration_date: authorizationForm.expiration_date,
      status: authorizationForm.status,
      verification_notes: authorizationForm.verification_notes.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.addEpisodeAuthorization(token, selectedEpisode.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Authorization saved.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const authorization: PayerAuthorization = {
      id: dataset.payerAuthorizations.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      episode_id: selectedEpisode.id,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, payerAuthorizations: [authorization, ...current.payerAuthorizations] }))
    setStatusMessage('Authorization saved in demo mode.')
  }

  async function saveEligibilityCheck() {
    if (!selectedEpisode || !selectedPatient) {
      setStatusMessage('Choose an episode before adding eligibility.')
      return
    }

    const payload = {
      patient_id: selectedPatient.id,
      payer_type: eligibilityForm.payer_type,
      check_status: eligibilityForm.check_status,
      checked_at: eligibilityForm.checked_at ? toApiDateTime(eligibilityForm.checked_at) : '',
      coverage_summary: eligibilityForm.coverage_summary.trim(),
      response_reference: eligibilityForm.response_reference.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.addEpisodeEligibilityCheck(token, selectedEpisode.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Eligibility check saved.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const check = {
      id: dataset.eligibilityChecks.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      episode_id: selectedEpisode.id,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, eligibilityChecks: [check, ...current.eligibilityChecks] }))
    setStatusMessage('Eligibility check saved in demo mode.')
  }

  async function saveDmeSupplyOrder() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before adding DME or supplies.')
      return
    }

    const payload = {
      item_name: dmeSupplyForm.item_name.trim(),
      order_type: dmeSupplyForm.order_type,
      status: dmeSupplyForm.status,
      ordered_at: dmeSupplyForm.ordered_at ? toApiDateTime(dmeSupplyForm.ordered_at) : '',
      delivered_at: dmeSupplyForm.delivered_at ? toApiDateTime(dmeSupplyForm.delivered_at) : '',
      usage_documented: dmeSupplyForm.usage_documented === 'yes',
      plan_of_care_linked: dmeSupplyForm.plan_of_care_linked === 'yes',
      billing_relevance: dmeSupplyForm.billing_relevance.trim(),
    }

    if (mode === 'api' && token) {
      try {
        await api.addEpisodeDmeSupplyOrder(token, selectedEpisode.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('DME/supply order saved.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const order: DmeSupplyOrder = {
      id: dataset.dmeSupplyOrders.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      episode_id: selectedEpisode.id,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, dmeSupplyOrders: [order, ...current.dmeSupplyOrders] }))
    setStatusMessage('DME/supply order saved in demo mode.')
  }

  async function saveCaseConference() {
    if (!selectedEpisode) {
      setStatusMessage('Choose an episode before adding a case conference.')
      return
    }

    const payload = {
      conference_date: caseConferenceForm.conference_date ? toApiDateTime(caseConferenceForm.conference_date) : '',
      participants: caseConferenceForm.participants.trim(),
      decisions: caseConferenceForm.decisions.trim(),
      follow_up_owner: caseConferenceForm.follow_up_owner.trim(),
      follow_up_due_at: caseConferenceForm.follow_up_due_at ? toApiDateTime(caseConferenceForm.follow_up_due_at) : '',
      cadence: caseConferenceForm.cadence,
      status: caseConferenceForm.status,
    }

    if (mode === 'api' && token) {
      try {
        await api.addEpisodeCaseConference(token, selectedEpisode.id, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Case conference saved.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const conference: CaseConference = {
      id: dataset.caseConferences.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      episode_id: selectedEpisode.id,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, caseConferences: [conference, ...current.caseConferences] }))
    setStatusMessage('Case conference saved in demo mode.')
  }

  async function saveClaimTransaction() {
    const claimId = Number(claimTransactionForm.claim_id || dataset.claims[0]?.id || 0)
    const claim = dataset.claims.find((item) => item.id === claimId)
    const payload = {
      claim_id: claimId || undefined,
      episode_id: claim?.episode_id ?? selectedEpisode?.id,
      transaction_type: claimTransactionForm.transaction_type,
      transaction_status: claimTransactionForm.transaction_status,
      payer_control_number: claimTransactionForm.payer_control_number.trim(),
      payload_summary: claimTransactionForm.payload_summary.trim(),
      response_summary: claimTransactionForm.response_summary.trim(),
      transmitted_at: claimTransactionForm.transmitted_at ? toApiDateTime(claimTransactionForm.transmitted_at) : '',
    }

    if (mode === 'api' && token) {
      try {
        await api.addClaimTransaction(token, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Claim transaction saved.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const transaction: ClaimTransaction = {
      id: dataset.claimTransactions.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, claimTransactions: [transaction, ...current.claimTransactions] }))
    setStatusMessage('Claim transaction saved in demo mode.')
  }

  async function saveRemittancePosting() {
    const claimId = Number(remittanceForm.claim_id || dataset.claims[0]?.id || 0)
    const claim = dataset.claims.find((item) => item.id === claimId)
    const payload = {
      claim_id: claimId || undefined,
      episode_id: claim?.episode_id ?? selectedEpisode?.id,
      era_reference: remittanceForm.era_reference.trim(),
      payment_amount: Number(remittanceForm.payment_amount || '0'),
      adjustment_amount: Number(remittanceForm.adjustment_amount || '0'),
      reason_codes: remittanceForm.reason_codes.trim(),
      posted_at: remittanceForm.posted_at ? toApiDateTime(remittanceForm.posted_at) : '',
      reconciliation_status: remittanceForm.reconciliation_status,
    }

    if (mode === 'api' && token) {
      try {
        await api.addRemittancePosting(token, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage('Remittance posting saved.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const posting: RemittancePosting = {
      id: dataset.remittancePostings.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      ...payload,
    }
    setDataset((current) => recalculate({ ...current, remittancePostings: [posting, ...current.remittancePostings] }))
    setStatusMessage('Remittance posting saved in demo mode.')
  }

  async function captureSurveyReadinessAction() {
    if (mode === 'api' && token) {
      try {
        await api.captureSurveyReadiness(token, 'current')
        await hydrateFromApi(token, user!)
        setStatusMessage('Survey-readiness snapshot captured.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    const snapshot = {
      id: dataset.surveyReadinessSummary.history.length + 1,
      period_key: dataset.surveyReadinessSummary.period_key,
      category_scores: dataset.surveyReadinessSummary.category_scores,
      open_counts: dataset.surveyReadinessSummary.open_counts,
      generated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    const summary: SurveyReadinessSummary = {
      ...dataset.surveyReadinessSummary,
      generated_at: snapshot.generated_at,
      history: [...dataset.surveyReadinessSummary.history, snapshot],
    }
    setDataset((current) => recalculate({ ...current, surveyReadinessSummary: summary }))
    setStatusMessage('Survey-readiness snapshot captured in demo mode.')
  }

  async function captureQualityMetricsAction() {
    if (mode === 'api' && token) {
      try {
        await api.captureQualityMetrics(token, adminReportPeriod === 'last_7' ? 'last_7' : adminReportPeriod === 'last_30' ? 'last_30' : 'all')
        await hydrateFromApi(token, user!)
        setStatusMessage('Quality metrics captured.')
      } catch (error) {
        setStatusMessage((error as Error).message)
      }
      return
    }

    setDataset((current) =>
      recalculate({
        ...current,
        qualityMetricsSummary: {
          ...current.qualityMetricsSummary,
          history: [
            ...current.qualityMetricsSummary.history,
            ...current.qualityMetricsSummary.metrics.map((metric, index) => ({
              id: current.qualityMetricsSummary.history.length + index + 1,
              metric_key: metric.key,
              metric_label: metric.label,
              period_key: current.qualityMetricsSummary.period_key,
              score: metric.score,
              numerator: metric.numerator,
              denominator: metric.denominator,
              trend_value: metric.trend_value,
              notes: metric.note,
              captured_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
            })),
          ],
        },
      }),
    )
    setStatusMessage('Quality metrics captured in demo mode.')
  }

  function runBillingFollowUpAction(item: BillingFollowUpItem) {
    const action = item.nextAction

    switch (action.kind) {
      case 'create_corrected_claim': {
        const claim = dataset.claims.find((entry) => entry.id === action.claimId)
        if (claim) {
          prepareClaimLifecycleAction(claim, 'corrected')
          setActiveModule('Billing')
          setStatusMessage(`Prepared corrected-claim workflow for ${item.patientName}.`)
        }
        return
      }
      case 'submit_corrected_claim':
        void submitClaim(action.claimId)
        return
      case 'submit_evv':
        void submitEvv(action.recordId)
        return
      case 'reconcile_evv': {
        const record = dataset.evvRecords.find((entry) => entry.id === action.recordId)
        if (record) {
          prepareEvvLifecycleAction(record, 'reconcile')
          setActiveModule('Billing')
          setStatusMessage(`Prepared EVV reconciliation for record ${record.id}.`)
        }
        return
      }
      case 'update_evv_exception': {
        const record = dataset.evvRecords.find((entry) => entry.id === action.recordId)
        if (record) {
          prepareEvvLifecycleAction(record, 'exception')
          setActiveModule('Billing')
          setStatusMessage(`Prepared EVV exception follow-up for record ${record.id}.`)
        }
        return
      }
      case 'resolve_episode':
        resolveNextEpisodeBlocker(buildDemoEpisodeReviewSummary(item.episode, dataset), item.episode)
        return
    }
  }

  async function visitAction(visit: Visit, action: 'check-in' | 'check-out') {
    const position = await resolveLocation()
    const payload = {
      event_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy_meters: position.accuracy,
      documentation_summary:
        action === 'check-out'
          ? 'Completed visit note, interventions, and patient response.'
          : undefined,
      device_metadata: { platform: navigator.platform, online: navigator.onLine },
      source: 'mobile_web',
    }

    const updateLocalVisit = (syncStatus: string) => {
      setDataset((current) =>
        recalculate({
          ...current,
          visits: current.visits.map((item) =>
            item.id === visit.id
              ? {
                  ...item,
                  actual_start: action === 'check-in' ? payload.event_time : item.actual_start,
                  actual_end: action === 'check-out' ? payload.event_time : item.actual_end,
                  documentation_summary:
                    action === 'check-out' ? String(payload.documentation_summary ?? item.documentation_summary ?? '') : item.documentation_summary,
                  status: action === 'check-in' ? 'in_progress' : 'completed',
                  documentation_status: action === 'check-in' ? 'in_progress' : 'completed',
                  sync_status: syncStatus,
                }
              : item,
          ),
          evvRecords:
            action === 'check-out' && visit.requires_evv
              ? [
                  ...current.evvRecords,
                  {
                    id: current.evvRecords.length + 1,
                    visit_id: visit.id,
                    state_code: 'GA',
                    vendor_name: 'Georgia EVV Sandbox',
                    status: syncStatus === 'queued' ? 'pending_submission' : 'submitted',
                    submitted_at: syncStatus === 'queued' ? undefined : payload.event_time,
                  },
                ]
              : current.evvRecords,
        }),
      )
    }

    if (mode === 'api' && token && navigator.onLine) {
      try {
        await api.visitAction(token, visit.id, action, payload)
        await hydrateFromApi(token, user!)
        setStatusMessage(`Visit ${action} synced to the API.`)
        return
      } catch {
        const queued = addOfflineAction({
          id: crypto.randomUUID(),
          action,
          visitId: visit.id,
          payload,
          createdAt: new Date().toISOString(),
        })
        setOfflineQueue(queued)
        updateLocalVisit('queued')
        setStatusMessage(`Connection failed. Visit ${action} saved offline for sync.`)
        return
      }
    }

    const queued = addOfflineAction({
      id: crypto.randomUUID(),
      action,
      visitId: visit.id,
      payload,
      createdAt: new Date().toISOString(),
    })
    setOfflineQueue(queued)
    updateLocalVisit(mode === 'demo' ? 'demo' : 'queued')
    setStatusMessage(mode === 'demo' ? `Visit ${action} stored in demo mode.` : `Visit ${action} saved offline for sync.`)
  }

  async function syncOfflineActions() {
    if (!token || mode !== 'api' || !navigator.onLine) {
      setStatusMessage('Offline queue is ready, but sync needs a live API connection.')
      return
    }

    for (const item of offlineQueue) {
      await api.visitAction(token, item.visitId, item.action, item.payload)
      setOfflineQueue(removeOfflineAction(item.id))
    }

    await hydrateFromApi(token, user!)
    setStatusMessage('Offline clinician actions synced.')
  }

  const selectedEpisode = useMemo(
    () => dataset.episodes.find((episode) => episode.id === Number(assessmentForm.episode_id)) ?? dataset.episodes[0],
    [assessmentForm.episode_id, dataset.episodes],
  )
  const selectedEpisodeId = selectedEpisode?.id
  const selectedReferral = useMemo(
    () => dataset.referrals.find((referral) => referral.id === selectedEpisode?.referral_id) ?? null,
    [dataset.referrals, selectedEpisode?.referral_id],
  )
  const selectedPatient = useMemo(
    () => dataset.patients.find((patient) => patient.id === selectedEpisode?.patient_id) ?? dataset.patients[0],
    [dataset.patients, selectedEpisode?.patient_id],
  )
  const selectedPatientComplianceDocuments = useMemo(
    () => (selectedPatient ? dataset.patientComplianceDocuments.filter((document) => document.patient_id === selectedPatient.id) : []),
    [dataset.patientComplianceDocuments, selectedPatient],
  )
  const selectedPatientNotices = useMemo(
    () => (selectedPatient ? dataset.patientNotices.filter((notice) => notice.patient_id === selectedPatient.id) : []),
    [dataset.patientNotices, selectedPatient],
  )
  const selectedPatientMedications = useMemo(
    () => (selectedPatient ? dataset.patientMedications.filter((medication) => medication.patient_id === selectedPatient.id) : []),
    [dataset.patientMedications, selectedPatient],
  )
  const selectedPatientAllergies = useMemo(
    () => (selectedPatient ? dataset.patientAllergies.filter((allergy) => allergy.patient_id === selectedPatient.id) : []),
    [dataset.patientAllergies, selectedPatient],
  )
  const selectedEpisodeVerbalOrders = useMemo(
    () => (selectedEpisode ? dataset.verbalOrders.filter((order) => order.episode_id === selectedEpisode.id) : []),
    [dataset.verbalOrders, selectedEpisode],
  )
  const selectedEpisodeAideSupervision = useMemo(
    () => (selectedEpisode ? dataset.aideSupervisionEvents.filter((event) => event.episode_id === selectedEpisode.id) : []),
    [dataset.aideSupervisionEvents, selectedEpisode],
  )
  const selectedEpisodeIncidents = useMemo(
    () => (selectedEpisode ? dataset.incidentReports.filter((incident) => incident.episode_id === selectedEpisode.id) : []),
    [dataset.incidentReports, selectedEpisode],
  )
  const selectedEpisodeInfections = useMemo(
    () => (selectedEpisode ? dataset.infectionLogs.filter((infection) => infection.episode_id === selectedEpisode.id) : []),
    [dataset.infectionLogs, selectedEpisode],
  )
  const selectedEpisodeAuthorizations = useMemo(
    () => (selectedEpisode ? dataset.payerAuthorizations.filter((authorization) => authorization.episode_id === selectedEpisode.id) : []),
    [dataset.payerAuthorizations, selectedEpisode],
  )
  const selectedEpisodeEligibilityChecks = useMemo(
    () => (selectedEpisode ? dataset.eligibilityChecks.filter((check) => check.episode_id === selectedEpisode.id) : []),
    [dataset.eligibilityChecks, selectedEpisode],
  )
  const selectedEpisodeDmeSupplyOrders = useMemo(
    () => (selectedEpisode ? dataset.dmeSupplyOrders.filter((order) => order.episode_id === selectedEpisode.id) : []),
    [dataset.dmeSupplyOrders, selectedEpisode],
  )
  const selectedEpisodeCaseConferences = useMemo(
    () => (selectedEpisode ? dataset.caseConferences.filter((conference) => conference.episode_id === selectedEpisode.id) : []),
    [dataset.caseConferences, selectedEpisode],
  )
  const selectedEpisodeClaimTransactions = useMemo(
    () => (selectedEpisode ? dataset.claimTransactions.filter((transaction) => transaction.episode_id === selectedEpisode.id) : []),
    [dataset.claimTransactions, selectedEpisode],
  )
  const selectedEpisodeRemittancePostings = useMemo(
    () => (selectedEpisode ? dataset.remittancePostings.filter((posting) => posting.episode_id === selectedEpisode.id) : []),
    [dataset.remittancePostings, selectedEpisode],
  )
  const clinicianVisits = useMemo(() => dataset.visits.slice().sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start)), [dataset.visits])
  const selectedClinicianEpisode = useMemo(
    () => dataset.episodes.find((episode) => episode.id === Number(visitForm.episode_id)) ?? selectedEpisode,
    [dataset.episodes, selectedEpisode, visitForm.episode_id],
  )
  const demoEpisodeReadiness = useMemo(
    () => (selectedEpisode ? computeDemoReadiness(selectedEpisode.id, dataset) : null),
    [dataset, selectedEpisode],
  )
  const demoEpisodeReviewSummary = useMemo(
    () => (selectedEpisode ? buildDemoEpisodeReviewSummary(selectedEpisode, dataset) : null),
    [dataset, selectedEpisode],
  )
  const demoEpisodeInsights = useMemo(
    () => (selectedEpisode ? buildDemoEpisodeInsights(selectedEpisode, dataset) : null),
    [dataset, selectedEpisode],
  )
  const episodeReadiness = mode === 'api' ? apiEpisodeReadiness : demoEpisodeReadiness
  const episodeReviewSummary = mode === 'api' ? apiEpisodeReviewSummary : demoEpisodeReviewSummary
  const episodeInsights = mode === 'api' ? apiEpisodeInsights : demoEpisodeInsights
  const episodeNextActionRecommendation = useMemo(
    () => (selectedEpisode && episodeReviewSummary ? recommendEpisodeNextAction(episodeReviewSummary) : null),
    [episodeReviewSummary, selectedEpisode],
  )
  const selectedEpisodeSnapshot = useMemo(
    () => normalizeAdmissionSnapshot(selectedEpisode?.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(selectedEpisode, dataset.referrals),
    [dataset.referrals, selectedEpisode],
  )
  const selectedEpisodeIntake = useMemo(() => summarizeIntakeReadiness(selectedEpisodeSnapshot), [selectedEpisodeSnapshot])
  const selectedClinicianEpisodeSnapshot = useMemo(
    () =>
      normalizeAdmissionSnapshot(selectedClinicianEpisode?.admission_readiness_snapshot) ??
      deriveAdmissionSnapshot(selectedClinicianEpisode, dataset.referrals),
    [dataset.referrals, selectedClinicianEpisode],
  )
  const episodeIntakeQueue = useMemo(
    () => buildEpisodeIntakeQueue(dataset.episodes, dataset.referrals, dataset.qaTasks),
    [dataset.episodes, dataset.qaTasks, dataset.referrals],
  )
  const selectedEpisodeDocuments = useMemo(
    () =>
      selectedReferral
        ? dataset.referralDocuments.filter((document) => document.referral_id === selectedReferral.id)
            .sort((left, right) => `${right.signed_at ?? right.received_at ?? ''}`.localeCompare(`${left.signed_at ?? left.received_at ?? ''}`))
        : [],
    [dataset.referralDocuments, selectedReferral],
  )
  const selectedEpisodeOrders = useMemo(
    () =>
      selectedEpisode
        ? dataset.physicianOrders
            .filter((order) => order.episode_id === selectedEpisode.id)
            .sort((left, right) =>
              left.order_scope === right.order_scope
                ? right.version_number - left.version_number
                : left.order_scope.localeCompare(right.order_scope),
            )
        : [],
    [dataset.physicianOrders, selectedEpisode],
  )
  const selectedEpisodeOasisSubmissions = useMemo(
    () =>
      selectedEpisode
        ? dataset.oasisSubmissions
            .filter((item) => item.episode_id === selectedEpisode.id)
            .sort((left, right) => `${right.submitted_at ?? right.acknowledged_at ?? ''}`.localeCompare(`${left.submitted_at ?? left.acknowledged_at ?? ''}`))
        : [],
    [dataset.oasisSubmissions, selectedEpisode],
  )
  const selectedEpisodePlansOfCare = useMemo(
    () =>
      selectedEpisode
        ? dataset.planOfCares
            .filter((item) => item.episode_id === selectedEpisode.id)
            .sort((left, right) => right.version_number - left.version_number)
        : [],
    [dataset.planOfCares, selectedEpisode],
  )
  const selectedEpisodeCommunicationEntries = useMemo(
    () =>
      selectedEpisode
        ? dataset.communicationLogEntries
            .filter((item) => item.episode_id === selectedEpisode.id)
            .sort((left, right) => `${right.created ?? ''}`.localeCompare(`${left.created ?? ''}`))
        : [],
    [dataset.communicationLogEntries, selectedEpisode],
  )
  const claimReadinessQueue = useMemo(() => buildClaimReadinessQueue(dataset), [dataset])
  const claimStatusLanes = useMemo(() => buildClaimStatusLanes(claimReadinessQueue), [claimReadinessQueue])
  const denialQueueSections = useMemo(() => buildDenialQueueSections(claimReadinessQueue), [claimReadinessQueue])
  const evvQueueSections = useMemo(() => buildEvvQueueSections(dataset), [dataset])
  const billingFollowUpSections = useMemo(
    () => buildBillingFollowUpSections(dataset, claimReadinessQueue, denialQueueSections, evvQueueSections),
    [dataset, claimReadinessQueue, denialQueueSections, evvQueueSections],
  )
  const roleDashboard = useMemo(
    () =>
      buildRoleDashboardConfig(
        user ?? { id: 0, full_name: '', email: '', role: 'Intake' },
        dataset,
        episodeIntakeQueue,
        claimReadinessQueue,
        offlineQueue.length,
      ),
    [user, dataset, episodeIntakeQueue, claimReadinessQueue, offlineQueue.length],
  )
  const roleDashboardSections = useMemo(
    () => groupRoleDashboardItems(roleDashboard.items),
    [roleDashboard.items],
  )
  const filteredEpisodeIntakeQueue = useMemo(
    () =>
      episodeIntakeQueue.filter((item) => {
        const ownerMatch = intakeQueueOwnerFilter === 'All' || item.task.assigned_role === intakeQueueOwnerFilter
        const blockerMatch =
          intakeQueueBlockerFilter === 'All' ||
          (intakeQueueBlockerFilter === 'Face-to-face' && item.blocker === 'face_to_face') ||
          (intakeQueueBlockerFilter === 'Signed orders' && item.blocker === 'signed_orders')
        return ownerMatch && blockerMatch
      }),
    [episodeIntakeQueue, intakeQueueBlockerFilter, intakeQueueOwnerFilter],
  )
  const filteredClaimReadinessQueue = useMemo(
    () =>
      claimReadinessQueue.filter((item) => {
        const ownerMatch =
          billingQueueOwnerFilter === 'All' || item.relatedOwners.includes(billingQueueOwnerFilter)
        const blockerMatch =
          billingQueueBlockerFilter === 'All' ||
          (billingQueueBlockerFilter === 'Face-to-face' &&
            item.blockers.some((blocker) => blocker.toLowerCase().includes('face-to-face'))) ||
          (billingQueueBlockerFilter === 'Signed orders' &&
            item.blockers.some((blocker) => blocker.toLowerCase().includes('signed physician orders'))) ||
          (billingQueueBlockerFilter === 'Documentation' &&
            item.blockers.some((blocker) => blocker.toLowerCase().includes('documentation')))
        return ownerMatch && blockerMatch
      }),
    [billingQueueBlockerFilter, billingQueueOwnerFilter, claimReadinessQueue],
  )
  const filteredAuditEvents = useMemo(
    () =>
      dataset.auditEvents.filter((event) => {
        const actionMatch = auditFilterAction === 'All' || event.action === auditFilterAction
        const modelMatch = auditFilterModel === 'All' || event.model === auditFilterModel
        const searchNeedle = auditFilterSearch.trim().toLowerCase()
        const searchMatch =
          searchNeedle === '' ||
          `${event.actor_email} ${event.action} ${event.model} ${event.model_id} ${summarizeAuditDetails(event.details)}`.toLowerCase().includes(searchNeedle)
        return actionMatch && modelMatch && searchMatch
      }),
    [dataset.auditEvents, auditFilterAction, auditFilterModel, auditFilterSearch],
  )
  const adminReportSummary = useMemo(
    () => buildAdminReportSummary(dataset, adminReportPeriod),
    [dataset, adminReportPeriod],
  )
  const schedulingRecommendations = useMemo(
    () =>
      selectedClinicianEpisode
        ? buildVisitRecommendations(selectedClinicianEpisode, selectedClinicianEpisodeSnapshot, clinicianVisits)
        : [],
    [clinicianVisits, selectedClinicianEpisode, selectedClinicianEpisodeSnapshot],
  )
  const weekOnePlan = useMemo(
    () =>
      selectedClinicianEpisode
        ? buildWeekOneFrequencyPlan(selectedClinicianEpisode, selectedClinicianEpisodeSnapshot, clinicianVisits)
        : [],
    [clinicianVisits, selectedClinicianEpisode, selectedClinicianEpisodeSnapshot],
  )

  useEffect(() => {
    if (mode !== 'api' || !token || !selectedEpisodeId) {
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const [readinessResponse, reviewSummaryResponse, insightsResponse] = await Promise.all([
          api.episodeReadiness(token, selectedEpisodeId),
          api.episodeReviewSummary(token, selectedEpisodeId),
          api.episodeInsights(token, selectedEpisodeId),
        ])
        if (!cancelled) {
          setApiEpisodeReadiness(readinessResponse.data ?? null)
          setApiEpisodeReviewSummary(reviewSummaryResponse.data ?? null)
          setApiEpisodeInsights(insightsResponse.data ?? null)
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage((error as Error).message)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    mode,
    token,
    selectedEpisodeId,
    dataset.assessments.length,
    dataset.claims.length,
    dataset.evvRecords.length,
    dataset.physicianOrders.length,
    dataset.qaTasks.length,
    dataset.visits.length,
  ])

  const connectionLightTone: 'success' | 'error' = mode === 'api' && isBrowserOnline ? 'success' : 'error'
  const syncLightTone: 'success' | 'error' = offlineQueue.length === 0 ? 'success' : 'error'
  const connectionLightLabel = mode === 'api' && isBrowserOnline ? 'Connected' : mode === 'api' ? 'Offline' : 'Demo'
  const syncLightLabel = offlineQueue.length === 0 ? 'Synced' : `${offlineQueue.length} queued`
  const speechRecognitionSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    return () => {
      assessmentRecognitionRef.current?.stop()
    }
  }, [])


  return {
    token,
    setToken,
    user,
    setUser,
    mode,
    setMode,
    activeModule,
    setActiveModule,
    dataset,
    setDataset,
    offlineQueue,
    setOfflineQueue,
    statusMessage,
    setStatusMessage,
    sidebarCollapsed,
    setSidebarCollapsed,
    isBrowserOnline,
    setIsBrowserOnline,
    toastMessages,
    setToastMessages,
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
    setEditingPatientId,
    referralForm,
    setReferralForm,
    editingReferralId,
    setEditingReferralId,
    assessmentForm,
    setAssessmentForm,
    editingAssessmentId,
    setEditingAssessmentId,
    assessmentSpeechDraft,
    setAssessmentSpeechDraft,
    assessmentSpeechDetectedFields,
    setAssessmentSpeechDetectedFields,
    isAssessmentListening,
    setIsAssessmentListening,
    assessmentRecognitionRef,
    visitForm,
    setVisitForm,
    scheduleChangeForm,
    setScheduleChangeForm,
    documentationForm,
    setDocumentationForm,
    apiEpisodeReadiness,
    setApiEpisodeReadiness,
    apiEpisodeReviewSummary,
    setApiEpisodeReviewSummary,
    apiEpisodeInsights,
    setApiEpisodeInsights,
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
    setEditingAdminUserId,
    adminUserForm,
    setAdminUserForm,
    claimLifecycleForm,
    setClaimLifecycleForm,
    evvLifecycleForm,
    setEvvLifecycleForm,
    qaAssignmentDrafts,
    setQaAssignmentDrafts,
    intakeDocumentationForm,
    setIntakeDocumentationForm,
    referralDocumentForm,
    setReferralDocumentForm,
    editingReferralDocumentId,
    setEditingReferralDocumentId,
    referralDocumentAttachment,
    setReferralDocumentAttachment,
    orderForm,
    setOrderForm,
    editingOrderId,
    setEditingOrderId,
    orderDraftHighlights,
    setOrderDraftHighlights,
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
    isMedicarePayer,
    requiresInsuranceMemberId,
    insuranceIdLabel,
    insuranceIdHint,
    openNewPatientModal,
    openNewReferralModal,
    openEpisodeWorkspaceModal,
    prepareClaimLifecycleAction,
    prepareEvvLifecycleAction,
    syncAdminSettingsForm,
    resetAdminUserForm,
    loadAdminUserIntoForm,
    hydrateFromApi,
    saveAdminSettings,
    saveAdminUser,
    exportAdminReport,
    syncIntakeDocumentationForm,
    syncEpisodeAdmissionForm,
    applyAssessmentSpeechTranscript,
    stopAssessmentDictation,
    startAssessmentDictation,
    resetAssessmentForm,
    loadAssessmentIntoForm,
    resetReferralDocumentForm,
    resetOrderForm,
    resetOasisSubmissionForm,
    loadOasisSubmissionIntoForm,
    resetPlanOfCareForm,
    loadPlanOfCareIntoForm,
    loadCoderReviewIntoForm,
    loadReferralDocumentIntoForm,
    loadOrderIntoForm,
    autofillPhysicianOrderDraft,
    applyEpisodeContext,
    latestAssessmentForEpisode,
    firstUnsignedActiveOrderForEpisode,
    firstVisitDocumentationQaTaskForEpisode,
    firstPendingEvvRecordForEpisode,
    recommendEpisodeNextAction,
    resolveNextEpisodeBlocker,
    openRoleWorkItem,
    recalculate,
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
    selectedEpisodeId,
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
    demoEpisodeReadiness,
    demoEpisodeReviewSummary,
    demoEpisodeInsights,
    episodeReadiness,
    episodeReviewSummary,
    episodeInsights,
    episodeNextActionRecommendation,
    selectedEpisodeSnapshot,
    selectedEpisodeIntake,
    selectedClinicianEpisodeSnapshot,
    episodeIntakeQueue,
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
    forms: {
      patientForm,
      setPatientForm,
      referralForm,
      setReferralForm,
      assessmentForm,
      setAssessmentForm,
      visitForm,
      setVisitForm,
      scheduleChangeForm,
      setScheduleChangeForm,
      documentationForm,
      setDocumentationForm,
      lifecycleForm,
      setLifecycleForm,
      adminSettingsForm,
      setAdminSettingsForm,
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
      orderForm,
      setOrderForm,
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
      syncAdminSettingsForm,
      resetAdminUserForm,
      loadAdminUserIntoForm,
      syncIntakeDocumentationForm,
      syncEpisodeAdmissionForm,
      resetAssessmentForm,
      loadAssessmentIntoForm,
      resetReferralDocumentForm,
      resetOrderForm,
      resetOasisSubmissionForm,
      loadOasisSubmissionIntoForm,
      resetPlanOfCareForm,
      loadPlanOfCareIntoForm,
      loadCoderReviewIntoForm,
      loadReferralDocumentIntoForm,
      loadOrderIntoForm,
      resetPatientForm,
      loadPatientIntoForm,
      resetReferralForm,
      loadReferralIntoForm,
      loadRecommendationIntoVisitForm,
      loadVisitDocumentationForm,
    },
    lists: {
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
      claimReadinessQueue,
      billingFollowUpSections,
      filteredClaimReadinessQueue,
      filteredAuditEvents,
      adminReportSummary,
    },
    actions: {
      scheduleChangeForm,
      setQaAssignmentDrafts,
      setQapiForm,
      openNewPatientModal,
      openNewReferralModal,
      openEpisodeWorkspaceModal,
      prepareClaimLifecycleAction,
      prepareEvvLifecycleAction,
      syncAdminSettingsForm,
      resetAdminUserForm,
      loadAdminUserIntoForm,
      saveAdminSettings,
      saveAdminUser,
      exportAdminReport,
      syncIntakeDocumentationForm,
      syncEpisodeAdmissionForm,
      applyAssessmentSpeechTranscript,
      stopAssessmentDictation,
      startAssessmentDictation,
      resetAssessmentForm,
      loadAssessmentIntoForm,
      resetReferralDocumentForm,
      resetOrderForm,
      resetOasisSubmissionForm,
      loadOasisSubmissionIntoForm,
      resetPlanOfCareForm,
      loadPlanOfCareIntoForm,
      loadCoderReviewIntoForm,
      loadReferralDocumentIntoForm,
      loadOrderIntoForm,
      autofillPhysicianOrderDraft,
      applyEpisodeContext,
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
      setQaAssignmentDraft,
      saveQaTaskAssignment,
      escalateQaTask,
      submitClaim,
      runClaimLifecycleAction,
      submitEvv,
      runEvvLifecycleAction,
      prepareOasisSubmissionForSelectedEpisode,
      runOasisSubmissionAction,
      savePlanOfCare,
      syncCoderReviewForSelectedEpisode,
      saveCoderReviewItem,
      saveCommunicationLogEntry,
      saveFaxMessage,
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
      syncLightTone,
      syncLightLabel,
    },
  }
}

function parseAssessmentSpeechTranscript(transcript: string, currentForm: AssessmentFormState) {
  const fields: Partial<AssessmentFormState> = {}
  const detectedFields: string[] = []
  const normalized = transcript.toLowerCase()

  const addField = (key: keyof AssessmentFormState, value: string | undefined, label: string) => {
    if (!value) {
      return
    }

    const nextValue = value.trim()
    if (!nextValue || nextValue === currentForm[key]) {
      return
    }

    fields[key] = nextValue
    detectedFields.push(label)
  }

  const addBooleanField = (key: keyof AssessmentFormState, value: string | undefined, label: string) => {
    if (!value || value === currentForm[key]) {
      return
    }
    fields[key] = value
    detectedFields.push(label)
  }

  const diagnosisCode = transcript.match(/\b([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)\b/i)?.[1]?.toUpperCase()
  addField('principal_diagnosis_code', diagnosisCode, 'Diagnosis code')

  const functionalScore = transcript.match(/\bfunctional(?: score)?(?: is| of| equals| at)?\s*(\d{1,2})\b/i)?.[1]
  addField('functional_score', functionalScore, 'Functional score')

  const oasisM1033 = transcript.match(/\bm1033(?: risk)?(?: is| of)?\s*(\d)\b/i)?.[1]
  addField('oasis_m1033', oasisM1033, 'OASIS M1033')

  const oasisM1860 = transcript.match(/\bm1860(?: ambulation)?(?: is| of)?\s*(\d)\b/i)?.[1]
  addField('oasis_m1860', oasisM1860, 'OASIS M1860')

  const oasisM2020 = transcript.match(/\bm2020(?: oral meds?)?(?: is| of)?\s*(\d)\b/i)?.[1]
  addField('oasis_m2020', oasisM2020, 'OASIS M2020')

  if (/\bstart of care\b|\bsoc\b/.test(normalized)) {
    addField('assessment_type', 'soc', 'Assessment type')
  } else if (/\bresume of care\b|\broc\b/.test(normalized)) {
    addField('assessment_type', 'roc', 'Assessment type')
  } else if (/\brecert/i.test(normalized)) {
    addField('assessment_type', 'recertification', 'Assessment type')
  } else if (/\btransfer\b/.test(normalized)) {
    addField('assessment_type', 'transfer', 'Assessment type')
  } else if (/\bdischarge\b/.test(normalized)) {
    addField('assessment_type', 'discharge', 'Assessment type')
  }

  if (/\bcomorbidity\b.*\blow\b|\blow comorbidity\b/.test(normalized)) {
    addField('comorbidity_level', 'low', 'Comorbidity')
  } else if (/\bcomorbidity\b.*\bmoderate\b|\bmoderate comorbidity\b/.test(normalized)) {
    addField('comorbidity_level', 'moderate', 'Comorbidity')
  } else if (/\bcomorbidity\b.*\bhigh\b|\bhigh comorbidity\b/.test(normalized)) {
    addField('comorbidity_level', 'high', 'Comorbidity')
  }

  if (/\bmed(ication)? rec(onciliation)? completed\b|\bmedication reconciliation completed\b/.test(normalized)) {
    addBooleanField('medication_reconciliation_completed', 'yes', 'Medication reconciliation')
  } else if (/\bmed(ication)? rec(onciliation)? pending\b|\bmedication reconciliation pending\b|\bmedication reconciliation not completed\b/.test(normalized)) {
    addBooleanField('medication_reconciliation_completed', 'no', 'Medication reconciliation')
  }

  if (/\bnot homebound\b/.test(normalized)) {
    addField('homebound_status', 'not_homebound', 'Homebound status')
  } else if (/\blimited homebound\b|\blimited ability to leave home\b/.test(normalized)) {
    addField('homebound_status', 'limited', 'Homebound status')
  } else if (/\bhomebound\b/.test(normalized)) {
    addField('homebound_status', 'homebound', 'Homebound status')
  }

  if (/\bfall risk\b.*\bhigh\b|\bhigh fall risk\b/.test(normalized)) {
    addField('fall_risk_level', 'high', 'Fall risk')
  } else if (/\bfall risk\b.*\bmoderate\b|\bmoderate fall risk\b/.test(normalized)) {
    addField('fall_risk_level', 'moderate', 'Fall risk')
  } else if (/\bfall risk\b.*\blow\b|\blow fall risk\b/.test(normalized)) {
    addField('fall_risk_level', 'low', 'Fall risk')
  }

  if (/\bhospitalization risk\b.*\bhigh\b|\bhigh hospitalization risk\b/.test(normalized)) {
    addField('hospitalization_risk', 'high', 'Hospitalization risk')
  } else if (/\bhospitalization risk\b.*\belevated\b|\belevated hospitalization risk\b/.test(normalized)) {
    addField('hospitalization_risk', 'elevated', 'Hospitalization risk')
  } else if (/\bhospitalization risk\b.*\broutine\b|\broutine hospitalization risk\b/.test(normalized)) {
    addField('hospitalization_risk', 'routine', 'Hospitalization risk')
  }

  if (/\bemergency preparedness reviewed\b|\breviewed emergency preparedness\b/.test(normalized)) {
    addBooleanField('emergency_preparedness_reviewed', 'yes', 'Emergency preparedness')
  } else if (/\bemergency preparedness not reviewed\b|\bnot reviewed emergency preparedness\b/.test(normalized)) {
    addBooleanField('emergency_preparedness_reviewed', 'no', 'Emergency preparedness')
  }

  if (/\bno wounds\b|\bwound absent\b|\bwounds absent\b/.test(normalized)) {
    addField('wound_present', 'no', 'Wounds present')
  } else if (/\bwound present\b|\bhas wound\b|\bopen wound\b/.test(normalized)) {
    addField('wound_present', 'yes', 'Wounds present')
  }

  const homeboundNarrative =
    extractTaggedSection(transcript, 'homebound narrative', ['clinical summary', 'care plan goals', 'medication issues', 'high-risk medications', 'wound notes', 'caregiver notes', 'risk notes']) ??
    findSentenceContaining(transcript, ['homebound'])
  addField('homebound_narrative', homeboundNarrative, 'Homebound narrative')

  const clinicalSummary =
    extractTaggedSection(transcript, 'clinical summary', ['care plan goals', 'medication issues', 'high-risk medications', 'wound notes', 'caregiver notes', 'risk notes']) ??
    (transcript.trim().length > 60 ? transcript.trim() : undefined)
  addField('clinical_summary', clinicalSummary, 'Clinical summary')

  const carePlanGoals =
    extractTaggedSection(transcript, 'care plan goals', ['clinical summary', 'medication issues', 'high-risk medications', 'wound notes', 'caregiver notes', 'risk notes']) ??
    findSentenceContaining(transcript, ['goal', 'goals'])
  addField('care_plan_goals', carePlanGoals, 'Care plan goals')

  const medicationIssues =
    extractTaggedSection(transcript, 'medication issues', ['high-risk medications', 'wound notes', 'caregiver notes', 'risk notes']) ??
    findSentenceContaining(transcript, ['medication issue', 'medication problem'])
  addField('medication_issues', medicationIssues, 'Medication issues')

  const highRiskMeds =
    extractTaggedSection(transcript, 'high-risk medications', ['wound notes', 'caregiver notes', 'risk notes']) ??
    findSentenceContaining(transcript, ['high-risk medication', 'high risk medication'])
  addField('high_risk_meds', highRiskMeds, 'High-risk medications')

  const woundNotes =
    extractTaggedSection(transcript, 'wound notes', ['caregiver notes', 'risk notes']) ??
    findSentenceContaining(transcript, ['wound'])
  addField('wound_notes', woundNotes, 'Wound notes')

  const caregiverAvailability =
    extractTaggedSection(transcript, 'caregiver availability', ['caregiver notes', 'risk notes']) ??
    findSentenceContaining(transcript, ['caregiver available', 'caregiver availability'])
  addField('caregiver_availability', caregiverAvailability, 'Caregiver availability')

  const caregiverNotes =
    extractTaggedSection(transcript, 'caregiver notes', ['risk notes']) ??
    findSentenceContaining(transcript, ['caregiver'])
  addField('caregiver_notes', caregiverNotes, 'Caregiver notes')

  const riskNotes =
    extractTaggedSection(transcript, 'risk notes', []) ??
    findSentenceContaining(transcript, ['risk'])
  addField('risk_notes', riskNotes, 'Risk notes')

  return { fields, detectedFields }
}

function extractTaggedSection(text: string, label: string, stopLabels: string[]) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const stops = stopLabels.length > 0 ? stopLabels.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') : null
  const pattern = stops
    ? new RegExp(`${escapedLabel}[\\s:-]+([\\s\\S]+?)(?=\\b(?:${stops})\\b|$)`, 'i')
    : new RegExp(`${escapedLabel}[\\s:-]+([\\s\\S]+)$`, 'i')
  const match = text.match(pattern)?.[1]?.trim()

  return match ? match.replace(/\s+/g, ' ').trim() : undefined
}

function findSentenceContaining(text: string, terms: string[]) {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const sentence = sentences.find((item) => terms.some((term) => item.toLowerCase().includes(term.toLowerCase())))
  return sentence?.trim()
}

function defaultVisitFocusForDiscipline(discipline: string) {
  const normalized = discipline.trim().toUpperCase()
  return (
    {
      SN: 'Skilled nursing assessment, medication follow-up, and symptom surveillance',
      PT: 'Mobility training, transfer safety, and strengthening follow-up',
      OT: 'ADL training, home safety, and functional task support',
      ST: 'Communication, cognition, or swallowing follow-up',
      HHA: 'Personal care support and ADL assistance',
      MSW: 'Psychosocial assessment and community resource follow-up',
    }[normalized] ?? 'Discipline-specific follow-up and care plan review'
  )
}

function documentationBlueprintForDiscipline(discipline: string) {
  const normalized = discipline.trim().toUpperCase()
  return (
    {
      SN: 'Required for QA: visit focus, narrative, interventions, patient response, vitals, medication review, teaching topics, and follow-up plan.',
      PT: 'Required for QA: visit focus, narrative, interventions, patient response, mobility status, teaching topics, and follow-up plan.',
      OT: 'Required for QA: visit focus, narrative, interventions, patient response, mobility status, teaching topics, and follow-up plan.',
      ST: 'Required for QA: visit focus, narrative, interventions, patient response, teaching topics, and follow-up plan.',
      HHA: 'Required for QA: visit focus, narrative, interventions, patient response, ADL support, and follow-up plan.',
      MSW: 'Required for QA: visit focus, narrative, interventions, patient response, psychosocial notes, and follow-up plan.',
    }[normalized] ?? 'Complete the visit focus, narrative, interventions, response, and follow-up plan before QA submission.'
  )
}

function deriveAdmissionSnapshot(episode: Episode | undefined, referrals: Referral[]) {
  if (!episode?.referral_id) {
    return null
  }

  const referral = referrals.find((item) => item.id === episode.referral_id)
  return referral ? buildAdmissionSnapshotFromReferral(referral) : null
}

function summarizeIntakeReadiness(snapshot: EpisodeAdmissionSnapshot | null) {
  const faceToFaceComplete = Boolean(snapshot?.face_to_face_date)
  const signedOrdersComplete = Boolean(snapshot?.physician_orders_signed && snapshot?.physician_orders_signed_at)
  const orderStatus = normalizeOrderStatus(snapshot?.order_status)
  const blockers: string[] = []

  if (!faceToFaceComplete) {
    blockers.push('Face-to-face documentation is still missing.')
  }
  if (!signedOrdersComplete) {
    blockers.push('Signed physician orders are still missing.')
  }
  if (!snapshot?.order_status) {
    blockers.push('Order status has not been captured on the intake snapshot.')
  }

  return {
    faceToFaceComplete,
    signedOrdersComplete,
    orderStatus,
    blockers,
    badges: [
      { label: faceToFaceComplete ? 'F2F on file' : 'F2F missing', tone: faceToFaceComplete ? 'neutral' : 'warn' },
      { label: signedOrdersComplete ? 'Orders signed' : 'Orders pending', tone: signedOrdersComplete ? 'neutral' : 'warn' },
      { label: `Order status: ${orderStatus}`, tone: signedOrdersComplete ? 'neutral' : 'warn' },
    ] as StatusBadge[],
  }
}

function upsertDemoVisitDocumentationQaTask(
  qaTasks: QaTask[],
  visit: Visit,
  summary: string,
) {
  const existingTask = qaTasks.find(
    (task) => task.visit_id === visit.id && task.task_type === 'visit_documentation_review' && task.status === 'open',
  )
  const details = summary || 'Visit documentation submitted for QA review.'

  if (existingTask) {
    return qaTasks.map((task) =>
      task.id === existingTask.id
        ? {
            ...task,
            details,
            due_at: visit.actual_end ?? visit.scheduled_end,
          }
        : task,
    )
  }

  return [
    {
      id: qaTasks.length + 1,
      episode_id: visit.episode_id,
      visit_id: visit.id,
      task_type: 'visit_documentation_review',
      priority: 'medium',
      status: 'open',
      title: 'Review and lock visit documentation',
      details,
      assigned_role: 'QA',
      due_at: visit.actual_end ?? visit.scheduled_end,
    } satisfies QaTask,
    ...qaTasks,
  ]
}

function applyDemoIntakeDocumentationUpdate(
  current: AppDataset,
  episode: Episode,
  updates: { face_to_face_date?: string; physician_orders_signed?: boolean; physician_orders_signed_at?: string; order_status?: string },
): AppDataset {
  if (!episode.referral_id) {
    return current
  }

  const referral = current.referrals.find((item) => item.id === episode.referral_id)
  if (!referral) {
    return current
  }

  return applyDemoReferralUpdate(current, {
    ...referral,
    face_to_face_date: updates.face_to_face_date ?? referral.face_to_face_date,
    physician_orders_signed: updates.physician_orders_signed ?? referral.physician_orders_signed,
    physician_orders_signed_at: updates.physician_orders_signed_at ?? referral.physician_orders_signed_at,
    order_status: updates.order_status ?? referral.order_status,
  })
}

function applyDemoReferralDocumentUpsert(current: AppDataset, document: ReferralDocument): AppDataset {
  const nextDocuments = current.referralDocuments.some((item) => item.id === document.id)
    ? current.referralDocuments.map((item) => (item.id === document.id ? document : item))
    : [document, ...current.referralDocuments]
  const referral = current.referrals.find((item) => item.id === document.referral_id)
  if (!referral) {
    return {
      ...current,
      referralDocuments: nextDocuments,
    }
  }

  const derivedDocumentation = deriveReferralDocumentationFromDocuments(
    nextDocuments.filter((item) => item.referral_id === referral.id),
    referral,
  )
  const nextDataset = applyDemoReferralUpdate(
    {
      ...current,
      referralDocuments: nextDocuments,
    },
    {
      ...referral,
      ...derivedDocumentation,
    },
  )

  return {
    ...nextDataset,
    referralDocuments: nextDocuments,
  }
}

function applyDemoPhysicianOrderUpsert(current: AppDataset, nextOrder: PhysicianOrder): AppDataset {
  const isEditing = current.physicianOrders.some((order) => order.id === nextOrder.id)
  const nextOrders = isEditing
    ? current.physicianOrders.map((order) => (order.id === nextOrder.id ? nextOrder : order))
    : [
        nextOrder,
        ...current.physicianOrders.map((order) =>
          order.episode_id === nextOrder.episode_id && order.order_scope === nextOrder.order_scope && order.active
            ? {
                ...order,
                active: false,
                order_status: order.order_status === 'signed' ? order.order_status : 'superseded',
              }
            : order,
        ),
      ]

  const nextQaTasks = syncDemoOrderQaTasks(current.qaTasks, nextOrder)
  const nextReferrals = syncDemoReferralOrderFields(current.referrals, current.episodes, nextOrders, nextOrder.episode_id)
  const nextEpisodes = syncDemoEpisodeOrderSnapshot(current.episodes, nextReferrals, nextOrders, nextOrder.episode_id)

  const syncedQaTasks = nextOrders
    .filter((order) => order.order_scope === 'admission' && order.active)
    .reduce((tasks, order) => syncDemoOrderQaTasks(tasks, order), nextQaTasks)

  return {
    ...current,
    referrals: nextReferrals,
    episodes: nextEpisodes,
    physicianOrders: nextOrders,
    qaTasks: syncedQaTasks,
    claims: syncQaDrivenClaimHolds(current.claims, syncedQaTasks),
  }
}

function syncDemoOrderQaTasks(tasks: QaTask[], order: PhysicianOrder) {
  const taskLabel = `Order ${order.id}`
  const existingTask = tasks.find(
    (task) =>
      task.episode_id === order.episode_id &&
      task.task_type === 'physician_order_review' &&
      task.details?.includes(taskLabel),
  )

  if (order.order_status === 'signed' && order.signed_at) {
    return tasks.map((task) =>
      task.id === existingTask?.id || (task.episode_id === order.episode_id && task.task_type === 'missing_signed_orders' && order.order_scope === 'admission')
        ? { ...task, status: 'resolved' }
        : task,
    )
  }

  const nextTask: QaTask = {
    id: existingTask?.id ?? tasks.length + 1,
    episode_id: order.episode_id,
    task_type: 'physician_order_review',
    priority: order.order_scope === 'admission' ? 'high' : 'medium',
    status: 'open',
    title: `Review ${labelizeValue(order.order_scope)} physician order packet`,
    details: `${taskLabel} (${order.order_scope} v${order.version_number}) is ${order.order_status} and requires physician order follow-up before release.`,
    assigned_role: 'Clinical',
    due_at: order.sent_at ?? order.received_at ?? currentDateTimeInputValue().replace('T', ' '),
  }

  if (existingTask) {
    return tasks.map((task) =>
      task.id === existingTask.id
        ? {
            ...existingTask,
            ...nextTask,
          }
        : task,
    )
  }

  return [nextTask, ...tasks]
}

function syncDemoReferralOrderFields(referrals: Referral[], episodes: Episode[], orders: PhysicianOrder[], episodeId: number) {
  const episode = episodes.find((item) => item.id === episodeId)
  if (!episode?.referral_id) {
    return referrals
  }

  const admissionOrder = orders
    .filter((order) => order.episode_id === episodeId && order.order_scope === 'admission' && order.active)
    .sort((left, right) => right.version_number - left.version_number)[0]
  if (!admissionOrder) {
    return referrals
  }

  return referrals.map((referral) =>
    referral.id === episode.referral_id
      ? {
          ...referral,
          order_status: admissionOrder.order_status,
          physician_orders_signed: admissionOrder.order_status === 'signed' && Boolean(admissionOrder.signed_at),
          physician_orders_signed_at: admissionOrder.signed_at,
        }
      : referral,
  )
}

function syncDemoEpisodeOrderSnapshot(
  episodes: Episode[],
  referrals: Referral[],
  orders: PhysicianOrder[],
  episodeId: number,
) {
  const admissionOrder = orders
    .filter((order) => order.episode_id === episodeId && order.order_scope === 'admission' && order.active)
    .sort((left, right) => right.version_number - left.version_number)[0]

  return episodes.map((episode) => {
    if (episode.id !== episodeId || !admissionOrder) {
      return episode
    }

    const snapshot = normalizeAdmissionSnapshot(episode.admission_readiness_snapshot) ?? deriveAdmissionSnapshot(episode, referrals) ?? {}
    return {
      ...episode,
      admission_readiness_snapshot: {
        ...snapshot,
        order_status: admissionOrder.order_status,
        physician_orders_signed: admissionOrder.order_status === 'signed' && Boolean(admissionOrder.signed_at),
        physician_orders_signed_at: admissionOrder.signed_at,
      },
    }
  })
}

function applyDemoReferralUpdate(current: AppDataset, updatedReferral: Referral): AppDataset {
  const nextReferrals = current.referrals.map((referral) => (referral.id === updatedReferral.id ? updatedReferral : referral))
  let nextQaTasks = current.qaTasks.map((task) => {
    if (task.episode_id === undefined) {
      return task
    }

    const linkedEpisode = current.episodes.find((episode) => episode.id === task.episode_id)
    if (!linkedEpisode || linkedEpisode.referral_id !== updatedReferral.id || task.status !== 'open') {
      return task
    }

    if (task.task_type === 'missing_face_to_face' && updatedReferral.face_to_face_date) {
      return { ...task, status: 'resolved' }
    }
    if (task.task_type === 'missing_signed_orders' && updatedReferral.physician_orders_signed && updatedReferral.physician_orders_signed_at) {
      return { ...task, status: 'resolved' }
    }

    return task
  })
  const existingTaskTypesByEpisode = new Map<number, Set<string>>()
  nextQaTasks.forEach((task) => {
    if (task.episode_id === undefined || task.status !== 'open') {
      return
    }
    const currentTypes = existingTaskTypesByEpisode.get(task.episode_id) ?? new Set<string>()
    currentTypes.add(task.task_type)
    existingTaskTypesByEpisode.set(task.episode_id, currentTypes)
  })
  const appendedTasks: QaTask[] = []

  const nextEpisodes = current.episodes.map((episode) => {
    if (episode.referral_id !== updatedReferral.id) {
      return episode
    }

    const snapshot = buildAdmissionSnapshotFromReferral(updatedReferral)
    const openTaskTypes = existingTaskTypesByEpisode.get(episode.id) ?? new Set<string>()
    const documentationTasks = buildDocumentationQaTasksForReferral(
      episode.id,
      updatedReferral,
      current.qaTasks.length + appendedTasks.length + 1,
      episode.cert_start_date,
    ).filter((task) => !openTaskTypes.has(task.task_type))
    appendedTasks.push(...documentationTasks)

    return {
      ...episode,
      payer_type: updatedReferral.payer_type,
      primary_diagnosis: updatedReferral.primary_diagnosis,
      admission_readiness_snapshot: snapshot,
    }
  })

  nextQaTasks = [...appendedTasks, ...nextQaTasks]
  const nextOrders = current.physicianOrders.map((order) => {
    if (order.order_scope !== 'admission' || !order.active) {
      return order
    }

    const linkedEpisode = current.episodes.find((episode) => episode.id === order.episode_id)
    if (!linkedEpisode || linkedEpisode.referral_id !== updatedReferral.id) {
      return order
    }

    return {
      ...order,
      order_status: normalizeDemoReferralOrderStatus(updatedReferral.order_status, updatedReferral.physician_orders_signed),
      signed_at: updatedReferral.physician_orders_signed_at,
      received_at: updatedReferral.physician_orders_signed_at ?? order.received_at,
      signer_name: updatedReferral.referring_provider_name ?? order.signer_name,
    }
  })

  return {
    ...current,
    referrals: nextReferrals,
    episodes: nextEpisodes,
    physicianOrders: nextOrders,
    qaTasks: nextQaTasks,
    claims: syncQaDrivenClaimHolds(current.claims, nextQaTasks),
  }
}

function deriveReferralDocumentationFromDocuments(documents: ReferralDocument[], referral: Referral) {
  const faceToFaceDate = documents
    .filter((document) => document.document_type === 'face_to_face' && document.received_at)
    .map((document) => document.received_at!.slice(0, 10))
    .sort()
    .at(-1) ?? referral.face_to_face_date

  const physicianOrderDocuments = documents.filter((document) => document.document_type === 'physician_orders')
  const signedOrderTimestamps = physicianOrderDocuments
    .filter((document) => document.document_status === 'signed' && document.signed_at)
    .map((document) => document.signed_at!)
    .sort()
  const latestSignedOrderTimestamp = signedOrderTimestamps.at(-1)
  const hasAnyReceivedOrder = physicianOrderDocuments.some((document) =>
    ['received', 'reviewed', 'signed'].includes(document.document_status),
  )

  return {
    face_to_face_date: faceToFaceDate,
    physician_orders_signed: Boolean(latestSignedOrderTimestamp),
    physician_orders_signed_at: latestSignedOrderTimestamp ?? undefined,
    order_status: latestSignedOrderTimestamp ? 'signed' : hasAnyReceivedOrder ? 'received' : referral.order_status,
  }
}

function applyDemoPatientUpdate(current: AppDataset, updatedPatient: Patient): AppDataset {
  const patientName = nameForPatient(updatedPatient)

  return {
    ...current,
    patients: current.patients.map((patient) => (patient.id === updatedPatient.id ? updatedPatient : patient)),
    referrals: current.referrals.map((referral) =>
      referral.patient_id === updatedPatient.id
        ? {
            ...referral,
            patient_name: patientName,
          }
        : referral,
    ),
    episodes: current.episodes.map((episode) =>
      episode.patient_id === updatedPatient.id
        ? {
            ...episode,
            patient_name: patientName,
          }
        : episode,
    ),
    visits: current.visits.map((visit) =>
      visit.patient_id === updatedPatient.id
        ? {
            ...visit,
            patient_name: patientName,
          }
        : visit,
    ),
  }
}

function applyDemoEpisodeAdmissionUpdate(
  current: AppDataset,
  episode: Episode,
  updates: {
    admission_source?: string
    requested_disciplines?: string[]
    referring_provider_name?: string
    referring_provider_phone?: string
    pcp_name?: string
    pcp_phone?: string
    caregiver_name?: string
    caregiver_relationship?: string
    caregiver_phone?: string
    service_location_type?: string
    service_address1?: string
    service_city?: string
    service_state?: string
    service_postal_code?: string
    notes?: string
  },
): AppDataset {
  if (!episode.referral_id) {
    return current
  }

  const referral = current.referrals.find((item) => item.id === episode.referral_id)
  if (!referral) {
    return current
  }

  return applyDemoReferralUpdate(current, {
    ...referral,
    admission_source: updates.admission_source ?? referral.admission_source,
    requested_disciplines: updates.requested_disciplines ?? normalizeDisciplines(referral.requested_disciplines),
    referring_provider_name: updates.referring_provider_name ?? referral.referring_provider_name,
    referring_provider_phone: updates.referring_provider_phone ?? referral.referring_provider_phone,
    pcp_name: updates.pcp_name ?? referral.pcp_name,
    pcp_phone: updates.pcp_phone ?? referral.pcp_phone,
    caregiver_name: updates.caregiver_name ?? referral.caregiver_name,
    caregiver_relationship: updates.caregiver_relationship ?? referral.caregiver_relationship,
    caregiver_phone: updates.caregiver_phone ?? referral.caregiver_phone,
    service_location_type: updates.service_location_type ?? referral.service_location_type,
    service_address1: updates.service_address1 ?? referral.service_address1,
    service_city: updates.service_city ?? referral.service_city,
    service_state: updates.service_state ?? referral.service_state,
    service_postal_code: updates.service_postal_code ?? referral.service_postal_code,
    notes: updates.notes ?? referral.notes,
  })
}

function mapPdgmAdmissionSource(admissionSource?: string) {
  const normalized = (admissionSource ?? '').trim().toUpperCase()
  if (normalized === '') {
    return 'COMMUNITY'
  }

  return ['HOSPITAL', 'FACILITY', 'INPATIENT', 'SNF', 'REHAB', 'TRANSFER'].some((term) => normalized.includes(term))
    ? 'INSTITUTIONAL'
    : 'COMMUNITY'
}

function availableClaimActions(claim: Claim) {
  if (claim.status === 'submitted') {
    return ['accept', 'reject', 'void'] as const
  }
  if (claim.status === 'accepted') {
    return ['post_payment', 'reject', 'void'] as const
  }
  if (claim.status === 'paid') {
    return ['void'] as const
  }
  if (claim.status === 'rejected') {
    return ['corrected', 'void'] as const
  }
  if (claim.status === 'voided') {
    return ['corrected'] as const
  }

  return [] as const
}

function labelizeClaimAction(action: 'accept' | 'reject' | 'post_payment' | 'void' | 'corrected') {
  return {
    accept: 'Accept claim',
    reject: 'Reject claim',
    post_payment: 'Post payment',
    void: 'Void claim',
    corrected: 'Create corrected claim',
  }[action]
}

function extractDiagnosisCode(diagnosis: string) {
  const match = diagnosis.trim().match(/^([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)/i)
  return match ? match[1].toUpperCase() : ''
}

function normalizeDisciplines(value?: string[] | string) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    try {
      const parsed = JSON.parse(value) as string[]
      return Array.isArray(parsed) ? parsed : value.split(',').map((entry) => entry.trim()).filter(Boolean)
    } catch {
      return value.split(',').map((entry) => entry.trim()).filter(Boolean)
    }
  }

  return []
}

function csvToArray(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function assessmentActivationBlockers(assessment?: Assessment) {
  const blockers: string[] = []
  if (!assessment) {
    return blockers
  }

  if (!assessment.homebound_status?.trim()) {
    blockers.push('Episode cannot activate until the finalized assessment documents homebound status.')
  }
  if (!assessment.homebound_narrative?.trim()) {
    blockers.push('Episode cannot activate until the finalized assessment includes a homebound narrative.')
  }
  if (
    ['soc', 'roc', 'recertification'].includes(assessment.assessment_type.toLowerCase()) &&
    !assessment.medication_reconciliation_completed
  ) {
    blockers.push('Episode cannot activate until medication reconciliation is documented on the finalized assessment.')
  }

  return blockers
}

function addMinutesToDateTimeLocal(value: string, minutes: number) {
  const source = new Date(value)
  source.setMinutes(source.getMinutes() + minutes)
  return toDateTimeLocal(source)
}

function toDateTimeLocal(source: Date) {
  const year = source.getFullYear()
  const month = String(source.getMonth() + 1).padStart(2, '0')
  const day = String(source.getDate()).padStart(2, '0')
  const hour = String(source.getHours()).padStart(2, '0')
  const minute = String(source.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function nameForPatient(patient?: Partial<Patient>) {
  if (!patient) {
    return 'Unknown patient'
  }

  return `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim()
}

function toApiDateTime(value: string) {
  return value.replace('T', ' ') + (value.length === 16 ? ':00' : '')
}

function toDateTimeInputValue(value: string) {
  return value.replace(' ', 'T').slice(0, 16)
}

function currentDateInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function currentDateTimeInputValue() {
  return toDateTimeInputValue(new Date().toISOString().slice(0, 19).replace('T', ' '))
}

function resolveOasisVersion(completedAt: string) {
  return new Date(completedAt.replace(' ', 'T')).getTime() >= new Date('2026-04-01T00:00:00').getTime() ? 'OASIS-E2' : 'OASIS-E1'
}

function shiftDate(date: string, days: number) {
  const source = new Date(`${date}T00:00:00`)
  source.setDate(source.getDate() + days)
  return source.toISOString().slice(0, 10)
}

function createPdgmGroup(code: string, functionalScore: number, comorbidityLevel: string, admissionSource: string) {
  const clinicalGroup = code.startsWith('I') ? 'MMTA-CARDIAC' : code.startsWith('J') ? 'MMTA-RESPIRATORY' : 'MMTA-OTHER'
  const functionalLevel = functionalScore >= 16 ? 'HIGH' : functionalScore >= 8 ? 'MEDIUM' : 'LOW'
  return `${clinicalGroup}-${admissionSource.toUpperCase()}-EARLY-${functionalLevel}-${comorbidityLevel.toUpperCase()}`
}

function groupRoleDashboardItems(items: RoleWorkItem[]): RoleDashboardSection[] {
  const today = currentDateInputValue()
  const doNow: RoleWorkItem[] = []
  const dueToday: RoleWorkItem[] = []
  const watchNext: RoleWorkItem[] = []

  const dueDateFor = (item: RoleWorkItem) => (item.dueAt ?? '').replace('T', ' ').slice(0, 10)

  items.forEach((item) => {
    const dueDate = dueDateFor(item)
    const normalizedPriority = (item.priority ?? 'medium').toLowerCase()

    if (
      normalizedPriority === 'high' &&
      (dueDate === '' || dueDate <= today)
    ) {
      doNow.push(item)
      return
    }

    if (dueDate !== '' && dueDate < today) {
      doNow.push(item)
      return
    }

    if (dueDate === today) {
      dueToday.push(item)
      return
    }

    watchNext.push(item)
  })

  const sortItems = (entries: RoleWorkItem[]) =>
    entries.slice().sort((left, right) => {
      const priorityRank: Record<string, number> = { high: 3, medium: 2, low: 1 }
      const leftPriority = priorityRank[(left.priority ?? 'medium').toLowerCase()] ?? 0
      const rightPriority = priorityRank[(right.priority ?? 'medium').toLowerCase()] ?? 0
      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority
      }

      return `${left.dueAt ?? ''}`.localeCompare(`${right.dueAt ?? ''}`)
    })

  return [
    { title: 'Do Now', description: 'Overdue or high-priority work that should move first.', items: sortItems(doNow) },
    { title: 'Due Today', description: 'Work that is time-sensitive today but not yet overdue.', items: sortItems(dueToday) },
    { title: 'Watch Next', description: 'Upcoming follow-up that should stay visible but can wait behind urgent work.', items: sortItems(watchNext) },
  ]
}

function mapDemoTransitionStatus(transitionType: string) {
  return (
    {
      recertify: 'recert_due',
      transfer: 'transferred',
      resume_care: 'roc_pending',
      discharge: 'discharged',
      death_at_home: 'deceased',
    }[transitionType] ?? 'pending_admission'
  )
}

function labelizeTransition(transitionType: string) {
  return (
    {
      recertify: 'Recertify',
      transfer: 'Transfer',
      resume_care: 'Resume of care',
      discharge: 'Discharge',
      death_at_home: 'Death at home',
    }[transitionType] ?? transitionType.replaceAll('_', ' ')
  )
}

function demoTransitionTitle(transitionType: string) {
  return (
    {
      recertify: 'Prepare recertification assessment and orders',
      transfer: 'Close out transfer workflow and billing review',
      resume_care: 'Schedule Resume of Care assessment',
      discharge: 'Review discharge summary and close episode',
      death_at_home: 'Handle death-at-home closeout and billing review',
    }[transitionType] ?? 'Review lifecycle transition'
  )
}

function demoTransitionDetails(transitionType: string) {
  return (
    {
      recertify: 'Episode is approaching the end of the certification period and needs recertification follow-up.',
      transfer: 'Patient is transferring to another provider; hold future visits and review remaining billing.',
      resume_care: 'Patient is resuming care after an interruption and needs ROC assessment scheduling.',
      discharge: 'Episode is discharging; confirm documentation completeness and stop future scheduling.',
      death_at_home: 'Patient expired at home; stop future care delivery and route chart and billing for closeout.',
    }[transitionType] ?? 'Lifecycle transition initiated.'
  )
}

function deriveToastTone(message: string): ToastMessage['tone'] {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('failed') ||
    normalized.includes('error') ||
    normalized.includes('invalid') ||
    normalized.includes('cannot') ||
    normalized.includes('could not') ||
    normalized.includes('remains on hold') ||
    normalized.includes('blocked') ||
    normalized.includes('suspended')
  ) {
    return 'error'
  }

  if (
    normalized.includes('saved') ||
    normalized.includes('updated') ||
    normalized.includes('created') ||
    normalized.includes('submitted') ||
    normalized.includes('resolved') ||
    normalized.includes('connected') ||
    normalized.includes('synced') ||
    normalized.includes('completed')
  ) {
    return 'success'
  }

  return 'info'
}

function summarizeAuditDetails(details?: AuditEvent['details']) {
  if (!details) {
    return 'No event details recorded.'
  }

  if (typeof details === 'string') {
    return details
  }

  const summary = Object.entries(details)
    .slice(0, 3)
    .map(([key, value]) => `${labelizeValue(key)}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join(' · ')

  return summary || 'No event details recorded.'
}

function nextAuditId(events: AuditEvent[]) {
  return events.reduce((highest, event) => Math.max(highest, event.id), 0) + 1
}

function nextAdminUserId(users: AppUser[]) {
  return users.reduce((highest, entry) => Math.max(highest, entry.id), 0) + 1
}

function rebuildDemoSessionActivity(users: AppUser[], currentSessions: SessionActivity[]) {
  const activeThreshold = normalizeDateTimeString(new Date(Date.now() - 12 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')) ?? ''

  return users
    .map((entry) => {
      const existing = currentSessions.find((session) => session.user_id === entry.id)
      const lastLoginAt = normalizeDateTimeString(entry.last_login_at ?? existing?.last_login_at ?? undefined) ?? null
      const activityState =
        lastLoginAt === null
          ? 'never_logged_in'
          : lastLoginAt >= activeThreshold
            ? 'active_window'
            : 'stale_window'

      return {
        user_id: entry.id,
        full_name: entry.full_name,
        email: entry.email,
        role: entry.role,
        status: entry.status ?? 'active',
        mfa_enabled: entry.mfa_enabled ?? false,
        last_login_at: lastLoginAt,
        activity_state: activityState,
        recent_action: existing?.recent_action ?? null,
        recent_model: existing?.recent_model ?? null,
        recent_at: existing?.recent_at ?? null,
      } satisfies SessionActivity
    })
    .sort((left, right) => `${right.last_login_at ?? ''}`.localeCompare(`${left.last_login_at ?? ''}`))
}

function downloadCsvFile(fileName: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(csvEscapeCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

function csvEscapeCell(value: string) {
  const normalized = `${value ?? ''}`.replaceAll('"', '""')
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized
}

function appendQaTaskHistory(history: Array<Record<string, string>> | undefined, entry: Record<string, string>) {
  return [...normalizeQaTaskHistory(history), entry]
}

function appendSummary(existing: string | undefined, note: string) {
  return existing && existing.trim() !== '' ? `${existing} ${note}`.trim() : note
}

function syncQaDrivenClaimHolds(claims: Claim[], qaTasks: QaTask[]) {
  return claims.map((claim) => {
    const openEpisodeTasks = qaTasks.filter((task) => task.episode_id === claim.episode_id && task.status === 'open')
    const qaReasons = qaHoldReasonsForTasks(openEpisodeTasks)
    const preservedReasons = splitHoldReasons(claim.hold_reason).filter((reason) => !isQaManagedHoldReason(reason))
    const nextReasons = [...preservedReasons]

    qaReasons.forEach((reason) => {
      if (!nextReasons.includes(reason)) {
        nextReasons.push(reason)
      }
    })

    return {
      ...claim,
      hold_reason: nextReasons.length > 0 ? nextReasons.join(' | ') : undefined,
    }
  })
}

function qaHoldReasonsForTasks(tasks: QaTask[]) {
  const reasons: string[] = []
  let hasGenericQaBlocker = false

  tasks.forEach((task) => {
    if (task.task_type === 'missed_visit') {
      reasons.push(MISSED_VISIT_HOLD)
      return
    }
    if (task.task_type === 'frequency_change') {
      reasons.push(FREQUENCY_CHANGE_HOLD)
      return
    }
    if (task.task_type === 'visit_reassignment') {
      reasons.push(VISIT_REASSIGNMENT_HOLD)
      return
    }
    if (task.task_type === 'visit_documentation_review') {
      reasons.push(VISIT_DOCUMENTATION_HOLD)
      return
    }

    hasGenericQaBlocker = true
  })

  if (hasGenericQaBlocker) {
    reasons.push(QA_GENERIC_HOLD)
  }

  return Array.from(new Set(reasons))
}

function isQaManagedHoldReason(reason: string) {
  return [QA_GENERIC_HOLD, MISSED_VISIT_HOLD, FREQUENCY_CHANGE_HOLD, VISIT_REASSIGNMENT_HOLD, VISIT_DOCUMENTATION_HOLD].includes(reason)
}

function splitHoldReasons(reason?: string) {
  if (!reason || reason.trim() === '') {
    return []
  }

  return reason.split('|').map((entry) => entry.trim()).filter(Boolean)
}

async function resolveLocation() {
  if (!('geolocation' in navigator)) {
    return { latitude: 33.7867, longitude: -84.3837, accuracy: 50 }
  }

  return new Promise<{ latitude: number; longitude: number; accuracy: number }>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy),
        })
      },
      () => resolve({ latitude: 33.7867, longitude: -84.3837, accuracy: 50 }),
      { enableHighAccuracy: true, timeout: 3000 },
    )
  })
}
