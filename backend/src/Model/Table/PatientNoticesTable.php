<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class PatientNoticesTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('patient_notices');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Patients');
        $this->belongsTo('Episodes');
    }
}
