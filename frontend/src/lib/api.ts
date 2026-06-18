import type {
  AppUser,
  Assessment,
  AideSupervisionEvent,
  AuditEvent,
  CaseConference,
  Claim,
  ClaimTransaction,
  CoderReviewItem,
  CommunicationLogEntry,
  DmeSupplyOrder,
  EligibilityCheck,
  Episode,
  EpisodeInsightSummary,
  EpisodeReadiness,
  EpisodeReviewSummary,
  EvvRecord,
  FaxMessage,
  IncidentReport,
  InfectionLog,
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
  QualityMetricsSummary,
  Referral,
  ReferralDocument,
  RemittancePosting,
  SecuritySettings,
  SessionActivity,
  SurveyReadinessSummary,
  User,
  VerbalOrder,
  Visit,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  token?: string
  user?: User
  metrics?: {
    patients: number
    referrals: number
    episodes: number
    visitsToday: number
    qaTasks: number
    claimsOnHold: number
  }
  message?: string
  errors?: Record<string, unknown>
}

function flattenValidationErrors(errors: Record<string, unknown> | undefined) {
  if (!errors) {
    return ''
  }

  const messages = Object.entries(errors).flatMap(([field, value]) => {
    if (!value || typeof value !== 'object') {
      return []
    }

    return Object.values(value as Record<string, unknown>)
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => `${field}: ${entry}`)
  })

  return messages.join(' ')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const payload = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || flattenValidationErrors(payload.errors) || 'API request failed')
  }

  return payload
}

async function requestFormData<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const payload = (await response.json()) as ApiEnvelope<T>
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || flattenValidationErrors(payload.errors) || 'API request failed')
  }

  return payload
}

export const api = {
  login(email: string, password: string) {
    return request<never>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  me(token: string) {
    return request<User>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  dashboard(token: string) {
    return request<never>('/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  adminSettings(token: string) {
    return request<SecuritySettings>('/admin/settings', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  updateAdminSettings(token: string, body: Record<string, unknown>) {
    return request<SecuritySettings>('/admin/settings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  adminUsers(token: string) {
    return request<AppUser[]>('/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addAdminUser(token: string, body: Record<string, unknown>) {
    return request<AppUser>('/admin/users/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  updateAdminUser(token: string, id: number, body: Record<string, unknown>) {
    return request<AppUser>(`/admin/users/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  sessionActivity(token: string) {
    return request<SessionActivity[]>('/admin/session-activity', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  auditEvents(token: string) {
    return request<AuditEvent[]>('/audit-events', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  patients(token: string) {
    return request<Patient[]>('/patients', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addPatient(token: string, body: Partial<Patient>) {
    return request<Patient>('/patients/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  updatePatient(token: string, id: number, body: Partial<Patient>) {
    return request<Patient>(`/patients/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  patientComplianceDocuments(token: string, patientId: number) {
    return request<PatientComplianceDocument[]>(`/patients/${patientId}/compliance-documents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addPatientComplianceDocument(token: string, patientId: number, body: Record<string, unknown>) {
    return request<PatientComplianceDocument>(`/patients/${patientId}/compliance-documents/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  patientNotices(token: string, patientId: number) {
    return request<PatientNotice[]>(`/patients/${patientId}/notices`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addPatientNotice(token: string, patientId: number, body: Record<string, unknown>) {
    return request<PatientNotice>(`/patients/${patientId}/notices/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  patientMedications(token: string, patientId: number) {
    return request<PatientMedication[]>(`/patients/${patientId}/medications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addPatientMedication(token: string, patientId: number, body: Record<string, unknown>) {
    return request<PatientMedication>(`/patients/${patientId}/medications/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  patientAllergies(token: string, patientId: number) {
    return request<PatientAllergy[]>(`/patients/${patientId}/allergies`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addPatientAllergy(token: string, patientId: number, body: Record<string, unknown>) {
    return request<PatientAllergy>(`/patients/${patientId}/allergies/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  referrals(token: string) {
    return request<Referral[]>('/referrals', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  referralDocuments(token: string) {
    return request<ReferralDocument[]>('/referral-documents', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addReferral(token: string, body: Record<string, unknown>) {
    return request<Referral>('/referrals/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  updateReferral(token: string, id: number, body: Record<string, unknown>) {
    return request<Referral>(`/referrals/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  updateReferralIntakeDocs(token: string, id: number, body: Record<string, unknown>) {
    return request<Referral>(`/referrals/${id}/intake-docs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  addReferralDocument(token: string, referralId: number, body: Record<string, unknown>) {
    return request<ReferralDocument>(`/referrals/${referralId}/documents/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  updateReferralDocument(token: string, id: number, body: Record<string, unknown>) {
    return request<ReferralDocument>(`/referral-documents/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  uploadReferralDocumentAttachment(token: string, id: number, file: File) {
    const formData = new FormData()
    formData.append('attachment', file)

    return requestFormData<ReferralDocument>(`/referral-documents/${id}/attachment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
  },
  async downloadReferralDocument(token: string, id: number) {
    const response = await fetch(`${API_BASE_URL}/referral-documents/${id}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Attachment download failed.')
    }

    return {
      blob: await response.blob(),
      fileName: response.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/)?.[1] ?? `referral-document-${id}`,
    }
  },
  convertReferral(token: string, id: number) {
    return request<Episode>(`/referrals/${id}/convert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
  },
  episodes(token: string) {
    return request<Episode[]>('/episodes', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  physicianOrders(token: string) {
    return request<PhysicianOrder[]>('/physician-orders', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  episodeReadiness(token: string, id: number) {
    return request<EpisodeReadiness>(`/episodes/${id}/readiness`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  episodeReviewSummary(token: string, id: number) {
    return request<EpisodeReviewSummary>(`/episodes/${id}/review-summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  episodeInsights(token: string, id: number) {
    return request<EpisodeInsightSummary>(`/episodes/${id}/insights`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  episodeOrderDraft(token: string, id: number, scope: string) {
    return request<{
      episode_id: number
      order_scope: string
      order_summary: string
      order_note: string
      recent_visit_highlights: string[]
    }>(`/episodes/${id}/orders/draft?scope=${encodeURIComponent(scope)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  updateEpisodeAdmission(token: string, id: number, body: Record<string, unknown>) {
    return request<Episode>(`/episodes/${id}/admission/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  activateEpisode(token: string, id: number) {
    return request<Episode>(`/episodes/${id}/activate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
  },
  addEpisodeOrder(token: string, id: number, body: Record<string, unknown>) {
    return request<PhysicianOrder>(`/episodes/${id}/orders/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  updatePhysicianOrder(token: string, id: number, body: Record<string, unknown>) {
    return request<PhysicianOrder>(`/physician-orders/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  transitionEpisode(token: string, id: number, body: Record<string, unknown>) {
    return request<{
      episode: Episode
      transition_type: string
      qa_task_id: number
      created_visit_ids: number[]
    }>(`/episodes/${id}/transition`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  episodeVerbalOrders(token: string, episodeId: number) {
    return request<VerbalOrder[]>(`/episodes/${episodeId}/verbal-orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addEpisodeVerbalOrder(token: string, episodeId: number, body: Record<string, unknown>) {
    return request<VerbalOrder>(`/episodes/${episodeId}/verbal-orders/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  episodeAideSupervision(token: string, episodeId: number) {
    return request<AideSupervisionEvent[]>(`/episodes/${episodeId}/aide-supervision`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addEpisodeAideSupervision(token: string, episodeId: number, body: Record<string, unknown>) {
    return request<AideSupervisionEvent>(`/episodes/${episodeId}/aide-supervision/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  episodeIncidents(token: string, episodeId: number) {
    return request<IncidentReport[]>(`/episodes/${episodeId}/incidents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addEpisodeIncident(token: string, episodeId: number, body: Record<string, unknown>) {
    return request<IncidentReport>(`/episodes/${episodeId}/incidents/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  episodeInfections(token: string, episodeId: number) {
    return request<InfectionLog[]>(`/episodes/${episodeId}/infections`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addEpisodeInfection(token: string, episodeId: number, body: Record<string, unknown>) {
    return request<InfectionLog>(`/episodes/${episodeId}/infections/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  episodeAuthorizations(token: string, episodeId: number) {
    return request<PayerAuthorization[]>(`/episodes/${episodeId}/authorizations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addEpisodeAuthorization(token: string, episodeId: number, body: Record<string, unknown>) {
    return request<PayerAuthorization>(`/episodes/${episodeId}/authorizations/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  episodeEligibilityChecks(token: string, episodeId: number) {
    return request<EligibilityCheck[]>(`/episodes/${episodeId}/eligibility-checks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addEpisodeEligibilityCheck(token: string, episodeId: number, body: Record<string, unknown>) {
    return request<EligibilityCheck>(`/episodes/${episodeId}/eligibility-checks/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  episodeDmeSupplyOrders(token: string, episodeId: number) {
    return request<DmeSupplyOrder[]>(`/episodes/${episodeId}/dme-supply-orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addEpisodeDmeSupplyOrder(token: string, episodeId: number, body: Record<string, unknown>) {
    return request<DmeSupplyOrder>(`/episodes/${episodeId}/dme-supply-orders/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  episodeCaseConferences(token: string, episodeId: number) {
    return request<CaseConference[]>(`/episodes/${episodeId}/case-conferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addEpisodeCaseConference(token: string, episodeId: number, body: Record<string, unknown>) {
    return request<CaseConference>(`/episodes/${episodeId}/case-conferences/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  oasisSubmissions(token: string) {
    return request<OasisSubmission[]>('/oasis-submissions', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  prepareOasisSubmission(token: string, episodeId: number) {
    return request<OasisSubmission>(`/episodes/${episodeId}/oasis-submissions/prepare`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
  },
  updateOasisSubmission(token: string, id: number, body: Record<string, unknown>) {
    return request<OasisSubmission>(`/oasis-submissions/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  planOfCare(token: string) {
    return request<PlanOfCare[]>('/plan-of-care', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  generatePlanOfCare(token: string, episodeId: number) {
    return request<PlanOfCare>(`/episodes/${episodeId}/plan-of-care/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
  },
  updatePlanOfCare(token: string, id: number, body: Record<string, unknown>) {
    return request<PlanOfCare>(`/plan-of-care/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  coderReview(token: string) {
    return request<CoderReviewItem[]>('/coder-review', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  syncCoderReview(token: string, episodeId: number) {
    return request<CoderReviewItem[]>(`/episodes/${episodeId}/coder-review/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
  },
  updateCoderReview(token: string, id: number, body: Record<string, unknown>) {
    return request<CoderReviewItem>(`/coder-review/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  communicationLog(token: string) {
    return request<CommunicationLogEntry[]>('/communication-log', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addCommunicationLog(token: string, episodeId: number, body: Record<string, unknown>) {
    return request<CommunicationLogEntry>(`/episodes/${episodeId}/communication-log/add`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  updateCommunicationLog(token: string, id: number, body: Record<string, unknown>) {
    return request<CommunicationLogEntry>(`/communication-log/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  faxInbox(token: string) {
    return request<FaxMessage[]>('/fax-inbox', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addFaxMessage(token: string, body: Record<string, unknown>) {
    return request<FaxMessage>('/fax-inbox/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  routeFaxMessage(token: string, id: number, body: Record<string, unknown>) {
    return request<FaxMessage>(`/fax-inbox/${id}/route`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  qapiProjects(token: string) {
    return request<QapiProject[]>('/qapi-projects', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addQapiProject(token: string, body: Record<string, unknown>) {
    return request<QapiProject>('/qapi-projects/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  updateQapiProject(token: string, id: number, body: Record<string, unknown>) {
    return request<QapiProject>(`/qapi-projects/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  qualityMetrics(token: string, period = 'all') {
    return request<QualityMetricsSummary>(`/quality-metrics?period=${encodeURIComponent(period)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  captureQualityMetrics(token: string, periodKey: string) {
    return request<QualityMetricsSummary>('/quality-metrics/capture', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ period_key: periodKey }),
    })
  },
  surveyReadiness(token: string) {
    return request<SurveyReadinessSummary>('/admin/survey-readiness', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  captureSurveyReadiness(token: string, periodKey: string) {
    return request<SurveyReadinessSummary>('/admin/survey-readiness/capture', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ period_key: periodKey }),
    })
  },
  assessments(token: string) {
    return request<Assessment[]>('/assessments', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addAssessment(token: string, body: Record<string, unknown>) {
    return request<Assessment>('/assessments/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  updateAssessment(token: string, id: number, body: Record<string, unknown>) {
    return request<Assessment>(`/assessments/${id}/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  visits(token: string) {
    return request<Visit[]>('/visits', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addVisit(token: string, body: Record<string, unknown>) {
    return request<Visit>('/visits/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  documentVisit(token: string, id: number, body: Record<string, unknown>) {
    return request<Visit>(`/visits/${id}/document`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  lockVisitDocumentation(token: string, id: number, body: Record<string, unknown>) {
    return request<Visit>(`/visits/${id}/lock-documentation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  reassignVisit(token: string, id: number, body: Record<string, unknown>) {
    return request<Visit>(`/visits/${id}/reassign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  rescheduleVisit(token: string, id: number, body: Record<string, unknown>) {
    return request<Visit>(`/visits/${id}/reschedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  markVisitMissed(token: string, id: number, body: Record<string, unknown>) {
    return request<Visit>(`/visits/${id}/mark-missed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  visitAction(token: string, id: number, action: 'check-in' | 'check-out', body: Record<string, unknown>) {
    return request<Visit>(`/visits/${id}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  evv(token: string) {
    return request<EvvRecord[]>('/evv', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  submitEvv(token: string, id: number) {
    return request<EvvRecord>(`/evv/${id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
  },
  markEvvException(token: string, id: number, body: Record<string, unknown>) {
    return request<EvvRecord>(`/evv/${id}/mark-exception`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  reconcileEvv(token: string, id: number) {
    return request<EvvRecord>(`/evv/${id}/reconcile`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
  },
  claims(token: string) {
    return request<Claim[]>('/claims', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  claimTransactions(token: string) {
    return request<ClaimTransaction[]>('/billing/claim-transactions', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addClaimTransaction(token: string, body: Record<string, unknown>) {
    return request<ClaimTransaction>('/billing/claim-transactions/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  remittancePostings(token: string) {
    return request<RemittancePosting[]>('/billing/remittance-postings', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  addRemittancePosting(token: string, body: Record<string, unknown>) {
    return request<RemittancePosting>('/billing/remittance-postings/add', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  submitClaim(token: string, id: number) {
    return request<Claim>(`/claims/${id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
  },
  acceptClaim(token: string, id: number, body: Record<string, unknown>) {
    return request<Claim>(`/claims/${id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  rejectClaim(token: string, id: number, body: Record<string, unknown>) {
    return request<Claim>(`/claims/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  postClaimPayment(token: string, id: number, body: Record<string, unknown>) {
    return request<Claim>(`/claims/${id}/post-payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  voidClaim(token: string, id: number, body: Record<string, unknown>) {
    return request<Claim>(`/claims/${id}/void`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  resubmitCorrectedClaim(token: string, id: number, body: Record<string, unknown>) {
    return request<Claim>(`/claims/${id}/resubmit-corrected`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  qa(token: string) {
    return request<QaTask[]>('/qa', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
  assignQa(token: string, id: number, body: Record<string, unknown>) {
    return request<QaTask>(`/qa/${id}/assign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  escalateQa(token: string, id: number, body: Record<string, unknown>) {
    return request<QaTask>(`/qa/${id}/escalate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },
  resolveQa(token: string, id: number) {
    return request<QaTask>(`/qa/${id}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
  },
}
