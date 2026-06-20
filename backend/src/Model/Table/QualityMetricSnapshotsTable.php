<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;
use Cake\Validation\Validator;

class QualityMetricSnapshotsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('quality_metric_snapshots');
        $this->addBehavior('Timestamp');
    }

    public function validationDefault(Validator $validator): Validator
    {
        $validator
            ->scalar('metric_key')->requirePresence('metric_key', 'create')->notEmptyString('metric_key')
            ->scalar('metric_label')->requirePresence('metric_label', 'create')->notEmptyString('metric_label')
            ->scalar('period_key')->requirePresence('period_key', 'create')->notEmptyString('period_key')
            ->numeric('score')->requirePresence('score', 'create')->notEmptyString('score')
            ->integer('numerator')->requirePresence('numerator', 'create')->notEmptyString('numerator')
            ->integer('denominator')->requirePresence('denominator', 'create')->notEmptyString('denominator')
            ->numeric('trend_value')->allowEmptyString('trend_value')
            ->scalar('notes')->allowEmptyString('notes')
            ->dateTime('captured_at')->requirePresence('captured_at', 'create')->notEmptyDateTime('captured_at');

        return $validator;
    }
}
