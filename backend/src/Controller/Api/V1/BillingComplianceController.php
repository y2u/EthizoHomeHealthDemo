<?php
declare(strict_types=1);

namespace App\Controller\Api\V1;

use App\Service\HomeHealthComplianceService;
use InvalidArgumentException;
use RuntimeException;

class BillingComplianceController extends ApiController
{
    public function claimTransactions()
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('ClaimTransactions')]);
    }

    public function addClaimTransaction()
    {
        return $this->addRecord('ClaimTransactions');
    }

    public function remittancePostings()
    {
        return $this->respond(['success' => true, 'data' => (new HomeHealthComplianceService())->list('RemittancePostings')]);
    }

    public function addRemittancePosting()
    {
        return $this->addRecord('RemittancePostings');
    }

    private function addRecord(string $tableAlias)
    {
        try {
            $data = (new HomeHealthComplianceService())->add($tableAlias, $this->body(), $this->identity());
        } catch (RuntimeException | InvalidArgumentException $exception) {
            return $this->respond(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->respond(['success' => true, 'data' => $data], 201);
    }
}
