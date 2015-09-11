/**
 * Config mocha
 */

mocha.timeout(60000);
mocha.globals(['jQuery*', 'analytics', 'GoogleAnalyticsObject', 'ga', 'mixpanel', 'gaplugins', 'gaGlobal']);


var responses = {
  successJSON: [ 200, { "Content-Type": "application/json" }, '{}' ]
};

var DWH_URL = "//testurl/dwh-metrics";

function levelsUrl(url){
  var host = window.location.hostname;
  var parts = host.split('.');
  var last = parts[parts.length-1];
  var levels = [];

  // Ip address.
  if (4 == parts.length && parseInt(last, 10) == last) {
    return levels;
  }

  // Localhost.
  if (1 >= parts.length) {
    return levels.push(''), levels;
  }

  // Create levels.
  for (var i = parts.length-2; 0 <= i; --i) {
    levels.push(parts.slice(i).join('.'));
  }

  return levels;
};

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
    var domain = levelsUrl(window.location.href)[0];
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;domain=" + domain;
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
    sinon.xhr.supportsCORS = true;
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

  describe('.page()', function () {
    beforeEach(function () {
      clearData();
      var fServer = this.server = sinon.fakeServer.create();
      this.server.respondImmediately = true;
      this.server.respondWith("POST", DWH_URL, responses.successJSON);
      this.lastReq = function() {
        return fServer.requests[fServer.requests.length-1];
      }
    });

    afterEach(function () {
      this.server.restore();
    });

    it('should work', function(done) {
      var _this = this;
      this.metrics.page(function () {
        var requestData = parseRequestBody(_this.lastReq());
        var type = requestData.type;
        var data = requestData.data;
        testBasicData(data);

        expect(type).to.be('page');
        expect(data.label).to.be('testing');
        expect(data.storageType).to.be('cookie');
        expect(data.properties.uuid).to.be.ok();

        done();
      });
    });

    it('should work with page title', function(done) {
      var _this = this;
      this.metrics.page('some title', function () {
        var requestData = parseRequestBody(_this.lastReq());
        var type = requestData.type;
        var data = requestData.data;

        testBasicData(data);
        expect(type).to.be('page');
        expect(data.label).to.be('testing');
        expect(data.storageType).to.be('cookie');
        expect(data.properties.uuid).to.be.ok();

        done();
      });
    });

    it('should work with page title and params', function(done) {
      var _this = this;
      this.metrics.page('some title', { some: 'param' }, function () {
        var requestData = parseRequestBody(_this.lastReq());
        var type = requestData.type;
        var data = requestData.data;

        testBasicData(data);
        expect(type).to.be('page');
        expect(data.label).to.be('testing');
        expect(data.storageType).to.be('cookie');
        expect(data.properties.uuid).to.be.ok();
        expect(data.properties.some).to.be('param');

        done();
      });
    });

    it('should work with params', function(done) {
      var _this = this;
      this.metrics.page({ another: 'param' }, function () {
        var requestData = parseRequestBody(_this.lastReq());
        var type = requestData.type;
        var data = requestData.data;

        testBasicData(data);
        expect(type).to.be('page');
        expect(data.label).to.be('testing');
        expect(data.storageType).to.be('cookie');
        expect(data.properties.uuid).to.be.ok();
        expect(data.properties.another).to.be('param');

        done();
      });
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
      this.server.respondWith("POST", DWH_URL, responses.successJSON)
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

  describe('identify multiple arities support', function() {
    function dwhServer() {
      var server = sinon.fakeServer.create();
      server.respondImmediately = true;
      server.respondWith("POST", DWH_URL, [200, { "Content-Type": "application/json" }, '{}']);
      return server;
    }

    function assertLastRequest(server, type, data) {
      var lastRequest = _.last(server.requests);
      var requestData = parseRequestBody(lastRequest);
      expect(requestData.type).to.be(type);
      _.forEach(data, function(expected, key) {
        expect(requestData.data[key]).to.eql(expected)
      });
    }

    before(function() {
      this.id = '1';
      this.traits = {someTrait: 'some trait'};
    });

    beforeEach(function() {
      clearData();
      window.analytics.loaded = true;
      sinon.stub(window.analytics, 'identify');
      this.server = dwhServer();
    });

    afterEach(function () {
      window.analytics.loaded = false;
      window.analytics.identify.restore();
      this.server.restore();
    });

    it('can be called with an id', function() {
      this.metrics.identify(this.id);

      // delegates to segment
      expect(window.analytics.identify.calledOnce).to.be.ok();
      expect(window.analytics.identify.calledWithExactly(this.id)).to.be.ok();
      // makes the request to dwh
      assertLastRequest(this.server, 'identify', {userId: this.id});
    });

    it('can be called with a traits object', function() {
      this.metrics.identify(this.traits);

      // delegates to segment
      expect(window.analytics.identify.calledOnce).to.be.ok();
      expect(window.analytics.identify.calledWithExactly(this.traits)).to.be.ok();
      // makes the request to dwh
      assertLastRequest(this.server, 'identify', {traits: this.traits, userId: null});
    });

    it('can be called with an id and a callback', function() {
      // NOTE: assumes synchronous callback invocation
      var cb = sinon.spy();
      this.metrics.identify(this.id, cb);

      // delegates to segment
      expect(window.analytics.identify.calledOnce).to.be.ok();
      expect(window.analytics.identify.calledWithExactly(this.id)).to.be.ok();
      // makes the request to dwh
      assertLastRequest(this.server, 'identify', {traits: {}, userId: this.id});
      // invokes the callback
      expect(cb.calledOnce).to.be.ok();
    });

    it('can called with a traits object and a callback', function() {
      // NOTE: assumes synchronous callback invocation
      var cb = sinon.spy();
      this.metrics.identify(this.traits, cb);

      // delegates to segment
      expect(window.analytics.identify.calledOnce).to.be.ok();
      expect(window.analytics.identify.calledWithExactly(this.traits)).to.be.ok();
      // makes the request to dwh
      assertLastRequest(this.server, 'identify', {traits: this.traits, userId: null});
      // invokes the callback
      expect(cb.calledOnce).to.be.ok();
    });

    it('can be called with an id and a traits object', function() {
      this.metrics.identify(this.id, this.traits);

      // delegates to segment
      expect(window.analytics.identify.calledOnce).to.be.ok();
      expect(window.analytics.identify.calledWithExactly(this.id, this.traits)).to.be.ok();
      // makes the request to dwh
      assertLastRequest(this.server, 'identify', {traits: this.traits, userId: this.id});
    });

    it('can be called with an id, a traits object and a callback', function() {
      // NOTE: assumes synchronous callback invocation
      var cb = sinon.spy();
      this.metrics.identify(this.id, this.traits, cb);

      // delegates to segment
      expect(window.analytics.identify.calledOnce).to.be.ok();
      expect(window.analytics.identify.calledWithExactly(this.id, this.traits)).to.be.ok();
      // makes the request to dwh
      assertLastRequest(this.server, 'identify', {traits: this.traits, userId: this.id});
      // invokes the callback
      expect(cb.calledOnce).to.be.ok();
    });
  });
});

function parseRequestBody(request) {
  if (!request || 'string' !== typeof request.requestBody) {
    return request;
  }

  return JSON.parse(request.requestBody);
}
