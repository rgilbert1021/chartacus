function AppCtrl($scope, $http, $routeParams, $location, $route) {
  $scope.$route = $route;
  $scope.$location = $location;
  $scope.$routeParams = $routeParams;

  console.log($scope.chartacus)

}