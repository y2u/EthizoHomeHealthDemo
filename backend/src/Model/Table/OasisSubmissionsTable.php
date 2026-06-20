<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;
use Cake\Validation\Validator;

class OasisSubmissionsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('oasis_submissions');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Episodes');
        $this->belongsTo('Assessments');
    }

    public function validationDefault(Validator $validator): Validator
    {
        $validator
            ->integer('episode_id')->requirePresence('episode_id', 'create')->notEmptyString('episode_id')
            ->integer('assessment_id')->allowEmptyString('assessment_id')
            ->scalar('submission_status')->requirePresence('submission_status', 'create')->notEmptyString('submission_status')
            ->boolean('iqies_ready')
            ->scalar('export_payload')->allowEmptyString('export_payload')
            ->scalar('readiness_notes')->allowEmptyString('readiness_notes')
            ->scalar('submission_reference')->allowEmptyString('submission_reference')
            ->dateTime('submitted_at')->allowEmptyDateTime('submitted_at')
            ->dateTime('acknowledged_at')->allowEmptyDateTime('acknowledged_at')
            ->scalar('acknowledgment_status')->allowEmptyString('acknowledgment_status')
            ->scalar('acknowledgment_note')->allowEmptyString('acknowledgment_note')
            ->scalar('rejection_note')->allowEmptyString('rejection_note');

        return $validator;
    }
}
