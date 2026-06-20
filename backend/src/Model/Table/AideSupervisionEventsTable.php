<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class AideSupervisionEventsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('aide_supervision_events');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Episodes');
        $this->belongsTo('Visits');
    }
}
