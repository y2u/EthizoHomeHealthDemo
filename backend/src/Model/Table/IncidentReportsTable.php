<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class IncidentReportsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('incident_reports');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Patients');
        $this->belongsTo('Episodes');
        $this->belongsTo('Visits');
    }
}
