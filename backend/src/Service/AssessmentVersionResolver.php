<?php
declare(strict_types=1);

namespace App\Service;

class AssessmentVersionResolver
{
    public function resolve(string $completedAt): string
    {
        return (new AssessmentVersionPolicyService())->resolve($completedAt);
    }
}
