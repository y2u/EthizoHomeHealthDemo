<?php
declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;

class RemittancePostingsTable extends Table
{
    public function initialize(array $config): void
    {
        parent::initialize($config);

        $this->setTable('remittance_postings');
        $this->addBehavior('Timestamp');
        $this->belongsTo('Claims');
    }
}
