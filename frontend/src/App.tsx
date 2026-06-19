import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
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
  type QaAssignmentDraft,
} from './components/ui'
import { api } from './lib/api'
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
import {
  normalizeAdmissionSnapshot,
  normalizeAssessmentAnswers,
  normalizeAssessmentPayload,
  normalizeDateTimeString,
  normalizeDocumentationPayload,
  normalizeQaTaskHistory,
  normalizeQapiProjects,
  normalizeQaTasksForUi,
} from './domain/normalizers'
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
} from './domain/workflow'
import { createDemoDataset } from './lib/demoData'
import { addOfflineAction, loadOfflineQueue, removeOfflineAction } from './lib/offlineQueue'
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
} from './lib/types'

const EMPTY_DATASET: AppDataset = createDemoDataset()
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

function App() {
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

  const connectionLightTone = mode === 'api' && isBrowserOnline ? 'success' : 'error'
  const syncLightTone = offlineQueue.length === 0 ? 'success' : 'error'
  const connectionLightLabel = mode === 'api' && isBrowserOnline ? 'Connected' : mode === 'api' ? 'Offline' : 'Demo'
  const syncLightLabel = offlineQueue.length === 0 ? 'Synced' : `${offlineQueue.length} queued`
  const speechRecognitionSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    return () => {
      assessmentRecognitionRef.current?.stop()
    }
  }, [])

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

export default App
