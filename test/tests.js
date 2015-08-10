/**
 * Config mocha
 */

mocha.timeout(60000);
mocha.globals(['jQuery*', 'analytics', 'GoogleAnalyticsObject', 'ga', 'mixpanel', 'gaplugins', 'gaGlobal']);


var DWH_URL = "//testurl/dwh-metrics";

/* Utility functions */
function readCookie(name) {
    var nameEQ = encodeURIComponent(name) + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function clearData(){
  var cookies = document.cookie.split(";");

  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i];
    var eqPos = cookie.indexOf("=");
    var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }

  localStorage.clear();
}

/**
 * Test User and Password
 */

describe('Auth0 - Metrics', function () {


    function testBasicData(data, expected) {
      expect(data.path).to.be(window.location.pathname);
      expect(data.referrer).to.be(document.referrer);
      expect(data.title).to.be(document.title);
      expect(data.userAgent).to.be(navigator.userAgent);
      expect(data.url).to.be(window.location.toString());
      expect(data.search).to.be(window.location.search);
    }

  before(function () {
    clearData();
    this.metrics = new Auth0Metrics("", DWH_URL, 'testing');
  });


  describe('unavailable metrics server', function() {

    it('should fail silently on page', function(done) {
      this.metrics.page();
      done();
    });

    it('should fail silently on track', function(done) {
      this.metrics.track('testfail', {}, function(){ done(); });
    });

    it('should fail silently on identify', function(done) {
      this.metrics.identify('0');
      done();
    });

    it('should fail silently on alias', function(done) {
      this.metrics.alias('3');
      done();
    });
  });




  describe('normal page track flow', function() {
    before(function() {
      clearData();
      this.anon_id = null;
    });

    beforeEach(function(done) {
      var ctx = this;
      this.server = sinon.fakeServer.create();
      this.server.respondImmediately = true;
      this.server.respondWith("POST", DWH_URL,
            [200, { "Content-Type": "application/json" },
             '{}'])
      this.lastReq = function(){
        return ctx.server.requests[ctx.server.requests.length-1];
      }

      this.metrics.page(function(){
        ctx.anon_id = readCookie('ajs_anonymous_id');
        done();
      });
    });

    afterEach(function () {
      this.server.restore();
    });

    after(function () {
      this.anon_id = null;
    });


    it('should track the current page', function (done) {
      var ctx = this;
      this.metrics.page(function(){
        var requestData = parseRequestBody(ctx.lastReq());
        var data = requestData.data;
        testBasicData(data);
        expect(data.label).to.be('testing');
        expect(requestData.type).to.be('page');
        expect(data.storageType).to.be('cookie');

        ctx.anon_id = readCookie('ajs_anonymous_id');
        expect(ctx.anon_id).to.be.a('string');

        done();
      });
    });

    it('should let you track as user id 1', function(done) {
      var ctx = this;
      var traits = {
        name: "user1",
        nickname: '',
        created_at: '',
        email: 'user1@auth0.com',
        email_verified: true,
        loginsCount: 4,
        tenant: 'usertenant1',
        tenants: 'usertenant1'
      };

      this.metrics.identify("1", traits, function(){
        var requestData = parseRequestBody(ctx.lastReq());
        var data = requestData.data;
        testBasicData(data);
        expect(data.label).to.be('testing');
        expect(requestData.type).to.be('identify');
        expect(data.storageType).to.be('cookie');
        expect(data.userId).to.be("1");
        expect(JSON.stringify(data.traits)).to.be(JSON.stringify(traits));
        expect(readCookie('ajs_anonymous_id')).to.be(ctx.anon_id);

        done();
      });

    });

    it('should let you track a testing event', function(done) {
      var ctx = this;
      this.metrics.track("testevent", {'testing': 5}, function(){
        var requestData = parseRequestBody(ctx.lastReq());
        var data = requestData.data;
        testBasicData(data);
        expect(data.label).to.be('testing');
        expect(requestData.type).to.be('track');
        expect(data.storageType).to.be('cookie');
        expect(data.userId).to.be("1");
        expect(data.event).to.be('testevent');
        expect(data.properties.testing).to.be(5);
        expect(readCookie('ajs_anonymous_id')).to.be(ctx.anon_id);

        done();
      });


    });

    it('should let you alias an id', function(done) {
      var ctx = this;
      this.metrics.alias("2", function(){
        var requestData = parseRequestBody(ctx.lastReq());
        var data = requestData.data;
        testBasicData(data);
        expect(data.label).to.be('testing');
        expect(requestData.type).to.be('alias');
        expect(data.storageType).to.be('cookie');
        expect(data.userId).to.be("2");
        expect(readCookie('ajs_anonymous_id')).to.be(ctx.anon_id);

        done();
      });

    });

  });


  describe('multiple identify', function() {
    before(function() {
      clearData();
      this.anon_id = readCookie('ajs_anonymous_id');
    });

    beforeEach(function() {
      var fServer = this.server = sinon.fakeServer.create();
      this.server.respondImmediately = true;
      this.server.respondWith("POST", DWH_URL,
            [200, { "Content-Type": "application/json" },
             '{}'])
      this.lastReq = function(){
        return fServer.requests[fServer.requests.length-1];
      }
    });

    after(function () {
      this.server.restore();
    });


    it('should keep the same anonymous id between different identify calls', function(done) {
      var ctx = this;
      this.metrics.page(function(){
        var anon_id = readCookie('ajs_anonymous_id');
        ctx.metrics.identify("1", {}, function(){
          expect(readCookie('ajs_anonymous_id')).to.be(anon_id);
          ctx.metrics.identify("2", {}, function(){
            expect(readCookie('ajs_anonymous_id')).to.be(anon_id);
            done();
          })
        })
      });

    });
  });



    describe('normal page track flow without segment', function() {
      var segmentSave;
      before(function() {
        clearData();
        segmentSave = this.metrics._segment;

        var analytics = [];

        analytics.invoked = true;

        // A list of the methods in Analytics.js to stub.
        analytics.methods = [
          'trackSubmit',
          'trackClick',
          'trackLink',
          'trackForm',
          'pageview',
          'identify',
          'group',
          'track',
          'ready',
          'alias',
          'page',
          'once',
          'off',
          'on'
        ];

        analytics.factory = function(method){
          return function(){
            var args = Array.prototype.slice.call(arguments);
            args.unshift(method);
            analytics.push(args);
            return analytics;
          };
        };

        for (var i = 0; i < analytics.methods.length; i++) {
          var key = analytics.methods[i];
          analytics[key] = analytics.factory(key);
        }

        analytics.SNIPPET_VERSION = '3.0.1';

        this.metrics._segment = analytics;

        this.anon_id = readCookie('ajs_anonymous_id');
        var fServer = this.server = sinon.fakeServer.create();
        this.server.respondImmediately = true;
        this.server.respondWith("POST", DWH_URL,
              [200, { "Content-Type": "application/json" },
               '{}'])
        this.lastReq = function(){
          return fServer.requests[fServer.requests.length-1];
        }

      });

      after(function () {
        this.server.restore();
        this.metrics._segment = segmentSave;
        this.anon_id = null;
      });



          it('should track the current page', function (done) {
            var ctx = this;
            this.metrics.page(function(){
              var requestData = parseRequestBody(ctx.lastReq());
              var data = requestData.data;
              testBasicData(data);
              expect(data.label).to.be('testing');
              expect(requestData.type).to.be('page');
              expect(data.storageType).to.be('cookie');

              ctx.anon_id = readCookie('ajs_anonymous_id');
              expect(ctx.anon_id).to.be.a('string');

              done();
            });
          });

          it('should let you track as user id 1', function(done) {
            var ctx = this;
            var traits = {
              name: "user1",
              nickname: '',
              created_at: '',
              email: 'user1@auth0.com',
              email_verified: true,
              loginsCount: 4,
              tenant: 'usertenant1',
              tenants: 'usertenant1'
            };

            this.metrics.identify("1", traits, function(){
              var requestData = parseRequestBody(ctx.lastReq());
              var data = requestData.data;
              testBasicData(data);
              expect(data.label).to.be('testing');
              expect(requestData.type).to.be('identify');
              expect(data.storageType).to.be('cookie');
              expect(data.userId).to.be("1");
              expect(JSON.stringify(data.traits)).to.be(JSON.stringify(traits));
              expect(readCookie('ajs_anonymous_id')).to.be(ctx.anon_id);

              done();
            });

          });

          it('should let you track a testing event', function(done) {
            var ctx = this;
            this.metrics.track("testevent", {'testing': 5}, function(){
              var requestData = parseRequestBody(ctx.lastReq());
              var data = requestData.data;
              testBasicData(data);
              expect(data.label).to.be('testing');
              expect(requestData.type).to.be('track');
              expect(data.storageType).to.be('cookie');
              expect(data.userId).to.be("1");
              expect(data.event).to.be('testevent');
              expect(data.properties.testing).to.be(5);
              expect(readCookie('ajs_anonymous_id')).to.be(ctx.anon_id);

              done();
            });


          });

          it('should let you alias an id', function(done) {
            var ctx = this;
            this.metrics.alias("2", function(){
              var requestData = parseRequestBody(ctx.lastReq());
              var data = requestData.data;
              testBasicData(data);
              expect(data.label).to.be('testing');
              expect(requestData.type).to.be('alias');
              expect(data.storageType).to.be('cookie');
              expect(data.userId).to.be("2");
              expect(readCookie('ajs_anonymous_id')).to.be(ctx.anon_id);

              done();
            });

          });

    });

});

function parseRequestBody(request) {
  if (!request || 'string' !== typeof request.requestBody) {
    return request;
  }

  return JSON.parse(request.requestBody);
}
