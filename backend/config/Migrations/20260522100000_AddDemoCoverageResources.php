<?php
declare(strict_types=1);

use Migrations\BaseMigration;

class AddDemoCoverageResources extends BaseMigration
{
    public function change(): void
    {
        $this->table('qa_tasks')
            ->addColumn('resolved_at', 'datetime', ['null' => true, 'after' => 'status'])
            ->update();

        $this->table('oasis_submissions')
            ->addColumn('episode_id', 'integer')
            ->addColumn('assessment_id', 'integer', ['null' => true])
            ->addColumn('submission_status', 'string', ['limit' => 40, 'default' => 'draft'])
            ->addColumn('iqies_ready', 'boolean', ['default' => false])
            ->addColumn('export_payload', 'text', ['null' => true])
            ->addColumn('readiness_notes', 'text', ['null' => true])
            ->addColumn('submission_reference', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('submitted_at', 'datetime', ['null' => true])
            ->addColumn('acknowledged_at', 'datetime', ['null' => true])
            ->addColumn('acknowledgment_status', 'string', ['limit' => 40, 'null' => true])
            ->addColumn('acknowledgment_note', 'text', ['null' => true])
            ->addColumn('rejection_note', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('episode_id', 'episodes')
            ->addForeignKey('assessment_id', 'assessments')
            ->create();

        $this->table('plan_of_cares')
            ->addColumn('episode_id', 'integer')
            ->addColumn('assessment_id', 'integer', ['null' => true])
            ->addColumn('physician_order_id', 'integer', ['null' => true])
            ->addColumn('version_number', 'integer', ['default' => 1])
            ->addColumn('review_status', 'string', ['limit' => 40, 'default' => 'draft'])
            ->addColumn('effective_date', 'date', ['null' => true])
            ->addColumn('plan_summary', 'text', ['null' => true])
            ->addColumn('goal_summary', 'text', ['null' => true])
            ->addColumn('intervention_summary', 'text', ['null' => true])
            ->addColumn('printable_content', 'text', ['null' => true])
            ->addColumn('physician_review_note', 'text', ['null' => true])
            ->addColumn('approved_at', 'datetime', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('episode_id', 'episodes')
            ->addForeignKey('assessment_id', 'assessments')
            ->addForeignKey('physician_order_id', 'physician_orders')
            ->create();

        $this->table('coder_review_items')
            ->addColumn('episode_id', 'integer')
            ->addColumn('claim_id', 'integer', ['null' => true])
            ->addColumn('assessment_id', 'integer', ['null' => true])
            ->addColumn('category', 'string', ['limit' => 60])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'open'])
            ->addColumn('priority', 'string', ['limit' => 20, 'default' => 'medium'])
            ->addColumn('title', 'string', ['limit' => 180])
            ->addColumn('details', 'text', ['null' => true])
            ->addColumn('recommendation', 'text', ['null' => true])
            ->addColumn('correction_note', 'text', ['null' => true])
            ->addColumn('resolved_at', 'datetime', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('episode_id', 'episodes')
            ->addForeignKey('claim_id', 'claims')
            ->addForeignKey('assessment_id', 'assessments')
            ->create();

        $this->table('communication_log_entries')
            ->addColumn('episode_id', 'integer')
            ->addColumn('visit_id', 'integer', ['null' => true])
            ->addColumn('entry_type', 'string', ['limit' => 60, 'default' => 'coordination'])
            ->addColumn('contact_name', 'string', ['limit' => 160])
            ->addColumn('contact_role', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('method', 'string', ['limit' => 60])
            ->addColumn('topic', 'string', ['limit' => 180])
            ->addColumn('outcome', 'text', ['null' => true])
            ->addColumn('follow_up_owner', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('follow_up_due_at', 'datetime', ['null' => true])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'logged'])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('episode_id', 'episodes')
            ->addForeignKey('visit_id', 'visits')
            ->create();

        $this->table('fax_messages')
            ->addColumn('referral_id', 'integer', ['null' => true])
            ->addColumn('source_name', 'string', ['limit' => 160])
            ->addColumn('from_number', 'string', ['limit' => 40, 'null' => true])
            ->addColumn('subject', 'string', ['limit' => 180, 'null' => true])
            ->addColumn('packet_type', 'string', ['limit' => 60, 'default' => 'referral_packet'])
            ->addColumn('routing_status', 'string', ['limit' => 40, 'default' => 'new'])
            ->addColumn('received_at', 'datetime')
            ->addColumn('attachment_note', 'text', ['null' => true])
            ->addColumn('linked_document_count', 'integer', ['default' => 0])
            ->addColumn('route_note', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('referral_id', 'referrals')
            ->create();

        $this->table('qapi_projects')
            ->addColumn('title', 'string', ['limit' => 180])
            ->addColumn('measure_name', 'string', ['limit' => 180])
            ->addColumn('owner_name', 'string', ['limit' => 120])
            ->addColumn('review_cadence', 'string', ['limit' => 60])
            ->addColumn('status', 'string', ['limit' => 40, 'default' => 'active'])
            ->addColumn('target_value', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('current_value', 'string', ['limit' => 120, 'null' => true])
            ->addColumn('intervention_plan', 'text', ['null' => true])
            ->addColumn('evidence_summary', 'text', ['null' => true])
            ->addColumn('linked_task_ids', 'text', ['null' => true])
            ->addColumn('linked_audit_event_ids', 'text', ['null' => true])
            ->addColumn('last_reviewed_at', 'datetime', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->create();

        $this->table('quality_metric_snapshots')
            ->addColumn('metric_key', 'string', ['limit' => 120])
            ->addColumn('metric_label', 'string', ['limit' => 180])
            ->addColumn('period_key', 'string', ['limit' => 60])
            ->addColumn('score', 'decimal', ['precision' => 8, 'scale' => 2, 'default' => 0])
            ->addColumn('numerator', 'integer', ['default' => 0])
            ->addColumn('denominator', 'integer', ['default' => 0])
            ->addColumn('trend_value', 'decimal', ['precision' => 8, 'scale' => 2, 'null' => true])
            ->addColumn('notes', 'text', ['null' => true])
            ->addColumn('captured_at', 'datetime')
            ->addTimestamps('created', 'modified')
            ->create();

        $this->table('utilization_risk_snapshots')
            ->addColumn('episode_id', 'integer')
            ->addColumn('period_number', 'integer', ['default' => 1])
            ->addColumn('projected_visits', 'integer', ['default' => 0])
            ->addColumn('threshold_visits', 'integer', ['default' => 5])
            ->addColumn('risk_level', 'string', ['limit' => 20, 'default' => 'low'])
            ->addColumn('warning_note', 'text', ['null' => true])
            ->addColumn('recommended_action', 'text', ['null' => true])
            ->addTimestamps('created', 'modified')
            ->addForeignKey('episode_id', 'episodes')
            ->create();
    }
}
