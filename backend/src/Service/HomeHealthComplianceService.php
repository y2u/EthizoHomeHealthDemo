<?php
declare(strict_types=1);

namespace App\Service;

use Cake\ORM\Table;
use Cake\ORM\TableRegistry;
use DateTimeImmutable;
use InvalidArgumentException;

class HomeHealthComplianceService
{
    private Table $auditEvents;
    private AuditLogger $auditLogger;

    public function __construct()
    {
        $this->auditEvents = TableRegistry::getTableLocator()->get('AuditEvents');
        $this->auditLogger = new AuditLogger($this->auditEvents);
    }

    /**
     * @return array<string, mixed>
     */
    public function add(string $tableAlias, array $payload, array $identity): array
    {
        $table = TableRegistry::getTableLocator()->get($tableAlias);
        $entity = $table->newEntity($this->normalizePayload($payload));
        if ($entity->hasErrors()) {
            throw new InvalidArgumentException($tableAlias . ' failed validation.');
        }

        $table->saveOrFail($entity);
        $this->auditLogger->log($identity, 'compliance_record_added', $tableAlias, (int)$entity->get('id'), [
            'table' => $tableAlias,
        ]);

        return $entity->toArray();
    }

    /**
     * @return array<string, mixed>
     */
    public function update(string $tableAlias, int $id, array $payload, array $identity): array
    {
        $table = TableRegistry::getTableLocator()->get($tableAlias);
        $entity = $table->get($id);
        $entity = $table->patchEntity($entity, $this->normalizePayload($payload));
        if ($entity->hasErrors()) {
            throw new InvalidArgumentException($tableAlias . ' update failed validation.');
        }

        $table->saveOrFail($entity);
        $this->auditLogger->log($identity, 'compliance_record_updated', $tableAlias, $id, [
            'table' => $tableAlias,
        ]);

        return $entity->toArray();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(string $tableAlias, array $conditions = []): array
    {
        return TableRegistry::getTableLocator()->get($tableAlias)->find()
            ->where($conditions)
            ->orderByDesc('created')
            ->all()
            ->map(fn ($entity) => $entity->toArray())
            ->toList();
    }

    /**
     * @return list<string>
     */
    public function activationBlockers(int $episodeId): array
    {
        $episode = TableRegistry::getTableLocator()->get('Episodes')->get($episodeId);
        $patientId = (int)$episode->get('patient_id');
        $blockers = [];

        $missingDocs = $this->missingComplianceDocuments($patientId);
        if ($missingDocs !== []) {
            $blockers[] = 'Admission compliance packet is missing: ' . implode(', ', $missingDocs) . '.';
        }

        if (!$this->hasMedicationProfileReview($patientId, $episodeId)) {
            $blockers[] = 'Medication profile must be reviewed before admission readiness is complete.';
        }

        if ($this->openIncidentCount($episodeId) > 0 || $this->openInfectionCount($episodeId) > 0) {
            $blockers[] = 'Open incident or infection follow-up must be reviewed before activation.';
        }

        if ($this->authorizationBlocker($episodeId) !== null) {
            $blockers[] = (string)$this->authorizationBlocker($episodeId);
        }

        return $blockers;
    }

    /**
     * @return list<string>
     */
    public function billingBlockers(int $episodeId): array
    {
        $episode = TableRegistry::getTableLocator()->get('Episodes')->get($episodeId);
        $patientId = (int)$episode->get('patient_id');
        $blockers = [];

        if ($this->unsignedNoticeCount($patientId, $episodeId) > 0) {
            $blockers[] = 'Billing requires all formal beneficiary notices to be delivered and signed.';
        }
        if ($this->highRiskMedicationTeachingGapCount($patientId, $episodeId) > 0) {
            $blockers[] = 'High-risk medication teaching must be documented before billing release.';
        }
        if ($this->openVerbalOrderCount($episodeId) > 0) {
            $blockers[] = 'Open verbal orders require physician signature follow-up before billing release.';
        }
        if ($this->aideSupervisionWarning($episodeId) !== null) {
            $blockers[] = (string)$this->aideSupervisionWarning($episodeId);
        }
        if ($this->authorizationBlocker($episodeId) !== null) {
            $blockers[] = (string)$this->authorizationBlocker($episodeId);
        }
        if ($this->openIncidentCount($episodeId) > 0 || $this->openInfectionCount($episodeId) > 0) {
            $blockers[] = 'Billing requires open incident and infection follow-up to be resolved or QAPI-linked.';
        }

        return $blockers;
    }

    /**
     * @return array<string, mixed>
     */
    public function surveyReadiness(string $periodKey = 'current', bool $capture = false, array $identity = []): array
    {
        $categoryScores = [
            'patient_rights' => $this->score($this->totalPatients() - $this->patientsMissingComplianceCount(), max($this->totalPatients(), 1)),
            'orders' => $this->score($this->openVerbalOrdersTotal() === 0 ? 1 : 0, 1),
            'aide_supervision' => $this->score($this->aideSupervisionWarningsTotal() === 0 ? 1 : 0, 1),
            'incidents_infections' => $this->score($this->openIncidentTotal() + $this->openInfectionTotal() === 0 ? 1 : 0, 1),
            'authorization' => $this->score($this->authorizationRiskTotal() === 0 ? 1 : 0, 1),
            'documentation' => $this->score($this->openQaTotal() === 0 ? 1 : 0, 1),
        ];
        $readinessScore = round(array_sum($categoryScores) / max(count($categoryScores), 1), 2);
        $risks = array_filter([
            $this->patientsMissingComplianceCount() > 0 ? $this->patientsMissingComplianceCount() . ' patient compliance packet gap(s)' : null,
            $this->openVerbalOrdersTotal() > 0 ? $this->openVerbalOrdersTotal() . ' open verbal order(s)' : null,
            $this->aideSupervisionWarningsTotal() > 0 ? $this->aideSupervisionWarningsTotal() . ' aide supervision warning(s)' : null,
            ($this->openIncidentTotal() + $this->openInfectionTotal()) > 0 ? 'open incident/infection follow-up' : null,
            $this->authorizationRiskTotal() > 0 ? $this->authorizationRiskTotal() . ' authorization risk(s)' : null,
        ]);

        $summary = [
            'period_key' => $periodKey,
            'readiness_score' => $readinessScore,
            'category_scores' => $categoryScores,
            'risk_summary' => $risks === [] ? 'Survey readiness is clean for the demo dataset.' : implode(' | ', $risks),
            'open_counts' => [
                'missing_compliance_packets' => $this->patientsMissingComplianceCount(),
                'unsigned_notices' => $this->unsignedNoticeTotal(),
                'open_verbal_orders' => $this->openVerbalOrdersTotal(),
                'aide_supervision_warnings' => $this->aideSupervisionWarningsTotal(),
                'open_incidents' => $this->openIncidentTotal(),
                'open_infections' => $this->openInfectionTotal(),
                'authorization_risks' => $this->authorizationRiskTotal(),
                'open_qa_tasks' => $this->openQaTotal(),
            ],
            'captured_at' => date('Y-m-d H:i:s'),
        ];

        if ($capture) {
            $snapshots = TableRegistry::getTableLocator()->get('SurveyReadinessSnapshots');
            $snapshot = $snapshots->newEntity([
                'period_key' => $periodKey,
                'readiness_score' => $readinessScore,
                'risk_summary' => $summary['risk_summary'],
                'category_scores' => json_encode($categoryScores, JSON_THROW_ON_ERROR),
                'captured_at' => $summary['captured_at'],
            ]);
            $snapshots->saveOrFail($snapshot);
            $this->auditLogger->log($identity, 'survey_readiness_captured', 'SurveyReadinessSnapshot', (int)$snapshot->get('id'), [
                'period_key' => $periodKey,
                'readiness_score' => $readinessScore,
            ]);
            $summary['snapshot'] = $snapshot->toArray();
        }

        $summary['history'] = TableRegistry::getTableLocator()->get('SurveyReadinessSnapshots')->find()
            ->orderByDesc('captured_at')
            ->limit(20)
            ->all()
            ->map(function ($snapshot) {
                $data = $snapshot->toArray();
                $data['category_scores'] = $this->decodeJsonArray((string)($data['category_scores'] ?? ''));

                return $data;
            })
            ->toList();

        return $summary;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizePayload(array $payload): array
    {
        foreach ($payload as $key => $value) {
            if (is_string($value) && in_array(strtolower($value), ['yes', 'no', 'true', 'false'], true)) {
                $payload[$key] = filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
            }
        }

        return $payload;
    }

    /**
     * @return list<string>
     */
    private function missingComplianceDocuments(int $patientId): array
    {
        $required = [
            'consent',
            'hipaa_acknowledgement',
            'patient_rights',
            'advance_directive',
            'emergency_preparedness_ack',
        ];
        $documents = TableRegistry::getTableLocator()->get('PatientComplianceDocuments')->find()
            ->where(['patient_id' => $patientId])
            ->all()
            ->toList();
        $completed = [];
        foreach ($documents as $document) {
            if (in_array((string)$document->get('document_status'), ['signed', 'received', 'completed'], true)) {
                $completed[] = (string)$document->get('document_type');
            }
        }

        return array_values(array_diff($required, array_unique($completed)));
    }

    private function hasMedicationProfileReview(int $patientId, int $episodeId): bool
    {
        return TableRegistry::getTableLocator()->get('PatientMedications')->find()
            ->where([
                'patient_id' => $patientId,
                'episode_id IN' => [$episodeId, null],
                'status' => 'active',
                'last_reconciled_at IS NOT' => null,
            ])
            ->count() > 0;
    }

    private function unsignedNoticeCount(int $patientId, int $episodeId): int
    {
        return (int)TableRegistry::getTableLocator()->get('PatientNotices')->find()
            ->where(['patient_id' => $patientId])
            ->andWhere(['OR' => [['episode_id' => $episodeId], ['episode_id IS' => null]]])
            ->andWhere(['notice_status NOT IN' => ['signed', 'delivered', 'completed']])
            ->count();
    }

    private function highRiskMedicationTeachingGapCount(int $patientId, int $episodeId): int
    {
        return (int)TableRegistry::getTableLocator()->get('PatientMedications')->find()
            ->where([
                'patient_id' => $patientId,
                'episode_id IN' => [$episodeId, null],
                'high_risk' => true,
                'teaching_completed' => false,
                'status' => 'active',
            ])
            ->count();
    }

    private function openVerbalOrderCount(int $episodeId): int
    {
        return (int)TableRegistry::getTableLocator()->get('VerbalOrders')->find()
            ->where([
                'episode_id' => $episodeId,
                'status IN' => ['pending_signature', 'sent_to_physician', 'overdue'],
            ])
            ->count();
    }

    private function aideSupervisionWarning(int $episodeId): ?string
    {
        $hhaVisits = TableRegistry::getTableLocator()->get('Visits')->find()
            ->where(['episode_id' => $episodeId, 'discipline' => 'HHA'])
            ->count();
        if ($hhaVisits === 0) {
            return null;
        }

        $recentSupervision = TableRegistry::getTableLocator()->get('AideSupervisionEvents')->find()
            ->where(['episode_id' => $episodeId, 'care_plan_reviewed' => true])
            ->orderByDesc('performed_at')
            ->first();

        if ($recentSupervision === null) {
            return 'HHA services require documented aide supervision and care-plan review.';
        }

        $nextDue = trim((string)$recentSupervision->get('next_due_at'));
        if ($nextDue !== '' && new DateTimeImmutable($nextDue) < new DateTimeImmutable('now')) {
            return 'HHA supervisory visit is overdue.';
        }

        return null;
    }

    private function authorizationBlocker(int $episodeId): ?string
    {
        $episode = TableRegistry::getTableLocator()->get('Episodes')->get($episodeId);
        $payerType = (string)$episode->get('payer_type');
        if (in_array($payerType, ['Medicare', 'Private Pay'], true)) {
            return null;
        }

        $authorization = TableRegistry::getTableLocator()->get('PayerAuthorizations')->find()
            ->where(['episode_id' => $episodeId])
            ->orderByDesc('created')
            ->first();
        if ($authorization === null || (string)$authorization->get('authorization_status') !== 'approved') {
            return 'Managed-care or non-Medicare payer requires approved authorization.';
        }
        if ((int)$authorization->get('authorized_visits') > 0 && (int)$authorization->get('used_visits') >= (int)$authorization->get('authorized_visits')) {
            return 'Visit authorization is exhausted.';
        }
        $endDate = trim((string)$authorization->get('end_date'));
        if ($endDate !== '' && new DateTimeImmutable($endDate . ' 23:59:59') < new DateTimeImmutable('now')) {
            return 'Visit authorization is expired.';
        }

        return null;
    }

    private function openIncidentCount(int $episodeId): int
    {
        return (int)TableRegistry::getTableLocator()->get('IncidentReports')->find()
            ->where(['episode_id' => $episodeId, 'status IN' => ['open', 'investigating', 'qapi_review']])
            ->count();
    }

    private function openInfectionCount(int $episodeId): int
    {
        return (int)TableRegistry::getTableLocator()->get('InfectionLogs')->find()
            ->where(['episode_id' => $episodeId, 'status IN' => ['monitoring', 'open']])
            ->count();
    }

    private function score(int|float $numerator, int|float $denominator): float
    {
        return round(($numerator / max($denominator, 1)) * 100, 2);
    }

    private function totalPatients(): int
    {
        return (int)TableRegistry::getTableLocator()->get('Patients')->find()->count();
    }

    private function patientsMissingComplianceCount(): int
    {
        $patients = TableRegistry::getTableLocator()->get('Patients')->find()->all()->toList();
        $missing = 0;
        foreach ($patients as $patient) {
            if ($this->missingComplianceDocuments((int)$patient->get('id')) !== []) {
                $missing++;
            }
        }

        return $missing;
    }

    private function unsignedNoticeTotal(): int
    {
        return (int)TableRegistry::getTableLocator()->get('PatientNotices')->find()
            ->where(['notice_status NOT IN' => ['signed', 'delivered', 'completed']])
            ->count();
    }

    private function openVerbalOrdersTotal(): int
    {
        return (int)TableRegistry::getTableLocator()->get('VerbalOrders')->find()
            ->where(['status IN' => ['pending_signature', 'sent_to_physician', 'overdue']])
            ->count();
    }

    private function aideSupervisionWarningsTotal(): int
    {
        $episodes = TableRegistry::getTableLocator()->get('Episodes')->find()->all()->toList();
        $warnings = 0;
        foreach ($episodes as $episode) {
            if ($this->aideSupervisionWarning((int)$episode->get('id')) !== null) {
                $warnings++;
            }
        }

        return $warnings;
    }

    private function openIncidentTotal(): int
    {
        return (int)TableRegistry::getTableLocator()->get('IncidentReports')->find()
            ->where(['status IN' => ['open', 'investigating', 'qapi_review']])
            ->count();
    }

    private function openInfectionTotal(): int
    {
        return (int)TableRegistry::getTableLocator()->get('InfectionLogs')->find()
            ->where(['status IN' => ['monitoring', 'open']])
            ->count();
    }

    private function authorizationRiskTotal(): int
    {
        $episodes = TableRegistry::getTableLocator()->get('Episodes')->find()->all()->toList();
        $risks = 0;
        foreach ($episodes as $episode) {
            if ($this->authorizationBlocker((int)$episode->get('id')) !== null) {
                $risks++;
            }
        }

        return $risks;
    }

    private function openQaTotal(): int
    {
        return (int)TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where(['status' => 'open'])
            ->count();
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

        return is_array($decoded) ? $decoded : [];
    }
}
