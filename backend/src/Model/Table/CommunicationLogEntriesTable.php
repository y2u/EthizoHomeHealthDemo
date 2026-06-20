<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;
use Cake\Validation\Validator;

class CommunicationLogEntriesTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('communication_log_entries');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Episodes');
        $this->belongsTo('Visits');
    }

    public function validationDefault(Validator $validator): Validator
    {
        $validator
            ->integer('episode_id')->requirePresence('episode_id', 'create')->notEmptyString('episode_id')
            ->integer('visit_id')->allowEmptyString('visit_id')
            ->scalar('entry_type')->requirePresence('entry_type', 'create')->notEmptyString('entry_type')
            ->scalar('contact_name')->requirePresence('contact_name', 'create')->notEmptyString('contact_name')
            ->scalar('contact_role')->allowEmptyString('contact_role')
            ->scalar('method')->requirePresence('method', 'create')->notEmptyString('method')
            ->scalar('topic')->requirePresence('topic', 'create')->notEmptyString('topic')
            ->scalar('outcome')->allowEmptyString('outcome')
            ->scalar('follow_up_owner')->allowEmptyString('follow_up_owner')
            ->dateTime('follow_up_due_at')->allowEmptyDateTime('follow_up_due_at')
            ->scalar('status')->requirePresence('status', 'create')->notEmptyString('status');

        return $validator;
    }
}
