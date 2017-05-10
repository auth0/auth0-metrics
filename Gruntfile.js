var fs = require('fs');
var path = require('path');
var pkg = require('./package');

var major_version = pkg.version.replace(/\.(\d)*\.(\d)*$/, '');

function node_bin (bin) {
  return path.join('node_modules', '.bin', bin);
}

module.exports = function (grunt) {
  grunt.initConfig({
    connect: {
      test: {
        options: {
          // base: 'test',
          hostname: '*',
          base: ['.', 'support/development-demo', 'support/development-demo/build', 'build'],
          port: 9999
        }
      },
      demo: {
        options: {
          hostname: '*',
          base: ['support/development-demo', 'support/development-demo/build', 'build', '.'],
          port: 3000
        }
      }
    },
    browserify: {
      options: {
        browserifyOptions: {
          debug: true
        },
        watch: true,

        // Convert absolute sourcemap filepaths to relative ones using mold-source-map.
        postBundleCB: function(err, src, cb) {
          if (err) { return cb(err); }
          var through = require('through');
          var stream = through().pause().queue(src).end();
          var buffer = '';

          stream.pipe(require('mold-source-map').transformSourcesRelativeTo(__dirname)).pipe(through(function(chunk) {
            buffer += chunk.toString();
          }, function() {
            cb(err, buffer);
          }));
          stream.resume();
        }

      },
      debug: {
        files: {
          'build/auth0-metrics.js': ['standalone.js']
        }
      },
    },
    less: {
      demo: {
        files: {
          'support/development-demo/build/index.css': 'support/development-demo/index.less'
        }
      }
    },
    copy: {
      demo: {
        files: {
          'support/development-demo/auth0-metrics.min.js': 'build/auth0-metrics.min.js',
          'support/development-demo/auth0-metrics.js':     'build/auth0-metrics.js'
        }
      }
    },
    exec: {
      'uglify': {
        cmd: node_bin('uglifyjs') + ' build/auth0-metrics.js  -b beautify=false,ascii_only=true > build/auth0-metrics.min.js',
        stdout: true,
        stderr: true
      },
      'uglify-loader': {
        cmd: node_bin('uglifyjs') + ' build/auth0-metrics-loader.js  -b beautify=false,ascii_only=true > build/auth0-metrics-loader.min.js',
        stdout: true,
        stderr: true
      },
      'test-inception': {
        cmd: node_bin('mocha') + ' ./test/support/characters-inception.test.js',
        stdout: true,
        stderr: true
      },
      'test-integration': {
        cmd: node_bin('zuul') + ' -- test/*.js',
        stdout: true,
        stderr: true
      },
      'test-phantom': {
        cmd: node_bin('zuul') + ' --ui mocha-bdd --disable-tunnel --phantom 9999 -- test/*.js',
        stdout: true,
        stderr: true
      },
      cdn: {
        cmd: node_bin('ccu'),
        stdout: true,
        stderr: true
      }
    },
    clean: {
      js: ['release/', 'build/', 'support/development-demo/auth0-metrics.js']
    },
    watch: {
      js: {
        files: ['build/auth0-metrics.js'],
        tasks: [],
        options: {
          livereload: true
        },
      },
      demo: {
        files: ['support/development-demo/*'],
        tasks: ['less:demo'],
        options: {
          livereload: true
        },
      }
    },
    jsdoc: {
      dist : {
        src: 'index.js',
        options: {
          destination: 'build',
          template : "support/loader",
          query: "majorFileName=metrics-" + major_version
        }
      }
    }
  });


  // Loading dependencies
  for (var key in grunt.file.readJSON('package.json').devDependencies) {
    if (key !== 'grunt' && key.indexOf('grunt') === 0) { grunt.loadNpmTasks(key); }
  }

  grunt.registerTask('js',            ['clean:js', 'browserify:debug', 'exec:uglify']);
  grunt.registerTask('loader',        ['jsdoc', 'exec:uglify-loader']);
  grunt.registerTask('build',         ['js', 'loader']);

  grunt.registerTask('demo',          ['less:demo', 'connect:demo', 'build', 'watch']);

  grunt.registerTask('dev',           ['connect:test', 'build', 'watch']);
  grunt.registerTask('integration',   ['exec:test-inception', 'exec:test-integration']);
  grunt.registerTask('phantom',       ['build', 'exec:test-inception', 'exec:test-phantom']);

  grunt.registerTask('cdn',           ['build', 'exec:cdn']);
};
