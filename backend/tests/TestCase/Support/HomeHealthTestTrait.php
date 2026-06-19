<?php
declare(strict_types=1);

namespace App\Test\TestCase\Support;

use App\Service\TokenService;
use Cake\TestSuite\IntegrationTestTrait;
use Cake\Utility\Security;

trait HomeHealthTestTrait
{
    use IntegrationTestTrait;

    protected function loginApiUser(): void
    {
        $token = (new TokenService(Security::getSalt()))->issue([
            'id' => 1,
            'email' => 'admin@example.test',
            'role' => 'Administrator',
            'full_name' => 'Admin Test',
        ]);

        $this->configRequest([
            'headers' => [
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $token,
            ],
        ]);
    }
}
