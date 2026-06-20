<?php
declare(strict_types=1);

namespace App\Test\TestCase\Service;

use App\Service\HomeHealthComplianceService;
use App\Test\TestCase\Support\HomeHealthTestTrait;
use Cake\ORM\TableRegistry;
use Cake\TestSuite\TestCase;

class HomeHealthComplianceServiceTest extends TestCase
{
    use HomeHealthTestTrait;

    public function testActivationBlockersIncludeCompliancePacketAndMedicationReviewGaps(): void
    {
        $this->ensureDemoEpisode();
        TableRegistry::getTableLocator()->get('PatientComplianceDocuments')->deleteAll(['patient_id' => 1]);
        TableRegistry::getTableLocator()->get('PatientMedications')->deleteAll(['patient_id' => 1]);

        $blockers = (new HomeHealthComplianceService())->activationBlockers(1);
        $blockerText = implode(' | ', $blockers);

        $this->assertStringContainsString('Admission compliance packet is missing', $blockerText);
        $this->assertStringContainsString('Medication profile must be reviewed before admission readiness is complete.', $blockerText);
    }

    public function testSurveyReadinessReturnsCategoryScoresAndOpenCounts(): void
    {
        $summary = (new HomeHealthComplianceService())->surveyReadiness('current', false, [
            'id' => 1,
            'email' => 'admin@example.test',
        ]);

        $this->assertArrayHasKey('category_scores', $summary);
        $this->assertArrayHasKey('open_counts', $summary);
        $this->assertNotEmpty($summary['category_scores']);
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
