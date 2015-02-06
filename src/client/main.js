(function() {
'use strict';

angular.module('main',
               ['ngRoute'])

// .config(['$routeProvider', '$locationProvider',
// function($routeProvider, $locationProvider) {
.config(function ($routeProvider, $locationProvider) {

  // $locationProvider.html5Mode(true);

  $routeProvider
    .otherwise({redirectTo: '/home'})
    .when('/home', {
      templateUrl: 'main.html',
      controller: 'MainCtrl',
      controllerAs: 'self'
    })
    .when('/about', {
      templateUrl: 'about.html',
      controller: 'AboutCtrl',
      controllerAs: 'self'
    });

})
// }])

// run([
// function () {
.run(function () {

// }]);
});

angular.module('main')
.controller('MainCtrl', ['backend',
function(backend) {
  this.message = 'Hello, Main!';
  var self = this;
  backend.fooBar()
    .then(function (data) {
      self.data = JSON.stringify(data, null, 2);
    });
}]);


angular.module('main')
.controller('AboutCtrl', [
function() {
  this.message = 'Not much!';
}]);

angular.module('main')
//.factory('backend', ['$http',
// function ($http) {
.factory('backend', function ($http) {
  return {fooBar: fooBar};
  function fooBar() {
    return $http.patch('/api/foo/bar');
  }
});
// }]);
})();
