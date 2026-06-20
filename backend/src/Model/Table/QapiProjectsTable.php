<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;
use Cake\Validation\Validator;

class QapiProjectsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('qapi_projects');
        $this->addBehavior('Timestamp');
    }

    public function validationDefault(Validator $validator): Validator
    {
        $validator
            ->scalar('title')->requirePresence('title', 'create')->notEmptyString('title')
            ->scalar('measure_name')->requirePresence('measure_name', 'create')->notEmptyString('measure_name')
            ->scalar('owner_name')->requirePresence('owner_name', 'create')->notEmptyString('owner_name')
            ->scalar('review_cadence')->requirePresence('review_cadence', 'create')->notEmptyString('review_cadence')
            ->scalar('status')->requirePresence('status', 'create')->notEmptyString('status')
            ->scalar('target_value')->allowEmptyString('target_value')
            ->scalar('current_value')->allowEmptyString('current_value')
            ->scalar('intervention_plan')->allowEmptyString('intervention_plan')
            ->scalar('evidence_summary')->allowEmptyString('evidence_summary')
            ->scalar('linked_task_ids')->allowEmptyString('linked_task_ids')
            ->scalar('linked_audit_event_ids')->allowEmptyString('linked_audit_event_ids')
            ->dateTime('last_reviewed_at')->allowEmptyDateTime('last_reviewed_at');

        return $validator;
    }
}
