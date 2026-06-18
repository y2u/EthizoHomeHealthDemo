<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class ClaimTransactionsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('claim_transactions');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Claims');
    }
}
