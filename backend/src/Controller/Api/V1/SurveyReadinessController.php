<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\HomeHealthComplianceService;

class SurveyReadinessController extends ApiController
{
    public function index()
    {
        $periodKey = (string)$this->request->getQuery('period_key', 'current');

        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->surveyReadiness($periodKey)]);
    }

    public function capture()
    {
        $periodKey = (string)($this->body()['period_key'] ?? 'current');

        return $this->respond([
            'success' => true,
            'data' => (new HomeHealthComplianceService())->surveyReadiness($periodKey, true, $this->identity()),
        ], 201);
    }
}
