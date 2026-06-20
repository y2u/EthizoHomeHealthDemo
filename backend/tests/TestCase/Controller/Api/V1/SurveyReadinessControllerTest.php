<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Api\V1;

use App\Test\TestCase\Support\HomeHealthTestTrait;
use Cake\TestSuite\TestCase;

class SurveyReadinessControllerTest extends TestCase
{
    use HomeHealthTestTrait;

    public function testIndexReturnsCategoryScores(): void
    {
        $this->loginApiUser();
        $this->get('/api/v1/admin/survey-readiness');
        $this->assertResponseOk();

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertArrayHasKey('category_scores', $body['data']);
    }

    public function testCaptureReturnsOpenCounts(): void
    {
        $this->loginApiUser();
        $this->post('/api/v1/admin/survey-readiness/capture', [
            'period_key' => '2026-Q2',
        ]);
        $this->assertResponseCode(201);

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertSame('2026-Q2', $body['data']['period_key']);
        $this->assertArrayHasKey('open_counts', $body['data']);
    }

    /**
     * @return array<string, mixed>
     */
    private function jsonResponse(): array
    {
        return json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR);
    }
}
