<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class CaseConferencesTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('case_conferences');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Episodes');
    }
}
