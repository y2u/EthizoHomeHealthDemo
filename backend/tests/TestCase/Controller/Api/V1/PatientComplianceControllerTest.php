<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Api\V1;

use App\Test\TestCase\Support\HomeHealthTestTrait;
use Cake\ORM\TableRegistry;
use Cake\TestSuite\TestCase;

class PatientComplianceControllerTest extends TestCase
{
    use HomeHealthTestTrait;

    public function testAddAndListComplianceDocument(): void
    {
        $this->ensureDemoEpisode();

        $this->loginApiUser();
        $this->post('/api/v1/patients/1/compliance-documents/add', [
            'document_type' => 'patient_rights',
            'document_status' => 'signed',
            'signed_at' => '2026-04-19 09:00:00',
            'source_name' => 'SOC packet',
        ]);
        $this->assertResponseCode(201);

        $this->loginApiUser();
        $this->get('/api/v1/patients/1/compliance-documents');
        $this->assertResponseOk();

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertSame('patient_rights', $body['data'][0]['document_type']);
    }

    public function testAddMedicationAndAllergy(): void
    {
        $this->ensureDemoEpisode();

        $this->loginApiUser();
        $this->post('/api/v1/patients/1/medications/add', [
            'episode_id' => 1,
            'medication_name' => 'Furosemide',
            'dosage' => '20 mg',
            'frequency' => 'Daily',
            'route' => 'Oral',
            'high_risk' => true,
            'teaching_completed' => true,
            'last_reconciled_at' => '2026-04-19 09:20:00',
            'change_note' => 'Medication profile reconciled at SOC.',
        ]);
        $this->assertResponseCode(201);

        $this->loginApiUser();
        $this->post('/api/v1/patients/1/allergies/add', [
            'allergen' => 'Penicillin',
            'reaction' => 'Rash',
            'severity' => 'moderate',
            'verified_at' => '2026-04-19 09:25:00',
        ]);
        $this->assertResponseCode(201);
    }

    /**
     * @return array<string, mixed>
     */
    private function jsonResponse(): array
    {
        return json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR);
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
