<?php
declare(strict_types=1);

namespace App\Test\TestCase\Service;

use App\Service\AssessmentVersionPolicyService;
use Cake\ORM\TableRegistry;
use Cake\TestSuite\TestCase;

class AssessmentVersionPolicyServiceTest extends TestCase
{
    public function testResolveReturnsOasisE1BeforeApril2026Cutover(): void
    {
        $service = new AssessmentVersionPolicyService();

        $this->assertSame('OASIS-E1', $service->resolve('2026-03-31 23:59:00'));
    }

    public function testResolveReturnsOasisE2AtApril2026Cutover(): void
    {
        $service = new AssessmentVersionPolicyService();

        $this->assertSame('OASIS-E2', $service->resolve('2026-04-01 00:00:00'));
    }

    public function testResolveUsesLatestActivePolicyFromDatabase(): void
    {
        $policies = TableRegistry::getTableLocator()->get('AssessmentVersionPolicies');
        $policies->deleteAll(['version_name' => 'OASIS-TEST']);
        $policy = $policies->newEntity([
            'version_name' => 'OASIS-TEST',
            'effective_date' => '2026-05-01',
            'status' => 'active',
            'policy_note' => 'Temporary test policy.',
        ]);
        $policies->saveOrFail($policy);

        try {
            $service = new AssessmentVersionPolicyService();

            $this->assertSame('OASIS-TEST', $service->resolve('2026-05-02 00:00:00'));
        } finally {
            $policies->deleteAll(['version_name' => 'OASIS-TEST']);
        }
    }
}
