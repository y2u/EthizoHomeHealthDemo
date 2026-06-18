<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;
use Cake\Validation\Validator;

class PlanOfCaresTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('plan_of_cares');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Episodes');
        $this->belongsTo('Assessments');
        $this->belongsTo('PhysicianOrders');
    }

    public function validationDefault(Validator $validator): Validator
    {
        $validator
            ->integer('episode_id')->requirePresence('episode_id', 'create')->notEmptyString('episode_id')
            ->integer('assessment_id')->allowEmptyString('assessment_id')
            ->integer('physician_order_id')->allowEmptyString('physician_order_id')
            ->integer('version_number')->requirePresence('version_number', 'create')->notEmptyString('version_number')
            ->scalar('review_status')->requirePresence('review_status', 'create')->notEmptyString('review_status')
            ->date('effective_date')->allowEmptyDate('effective_date')
            ->scalar('plan_summary')->allowEmptyString('plan_summary')
            ->scalar('goal_summary')->allowEmptyString('goal_summary')
            ->scalar('intervention_summary')->allowEmptyString('intervention_summary')
            ->scalar('printable_content')->allowEmptyString('printable_content')
            ->scalar('physician_review_note')->allowEmptyString('physician_review_note')
            ->dateTime('approved_at')->allowEmptyDateTime('approved_at');

        return $validator;
    }
}
