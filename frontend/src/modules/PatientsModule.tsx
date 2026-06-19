import type { ModuleProps } from './moduleTypes'
import { EmptyState, FieldNote, FormGrid, Input, Modal, Panel, Select, WizardSteps, WorkspaceHeader } from '../components/ui'
import { formatAddress, formatCoverage, formatPatientContacts, formatStateCode, formatUsPhone, formatZipCode, labelizeValue } from '../domain/formatters'

const INSURANCE_OPTIONS = ['Medicare', 'Medicaid', 'Medicare Advantage', 'Commercial', 'Tricare', 'VA', 'Private Pay', 'Other'] as const
const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Other', 'Unknown'] as const

export function PatientsModule({ controller }: ModuleProps) {
  const {
    dataset,
    patientWizardStep,
    setPatientWizardStep,
    patientModalOpen,
    setPatientModalOpen,
    patientForm,
    setPatientForm,
    editingPatientId,
    complianceDocumentForm,
    setComplianceDocumentForm,
    patientNoticeForm,
    setPatientNoticeForm,
    medicationForm,
    setMedicationForm,
    allergyForm,
    setAllergyForm,
    insuranceIdLabel,
    insuranceIdHint,
    openNewPatientModal,
    savePatient,
    copyEmergencyToResponsibleParty,
    copyPatientPhoneToEmergencyContact,
    resetPatientForm,
    loadPatientIntoForm,
    saveComplianceDocument,
    savePatientNotice,
    saveMedication,
    saveAllergy,
    selectedPatient,
    selectedPatientComplianceDocuments,
    selectedPatientNotices,
    selectedPatientMedications,
    selectedPatientAllergies,
    nameForPatient,
  } = controller

  return (
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
  )
}
