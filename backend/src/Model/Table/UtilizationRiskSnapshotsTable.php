<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;
use Cake\Validation\Validator;

class UtilizationRiskSnapshotsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('utilization_risk_snapshots');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Episodes');
    }

    public function validationDefault(Validator $validator): Validator
    {
        $validator
            ->integer('episode_id')->requirePresence('episode_id', 'create')->notEmptyString('episode_id')
            ->integer('period_number')->requirePresence('period_number', 'create')->notEmptyString('period_number')
            ->integer('projected_visits')->requirePresence('projected_visits', 'create')->notEmptyString('projected_visits')
            ->integer('threshold_visits')->requirePresence('threshold_visits', 'create')->notEmptyString('threshold_visits')
            ->scalar('risk_level')->requirePresence('risk_level', 'create')->notEmptyString('risk_level')
            ->scalar('warning_note')->allowEmptyString('warning_note')
            ->scalar('recommended_action')->allowEmptyString('recommended_action');

        return $validator;
    }
}
