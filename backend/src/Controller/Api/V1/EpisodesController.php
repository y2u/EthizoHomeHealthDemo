<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\DemoCoverageService;
use App\Service\HomeHealthWorkflowService;
use InvalidArgumentException;
use RuntimeException;

class EpisodesController extends ApiController
{
    public function index()
    {
        $episodes = $this->fetchTable('Episodes')->find()
            ->contain(['Patients', 'Referrals', 'EpisodePeriods'])
            ->orderByDesc('cert_start_date')
            ->all()
            ->toList();

        return $this->respond([
            'success' => true,
            'data' => $episodes,
        ]);
    }

    public function view(int $id)
    {
        $episode = $this->fetchTable('Episodes')->get($id, contain: [
            'Patients',
            'Referrals',
            'EpisodePeriods',
            'Assessments',
            'Visits',
            'Claims',
            'QaTasks',
        ]);

        return $this->respond([
            'success' => true,
            'data' => $episode,
        ]);
    }

    public function activate(int $id)
    {
        try {
            $episode = (new HomeHealthWorkflowService())->activateEpisode($id, $this->identity());
        } catch (RuntimeException $exception) {
            return $this->respond([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->respond([
            'success' => true,
            'data' => $episode,
        ]);
    }

    public function readiness(int $id)
    {
        $readiness = (new HomeHealthWorkflowService())->evaluateEpisodeReadiness($id);

        return $this->respond([
            'success' => true,
            'data' => $readiness,
        ]);
    }

    public function orderDraft(int $id)
    {
        try {
            $draft = (new HomeHealthWorkflowService())->generatePhysicianOrderDraft($id, (string)$this->request->getQuery('scope', 'plan_of_care'));
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->respond([
            'success' => true,
            'data' => $draft,
        ]);
    }

    public function reviewSummary(int $id)
    {
        try {
            $summary = (new HomeHealthWorkflowService())->buildEpisodeReviewSummary($id);
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->respond([
            'success' => true,
            'data' => $summary,
        ]);
    }

    public function insights(int $id)
    {
        try {
            $insights = (new DemoCoverageService())->buildEpisodeInsights($id);
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->respond([
            'success' => true,
            'data' => $insights,
        ]);
    }

    public function updateAdmission(int $id)
    {
        try {
            $episode = (new HomeHealthWorkflowService())->updateEpisodeAdmissionDetails($id, $this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->respond([
            'success' => true,
            'data' => $episode,
        ]);
    }

    public function addOrder(int $id)
    {
        try {
            $order = (new HomeHealthWorkflowService())->addEpisodePhysicianOrder($id, $this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->respond([
            'success' => true,
            'data' => $order,
        ], 201);
    }

    public function transition(int $id)
    {
        $data = $this->body();
        try {
            $result = (new HomeHealthWorkflowService())->transitionEpisode($id, (string)($data['transition_type'] ?? ''), $this->identity(), $data);
        } catch (RuntimeException $exception) {
            return $this->respond([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }

        return $this->respond([
            'success' => true,
            'data' => $result,
        ]);
    }
}
