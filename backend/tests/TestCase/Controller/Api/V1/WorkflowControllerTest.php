<?php
declare(strict_types=1);

namespace App\Test\TestCase\Controller\Api\V1;

use App\Service\HomeHealthWorkflowService;
use Cake\Core\Configure;
use Cake\ORM\TableRegistry;
use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;
use Cake\Utility\Security;
use Laminas\Diactoros\Stream;
use Laminas\Diactoros\UploadedFile;

class WorkflowControllerTest extends TestCase
{
    use IntegrationTestTrait;

    private string $token = '';

    protected function setUp(): void
    {
        parent::setUp();

        Configure::write('Security.salt', Security::getSalt());
        $users = TableRegistry::getTableLocator()->get('Users');
        $user = $users->newEntity([
            'id' => 1,
            'full_name' => 'Marina Intake',
            'email' => 'intake@harborhomehealth.test',
            'password_hash' => '$2y$12$jGKam2dVVabPUIoZqH/4QuUzdCDq90gLV/ykGL2i7tp6My0UHTAdG',
            'role' => 'Intake',
        ]);
        $users->saveOrFail($user);

        $patients = TableRegistry::getTableLocator()->get('Patients');
        $patient = $patients->newEntity([
            'id' => 1,
            'first_name' => 'Eleanor',
            'last_name' => 'Bishop',
            'dob' => '1946-02-14',
            'gender' => 'Female',
            'payer_type' => 'Medicare',
            'status' => 'active',
            'medicare_number' => '1EG4TE5MK73',
            'insurance_member_id' => '1EG4TE5MK73',
            'phone' => '404-555-0101',
            'address1' => '125 Peachtree View',
            'city' => 'Atlanta',
            'state' => 'GA',
            'postal_code' => '30309',
            'emergency_contact_name' => 'Samuel Bishop',
            'emergency_contact_relationship' => 'Spouse',
            'emergency_contact_phone' => '404-555-0110',
            'primary_physician' => 'Dr. Hayes',
            'responsible_party_name' => 'Samuel Bishop',
            'responsible_party_relationship' => 'Spouse',
            'responsible_party_phone' => '404-555-0110',
        ]);
        $patients->saveOrFail($patient);

        $referrals = TableRegistry::getTableLocator()->get('Referrals');
        $referral = $referrals->newEntity([
            'id' => 1,
            'patient_id' => 1,
            'source_name' => 'Northside Hospital',
            'admission_source' => 'Hospital discharge',
            'payer_type' => 'Medicare',
            'primary_diagnosis' => 'I50.32 Chronic diastolic heart failure',
            'planned_soc_date' => '2026-04-19',
            'order_status' => 'signed',
            'physician_orders_signed' => true,
            'physician_orders_signed_at' => '2026-04-16 14:30:00',
            'face_to_face_date' => '2026-04-15',
            'referring_provider_name' => 'Dr. Alexis Monroe',
            'referring_provider_phone' => '404-555-0133',
            'pcp_name' => 'Dr. Hayes',
            'pcp_phone' => '404-555-0144',
            'caregiver_name' => 'Samuel Bishop',
            'caregiver_relationship' => 'Spouse',
            'caregiver_phone' => '404-555-0110',
            'service_location_type' => 'Patient home',
            'service_address1' => '125 Peachtree View',
            'service_city' => 'Atlanta',
            'service_state' => 'GA',
            'service_postal_code' => '30309',
            'intake_ready' => true,
            'status' => 'accepted',
            'requested_disciplines' => '["SN","PT"]',
        ]);
        $referrals->saveOrFail($referral);

        $this->configRequest([
            'headers' => [
                'Accept' => 'application/json',
            ],
        ]);

        $this->post('/api/v1/auth/login', [
            'email' => 'intake@harborhomehealth.test',
            'password' => 'demo1234',
        ]);

        $body = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $this->token = $body['token'];
    }

    public function testCanConvertReferralCreateAssessmentAndActivateEpisode(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $this->assertResponseSuccess();
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $episodeId = $episode['id'];
        $this->assertArrayHasKey('admission_readiness_snapshot', $episode);
        $snapshot = json_decode((string)$episode['admission_readiness_snapshot'], true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Hospital discharge', $snapshot['admission_source']);
        $this->assertSame('Dr. Alexis Monroe', $snapshot['referring_provider_name']);
        $this->assertSame('125 Peachtree View', $snapshot['service_address1']);

        foreach (['consent', 'hipaa_acknowledgement', 'patient_rights', 'advance_directive', 'emergency_preparedness_ack'] as $documentType) {
            $this->authorizeRequest();
            $this->post('/api/v1/patients/1/compliance-documents/add', [
                'document_type' => $documentType,
                'document_status' => 'signed',
                'signed_at' => '2026-04-18 09:00:00',
                'source_name' => 'SOC admission packet',
            ]);
            $this->assertResponseCode(201);
        }

        $this->authorizeRequest();
        $this->post('/api/v1/patients/1/medications/add', [
            'episode_id' => $episodeId,
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

        $this->authorizeRequest();
        $this->post('/api/v1/assessments/add', [
            'episode_id' => $episodeId,
            'assessment_type' => 'soc',
            'completed_at' => '2026-04-19 09:30:00',
            'status' => 'final',
            'principal_diagnosis_code' => 'I50.32',
            'functional_score' => 14,
            'comorbidity_level' => 'low',
            'medication_reconciliation_completed' => true,
            'homebound_status' => 'homebound',
            'homebound_narrative' => 'Patient leaves home only for medical appointments and requires considerable effort.',
            'fall_risk_level' => 'moderate',
            'hospitalization_risk' => 'elevated',
            'emergency_preparedness_reviewed' => true,
            'care_plan_goals' => 'Stabilize heart failure symptoms and improve endurance for ADLs.',
            'clinical_summary' => 'SOC assessment completed with medication review, homebound confirmation, and caregiver teaching.',
            'assessment_payload' => [
                'medication_review' => ['issues' => 'Lasix timing reviewed with spouse.'],
                'wounds' => ['present' => false, 'notes' => 'No open wounds observed.'],
                'caregiver_support' => ['availability' => 'Spouse available daily.'],
            ],
            'answers' => ['M0110' => '1'],
        ]);
        $this->assertResponseCode(201);

        $this->authorizeRequest();
        $this->post('/api/v1/visits/add', [
            'episode_id' => $episodeId,
            'patient_id' => 1,
            'visit_type' => 'soc',
            'discipline' => 'SN',
            'scheduled_start' => '2026-04-19 09:00:00',
            'scheduled_end' => '2026-04-19 10:00:00',
            'clinician_name' => 'Nina Clinician',
            'requires_evv' => true,
            'status' => 'scheduled',
            'sync_status' => 'synced',
        ]);
        $this->assertResponseCode(201);
        $visit = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $visitId = $visit['id'];

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $visitId . '/check-in', [
            'event_time' => '2026-04-19 09:02:00',
            'latitude' => 33.7867,
            'longitude' => -84.3837,
            'accuracy_meters' => 10,
            'device_metadata' => ['device' => 'iPad'],
        ]);
        $this->assertResponseSuccess();

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $visitId . '/check-out', [
            'event_time' => '2026-04-19 09:58:00',
            'latitude' => 33.7867,
            'longitude' => -84.3837,
            'accuracy_meters' => 8,
            'documentation_summary' => 'Completed SOC visit, medication reconciliation, and safety check.',
            'device_metadata' => ['device' => 'iPad'],
        ]);
        $this->assertResponseSuccess();

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/activate', []);
        $this->assertResponseSuccess();

        $data = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('active', $data['episode_status']);
        $this->assertSame('OASIS-E2', $data['oasis_version_required']);
        $this->assertSame('2026-04-24', $data['noa_due_date']);
        $this->assertSame('MMTA-CARDIAC-INSTITUTIONAL-EARLY-MEDIUM-LOW', $data['pdgm_group_code']);

        $qaTasks = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where(['episode_id' => $episodeId, 'task_type' => 'admission_readiness'])
            ->all()
            ->toList();
        $this->assertCount(1, $qaTasks);
        $this->assertStringContainsString('Hospital discharge', (string)$qaTasks[0]->get('details'));

        $documentationTasks = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type IN' => ['missing_face_to_face', 'missing_signed_orders'],
            ])
            ->all()
            ->toList();
        $this->assertCount(0, $documentationTasks);
    }

    public function testHistoricalAssessmentUsesOasisE1(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];

        $this->authorizeRequest();
        $this->post('/api/v1/assessments/add', [
            'episode_id' => $episode['id'],
            'assessment_type' => 'soc',
            'completed_at' => '2026-03-31 10:00:00',
            'status' => 'draft',
            'principal_diagnosis_code' => 'J44.9',
            'functional_score' => 6,
            'comorbidity_level' => 'none',
        ]);

        $this->assertResponseCode(201);
        $data = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('OASIS-E1', $data['oasis_version']);
    }

    public function testFinalAssessmentRequiresStructuredClinicalContent(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];

        $this->authorizeRequest();
        $this->post('/api/v1/assessments/add', [
            'episode_id' => $episode['id'],
            'assessment_type' => 'soc',
            'completed_at' => '2026-04-19 10:00:00',
            'status' => 'final',
            'principal_diagnosis_code' => 'I50.32',
            'functional_score' => 12,
            'comorbidity_level' => 'low',
            'medication_reconciliation_completed' => false,
            'homebound_status' => '',
            'homebound_narrative' => '',
            'care_plan_goals' => '',
            'clinical_summary' => '',
            'answers' => ['M0110' => '1'],
        ]);

        $this->assertResponseCode(422);
        $errors = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['errors'];
        $this->assertArrayHasKey('homebound_status', $errors);
        $this->assertArrayHasKey('homebound_narrative', $errors);
        $this->assertArrayHasKey('medication_reconciliation_completed', $errors);
        $this->assertArrayHasKey('care_plan_goals', $errors);
        $this->assertArrayHasKey('clinical_summary', $errors);
    }

    public function testAssessmentCanBeUpdatedWithStructuredClinicalPacket(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];

        $this->authorizeRequest();
        $this->post('/api/v1/assessments/add', [
            'episode_id' => $episode['id'],
            'assessment_type' => 'soc',
            'completed_at' => '2026-04-19 10:00:00',
            'status' => 'draft',
            'principal_diagnosis_code' => 'I50.32',
            'functional_score' => 12,
            'comorbidity_level' => 'low',
            'answers' => ['M0110' => '1'],
        ]);
        $assessment = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];

        $this->authorizeRequest();
        $this->post('/api/v1/assessments/' . $assessment['id'] . '/update', [
            'status' => 'final',
            'medication_reconciliation_completed' => true,
            'homebound_status' => 'homebound',
            'homebound_narrative' => 'Patient requires taxing effort and caregiver assistance to leave home.',
            'fall_risk_level' => 'high',
            'hospitalization_risk' => 'high',
            'emergency_preparedness_reviewed' => true,
            'care_plan_goals' => 'Prevent exacerbation and improve safe transfers.',
            'clinical_summary' => 'Finalized SOC with homebound, medication, and risk documentation.',
            'assessment_payload' => [
                'medication_review' => ['issues' => 'Reviewed daily weights and diuretic timing.'],
                'wounds' => ['present' => false],
            ],
        ]);

        $this->assertResponseOk();
        $updated = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('final', $updated['status']);
        $this->assertTrue($updated['medication_reconciliation_completed']);
        $this->assertSame('homebound', $updated['homebound_status']);
        $this->assertSame('high', $updated['fall_risk_level']);
        $this->assertSame('Reviewed daily weights and diuretic timing.', $updated['assessment_payload']['medication_review']['issues']);
    }

    public function testPatientAddRequiresExpandedDemographics(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/patients/add', [
            'first_name' => 'Harold',
            'last_name' => 'Sutton',
            'dob' => '1948-11-02',
            'gender' => 'Male',
            'payer_type' => 'Medicaid',
            'phone' => '(404) 555-0123',
            'address1' => '221 Oak Landing',
            'city' => 'Marietta',
            'state' => 'GA',
            'postal_code' => '30060',
            'insurance_member_id' => 'MCD-9987314',
            'emergency_contact_name' => 'Pat Sutton',
            'emergency_contact_relationship' => 'Daughter',
            'emergency_contact_phone' => '(404) 555-0141',
            'primary_physician' => 'Dr. Cole',
            'responsible_party_name' => 'Pat Sutton',
            'responsible_party_relationship' => 'Daughter',
            'responsible_party_phone' => '(404) 555-0141',
            'status' => 'active',
        ]);
        $this->assertResponseCode(201);
        $data = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('Male', $data['gender']);
        $this->assertSame('(404) 555-0123', $data['phone']);
        $this->assertSame('30060', $data['postal_code']);
        $this->assertSame('MCD-9987314', $data['insurance_member_id']);
        $this->assertSame('Pat Sutton', $data['responsible_party_name']);

        $this->authorizeRequest();
        $this->post('/api/v1/patients/add', [
            'first_name' => 'Bad',
            'last_name' => 'Phone',
            'dob' => '1950-01-01',
            'gender' => 'Female',
            'payer_type' => 'Medicare',
            'phone' => '4045559999',
            'address1' => '1 Main St',
            'city' => 'Atlanta',
            'state' => 'Georgia',
            'postal_code' => '30',
            'emergency_contact_phone' => '4045559999',
            'responsible_party_phone' => 'not-a-phone',
            'status' => 'active',
        ]);
        $this->assertResponseCode(422);

        $this->authorizeRequest();
        $this->post('/api/v1/patients/add', [
            'first_name' => 'Martha',
            'last_name' => 'Lane',
            'dob' => '1947-09-18',
            'gender' => 'Female',
            'payer_type' => 'Medicare',
            'phone' => '(404) 555-0162',
            'address1' => '78 Creekside Way',
            'city' => 'Atlanta',
            'state' => 'GA',
            'postal_code' => '30318',
            'status' => 'active',
        ]);
        $this->assertResponseCode(422);

        $this->authorizeRequest();
        $this->post('/api/v1/patients/add', [
            'first_name' => 'Nora',
            'last_name' => 'Page',
            'dob' => '1951-07-02',
            'gender' => 'Female',
            'payer_type' => 'Private Pay',
            'phone' => '(404) 555-0188',
            'address1' => '9 Arbor Glen',
            'city' => 'Roswell',
            'state' => 'GA',
            'postal_code' => '30075',
            'status' => 'active',
        ]);
        $this->assertResponseCode(201);
    }

    public function testClaimsAndEvvIndexEndpointsReturnJson(): void
    {
        $this->authorizeRequest();
        $this->get('/api/v1/claims');
        $this->assertResponseOk();
        $claimsPayload = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($claimsPayload['success']);
        $this->assertIsArray($claimsPayload['data']);

        $this->authorizeRequest();
        $this->get('/api/v1/evv');
        $this->assertResponseOk();
        $evvPayload = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($evvPayload['success']);
        $this->assertIsArray($evvPayload['data']);
    }

    public function testReferralAddRequiresExpandedClinicalIntakeFields(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/referrals/add', [
            'patient_id' => 1,
            'source_name' => 'Emory Midtown',
            'admission_source' => 'Hospital discharge',
            'payer_type' => 'Medicare',
            'primary_diagnosis' => 'J44.9 COPD',
            'requested_disciplines' => ['SN', 'OT'],
            'order_status' => 'signed',
            'physician_orders_signed' => true,
            'physician_orders_signed_at' => '2026-04-20 10:00:00',
            'face_to_face_date' => '2026-04-20',
            'referring_provider_name' => 'Dr. Lena Brooks',
            'referring_provider_phone' => '(404) 555-0166',
            'pcp_name' => 'Dr. Hayes',
            'pcp_phone' => '(404) 555-0144',
            'caregiver_name' => 'Samuel Bishop',
            'caregiver_relationship' => 'Spouse',
            'caregiver_phone' => '(404) 555-0110',
            'service_location_type' => 'Patient home',
            'service_address1' => '125 Peachtree View',
            'service_city' => 'Atlanta',
            'service_state' => 'GA',
            'service_postal_code' => '30309',
            'planned_soc_date' => '2026-04-22',
            'intake_ready' => true,
            'status' => 'accepted',
            'notes' => 'Ready for respiratory-focused SOC.',
        ]);
        $this->assertResponseCode(201);

        $this->authorizeRequest();
        $this->post('/api/v1/referrals/add', [
            'patient_id' => 1,
            'source_name' => 'Incomplete referral',
            'payer_type' => 'Medicare',
            'primary_diagnosis' => 'J44.9 COPD',
            'planned_soc_date' => '2026-04-22',
            'referring_provider_phone' => '4045551666',
            'caregiver_phone' => 'invalid',
            'service_state' => 'Georgia',
            'service_postal_code' => '30',
        ]);
        $this->assertResponseCode(422);
    }

    public function testPatientCanBeUpdated(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/patients/1/update', [
            'first_name' => 'Eleanor',
            'last_name' => 'Bishop',
            'dob' => '1946-02-14',
            'gender' => 'Female',
            'payer_type' => 'Medicare',
            'medicare_number' => '1EG4-TE5-MK72',
            'insurance_member_id' => '1EG4-TE5-MK72',
            'phone' => '(404) 555-0101',
            'address1' => '190 Juniper Street',
            'address2' => 'Apt 5B',
            'city' => 'Marietta',
            'state' => 'GA',
            'postal_code' => '30060',
            'primary_physician' => 'Dr. Hayes',
            'emergency_contact_name' => 'Samuel Bishop',
            'emergency_contact_relationship' => 'Spouse',
            'emergency_contact_phone' => '(404) 555-0110',
            'responsible_party_name' => 'Samuel Bishop',
            'responsible_party_relationship' => 'Spouse',
            'responsible_party_phone' => '(404) 555-0110',
            'status' => 'active',
        ]);
        $this->assertResponseOk();

        $updatedPatient = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('190 Juniper Street', $updatedPatient['address1']);
        $this->assertSame('Marietta', $updatedPatient['city']);
        $this->assertSame('1EG4-TE5-MK72', $updatedPatient['medicare_number']);
    }

    public function testEpisodeActivationRequiresSignedOrdersAndFaceToFace(): void
    {
        $referrals = TableRegistry::getTableLocator()->get('Referrals');
        $referrals->updateAll([
            'physician_orders_signed' => false,
            'physician_orders_signed_at' => null,
            'order_status' => 'pending_signature',
            'face_to_face_date' => null,
        ], ['id' => 1]);

        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $episodeId = $episode['id'];

        $this->authorizeRequest();
        $this->get('/api/v1/episodes/' . $episodeId . '/readiness');
        $this->assertResponseOk();
        $readiness = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertFalse($readiness['ready_to_activate']);
        $this->assertContains('Episode cannot activate until face-to-face documentation is captured on the referral.', $readiness['blockers']);
        $this->assertContains('Episode cannot activate until physician orders are signed.', $readiness['blockers']);

        $documentationTasks = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type IN' => ['missing_face_to_face', 'missing_signed_orders'],
            ])
            ->orderByAsc('task_type')
            ->all()
            ->toList();
        $this->assertCount(2, $documentationTasks);
        $this->assertSame('Intake', $documentationTasks[0]->get('assigned_role'));
        $this->assertSame('Clinical', $documentationTasks[1]->get('assigned_role'));
    }

    public function testUpdatingReferralIntakeDocumentationRefreshesEpisodeSnapshotAndResolvesTasks(): void
    {
        $referrals = TableRegistry::getTableLocator()->get('Referrals');
        $referrals->updateAll([
            'physician_orders_signed' => false,
            'physician_orders_signed_at' => null,
            'order_status' => 'pending_signature',
            'face_to_face_date' => null,
        ], ['id' => 1]);

        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $episodeId = $episode['id'];

        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/intake-docs', [
            'face_to_face_date' => '2026-04-18',
            'physician_orders_signed' => true,
            'physician_orders_signed_at' => '2026-04-18 11:30:00',
            'order_status' => 'signed',
        ]);
        $this->assertResponseOk();

        $updatedReferral = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('2026-04-18', $updatedReferral['face_to_face_date']);
        $this->assertTrue($updatedReferral['physician_orders_signed']);
        $this->assertSame('signed', $updatedReferral['order_status']);

        $episodes = TableRegistry::getTableLocator()->get('Episodes');
        $updatedEpisode = $episodes->get($episodeId);
        $snapshot = json_decode((string)$updatedEpisode->get('admission_readiness_snapshot'), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('2026-04-18', $snapshot['face_to_face_date']);
        $this->assertTrue($snapshot['physician_orders_signed']);
        $this->assertSame('signed', $snapshot['order_status']);

        $tasks = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type IN' => ['missing_face_to_face', 'missing_signed_orders'],
            ])
            ->orderByAsc('task_type')
            ->all()
            ->toList();
        $this->assertCount(2, $tasks);
        $this->assertSame('resolved', $tasks[0]->get('status'));
        $this->assertSame('resolved', $tasks[1]->get('status'));

        $this->authorizeRequest();
        $this->get('/api/v1/episodes/' . $episodeId . '/readiness');
        $this->assertResponseOk();
        $readiness = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertFalse($readiness['ready_to_activate']);
        $this->assertNotContains('Episode cannot activate until face-to-face documentation is captured on the referral.', $readiness['blockers']);
        $this->assertNotContains('Episode cannot activate until physician orders are signed.', $readiness['blockers']);
    }

    public function testReferralDocumentsSyncReferralReadinessAndResolveDocumentationTasks(): void
    {
        $referrals = TableRegistry::getTableLocator()->get('Referrals');
        $referrals->updateAll([
            'physician_orders_signed' => false,
            'physician_orders_signed_at' => null,
            'order_status' => 'pending_signature',
            'face_to_face_date' => null,
        ], ['id' => 1]);

        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $episodeId = $episode['id'];

        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/documents/add', [
            'document_type' => 'face_to_face',
            'document_status' => 'received',
            'source_name' => 'Hospital discharge packet',
            'received_at' => '2026-04-18 09:15:00',
            'document_note' => 'Face-to-face note received with hospital records.',
        ]);
        $this->assertResponseCode(201);

        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/documents/add', [
            'document_type' => 'physician_orders',
            'document_status' => 'received',
            'source_name' => 'Dr. Monroe fax',
            'received_at' => '2026-04-18 10:30:00',
            'document_note' => 'Unsigned orders received for review.',
        ]);
        $this->assertResponseCode(201);
        $orderDocument = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];

        $intermediateReferral = $referrals->get(1);
        $this->assertSame('2026-04-18', $intermediateReferral->get('face_to_face_date')->format('Y-m-d'));
        $this->assertFalse((bool)$intermediateReferral->get('physician_orders_signed'));
        $this->assertSame('received', $intermediateReferral->get('order_status'));

        $this->authorizeRequest();
        $this->post('/api/v1/referral-documents/' . $orderDocument['id'] . '/update', [
            'document_status' => 'signed',
            'signed_at' => '2026-04-18 11:45:00',
            'document_note' => 'Signed orders received and ready for intake release.',
        ]);
        $this->assertResponseOk();

        $updatedReferral = $referrals->get(1);
        $this->assertSame('2026-04-18', $updatedReferral->get('face_to_face_date')->format('Y-m-d'));
        $this->assertTrue((bool)$updatedReferral->get('physician_orders_signed'));
        $this->assertSame('signed', $updatedReferral->get('order_status'));
        $this->assertSame('2026-04-18 11:45:00', $updatedReferral->get('physician_orders_signed_at')->format('Y-m-d H:i:s'));

        $this->authorizeRequest();
        $this->get('/api/v1/referral-documents?referral_id=1');
        $this->assertResponseOk();
        $documentsPayload = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertCount(2, $documentsPayload);

        $updatedEpisode = TableRegistry::getTableLocator()->get('Episodes')->get($episodeId);
        $snapshot = json_decode((string)$updatedEpisode->get('admission_readiness_snapshot'), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('2026-04-18', $snapshot['face_to_face_date']);
        $this->assertTrue($snapshot['physician_orders_signed']);
        $this->assertSame('signed', $snapshot['order_status']);

        $tasks = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type IN' => ['missing_face_to_face', 'missing_signed_orders'],
            ])
            ->orderByAsc('task_type')
            ->all()
            ->toList();
        $this->assertCount(2, $tasks);
        $this->assertSame('resolved', $tasks[0]->get('status'));
        $this->assertSame('resolved', $tasks[1]->get('status'));
    }

    public function testReferralDocumentAttachmentCanBeStoredAndDownloaded(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/documents/add', [
            'document_type' => 'face_to_face',
            'document_status' => 'received',
            'source_name' => 'Hospital discharge packet',
            'received_at' => '2026-04-18 09:15:00',
            'document_note' => 'Face-to-face note received with hospital records.',
        ]);
        $this->assertResponseCode(201);
        $document = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $documentId = (int)$document['id'];

        $temporaryFile = tempnam(sys_get_temp_dir(), 'ref-doc-');
        file_put_contents($temporaryFile, 'sample referral attachment contents');
        $stream = new Stream($temporaryFile, 'r');
        $uploadedFile = new UploadedFile(
            $stream,
            filesize($temporaryFile),
            UPLOAD_ERR_OK,
            'face-to-face-note.pdf',
            'application/pdf',
        );

        $storedDocument = (new HomeHealthWorkflowService())->attachReferralDocumentFile($documentId, $uploadedFile, [
            'email' => 'intake@harborhomehealth.test',
        ]);
        $this->assertSame('face-to-face-note.pdf', $storedDocument['original_file_name']);
        $this->assertSame('application/pdf', $storedDocument['mime_type']);
        $this->assertNotEmpty($storedDocument['attachment_path']);
        $this->assertFileExists((string)$storedDocument['attachment_path']);

        $this->authorizeRequest();
        $this->get('/api/v1/referral-documents/' . $documentId . '/download');
        $this->assertResponseOk();
        $this->assertHeaderContains('Content-Disposition', 'face-to-face-note.pdf');
    }

    public function testPhysicianOrderWorkflowRequiresActiveOrdersToBeSignedBeforeBilling(): void
    {
        [$episodeId, $visitId] = $this->createActivatedEpisode();
        $this->resolveAllOpenQaTasksForEpisode($episodeId);
        $this->reviewAndLockVisitDocumentation($visitId);

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/orders/add', [
            'order_scope' => 'plan_of_care',
            'order_status' => 'sent_for_signature',
            'sent_at' => '2026-04-20 09:00:00',
        ]);
        $this->assertResponseCode(201);
        $order = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $orderId = $order['id'];
        $this->assertSame('plan_of_care', $order['order_scope']);
        $this->assertSame('sent_for_signature', $order['order_status']);
        $this->assertStringContainsString('Finalized OASIS-E2', $order['order_summary']);
        $this->assertStringContainsString('Assessment summary:', $order['order_note']);

        $qaTask = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type' => 'physician_order_review',
                'status' => 'open',
            ])
            ->first();
        $this->assertNotNull($qaTask);

        $claim = TableRegistry::getTableLocator()->get('Claims')->find()
            ->where(['episode_id' => $episodeId, 'claim_type' => 'noa'])
            ->firstOrFail();

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $claim->get('id') . '/submit', []);
        $this->assertResponseCode(422);
        $blockedPayload = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('Claim remains on hold', $blockedPayload['message']);

        $this->authorizeRequest();
        $this->post('/api/v1/physician-orders/' . $orderId . '/update', [
            'order_status' => 'signed',
            'signed_at' => '2026-04-20 13:15:00',
            'received_at' => '2026-04-20 12:30:00',
            'signer_name' => 'Dr. Alexis Monroe',
            'order_note' => 'Signed and ready for billing release.',
        ]);
        $this->assertResponseOk();

        $updatedOrder = TableRegistry::getTableLocator()->get('PhysicianOrders')->get($orderId);
        $this->assertSame('signed', $updatedOrder->get('order_status'));
        $this->assertSame('2026-04-20 13:15:00', $updatedOrder->get('signed_at')->format('Y-m-d H:i:s'));

        $resolvedOrderTask = TableRegistry::getTableLocator()->get('QaTasks')->get((int)$qaTask?->get('id'));
        $this->assertSame('resolved', $resolvedOrderTask->get('status'));

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $claim->get('id') . '/submit', []);
        $this->assertResponseOk();
    }

    public function testEpisodeOrderDraftSummarizesAssessmentAndRecentVisitCharting(): void
    {
        [$episodeId, $visitId] = $this->createActivatedEpisode();
        $this->reviewAndLockVisitDocumentation($visitId);

        $this->authorizeRequest();
        $this->get('/api/v1/episodes/' . $episodeId . '/orders/draft?scope=plan_of_care');
        $this->assertResponseOk();

        $draft = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('plan_of_care', $draft['order_scope']);
        $this->assertStringContainsString('I50.32 Chronic diastolic heart failure', $draft['order_summary']);
        $this->assertStringContainsString('Homebound status: homebound.', $draft['order_summary']);
        $this->assertStringContainsString('Assessment summary:', $draft['order_note']);
        $this->assertNotEmpty($draft['recent_visit_highlights']);
    }

    public function testEpisodeReviewSummaryAggregatesBillingAndQaStory(): void
    {
        [$episodeId, $visitId] = $this->createActivatedEpisode();
        $this->reviewAndLockVisitDocumentation($visitId);

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/orders/add', [
            'order_scope' => 'plan_of_care',
            'order_status' => 'sent_for_signature',
            'sent_at' => '2026-04-20 09:00:00',
        ]);
        $this->assertResponseCode(201);

        $this->authorizeRequest();
        $this->get('/api/v1/episodes/' . $episodeId . '/review-summary');
        $this->assertResponseOk();

        $summary = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame($episodeId, $summary['episode_id']);
        $this->assertFalse($summary['ready_to_bill']);
        $this->assertGreaterThanOrEqual(1, $summary['open_qa_tasks']);
        $this->assertSame(1, $summary['unsigned_active_orders']);
        $this->assertContains('Billing requires all active physician order packets to be signed.', $summary['billing_blockers']);
        $this->assertNotEmpty($summary['active_order_summaries']);
        $this->assertNotEmpty($summary['recent_visit_highlights']);
    }

    public function testQaTaskCanBeAssignedToNamedOwner(): void
    {
        [$episodeId] = $this->createActivatedEpisode();

        $task = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type' => 'assessment_review',
                'status' => 'open',
            ])
            ->firstOrFail();

        $this->authorizeRequest();
        $this->post('/api/v1/qa/' . $task->get('id') . '/assign', [
            'assigned_role' => 'QA',
            'assigned_user_name' => 'Quinn QA Reviewer',
        ]);
        $this->assertResponseOk();

        $assignedTask = TableRegistry::getTableLocator()->get('QaTasks')->get((int)$task->get('id'));
        $this->assertSame('QA', $assignedTask->get('assigned_role'));
        $this->assertSame('Quinn QA Reviewer', $assignedTask->get('assigned_user_name'));
        $this->assertNotNull($assignedTask->get('assigned_at'));
    }

    public function testQaIndexEscalatesOverdueAssignedTask(): void
    {
        $qaTasks = TableRegistry::getTableLocator()->get('QaTasks');
        $task = $qaTasks->newEntity([
            'episode_id' => null,
            'task_type' => 'claim_hold',
            'priority' => 'low',
            'status' => 'open',
            'title' => 'Review held claim follow-up',
            'details' => 'Billing review has been waiting past the due date.',
            'assigned_role' => 'Billing',
            'assigned_user_name' => 'Bianca Billing',
            'due_at' => '2026-04-20 09:00:00',
        ]);
        $qaTasks->saveOrFail($task);

        $this->authorizeRequest();
        $this->get('/api/v1/qa');
        $this->assertResponseOk();

        $tasks = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $escalatedTask = array_values(array_filter($tasks, fn (array $entry): bool => $entry['id'] === $task->get('id')))[0] ?? null;
        $this->assertNotNull($escalatedTask);
        $this->assertSame('high', $escalatedTask['priority']);
        $this->assertSame('low', $escalatedTask['base_priority']);
        $this->assertTrue($escalatedTask['is_overdue']);
        $this->assertSame('overdue_assigned', $escalatedTask['escalation_status']);
        $this->assertStringContainsString('Bianca Billing', $escalatedTask['escalation_reason']);
    }

    public function testQaTaskEscalationStoresSupervisorNoteAndHistory(): void
    {
        [$episodeId] = $this->createActivatedEpisode();

        $task = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type' => 'assessment_review',
                'status' => 'open',
            ])
            ->firstOrFail();

        $this->authorizeRequest();
        $this->post('/api/v1/qa/' . $task->get('id') . '/assign', [
            'assigned_role' => 'QA',
            'assigned_user_name' => 'Quinn QA Reviewer',
        ]);
        $this->assertResponseOk();

        $this->authorizeRequest();
        $this->post('/api/v1/qa/' . $task->get('id') . '/escalate', [
            'escalation_note' => 'Supervisor escalation: claim release is waiting on this OASIS review.',
        ]);
        $this->assertResponseOk();

        $updatedTask = TableRegistry::getTableLocator()->get('QaTasks')->get((int)$task->get('id'));
        $this->assertSame('Supervisor escalation: claim release is waiting on this OASIS review.', $updatedTask->get('escalation_note'));
        $this->assertSame('high', $updatedTask->get('priority'));
        $this->assertNotNull($updatedTask->get('last_escalated_at'));

        $history = json_decode((string)$updatedTask->get('assignment_history'), true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $history);
        $this->assertSame('reassigned', $history[0]['action']);
        $this->assertSame('escalated', $history[1]['action']);
        $this->assertStringContainsString('claim release is waiting', $history[1]['note']);
    }

    public function testRecertificationTransitionCreatesPhysicianOrderPacket(): void
    {
        [$episodeId] = $this->createActivatedEpisode();

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/transition', [
            'transition_type' => 'recertify',
            'effective_date' => '2026-05-20',
            'note' => 'Recertification orders need physician signature.',
            'clinician_name' => 'Nina Clinician',
        ]);
        $this->assertResponseOk();

        $orders = TableRegistry::getTableLocator()->get('PhysicianOrders')->find()
            ->where([
                'episode_id' => $episodeId,
                'order_scope' => 'recertification',
                'active' => true,
            ])
            ->all()
            ->toList();
        $this->assertCount(1, $orders);
        $this->assertSame('sent_for_signature', $orders[0]->get('order_status'));

        $orderQaTask = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type' => 'physician_order_review',
                'status' => 'open',
            ])
            ->all()
            ->toList();
        $this->assertNotEmpty($orderQaTask);
    }

    public function testUpdatingReferralRefreshesLinkedEpisodeSnapshot(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $episodeId = $episode['id'];

        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/update', [
            'patient_id' => 1,
            'source_name' => 'Emory Midtown',
            'admission_source' => 'Community referral',
            'payer_type' => 'Medicare',
            'primary_diagnosis' => 'J44.9 COPD',
            'requested_disciplines' => ['SN', 'OT'],
            'order_status' => 'signed',
            'physician_orders_signed' => true,
            'physician_orders_signed_at' => '2026-04-18 15:00:00',
            'face_to_face_date' => '2026-04-18',
            'referring_provider_name' => 'Dr. Lena Brooks',
            'referring_provider_phone' => '(404) 555-0166',
            'pcp_name' => 'Dr. Hayes',
            'pcp_phone' => '(404) 555-0144',
            'caregiver_name' => 'Samuel Bishop',
            'caregiver_relationship' => 'Spouse',
            'caregiver_phone' => '(404) 555-0110',
            'service_location_type' => 'Patient home',
            'service_address1' => '190 Juniper Street',
            'service_city' => 'Marietta',
            'service_state' => 'GA',
            'service_postal_code' => '30060',
            'planned_soc_date' => '2026-04-22',
            'intake_ready' => true,
            'status' => 'accepted',
            'notes' => 'Updated referral details after intake clarification.',
        ]);
        $this->assertResponseOk();

        $updatedReferral = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('Emory Midtown', $updatedReferral['source_name']);
        $this->assertSame('J44.9 COPD', $updatedReferral['primary_diagnosis']);

        $updatedEpisode = TableRegistry::getTableLocator()->get('Episodes')->get($episodeId);
        $this->assertSame('J44.9 COPD', $updatedEpisode->get('primary_diagnosis'));
        $snapshot = json_decode((string)$updatedEpisode->get('admission_readiness_snapshot'), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Emory Midtown', $snapshot['referral_source']);
        $this->assertSame('Community referral', $snapshot['admission_source']);
        $this->assertSame('Marietta', $snapshot['service_city']);
        $this->assertSame(['SN', 'OT'], $snapshot['requested_disciplines']);
    }

    public function testUpdatingEpisodeAdmissionDetailsRefreshesReferralBackedSnapshot(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $episodeId = $episode['id'];

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/admission/update', [
            'admission_source' => 'Community referral',
            'requested_disciplines' => ['SN', 'HHA'],
            'referring_provider_name' => 'Dr. Lena Brooks',
            'referring_provider_phone' => '(404) 555-0166',
            'service_address1' => '220 Creekside Drive',
            'service_city' => 'Roswell',
            'service_state' => 'GA',
            'service_postal_code' => '30075',
            'notes' => 'Episode-side intake correction for admission planning.',
        ]);
        $this->assertResponseOk();

        $updatedEpisode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $snapshot = json_decode((string)$updatedEpisode['admission_readiness_snapshot'], true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Community referral', $snapshot['admission_source']);
        $this->assertSame('Dr. Lena Brooks', $snapshot['referring_provider_name']);
        $this->assertSame(['SN', 'HHA'], $snapshot['requested_disciplines']);
        $this->assertSame('Roswell', $snapshot['service_city']);

        $updatedReferral = TableRegistry::getTableLocator()->get('Referrals')->get(1);
        $this->assertSame('Community referral', $updatedReferral->get('admission_source'));
        $this->assertSame('Roswell', $updatedReferral->get('service_city'));
    }

    public function testEpisodeReadinessAndResumeCareTransition(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $episodeId = $episode['id'];

        $this->authorizeRequest();
        $this->get('/api/v1/episodes/' . $episodeId . '/readiness');
        $this->assertResponseOk();
        $readiness = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertFalse($readiness['soc_visit_completed']);
        $this->assertFalse($readiness['finalized_assessment_exists']);
        $this->assertFalse($readiness['ready_to_activate']);
        $this->assertNotEmpty($readiness['blockers']);

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/transition', [
            'transition_type' => 'resume_care',
            'effective_date' => '2026-04-22',
            'note' => 'Patient discharged from hospital and needs ROC assessment.',
            'clinician_name' => 'Nina Clinician',
        ]);
        $this->assertResponseOk();
        $transition = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('resume_care', $transition['transition_type']);
        $this->assertNotEmpty($transition['created_visit_ids']);

        $episodes = TableRegistry::getTableLocator()->get('Episodes');
        $updatedEpisode = $episodes->get($episodeId);
        $this->assertSame('roc_pending', $updatedEpisode->get('episode_status'));

        $visits = TableRegistry::getTableLocator()->get('Visits')->find()
            ->where(['episode_id' => $episodeId, 'visit_type' => 'roc'])
            ->all()
            ->toList();
        $this->assertCount(1, $visits);

        $qaTasks = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where(['episode_id' => $episodeId, 'task_type' => 'resume_care'])
            ->all()
            ->toList();
        $this->assertCount(1, $qaTasks);
    }

    public function testRescheduleAndMissedVisitCreateQaAndClaimHolds(): void
    {
        [$episodeId] = $this->createActivatedEpisode();

        $this->authorizeRequest();
        $this->post('/api/v1/visits/add', [
            'episode_id' => $episodeId,
            'patient_id' => 1,
            'visit_type' => 'routine',
            'discipline' => 'PT',
            'scheduled_start' => '2026-04-21 11:00:00',
            'scheduled_end' => '2026-04-21 11:45:00',
            'clinician_name' => 'Miles Therapy',
            'requires_evv' => true,
            'status' => 'scheduled',
            'sync_status' => 'synced',
        ]);
        $this->assertResponseCode(201);
        $routineVisitId = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data']['id'];

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $routineVisitId . '/reschedule', [
            'visit_type' => 'pt_eval',
            'discipline' => 'PT',
            'scheduled_start' => '2026-04-23 13:00:00',
            'scheduled_end' => '2026-04-23 13:45:00',
            'follow_up_plan' => 'Therapist to confirm updated time with patient.',
            'reason' => 'Therapist availability changed and frequency needs QA review.',
        ]);
        $this->assertResponseOk();

        $visits = TableRegistry::getTableLocator()->get('Visits');
        $rescheduledVisit = $visits->get($routineVisitId);
        $this->assertSame('qa_review', $rescheduledVisit->get('documentation_status'));
        $this->assertSame('Therapist to confirm updated time with patient.', $rescheduledVisit->get('follow_up_plan'));

        $qaTasks = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where(['visit_id' => $routineVisitId, 'task_type' => 'frequency_change'])
            ->all()
            ->toList();
        $this->assertCount(1, $qaTasks);

        $claims = TableRegistry::getTableLocator()->get('Claims')->find()
            ->where(['episode_id' => $episodeId])
            ->all()
            ->toList();
        $this->assertNotEmpty($claims);
        $this->assertStringContainsString('Schedule change requires QA and billing review', (string)$claims[0]->get('hold_reason'));

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $routineVisitId . '/reassign', [
            'clinician_name' => 'Ari Rehab',
            'reason' => 'Coverage shift for afternoon reassignment.',
            'follow_up_plan' => 'New therapist to review prior notes and confirm arrival window.',
        ]);
        $this->assertResponseOk();

        $reassignedVisit = $visits->get($routineVisitId);
        $this->assertSame('Ari Rehab', $reassignedVisit->get('clinician_name'));
        $this->assertSame('Miles Therapy', $reassignedVisit->get('reassigned_from_clinician'));
        $this->assertSame('qa_review', $reassignedVisit->get('documentation_status'));

        $reassignmentTasks = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where(['visit_id' => $routineVisitId, 'task_type' => 'visit_reassignment'])
            ->all()
            ->toList();
        $this->assertCount(1, $reassignmentTasks);

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $routineVisitId . '/mark-missed', [
            'reason' => 'Patient unavailable for the rescheduled therapy visit.',
            'follow_up_plan' => 'Care manager to call family and offer next available slot.',
        ]);
        $this->assertResponseOk();

        $updatedVisit = $visits->get($routineVisitId);
        $this->assertSame('missed', $updatedVisit->get('status'));
        $this->assertSame('exception_review', $updatedVisit->get('documentation_status'));
        $this->assertSame('Patient unavailable for the rescheduled therapy visit.', $updatedVisit->get('missed_reason'));
        $this->assertSame('Care manager to call family and offer next available slot.', $updatedVisit->get('follow_up_plan'));

        $missedTasks = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where(['visit_id' => $routineVisitId, 'task_type' => 'missed_visit'])
            ->all()
            ->toList();
        $this->assertCount(1, $missedTasks);

        $refreshedClaims = TableRegistry::getTableLocator()->get('Claims')->find()
            ->where(['episode_id' => $episodeId])
            ->all()
            ->toList();
        $this->assertStringContainsString('Missed visit requires QA and billing review', (string)$refreshedClaims[0]->get('hold_reason'));
    }

    public function testResolvingScheduleChangeQaTasksClearsManagedClaimHolds(): void
    {
        [$episodeId] = $this->createActivatedEpisode();
        $this->resolveAllOpenQaTasksForEpisode($episodeId);

        $this->authorizeRequest();
        $this->post('/api/v1/visits/add', [
            'episode_id' => $episodeId,
            'patient_id' => 1,
            'visit_type' => 'routine',
            'discipline' => 'PT',
            'scheduled_start' => '2026-04-21 11:00:00',
            'scheduled_end' => '2026-04-21 11:45:00',
            'clinician_name' => 'Miles Therapy',
            'requires_evv' => true,
            'status' => 'scheduled',
            'sync_status' => 'synced',
        ]);
        $routineVisitId = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data']['id'];

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $routineVisitId . '/reschedule', [
            'visit_type' => 'pt_eval',
            'discipline' => 'PT',
            'scheduled_start' => '2026-04-23 13:00:00',
            'scheduled_end' => '2026-04-23 13:45:00',
            'reason' => 'Therapist availability changed and frequency needs QA review.',
        ]);
        $this->assertResponseOk();

        $frequencyTask = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where(['visit_id' => $routineVisitId, 'task_type' => 'frequency_change', 'status' => 'open'])
            ->firstOrFail();

        $this->authorizeRequest();
        $this->post('/api/v1/qa/' . $frequencyTask->get('id') . '/resolve', []);
        $this->assertResponseOk();

        $claim = TableRegistry::getTableLocator()->get('Claims')->find()
            ->where(['episode_id' => $episodeId])
            ->firstOrFail();
        $this->assertNull($claim->get('hold_reason'));

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $routineVisitId . '/mark-missed', [
            'reason' => 'Patient unavailable for the rescheduled therapy visit.',
        ]);
        $this->assertResponseOk();

        $missedTask = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where(['visit_id' => $routineVisitId, 'task_type' => 'missed_visit', 'status' => 'open'])
            ->firstOrFail();

        $this->authorizeRequest();
        $this->post('/api/v1/qa/' . $missedTask->get('id') . '/resolve', []);
        $this->assertResponseOk();

        $claimAfterMissedResolution = TableRegistry::getTableLocator()->get('Claims')->find()
            ->where(['episode_id' => $episodeId])
            ->firstOrFail();
        $this->assertNull($claimAfterMissedResolution->get('hold_reason'));
    }

    public function testClaimSubmissionRequiresCodingAndBillingReadiness(): void
    {
        [$episodeId, $visitId] = $this->createActivatedEpisode();
        $this->resolveAllOpenQaTasksForEpisode($episodeId);
        $this->reviewAndLockVisitDocumentation($visitId);

        $claim = TableRegistry::getTableLocator()->get('Claims')->find()
            ->where(['episode_id' => $episodeId, 'claim_type' => 'noa'])
            ->firstOrFail();

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $claim->get('id') . '/submit', []);
        $this->assertResponseOk();

        [$mismatchEpisodeId, $mismatchVisitId] = $this->createActivatedEpisode('J44.9');
        $this->resolveAllOpenQaTasksForEpisode($mismatchEpisodeId);
        $this->reviewAndLockVisitDocumentation($mismatchVisitId);

        $mismatchClaim = TableRegistry::getTableLocator()->get('Claims')->find()
            ->where(['episode_id' => $mismatchEpisodeId, 'claim_type' => 'noa'])
            ->firstOrFail();

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $mismatchClaim->get('id') . '/submit', []);
        $this->assertResponseCode(422);
        $payload = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('does not match the episode primary diagnosis', $payload['message']);

        $refreshedClaim = TableRegistry::getTableLocator()->get('Claims')->get($mismatchClaim->get('id'));
        $this->assertStringContainsString('does not match the episode primary diagnosis', (string)$refreshedClaim->get('hold_reason'));
    }

    public function testClaimLifecycleCanAdvanceThroughAcceptancePaymentAndVoid(): void
    {
        [$episodeId, $visitId] = $this->createActivatedEpisode();
        $this->resolveAllOpenQaTasksForEpisode($episodeId);
        $this->reviewAndLockVisitDocumentation($visitId);

        $claim = TableRegistry::getTableLocator()->get('Claims')->find()
            ->where(['episode_id' => $episodeId, 'claim_type' => 'noa'])
            ->firstOrFail();

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $claim->get('id') . '/submit', []);
        $this->assertResponseOk();

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $claim->get('id') . '/accept', [
            'payer_claim_number' => 'MC-447712',
        ]);
        $this->assertResponseOk();

        $acceptedClaim = TableRegistry::getTableLocator()->get('Claims')->get((int)$claim->get('id'));
        $this->assertSame('accepted', $acceptedClaim->get('status'));
        $this->assertSame('MC-447712', $acceptedClaim->get('payer_claim_number'));
        $this->assertNotNull($acceptedClaim->get('accepted_at'));

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $claim->get('id') . '/post-payment', [
            'payment_amount' => 2450.25,
            'remittance_reference' => 'ERA-2026-0419',
        ]);
        $this->assertResponseOk();

        $paidClaim = TableRegistry::getTableLocator()->get('Claims')->get((int)$claim->get('id'));
        $this->assertSame('paid', $paidClaim->get('status'));
        $this->assertSame('2450.25', (string)$paidClaim->get('payment_amount'));
        $this->assertSame('ERA-2026-0419', $paidClaim->get('remittance_reference'));
        $this->assertNotNull($paidClaim->get('paid_at'));

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $claim->get('id') . '/void', [
            'void_reason' => 'Payer requested corrected claim submission.',
        ]);
        $this->assertResponseOk();

        $voidedClaim = TableRegistry::getTableLocator()->get('Claims')->get((int)$claim->get('id'));
        $this->assertSame('voided', $voidedClaim->get('status'));
        $this->assertSame('Payer requested corrected claim submission.', $voidedClaim->get('void_reason'));
        $this->assertNotNull($voidedClaim->get('voided_at'));

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $claim->get('id') . '/resubmit-corrected', [
            'correction_reason' => 'Corrected payer routing and resubmission after void.',
            'amount' => 2450.25,
        ]);
        $this->assertResponseCode(201);

        $correctedClaim = TableRegistry::getTableLocator()->get('Claims')->find()
            ->where([
                'corrected_from_claim_id' => $claim->get('id'),
                'correction_reason' => 'Corrected payer routing and resubmission after void.',
            ])
            ->firstOrFail();
        $this->assertSame('draft', $correctedClaim->get('status'));
        $this->assertSame((int)$claim->get('id'), (int)$correctedClaim->get('corrected_from_claim_id'));
    }

    public function testEvvLifecycleCanTrackExceptionAndReconciliation(): void
    {
        [$episodeId] = $this->createActivatedEpisode();

        $record = TableRegistry::getTableLocator()->get('EvvRecords')->find()
            ->matching('Visits', fn ($query) => $query->where(['Visits.episode_id' => $episodeId]))
            ->firstOrFail();

        $this->authorizeRequest();
        $this->post('/api/v1/evv/' . $record->get('id') . '/submit', []);
        $this->assertResponseOk();

        $submittedRecord = TableRegistry::getTableLocator()->get('EvvRecords')->get((int)$record->get('id'));
        $this->assertSame('submitted', $submittedRecord->get('status'));
        $this->assertNotNull($submittedRecord->get('submitted_at'));
        $this->assertNotEmpty($submittedRecord->get('submission_reference'));

        $this->authorizeRequest();
        $this->post('/api/v1/evv/' . $record->get('id') . '/mark-exception', [
            'exception_reason' => 'Missing caregiver acknowledgement on vendor response.',
        ]);
        $this->assertResponseOk();

        $exceptionRecord = TableRegistry::getTableLocator()->get('EvvRecords')->get((int)$record->get('id'));
        $this->assertSame('exception', $exceptionRecord->get('status'));
        $this->assertSame('Missing caregiver acknowledgement on vendor response.', $exceptionRecord->get('exception_reason'));

        $this->authorizeRequest();
        $this->post('/api/v1/evv/' . $record->get('id') . '/reconcile', []);
        $this->assertResponseOk();

        $reconciledRecord = TableRegistry::getTableLocator()->get('EvvRecords')->get((int)$record->get('id'));
        $this->assertSame('reconciled', $reconciledRecord->get('status'));
        $this->assertNull($reconciledRecord->get('exception_reason'));
        $this->assertNotNull($reconciledRecord->get('reconciled_at'));
    }

    public function testAdminSettingsAndAuditEventsEndpoints(): void
    {
        $this->authorizeRequest();
        $this->get('/api/v1/admin/settings');
        $this->assertResponseOk();
        $settings = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame(30, $settings['session_timeout_minutes']);
        $this->assertFalse($settings['require_mfa']);

        $this->authorizeRequest();
        $this->post('/api/v1/admin/settings', [
            'require_mfa' => true,
            'session_timeout_minutes' => 20,
            'remember_device_days' => 10,
            'password_rotation_days' => 60,
            'attachment_retention_days' => 400,
            'allowed_ip_ranges' => "10.24.0.0/16\n192.168.10.0/24",
            'enforce_device_attestation' => true,
        ]);
        $this->assertResponseOk();
        $updated = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertTrue($updated['require_mfa']);
        $this->assertSame(20, $updated['session_timeout_minutes']);
        $this->assertTrue($updated['enforce_device_attestation']);

        $this->authorizeRequest();
        $this->get('/api/v1/audit-events?action=admin_settings_updated&model=AppSetting');
        $this->assertResponseOk();
        $events = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertNotEmpty($events);
        $this->assertSame('admin_settings_updated', $events[0]['action']);
        $this->assertSame('AppSetting', $events[0]['model']);
        $this->assertSame('intake@harborhomehealth.test', $events[0]['actor_email']);
    }

    public function testAdminUsersAndSessionActivityEndpoints(): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/admin/users/add', [
            'full_name' => 'Bianca Billing',
            'email' => 'billing@harborhomehealth.test',
            'role' => 'Billing',
            'mobile' => '404-555-0166',
            'status' => 'active',
            'mfa_enabled' => true,
            'password' => 'demo1234',
        ]);
        $this->assertResponseCode(201);
        $createdUser = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('Billing', $createdUser['role']);
        $this->assertSame('active', $createdUser['status']);

        $this->authorizeRequest();
        $this->post('/api/v1/admin/users/' . $createdUser['id'] . '/update', [
            'status' => 'suspended',
            'mfa_enabled' => false,
            'mobile' => '404-555-0191',
        ]);
        $this->assertResponseOk();
        $updatedUser = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('suspended', $updatedUser['status']);
        $this->assertFalse($updatedUser['mfa_enabled']);

        $this->configRequest([
            'headers' => [
                'Accept' => 'application/json',
            ],
        ]);
        $this->post('/api/v1/auth/login', [
            'email' => 'billing@harborhomehealth.test',
            'password' => 'demo1234',
        ]);
        $this->assertResponseCode(403);

        $this->authorizeRequest();
        $this->get('/api/v1/admin/users');
        $this->assertResponseOk();
        $users = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertCount(2, $users);

        $this->authorizeRequest();
        $this->get('/api/v1/admin/session-activity');
        $this->assertResponseOk();
        $sessions = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertNotEmpty($sessions);
        $this->assertSame('Marina Intake', $sessions[0]['full_name']);
    }

    public function testVisitDocumentationReviewMustBeLockedBeforeBillingSubmission(): void
    {
        [$episodeId, $visitId] = $this->createActivatedEpisode();
        $this->resolveAllOpenQaTasksForEpisode($episodeId);

        $claim = TableRegistry::getTableLocator()->get('Claims')->find()
            ->where(['episode_id' => $episodeId, 'claim_type' => 'noa'])
            ->firstOrFail();

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $visitId . '/document', [
            'visit_focus' => 'Cardiopulmonary assessment and medication follow-up.',
            'visit_narrative' => 'Patient tolerated SOC interventions well.',
            'interventions' => 'Medication reconciliation and home safety review completed.',
            'patient_response' => 'Patient verbalized understanding of the care plan.',
            'vitals' => 'BP 132/78 HR 74',
            'pain_level' => '0/10',
            'teaching_topics' => 'Daily weights, sodium restriction, and when to call the agency.',
            'medication_review' => 'Lasix schedule and adherence reviewed with patient and spouse.',
            'wound_care' => 'No wound care needed.',
            'mobility_status' => 'Ambulates with walker inside the home.',
            'adl_support' => 'Spouse assists with meal prep and bathing setup.',
            'psychosocial_notes' => 'Patient is anxious but cooperative.',
            'abnormal_findings' => 'Mild bilateral ankle edema persists.',
            'follow_up_plan' => 'SN follow-up in 48 hours.',
            'next_visit_focus' => 'Reassess edema, weights, and medication tolerance.',
            'submit_for_qa' => true,
        ]);
        $this->assertResponseOk();
        $documentedVisit = TableRegistry::getTableLocator()->get('Visits')->get($visitId);
        $this->assertSame('qa_review', $documentedVisit->get('documentation_status'));

        $documentationTask = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where([
                'visit_id' => $visitId,
                'task_type' => 'visit_documentation_review',
                'status' => 'open',
            ])
            ->first();
        $this->assertNotNull($documentationTask);

        $claimBeforeLock = TableRegistry::getTableLocator()->get('Claims')->get($claim->get('id'));
        $this->assertStringContainsString('Visit documentation requires QA lock before submission.', (string)$claimBeforeLock->get('hold_reason'));

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $claim->get('id') . '/submit', []);
        $this->assertResponseCode(422);
        $submitBlockedPayload = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('Claim remains on hold', $submitBlockedPayload['message']);

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $visitId . '/lock-documentation', [
            'qa_review_notes' => 'Documentation reviewed and ready for claim release.',
        ]);
        $this->assertResponseOk();

        $lockedVisit = TableRegistry::getTableLocator()->get('Visits')->get($visitId);
        $this->assertSame('locked', $lockedVisit->get('status'));
        $this->assertSame('locked', $lockedVisit->get('documentation_status'));
        $this->assertSame('Documentation reviewed and ready for claim release.', $lockedVisit->get('qa_review_notes'));

        $resolvedDocumentationTask = TableRegistry::getTableLocator()->get('QaTasks')->get((int)$documentationTask?->get('id'));
        $this->assertSame('resolved', $resolvedDocumentationTask->get('status'));

        $claimAfterLock = TableRegistry::getTableLocator()->get('Claims')->get($claim->get('id'));
        $this->assertNull($claimAfterLock->get('hold_reason'));

        $this->authorizeRequest();
        $this->post('/api/v1/claims/' . $claim->get('id') . '/submit', []);
        $this->assertResponseOk();
    }

    public function testSkilledNursingDocumentationRequiresStructuredSectionsForQaSubmission(): void
    {
        [, $visitId] = $this->createActivatedEpisode();

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $visitId . '/document', [
            'visit_focus' => 'Cardiopulmonary assessment and medication follow-up.',
            'visit_narrative' => 'Visit note captured.',
            'interventions' => 'Care plan interventions completed.',
            'patient_response' => 'Patient verbalized understanding.',
            'follow_up_plan' => 'Continue SN frequency.',
            'submit_for_qa' => true,
        ]);

        $this->assertResponseCode(422);
        $payload = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('Vitals is required before SN documentation can be submitted to QA.', $payload['message']);
    }

    public function testCanPrepareOasisSubmissionGeneratePlanOfCareAndSyncCoderReview(): void
    {
        [$episodeId] = $this->createActivatedEpisode();

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/oasis-submissions/prepare', []);
        $this->assertResponseCode(201);
        $submission = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('ready', $submission['submission_status']);
        $this->assertTrue($submission['iqies_ready']);

        $this->authorizeRequest();
        $this->post('/api/v1/oasis-submissions/' . $submission['id'] . '/update', [
            'submission_status' => 'rejected',
            'rejection_note' => 'Demo iQIES validation rejected the package for remapping.',
        ]);
        $this->assertResponseOk();
        $updatedSubmission = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('rejected', $updatedSubmission['submission_status']);
        $this->assertSame('rejected', $updatedSubmission['acknowledgment_status']);

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/plan-of-care/generate', []);
        $this->assertResponseCode(201);
        $plan = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame($episodeId, $plan['episode_id']);
        $this->assertStringContainsString('PLAN OF CARE', $plan['printable_content']);

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/coder-review/sync', []);
        $this->assertResponseCode(201);
        $items = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertNotEmpty($items);

        $qaRejectionTask = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where([
                'episode_id' => $episodeId,
                'task_type' => 'oasis_submission_rejected',
                'status' => 'open',
            ])
            ->first();
        $this->assertNotNull($qaRejectionTask);
    }

    public function testCanRouteFaxInboxAddCommunicationLogAndCaptureQualityMetrics(): void
    {
        [$episodeId] = $this->createActivatedEpisode();

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/communication-log/add', [
            'contact_name' => 'Dr. Alexis Monroe',
            'contact_role' => 'Referring provider',
            'method' => 'phone',
            'topic' => 'Post-SOC follow-up',
            'outcome' => 'Continue daily weights and escalate worsening edema.',
            'follow_up_owner' => 'Nina Clinician',
            'follow_up_due_at' => '2026-04-20 10:00:00',
        ]);
        $this->assertResponseCode(201);
        $entry = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('follow_up_due', $entry['status']);

        $this->authorizeRequest();
        $this->post('/api/v1/fax-inbox/add', [
            'source_name' => 'Piedmont Referral Fax',
            'from_number' => '404-555-0120',
            'subject' => 'Referral packet',
            'packet_type' => 'referral_packet',
            'received_at' => '2026-04-18 08:15:00',
            'attachment_note' => 'Includes discharge summary and unsigned orders.',
            'linked_document_count' => 2,
        ]);
        $this->assertResponseCode(201);
        $fax = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];

        $this->authorizeRequest();
        $this->post('/api/v1/fax-inbox/' . $fax['id'] . '/route', [
            'create_referral' => true,
            'patient_id' => 1,
            'admission_source' => 'Hospital discharge',
            'payer_type' => 'Medicare',
            'primary_diagnosis' => 'I50.32 Chronic diastolic heart failure',
            'planned_soc_date' => '2026-04-20',
            'requested_disciplines' => ['SN', 'PT'],
            'route_note' => 'Converted packet into live referral intake.',
        ]);
        $this->assertResponseOk();
        $routedFax = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertSame('converted_to_referral', $routedFax['routing_status']);
        $this->assertNotEmpty($routedFax['referral_id']);

        $this->authorizeRequest();
        $this->post('/api/v1/qapi-projects/add', [
            'title' => 'Reduce chart release lag',
            'measure_name' => 'Documentation timeliness',
            'owner_name' => 'Quinn QA Reviewer',
            'review_cadence' => 'monthly',
            'status' => 'active',
            'target_value' => '95%',
            'current_value' => '82%',
        ]);
        $this->assertResponseCode(201);

        $this->authorizeRequest();
        $this->post('/api/v1/quality-metrics/capture', ['period_key' => 'all']);
        $this->assertResponseCode(201);
        $qualitySummary = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertArrayHasKey('metrics', $qualitySummary);
        $this->assertNotEmpty($qualitySummary['metrics']);
        $this->assertNotEmpty($qualitySummary['history']);
    }

    public function testCompliancePacketAndMedicationReviewAffectEpisodeReadiness(): void
    {
        TableRegistry::getTableLocator()->get('PatientComplianceDocuments')->deleteAll(['patient_id' => 1]);
        TableRegistry::getTableLocator()->get('PatientMedications')->deleteAll(['patient_id' => 1]);

        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $this->assertResponseSuccess();
        $episodeId = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data']['id'];

        $this->authorizeRequest();
        $this->get('/api/v1/episodes/' . $episodeId . '/readiness');
        $this->assertResponseOk();
        $readiness = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertStringContainsString('Admission compliance packet is missing', implode(' | ', $readiness['blockers']));
        $this->assertStringContainsString('Medication profile must be reviewed before admission readiness is complete.', implode(' | ', $readiness['blockers']));

        foreach (['consent', 'hipaa_acknowledgement', 'patient_rights', 'advance_directive', 'emergency_preparedness_ack'] as $documentType) {
            $this->authorizeRequest();
            $this->post('/api/v1/patients/1/compliance-documents/add', [
                'document_type' => $documentType,
                'document_status' => 'signed',
                'signed_at' => '2026-04-18 09:00:00',
            ]);
            $this->assertResponseCode(201);
        }

        $this->authorizeRequest();
        $this->post('/api/v1/patients/1/medications/add', [
            'episode_id' => $episodeId,
            'medication_name' => 'Furosemide',
            'high_risk' => true,
            'teaching_completed' => true,
            'last_reconciled_at' => '2026-04-19 09:20:00',
        ]);
        $this->assertResponseCode(201);

        $this->authorizeRequest();
        $this->get('/api/v1/episodes/' . $episodeId . '/readiness');
        $this->assertResponseOk();
        $readiness = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertNotContains('Medication profile must be reviewed before admission readiness is complete.', $readiness['blockers']);
    }

    public function testHomeHealthGapCompletionResourcesSupportSurveyReadiness(): void
    {
        [$episodeId] = $this->createActivatedEpisode();

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/verbal-orders/add', [
            'order_source' => 'Dr. Alexis Monroe',
            'ordered_service' => 'Increase SN visits to 2w2 for medication teaching.',
            'received_by' => 'Nina Clinician RN',
            'received_at' => '2026-04-20 09:15:00',
            'read_back_completed' => true,
            'signature_due_at' => '2026-04-25 17:00:00',
            'status' => 'pending_signature',
            'order_note' => 'Verbal order recorded and sent for signature.',
        ]);
        $this->assertResponseCode(201);

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/incidents/add', [
            'incident_type' => 'fall',
            'severity' => 'high',
            'occurred_at' => '2026-04-20 12:00:00',
            'description' => 'Patient reported an unwitnessed fall without injury.',
            'follow_up_owner' => 'QA Supervisor',
            'qapi_linked' => true,
            'status' => 'qapi_review',
        ]);
        $this->assertResponseCode(201);

        $billingReadiness = (new HomeHealthWorkflowService())->evaluateBillingReadiness($episodeId);
        $this->assertStringContainsString('Open verbal orders require physician signature follow-up', implode(' | ', $billingReadiness['blockers']));

        $this->authorizeRequest();
        $this->post('/api/v1/billing/claim-transactions/add', [
            'claim_id' => 1,
            'transaction_type' => '837I',
            'transaction_status' => 'created',
            'transaction_reference' => '837I-DEMO-0001',
            'payload_summary' => 'Demo institutional claim payload staged for clearinghouse submission.',
        ]);
        $this->assertResponseCode(201);

        $this->authorizeRequest();
        $this->post('/api/v1/billing/remittance-postings/add', [
            'claim_id' => 1,
            'era_reference' => 'ERA-DEMO-0001',
            'paid_amount' => 1200.00,
            'adjustment_code' => 'CO45',
            'adjustment_amount' => 35.00,
            'posted_at' => '2026-04-30 10:00:00',
            'posting_note' => 'Demo ERA posted for revenue-cycle review.',
        ]);
        $this->assertResponseCode(201);

        $this->authorizeRequest();
        $this->post('/api/v1/admin/survey-readiness/capture', ['period_key' => 'demo']);
        $this->assertResponseCode(201);
        $summary = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $this->assertArrayHasKey('category_scores', $summary);
        $this->assertGreaterThanOrEqual(1, $summary['open_counts']['open_verbal_orders']);
        $this->assertGreaterThanOrEqual(1, $summary['open_counts']['open_incidents']);
    }

    private function authorizeRequest(): void
    {
        $this->configRequest([
            'headers' => [
                'Authorization' => 'Bearer ' . $this->token,
                'Accept' => 'application/json',
            ],
        ]);
    }

    /**
     * @return array{0:int,1:int}
     */
    private function createActivatedEpisode(string $principalDiagnosisCode = 'I50.32'): array
    {
        $this->authorizeRequest();
        $this->post('/api/v1/referrals/1/convert', []);
        $episode = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data'];
        $episodeId = $episode['id'];

        foreach (['consent', 'hipaa_acknowledgement', 'patient_rights', 'advance_directive', 'emergency_preparedness_ack'] as $documentType) {
            $this->authorizeRequest();
            $this->post('/api/v1/patients/1/compliance-documents/add', [
                'document_type' => $documentType,
                'document_status' => 'signed',
                'signed_at' => '2026-04-18 09:00:00',
                'source_name' => 'SOC admission packet',
            ]);
            $this->assertResponseCode(201);
        }

        $this->authorizeRequest();
        $this->post('/api/v1/patients/1/medications/add', [
            'episode_id' => $episodeId,
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

        $this->authorizeRequest();
        $this->post('/api/v1/assessments/add', [
            'episode_id' => $episodeId,
            'assessment_type' => 'soc',
            'completed_at' => '2026-04-19 09:30:00',
            'status' => 'final',
            'principal_diagnosis_code' => $principalDiagnosisCode,
            'functional_score' => 14,
            'comorbidity_level' => 'low',
            'medication_reconciliation_completed' => true,
            'homebound_status' => 'homebound',
            'homebound_narrative' => 'Patient requires taxing effort to leave home and only leaves for medical care.',
            'fall_risk_level' => 'moderate',
            'hospitalization_risk' => 'elevated',
            'emergency_preparedness_reviewed' => true,
            'care_plan_goals' => 'Improve symptom management and maintain safe mobility at home.',
            'clinical_summary' => 'SOC finalized with homebound, medication, and caregiver review.',
            'assessment_payload' => [
                'medication_review' => ['issues' => 'Reviewed Lasix timing and weight log.'],
                'wounds' => ['present' => false],
            ],
            'answers' => ['M0110' => '1'],
        ]);

        $this->authorizeRequest();
        $this->post('/api/v1/visits/add', [
            'episode_id' => $episodeId,
            'patient_id' => 1,
            'visit_type' => 'soc',
            'discipline' => 'SN',
            'scheduled_start' => '2026-04-19 09:00:00',
            'scheduled_end' => '2026-04-19 10:00:00',
            'clinician_name' => 'Nina Clinician',
            'requires_evv' => true,
            'status' => 'scheduled',
            'sync_status' => 'synced',
        ]);
        $socVisitId = json_decode((string)$this->_response->getBody(), true, 512, JSON_THROW_ON_ERROR)['data']['id'];

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $socVisitId . '/check-in', [
            'event_time' => '2026-04-19 09:02:00',
            'latitude' => 33.7867,
            'longitude' => -84.3837,
            'accuracy_meters' => 10,
            'device_metadata' => ['device' => 'iPad'],
        ]);

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $socVisitId . '/check-out', [
            'event_time' => '2026-04-19 09:58:00',
            'latitude' => 33.7867,
            'longitude' => -84.3837,
            'accuracy_meters' => 8,
            'documentation_summary' => 'Completed SOC visit, medication reconciliation, and safety check.',
            'device_metadata' => ['device' => 'iPad'],
        ]);

        $this->authorizeRequest();
        $this->post('/api/v1/episodes/' . $episodeId . '/activate', []);

        return [$episodeId, $socVisitId];
    }

    private function resolveAllOpenQaTasksForEpisode(int $episodeId): void
    {
        $taskIds = TableRegistry::getTableLocator()->get('QaTasks')->find()
            ->where(['episode_id' => $episodeId, 'status' => 'open'])
            ->all()
            ->extract('id')
            ->toList();

        foreach ($taskIds as $taskId) {
            $this->authorizeRequest();
            $this->post('/api/v1/qa/' . $taskId . '/resolve', []);
            $this->assertResponseOk();
        }
    }

    private function reviewAndLockVisitDocumentation(int $visitId): void
    {
        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $visitId . '/document', [
            'visit_focus' => 'Follow-up skilled assessment.',
            'visit_narrative' => 'Visit documentation completed and ready for QA review.',
            'interventions' => 'Care plan interventions captured.',
            'patient_response' => 'Patient understands follow-up needs.',
            'vitals' => 'BP 132/78 HR 74',
            'pain_level' => '0/10',
            'teaching_topics' => 'Medication and symptom escalation reviewed.',
            'medication_review' => 'Medication changes reconciled with spouse.',
            'wound_care' => 'No wound care needed.',
            'mobility_status' => 'Transfers safely with standby assist.',
            'adl_support' => 'Caregiver continues bathing assistance.',
            'psychosocial_notes' => 'No new psychosocial concerns reported.',
            'abnormal_findings' => 'None.',
            'follow_up_plan' => 'Continue ordered frequency.',
            'next_visit_focus' => 'Ongoing symptom surveillance and caregiver teaching.',
            'submit_for_qa' => true,
        ]);
        $this->assertResponseOk();

        $this->authorizeRequest();
        $this->post('/api/v1/visits/' . $visitId . '/lock-documentation', [
            'qa_review_notes' => 'Documentation locked for billing readiness.',
        ]);
        $this->assertResponseOk();
    }
}
