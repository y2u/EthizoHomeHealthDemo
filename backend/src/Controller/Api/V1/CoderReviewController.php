<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\DemoCoverageService;
use InvalidArgumentException;
use RuntimeException;

class CoderReviewController extends ApiController
{
    public function index()
    {
        $items = $this->fetchTable('CoderReviewItems')->find()
            ->contain(['Episodes', 'Claims', 'Assessments'])
            ->orderByDesc('created')
            ->all()
            ->toList();

        return $this->respond(['success' => true, 'data' => $items]);
    }

    public function sync(int $id)
    {
        try {
            $items = (new DemoCoverageService())->syncCoderReview($id, $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $items], 201);
    }

    public function update(int $id)
    {
        try {
            $item = (new DemoCoverageService())->updateCoderReviewItem($id, $this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $item]);
    }
}
