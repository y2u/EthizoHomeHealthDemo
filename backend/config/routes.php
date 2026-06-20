<?php
/**
 * Routes configuration.
 *
 * In this file, you set up routes to your controllers and their actions.
 * Routes are very important mechanism that allows you to freely connect
 * different URLs to chosen controllers and their actions (functions).
 *
 * It's loaded within the context of `Application::routes()` method which
 * receives a `RouteBuilder` instance `$routes` as method argument.
 *
 * CakePHP(tm) : Rapid Development Framework (https://cakephp.org)
 * Copyright (c) Cake Software Foundation, Inc. (https://cakefoundation.org)
 *
 * Licensed under The MIT License
 * For full copyright and license information, please see the LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright     Copyright (c) Cake Software Foundation, Inc. (https://cakefoundation.org)
 * @link          https://cakephp.org CakePHP(tm) Project
 * @license       https://opensource.org/licenses/mit-license.php MIT License
 */

use Cake\Routing\Route\DashedRoute;
use Cake\Routing\RouteBuilder;

/*
 * This file is loaded in the context of the `Application` class.
 * So you can use `$this` to reference the application class instance
 * if required.
 */
return function (RouteBuilder $routes): void {
    /*
     * The default class to use for all routes
     *
     * The following route classes are supplied with CakePHP and are appropriate
     * to set as the default:
     *
     * - Route
     * - InflectedRoute
     * - DashedRoute
     *
     * If no call is made to `Router::defaultRouteClass()`, the class used is
     * `Route` (`Cake\Routing\Route\Route`)
     *
     * Note that `Route` does not do any inflections on URLs which will result in
     * inconsistently cased URLs when used with `{plugin}`, `{controller}` and
     * `{action}` markers.
     */
    $routes->setRouteClass(DashedRoute::class);

    $routes->prefix('Api', function (RouteBuilder $routes): void {
        $routes->prefix('V1', ['path' => '/v1'], function (RouteBuilder $builder): void {
            $builder->setExtensions(['json']);

            $builder->get('/', ['controller' => 'Dashboard', 'action' => 'index']);
            $builder->post('/auth/login', ['controller' => 'Auth', 'action' => 'login']);
            $builder->get('/auth/demo', ['controller' => 'Auth', 'action' => 'demo']);
            $builder->get('/auth/me', ['controller' => 'Auth', 'action' => 'me']);
            $builder->get('/dashboard', ['controller' => 'Dashboard', 'action' => 'index']);
            $builder->get('/admin/settings', ['controller' => 'AdminSettings', 'action' => 'view']);
            $builder->post('/admin/settings', ['controller' => 'AdminSettings', 'action' => 'update']);
            $builder->get('/admin/users', ['controller' => 'AdminUsers', 'action' => 'index']);
            $builder->post('/admin/users/add', ['controller' => 'AdminUsers', 'action' => 'add']);
            $builder->post('/admin/users/{id}/update', ['controller' => 'AdminUsers', 'action' => 'update'])->setPass(['id']);
            $builder->get('/admin/session-activity', ['controller' => 'AdminUsers', 'action' => 'sessionActivity']);
            $builder->get('/audit-events', ['controller' => 'AuditEvents', 'action' => 'index']);

            $builder->get('/patients', ['controller' => 'Patients', 'action' => 'index']);
            $builder->get('/patients/{id}', ['controller' => 'Patients', 'action' => 'view'])->setPass(['id']);
            $builder->post('/patients/add', ['controller' => 'Patients', 'action' => 'add']);
            $builder->post('/patients/{id}/update', ['controller' => 'Patients', 'action' => 'update'])->setPass(['id']);
            $builder->get('/patients/{id}/compliance-documents', ['controller' => 'PatientCompliance', 'action' => 'documents'])->setPass(['id']);
            $builder->post('/patients/{id}/compliance-documents/add', ['controller' => 'PatientCompliance', 'action' => 'addDocument'])->setPass(['id']);
            $builder->get('/patients/{id}/notices', ['controller' => 'PatientCompliance', 'action' => 'notices'])->setPass(['id']);
            $builder->post('/patients/{id}/notices/add', ['controller' => 'PatientCompliance', 'action' => 'addNotice'])->setPass(['id']);
            $builder->get('/patients/{id}/medications', ['controller' => 'PatientCompliance', 'action' => 'medications'])->setPass(['id']);
            $builder->post('/patients/{id}/medications/add', ['controller' => 'PatientCompliance', 'action' => 'addMedication'])->setPass(['id']);
            $builder->get('/patients/{id}/allergies', ['controller' => 'PatientCompliance', 'action' => 'allergies'])->setPass(['id']);
            $builder->post('/patients/{id}/allergies/add', ['controller' => 'PatientCompliance', 'action' => 'addAllergy'])->setPass(['id']);

            $builder->get('/referrals', ['controller' => 'Referrals', 'action' => 'index']);
            $builder->post('/referrals/add', ['controller' => 'Referrals', 'action' => 'add']);
            $builder->post('/referrals/{id}/update', ['controller' => 'Referrals', 'action' => 'update'])->setPass(['id']);
            $builder->post('/referrals/{id}/intake-docs', ['controller' => 'Referrals', 'action' => 'updateIntakeDocs'])->setPass(['id']);
            $builder->post('/referrals/{id}/documents/add', ['controller' => 'Referrals', 'action' => 'addDocument'])->setPass(['id']);
            $builder->post('/referrals/{id}/convert', ['controller' => 'Referrals', 'action' => 'convert'])->setPass(['id']);

            $builder->get('/referral-documents', ['controller' => 'ReferralDocuments', 'action' => 'index']);
            $builder->post('/referral-documents/{id}/update', ['controller' => 'ReferralDocuments', 'action' => 'update'])->setPass(['id']);
            $builder->post('/referral-documents/{id}/attachment', ['controller' => 'ReferralDocuments', 'action' => 'uploadAttachment'])->setPass(['id']);
            $builder->get('/referral-documents/{id}/download', ['controller' => 'ReferralDocuments', 'action' => 'download'])->setPass(['id']);

            $builder->get('/episodes', ['controller' => 'Episodes', 'action' => 'index']);
            $builder->get('/episodes/{id}', ['controller' => 'Episodes', 'action' => 'view'])->setPass(['id']);
            $builder->get('/episodes/{id}/readiness', ['controller' => 'Episodes', 'action' => 'readiness'])->setPass(['id']);
            $builder->get('/episodes/{id}/review-summary', ['controller' => 'Episodes', 'action' => 'reviewSummary'])->setPass(['id']);
            $builder->get('/episodes/{id}/insights', ['controller' => 'Episodes', 'action' => 'insights'])->setPass(['id']);
            $builder->get('/episodes/{id}/orders/draft', ['controller' => 'Episodes', 'action' => 'orderDraft'])->setPass(['id']);
            $builder->post('/episodes/{id}/admission/update', ['controller' => 'Episodes', 'action' => 'updateAdmission'])->setPass(['id']);
            $builder->post('/episodes/{id}/orders/add', ['controller' => 'Episodes', 'action' => 'addOrder'])->setPass(['id']);
            $builder->post('/episodes/{id}/oasis-submissions/prepare', ['controller' => 'OasisSubmissions', 'action' => 'prepare'])->setPass(['id']);
            $builder->post('/episodes/{id}/plan-of-care/generate', ['controller' => 'PlanOfCare', 'action' => 'generate'])->setPass(['id']);
            $builder->post('/episodes/{id}/coder-review/sync', ['controller' => 'CoderReview', 'action' => 'sync'])->setPass(['id']);
            $builder->post('/episodes/{id}/communication-log/add', ['controller' => 'CommunicationLog', 'action' => 'add'])->setPass(['id']);
            $builder->get('/episodes/{id}/verbal-orders', ['controller' => 'EpisodeCompliance', 'action' => 'verbalOrders'])->setPass(['id']);
            $builder->post('/episodes/{id}/verbal-orders/add', ['controller' => 'EpisodeCompliance', 'action' => 'addVerbalOrder'])->setPass(['id']);
            $builder->get('/episodes/{id}/aide-supervision', ['controller' => 'EpisodeCompliance', 'action' => 'aideSupervision'])->setPass(['id']);
            $builder->post('/episodes/{id}/aide-supervision/add', ['controller' => 'EpisodeCompliance', 'action' => 'addAideSupervision'])->setPass(['id']);
            $builder->get('/episodes/{id}/incidents', ['controller' => 'EpisodeCompliance', 'action' => 'incidents'])->setPass(['id']);
            $builder->post('/episodes/{id}/incidents/add', ['controller' => 'EpisodeCompliance', 'action' => 'addIncident'])->setPass(['id']);
            $builder->get('/episodes/{id}/infections', ['controller' => 'EpisodeCompliance', 'action' => 'infections'])->setPass(['id']);
            $builder->post('/episodes/{id}/infections/add', ['controller' => 'EpisodeCompliance', 'action' => 'addInfection'])->setPass(['id']);
            $builder->get('/episodes/{id}/authorizations', ['controller' => 'EpisodeCompliance', 'action' => 'authorizations'])->setPass(['id']);
            $builder->post('/episodes/{id}/authorizations/add', ['controller' => 'EpisodeCompliance', 'action' => 'addAuthorization'])->setPass(['id']);
            $builder->get('/episodes/{id}/eligibility-checks', ['controller' => 'EpisodeCompliance', 'action' => 'eligibilityChecks'])->setPass(['id']);
            $builder->post('/episodes/{id}/eligibility-checks/add', ['controller' => 'EpisodeCompliance', 'action' => 'addEligibilityCheck'])->setPass(['id']);
            $builder->get('/episodes/{id}/dme-supply-orders', ['controller' => 'EpisodeCompliance', 'action' => 'dmeSupplyOrders'])->setPass(['id']);
            $builder->post('/episodes/{id}/dme-supply-orders/add', ['controller' => 'EpisodeCompliance', 'action' => 'addDmeSupplyOrder'])->setPass(['id']);
            $builder->get('/episodes/{id}/case-conferences', ['controller' => 'EpisodeCompliance', 'action' => 'caseConferences'])->setPass(['id']);
            $builder->post('/episodes/{id}/case-conferences/add', ['controller' => 'EpisodeCompliance', 'action' => 'addCaseConference'])->setPass(['id']);
            $builder->post('/episodes/{id}/activate', ['controller' => 'Episodes', 'action' => 'activate'])->setPass(['id']);
            $builder->post('/episodes/{id}/transition', ['controller' => 'Episodes', 'action' => 'transition'])->setPass(['id']);

            $builder->get('/physician-orders', ['controller' => 'PhysicianOrders', 'action' => 'index']);
            $builder->post('/physician-orders/{id}/update', ['controller' => 'PhysicianOrders', 'action' => 'update'])->setPass(['id']);

            $builder->get('/assessments', ['controller' => 'Assessments', 'action' => 'index']);
            $builder->post('/assessments/add', ['controller' => 'Assessments', 'action' => 'add']);
            $builder->post('/assessments/{id}/update', ['controller' => 'Assessments', 'action' => 'update'])->setPass(['id']);

            $builder->get('/visits', ['controller' => 'Visits', 'action' => 'index']);
            $builder->post('/visits/add', ['controller' => 'Visits', 'action' => 'add']);
            $builder->post('/visits/{id}/document', ['controller' => 'Visits', 'action' => 'document'])->setPass(['id']);
            $builder->post('/visits/{id}/lock-documentation', ['controller' => 'Visits', 'action' => 'lockDocumentation'])->setPass(['id']);
            $builder->post('/visits/{id}/reassign', ['controller' => 'Visits', 'action' => 'reassign'])->setPass(['id']);
            $builder->post('/visits/{id}/reschedule', ['controller' => 'Visits', 'action' => 'reschedule'])->setPass(['id']);
            $builder->post('/visits/{id}/mark-missed', ['controller' => 'Visits', 'action' => 'markMissed'])->setPass(['id']);
            $builder->post('/visits/{id}/check-in', ['controller' => 'Visits', 'action' => 'checkIn'])->setPass(['id']);
            $builder->post('/visits/{id}/check-out', ['controller' => 'Visits', 'action' => 'checkOut'])->setPass(['id']);

            $builder->get('/evv', ['controller' => 'Evv', 'action' => 'index']);
            $builder->post('/evv/{id}/submit', ['controller' => 'Evv', 'action' => 'submit'])->setPass(['id']);
            $builder->post('/evv/{id}/mark-exception', ['controller' => 'Evv', 'action' => 'markException'])->setPass(['id']);
            $builder->post('/evv/{id}/reconcile', ['controller' => 'Evv', 'action' => 'reconcile'])->setPass(['id']);

            $builder->get('/claims', ['controller' => 'Claims', 'action' => 'index']);
            $builder->post('/claims/{id}/submit', ['controller' => 'Claims', 'action' => 'submit'])->setPass(['id']);
            $builder->post('/claims/{id}/accept', ['controller' => 'Claims', 'action' => 'accept'])->setPass(['id']);
            $builder->post('/claims/{id}/reject', ['controller' => 'Claims', 'action' => 'reject'])->setPass(['id']);
            $builder->post('/claims/{id}/post-payment', ['controller' => 'Claims', 'action' => 'postPayment'])->setPass(['id']);
            $builder->post('/claims/{id}/void', ['controller' => 'Claims', 'action' => 'void'])->setPass(['id']);
            $builder->post('/claims/{id}/resubmit-corrected', ['controller' => 'Claims', 'action' => 'resubmitCorrected'])->setPass(['id']);
            $builder->get('/billing/claim-transactions', ['controller' => 'BillingCompliance', 'action' => 'claimTransactions']);
            $builder->post('/billing/claim-transactions/add', ['controller' => 'BillingCompliance', 'action' => 'addClaimTransaction']);
            $builder->get('/billing/remittance-postings', ['controller' => 'BillingCompliance', 'action' => 'remittancePostings']);
            $builder->post('/billing/remittance-postings/add', ['controller' => 'BillingCompliance', 'action' => 'addRemittancePosting']);

            $builder->get('/qa', ['controller' => 'Qa', 'action' => 'index']);
            $builder->post('/qa/{id}/assign', ['controller' => 'Qa', 'action' => 'assign'])->setPass(['id']);
            $builder->post('/qa/{id}/escalate', ['controller' => 'Qa', 'action' => 'escalate'])->setPass(['id']);
            $builder->post('/qa/{id}/resolve', ['controller' => 'Qa', 'action' => 'resolve'])->setPass(['id']);

            $builder->get('/oasis-submissions', ['controller' => 'OasisSubmissions', 'action' => 'index']);
            $builder->post('/oasis-submissions/{id}/update', ['controller' => 'OasisSubmissions', 'action' => 'update'])->setPass(['id']);

            $builder->get('/plan-of-care', ['controller' => 'PlanOfCare', 'action' => 'index']);
            $builder->post('/plan-of-care/{id}/update', ['controller' => 'PlanOfCare', 'action' => 'update'])->setPass(['id']);

            $builder->get('/coder-review', ['controller' => 'CoderReview', 'action' => 'index']);
            $builder->post('/coder-review/{id}/update', ['controller' => 'CoderReview', 'action' => 'update'])->setPass(['id']);

            $builder->get('/communication-log', ['controller' => 'CommunicationLog', 'action' => 'index']);
            $builder->post('/communication-log/{id}/update', ['controller' => 'CommunicationLog', 'action' => 'update'])->setPass(['id']);

            $builder->get('/fax-inbox', ['controller' => 'FaxInbox', 'action' => 'index']);
            $builder->post('/fax-inbox/add', ['controller' => 'FaxInbox', 'action' => 'add']);
            $builder->post('/fax-inbox/{id}/route', ['controller' => 'FaxInbox', 'action' => 'route'])->setPass(['id']);

            $builder->get('/qapi-projects', ['controller' => 'QapiProjects', 'action' => 'index']);
            $builder->post('/qapi-projects/add', ['controller' => 'QapiProjects', 'action' => 'add']);
            $builder->post('/qapi-projects/{id}/update', ['controller' => 'QapiProjects', 'action' => 'update'])->setPass(['id']);

            $builder->get('/quality-metrics', ['controller' => 'QualityMetrics', 'action' => 'index']);
            $builder->post('/quality-metrics/capture', ['controller' => 'QualityMetrics', 'action' => 'capture']);
            $builder->get('/admin/survey-readiness', ['controller' => 'SurveyReadiness', 'action' => 'index']);
            $builder->post('/admin/survey-readiness/capture', ['controller' => 'SurveyReadiness', 'action' => 'capture']);
        });
    });

    $routes->scope('/', function (RouteBuilder $builder): void {
        /*
         * Here, we are connecting '/' (base path) to a controller called 'Pages',
         * its action called 'display', and we pass a param to select the view file
         * to use (in this case, templates/Pages/home.php)...
         */
        $builder->connect('/', ['controller' => 'Pages', 'action' => 'display', 'home']);

        /*
         * ...and connect the rest of 'Pages' controller's URLs.
         */
        $builder->connect('/pages/*', 'Pages::display');

    });

    /*
     * If you need a different set of middleware or none at all,
     * open new scope and define routes there.
     *
     * ```
     * $routes->scope('/api', function (RouteBuilder $builder): void {
     *     // No $builder->applyMiddleware() here.
     *
     *     // Parse specified extensions from URLs
     *     // $builder->setExtensions(['json', 'xml']);
     *
     *     // Connect API actions here.
     * });
     * ```
     */
};
