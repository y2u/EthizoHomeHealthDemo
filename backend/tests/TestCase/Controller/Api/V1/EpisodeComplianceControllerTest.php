<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Api\V1;

use App\Test\TestCase\Support\HomeHealthTestTrait;
use Cake\ORM\TableRegistry;
use Cake\TestSuite\TestCase;

class EpisodeComplianceControllerTest extends TestCase
{
    use HomeHealthTestTrait;

    public function testAddVerbalOrderAideSupervisionAndIncident(): void
    {
        $this->ensureDemoEpisode();

        $this->loginApiUser();
        $this->post('/api/v1/episodes/1/verbal-orders/add', [
            'order_source' => 'Dr. Alexis Monroe',
            'ordered_service' => 'Skilled nursing wound assessment',
            'received_by' => 'Nina Clinician',
            'received_at' => '2026-04-20 10:00:00',
            'read_back_completed' => true,
            'signature_due_at' => '2026-04-22 10:00:00',
            'status' => 'pending_signature',
            'order_note' => 'Verbal order read back and confirmed.',
        ]);
        $this->assertResponseCode(201);

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertSame(1, $body['data']['episode_id']);
        $this->assertSame('Skilled nursing wound assessment', $body['data']['ordered_service']);
        $this->assertTrue((bool)$body['data']['read_back_completed']);

        $this->loginApiUser();
        $this->get('/api/v1/episodes/1/verbal-orders');
        $this->assertResponseOk();

        $this->assertListContains('ordered_service', 'Skilled nursing wound assessment');

        $this->loginApiUser();
        $this->post('/api/v1/episodes/1/aide-supervision/add', [
            'aide_name' => 'Hannah Aide',
            'supervisor_name' => 'Nina Clinician',
            'supervision_type' => 'onsite',
            'performed_at' => '2026-04-21 11:00:00',
            'care_plan_reviewed' => true,
            'status' => 'completed',
            'findings' => 'Aide followed the current care plan.',
            'next_due_at' => '2026-05-21 11:00:00',
        ]);
        $this->assertResponseCode(201);

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertSame(1, $body['data']['episode_id']);
        $this->assertSame('Hannah Aide', $body['data']['aide_name']);
        $this->assertTrue((bool)$body['data']['care_plan_reviewed']);

        $this->loginApiUser();
        $this->get('/api/v1/episodes/1/aide-supervision');
        $this->assertResponseOk();

        $this->assertListContains('aide_name', 'Hannah Aide');

        $this->loginApiUser();
        $this->post('/api/v1/episodes/1/incidents/add', [
            'incident_type' => 'fall',
            'severity' => 'medium',
            'occurred_at' => '2026-04-22 08:15:00',
            'description' => 'Patient reported a non-injury fall before visit.',
            'follow_up_owner' => 'Nina Clinician',
            'qapi_linked' => false,
            'status' => 'open',
        ]);
        $this->assertResponseCode(201);

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertSame(1, $body['data']['patient_id']);
        $this->assertSame(1, $body['data']['episode_id']);
        $this->assertSame('fall', $body['data']['incident_type']);
        $this->assertFalse((bool)$body['data']['qapi_linked']);

        $this->loginApiUser();
        $this->get('/api/v1/episodes/1/incidents');
        $this->assertResponseOk();

        $this->assertListContains('incident_type', 'fall');

        $this->loginApiUser();
        $this->post('/api/v1/episodes/1/infections/add', [
            'infection_type' => 'UTI symptoms',
            'identified_at' => '2026-04-22 09:15:00',
            'precautions' => 'Monitor symptoms and reinforce hydration teaching.',
            'reported_to' => 'Dr. Alexis Monroe',
            'status' => 'monitoring',
        ]);
        $this->assertResponseCode(201);

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertSame(1, $body['data']['patient_id']);
        $this->assertSame(1, $body['data']['episode_id']);
        $this->assertSame('UTI symptoms', $body['data']['infection_type']);
        $this->assertSame('monitoring', $body['data']['status']);

        $this->loginApiUser();
        $this->get('/api/v1/episodes/1/infections');
        $this->assertResponseOk();

        $this->assertListContains('infection_type', 'UTI symptoms');
    }

    public function testAddEligibilityAuthorizationDmeSupplyOrderAndCaseConference(): void
    {
        $this->ensureDemoEpisode();

        $this->loginApiUser();
        $this->post('/api/v1/episodes/1/eligibility-checks/add', [
            'eligibility_status' => 'active',
            'checked_at' => '2026-04-18 12:00:00',
            'coverage_start' => '2026-04-01',
            'coverage_end' => '2026-12-31',
            'verification_reference' => 'ELIG-123',
            'benefit_note' => 'Medicare eligibility verified.',
        ]);
        $this->assertResponseCode(201);

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertSame(1, $body['data']['patient_id']);
        $this->assertSame(1, $body['data']['episode_id']);
        $this->assertSame('Medicare', $body['data']['payer_type']);
        $this->assertSame('active', $body['data']['eligibility_status']);

        $this->loginApiUser();
        $this->get('/api/v1/episodes/1/eligibility-checks');
        $this->assertResponseOk();

        $this->assertListContains('verification_reference', 'ELIG-123');

        $this->loginApiUser();
        $this->post('/api/v1/episodes/1/authorizations/add', [
            'authorization_number' => 'AUTH-123',
            'authorization_status' => 'approved',
            'authorized_visits' => 12,
            'used_visits' => 0,
            'start_date' => '2026-04-19',
            'end_date' => '2026-06-17',
            'payer_contact' => 'Medicare MAC',
            'auth_note' => 'Authorization approved for test episode.',
        ]);
        $this->assertResponseCode(201);

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertSame(1, $body['data']['patient_id']);
        $this->assertSame(1, $body['data']['episode_id']);
        $this->assertSame('Medicare', $body['data']['payer_type']);
        $this->assertSame('AUTH-123', $body['data']['authorization_number']);
        $this->assertSame('approved', $body['data']['authorization_status']);

        $this->loginApiUser();
        $this->get('/api/v1/episodes/1/authorizations');
        $this->assertResponseOk();

        $this->assertListContains('authorization_number', 'AUTH-123');

        $this->loginApiUser();
        $this->post('/api/v1/episodes/1/dme-supply-orders/add', [
            'item_name' => 'Wound dressing kit',
            'item_type' => 'supply',
            'quantity' => 4,
            'order_status' => 'ordered',
            'ordered_at' => '2026-04-20 13:00:00',
            'billing_relevance' => 'Supplies needed for ordered wound care.',
            'plan_of_care_linked' => true,
        ]);
        $this->assertResponseCode(201);

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertSame(1, $body['data']['patient_id']);
        $this->assertSame(1, $body['data']['episode_id']);
        $this->assertSame('Wound dressing kit', $body['data']['item_name']);
        $this->assertTrue((bool)$body['data']['plan_of_care_linked']);

        $this->loginApiUser();
        $this->get('/api/v1/episodes/1/dme-supply-orders');
        $this->assertResponseOk();

        $this->assertListContains('item_name', 'Wound dressing kit');

        $this->loginApiUser();
        $this->post('/api/v1/episodes/1/case-conferences/add', [
            'conference_at' => '2026-04-23 14:00:00',
            'participants' => 'RN, PT, physician, caregiver',
            'decisions' => 'Continue SN visits and add home safety teaching.',
            'follow_up_owner' => 'Nina Clinician',
            'next_review_at' => '2026-05-07 14:00:00',
            'status' => 'completed',
        ]);
        $this->assertResponseCode(201);

        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertSame(1, $body['data']['episode_id']);
        $this->assertSame('RN, PT, physician, caregiver', $body['data']['participants']);
        $this->assertSame('completed', $body['data']['status']);

        $this->loginApiUser();
        $this->get('/api/v1/episodes/1/case-conferences');
        $this->assertResponseOk();

        $this->assertListContains('participants', 'RN, PT, physician, caregiver');
    }

    /**
     * @return array<string, mixed>
     */
    private function jsonResponse(): array
    {
        return json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR);
    }

    private function assertListContains(string $key, mixed $expected): void
    {
        $body = $this->jsonResponse();
        $this->assertTrue($body['success']);
        $this->assertContains($expected, array_column($body['data'], $key));
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
