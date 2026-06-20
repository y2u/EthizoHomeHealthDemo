<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class VerbalOrdersTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('verbal_orders');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Episodes');
        $this->belongsTo('PhysicianOrders');
    }
}
