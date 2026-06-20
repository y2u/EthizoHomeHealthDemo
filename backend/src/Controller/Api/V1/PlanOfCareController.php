<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\DemoCoverageService;
use InvalidArgumentException;
use RuntimeException;

class PlanOfCareController extends ApiController
{
    public function index()
    {
        $items = $this->fetchTable('PlanOfCares')->find()
            ->contain(['Episodes', 'Assessments', 'PhysicianOrders'])
            ->orderByDesc('created')
            ->all()
            ->toList();

        return $this->respond(['success' => true, 'data' => $items]);
    }

    public function generate(int $id)
    {
        try {
            $item = (new DemoCoverageService())->generatePlanOfCare($id, $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item], 201);
    }

    public function update(int $id)
    {
        try {
            $item = (new DemoCoverageService())->updatePlanOfCare($id, $this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item]);
    }
}
