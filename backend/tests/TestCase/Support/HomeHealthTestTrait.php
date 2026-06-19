<?php
declare(strict_types=1);

namespace App\Test\TestCase\Support;

use Cake\TestSuite\IntegrationTestTrait;

trait HomeHealthTestTrait
{
    use IntegrationTestTrait;

    protected function loginApiUser(): void
    {
        $this->configRequest([
            'headers' => [
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer demo-token',
            ],
        ]);
    }
}
