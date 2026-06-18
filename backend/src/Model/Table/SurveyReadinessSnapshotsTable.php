<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class SurveyReadinessSnapshotsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('survey_readiness_snapshots');
        $this->addBehavior('Timestamp');
    }
}
