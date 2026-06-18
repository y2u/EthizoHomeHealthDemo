<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\ClaimHoldService;
use App\Service\QaTaskEscalationService;
use RuntimeException;

class QaController extends ApiController
{
    public function index()
    {
        $tasks = $this->fetchTable('QaTasks')->find()
            ->all()
            ->toList();

        return $this->respond([
            'success' => true,
            'data' => (new QaTaskEscalationService())->enrichTasks($tasks),
        ]);
    }

    public function resolve(int $id)
    {
        $tasks = $this->fetchTable('QaTasks');
        $task = $tasks->get($id);
        $task = $tasks->patchEntity($task, [
            'status' => 'resolved',
            'resolved_at' => date('Y-m-d H:i:s'),
        ]);
        $tasks->saveOrFail($task);
        $episodeId = $task->get('episode_id');
        if ($episodeId !== null) {
            (new ClaimHoldService())->syncEpisodeClaimHolds((int)$episodeId);
        }

        return $this->respond([
            'success' => true,
            'data' => (new QaTaskEscalationService())->enrichTask($task),
        ]);
    }

    public function assign(int $id)
    {
        $tasks = $this->fetchTable('QaTasks');
        $task = $tasks->get($id);
        $data = $this->body();
        $identity = $this->identity();
        $assignToMe = (bool)($data['assign_to_me'] ?? false);

        $assignedRole = trim((string)($data['assigned_role'] ?? ''));
        $assignedUserName = trim((string)($data['assigned_user_name'] ?? ''));

        if ($assignToMe) {
            $assignedRole = trim((string)($identity['role'] ?? ''));
            $assignedUserName = trim((string)($identity['full_name'] ?? $identity['name'] ?? ''));
        }

        $history = $this->decodeHistory($task->get('assignment_history'));
        $previousOwner = $this->formatOwner((string)$task->get('assigned_role'), (string)$task->get('assigned_user_name'));
        $nextOwner = $this->formatOwner($assignedRole, $assignedUserName);
        if ($previousOwner !== $nextOwner) {
            $history[] = [
                'timestamp' => date('Y-m-d H:i:s'),
                'action' => $nextOwner === 'Unassigned' ? 'cleared' : ($previousOwner === 'Unassigned' ? 'assigned' : 'reassigned'),
                'by' => $this->identityName($identity),
                'from' => $previousOwner,
                'to' => $nextOwner,
            ];
        }

        $task = $tasks->patchEntity($task, [
            'assigned_role' => $assignedRole !== '' ? $assignedRole : null,
            'assigned_user_name' => $assignedUserName !== '' ? $assignedUserName : null,
            'assigned_at' => ($assignedRole !== '' || $assignedUserName !== '') ? date('Y-m-d H:i:s') : null,
            'assignment_history' => json_encode($history, JSON_THROW_ON_ERROR),
        ]);
        $tasks->saveOrFail($task);

        return $this->respond([
            'success' => true,
            'data' => (new QaTaskEscalationService())->enrichTask($task),
        ]);
    }

    public function escalate(int $id)
    {
        $tasks = $this->fetchTable('QaTasks');
        $task = $tasks->get($id);
        $data = $this->body();
        $note = trim((string)($data['escalation_note'] ?? ''));
        if ($note === '') {
            return $this->respond([
                'success' => false,
                'message' => 'Escalation note is required.',
            ], 422);
        }

        $identity = $this->identity();
        $history = $this->decodeHistory($task->get('assignment_history'));
        $history[] = [
            'timestamp' => date('Y-m-d H:i:s'),
            'action' => 'escalated',
            'by' => $this->identityName($identity),
            'owner' => $this->formatOwner((string)$task->get('assigned_role'), (string)$task->get('assigned_user_name')),
            'note' => $note,
        ];

        $task = $tasks->patchEntity($task, [
            'priority' => 'high',
            'escalation_note' => $note,
            'last_escalated_at' => date('Y-m-d H:i:s'),
            'assignment_history' => json_encode($history, JSON_THROW_ON_ERROR),
        ]);
        $tasks->saveOrFail($task);

        return $this->respond([
            'success' => true,
            'data' => (new QaTaskEscalationService())->enrichTask($task),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function decodeHistory(mixed $value): array
    {
        if (!is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Invalid QA task assignment history.');
        }

        return array_values(array_filter($decoded, 'is_array'));
    }

    /**
     * @param array<string, mixed> $identity
     */
    private function identityName(array $identity): string
    {
        return trim((string)($identity['full_name'] ?? $identity['name'] ?? 'System')) ?: 'System';
    }

    private function formatOwner(string $role, string $name): string
    {
        $role = trim($role);
        $name = trim($name);
        if ($name !== '' && $role !== '') {
            return sprintf('%s (%s)', $name, $role);
        }
        if ($name !== '') {
            return $name;
        }
        if ($role !== '') {
            return $role;
        }

        return 'Unassigned';
    }
}
