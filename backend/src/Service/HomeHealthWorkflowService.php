<?php
declare(strict_types=1);

namespace App\Service;

use Cake\ORM\Table;
use Cake\ORM\TableRegistry;
use DateInterval;
use DateTimeImmutable;
use InvalidArgumentException;
use Psr\Http\Message\UploadedFileInterface;
use RuntimeException;

class HomeHealthWorkflowService
{
    private Table $referrals;
    private Table $referralDocuments;
    private Table $physicianOrders;
    private Table $episodes;
    private Table $episodePeriods;
    private Table $assessments;
    private Table $visits;
    private Table $claims;
    private Table $qaTasks;
    private AuditLogger $auditLogger;
    private AssessmentVersionResolver $assessmentVersionResolver;
    private PdgmGrouper $pdgmGrouper;

    public function __construct(
        ?AssessmentVersionResolver $assessmentVersionResolver = null,
        ?PdgmGrouper $pdgmGrouper = null,
    ) {
        $this->assessmentVersionResolver = $assessmentVersionResolver ?? new AssessmentVersionResolver();
        $this->pdgmGrouper = $pdgmGrouper ?? new PdgmGrouper();
        $locator = TableRegistry::getTableLocator();
        $this->referrals = $locator->get('Referrals');
        $this->referralDocuments = $locator->get('ReferralDocuments');
        $this->physicianOrders = $locator->get('PhysicianOrders');
        $this->episodes = $locator->get('Episodes');
        $this->episodePeriods = $locator->get('EpisodePeriods');
        $this->assessments = $locator->get('Assessments');
        $this->visits = $locator->get('Visits');
        $this->claims = $locator->get('Claims');
        $this->qaTasks = $locator->get('QaTasks');
        $this->auditLogger = new AuditLogger($locator->get('AuditEvents'));
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function convertReferralToEpisode(int $referralId, array $identity): array
    {
        $referral = $this->referrals->get($referralId);
        if (!(bool)$referral->get('intake_ready')) {
            throw new RuntimeException('Referral is not intake-ready for episode creation.');
        }

        $certStart = new DateTimeImmutable((string)$referral->get('planned_soc_date'));
        $certEnd = $certStart->add(new DateInterval('P59D'));
        $snapshot = $this->buildAdmissionSnapshot($referral);
        $episode = $this->episodes->newEntity([
            'patient_id' => $referral->get('patient_id'),
            'referral_id' => $referral->get('id'),
            'cert_start_date' => $certStart->format('Y-m-d'),
            'cert_end_date' => $certEnd->format('Y-m-d'),
            'episode_status' => 'pending_admission',
            'payer_type' => $referral->get('payer_type'),
            'primary_diagnosis' => $referral->get('primary_diagnosis'),
            'admission_readiness_snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR),
            'oasis_version_required' => $this->assessmentVersionResolver->resolve($certStart->format('Y-m-d 00:00:00')),
        ]);
        $this->episodes->saveOrFail($episode);
        $this->createAdmissionPhysicianOrder($episode, $referral);

        foreach ([1, 2] as $periodNumber) {
            $periodStart = $certStart->add(new DateInterval('P' . (($periodNumber - 1) * 30) . 'D'));
            $periodEnd = $periodStart->add(new DateInterval('P29D'));
            $period = $this->episodePeriods->newEntity([
                'episode_id' => $episode->get('id'),
                'period_number' => $periodNumber,
                'period_start_date' => $periodStart->format('Y-m-d'),
                'period_end_date' => $periodEnd->format('Y-m-d'),
                'status' => 'open',
            ]);
            $this->episodePeriods->saveOrFail($period);
        }

        $referral = $this->referrals->patchEntity($referral, ['status' => 'converted_to_episode']);
        $this->referrals->saveOrFail($referral);

        $qaTask = $this->qaTasks->newEntity([
            'episode_id' => $episode->get('id'),
            'task_type' => 'admission_readiness',
            'priority' => 'high',
            'status' => 'open',
            'title' => 'Review SOC readiness and physician orders',
            'details' => $this->admissionReadinessDetails($snapshot),
            'assigned_role' => 'Clinical',
            'due_at' => $certStart->format('Y-m-d 09:00:00'),
        ]);
        $this->qaTasks->saveOrFail($qaTask);
        $this->createIntakeDocumentationTasks((int)$episode->get('id'), $snapshot, $certStart);

        $this->auditLogger->log($identity, 'referral_converted', 'Episode', (int)$episode->get('id'), [
            'referral_id' => $referralId,
        ]);

        return $episode->toArray();
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function updateReferralIntakeDocumentation(int $referralId, array $payload, array $identity): array
    {
        $patch = [];

        if (array_key_exists('face_to_face_date', $payload)) {
            $patch['face_to_face_date'] = $payload['face_to_face_date'];
        }
        if (array_key_exists('physician_orders_signed', $payload)) {
            $patch['physician_orders_signed'] = (bool)$payload['physician_orders_signed'];
        }
        if (array_key_exists('physician_orders_signed_at', $payload)) {
            $patch['physician_orders_signed_at'] = $payload['physician_orders_signed_at'];
        }
        if (array_key_exists('order_status', $payload)) {
            $patch['order_status'] = $payload['order_status'];
        }

        if ($patch === []) {
            throw new InvalidArgumentException('No intake documentation updates were provided.');
        }

        $referral = $this->updateReferralAndLinkedEpisodes($referralId, $patch, 'Referral intake documentation update failed validation.');
        $this->auditLogger->log($identity, 'referral_intake_docs_updated', 'Referral', $referralId, $patch);

        return $referral->toArray();
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function updateReferralDetails(int $referralId, array $payload, array $identity): array
    {
        $patch = $payload;
        if (array_key_exists('requested_disciplines', $patch) && is_array($patch['requested_disciplines'])) {
            $patch['requested_disciplines'] = json_encode($patch['requested_disciplines'], JSON_THROW_ON_ERROR);
        }

        $referral = $this->updateReferralAndLinkedEpisodes($referralId, $patch, 'Referral update failed validation.');
        $this->auditLogger->log($identity, 'referral_updated', 'Referral', $referralId, $patch);

        return $referral->toArray();
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function addReferralDocument(int $referralId, array $payload, array $identity): array
    {
        $document = $this->referralDocuments->newEntity([
            'referral_id' => $referralId,
            'document_type' => $payload['document_type'] ?? '',
            'document_status' => $payload['document_status'] ?? 'requested',
            'source_name' => $payload['source_name'] ?? null,
            'received_at' => $payload['received_at'] ?? null,
            'signed_at' => $payload['signed_at'] ?? null,
            'document_note' => $payload['document_note'] ?? null,
        ]);
        if ($document->hasErrors()) {
            throw new InvalidArgumentException('Referral document failed validation.');
        }

        $this->referralDocuments->saveOrFail($document);
        $this->syncReferralDocumentationFromDocuments($referralId);
        $this->auditLogger->log($identity, 'referral_document_added', 'ReferralDocument', (int)$document->get('id'), [
            'referral_id' => $referralId,
            'document_type' => $document->get('document_type'),
            'document_status' => $document->get('document_status'),
        ]);

        return $document->toArray();
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function updateReferralDocument(int $documentId, array $payload, array $identity): array
    {
        $document = $this->referralDocuments->get($documentId);
        $patch = array_intersect_key($payload, array_flip([
            'document_status',
            'source_name',
            'received_at',
            'signed_at',
            'document_note',
        ]));
        $patch['document_type'] = $document->get('document_type');
        $document = $this->referralDocuments->patchEntity($document, $patch);
        if ($document->hasErrors()) {
            throw new InvalidArgumentException('Referral document update failed validation.');
        }

        $this->referralDocuments->saveOrFail($document);
        $referralId = (int)$document->get('referral_id');
        $this->syncReferralDocumentationFromDocuments($referralId);
        $this->auditLogger->log($identity, 'referral_document_updated', 'ReferralDocument', $documentId, [
            'referral_id' => $referralId,
            'document_type' => $document->get('document_type'),
            'document_status' => $document->get('document_status'),
        ]);

        return $document->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function attachReferralDocumentFile(int $documentId, mixed $uploadedFile, array $identity): array
    {
        $document = $this->referralDocuments->get($documentId);
        if (!$uploadedFile instanceof UploadedFileInterface) {
            throw new InvalidArgumentException('A file attachment is required.');
        }
        if ($uploadedFile->getError() !== UPLOAD_ERR_OK) {
            throw new InvalidArgumentException('The uploaded file could not be processed.');
        }
        if ($uploadedFile->getSize() === null || $uploadedFile->getSize() <= 0) {
            throw new InvalidArgumentException('The uploaded file is empty.');
        }
        if ($uploadedFile->getSize() > 10 * 1024 * 1024) {
            throw new InvalidArgumentException('Referral document attachments must be 10 MB or smaller.');
        }

        $originalName = $uploadedFile->getClientFilename() ?: 'document.bin';
        $extension = pathinfo($originalName, PATHINFO_EXTENSION);
        $safeExtension = $extension !== '' ? '.' . strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $extension)) : '';
        $storageDirectory = ROOT . DS . 'tmp' . DS . 'referral_documents';
        if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0775, true) && !is_dir($storageDirectory)) {
            throw new RuntimeException('Unable to prepare referral document storage.');
        }

        $storedFileName = sprintf('referral-document-%d-%s%s', $documentId, bin2hex(random_bytes(8)), $safeExtension);
        $targetPath = $storageDirectory . DS . $storedFileName;
        $uploadedFile->moveTo($targetPath);

        $existingPath = (string)$document->get('attachment_path');
        if ($existingPath !== '' && $existingPath !== $targetPath && is_file($existingPath)) {
            @unlink($existingPath);
        }

        $document = $this->referralDocuments->patchEntity($document, [
            'original_file_name' => $originalName,
            'stored_file_name' => $storedFileName,
            'mime_type' => $uploadedFile->getClientMediaType() ?: 'application/octet-stream',
            'file_size' => $uploadedFile->getSize(),
            'attachment_path' => $targetPath,
        ]);
        $this->referralDocuments->saveOrFail($document);

        $this->auditLogger->log($identity, 'referral_document_attachment_uploaded', 'ReferralDocument', $documentId, [
            'referral_id' => $document->get('referral_id'),
            'original_file_name' => $originalName,
            'file_size' => $uploadedFile->getSize(),
        ]);

        return $document->toArray();
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function addEpisodePhysicianOrder(int $episodeId, array $payload, array $identity): array
    {
        $episode = $this->episodes->get($episodeId);
        $scope = trim((string)($payload['order_scope'] ?? 'plan_of_care'));
        $summary = trim((string)($payload['order_summary'] ?? ''));
        $note = trim((string)($payload['order_note'] ?? ''));
        $status = trim((string)($payload['order_status'] ?? 'draft'));

        if ($scope === '') {
            throw new InvalidArgumentException('Order scope is required.');
        }

        $generatedDraft = ($summary === '' || $note === '') ? $this->generatePhysicianOrderDraft($episodeId, $scope) : null;
        $version = $this->nextPhysicianOrderVersion($episodeId, $scope);
        $this->supersedeActiveOrdersForScope($episodeId, $scope);

        $order = $this->physicianOrders->newEntity([
            'referral_id' => $episode->get('referral_id'),
            'episode_id' => $episodeId,
            'order_scope' => $scope,
            'version_number' => $version,
            'order_status' => $status,
            'active' => true,
            'sent_at' => $payload['sent_at'] ?? null,
            'received_at' => $payload['received_at'] ?? null,
            'signed_at' => $payload['signed_at'] ?? null,
            'signer_name' => $payload['signer_name'] ?? null,
            'order_summary' => $summary !== '' ? $summary : ($generatedDraft['order_summary'] ?? sprintf('%s physician order packet', $this->labelizeScope($scope))),
            'order_note' => $note !== '' ? $note : ($generatedDraft['order_note'] ?? null),
        ]);
        if ($order->hasErrors()) {
            throw new InvalidArgumentException('Physician order failed validation.');
        }

        $this->physicianOrders->saveOrFail($order);
        $this->syncOrderQaTask((int)$order->get('id'));
        if ($scope === 'admission') {
            $this->syncAdmissionOrderBackToReferral($order);
        }
        $this->auditLogger->log($identity, 'physician_order_created', 'PhysicianOrder', (int)$order->get('id'), [
            'episode_id' => $episodeId,
            'order_scope' => $scope,
            'version_number' => $version,
            'order_status' => $status,
        ]);

        return $order->toArray();
    }

    /**
     * @return array<string, mixed>
     */
    public function generatePhysicianOrderDraft(int $episodeId, string $scope): array
    {
        $episode = $this->episodes->get($episodeId);
        $assessment = $this->findFinalizedAssessment($episodeId);
        $snapshot = $this->decodeAdmissionSnapshot((string)$episode->get('admission_readiness_snapshot'));
        $recentVisits = $this->recentDocumentedVisits($episodeId);
        $scopeLabel = $this->labelizeScope($scope);

        $summaryParts = [
            sprintf('%s physician order packet for %s.', $scopeLabel, (string)$episode->get('primary_diagnosis')),
        ];
        if ($assessment !== null) {
            $summaryParts[] = sprintf(
                'Finalized %s on %s with functional score %s and %s comorbidity.',
                (string)$assessment->get('oasis_version'),
                (string)$assessment->get('completed_at'),
                (string)$assessment->get('functional_score'),
                (string)$assessment->get('comorbidity_level'),
            );
            if (trim((string)$assessment->get('homebound_status')) !== '') {
                $summaryParts[] = sprintf('Homebound status: %s.', (string)$assessment->get('homebound_status'));
            }
            if (trim((string)$assessment->get('care_plan_goals')) !== '') {
                $summaryParts[] = 'Goals: ' . trim((string)$assessment->get('care_plan_goals')) . '.';
            }
        }
        if (!empty($snapshot['requested_disciplines'])) {
            $summaryParts[] = 'Disciplines: ' . implode(', ', (array)$snapshot['requested_disciplines']) . '.';
        }
        if (trim((string)($snapshot['admission_source'] ?? '')) !== '') {
            $summaryParts[] = 'Admission source: ' . trim((string)$snapshot['admission_source']) . '.';
        }

        $visitHighlights = [];
        foreach ($recentVisits as $visit) {
            $payload = $this->decodeJsonArray((string)$visit->get('documentation_payload'));
            $focus = trim((string)($payload['visit_focus'] ?? ''));
            $followUp = trim((string)($payload['next_visit_focus'] ?? ''));
            $highlight = sprintf(
                '%s %s on %s',
                strtoupper((string)$visit->get('discipline')),
                (string)$visit->get('visit_type'),
                (string)$visit->get('actual_end') ?: (string)$visit->get('scheduled_end'),
            );
            if ($focus !== '') {
                $highlight .= ': ' . $focus;
            }
            if ($followUp !== '') {
                $highlight .= ' Next: ' . $followUp;
            }
            $visitHighlights[] = $highlight . '.';
        }

        $noteParts = [
            sprintf('Generated from the current clinical chart for %s review.', strtolower($scopeLabel)),
        ];
        if ($assessment !== null && trim((string)$assessment->get('clinical_summary')) !== '') {
            $noteParts[] = 'Assessment summary: ' . trim((string)$assessment->get('clinical_summary')) . '.';
        }
        if ($assessment !== null && (bool)$assessment->get('medication_reconciliation_completed')) {
            $noteParts[] = 'Medication reconciliation is documented on the finalized assessment.';
        }
        if ($visitHighlights !== []) {
            $noteParts[] = 'Recent documented visits: ' . implode(' ', $visitHighlights);
        }

        return [
            'episode_id' => $episodeId,
            'order_scope' => $scope,
            'order_summary' => trim(implode(' ', array_filter($summaryParts))),
            'order_note' => trim(implode(' ', array_filter($noteParts))),
            'recent_visit_highlights' => $visitHighlights,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function updatePhysicianOrder(int $orderId, array $payload, array $identity): array
    {
        $order = $this->physicianOrders->get($orderId);
        $patch = array_intersect_key($payload, array_flip([
            'order_status',
            'sent_at',
            'received_at',
            'signed_at',
            'signer_name',
            'order_summary',
            'order_note',
            'referral_document_id',
        ]));
        if (($patch['order_status'] ?? null) === 'signed' && empty($patch['signed_at']) && empty($order->get('signed_at'))) {
            throw new InvalidArgumentException('Signed physician orders require a signed timestamp.');
        }
        $order = $this->physicianOrders->patchEntity($order, $patch);
        if ($order->hasErrors()) {
            throw new InvalidArgumentException('Physician order update failed validation.');
        }

        $this->physicianOrders->saveOrFail($order);
        $this->syncOrderQaTask((int)$order->get('id'));
        if ((string)$order->get('order_scope') === 'admission') {
            $this->syncAdmissionOrderBackToReferral($order);
        }
        $this->syncEpisodeSnapshotFromOrders((int)$order->get('episode_id'));
        $this->auditLogger->log($identity, 'physician_order_updated', 'PhysicianOrder', $orderId, [
            'episode_id' => $order->get('episode_id'),
            'order_scope' => $order->get('order_scope'),
            'version_number' => $order->get('version_number'),
            'order_status' => $order->get('order_status'),
        ]);

        return $order->toArray();
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function updateEpisodeAdmissionDetails(int $episodeId, array $payload, array $identity): array
    {
        $episode = $this->episodes->get($episodeId);
        $referralId = $episode->get('referral_id');
        if ($referralId === null) {
            throw new RuntimeException('This episode is not linked to a referral intake record.');
        }

        $allowedFields = [
            'admission_source',
            'requested_disciplines',
            'referring_provider_name',
            'referring_provider_phone',
            'pcp_name',
            'pcp_phone',
            'caregiver_name',
            'caregiver_relationship',
            'caregiver_phone',
            'service_location_type',
            'service_address1',
            'service_city',
            'service_state',
            'service_postal_code',
            'notes',
        ];
        $patch = array_intersect_key($payload, array_flip($allowedFields));
        if ($patch === []) {
            throw new InvalidArgumentException('No episode admission updates were provided.');
        }

        $this->updateReferralDetails((int)$referralId, $patch, $identity);

        return $this->episodes->get($episodeId)->toArray();
    }

    /**
     * @param array<string, mixed> $identity
     * @return array<string, mixed>
     */
    public function activateEpisode(int $episodeId, array $identity): array
    {
        $readiness = $this->evaluateEpisodeReadiness($episodeId);
        if ($readiness['ready_to_activate'] !== true) {
            throw new RuntimeException((string)$readiness['primary_blocker']);
        }

        $episode = $this->episodes->get($episodeId);
        $socVisit = $this->findCompletedSocVisit($episodeId);
        $assessment = $this->findFinalizedAssessment($episodeId);
        if ($socVisit === null || $assessment === null) {
            throw new RuntimeException('Episode readiness changed before activation. Please refresh and try again.');
        }

        $snapshot = $this->decodeAdmissionSnapshot((string)$episode->get('admission_readiness_snapshot'));
        $pdgmAdmissionSource = $this->mapPdgmAdmissionSource((string)($snapshot['admission_source'] ?? 'community'));

        $pdgm = $this->pdgmGrouper->group([
            'principal_diagnosis_code' => $assessment->get('principal_diagnosis_code'),
            'functional_score' => $assessment->get('functional_score'),
            'comorbidity_level' => $assessment->get('comorbidity_level'),
            'period_number' => 1,
            'admission_source' => $pdgmAdmissionSource,
        ]);

        $socDate = new DateTimeImmutable((string)$socVisit->get('actual_start'));
        $episode = $this->episodes->patchEntity($episode, [
            'start_of_care_date' => $socDate->format('Y-m-d'),
            'episode_status' => 'active',
            'noa_due_date' => $socDate->add(new DateInterval('P5D'))->format('Y-m-d'),
            'pdgm_group_code' => $pdgm['group_code'],
            'oasis_version_required' => $assessment->get('oasis_version'),
        ]);
        $this->episodes->saveOrFail($episode);

        $noaClaim = $this->claims->newEntity([
            'episode_id' => $episodeId,
            'claim_type' => 'noa',
            'status' => 'draft',
            'hold_reason' => null,
            'billing_period_start' => $episode->get('cert_start_date'),
            'billing_period_end' => $episode->get('cert_end_date'),
            'amount' => 0,
        ]);
        $this->claims->saveOrFail($noaClaim);

        $qaTask = $this->qaTasks->newEntity([
            'episode_id' => $episodeId,
            'assessment_id' => $assessment->get('id'),
            'task_type' => 'oasis_review',
            'priority' => 'high',
            'status' => 'open',
            'title' => 'Review OASIS and release episode for scheduling',
            'details' => sprintf(
                'Episode activated. Validate OASIS, diagnosis coding, NOA readiness, and PDGM grouping (%s, %s).',
                $pdgm['group_code'],
                $pdgmAdmissionSource,
            ),
            'assigned_role' => 'QA',
            'due_at' => $socDate->add(new DateInterval('P1D'))->format('Y-m-d H:i:s'),
        ]);
        $this->qaTasks->saveOrFail($qaTask);

        $this->auditLogger->log($identity, 'episode_activated', 'Episode', $episodeId, $pdgm);

        return $episode->toArray() + ['pdgm' => $pdgm];
    }

    /**
     * @return array<string, mixed>
     */
    public function evaluateEpisodeReadiness(int $episodeId): array
    {
        $socVisit = $this->findCompletedSocVisit($episodeId);
        $assessment = $this->findFinalizedAssessment($episodeId);
        $snapshot = $this->decodeAdmissionSnapshot((string)$this->episodes->get($episodeId)->get('admission_readiness_snapshot'));
        $openQaTasks = $this->qaTasks->find()
            ->where(['episode_id' => $episodeId, 'status' => 'open'])
            ->count();
        $pendingEvv = TableRegistry::getTableLocator()->get('EvvRecords')->find()
            ->matching('Visits', fn ($q) => $q->where(['Visits.episode_id' => $episodeId]))
            ->where(['EvvRecords.status IN' => ['pending_submission', 'exception']])
            ->count();
        $claimHolds = $this->claims->find()
            ->where(['episode_id' => $episodeId])
            ->andWhere(['hold_reason IS NOT' => null])
            ->count();

        $blockers = [];
        if ($socVisit === null) {
            $blockers[] = 'Episode cannot activate until the Start of Care visit is completed.';
        }
        if ($assessment === null) {
            $blockers[] = 'Episode cannot activate until a finalized OASIS assessment exists.';
        }
        if ($assessment !== null) {
            foreach ($this->activationAssessmentBlockers($assessment) as $assessmentBlocker) {
                $blockers[] = $assessmentBlocker;
            }
        }
        if (!$this->hasFaceToFaceDocumentation($snapshot)) {
            $blockers[] = 'Episode cannot activate until face-to-face documentation is captured on the referral.';
        }
        if (!$this->hasSignedPhysicianOrders($snapshot)) {
            $blockers[] = 'Episode cannot activate until physician orders are signed.';
        }
        if ($this->hasUnsignedActiveOrders($episodeId, ['admission'])) {
            $blockers[] = 'Episode cannot activate until the active admission physician order packet is signed.';
        }
        $complianceBlockers = (new HomeHealthComplianceService())->activationBlockers($episodeId);
        foreach ($complianceBlockers as $complianceBlocker) {
            $blockers[] = $complianceBlocker;
        }
        if ($openQaTasks > 0) {
            $blockers[] = sprintf('%d open QA task(s) still need review.', $openQaTasks);
        }
        if ($pendingEvv > 0) {
            $blockers[] = sprintf('%d EVV record(s) are still pending submission or correction.', $pendingEvv);
        }
        if ($claimHolds > 0) {
            $blockers[] = sprintf('%d claim(s) currently have hold reasons.', $claimHolds);
        }

        $readyToActivate = $socVisit !== null
            && $assessment !== null
            && $this->activationAssessmentBlockers($assessment) === []
            && $this->hasFaceToFaceDocumentation($snapshot)
            && $this->hasSignedPhysicianOrders($snapshot)
            && !$this->hasUnsignedActiveOrders($episodeId, ['admission'])
            && $complianceBlockers === [];

        return [
            'episode_id' => $episodeId,
            'soc_visit_completed' => $socVisit !== null,
            'finalized_assessment_exists' => $assessment !== null,
            'open_qa_tasks' => $openQaTasks,
            'pending_evv_records' => $pendingEvv,
            'claim_holds' => $claimHolds,
            'ready_to_activate' => $readyToActivate,
            'primary_blocker' => $blockers[0] ?? null,
            'blockers' => $blockers,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function evaluateBillingReadiness(int $episodeId): array
    {
        $episode = $this->episodes->get($episodeId);
        $assessment = $this->findFinalizedAssessment($episodeId);
        $snapshot = $this->decodeAdmissionSnapshot((string)$episode->get('admission_readiness_snapshot'));
        $blockers = [];

        if ((string)$episode->get('episode_status') !== 'active') {
            $blockers[] = 'Episode must be active before final billing submission.';
        }
        if ($assessment === null) {
            $blockers[] = 'Billing requires a finalized OASIS assessment.';
        }
        if ($assessment !== null) {
            foreach ($this->billingAssessmentBlockers($assessment) as $assessmentBlocker) {
                $blockers[] = $assessmentBlocker;
            }
        }

        $expectedDiagnosis = $this->extractDiagnosisCode((string)$episode->get('primary_diagnosis'));
        $assessmentDiagnosis = $assessment !== null ? strtoupper(trim((string)$assessment->get('principal_diagnosis_code'))) : '';
        if ($assessmentDiagnosis === '' || !$this->isValidDiagnosisCode($assessmentDiagnosis)) {
            $blockers[] = 'Billing requires a valid ICD-10 principal diagnosis code on the finalized assessment.';
        }
        if ($expectedDiagnosis !== '' && $assessmentDiagnosis !== '' && $expectedDiagnosis !== $assessmentDiagnosis) {
            $blockers[] = sprintf(
                'Assessment diagnosis %s does not match the episode primary diagnosis %s.',
                $assessmentDiagnosis,
                $expectedDiagnosis,
            );
        }
        if (trim((string)($snapshot['admission_source'] ?? '')) === '') {
            $blockers[] = 'Billing requires an admission source on the episode intake snapshot.';
        }
        if (!$this->hasFaceToFaceDocumentation($snapshot)) {
            $blockers[] = 'Billing requires face-to-face documentation on the episode intake snapshot.';
        }
        if (!$this->hasSignedPhysicianOrders($snapshot)) {
            $blockers[] = 'Billing requires signed physician orders on the episode intake snapshot.';
        }
        if ($this->hasUnsignedActiveOrders($episodeId, ['admission', 'plan_of_care', 'recertification', 'resume_of_care'])) {
            $blockers[] = 'Billing requires all active physician order packets to be signed.';
        }
        if (trim((string)$episode->get('pdgm_group_code')) === '') {
            $blockers[] = 'Billing requires PDGM grouping before claim submission.';
        }
        $unlockedCompletedVisitCount = $this->visits->find()
            ->where([
                'episode_id' => $episodeId,
                'status IN' => ['completed', 'locked'],
            ])
            ->andWhere(['documentation_status !=' => 'locked'])
            ->count();
        if ($unlockedCompletedVisitCount > 0) {
            $blockers[] = 'Billing requires all completed visit documentation to be QA-locked before submission.';
        }
        foreach ((new HomeHealthComplianceService())->billingBlockers($episodeId) as $complianceBlocker) {
            $blockers[] = $complianceBlocker;
        }

        return [
            'episode_id' => $episodeId,
            'ready_to_bill' => $blockers === [],
            'primary_blocker' => $blockers[0] ?? null,
            'blockers' => $blockers,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function buildEpisodeReviewSummary(int $episodeId): array
    {
        $episode = $this->episodes->get($episodeId, contain: ['Patients']);
        $activationReadiness = $this->evaluateEpisodeReadiness($episodeId);
        $billingReadiness = $this->evaluateBillingReadiness($episodeId);
        $openQaTasks = $this->qaTasks->find()
            ->where(['episode_id' => $episodeId, 'status' => 'open'])
            ->orderByAsc('due_at')
            ->all()
            ->toList();
        $pendingEvvRecords = TableRegistry::getTableLocator()->get('EvvRecords')->find()
            ->matching('Visits', fn ($q) => $q->where(['Visits.episode_id' => $episodeId]))
            ->where(['EvvRecords.status IN' => ['pending_submission', 'exception']])
            ->count();
        $activeOrders = $this->physicianOrders->find()
            ->where([
                'episode_id' => $episodeId,
                'active' => true,
            ])
            ->orderByAsc('order_scope')
            ->all()
            ->toList();
        $unsignedActiveOrders = array_filter(
            $activeOrders,
            fn ($order) => (string)$order->get('order_status') !== 'signed' || $order->get('signed_at') === null,
        );
        $completedVisits = $this->visits->find()
            ->where([
                'episode_id' => $episodeId,
                'status IN' => ['completed', 'locked'],
            ])
            ->count();
        $lockedVisits = $this->visits->find()
            ->where([
                'episode_id' => $episodeId,
                'documentation_status' => 'locked',
            ])
            ->count();
        $holdReasons = [];
        $claims = $this->claims->find()
            ->where(['episode_id' => $episodeId])
            ->all()
            ->toList();
        foreach ($claims as $claim) {
            foreach ($this->splitHoldReasons((string)$claim->get('hold_reason')) as $reason) {
                if (!in_array($reason, $holdReasons, true)) {
                    $holdReasons[] = $reason;
                }
            }
        }

        $draft = $this->generatePhysicianOrderDraft($episodeId, 'plan_of_care');

        return [
            'episode_id' => $episodeId,
            'patient_name' => trim((string)$episode->get('patient')->get('first_name') . ' ' . (string)$episode->get('patient')->get('last_name')),
            'episode_status' => (string)$episode->get('episode_status'),
            'ready_to_activate' => (bool)$activationReadiness['ready_to_activate'],
            'ready_to_bill' => (bool)$billingReadiness['ready_to_bill'],
            'activation_blockers' => $activationReadiness['blockers'],
            'billing_blockers' => $billingReadiness['blockers'],
            'open_qa_tasks' => count($openQaTasks),
            'pending_evv_records' => $pendingEvvRecords,
            'unsigned_active_orders' => count($unsignedActiveOrders),
            'completed_visits' => $completedVisits,
            'locked_visits' => $lockedVisits,
            'hold_reasons' => $holdReasons,
            'open_task_titles' => array_map(
                fn ($task) => sprintf('%s: %s', (string)$task->get('task_type'), (string)$task->get('title')),
                $openQaTasks,
            ),
            'active_order_summaries' => array_values(array_filter(array_map(
                fn ($order) => sprintf(
                    '%s v%s (%s)%s',
                    $this->labelizeScope((string)$order->get('order_scope')),
                    (string)$order->get('version_number'),
                    (string)$order->get('order_status'),
                    trim((string)$order->get('order_summary')) !== '' ? ' - ' . trim((string)$order->get('order_summary')) : '',
                ),
                $activeOrders,
            ))),
            'recent_visit_highlights' => $draft['recent_visit_highlights'] ?? [],
        ];
    }

    /**
     * @param array<string, mixed> $identity
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function transitionEpisode(int $episodeId, string $transitionType, array $identity, array $payload = []): array
    {
        $allowedTransitions = [
            'recertify' => 'recert_due',
            'transfer' => 'transferred',
            'resume_care' => 'roc_pending',
            'discharge' => 'discharged',
            'death_at_home' => 'deceased',
        ];
        if (!isset($allowedTransitions[$transitionType])) {
            throw new RuntimeException('Unknown lifecycle transition requested.');
        }

        $episode = $this->episodes->get($episodeId);
        $effectiveDate = new DateTimeImmutable((string)($payload['effective_date'] ?? date('Y-m-d')));
        $note = trim((string)($payload['note'] ?? ''));
        $createdVisits = [];

        $episode = $this->episodes->patchEntity($episode, [
            'episode_status' => $allowedTransitions[$transitionType],
        ]);
        $this->episodes->saveOrFail($episode);

        if (in_array($transitionType, ['transfer', 'discharge', 'death_at_home'], true)) {
            $this->holdFutureScheduledVisits($episodeId, $effectiveDate);
            $this->placeClaimHold($episodeId, ucfirst(str_replace('_', ' ', $transitionType)) . ' requires billing review before submission.');
        }

        if ($transitionType === 'recertify') {
            $createdVisits[] = $this->scheduleLifecycleVisit($episode, 'recertification', $effectiveDate, (string)($payload['clinician_name'] ?? 'Clinical Manager'));
            $this->createLifecyclePhysicianOrder($episode, 'recertification', $effectiveDate, (string)($payload['note'] ?? ''));
        }

        if ($transitionType === 'resume_care') {
            $createdVisits[] = $this->scheduleLifecycleVisit($episode, 'roc', $effectiveDate, (string)($payload['clinician_name'] ?? 'Clinical Manager'));
            $this->createLifecyclePhysicianOrder($episode, 'resume_of_care', $effectiveDate, (string)($payload['note'] ?? ''));
        }

        $qaTask = $this->qaTasks->newEntity([
            'episode_id' => $episodeId,
            'task_type' => $transitionType,
            'priority' => in_array($transitionType, ['death_at_home', 'transfer'], true) ? 'high' : 'medium',
            'status' => 'open',
            'title' => $this->transitionTitle($transitionType),
            'details' => $note !== '' ? $note : $this->transitionDefaultDetails($transitionType),
            'assigned_role' => in_array($transitionType, ['recertify', 'resume_care'], true) ? 'Clinical' : 'QA',
            'due_at' => $effectiveDate->format('Y-m-d 09:00:00'),
        ]);
        $this->qaTasks->saveOrFail($qaTask);

        $this->auditLogger->log($identity, 'episode_transitioned', 'Episode', $episodeId, [
            'transition_type' => $transitionType,
            'effective_date' => $effectiveDate->format('Y-m-d'),
            'note' => $note,
        ]);

        return [
            'episode' => $episode->toArray(),
            'transition_type' => $transitionType,
            'qa_task_id' => $qaTask->get('id'),
            'created_visit_ids' => array_map(static fn ($visit) => (int)$visit->get('id'), array_filter($createdVisits)),
        ];
    }

    private function findCompletedSocVisit(int $episodeId): mixed
    {
        return $this->visits->find()
            ->where([
                'episode_id' => $episodeId,
                'visit_type' => 'soc',
                'status IN' => ['completed', 'locked'],
            ])
            ->first();
    }

    private function findFinalizedAssessment(int $episodeId): mixed
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
     * @return list<string>
     */
    private function activationAssessmentBlockers(object $assessment): array
    {
        $blockers = [];
        if (trim((string)$assessment->get('homebound_status')) === '') {
            $blockers[] = 'Episode cannot activate until the finalized assessment documents homebound status.';
        }
        if (trim((string)$assessment->get('homebound_narrative')) === '') {
            $blockers[] = 'Episode cannot activate until the finalized assessment includes a homebound narrative.';
        }
        if (
            in_array(strtolower((string)$assessment->get('assessment_type')), ['soc', 'roc', 'recertification'], true)
            && !(bool)$assessment->get('medication_reconciliation_completed')
        ) {
            $blockers[] = 'Episode cannot activate until medication reconciliation is documented on the finalized assessment.';
        }

        return $blockers;
    }

    /**
     * @return list<string>
     */
    private function billingAssessmentBlockers(object $assessment): array
    {
        $blockers = $this->activationAssessmentBlockers($assessment);

        if (trim((string)$assessment->get('clinical_summary')) === '') {
            $blockers[] = 'Billing requires a clinical summary on the finalized assessment.';
        }
        if (trim((string)$assessment->get('care_plan_goals')) === '') {
            $blockers[] = 'Billing requires documented care plan goals on the finalized assessment.';
        }

        return $blockers;
    }

    private function holdFutureScheduledVisits(int $episodeId, DateTimeImmutable $effectiveDate): void
    {
        $visits = $this->visits->find()
            ->where([
                'episode_id' => $episodeId,
                'scheduled_start >=' => $effectiveDate->format('Y-m-d 00:00:00'),
                'status' => 'scheduled',
            ])
            ->all();

        foreach ($visits as $visit) {
            $visit = $this->visits->patchEntity($visit, [
                'status' => 'held_for_qa',
                'documentation_summary' => trim((string)$visit->get('documentation_summary') . ' Lifecycle transition placed this visit on hold.'),
            ]);
            $this->visits->saveOrFail($visit);
        }
    }

    private function placeClaimHold(int $episodeId, string $reason): void
    {
        $claims = $this->claims->find()
            ->where(['episode_id' => $episodeId, 'status IN' => ['draft', 'ready']])
            ->all();

        foreach ($claims as $claim) {
            $claim = $this->claims->patchEntity($claim, ['hold_reason' => $reason]);
            $this->claims->saveOrFail($claim);
        }
    }

    private function scheduleLifecycleVisit(object $episode, string $visitType, DateTimeImmutable $effectiveDate, string $clinicianName): mixed
    {
        $visitStart = $effectiveDate->format('Y-m-d') . ' 09:00:00';
        $visitEnd = $effectiveDate->format('Y-m-d') . ' 10:00:00';

        $visit = $this->visits->newEntity([
            'episode_id' => $episode->get('id'),
            'patient_id' => $episode->get('patient_id'),
            'visit_type' => $visitType,
            'discipline' => 'SN',
            'scheduled_start' => $visitStart,
            'scheduled_end' => $visitEnd,
            'clinician_name' => $clinicianName,
            'status' => 'scheduled',
            'requires_evv' => false,
            'sync_status' => 'synced',
            'documentation_summary' => ucfirst(str_replace('_', ' ', $visitType)) . ' visit created by lifecycle transition.',
        ]);
        $this->visits->saveOrFail($visit);

        return $visit;
    }

    private function transitionTitle(string $transitionType): string
    {
        return match ($transitionType) {
            'recertify' => 'Prepare recertification assessment and orders',
            'transfer' => 'Close out transfer workflow and billing review',
            'resume_care' => 'Schedule Resume of Care assessment',
            'discharge' => 'Review discharge summary and close episode',
            'death_at_home' => 'Handle death-at-home closeout and billing review',
            default => 'Review lifecycle transition',
        };
    }

    private function transitionDefaultDetails(string $transitionType): string
    {
        return match ($transitionType) {
            'recertify' => 'Episode is approaching the end of the certification period and needs recertification follow-up.',
            'transfer' => 'Patient is transferring to another provider; hold future visits and review remaining billing.',
            'resume_care' => 'Patient is resuming care after an interruption and needs ROC assessment scheduling.',
            'discharge' => 'Episode is discharging; confirm documentation completeness and stop future scheduling.',
            'death_at_home' => 'Patient expired at home; stop future care delivery and route chart/billing for closeout.',
            default => 'Lifecycle transition initiated.',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeAdmissionSnapshot(string $snapshot): array
    {
        if (trim($snapshot) === '') {
            return [];
        }

        try {
            $decoded = json_decode($snapshot, true, 512, JSON_THROW_ON_ERROR);

            return is_array($decoded) ? $decoded : [];
        } catch (\JsonException) {
            return [];
        }
    }

    private function mapPdgmAdmissionSource(string $admissionSource): string
    {
        $normalized = strtoupper(trim($admissionSource));
        if ($normalized === '') {
            return 'COMMUNITY';
        }

        foreach (['HOSPITAL', 'FACILITY', 'INPATIENT', 'SNF', 'REHAB', 'TRANSFER'] as $institutionalTerm) {
            if (str_contains($normalized, $institutionalTerm)) {
                return 'INSTITUTIONAL';
            }
        }

        return 'COMMUNITY';
    }

    private function extractDiagnosisCode(string $diagnosis): string
    {
        if (preg_match('/^([A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?)/i', trim($diagnosis), $matches) === 1) {
            return strtoupper($matches[1]);
        }

        return '';
    }

    private function isValidDiagnosisCode(string $code): bool
    {
        return preg_match('/^[A-TV-Z][0-9][0-9A-Z](?:\.[0-9A-Z]{1,4})?$/', $code) === 1;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildAdmissionSnapshot(object $referral): array
    {
        return [
            'referral_source' => $referral->get('source_name'),
            'admission_source' => $referral->get('admission_source'),
            'planned_soc_date' => $referral->get('planned_soc_date'),
            'face_to_face_date' => $referral->get('face_to_face_date'),
            'primary_diagnosis' => $referral->get('primary_diagnosis'),
            'requested_disciplines' => $this->decodeDisciplines((string)$referral->get('requested_disciplines')),
            'order_status' => $referral->get('order_status'),
            'physician_orders_signed' => (bool)$referral->get('physician_orders_signed'),
            'physician_orders_signed_at' => $referral->get('physician_orders_signed_at'),
            'referring_provider_name' => $referral->get('referring_provider_name'),
            'referring_provider_phone' => $referral->get('referring_provider_phone'),
            'pcp_name' => $referral->get('pcp_name'),
            'pcp_phone' => $referral->get('pcp_phone'),
            'caregiver_name' => $referral->get('caregiver_name'),
            'caregiver_relationship' => $referral->get('caregiver_relationship'),
            'caregiver_phone' => $referral->get('caregiver_phone'),
            'service_location_type' => $referral->get('service_location_type'),
            'service_address1' => $referral->get('service_address1'),
            'service_city' => $referral->get('service_city'),
            'service_state' => $referral->get('service_state'),
            'service_postal_code' => $referral->get('service_postal_code'),
            'notes' => $referral->get('notes'),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function decodeDisciplines(string $requestedDisciplines): array
    {
        if ($requestedDisciplines === '') {
            return [];
        }

        try {
            $decoded = json_decode($requestedDisciplines, true, 512, JSON_THROW_ON_ERROR);

            return is_array($decoded) ? array_values(array_filter(array_map('strval', $decoded))) : [];
        } catch (\JsonException) {
            return [];
        }
    }

    /**
     * @param array<string, mixed> $snapshot
     */
    private function admissionReadinessDetails(array $snapshot): string
    {
        $disciplines = implode(', ', array_map('strval', $snapshot['requested_disciplines'] ?? []));
        $location = implode(', ', array_filter([
            (string)($snapshot['service_address1'] ?? ''),
            trim(implode(' ', array_filter([
                (string)($snapshot['service_city'] ?? ''),
                (string)($snapshot['service_state'] ?? ''),
                (string)($snapshot['service_postal_code'] ?? ''),
            ]))),
        ]));

        return trim(implode(' ', array_filter([
            'Episode created from referral.',
            $snapshot['admission_source'] ? 'Admission source: ' . $snapshot['admission_source'] . '.' : null,
            $snapshot['face_to_face_date'] ? 'Face-to-face: ' . $snapshot['face_to_face_date'] . '.' : null,
            $disciplines !== '' ? 'Disciplines: ' . $disciplines . '.' : null,
            (($snapshot['physician_orders_signed'] ?? false) === true)
                ? 'Signed physician orders received' . (!empty($snapshot['physician_orders_signed_at']) ? ' on ' . $snapshot['physician_orders_signed_at'] : '') . '.'
                : 'Signed physician orders still pending.',
            $snapshot['referring_provider_name'] ? 'Referrer: ' . $snapshot['referring_provider_name'] . '.' : null,
            $location !== '' ? 'Service location: ' . $location . '.' : null,
            'Waiting for SOC completion.',
        ])));
    }

    /**
     * @param array<string, mixed> $snapshot
     */
    private function createIntakeDocumentationTasks(int $episodeId, array $snapshot, DateTimeImmutable $certStart): void
    {
        $dueAt = $certStart->format('Y-m-d 09:00:00');
        $openTaskTypes = $this->qaTasks->find()
            ->select(['task_type'])
            ->where([
                'episode_id' => $episodeId,
                'task_type IN' => ['missing_face_to_face', 'missing_signed_orders'],
                'status' => 'open',
            ])
            ->all()
            ->extract('task_type')
            ->toList();

        if (!$this->hasFaceToFaceDocumentation($snapshot) && !in_array('missing_face_to_face', $openTaskTypes, true)) {
            $task = $this->qaTasks->newEntity([
                'episode_id' => $episodeId,
                'task_type' => 'missing_face_to_face',
                'priority' => 'high',
                'status' => 'open',
                'title' => 'Capture missing face-to-face documentation',
                'details' => 'Intake must obtain and document the required face-to-face encounter before episode activation and billing release.',
                'assigned_role' => 'Intake',
                'due_at' => $dueAt,
            ]);
            $this->qaTasks->saveOrFail($task);
        }

        if (!$this->hasSignedPhysicianOrders($snapshot) && !in_array('missing_signed_orders', $openTaskTypes, true)) {
            $task = $this->qaTasks->newEntity([
                'episode_id' => $episodeId,
                'task_type' => 'missing_signed_orders',
                'priority' => 'high',
                'status' => 'open',
                'title' => 'Obtain signed physician orders',
                'details' => 'Clinical intake must secure signed physician orders before episode activation and billing release.',
                'assigned_role' => 'Clinical',
                'due_at' => $dueAt,
            ]);
            $this->qaTasks->saveOrFail($task);
        }

        $admissionOrder = $this->latestActiveOrderForScope($episodeId, 'admission');
        if ($admissionOrder !== null) {
            $this->syncOrderQaTask((int)$admissionOrder->get('id'));
        }
    }

    /**
     * @param array<string, mixed> $snapshot
     */
    private function syncDocumentationTasksForEpisode(int $episodeId, array $snapshot): void
    {
        $episode = $this->episodes->get($episodeId);
        $certStart = new DateTimeImmutable((string)$episode->get('cert_start_date'));
        $this->createIntakeDocumentationTasks($episodeId, $snapshot, $certStart);

        $openTasks = $this->qaTasks->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type IN' => ['missing_face_to_face', 'missing_signed_orders'],
                'status' => 'open',
            ])
            ->all()
            ->toList();

        foreach ($openTasks as $task) {
            $taskType = (string)$task->get('task_type');
            $shouldResolve = ($taskType === 'missing_face_to_face' && $this->hasFaceToFaceDocumentation($snapshot))
                || ($taskType === 'missing_signed_orders' && $this->hasSignedPhysicianOrders($snapshot));

            if (!$shouldResolve) {
                continue;
            }

            $task = $this->qaTasks->patchEntity($task, ['status' => 'resolved']);
            $this->qaTasks->saveOrFail($task);
        }

        (new ClaimHoldService())->syncEpisodeClaimHolds($episodeId);
    }

    /**
     * @param array<string, mixed> $patch
     */
    private function updateReferralAndLinkedEpisodes(int $referralId, array $patch, string $validationMessage): object
    {
        $referral = $this->referrals->get($referralId);

        if (($patch['physician_orders_signed'] ?? null) === true && empty($patch['physician_orders_signed_at']) && empty($referral->get('physician_orders_signed_at'))) {
            throw new InvalidArgumentException('Signed orders date/time is required when physician orders are marked signed.');
        }

        $referral = $this->referrals->patchEntity($referral, $patch);
        if ($referral->hasErrors()) {
            throw new InvalidArgumentException($validationMessage);
        }
        $this->referrals->saveOrFail($referral);

        $snapshot = $this->buildAdmissionSnapshot($referral);
        $linkedEpisodes = $this->episodes->find()
            ->where(['referral_id' => $referralId])
            ->all()
            ->toList();

        foreach ($linkedEpisodes as $episode) {
            $this->syncAdmissionOrderFromReferral($referral, (int)$episode->get('id'));
            $episode = $this->episodes->patchEntity($episode, [
                'admission_readiness_snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR),
                'payer_type' => $referral->get('payer_type'),
                'primary_diagnosis' => $referral->get('primary_diagnosis'),
            ]);
            $this->episodes->saveOrFail($episode);
            $this->syncEpisodeSnapshotFromOrders((int)$episode->get('id'));
            $this->syncDocumentationTasksForEpisode((int)$episode->get('id'), $snapshot);
        }

        return $referral;
    }

    private function syncReferralDocumentationFromDocuments(int $referralId): void
    {
        $referral = $this->referrals->get($referralId);
        $documents = $this->referralDocuments->find()
            ->where(['referral_id' => $referralId])
            ->all()
            ->toList();

        $faceToFaceDate = null;
        $orderStatus = 'pending';
        $physicianOrdersSigned = false;
        $physicianOrdersSignedAt = null;

        foreach ($documents as $document) {
            $documentType = (string)$document->get('document_type');
            $documentStatus = strtolower((string)$document->get('document_status'));

            if ($documentType === 'face_to_face' && $document->get('received_at') !== null) {
                $receivedDate = $document->get('received_at')->format('Y-m-d');
                if ($faceToFaceDate === null || $receivedDate > $faceToFaceDate) {
                    $faceToFaceDate = $receivedDate;
                }
            }

            if ($documentType === 'physician_orders') {
                if (in_array($documentStatus, ['received', 'reviewed', 'signed'], true)) {
                    $orderStatus = $documentStatus === 'signed' ? 'signed' : 'received';
                }
                if ($documentStatus === 'signed' && $document->get('signed_at') !== null) {
                    $physicianOrdersSigned = true;
                    $signedAt = $document->get('signed_at')->format('Y-m-d H:i:s');
                    if ($physicianOrdersSignedAt === null || $signedAt > $physicianOrdersSignedAt) {
                        $physicianOrdersSignedAt = $signedAt;
                    }
                    $orderStatus = 'signed';
                }
            }
        }

        $patch = [
            'face_to_face_date' => $faceToFaceDate,
            'order_status' => $physicianOrdersSigned ? 'signed' : ($orderStatus !== 'pending' ? $orderStatus : ($referral->get('order_status') ?: 'pending')),
            'physician_orders_signed' => $physicianOrdersSigned,
            'physician_orders_signed_at' => $physicianOrdersSigned ? $physicianOrdersSignedAt : null,
        ];

        $this->updateReferralAndLinkedEpisodes($referralId, $patch, 'Referral documentation sync failed validation.');
    }

    private function createAdmissionPhysicianOrder(object $episode, object $referral): void
    {
        $status = $this->normalizeReferralOrderStatus(
            (string)$referral->get('order_status'),
            (bool)$referral->get('physician_orders_signed'),
        );
        $draft = $this->generatePhysicianOrderDraft((int)$episode->get('id'), 'admission');
        $order = $this->physicianOrders->newEntity([
            'referral_id' => $referral->get('id'),
            'episode_id' => $episode->get('id'),
            'order_scope' => 'admission',
            'version_number' => 1,
            'order_status' => $status,
            'active' => true,
            'received_at' => in_array($status, ['received', 'signed'], true) ? ($referral->get('physician_orders_signed_at') ?: date('Y-m-d H:i:s')) : null,
            'signed_at' => $status === 'signed' ? $referral->get('physician_orders_signed_at') : null,
            'signer_name' => $referral->get('referring_provider_name'),
            'order_summary' => $draft['order_summary'],
            'order_note' => $draft['order_note'],
        ]);
        $this->physicianOrders->saveOrFail($order);
        $this->syncAdmissionOrderBackToReferral($order);
    }

    private function syncAdmissionOrderFromReferral(object $referral, int $episodeId): void
    {
        $order = $this->latestActiveOrderForScope($episodeId, 'admission');
        if ($order === null) {
            return;
        }

        $status = $this->normalizeReferralOrderStatus(
            (string)$referral->get('order_status'),
            (bool)$referral->get('physician_orders_signed'),
        );
        $order = $this->physicianOrders->patchEntity($order, [
            'order_status' => $status,
            'received_at' => $status === 'draft' ? null : ($referral->get('physician_orders_signed_at') ?: $order->get('received_at')),
            'signed_at' => $status === 'signed' ? $referral->get('physician_orders_signed_at') : null,
            'signer_name' => $referral->get('referring_provider_name'),
        ]);
        $this->physicianOrders->saveOrFail($order);
        $this->syncOrderQaTask((int)$order->get('id'));
    }

    private function createLifecyclePhysicianOrder(object $episode, string $scope, DateTimeImmutable $effectiveDate, string $note): void
    {
        $version = $this->nextPhysicianOrderVersion((int)$episode->get('id'), $scope);
        $this->supersedeActiveOrdersForScope((int)$episode->get('id'), $scope);
        $draft = $this->generatePhysicianOrderDraft((int)$episode->get('id'), $scope);

        $order = $this->physicianOrders->newEntity([
            'referral_id' => $episode->get('referral_id'),
            'episode_id' => $episode->get('id'),
            'order_scope' => $scope,
            'version_number' => $version,
            'order_status' => 'sent_for_signature',
            'active' => true,
            'sent_at' => $effectiveDate->format('Y-m-d 09:00:00'),
            'order_summary' => $draft['order_summary'],
            'order_note' => $note !== '' ? $note : ($draft['order_note'] ?? sprintf('Generated automatically for %s workflow.', $this->labelizeScope($scope))),
        ]);
        $this->physicianOrders->saveOrFail($order);
        $this->syncOrderQaTask((int)$order->get('id'));
    }

    private function nextPhysicianOrderVersion(int $episodeId, string $scope): int
    {
        $latest = $this->physicianOrders->find()
            ->where([
                'episode_id' => $episodeId,
                'order_scope' => $scope,
            ])
            ->orderByDesc('version_number')
            ->first();

        return $latest === null ? 1 : ((int)$latest->get('version_number') + 1);
    }

    private function supersedeActiveOrdersForScope(int $episodeId, string $scope): void
    {
        $activeOrders = $this->physicianOrders->find()
            ->where([
                'episode_id' => $episodeId,
                'order_scope' => $scope,
                'active' => true,
            ])
            ->all();

        foreach ($activeOrders as $order) {
            $nextStatus = (string)$order->get('order_status') === 'signed' ? 'signed' : 'superseded';
            $order = $this->physicianOrders->patchEntity($order, [
                'active' => false,
                'order_status' => $nextStatus,
            ]);
            $this->physicianOrders->saveOrFail($order);
        }
    }

    private function latestActiveOrderForScope(int $episodeId, string $scope): mixed
    {
        return $this->physicianOrders->find()
            ->where([
                'episode_id' => $episodeId,
                'order_scope' => $scope,
                'active' => true,
            ])
            ->orderByDesc('version_number')
            ->first();
    }

    private function recentDocumentedVisits(int $episodeId): array
    {
        return $this->visits->find()
            ->where([
                'episode_id' => $episodeId,
                'documentation_status IN' => ['completed', 'qa_review', 'locked'],
            ])
            ->orderByDesc('actual_end')
            ->limit(3)
            ->all()
            ->toList();
    }

    /**
     * @param array<int, string> $scopes
     */
    private function hasUnsignedActiveOrders(int $episodeId, array $scopes): bool
    {
        return $this->physicianOrders->find()
            ->where([
                'episode_id' => $episodeId,
                'order_scope IN' => $scopes,
                'active' => true,
            ])
            ->andWhere([
                'OR' => [
                    ['order_status !=' => 'signed'],
                    ['signed_at IS' => null],
                ],
            ])
            ->count() > 0;
    }

    /**
     * @return list<string>
     */
    private function splitHoldReasons(string $holdReason): array
    {
        $parts = array_map('trim', explode('|', $holdReason));

        return array_values(array_filter($parts, fn ($part) => $part !== ''));
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

    private function syncOrderQaTask(int $orderId): void
    {
        $order = $this->physicianOrders->get($orderId);
        $scope = (string)$order->get('order_scope');
        $taskType = 'physician_order_review';
        $existingTask = $this->qaTasks->find()
            ->where([
                'episode_id' => $order->get('episode_id'),
                'task_type' => $taskType,
                'details LIKE' => '%' . sprintf('Order %d', $orderId) . '%',
            ])
            ->orderByDesc('id')
            ->first();

        if ((string)$order->get('order_status') === 'signed' && $order->get('signed_at') !== null) {
            if ($existingTask !== null && (string)$existingTask->get('status') === 'open') {
                $existingTask = $this->qaTasks->patchEntity($existingTask, ['status' => 'resolved']);
                $this->qaTasks->saveOrFail($existingTask);
            }
            if ($scope === 'admission') {
                $this->resolveMissingSignedOrdersTasks((int)$order->get('episode_id'));
            }
            return;
        }

        $title = sprintf('Review %s physician order packet', $this->labelizeScope($scope));
        $details = sprintf(
            'Order %d (%s v%s) is %s and requires physician order follow-up before release.',
            $orderId,
            $scope,
            $order->get('version_number'),
            $order->get('order_status'),
        );
        $dueAt = ($order->get('sent_at') ?? $order->get('created'))?->format('Y-m-d H:i:s') ?? date('Y-m-d 09:00:00');

        if ($existingTask !== null) {
            $existingTask = $this->qaTasks->patchEntity($existingTask, [
                'status' => 'open',
                'priority' => $scope === 'admission' ? 'high' : 'medium',
                'title' => $title,
                'details' => $details,
                'assigned_role' => 'Clinical',
                'due_at' => $dueAt,
            ]);
            $this->qaTasks->saveOrFail($existingTask);

            return;
        }

        $task = $this->qaTasks->newEntity([
            'episode_id' => $order->get('episode_id'),
            'task_type' => $taskType,
            'priority' => $scope === 'admission' ? 'high' : 'medium',
            'status' => 'open',
            'title' => $title,
            'details' => $details,
            'assigned_role' => 'Clinical',
            'due_at' => $dueAt,
        ]);
        $this->qaTasks->saveOrFail($task);
    }

    private function resolveMissingSignedOrdersTasks(int $episodeId): void
    {
        $tasks = $this->qaTasks->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type' => 'missing_signed_orders',
                'status' => 'open',
            ])
            ->all();

        foreach ($tasks as $task) {
            $task = $this->qaTasks->patchEntity($task, ['status' => 'resolved']);
            $this->qaTasks->saveOrFail($task);
        }
    }

    private function syncEpisodeSnapshotFromOrders(int $episodeId): void
    {
        $episode = $this->episodes->get($episodeId);
        $snapshot = $this->decodeAdmissionSnapshot((string)$episode->get('admission_readiness_snapshot'));
        $admissionOrder = $this->latestActiveOrderForScope($episodeId, 'admission');
        if ($admissionOrder === null) {
            return;
        }

        $snapshot['order_status'] = $admissionOrder->get('order_status');
        $snapshot['physician_orders_signed'] = (string)$admissionOrder->get('order_status') === 'signed' && $admissionOrder->get('signed_at') !== null;
        $snapshot['physician_orders_signed_at'] = $admissionOrder->get('signed_at')?->format('Y-m-d H:i:s');

        $episode = $this->episodes->patchEntity($episode, [
            'admission_readiness_snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR),
        ]);
        $this->episodes->saveOrFail($episode);
    }

    private function syncAdmissionOrderBackToReferral(object $order): void
    {
        $referralId = $order->get('referral_id');
        if ($referralId === null) {
            return;
        }

        $referral = $this->referrals->get((int)$referralId);
        $referral = $this->referrals->patchEntity($referral, [
            'order_status' => $order->get('order_status'),
            'physician_orders_signed' => (string)$order->get('order_status') === 'signed' && $order->get('signed_at') !== null,
            'physician_orders_signed_at' => $order->get('signed_at'),
        ]);
        $this->referrals->saveOrFail($referral);
    }

    private function normalizeReferralOrderStatus(string $orderStatus, bool $isSigned): string
    {
        if ($isSigned) {
            return 'signed';
        }

        $normalized = strtolower(trim($orderStatus));
        return match ($normalized) {
            'signed' => 'signed',
            'received', 'reviewed' => 'received',
            'pending_signature', 'sent_for_signature' => 'sent_for_signature',
            default => 'draft',
        };
    }

    private function labelizeScope(string $scope): string
    {
        return str_replace('_', ' ', ucfirst($scope));
    }

    /**
     * @param array<string, mixed> $snapshot
     */
    private function hasFaceToFaceDocumentation(array $snapshot): bool
    {
        return trim((string)($snapshot['face_to_face_date'] ?? '')) !== '';
    }

    /**
     * @param array<string, mixed> $snapshot
     */
    private function hasSignedPhysicianOrders(array $snapshot): bool
    {
        if (($snapshot['physician_orders_signed'] ?? false) !== true) {
            return false;
        }

        return trim((string)($snapshot['physician_orders_signed_at'] ?? '')) !== '';
    }
}
