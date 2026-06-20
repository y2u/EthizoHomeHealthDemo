<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;
use Cake\Validation\Validator;

class FaxMessagesTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('fax_messages');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Referrals');
    }

    public function validationDefault(Validator $validator): Validator
    {
        $validator
            ->integer('referral_id')->allowEmptyString('referral_id')
            ->scalar('source_name')->requirePresence('source_name', 'create')->notEmptyString('source_name')
            ->scalar('from_number')->allowEmptyString('from_number')
            ->scalar('subject')->allowEmptyString('subject')
            ->scalar('packet_type')->requirePresence('packet_type', 'create')->notEmptyString('packet_type')
            ->scalar('routing_status')->requirePresence('routing_status', 'create')->notEmptyString('routing_status')
            ->dateTime('received_at')->requirePresence('received_at', 'create')->notEmptyDateTime('received_at')
            ->scalar('attachment_note')->allowEmptyString('attachment_note')
            ->integer('linked_document_count')->allowEmptyString('linked_document_count')
            ->scalar('route_note')->allowEmptyString('route_note');

        return $validator;
    }
}
