<?php
declare(strict_types=1);

namespace App\Service;

use Cake\ORM\TableRegistry;
use DateTimeImmutable;
use Throwable;

class AssessmentVersionPolicyService
{
    public function resolve(string $completedAt): string
    {
        $date = new DateTimeImmutable($completedAt);

        try {
            $policies = TableRegistry::getTableLocator()->get('AssessmentVersionPolicies')->find()
                ->where([
                    'status' => 'active',
                    'effective_date <=' => $date->format('Y-m-d'),
                ])
                ->orderByDesc('effective_date')
                ->all()
                ->toList();

            if ($policies !== []) {
                return (string)$policies[0]->get('version_name');
            }
        } catch (Throwable) {
            // Older databases may not have the policy table until migrations run.
        }

        return $date >= new DateTimeImmutable('2026-04-01 00:00:00') ? 'OASIS-E2' : 'OASIS-E1';
    }
}
