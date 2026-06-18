<?php
declare(strict_types=1);

use Migrations\BaseMigration;

class AddHomeHealthGapCompletionResources extends BaseMigration
{
    public function change(): void
    {
        $this->table('assessment_version_policies')
            ->addColumn('version_name', 'string', ['limit' => 40])
            ->addColumn('effective_date', 'date')
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'active'])
            ->addColumn('policy_note', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->create();

        $this->table('patient_compliance_documents')
            ->addColumn('patient_id', 'integer')
            ->addColumn('document_type', 'string', ['limit' => 80])
            ->addColumn('document_status', 'string', ['limit' => 40, 'default' => 'pending'])
            ->addColumn('signed_at', 'datetime', ['null' => true])
            ->addColumn('expires_at', 'datetime', ['null' => true])
            ->addColumn('source_name', 'string', ['limit' => 160, 'null' => true])
            ->addColumn('document_note', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('patient_id', 'patients')
            ->create();

        $this->table('patient_notices')
            ->addColumn('patient_id', 'integer')
            ->addColumn('episode_id', 'integer', ['null' => true])
            ->addColumn('notice_type', 'string', ['limit' => 60])
            ->addColumn('notice_status', 'string', ['limit' => 40, 'default' => 'draft'])
            ->addColumn('reason', 'text', ['null' => true])
            ->addColumn('delivered_at', 'datetime', ['null' => true])
            ->addColumn('signed_at', 'datetime', ['null' => true])
            ->addColumn('billing_impact', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('patient_id', 'patients')
            ->addForeignKey('episode_id', 'episodes')
            ->create();

        $this->table('patient_medications')
            ->addColumn('patient_id', 'integer')
            ->addColumn('episode_id', 'integer', ['null' => true])
            ->addColumn('medication_name', 'string', ['limit' => 180])
            ->addColumn('dosage', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('frequency', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('route', 'string', ['limit' => 80, 'null' => true])
            ->addColumn('high_risk', 'boolean', ['default' => false])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'active'])
            ->addColumn('teaching_completed', 'boolean', ['default' => false])
            ->addColumn('last_reconciled_at', 'datetime', ['null' => true])
            ->addColumn('change_note', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('patient_id', 'patients')
            ->addForeignKey('episode_id', 'episodes')
            ->create();

        $this->table('patient_allergies')
            ->addColumn('patient_id', 'integer')
            ->addColumn('allergen', 'string', ['limit' => 180])
            ->addColumn('reaction', 'string', ['limit' => 180, 'null' => true])
            ->addColumn('severity', 'string', ['limit' => 40, 'default' => 'unknown'])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'active'])
            ->addColumn('verified_at', 'datetime', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('patient_id', 'patients')
            ->create();

        $this->table('verbal_orders')
            ->addColumn('episode_id', 'integer')
            ->addColumn('physician_order_id', 'integer', ['null' => true])
            ->addColumn('order_source', 'string', ['limit' => 160])
            ->addColumn('ordered_service', 'string', ['limit' => 180])
            ->addColumn('received_by', 'string', ['limit' => 160])
            ->addColumn('received_at', 'datetime')
            ->addColumn('read_back_completed', 'boolean', ['default' => false])
            ->addColumn('signature_due_at', 'datetime', ['null' => true])
            ->addColumn('signed_at', 'datetime', ['null' => true])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'pending_signature'])
            ->addColumn('order_note', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('episode_id', 'episodes')
            ->addForeignKey('physician_order_id', 'physician_orders')
            ->create();

        $this->table('order_escalations')
            ->addColumn('episode_id', 'integer')
            ->addColumn('physician_order_id', 'integer', ['null' => true])
            ->addColumn('verbal_order_id', 'integer', ['null' => true])
            ->addColumn('escalation_reason', 'text')
            ->addColumn('assigned_role', 'string', ['limit' => 80, 'default' => 'Clinical'])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'open'])
            ->addColumn('due_at', 'datetime', ['null' => true])
            ->addColumn('resolved_at', 'datetime', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('episode_id', 'episodes')
            ->addForeignKey('physician_order_id', 'physician_orders')
            ->addForeignKey('verbal_order_id', 'verbal_orders')
            ->create();

        $this->table('aide_supervision_events')
            ->addColumn('episode_id', 'integer')
            ->addColumn('visit_id', 'integer', ['null' => true])
            ->addColumn('aide_name', 'string', ['limit' => 160])
            ->addColumn('supervisor_name', 'string', ['limit' => 160])
            ->addColumn('supervision_type', 'string', ['limit' => 80, 'default' => 'onsite'])
            ->addColumn('performed_at', 'datetime')
            ->addColumn('care_plan_reviewed', 'boolean', ['default' => false])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'completed'])
            ->addColumn('findings', 'text', ['null' => true])
            ->addColumn('next_due_at', 'datetime', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('episode_id', 'episodes')
            ->addForeignKey('visit_id', 'visits')
            ->create();

        $this->table('incident_reports')
            ->addColumn('patient_id', 'integer')
            ->addColumn('episode_id', 'integer', ['null' => true])
            ->addColumn('visit_id', 'integer', ['null' => true])
            ->addColumn('incident_type', 'string', ['limit' => 80])
            ->addColumn('severity', 'string', ['limit' => 40, 'default' => 'medium'])
            ->addColumn('occurred_at', 'datetime')
            ->addColumn('description', 'text')
            ->addColumn('follow_up_owner', 'string', ['limit' => 160, 'null' => true])
            ->addColumn('qapi_linked', 'boolean', ['default' => false])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'open'])
            ->addColumn('resolved_at', 'datetime', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('patient_id', 'patients')
            ->addForeignKey('episode_id', 'episodes')
            ->addForeignKey('visit_id', 'visits')
            ->create();

        $this->table('infection_logs')
            ->addColumn('patient_id', 'integer')
            ->addColumn('episode_id', 'integer', ['null' => true])
            ->addColumn('infection_type', 'string', ['limit' => 120])
            ->addColumn('identified_at', 'datetime')
            ->addColumn('precautions', 'text', ['null' => true])
            ->addColumn('reported_to', 'string', ['limit' => 160, 'null' => true])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'monitoring'])
            ->addColumn('resolved_at', 'datetime', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('patient_id', 'patients')
            ->addForeignKey('episode_id', 'episodes')
            ->create();

        $this->table('payer_authorizations')
            ->addColumn('patient_id', 'integer')
            ->addColumn('episode_id', 'integer', ['null' => true])
            ->addColumn('payer_type', 'string', ['limit' => 80])
            ->addColumn('authorization_number', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('authorization_status', 'string', ['limit' => 40, 'default' => 'pending'])
            ->addColumn('authorized_visits', 'integer', ['default' => 0])
            ->addColumn('used_visits', 'integer', ['default' => 0])
            ->addColumn('start_date', 'date', ['null' => true])
            ->addColumn('end_date', 'date', ['null' => true])
            ->addColumn('payer_contact', 'string', ['limit' => 160, 'null' => true])
            ->addColumn('auth_note', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('patient_id', 'patients')
            ->addForeignKey('episode_id', 'episodes')
            ->create();

        $this->table('eligibility_checks')
            ->addColumn('patient_id', 'integer')
            ->addColumn('episode_id', 'integer', ['null' => true])
            ->addColumn('payer_type', 'string', ['limit' => 80])
            ->addColumn('eligibility_status', 'string', ['limit' => 40, 'default' => 'pending'])
            ->addColumn('checked_at', 'datetime')
            ->addColumn('coverage_start', 'date', ['null' => true])
            ->addColumn('coverage_end', 'date', ['null' => true])
            ->addColumn('verification_reference', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('benefit_note', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('patient_id', 'patients')
            ->addForeignKey('episode_id', 'episodes')
            ->create();

        $this->table('claim_transactions')
            ->addColumn('claim_id', 'integer')
            ->addColumn('transaction_type', 'string', ['limit' => 60])
            ->addColumn('transaction_status', 'string', ['limit' => 40, 'default' => 'created'])
            ->addColumn('transaction_reference', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('payload_summary', 'text', ['null' => true])
            ->addColumn('response_note', 'text', ['null' => true])
            ->addColumn('processed_at', 'datetime', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('claim_id', 'claims')
            ->create();

        $this->table('remittance_postings')
            ->addColumn('claim_id', 'integer')
            ->addColumn('era_reference', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('paid_amount', 'decimal', ['precision' => 10, 'scale' => 2, 'default' => 0])
            ->addColumn('adjustment_code', 'string', ['limit' => 80, 'null' => true])
            ->addColumn('adjustment_amount', 'decimal', ['precision' => 10, 'scale' => 2, 'default' => 0])
            ->addColumn('posting_status', 'string', ['limit' => 40, 'default' => 'posted'])
            ->addColumn('posted_at', 'datetime')
            ->addColumn('posting_note', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('claim_id', 'claims')
            ->create();

        $this->table('dme_supply_orders')
            ->addColumn('patient_id', 'integer')
            ->addColumn('episode_id', 'integer', ['null' => true])
            ->addColumn('item_name', 'string', ['limit' => 180])
            ->addColumn('item_type', 'string', ['limit' => 80, 'default' => 'supply'])
            ->addColumn('quantity', 'integer', ['default' => 1])
            ->addColumn('order_status', 'string', ['limit' => 40, 'default' => 'ordered'])
            ->addColumn('ordered_at', 'datetime', ['null' => true])
            ->addColumn('delivered_at', 'datetime', ['null' => true])
            ->addColumn('billing_relevance', 'text', ['null' => true])
            ->addColumn('plan_of_care_linked', 'boolean', ['default' => false])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('patient_id', 'patients')
            ->addForeignKey('episode_id', 'episodes')
            ->create();

        $this->table('case_conferences')
            ->addColumn('episode_id', 'integer')
            ->addColumn('conference_at', 'datetime')
            ->addColumn('participants', 'text')
            ->addColumn('decisions', 'text')
            ->addColumn('follow_up_owner', 'string', ['limit' => 160, 'null' => true])
            ->addColumn('next_review_at', 'datetime', ['null' => true])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'completed'])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('episode_id', 'episodes')
            ->create();

        $this->table('survey_readiness_snapshots')
            ->addColumn('period_key', 'string', ['limit' => 60])
            ->addColumn('readiness_score', 'decimal', ['precision' => 8, 'scale' => 2, 'default' => 0])
            ->addColumn('risk_summary', 'text', ['null' => true])
            ->addColumn('category_scores', 'text', ['null' => true])
            ->addColumn('captured_at', 'datetime')
            ->addTimestamps('created', 'modified')
            ->create();

        $this->table('assessment_version_policies')->insert([
            [
                'version_name' => 'OASIS-E1',
                'effective_date' => '2025-01-01',
                'status' => 'active',
                'policy_note' => 'Default historical OASIS version for demo assessments before OASIS-E2.',
                'created' => date('Y-m-d H:i:s'),
                'modified' => date('Y-m-d H:i:s'),
            ],
            [
                'version_name' => 'OASIS-E2',
                'effective_date' => '2026-04-01',
                'status' => 'active',
                'policy_note' => 'CMS final OASIS-E2 instruments effective April 1, 2026.',
                'created' => date('Y-m-d H:i:s'),
                'modified' => date('Y-m-d H:i:s'),
            ],
        ])->saveData();
    }
}
