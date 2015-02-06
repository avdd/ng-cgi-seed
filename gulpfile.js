/* jshint node: true, laxcomma: true */
'use strict';

function loadJson(fn) {
  var read = require('fs').readFileSync
    , opts = {encoding: 'utf-8'};
  return JSON.parse(read(fn, opts));
}

var _start_config

  , pkg = loadJson('package.json')
  , run = '.run/' + pkg.name
  , tmp_dir   = run + '/tmp'
  , dist_dir  = run + '/dist'
  , build_dir = run + '/build'
  , py_env    = '.cache/python'

  , bower_json    = './bower.json'
  , manifest_json = './manifest.json'
  , manifest = loadJson(manifest_json)

  , api_root  = '/api'
  , vendor_root = '/bower_components'
  , vendor_src  = manifest.config.vendor_src
  , karma_conf  = 'karma.conf.js'
  // , protractor_conf = 'protractor.conf.js'

  , client_src      = manifest.config.client_src
  , server_src      = manifest.config.server_src
  , python_cgi      = server_src + '/main.py'
  , favicon         = client_src + '/favicon.ico'

  , clean_paths = [build_dir, dist_dir]

  , httpPort = 8088
  , testHttpPort = 8089
  , reloadPort = 35729
  , logger_name = 'dev'

  , gulp = require('gulp')
  , task = gulp.task.bind(gulp)
  , watch = gulp.watch.bind(gulp)
  , $ = require('gulp-load-plugins')()
  // , log = $.util.log
  , log = console.log
  , colors = $.util.colors
  , serverInstance = null
  , _;


// entry point aliases

task('default', ['interactive']);
task('build', ['build-basic']);
task('serve', ['serve-devel']);
task('clean', ['clean-basic']);
task('test',  ['test-api-then-client']);
task('test-system', ['test-system-standalone']);
task('manifest', ['update-manifest']);


// task definitions

task('interactive', ['serve-devel'], interactiveTask);

task('test-api', apiTestTask);
task('test-api-watch', apiTestWatchTask);
task('test-client', clientTestTask);
task('test-client-watch', clientTestWatchTask);
task('test-api-then-client', ['test-api'], clientTestTask);
task('test-client-then-api', ['test-client'], apiTestTask);

task('test-system-noserver', ['-update-webdriver'], systemTestTask);
task('test-system-standalone', ['-test-system-server'], closeServer);
task('-test-system-server',
     ['serve-test', '-update-webdriver'],
     systemTestTask);

task('test-all-async',
     ['test-api', 'test-client', 'test-system-standalone']);

task('build-basic', [], buildHtml);
task('build-html', buildHtml);
task('serve-devel', ['build-basic'], serverTask);
task('serve-test', ['build-basic'], testServerTask);
task('clean-basic', cleanTask);
task('update-manifest', updateManifestTask);


// utilitity tasks
task('-update-webdriver', $.protractor.webdriver_update);



// implementations

var python_exe = py_env + '/bin/python';
var pytest_exe = py_env + '/bin/py.test';


function passfail(passed) {
  $.util.log(passed
             ? colors.bgGreen('PASS')
             : colors.bgRed('FAIL'));
}

function prefixed(prefix, items) {
  return items.map(function (s) {
    return prefix + '/' + s;
  });
}

function apiTestTask(done) {
  runApiTests(done);
}

function apiTestWatchTask(done) {
  var watches = prefixed(server_src, manifest.app.py)
                .concat(manifest.tests.api)
  function done(e) {
    if (e && e.stack)
      console.log(e.stack);
  }
  runApiTests(done);
  watch(watches, function (event) {
    logChange(event);
    runApiTests(done);
  });
  watchManifest(function () {
    runApiTests(done);
  });
  // watchGulpfile('test-api-watch');
  done();
}

function runApiTests(done) {

  function callback(e, stdo, stde) {
    if (stdo)
      console.log(stdo);
    passfail(!e)
    if (e)
      done({stack: stde ? 'stderr:\n' + stde : ''})
    else
      done()
  }

  var exec = require('child_process').exec
    , color = colors.supportsColor
    , cmd = [
          pytest_exe,
          color ? ' --color=yes ' : '',
          manifest.tests.api.join(' ')
        ].join(' ');

  exec(cmd, callback);
}

function clientTestWatchTask(done) {
  var config = {
    singleRun: false,
    autoWatch: true
  };
  startKarma(config, function(e) {
    done();
  });
}

function clientTestTask(done) {
  var config = {
    singleRun: true,
    autoWatch: false
  };
  startKarma(config, function(e) {
    passfail(!e);
    done();
  });
}

function startKarma(config, done) {
  config.configFile = require('path').resolve(karma_conf);
  require('karma').server.start(config, done);
}

function bundleTaskUnused() {
  return gulp.src('./bundle.conf.js')
    .pipe($.bundleAssets())
    .pipe($.bundleAssets.results({
      dest: tmp_dir,
      fileName: 'asset-manifest'
    }))
    .pipe(gulp.dest(build_dir));
}

function buildHtml() {

  var js = prefixed(vendor_root, manifest.vendor.js)
            .concat(manifest.app.js);

  var css = prefixed(vendor_root, manifest.vendor.css)
            .concat(manifest.app.css);

  var html = prefixed(client_src, manifest.app.outer_html);

  var replace = {
    css: css,
    js:  js
  };

  return gulp.src(html)
    .pipe($.htmlReplace(replace))
    .pipe(gulp.dest(build_dir));
}

function serverTask() {
  runServer(httpPort);
}

function testServerTask() {
  runServer(testHttpPort);
}

function closeServer() {
  if (serverInstance)
    serverInstance.close();
}

function runServer(port) {

  var connect = require('connect')
    , serveStatic = require('serve-static')
    , serveFavicon = require('serve-favicon')
    , reloadMiddleware = require('connect-livereload')
    , morgan = require('morgan')
    , cgi = require('cgi')
    ;

    function api_middleware() {
      var opts = {
        args: [python_cgi],
        stderr: process.stderr
      };
      return cgi(python_exe, opts);
    }

  serverInstance = connect()

    .use(serveFavicon(favicon))
    .use(morgan(logger_name))
    .use(api_root, api_middleware())
    .use(vendor_root, serveStatic(vendor_src))
    .use(reloadMiddleware({port: reloadPort}))
    .use(serveStatic(build_dir))
    .use(serveStatic(client_src))

    .listen(port)
    .on('listening', function () {
      var startMsg = 'server started on http://localhost:'
                    + port + '/'
      log(startMsg);
    })
    .on('close', function () {
      console.log('server closed');
    });
}


function systemTestTask(done) {
  return gulp.src(manifest.tests.system, {read:false})
    .pipe($.protractor.protractor({
      args: ['--baseUrl',
             'http://localhost:' + testHttpPort]
      // configFile: protractor,
    }))
    .on('error', function () {
      closeServer();
      passfail(false);
    })
    .on('end', function() {
      passfail(true);
    })
}

function openBrowser() {
  require('opn')('http://localhost:' + httpPort + '/');
}

function logChange(event) {
  var cwd = process.cwd() + '/'
    , path = event.path.replace(cwd, '')
    , msg = colors.magenta(event.type) + ' '
          + colors.inverse(colors.cyan(path))
    $.util.log(msg);
}

function liveReload() {
  var tinylr = require('tiny-lr')
    , server = tinylr()
  server.listen(reloadPort, function(err) {
    if (err)
      console.log(err);
    else
      console.log('live-reload server started');
  });

  var api_re = new RegExp('^' + server_src.replace('/', '\\/'));

  function notify(event) {
    logChange(event);
    var name = event.path
    tinylr.changed(name);
  }

  var watches = prefixed(client_src,
                         manifest.watch.js
                          .concat(manifest.watch.css)
                          .concat(manifest.watch.inner_html))
                .concat(prefixed(server_src, manifest.watch.py))
                .concat(prefixed(build_dir, manifest.watch.build));

  watch(watches, notify);
  return server;
}

function watchManifest(f) {
  watch(manifest_json, function () {
    log('manifest changed');
    manifest = loadJson(manifest_json);
    f && f();
  });
}

function watchBower() {
  watch(bower_json, function () {
    log(bower_json + ' changed');
    gulp.start('update-manifest');
  });
}

function watchRebuild() {

  /*
  watch('build.config.js', ['js:vendor']);
  watch(files.js.app, ['js:app']);
  watch(files.jade.tpls.modules, ['js:templates-modules']);
  watch(files.jade.tpls.common, ['js:templates-common']);
  watch(less_files, ['css']);
  watch(files.jade.index, ['html']);
  watch(files.img.src, ['img']);
  */

  var html = prefixed(client_src, manifest.watch.outer_html);
  watch(html, ['build-html']);

}

function interactiveTask(done) {
  var server = liveReload();
  watchBower();
  watchManifest(function () {
    gulp.start('build-html')
  });
  watchGulpfile('interactive', function () {
    closeServer();
    server.close();
  });
  watchRebuild();
  openBrowser();
  done();
}

function watchGulpfile(task, close) {
  return;
  watch(__filename, function () {
    log('gulpfile changed');
    if (close)
      close();
    try {
      require('kexec')('gulp ' + task);
    }
    catch (e) {
      process.exit();
    }
  });
}

function updateManifestTask(done) {
  updateManifest();
  done();
}

function updateManifest() {
  var path = require('path')
    , fs = require('fs')
    , manifest = loadJson(manifest_json)
    , vendor_src = manifest.config.vendor_src
    , prefix = path.join(process.cwd(), vendor_src)
    , bower = require('main-bower-files')().map(stripPrefix)
    , jsExt = /\.js$/i
    , cssExt = /\.css$/i
    , js = []
    , css = []
    , other = []
    , f
    ;

  function stripPrefix(s) {
    return s.replace(prefix+'/', '');
  }

  while (bower.length) {
    f = bower.shift();
    if (jsExt.test(f))
      js.push(f)
    else if (cssExt.test(f))
      css.push(f)
    else
      other.push(f)
  }

  manifest.vendor.js = js;
  manifest.vendor.css = css;
  manifest.vendor.other = other;

  fs.renameSync(manifest_json, manifest_json + '.bak');
  fs.writeFileSync(manifest_json,
                   JSON.stringify(manifest, null, 2)
                   +'\n');
}

function cleanTask(done) {
  require('del')(clean_paths, done);
}


