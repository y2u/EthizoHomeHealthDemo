import type { ModuleProps } from './moduleTypes'
import { EmptyState, FormGrid, Input, Modal, Panel, Select, WizardSteps, WorkspaceHeader } from '../components/ui'
import { formatStateCode, formatUsPhone, formatZipCode, labelizeValue } from '../domain/formatters'

const INSURANCE_OPTIONS = ['Medicare', 'Medicaid', 'Medicare Advantage', 'Commercial', 'Tricare', 'VA', 'Private Pay', 'Other'] as const

export function ReferralsModule({ controller }: ModuleProps) {
  const {
    dataset,
    referralWizardStep,
    setReferralWizardStep,
    referralModalOpen,
    setReferralModalOpen,
    referralForm,
    setReferralForm,
    editingReferralId,
    faxMessageForm,
    setFaxMessageForm,
    faxRoutingForm,
    setFaxRoutingForm,
    openNewReferralModal,
    copyPatientAddressToReferral,
    copyPatientPcpToReferral,
    chooseReferralPatient,
    resetReferralForm,
    loadReferralIntoForm,
    saveReferral,
    convertReferral,
    saveFaxMessage,
    routeFaxMessageAction,
    nameForPatient,
  } = controller

  return (
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
  )
}
