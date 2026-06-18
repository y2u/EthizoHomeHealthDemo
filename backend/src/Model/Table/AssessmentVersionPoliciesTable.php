<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class AssessmentVersionPoliciesTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('assessment_version_policies');
        $this->addBehavior('Timestamp');
    }
}
