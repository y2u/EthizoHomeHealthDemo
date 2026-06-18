<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\DemoCoverageService;
use InvalidArgumentException;
use RuntimeException;

class CommunicationLogController extends ApiController
{
    public function index()
    {
        $items = $this->fetchTable('CommunicationLogEntries')->find()
            ->contain(['Episodes', 'Visits'])
            ->orderByDesc('created')
            ->all()
            ->toList();

        return $this->respond(['success' => true, 'data' => $items]);
    }

    public function add(int $id)
    {
        try {
            $item = (new DemoCoverageService())->addCommunicationLogEntry($id, $this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item], 201);
    }

    public function update(int $id)
    {
        try {
            $item = (new DemoCoverageService())->updateCommunicationLogEntry($id, $this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item]);
    }
}
