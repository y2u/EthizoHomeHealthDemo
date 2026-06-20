<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\HomeHealthComplianceService;
use InvalidArgumentException;
use RuntimeException;

class EpisodeComplianceController extends ApiController
{
    public function verbalOrders(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('VerbalOrders', ['episode_id' => $id])]);
    }

    public function addVerbalOrder(int $id)
    {
        return $this->addForEpisode('VerbalOrders', $id);
    }

    public function aideSupervision(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('AideSupervisionEvents', ['episode_id' => $id])]);
    }

    public function addAideSupervision(int $id)
    {
        return $this->addForEpisode('AideSupervisionEvents', $id);
    }

    public function incidents(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('IncidentReports', ['episode_id' => $id])]);
    }

    public function addIncident(int $id)
    {
        $patientId = (int)$this->fetchTable('Episodes')->get($id)->get('patient_id');

        return $this->addForEpisode('IncidentReports', $id, ['patient_id' => $patientId]);
    }

    public function infections(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('InfectionLogs', ['episode_id' => $id])]);
    }

    public function addInfection(int $id)
    {
        $patientId = (int)$this->fetchTable('Episodes')->get($id)->get('patient_id');

        return $this->addForEpisode('InfectionLogs', $id, ['patient_id' => $patientId]);
    }

    public function authorizations(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('PayerAuthorizations', ['episode_id' => $id])]);
    }

    public function addAuthorization(int $id)
    {
        $episode = $this->fetchTable('Episodes')->get($id);

        return $this->addForEpisode('PayerAuthorizations', $id, [
            'patient_id' => (int)$episode->get('patient_id'),
            'payer_type' => (string)$episode->get('payer_type'),
        ]);
    }

    public function eligibilityChecks(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('EligibilityChecks', ['episode_id' => $id])]);
    }

    public function addEligibilityCheck(int $id)
    {
        $episode = $this->fetchTable('Episodes')->get($id);

        return $this->addForEpisode('EligibilityChecks', $id, [
            'patient_id' => (int)$episode->get('patient_id'),
            'payer_type' => (string)$episode->get('payer_type'),
        ]);
    }

    public function dmeSupplyOrders(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('DmeSupplyOrders', ['episode_id' => $id])]);
    }

    public function addDmeSupplyOrder(int $id)
    {
        $patientId = (int)$this->fetchTable('Episodes')->get($id)->get('patient_id');

        return $this->addForEpisode('DmeSupplyOrders', $id, ['patient_id' => $patientId]);
    }

    public function caseConferences(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('CaseConferences', ['episode_id' => $id])]);
    }

    public function addCaseConference(int $id)
    {
        return $this->addForEpisode('CaseConferences', $id);
    }

    /**
     * @param array<string, mixed> $extra
     */
    private function addForEpisode(string $tableAlias, int $episodeId, array $extra = [])
    {
        try {
            $data = (new HomeHealthComplianceService())->add($tableAlias, $this->body() + $extra + ['episode_id' => $episodeId], $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $data], 201);
    }
}
