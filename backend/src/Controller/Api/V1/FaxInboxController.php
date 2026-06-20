<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\DemoCoverageService;
use InvalidArgumentException;
use RuntimeException;

class FaxInboxController extends ApiController
{
    public function index()
    {
        $items = $this->fetchTable('FaxMessages')->find()
            ->contain(['Referrals'])
            ->orderByDesc('received_at')
            ->all()
            ->toList();

        return $this->respond(['success' => true, 'data' => $items]);
    }

    public function add()
    {
        try {
            $item = (new DemoCoverageService())->addFaxMessage($this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item], 201);
    }

    public function route(int $id)
    {
        try {
            $item = (new DemoCoverageService())->routeFaxMessage($id, $this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item]);
    }
}
