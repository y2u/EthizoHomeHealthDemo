<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class PayerAuthorizationsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('payer_authorizations');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Patients');
        $this->belongsTo('Episodes');
    }
}
