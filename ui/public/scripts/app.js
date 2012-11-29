'use strict';

// Declare app level module which depends on filters, and services
// angular.module('chartacus', ['chartacus.filters', 'chartacus.services', 'chartacus.directives', 'chartacus.components']).
angular.module('chartacus', [])
  .config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.when('/', {
            templateUrl: '/partials/dashboard',
            controller: AppCtrl
    });
    $routeProvider.otherwise({
                redirectTo: '/'
        });
  }])

  .run(['$rootScope', function($rootScope) {
    $rootScope.chartacus = window.chartacus;
  }]);