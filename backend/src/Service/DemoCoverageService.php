<?php
declare(strict_types=1);

namespace App\Service;

use Cake\ORM\Table;
use Cake\ORM\TableRegistry;
use DateInterval;
use DateTimeImmutable;
use InvalidArgumentException;
use RuntimeException;

class DemoCoverageService
{
    private Table $episodes;
    private Table $patients;
    private Table $referrals;
    private Table $assessments;
    private Table $visits;
    private Table $claims;
    private Table $qaTasks;
    private Table $auditEvents;
    private Table $physicianOrders;
    private Table $oasisSubmissions;
    private Table $planOfCares;
    private Table $coderReviewItems;
    private Table $communicationLogEntries;
    private Table $faxMessages;
    private Table $qapiProjects;
    private Table $qualityMetricSnapshots;
    private Table $utilizationRiskSnapshots;
    private AuditLogger $auditLogger;
    private HomeHealthWorkflowService $workflowService;
    private PdgmGrouper $pdgmGrouper;

    public function __construct()
    {
        $locator = TableRegistry::getTableLocator();
        $this->episodes = $locator->get('Episodes');
        $this->patients = $locator->get('Patients');
        $this->referrals = $locator->get('Referrals');
        $this->assessments = $locator->get('Assessments');
        $this->visits = $locator->get('Visits');
        $this->claims = $locator->get('Claims');
        $this->qaTasks = $locator->get('QaTasks');
        $this->auditEvents = $locator->get('AuditEvents');
        $this->physicianOrders = $locator->get('PhysicianOrders');
        $this->oasisSubmissions = $locator->get('OasisSubmissions');
        $this->planOfCares = $locator->get('PlanOfCares');
        $this->coderReviewItems = $locator->get('CoderReviewItems');
        $this->communicationLogEntries = $locator->get('CommunicationLogEntries');
        $this->faxMessages = $locator->get('FaxMessages');
        $this->qapiProjects = $locator->get('QapiProjects');
        $this->qualityMetricSnapshots = $locator->get('QualityMetricSnapshots');
        $this->utilizationRiskSnapshots = $locator->get('UtilizationRiskSnapshots');
        $this->auditLogger = new AuditLogger($this->auditEvents);
        $this->workflowService = new HomeHealthWorkflowService();
        $this->pdgmGrouper = new PdgmGrouper();
    }

    /**
     * @return array<string, mixed>
     */
    public function buildEpisodeInsights(int $episodeId): array
    {
        return [
            'episode_id' => $episodeId,
            'clinical_decision_support' => $this->buildClinicalDecisionAlerts($episodeId),
            'documentation_integrity' => $this->buildDocumentationIntegrity($episodeId),
            'utilization_risk' => $this->computeUtilizationRisk($episodeId, true),
            'pdgm_breakdown' => $this->buildPdgmBreakdown($episodeId),
        ];
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function prepareOasisSubmission(int $episodeId, array $identity): array
    {
        $episode = $this->episodes->get($episodeId, contain: ['Patients']);
        $assessment = $this->findFinalAssessment($episodeId);
        if ($assessment === null) {
            throw new RuntimeException('A finalized OASIS assessment is required before preparing a submission package.');
        }

        $integrity = $this->buildDocumentationIntegrity($episodeId);
        $alerts = $this->buildClinicalDecisionAlerts($episodeId);
        $readinessBlockers = [];
        if (($integrity['assessment_score'] ?? 0) < 80) {
            $readinessBlockers[] = 'Assessment documentation integrity is below the demo submission threshold.';
        }

        $payload = [
            'patient' => [
                'name' => trim((string)$episode->get('patient')->get('first_name') . ' ' . (string)$episode->get('patient')->get('last_name')),
                'dob' => (string)$episode->get('patient')->get('dob'),
                'payer_type' => (string)$episode->get('payer_type'),
            ],
            'episode' => [
                'id' => $episodeId,
                'cert_start_date' => (string)$episode->get('cert_start_date'),
                'cert_end_date' => (string)$episode->get('cert_end_date'),
                'oasis_version_required' => (string)$episode->get('oasis_version_required'),
            ],
            'assessment' => [
                'id' => (int)$assessment->get('id'),
                'assessment_type' => (string)$assessment->get('assessment_type'),
                'completed_at' => (string)$assessment->get('completed_at'),
                'oasis_version' => (string)$assessment->get('oasis_version'),
                'principal_diagnosis_code' => (string)$assessment->get('principal_diagnosis_code'),
                'functional_score' => (int)$assessment->get('functional_score'),
                'comorbidity_level' => (string)$assessment->get('comorbidity_level'),
                'answers' => $this->decodeJsonArray((string)$assessment->get('answers')),
                'clinical_payload' => $this->decodeJsonArray((string)$assessment->get('assessment_payload')),
            ],
            'readiness' => [
                'clinical_alerts' => $alerts,
                'documentation_integrity' => $integrity,
            ],
        ];

        $submission = $this->oasisSubmissions->newEntity([
            'episode_id' => $episodeId,
            'assessment_id' => $assessment->get('id'),
            'submission_status' => $readinessBlockers === [] ? 'ready' : 'draft',
            'iqies_ready' => $readinessBlockers === [],
            'export_payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            'readiness_notes' => $readinessBlockers === [] ? 'Submission package is iQIES-ready for demo export.' : implode(' | ', $readinessBlockers),
            'submission_reference' => 'IQIES-' . strtoupper(bin2hex(random_bytes(4))),
        ]);
        $this->oasisSubmissions->saveOrFail($submission);

        $this->auditLogger->log($identity, 'oasis_submission_prepared', 'OasisSubmission', (int)$submission->get('id'), [
            'episode_id' => $episodeId,
            'assessment_id' => (int)$assessment->get('id'),
            'status' => $submission->get('submission_status'),
        ]);

        return $submission->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function updateOasisSubmission(int $submissionId, array $payload, array $identity): array
    {
        $submission = $this->oasisSubmissions->get($submissionId);
        $patch = array_intersect_key($payload, array_flip([
            'submission_status',
            'acknowledgment_status',
            'acknowledgment_note',
            'rejection_note',
        ]));
        if (($patch['submission_status'] ?? null) === 'submitted') {
            $patch['submitted_at'] = date('Y-m-d H:i:s');
        }
        if (($patch['submission_status'] ?? null) === 'accepted') {
            $patch['acknowledged_at'] = date('Y-m-d H:i:s');
            $patch['acknowledgment_status'] = 'accepted';
        }
        if (($patch['submission_status'] ?? null) === 'rejected') {
            $patch['acknowledged_at'] = date('Y-m-d H:i:s');
            $patch['acknowledgment_status'] = 'rejected';
            $this->createQaTask([
                'episode_id' => (int)$submission->get('episode_id'),
                'assessment_id' => (int)$submission->get('assessment_id'),
                'task_type' => 'oasis_submission_rejected',
                'priority' => 'high',
                'title' => 'Resolve rejected OASIS submission',
                'details' => trim((string)($payload['rejection_note'] ?? 'Submission package was rejected and needs QA follow-up.')),
                'assigned_role' => 'QA',
            ]);
        }

        $submission = $this->oasisSubmissions->patchEntity($submission, $patch);
        $this->oasisSubmissions->saveOrFail($submission);
        $this->auditLogger->log($identity, 'oasis_submission_updated', 'OasisSubmission', $submissionId, $patch);

        return $submission->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function generatePlanOfCare(int $episodeId, array $identity): array
    {
        $episode = $this->episodes->get($episodeId, contain: ['Patients']);
        $assessment = $this->findFinalAssessment($episodeId);
        if ($assessment === null) {
            throw new RuntimeException('A finalized assessment is required to generate a plan of care.');
        }

        $latestOrder = $this->physicianOrders->find()
            ->where(['episode_id' => $episodeId, 'active' => true])
            ->orderByDesc('version_number')
            ->first();
        $recentVisits = $this->documentedVisits($episodeId);
        $snapshot = $this->decodeJsonArray((string)$episode->get('admission_readiness_snapshot'));
        $nextVersion = (int)$this->planOfCares->find()->where(['episode_id' => $episodeId])->count() + 1;

        $disciplineSummary = !empty($snapshot['requested_disciplines']) ? implode(', ', (array)$snapshot['requested_disciplines']) : 'SN';
        $visitSummary = array_map(function ($visit): string {
            $payload = $this->decodeJsonArray((string)$visit->get('documentation_payload'));
            $focus = trim((string)($payload['visit_focus'] ?? ''));
            return sprintf(
                '%s %s%s',
                strtoupper((string)$visit->get('discipline')),
                (string)$visit->get('visit_type'),
                $focus !== '' ? ' - ' . $focus : '',
            );
        }, $recentVisits);

        $planSummary = sprintf(
            '485-ready plan of care for %s, episode %d. Admission source: %s. Requested disciplines: %s.',
            (string)$episode->get('primary_diagnosis'),
            $episodeId,
            (string)($snapshot['admission_source'] ?? 'Community'),
            $disciplineSummary,
        );
        $goalSummary = trim((string)$assessment->get('care_plan_goals'));
        $interventionSummary = trim(implode(' ', array_filter([
            'Clinical summary: ' . trim((string)$assessment->get('clinical_summary')),
            $latestOrder !== null && trim((string)$latestOrder->get('order_summary')) !== '' ? 'Order: ' . trim((string)$latestOrder->get('order_summary')) : '',
            $visitSummary !== [] ? 'Recent visits: ' . implode(' | ', $visitSummary) : '',
        ])));
        $printableContent = implode("\n", array_filter([
            'ETHIZO HOME HEALTH CARE DEMO - PLAN OF CARE (485 READY)',
            sprintf('Patient: %s %s', (string)$episode->get('patient')->get('first_name'), (string)$episode->get('patient')->get('last_name')),
            sprintf('Episode: %d', $episodeId),
            sprintf('Diagnosis: %s', (string)$episode->get('primary_diagnosis')),
            sprintf('Certification: %s to %s', (string)$episode->get('cert_start_date'), (string)$episode->get('cert_end_date')),
            'Summary: ' . $planSummary,
            'Goals: ' . $goalSummary,
            'Interventions: ' . $interventionSummary,
        ]));

        $planData = [
            'episode_id' => $episodeId,
            'assessment_id' => $assessment->get('id'),
            'physician_order_id' => $latestOrder !== null ? (int)$latestOrder->get('id') : null,
            'version_number' => $nextVersion,
            'review_status' => $latestOrder !== null && (string)$latestOrder->get('order_status') === 'signed' ? 'physician_reviewed' : 'draft',
            'effective_date' => $episode->get('cert_start_date'),
            'plan_summary' => $planSummary,
            'goal_summary' => $goalSummary,
            'intervention_summary' => $interventionSummary,
            'printable_content' => $printableContent,
            'physician_review_note' => $latestOrder !== null ? trim((string)$latestOrder->get('order_note')) : '',
            'approved_at' => null,
        ];
        $plan = $this->planOfCares->newEntity($planData);
        if ($plan->hasErrors()) {
            throw new InvalidArgumentException('Generated plan of care failed validation: ' . json_encode($plan->getErrors(), JSON_THROW_ON_ERROR));
        }
        $this->planOfCares->saveOrFail($plan);
        $this->auditLogger->log($identity, 'plan_of_care_generated', 'PlanOfCare', (int)$plan->get('id'), [
            'episode_id' => $episodeId,
            'version_number' => $nextVersion,
        ]);

        return $plan->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function updatePlanOfCare(int $planId, array $payload, array $identity): array
    {
        $plan = $this->planOfCares->get($planId);
        $patch = array_intersect_key($payload, array_flip([
            'review_status',
            'plan_summary',
            'goal_summary',
            'intervention_summary',
            'printable_content',
            'physician_review_note',
        ]));
        if (($patch['review_status'] ?? null) === 'approved') {
            $patch['approved_at'] = date('Y-m-d H:i:s');
        }
        $plan = $this->planOfCares->patchEntity($plan, $patch);
        $this->planOfCares->saveOrFail($plan);
        $this->auditLogger->log($identity, 'plan_of_care_updated', 'PlanOfCare', $planId, $patch);

        return $plan->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return list<array<string, mixed>>
     */
    public function syncCoderReview(int $episodeId, array $identity): array
    {
        $billing = $this->workflowService->evaluateBillingReadiness($episodeId);
        $utilization = $this->computeUtilizationRisk($episodeId, true);
        $latestClaim = $this->claims->find()->where(['episode_id' => $episodeId])->orderByDesc('created')->first();
        $assessment = $this->findFinalAssessment($episodeId);
        $latestSubmission = $this->oasisSubmissions->find()->where(['episode_id' => $episodeId])->orderByDesc('created')->first();

        $issues = [];
        foreach ((array)$billing['blockers'] as $blocker) {
            $issues[] = $this->mapBillingBlockerToCoderIssue((string)$blocker);
        }
        if (($utilization['risk_level'] ?? 'low') !== 'low') {
            $issues[] = [
                'category' => 'utilization',
                'priority' => 'high',
                'title' => 'LUPA protection review needed',
                'details' => (string)($utilization['warning_note'] ?? 'Projected utilization is below the demo threshold.'),
                'recommendation' => (string)($utilization['recommended_action'] ?? 'Review visit frequency and avoid unnecessary missed or held visits.'),
            ];
        }
        if ($latestSubmission !== null && in_array((string)$latestSubmission->get('submission_status'), ['draft', 'rejected'], true)) {
            $issues[] = [
                'category' => 'oasis',
                'priority' => 'medium',
                'title' => 'OASIS submission readiness needs coding review',
                'details' => trim((string)$latestSubmission->get('readiness_notes') . ' ' . (string)$latestSubmission->get('rejection_note')),
                'recommendation' => 'Reconcile OASIS content and assessment coding before claim resubmission.',
            ];
        }

        $created = [];
        foreach ($issues as $issue) {
            $existing = $this->coderReviewItems->find()
                ->where([
                    'episode_id' => $episodeId,
                    'category' => $issue['category'],
                    'status' => 'open',
                ])
                ->first();
            if ($existing !== null) {
                $existing = $this->coderReviewItems->patchEntity($existing, [
                    'priority' => $issue['priority'],
                    'title' => $issue['title'],
                    'details' => $issue['details'],
                    'recommendation' => $issue['recommendation'],
                ]);
                $this->coderReviewItems->saveOrFail($existing);
                $created[] = $existing->toArray();
                continue;
            }

            $item = $this->coderReviewItems->newEntity([
                'episode_id' => $episodeId,
                'claim_id' => $latestClaim?->get('id'),
                'assessment_id' => $assessment?->get('id'),
                'category' => $issue['category'],
                'status' => 'open',
                'priority' => $issue['priority'],
                'title' => $issue['title'],
                'details' => $issue['details'],
                'recommendation' => $issue['recommendation'],
            ]);
            $this->coderReviewItems->saveOrFail($item);
            $created[] = $item->toArray();
        }

        $this->auditLogger->log($identity, 'coder_review_synced', 'Episode', $episodeId, ['issues' => count($created)]);

        return $created;
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function updateCoderReviewItem(int $itemId, array $payload, array $identity): array
    {
        $item = $this->coderReviewItems->get($itemId);
        $patch = array_intersect_key($payload, array_flip([
            'status',
            'priority',
            'details',
            'recommendation',
            'correction_note',
        ]));
        if (($patch['status'] ?? null) === 'resolved') {
            $patch['resolved_at'] = date('Y-m-d H:i:s');
        }
        $item = $this->coderReviewItems->patchEntity($item, $patch);
        $this->coderReviewItems->saveOrFail($item);
        $this->auditLogger->log($identity, 'coder_review_updated', 'CoderReviewItem', $itemId, $patch);

        return $item->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function addCommunicationLogEntry(int $episodeId, array $payload, array $identity): array
    {
        $entry = $this->communicationLogEntries->newEntity([
            'episode_id' => $episodeId,
            'visit_id' => $payload['visit_id'] ?? null,
            'entry_type' => $payload['entry_type'] ?? 'coordination',
            'contact_name' => trim((string)($payload['contact_name'] ?? '')),
            'contact_role' => trim((string)($payload['contact_role'] ?? '')) ?: null,
            'method' => trim((string)($payload['method'] ?? '')),
            'topic' => trim((string)($payload['topic'] ?? '')),
            'outcome' => trim((string)($payload['outcome'] ?? '')) ?: null,
            'follow_up_owner' => trim((string)($payload['follow_up_owner'] ?? '')) ?: null,
            'follow_up_due_at' => $payload['follow_up_due_at'] ?? null,
            'status' => !empty($payload['follow_up_due_at']) ? 'follow_up_due' : 'logged',
        ]);
        $this->communicationLogEntries->saveOrFail($entry);
        $this->auditLogger->log($identity, 'communication_logged', 'CommunicationLogEntry', (int)$entry->get('id'), ['episode_id' => $episodeId]);

        return $entry->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function updateCommunicationLogEntry(int $entryId, array $payload, array $identity): array
    {
        $entry = $this->communicationLogEntries->get($entryId);
        $patch = array_intersect_key($payload, array_flip([
            'entry_type',
            'contact_name',
            'contact_role',
            'method',
            'topic',
            'outcome',
            'follow_up_owner',
            'follow_up_due_at',
            'status',
        ]));
        $entry = $this->communicationLogEntries->patchEntity($entry, $patch);
        $this->communicationLogEntries->saveOrFail($entry);
        $this->auditLogger->log($identity, 'communication_updated', 'CommunicationLogEntry', $entryId, $patch);

        return $entry->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function addFaxMessage(array $payload, array $identity): array
    {
        $message = $this->faxMessages->newEntity([
            'source_name' => trim((string)($payload['source_name'] ?? '')),
            'from_number' => trim((string)($payload['from_number'] ?? '')) ?: null,
            'subject' => trim((string)($payload['subject'] ?? '')) ?: null,
            'packet_type' => $payload['packet_type'] ?? 'referral_packet',
            'routing_status' => $payload['routing_status'] ?? 'new',
            'received_at' => $payload['received_at'] ?? date('Y-m-d H:i:s'),
            'attachment_note' => trim((string)($payload['attachment_note'] ?? '')) ?: null,
            'linked_document_count' => (int)($payload['linked_document_count'] ?? 0),
            'route_note' => trim((string)($payload['route_note'] ?? '')) ?: null,
        ]);
        $this->faxMessages->saveOrFail($message);
        $this->auditLogger->log($identity, 'fax_message_added', 'FaxMessage', (int)$message->get('id'), ['source_name' => $message->get('source_name')]);

        return $message->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function routeFaxMessage(int $faxId, array $payload, array $identity): array
    {
        $message = $this->faxMessages->get($faxId);
        $routingStatus = (string)($payload['routing_status'] ?? 'classified');
        $referralId = $payload['referral_id'] ?? null;

        $shouldCreateReferral = filter_var($payload['create_referral'] ?? false, FILTER_VALIDATE_BOOL);
        if ($shouldCreateReferral) {
            $patientId = (int)($payload['patient_id'] ?? 0);
            if ($patientId <= 0) {
                throw new InvalidArgumentException('A patient is required when converting a fax packet into a referral.');
            }

            $patient = $this->patients->get($patientId);
            $referral = $this->referrals->newEntity([
                'patient_id' => $patientId,
                'source_name' => (string)$message->get('source_name'),
                'admission_source' => $payload['admission_source'] ?? 'Community referral',
                'payer_type' => $payload['payer_type'] ?? $patient->get('payer_type'),
                'primary_diagnosis' => $payload['primary_diagnosis'] ?? 'R69 Unspecified illness',
                'requested_disciplines' => json_encode($payload['requested_disciplines'] ?? ['SN'], JSON_THROW_ON_ERROR),
                'order_status' => $payload['order_status'] ?? 'pending',
                'physician_orders_signed' => false,
                'face_to_face_date' => $payload['face_to_face_date'] ?? date('Y-m-d'),
                'referring_provider_name' => $payload['referring_provider_name'] ?? (string)$message->get('source_name'),
                'referring_provider_phone' => $payload['referring_provider_phone'] ?? ($message->get('from_number') ?: '404-555-0199'),
                'caregiver_name' => $payload['caregiver_name'] ?? ($patient->get('emergency_contact_name') ?: 'Caregiver pending'),
                'caregiver_relationship' => $payload['caregiver_relationship'] ?? ($patient->get('emergency_contact_relationship') ?: 'Family'),
                'caregiver_phone' => $payload['caregiver_phone'] ?? ($patient->get('emergency_contact_phone') ?: '404-555-0198'),
                'service_location_type' => $payload['service_location_type'] ?? 'Patient home',
                'service_address1' => $payload['service_address1'] ?? ($patient->get('address1') ?: 'Pending address'),
                'service_city' => $payload['service_city'] ?? ($patient->get('city') ?: 'Atlanta'),
                'service_state' => $payload['service_state'] ?? ($patient->get('state') ?: 'GA'),
                'service_postal_code' => $payload['service_postal_code'] ?? ($patient->get('postal_code') ?: '30309'),
                'planned_soc_date' => $payload['planned_soc_date'] ?? date('Y-m-d'),
                'intake_ready' => false,
                'status' => 'received',
                'notes' => $payload['notes'] ?? 'Created from fax inbox routing workflow.',
            ]);
            $this->referrals->saveOrFail($referral);
            $referralId = (int)$referral->get('id');
            $routingStatus = 'converted_to_referral';
        }

        $message = $this->faxMessages->patchEntity($message, [
            'referral_id' => $referralId ?: null,
            'routing_status' => $routingStatus,
            'linked_document_count' => (int)($payload['linked_document_count'] ?? $message->get('linked_document_count')),
            'route_note' => trim((string)($payload['route_note'] ?? '')) ?: $message->get('route_note'),
        ]);
        $this->faxMessages->saveOrFail($message);
        $this->auditLogger->log($identity, 'fax_message_routed', 'FaxMessage', $faxId, [
            'routing_status' => $routingStatus,
            'referral_id' => $referralId,
        ]);

        return $message->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function addQapiProject(array $payload, array $identity): array
    {
        $project = $this->qapiProjects->newEntity([
            'title' => trim((string)($payload['title'] ?? '')),
            'measure_name' => trim((string)($payload['measure_name'] ?? '')),
            'owner_name' => trim((string)($payload['owner_name'] ?? '')),
            'review_cadence' => trim((string)($payload['review_cadence'] ?? 'monthly')),
            'status' => $payload['status'] ?? 'active',
            'target_value' => trim((string)($payload['target_value'] ?? '')) ?: null,
            'current_value' => trim((string)($payload['current_value'] ?? '')) ?: null,
            'intervention_plan' => trim((string)($payload['intervention_plan'] ?? '')) ?: null,
            'evidence_summary' => trim((string)($payload['evidence_summary'] ?? '')) ?: null,
            'linked_task_ids' => !empty($payload['linked_task_ids']) ? json_encode(array_values((array)$payload['linked_task_ids']), JSON_THROW_ON_ERROR) : null,
            'linked_audit_event_ids' => !empty($payload['linked_audit_event_ids']) ? json_encode(array_values((array)$payload['linked_audit_event_ids']), JSON_THROW_ON_ERROR) : null,
            'last_reviewed_at' => $payload['last_reviewed_at'] ?? null,
        ]);
        $this->qapiProjects->saveOrFail($project);
        $this->auditLogger->log($identity, 'qapi_project_added', 'QapiProject', (int)$project->get('id'), ['title' => $project->get('title')]);

        return $project->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function updateQapiProject(int $projectId, array $payload, array $identity): array
    {
        $project = $this->qapiProjects->get($projectId);
        $patch = array_intersect_key($payload, array_flip([
            'title',
            'measure_name',
            'owner_name',
            'review_cadence',
            'status',
            'target_value',
            'current_value',
            'intervention_plan',
            'evidence_summary',
            'last_reviewed_at',
        ]));
        if (array_key_exists('linked_task_ids', $payload)) {
            $patch['linked_task_ids'] = json_encode(array_values((array)$payload['linked_task_ids']), JSON_THROW_ON_ERROR);
        }
        if (array_key_exists('linked_audit_event_ids', $payload)) {
            $patch['linked_audit_event_ids'] = json_encode(array_values((array)$payload['linked_audit_event_ids']), JSON_THROW_ON_ERROR);
        }
        $project = $this->qapiProjects->patchEntity($project, $patch);
        $this->qapiProjects->saveOrFail($project);
        $this->auditLogger->log($identity, 'qapi_project_updated', 'QapiProject', $projectId, $patch);

        return $project->toArray();
    }

    /**
     * @return array<string, mixed>
     */
    public function captureQualityMetrics(string $periodKey, array $identity): array
    {
        $summary = $this->qualityMetrics($periodKey);
        $capturedAt = date('Y-m-d H:i:s');

        foreach ($summary['metrics'] as $metric) {
            $snapshot = $this->qualityMetricSnapshots->newEntity([
                'metric_key' => $metric['key'],
                'metric_label' => $metric['label'],
                'period_key' => $periodKey,
                'score' => $metric['score'],
                'numerator' => $metric['numerator'],
                'denominator' => $metric['denominator'],
                'trend_value' => $metric['trend_value'],
                'notes' => $metric['note'],
                'captured_at' => $capturedAt,
            ]);
            $this->qualityMetricSnapshots->saveOrFail($snapshot);
        }

        $this->auditLogger->log($identity, 'quality_metrics_captured', 'QualityMetricSnapshot', 0, [
            'period_key' => $periodKey,
            'captured_metrics' => count($summary['metrics']),
        ]);

        return $this->qualityMetrics($periodKey);
    }

    /**
     * @return array<string, mixed>
     */
    public function qualityMetrics(string $periodKey = 'all'): array
    {
        $episodes = $this->episodes->find()->all()->toList();
        $visits = $this->visits->find()->all()->toList();
        $qaTasks = $this->qaTasks->find()->all()->toList();
        $assessments = $this->assessments->find()->all()->toList();

        $completedVisits = array_filter($visits, fn ($visit) => in_array((string)$visit->get('status'), ['completed', 'locked'], true));
        $lockedVisits = array_filter($visits, fn ($visit) => (string)$visit->get('documentation_status') === 'locked');
        $resolvedQa = array_filter($qaTasks, fn ($task) => (string)$task->get('status') === 'resolved');
        $resolvedOnTimeQa = array_filter($resolvedQa, function ($task): bool {
            $due = $task->get('due_at');
            $resolved = $task->get('resolved_at');
            if ($due === null || $resolved === null) {
                return false;
            }

            return strtotime((string)$resolved) <= strtotime((string)$due);
        });
        $elevatedAssessments = array_filter($assessments, fn ($assessment) => in_array((string)$assessment->get('hospitalization_risk'), ['elevated', 'high'], true));
        $followedUpAssessments = array_filter($elevatedAssessments, function ($assessment) use ($visits): bool {
            foreach ($visits as $visit) {
                if ((int)$visit->get('episode_id') !== (int)$assessment->get('episode_id')) {
                    continue;
                }
                $payload = $this->decodeJsonArray((string)$visit->get('documentation_payload'));
                if (trim((string)($payload['follow_up_plan'] ?? '')) !== '' || trim((string)($payload['next_visit_focus'] ?? '')) !== '') {
                    return true;
                }
            }

            return false;
        });
        $timelySocEpisodes = array_filter($episodes, function ($episode): bool {
            $soc = $episode->get('start_of_care_date');
            if ($soc === null) {
                return false;
            }

            $start = strtotime((string)$episode->get('cert_start_date'));
            $socTs = strtotime((string)$soc);
            return $socTs !== false && $start !== false && ($socTs - $start) <= (2 * 86400);
        });

        $utilizationSnapshots = [];
        foreach ($episodes as $episode) {
            $utilizationSnapshots[] = $this->computeUtilizationRisk((int)$episode->get('id'), true);
        }
        $safeUtilization = array_filter($utilizationSnapshots, fn ($snapshot) => ($snapshot['risk_level'] ?? 'low') === 'low');

        $metrics = [
            $this->metric('documentation_timeliness', 'Documentation timeliness', count($lockedVisits), max(count($completedVisits), 1), 'Locked documentation after QA release.'),
            $this->metric('qa_closure_timeliness', 'QA closure timeliness', count($resolvedOnTimeQa), max(count($resolvedQa), 1), 'Resolved QA tasks on or before their due date.'),
            $this->metric('hospitalization_follow_up', 'Hospitalization-risk follow-up', count($followedUpAssessments), max(count($elevatedAssessments), 1), 'Elevated-risk assessments with a documented follow-up plan.'),
            $this->metric('timely_soc', 'Timely start of care', count($timelySocEpisodes), max(count($episodes), 1), 'Episodes with SOC documented within two days of cert start.'),
            $this->metric('utilization_preservation', 'Utilization preservation', count($safeUtilization), max(count($utilizationSnapshots), 1), 'Episodes not currently projected into LUPA-risk territory.'),
        ];

        $history = $this->qualityMetricSnapshots->find()
            ->where(['period_key' => $periodKey === 'all' ? 'all' : $periodKey])
            ->orderByDesc('captured_at')
            ->limit(25)
            ->all()
            ->toList();

        return [
            'period_key' => $periodKey,
            'metrics' => $metrics,
            'history' => array_map(fn ($item) => $item->toArray(), $history),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildClinicalDecisionAlerts(int $episodeId): array
    {
        $assessment = $this->findFinalAssessment($episodeId);
        if ($assessment === null) {
            return [[
                'severity' => 'high',
                'source' => 'assessment',
                'summary' => 'No finalized assessment is available to drive clinical decision support.',
                'resolution_hint' => 'Complete and finalize SOC/OASIS before relying on automated clinical prompts.',
            ]];
        }

        $visits = $this->documentedVisits($episodeId);
        $alerts = [];
        $assessmentPayload = $this->decodeJsonArray((string)$assessment->get('assessment_payload'));

        if ((string)$assessment->get('fall_risk_level') === 'high' && !$this->visitsContainText($visits, ['fall', 'safety', 'balance'])) {
            $alerts[] = $this->alert('high', 'assessment', 'High fall risk is documented without matching intervention or teaching in recent charting.', 'Add fall-prevention teaching, mobility precautions, or therapy intervention notes.');
        }
        if (in_array((string)$assessment->get('hospitalization_risk'), ['elevated', 'high'], true) && !$this->visitsContainText($visits, ['follow up', 'monitor', 'call physician', 'weight'])) {
            $alerts[] = $this->alert('high', 'assessment', 'Hospitalization risk is elevated without a clearly documented follow-up plan.', 'Document escalation triggers, monitoring plan, or provider follow-up in the next visit note.');
        }
        if (!$this->homeboundNarrativeHasSupport((string)$assessment->get('homebound_narrative'))) {
            $alerts[] = $this->alert('medium', 'assessment', 'Homebound narrative is present but lacks strong supporting detail.', 'Describe assistance required, exertional limits, and why leaving home is a considerable effort.');
        }
        $medicationIssues = trim((string)(($assessmentPayload['medication_review']['issues'] ?? '') ?: ($assessmentPayload['medication_review']['high_risk_meds'] ?? '')));
        if ($medicationIssues !== '' && !$this->visitsContainText($visits, ['medication', 'teaching', 'review'])) {
            $alerts[] = $this->alert('medium', 'assessment', 'Medication issues are documented without matching visit follow-up.', 'Add medication teaching, reconciliation follow-up, or provider outreach in visit documentation.');
        }

        return $alerts;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildDocumentationIntegrity(int $episodeId): array
    {
        $assessment = $this->findFinalAssessment($episodeId);
        $visits = $this->documentedVisits($episodeId);
        $assessmentScore = 0;
        $visitScore = 0;
        $blockers = [];
        $warnings = [];

        if ($assessment !== null) {
            $requiredAssessmentFields = [
                trim((string)$assessment->get('principal_diagnosis_code')) !== '',
                trim((string)$assessment->get('homebound_status')) !== '',
                trim((string)$assessment->get('homebound_narrative')) !== '',
                (bool)$assessment->get('medication_reconciliation_completed') === true,
                trim((string)$assessment->get('care_plan_goals')) !== '',
                trim((string)$assessment->get('clinical_summary')) !== '',
            ];
            $assessmentScore = (int)round((array_sum(array_map(fn ($value) => $value ? 1 : 0, $requiredAssessmentFields)) / max(count($requiredAssessmentFields), 1)) * 100);
            if ($assessmentScore < 80) {
                $blockers[] = 'Assessment packet is incomplete for high-confidence QA release.';
            }
        } else {
            $blockers[] = 'No finalized assessment is available for integrity review.';
        }

        $completedVisits = array_filter($visits, fn ($visit) => in_array((string)$visit->get('status'), ['completed', 'locked'], true));
        if ($completedVisits !== []) {
            $completedCount = count($completedVisits);
            $completeVisitCount = 0;
            foreach ($completedVisits as $visit) {
                $payload = $this->decodeJsonArray((string)$visit->get('documentation_payload'));
                $discipline = strtoupper((string)$visit->get('discipline'));
                $hasCore = trim((string)$visit->get('documentation_summary')) !== '' && trim((string)($payload['visit_narrative'] ?? '')) !== '';
                $disciplineReady = match ($discipline) {
                    'SN' => trim((string)($payload['vitals'] ?? '')) !== '' && trim((string)($payload['medication_review'] ?? '')) !== '' && trim((string)($payload['teaching_topics'] ?? '')) !== '',
                    'PT', 'OT' => trim((string)($payload['mobility_status'] ?? '')) !== '' && trim((string)($payload['teaching_topics'] ?? '')) !== '',
                    'ST' => trim((string)($payload['teaching_topics'] ?? '')) !== '',
                    'HHA' => trim((string)($payload['adl_support'] ?? '')) !== '',
                    'MSW' => trim((string)($payload['psychosocial_notes'] ?? '')) !== '',
                    default => true,
                };
                if ($hasCore && $disciplineReady) {
                    $completeVisitCount++;
                } else {
                    $warnings[] = sprintf('Visit %d documentation is missing discipline-specific details for %s.', (int)$visit->get('id'), $discipline);
                }
            }
            $visitScore = (int)round(($completeVisitCount / $completedCount) * 100);
            if ($visitScore < 80) {
                $blockers[] = 'Completed visit documentation is not consistently complete across the episode.';
            }
        }

        return [
            'episode_id' => $episodeId,
            'assessment_score' => $assessmentScore,
            'visit_score' => $visitScore,
            'overall_score' => (int)round(($assessmentScore + $visitScore) / max(($assessmentScore > 0 && $visitScore > 0) ? 2 : 1, 1)),
            'blockers' => $blockers,
            'warnings' => $warnings,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function computeUtilizationRisk(int $episodeId, bool $persist): array
    {
        $episode = $this->episodes->get($episodeId);
        $periodStart = new DateTimeImmutable((string)$episode->get('cert_start_date'));
        $periodEnd = $periodStart->add(new DateInterval('P29D'));
        $visits = $this->visits->find()
            ->where([
                'episode_id' => $episodeId,
                'scheduled_start >=' => $periodStart->format('Y-m-d 00:00:00'),
                'scheduled_start <=' => $periodEnd->format('Y-m-d 23:59:59'),
                'status NOT IN' => ['missed'],
            ])
            ->all()
            ->toList();
        $projectedVisits = count($visits);
        $thresholdVisits = 5;
        $heldOrMissed = $this->visits->find()
            ->where([
                'episode_id' => $episodeId,
                'status IN' => ['missed', 'held_for_qa'],
            ])
            ->count();

        $riskLevel = $projectedVisits < $thresholdVisits ? 'high' : ($projectedVisits === $thresholdVisits ? 'medium' : 'low');
        $warningNote = $riskLevel === 'low'
            ? 'Projected visit utilization is above the demo LUPA warning threshold.'
            : sprintf('Projected first-period utilization is %d visit(s) against a %d-visit threshold.', $projectedVisits, $thresholdVisits);
        if ($heldOrMissed > 0) {
            $warningNote .= sprintf(' %d visit(s) are currently missed or held and should be reviewed.', $heldOrMissed);
        }
        $recommendedAction = $riskLevel === 'low'
            ? 'Maintain current cadence and avoid unnecessary cancellations.'
            : 'Protect ordered frequency, reschedule missed visits quickly, and review therapy/nursing cadence before billing.';

        $snapshot = [
            'episode_id' => $episodeId,
            'period_number' => 1,
            'projected_visits' => $projectedVisits,
            'threshold_visits' => $thresholdVisits,
            'risk_level' => $riskLevel,
            'warning_note' => $warningNote,
            'recommended_action' => $recommendedAction,
        ];

        if ($persist) {
            $existing = $this->utilizationRiskSnapshots->find()
                ->where(['episode_id' => $episodeId, 'period_number' => 1])
                ->first();
            if ($existing !== null) {
                $existing = $this->utilizationRiskSnapshots->patchEntity($existing, $snapshot);
                $this->utilizationRiskSnapshots->saveOrFail($existing);
            } else {
                $entity = $this->utilizationRiskSnapshots->newEntity($snapshot);
                $this->utilizationRiskSnapshots->saveOrFail($entity);
            }
        }

        return $snapshot;
    }

    /**
     * @return array<string, string>
     */
    private function buildPdgmBreakdown(int $episodeId): array
    {
        $episode = $this->episodes->get($episodeId);
        $assessment = $this->findFinalAssessment($episodeId);
        if ($assessment === null) {
            return [
                'group_code' => '',
                'clinical_group' => 'Pending assessment',
                'timing' => 'Pending',
                'functional_level' => 'Pending',
                'comorbidity_adjustment' => 'Pending',
                'admission_source' => 'Pending',
                'explanation' => 'A finalized assessment is required before PDGM detail can be explained.',
            ];
        }
        $snapshot = $this->decodeJsonArray((string)$episode->get('admission_readiness_snapshot'));
        $grouping = $this->pdgmGrouper->group([
            'principal_diagnosis_code' => $assessment->get('principal_diagnosis_code'),
            'functional_score' => $assessment->get('functional_score'),
            'comorbidity_level' => $assessment->get('comorbidity_level'),
            'period_number' => 1,
            'admission_source' => $this->mapPdgmAdmissionSource((string)($snapshot['admission_source'] ?? 'community')),
        ]);
        $grouping['explanation'] = sprintf(
            'PDGM grouped as %s because diagnosis %s mapped to %s, admission source is %s, period timing is %s, functional score %s mapped to %s, and comorbidity is %s.',
            $grouping['group_code'],
            (string)$assessment->get('principal_diagnosis_code'),
            $grouping['clinical_group'],
            $grouping['admission_source'],
            $grouping['timing'],
            (string)$assessment->get('functional_score'),
            $grouping['functional_level'],
            $grouping['comorbidity_adjustment'],
        );

        return $grouping;
    }

    private function findFinalAssessment(int $episodeId): mixed
    {
        return $this->assessments->find()
            ->where([
                'episode_id' => $episodeId,
                'status IN' => ['final', 'locked'],
            ])
            ->orderByDesc('completed_at')
            ->first();
    }

    /**
     * @return list<object>
     */
    private function documentedVisits(int $episodeId): array
    {
        return $this->visits->find()
            ->where([
                'episode_id' => $episodeId,
                'documentation_status IN' => ['completed', 'qa_review', 'locked', 'exception_review'],
            ])
            ->orderByDesc('scheduled_start')
            ->limit(6)
            ->all()
            ->toList();
    }

    /**
     * @param list<object> $visits
     * @param list<string> $keywords
     */
    private function visitsContainText(array $visits, array $keywords): bool
    {
        foreach ($visits as $visit) {
            $payload = strtolower(json_encode($this->decodeJsonArray((string)$visit->get('documentation_payload'))));
            $summary = strtolower((string)$visit->get('documentation_summary'));
            foreach ($keywords as $keyword) {
                if (str_contains($payload, strtolower($keyword)) || str_contains($summary, strtolower($keyword))) {
                    return true;
                }
            }
        }

        return false;
    }

    private function homeboundNarrativeHasSupport(string $narrative): bool
    {
        $normalized = strtolower(trim($narrative));
        if ($normalized === '') {
            return false;
        }

        foreach (['assist', 'effort', 'fatigue', 'leaving home', 'requires', 'medical appointments'] as $token) {
            if (str_contains($normalized, $token)) {
                return true;
            }
        }

        return strlen($normalized) >= 80;
    }

    /**
     * @return array<string, mixed>
     */
    private function metric(string $key, string $label, int $numerator, int $denominator, string $note): array
    {
        $score = $denominator > 0 ? round(($numerator / $denominator) * 100, 2) : 0.0;

        return [
            'key' => $key,
            'label' => $label,
            'score' => $score,
            'numerator' => $numerator,
            'denominator' => $denominator,
            'trend_value' => $score,
            'note' => $note,
        ];
    }

    /**
     * @return array<string, string>
     */
    private function mapBillingBlockerToCoderIssue(string $blocker): array
    {
        $lower = strtolower($blocker);
        if (str_contains($lower, 'diagnosis')) {
            return [
                'category' => 'coding',
                'priority' => 'high',
                'title' => 'Diagnosis reconciliation needed',
                'details' => $blocker,
                'recommendation' => 'Reconcile episode diagnosis, finalized assessment coding, and claim-ready billing diagnosis.',
            ];
        }
        if (str_contains($lower, 'documentation')) {
            return [
                'category' => 'documentation',
                'priority' => 'high',
                'title' => 'Documentation release needed',
                'details' => $blocker,
                'recommendation' => 'Lock documentation and resolve missing clinical narrative before final claim submission.',
            ];
        }
        if (str_contains($lower, 'evv')) {
            return [
                'category' => 'evv',
                'priority' => 'medium',
                'title' => 'EVV follow-up is still open',
                'details' => $blocker,
                'recommendation' => 'Submit, correct, or reconcile EVV before resubmitting the claim.',
            ];
        }
        if (str_contains($lower, 'orders')) {
            return [
                'category' => 'orders',
                'priority' => 'high',
                'title' => 'Unsigned order packet is blocking billing',
                'details' => $blocker,
                'recommendation' => 'Obtain physician signature or supersede the packet with a current signed version.',
            ];
        }
        if (str_contains($lower, 'face-to-face') || str_contains($lower, 'admission source')) {
            return [
                'category' => 'intake',
                'priority' => 'medium',
                'title' => 'Intake documentation is incomplete',
                'details' => $blocker,
                'recommendation' => 'Complete missing admission-source or face-to-face data before claim release.',
            ];
        }

        return [
            'category' => 'general',
            'priority' => 'medium',
            'title' => 'Billing review needed',
            'details' => $blocker,
            'recommendation' => 'Review the claim blocker and route to the appropriate billing or QA owner.',
        ];
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function createQaTask(array $payload): void
    {
        $task = $this->qaTasks->newEntity([
            'episode_id' => $payload['episode_id'] ?? null,
            'visit_id' => $payload['visit_id'] ?? null,
            'assessment_id' => $payload['assessment_id'] ?? null,
            'task_type' => $payload['task_type'] ?? 'general',
            'priority' => $payload['priority'] ?? 'medium',
            'status' => 'open',
            'title' => $payload['title'] ?? 'QA follow-up required',
            'details' => $payload['details'] ?? null,
            'assigned_role' => $payload['assigned_role'] ?? 'QA',
            'due_at' => date('Y-m-d H:i:s', strtotime('+1 day')),
        ]);
        $this->qaTasks->saveOrFail($task);
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJsonArray(string $value): array
    {
        if (trim($value) === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        if (!is_array($decoded)) {
            return [];
        }

        return $decoded;
    }

    /**
     * @return array<string, string>
     */
    private function alert(string $severity, string $source, string $summary, string $resolutionHint): array
    {
        return [
            'severity' => $severity,
            'source' => $source,
            'summary' => $summary,
            'resolution_hint' => $resolutionHint,
        ];
    }

    private function mapPdgmAdmissionSource(string $admissionSource): string
    {
        $normalized = strtolower(trim($admissionSource));
        if (str_contains($normalized, 'hospital') || str_contains($normalized, 'institution')) {
            return 'INSTITUTIONAL';
        }

        return 'COMMUNITY';
    }
}
