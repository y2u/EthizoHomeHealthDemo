<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\DemoCoverageService;
use InvalidArgumentException;
use RuntimeException;

class QapiProjectsController extends ApiController
{
    public function index()
    {
        $items = $this->fetchTable('QapiProjects')->find()
            ->orderByDesc('modified')
            ->all()
            ->toList();

        return $this->respond(['success' => true, 'data' => $items]);
    }

    public function add()
    {
        try {
            $item = (new DemoCoverageService())->addQapiProject($this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item], 201);
    }

    public function update(int $id)
    {
        try {
            $item = (new DemoCoverageService())->updateQapiProject($id, $this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item]);
    }
}
