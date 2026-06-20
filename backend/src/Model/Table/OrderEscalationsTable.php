<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class OrderEscalationsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('order_escalations');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Episodes');
        $this->belongsTo('PhysicianOrders');
        $this->belongsTo('VerbalOrders');
    }
}
