<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\DemoCoverageService;

class QualityMetricsController extends ApiController
{
    public function index()
    {
        $period = (string)$this->request->getQuery('period', 'all');
        $summary = (new DemoCoverageService())->qualityMetrics($period);

        return $this->respond(['success' => true, 'data' => $summary]);
    }

    public function capture()
    {
        $period = (string)($this->body()['period_key'] ?? 'all');
        $summary = (new DemoCoverageService())->captureQualityMetrics($period, $this->identity());

        return $this->respond(['success' => true, 'data' => $summary], 201);
    }
}
