<?php
declare(strict_types=1);

namespace App\Test\TestCase\Service;

use App\Service\AssessmentVersionPolicyService;
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
}
