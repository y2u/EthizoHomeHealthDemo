export type UserRole = 'Intake' | 'Clinician' | 'Billing' | 'QA' | 'Admin'

export interface User {
  id: number
  full_name: string
  email: string
  role: UserRole
}

export interface SecuritySettings {
  id?: number
  require_mfa: boolean
  session_timeout_minutes: number
  remember_device_days: number
  password_rotation_days: number
  attachment_retention_days: number
  allowed_ip_ranges?: string | null
  enforce_device_attestation: boolean
  created?: string
  modified?: string
}

export interface AuditEvent {
  id: number
  actor_email: string
  action: string
  model: string
  model_id: number
  details?: Record<string, unknown> | string | null
  created: string
}

export interface AppUser {
  id: number
  full_name: string
  email: string
  role: UserRole
  mobile?: string | null
  status?: string
  mfa_enabled?: boolean
  last_login_at?: string | null
  created?: string
  modified?: string
}

export interface SessionActivity {
  user_id: number
  full_name: string
  email: string
  role: UserRole
  status: string
  mfa_enabled: boolean
  last_login_at?: string | null
  activity_state: string
  recent_action?: string | null
  recent_model?: string | null
  recent_at?: string | null
}

export interface DashboardMetrics {
  patients: number
  referrals: number
  episodes: number
  visitsToday: number
  qaTasks: number
  claimsOnHold: number
}

export interface Patient {
  id: number
  first_name: string
  last_name: string
  dob: string
  gender?: string
  payer_type: string
  medicare_number?: string
  insurance_member_id?: string
  phone?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postal_code?: string
  emergency_contact_name?: string
  emergency_contact_relationship?: string
  emergency_contact_phone?: string
  status: string
  primary_physician?: string
  responsible_party_name?: string
  responsible_party_relationship?: string
  responsible_party_phone?: string
}

export interface Referral {
  id: number
  patient_id: number
  patient_name: string
  source_name: string
  admission_source?: string
  payer_type: string
  primary_diagnosis: string
  requested_disciplines?: string[] | string
  order_status?: string
  physician_orders_signed?: boolean
  physician_orders_signed_at?: string
  face_to_face_date?: string
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
  planned_soc_date: string
  intake_ready: boolean
  status: string
  notes?: string
}

export interface ReferralDocument {
  id: number
  referral_id: number
  document_type: string
  document_status: string
  source_name?: string
  received_at?: string
  signed_at?: string
  original_file_name?: string
  stored_file_name?: string
  mime_type?: string
  file_size?: number
  attachment_path?: string
  document_note?: string
}

export interface PhysicianOrder {
  id: number
  referral_id?: number
  episode_id: number
  referral_document_id?: number
  order_scope: string
  version_number: number
  order_status: string
  active: boolean
  sent_at?: string
  received_at?: string
  signed_at?: string
  signer_name?: string
  order_summary?: string
  order_note?: string
}

export interface PatientComplianceDocument {
  id: number
  patient_id: number
  episode_id?: number | null
  document_type: string
  status: string
  signed_at?: string | null
  delivery_method?: string | null
  notes?: string | null
  created?: string
  modified?: string
}

export interface PatientNotice {
  id: number
  patient_id: number
  episode_id?: number | null
  notice_type: string
  status: string
  reason?: string | null
  billing_impact?: string | null
  delivered_at?: string | null
  signed_at?: string | null
  created?: string
  modified?: string
}

export interface PatientMedication {
  id: number
  patient_id: number
  episode_id?: number | null
  medication_name: string
  dosage?: string | null
  route?: string | null
  frequency?: string | null
  start_date?: string | null
  end_date?: string | null
  status: string
  high_risk: boolean
  teaching_completed: boolean
  reconciled_at?: string | null
  prescriber_name?: string | null
  change_reason?: string | null
  created?: string
  modified?: string
}

export interface PatientAllergy {
  id: number
  patient_id: number
  allergen: string
  reaction?: string | null
  severity?: string | null
  verified_at?: string | null
  created?: string
  modified?: string
}

export interface VerbalOrder {
  id: number
  episode_id: number
  physician_name: string
  order_source?: string | null
  order_summary: string
  ordered_service?: string | null
  received_by?: string | null
  read_back_completed: boolean
  received_at?: string | null
  sent_for_signature_at?: string | null
  physician_signed_at?: string | null
  status: string
  created?: string
  modified?: string
}

export interface AideSupervisionEvent {
  id: number
  episode_id: number
  aide_name: string
  supervising_clinician?: string | null
  care_plan_tasks?: string | null
  supervision_type?: string | null
  supervised_at?: string | null
  next_due_at?: string | null
  status: string
  findings?: string | null
  created?: string
  modified?: string
}

export interface IncidentReport {
  id: number
  patient_id?: number | null
  episode_id?: number | null
  visit_id?: number | null
  event_type: string
  severity?: string | null
  occurred_at?: string | null
  description?: string | null
  follow_up_owner?: string | null
  follow_up_due_at?: string | null
  qapi_linked: boolean
  status: string
  created?: string
  modified?: string
}

export interface InfectionLog {
  id: number
  patient_id?: number | null
  episode_id?: number | null
  infection_type: string
  identified_at?: string | null
  source?: string | null
  intervention_summary?: string | null
  physician_notified: boolean
  qapi_linked: boolean
  status: string
  created?: string
  modified?: string
}

export interface PayerAuthorization {
  id: number
  episode_id: number
  payer_type: string
  authorization_number?: string | null
  authorized_visits?: number | null
  used_visits: number
  effective_date?: string | null
  expiration_date?: string | null
  status: string
  verification_notes?: string | null
  created?: string
  modified?: string
}

export interface EligibilityCheck {
  id: number
  patient_id?: number | null
  episode_id?: number | null
  payer_type: string
  check_status: string
  checked_at?: string | null
  coverage_summary?: string | null
  response_reference?: string | null
  created?: string
  modified?: string
}

export interface ClaimTransaction {
  id: number
  claim_id?: number | null
  episode_id?: number | null
  transaction_type: string
  transaction_status: string
  payer_control_number?: string | null
  payload_summary?: string | null
  response_summary?: string | null
  transmitted_at?: string | null
  created?: string
  modified?: string
}

export interface RemittancePosting {
  id: number
  claim_id?: number | null
  episode_id?: number | null
  era_reference?: string | null
  payment_amount?: number | string | null
  adjustment_amount?: number | string | null
  reason_codes?: string | null
  posted_at?: string | null
  reconciliation_status: string
  created?: string
  modified?: string
}

export interface DmeSupplyOrder {
  id: number
  episode_id: number
  item_name: string
  order_type: string
  status: string
  ordered_at?: string | null
  delivered_at?: string | null
  usage_documented: boolean
  billing_relevance?: string | null
  plan_of_care_linked: boolean
  created?: string
  modified?: string
}

export interface CaseConference {
  id: number
  episode_id: number
  conference_date?: string | null
  participants?: string | null
  decisions?: string | null
  follow_up_owner?: string | null
  follow_up_due_at?: string | null
  cadence?: string | null
  status: string
  created?: string
  modified?: string
}

export interface SurveyReadinessCategory {
  key: string
  label: string
  status: string
  score: number
  issue_count: number
  summary: string
}

export interface SurveyReadinessSnapshot {
  id?: number
  period_key: string
  category_scores: SurveyReadinessCategory[] | string
  open_counts: Record<string, number> | string
  generated_at?: string | null
  created?: string
  modified?: string
}

export interface SurveyReadinessSummary {
  period_key: string
  generated_at: string
  category_scores: SurveyReadinessCategory[]
  open_counts: Record<string, number>
  history: SurveyReadinessSnapshot[]
}

export interface OasisSubmission {
  id: number
  episode_id: number
  assessment_id?: number | null
  submission_status: string
  iqies_ready: boolean
  export_payload?: string | Record<string, unknown> | null
  readiness_notes?: string | null
  submission_reference?: string | null
  submitted_at?: string | null
  acknowledged_at?: string | null
  acknowledgment_status?: string | null
  acknowledgment_note?: string | null
  rejection_note?: string | null
}

export interface PlanOfCare {
  id: number
  episode_id: number
  assessment_id?: number | null
  physician_order_id?: number | null
  version_number: number
  review_status: string
  effective_date?: string | null
  plan_summary?: string | null
  goal_summary?: string | null
  intervention_summary?: string | null
  printable_content?: string | null
  physician_review_note?: string | null
  approved_at?: string | null
}

export interface CoderReviewItem {
  id: number
  episode_id: number
  claim_id?: number | null
  assessment_id?: number | null
  category: string
  status: string
  priority: string
  title: string
  details?: string | null
  recommendation?: string | null
  correction_note?: string | null
  resolved_at?: string | null
}

export interface CommunicationLogEntry {
  id: number
  episode_id: number
  visit_id?: number | null
  entry_type: string
  contact_name: string
  contact_role?: string | null
  method: string
  topic: string
  outcome?: string | null
  follow_up_owner?: string | null
  follow_up_due_at?: string | null
  status: string
  created?: string
}

export interface FaxMessage {
  id: number
  referral_id?: number | null
  source_name: string
  from_number?: string | null
  subject?: string | null
  packet_type: string
  routing_status: string
  received_at: string
  attachment_note?: string | null
  linked_document_count: number
  route_note?: string | null
}

export interface QapiProject {
  id: number
  title: string
  measure_name: string
  owner_name: string
  review_cadence: string
  status: string
  target_value?: string | null
  current_value?: string | null
  intervention_plan?: string | null
  evidence_summary?: string | null
  linked_task_ids?: number[] | string | null
  linked_audit_event_ids?: number[] | string | null
  last_reviewed_at?: string | null
}

export interface QualityMetricSnapshot {
  id?: number
  metric_key: string
  metric_label: string
  period_key: string
  score: number
  numerator: number
  denominator: number
  trend_value?: number | null
  notes?: string | null
  captured_at?: string | null
}

export interface QualityMetricsSummary {
  period_key: string
  metrics: Array<{
    key: string
    label: string
    score: number
    numerator: number
    denominator: number
    trend_value?: number | null
    note?: string
  }>
  history: QualityMetricSnapshot[]
}

export interface UtilizationRiskSnapshot {
  episode_id: number
  period_number: number
  projected_visits: number
  threshold_visits: number
  risk_level: string
  warning_note?: string | null
  recommended_action?: string | null
}

export interface ClinicalDecisionAlert {
  severity: string
  source: string
  summary: string
  resolution_hint: string
}

export interface DocumentationIntegritySummary {
  episode_id: number
  assessment_score: number
  visit_score: number
  overall_score: number
  blockers: string[]
  warnings: string[]
}

export interface PdgmBreakdown {
  group_code: string
  clinical_group: string
  timing: string
  functional_level: string
  comorbidity_adjustment: string
  admission_source: string
  explanation: string
}

export interface EpisodeInsightSummary {
  episode_id: number
  clinical_decision_support: ClinicalDecisionAlert[]
  documentation_integrity: DocumentationIntegritySummary
  utilization_risk: UtilizationRiskSnapshot
  pdgm_breakdown: PdgmBreakdown
}

export interface EpisodeAdmissionSnapshot {
  referral_source?: string
  admission_source?: string
  planned_soc_date?: string
  face_to_face_date?: string
  primary_diagnosis?: string
  requested_disciplines?: string[]
  order_status?: string
  physician_orders_signed?: boolean
  physician_orders_signed_at?: string
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
}

export interface Episode {
  id: number
  patient_id: number
  patient_name: string
  referral_id?: number
  cert_start_date: string
  cert_end_date: string
  start_of_care_date?: string
  episode_status: string
  payer_type: string
  primary_diagnosis: string
  admission_readiness_snapshot?: EpisodeAdmissionSnapshot | string | null
  noa_due_date?: string
  pdgm_group_code?: string
  oasis_version_required?: string
}

export interface Assessment {
  id: number
  episode_id: number
  assessment_type: string
  completed_at: string
  oasis_version: string
  status: string
  principal_diagnosis_code: string
  functional_score: number
  comorbidity_level: string
  medication_reconciliation_completed?: boolean
  homebound_status?: string
  homebound_narrative?: string
  fall_risk_level?: string
  hospitalization_risk?: string
  emergency_preparedness_reviewed?: boolean
  care_plan_goals?: string
  clinical_summary?: string
  answers?: Record<string, string>
  assessment_payload?: AssessmentClinicalPayload | string | null
}

export interface AssessmentClinicalPayload {
  medication_review?: {
    issues?: string
    high_risk_meds?: string
  }
  wounds?: {
    present?: boolean
    notes?: string
  }
  caregiver_support?: {
    availability?: string
    notes?: string
  }
  risk_notes?: string
}

export interface VisitDocumentationPayload {
  visit_focus?: string
  visit_narrative?: string
  interventions?: string
  patient_response?: string
  vitals?: string
  pain_level?: string
  teaching_topics?: string
  medication_review?: string
  wound_care?: string
  mobility_status?: string
  adl_support?: string
  psychosocial_notes?: string
  abnormal_findings?: string
  physician_contact_needed?: boolean
  follow_up_plan?: string
  next_visit_focus?: string
}

export interface Visit {
  id: number
  episode_id: number
  patient_id: number
  patient_name: string
  visit_type: string
  discipline: string
  scheduled_start: string
  scheduled_end: string
  actual_start?: string
  actual_end?: string
  clinician_name: string
  status: string
  requires_evv: boolean
  documentation_summary?: string
  documentation_status?: string
  documentation_payload?: VisitDocumentationPayload | string | null
  qa_review_notes?: string
  reassigned_from_clinician?: string
  missed_reason?: string
  follow_up_plan?: string
  sync_status: string
}

export interface EvvRecord {
  id: number
  visit_id: number
  state_code: string
  vendor_name: string
  status: string
  exception_reason?: string
  submitted_at?: string
  submission_reference?: string
  reconciled_at?: string
}

export interface Claim {
  id: number
  episode_id: number
  claim_type: string
  status: string
  amount?: number | string
  hold_reason?: string
  submission_reference?: string
  submitted_at?: string
  payer_claim_number?: string
  accepted_at?: string
  rejected_at?: string
  rejection_reason?: string
  payment_amount?: number | string
  remittance_reference?: string
  paid_at?: string
  voided_at?: string
  void_reason?: string
  corrected_from_claim_id?: number
  correction_reason?: string
}

export interface QaTask {
  id: number
  episode_id?: number
  visit_id?: number
  assessment_id?: number
  task_type: string
  priority: string
  base_priority?: string
  status: string
  title: string
  details?: string
  assigned_role?: string
  assigned_user_name?: string
  assigned_at?: string
  assignment_history?: Array<Record<string, string>>
  escalation_status?: string
  escalation_reason?: string
  escalation_note?: string
  last_escalated_at?: string
  is_overdue?: boolean
  due_at?: string
  resolved_at?: string
}

export interface EpisodeReadiness {
  episode_id: number
  soc_visit_completed: boolean
  finalized_assessment_exists: boolean
  open_qa_tasks: number
  pending_evv_records: number
  claim_holds: number
  ready_to_activate: boolean
  primary_blocker?: string | null
  blockers: string[]
}

export interface EpisodeReviewSummary {
  episode_id: number
  patient_name: string
  episode_status: string
  ready_to_activate: boolean
  ready_to_bill: boolean
  activation_blockers: string[]
  billing_blockers: string[]
  open_qa_tasks: number
  pending_evv_records: number
  unsigned_active_orders: number
  completed_visits: number
  locked_visits: number
  hold_reasons: string[]
  open_task_titles: string[]
  active_order_summaries: string[]
  recent_visit_highlights: string[]
}

export interface AppDataset {
  metrics: DashboardMetrics
  patients: Patient[]
  referrals: Referral[]
  referralDocuments: ReferralDocument[]
  physicianOrders: PhysicianOrder[]
  patientComplianceDocuments: PatientComplianceDocument[]
  patientNotices: PatientNotice[]
  patientMedications: PatientMedication[]
  patientAllergies: PatientAllergy[]
  verbalOrders: VerbalOrder[]
  aideSupervisionEvents: AideSupervisionEvent[]
  incidentReports: IncidentReport[]
  infectionLogs: InfectionLog[]
  payerAuthorizations: PayerAuthorization[]
  eligibilityChecks: EligibilityCheck[]
  claimTransactions: ClaimTransaction[]
  remittancePostings: RemittancePosting[]
  dmeSupplyOrders: DmeSupplyOrder[]
  caseConferences: CaseConference[]
  surveyReadinessSummary: SurveyReadinessSummary
  episodes: Episode[]
  assessments: Assessment[]
  visits: Visit[]
  evvRecords: EvvRecord[]
  claims: Claim[]
  qaTasks: QaTask[]
  oasisSubmissions: OasisSubmission[]
  planOfCares: PlanOfCare[]
  coderReviewItems: CoderReviewItem[]
  communicationLogEntries: CommunicationLogEntry[]
  faxMessages: FaxMessage[]
  qapiProjects: QapiProject[]
  qualityMetricsSummary: QualityMetricsSummary
  episodeInsights: EpisodeInsightSummary[]
  securitySettings: SecuritySettings
  auditEvents: AuditEvent[]
  adminUsers: AppUser[]
  sessionActivity: SessionActivity[]
}

export interface OfflineAction {
  id: string
  action: 'check-in' | 'check-out'
  visitId: number
  payload: Record<string, unknown>
  createdAt: string
}
