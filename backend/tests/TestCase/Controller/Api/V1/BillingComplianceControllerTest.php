<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Api\V1;

use App\Test\TestCase\Support\HomeHealthTestTrait;
use Cake\ORM\TableRegistry;
use Cake\TestSuite\TestCase;

class BillingComplianceControllerTest extends TestCase
{
    use HomeHealthTestTrait;

    public function testAddClaimTransactionAndRemittancePosting(): void
    {
        $this->ensureDemoClaim();

        $this->loginApiUser();
        $this->post('/api/v1/billing/claim-transactions/add', [
            'claim_id' => 1,
            'transaction_type' => 'submission',
            'transaction_status' => 'accepted',
            'transaction_reference' => 'TXN-123',
            'payload_summary' => '837 claim submitted.',
            'response_note' => 'Accepted by clearinghouse.',
            'processed_at' => '2026-04-25 10:00:00',
        ]);
        $this->assertResponseCode(201);

        $this->loginApiUser();
        $this->post('/api/v1/billing/remittance-postings/add', [
            'claim_id' => 1,
            'era_reference' => 'ERA-123',
            'paid_amount' => 850.25,
            'adjustment_code' => 'CO45',
            'adjustment_amount' => 25.00,
            'posting_status' => 'posted',
            'posted_at' => '2026-04-30 15:00:00',
            'posting_note' => 'Payment posted from ERA.',
        ]);
        $this->assertResponseCode(201);
    }

    private function ensureDemoClaim(): void
    {
        $this->ensureDemoEpisode();

        $claims = TableRegistry::getTableLocator()->get('Claims');
        if ($claims->exists(['id' => 1])) {
            return;
        }

        $claim = $claims->newEntity([
            'id' => 1,
            'episode_id' => 1,
            'claim_type' => 'final',
            'billing_period_start' => '2026-04-19',
            'billing_period_end' => '2026-05-18',
            'status' => 'submitted',
            'amount' => 875.25,
            'submission_reference' => 'CLM-123',
            'submitted_at' => '2026-04-25 09:00:00',
        ]);
        $claims->saveOrFail($claim);
    }

    private function ensureDemoEpisode(): void
    {
        $this->ensureDemoPatient();
        $this->ensureDemoReferral();

        $episodes = TableRegistry::getTableLocator()->get('Episodes');
        if ($episodes->exists(['id' => 1])) {
            return;
        }

        $episode = $episodes->newEntity([
            'id' => 1,
            'patient_id' => 1,
            'referral_id' => 1,
            'cert_start_date' => '2026-04-19',
            'cert_end_date' => '2026-06-17',
            'start_of_care_date' => '2026-04-19',
            'episode_status' => 'pending',
            'payer_type' => 'Medicare',
            'primary_diagnosis' => 'I50.32 Chronic diastolic heart failure',
        ]);
        $episodes->saveOrFail($episode);
    }

    private function ensureDemoPatient(): void
    {
        $patients = TableRegistry::getTableLocator()->get('Patients');
        if ($patients->exists(['id' => 1])) {
            return;
        }

        $patient = $patients->newEntity([
            'id' => 1,
            'first_name' => 'Eleanor',
            'last_name' => 'Bishop',
            'dob' => '1946-02-14',
            'gender' => 'Female',
            'payer_type' => 'Medicare',
            'medicare_number' => '1EG4TE5MK73',
            'insurance_member_id' => '1EG4TE5MK73',
            'phone' => '404-555-0101',
            'address1' => '125 Peachtree View',
            'city' => 'Atlanta',
            'state' => 'GA',
            'postal_code' => '30309',
            'status' => 'active',
        ]);
        $patients->saveOrFail($patient);
    }

    private function ensureDemoReferral(): void
    {
        $referrals = TableRegistry::getTableLocator()->get('Referrals');
        if ($referrals->exists(['id' => 1])) {
            return;
        }

        $referral = $referrals->newEntity([
            'id' => 1,
            'patient_id' => 1,
            'source_name' => 'Northside Hospital',
            'admission_source' => 'Hospital discharge',
            'payer_type' => 'Medicare',
            'primary_diagnosis' => 'I50.32 Chronic diastolic heart failure',
            'planned_soc_date' => '2026-04-19',
            'face_to_face_date' => '2026-04-15',
            'order_status' => 'signed',
            'physician_orders_signed' => true,
            'physician_orders_signed_at' => '2026-04-16 14:30:00',
            'referring_provider_name' => 'Dr. Alexis Monroe',
            'referring_provider_phone' => '404-555-0133',
            'caregiver_name' => 'Samuel Bishop',
            'caregiver_relationship' => 'Spouse',
            'caregiver_phone' => '404-555-0110',
            'service_location_type' => 'Patient home',
            'service_address1' => '125 Peachtree View',
            'service_city' => 'Atlanta',
            'service_state' => 'GA',
            'service_postal_code' => '30309',
            'status' => 'accepted',
        ]);
        $referrals->saveOrFail($referral);
    }
}
