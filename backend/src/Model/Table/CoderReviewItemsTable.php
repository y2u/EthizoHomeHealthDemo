<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;
use Cake\Validation\Validator;

class CoderReviewItemsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('coder_review_items');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Episodes');
        $this->belongsTo('Claims');
        $this->belongsTo('Assessments');
    }

    public function validationDefault(Validator $validator): Validator
    {
        $validator
            ->integer('episode_id')->requirePresence('episode_id', 'create')->notEmptyString('episode_id')
            ->integer('claim_id')->allowEmptyString('claim_id')
            ->integer('assessment_id')->allowEmptyString('assessment_id')
            ->scalar('category')->requirePresence('category', 'create')->notEmptyString('category')
            ->scalar('status')->requirePresence('status', 'create')->notEmptyString('status')
            ->scalar('priority')->requirePresence('priority', 'create')->notEmptyString('priority')
            ->scalar('title')->requirePresence('title', 'create')->notEmptyString('title')
            ->scalar('details')->allowEmptyString('details')
            ->scalar('recommendation')->allowEmptyString('recommendation')
            ->scalar('correction_note')->allowEmptyString('correction_note')
            ->dateTime('resolved_at')->allowEmptyDateTime('resolved_at');

        return $validator;
    }
}
