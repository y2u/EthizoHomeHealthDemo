<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\HomeHealthComplianceService;
use InvalidArgumentException;
use RuntimeException;

class PatientComplianceController extends ApiController
{
    public function documents(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('PatientComplianceDocuments', ['patient_id' => $id])]);
    }

    public function addDocument(int $id)
    {
        return $this->addForPatient('PatientComplianceDocuments', $id);
    }

    public function notices(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('PatientNotices', ['patient_id' => $id])]);
    }

    public function addNotice(int $id)
    {
        return $this->addForPatient('PatientNotices', $id);
    }

    public function medications(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('PatientMedications', ['patient_id' => $id])]);
    }

    public function addMedication(int $id)
    {
        return $this->addForPatient('PatientMedications', $id);
    }

    public function allergies(int $id)
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('PatientAllergies', ['patient_id' => $id])]);
    }

    public function addAllergy(int $id)
    {
        return $this->addForPatient('PatientAllergies', $id);
    }

    private function addForPatient(string $tableAlias, int $patientId)
    {
        try {
            $data = (new HomeHealthComplianceService())->add($tableAlias, $this->body() + ['patient_id' => $patientId], $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $data], 201);
    }
}
