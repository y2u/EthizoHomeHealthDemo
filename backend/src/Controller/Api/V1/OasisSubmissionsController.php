<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\DemoCoverageService;
use InvalidArgumentException;
use RuntimeException;

class OasisSubmissionsController extends ApiController
{
    public function index()
    {
        $items = $this->fetchTable('OasisSubmissions')->find()
            ->contain(['Episodes', 'Assessments'])
            ->orderByDesc('created')
            ->all()
            ->toList();

        return $this->respond(['success' => true, 'data' => $items]);
    }

    public function prepare(int $id)
    {
        try {
            $item = (new DemoCoverageService())->prepareOasisSubmission($id, $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item], 201);
    }

    public function update(int $id)
    {
        try {
            $item = (new DemoCoverageService())->updateOasisSubmission($id, $this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item]);
    }
}
