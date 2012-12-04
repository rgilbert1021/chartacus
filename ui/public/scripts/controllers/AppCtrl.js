function AppCtrl($scope, $http, $routeParams, $location, $route) {
  $scope.data = [];
  socket.on('data', function(data){
    console.log(data);
    $scope.$apply($scope.count = data.count);
    $scope.$apply($scope.lastValue = data.value);
    $scope.data.push(data.value);
    var counter = 0;
    if(!$scope.firstTimestamp){
      $scope.firstTimestamp = data.timestamp;
      setInterval(function(){
        $scope.$apply($scope.pps = ($scope.data.length/(+new Date() - $scope.firstTimestamp))*1000);
      },1000);
    }

  });

}
AppCtrl.$inject = ['$scope', '$http', '$routeParams', '$location', '$route'];