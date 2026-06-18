<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class EligibilityChecksTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('eligibility_checks');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Patients');
        $this->belongsTo('Episodes');
    }
}
