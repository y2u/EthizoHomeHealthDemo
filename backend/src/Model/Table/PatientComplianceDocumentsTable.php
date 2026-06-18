<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class PatientComplianceDocumentsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('patient_compliance_documents');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Patients');
    }
}
