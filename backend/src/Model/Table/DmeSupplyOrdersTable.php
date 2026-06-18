<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class DmeSupplyOrdersTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('dme_supply_orders');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Patients');
        $this->belongsTo('Episodes');
    }
}
