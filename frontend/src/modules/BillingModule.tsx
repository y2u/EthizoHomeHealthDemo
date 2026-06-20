import type { ModuleProps } from './moduleTypes'
import { EmptyState, FieldNote, FormGrid, Input, Panel, Select, WorkspaceHeader } from '../components/ui'
import { formatCurrency, formatDueAt, labelizeValue } from '../domain/formatters'
import { buildDemoEpisodeReviewSummary } from '../domain/workflow'

export function BillingModule({ controller }: ModuleProps) {
  const {
    dataset,
    billingQueueOwnerFilter,
    setBillingQueueOwnerFilter,
    billingQueueBlockerFilter,
    setBillingQueueBlockerFilter,
    claimLifecycleForm,
    setClaimLifecycleForm,
    evvLifecycleForm,
    setEvvLifecycleForm,
    coderReviewForm,
    setCoderReviewForm,
    claimTransactionForm,
    setClaimTransactionForm,
    remittanceForm,
    setRemittanceForm,
    prepareClaimLifecycleAction,
    prepareEvvLifecycleAction,
    loadCoderReviewIntoForm,
    applyEpisodeContext,
    resolveNextEpisodeBlocker,
    submitClaim,
    runClaimLifecycleAction,
    submitEvv,
    runEvvLifecycleAction,
    syncCoderReviewForSelectedEpisode,
    saveCoderReviewItem,
    saveClaimTransaction,
    saveRemittancePosting,
    runBillingFollowUpAction,
    selectedEpisodeClaimTransactions,
    selectedEpisodeRemittancePostings,
    claimReadinessQueue,
    claimStatusLanes,
    denialQueueSections,
    evvQueueSections,
    billingFollowUpSections,
    filteredClaimReadinessQueue,
    availableClaimActions,
    labelizeClaimAction,
  } = controller

  return (
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
  )
}
