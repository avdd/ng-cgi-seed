// http://karma-runner.github.io/0.12/config/configuration-file.html

module.exports = function(config) {
  'use strict';

  function prefixed(prefix, items) {
    return items.map(function (s) {
      return prefix + '/' + s;
    });
  }

  var manifest = require('./manifest.json');

  var files = prefixed(manifest.config.vendor_src,
                       manifest.vendor.js)
              .concat(prefixed(manifest.config.client_src,
                               manifest.watch.js))
              .concat(manifest.tests.client)

  config.set({
    // re-run tests when file changes
    // autoWatch: true,

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: true,

    // path to resolve files and exclude
    // basePath: '../',

    frameworks: ['jasmine'],
    // reporters: ['minimalist'],

    files: files,

    exclude: [],

    port: 8999,

    browsers: [
      'PhantomJS'
      // Chrome
      // ChromeCanary
      // Firefox
      // Opera
      // PhantomJS
    ],

    // Which plugins to enable
    plugins: [
      'karma-jasmine',
      'karma-phantomjs-launcher',
      // 'karma-mocha-reporter',
      // 'karma-minimalist-reporter',
    ],

    colors: true,

    // level of logging
    // LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,

  });
};

