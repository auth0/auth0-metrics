
/**
 * Module dependencies.
 */

var debug = require('debug')('auth0-metrics');
var _ = require('underscore');

/**
 * Expose `Auth0Metrics` constructor
 */
module.exports = Auth0Metrics;

/**
 * Create `Auth0Metrics` instance
 * resolving `options`.
 *
 * @param {String} segmentKey
 * @return {Auth0Metrics}
 * @constructor
 */

function Auth0Metrics (segmentKey, dwhEndpoint, label) {
  if (!(this instanceof Auth0Metrics)) {
    return new Auth0Metrics(segmentKey, dwhEndpoint, label);
  }

  // validate required options
  if ('string' !== typeof segmentKey) throw new Error('`segmentKey` required as first parameter.');
  if ('string' !== typeof dwhEndpoint) throw new Error('`dwhEndpoint` required as first parameter.');

  // Instance properties and options
  this.$options = {};

  // Save clientID and domain in $options
  this.$options.segmentKey = segmentKey;
  this.$options.dwhEndpoint = dwhEndpoint;
  this.$options.label = label;

  debug("Loading DWH endpoint library...")

  this.dwh = require('./lib/dwh')(dwhEndpoint, label);

  debug("Start loading segment...");

  var analytics = this._analytics = [];

  if (analytics.invoked) {
    if (window.console && console.error) {
      console.error('Segment snippet included twice.');
    }
    return;
  }

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

  analytics.load = function(key){
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = ('https:' === document.location.protocol
      ? 'https://' : 'http://')
      + 'cdn.segment.com/analytics.js/v1/'
      + key + '/analytics.min.js';
    script.onerror = function(){
      debug("Segment load failed");
    }

    script.onload = function(){
      debug("Finished loading segment");
      // Grab analytics and make it private
      analytics = window.analytics;
      delete window.analytics;
    }

    var first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(script, first);
  };

  analytics.SNIPPET_VERSION = '3.0.1';

  analytics.load(segmentKey);

}

/**
 * Expose current `Auth0Metrics`'s version
 */

Auth0Metrics.version = require('package.version');

Auth0Metrics.prototype.analytics = function() {
    return this._analytics;
}

Auth0Metrics.prototype.track = function(name, data, cb) {
  var analytics = this.analytics();

  if (!analytics) {
    debug('track call without segment');
  }

  //Segment
  try {
    analytics.track.call(analytics, name, $.extend({}, this.getData(), data || {}), null);
  } catch (error) {
    debug('segment analytics error: %o', error);
  }

  //DWH
  try {
    this.dwh.track(name, data, cb);
  } catch (error) {
    debug('dwh analytics error: %o', error);
    if ('function' === typeof cb) cb(error);
  }
}

/**
 * Workaround to properly set the analytics.js user.id to `id`
 * without altering the anonymousId caused by some internal
 * custom setup. The `override` property (not yet implemented)
 * should allow to avoid the preservation of anonymousId if desired.
 * Our most common case is to preserve it, that's why this method exists.
 *
 * @param {String} uid
 * @param {Boolean} override
 * @param {Function} cb
 * @public
 */

Auth0Metrics.prototype.setUserId = function(uid, override) {
  var analytics = this.analytics();
  if (!analytics) return;

  try {
    var aid = analytics.user().anonymousId();
    analytics.user().id(uid);
    analytics.user().anonymousId(aid);
  } catch (error) {
    console.error('analytics error: %o', error);
  }
}


Auth0Metrics.prototype.identify = function (id, traits) {
  var analytics = this.analytics();

  if (!analytics) {
    debug('identify call without analytics');
  }

  if(typeof id !== 'string'){
    traits = id;
    id = null;
  }


  try {
    analytics.identify(id, traits);
  } catch (error) {
    debug('segment analytics error: %o', error);
  }

  try {
    this.dwh.identify(id, traits);
  } catch (error) {
    debug('dwh analytics error: %o', error);
  }
}

Auth0Metrics.prototype.alias = function (userId) {
  var analytics = this.analytics();

  if (!analytics) {
    debug('alias call without analytics');

  }

  //Segment
  try {
    analytics.alias.apply(analytics, arguments);
  } catch (error) {
    debug('segment analytics error: %o', error);
  }

  //DWH
  try {
    this.dwh.alias(userId);
  } catch (error) {
    debug('dwh analytics error: %o', error);
  }
}

Auth0Metrics.prototype.page = function () {
  var analytics = this.analytics();

  if (!analytics) {
    debug('track call without segment');
  }

  //Segment
  try {
    analytics.page.apply(analytics, arguments);
  } catch (error) {
    debug('segment analytics error: %o', error);
  }

  //DWH
  try {
    this.dwh.page();
  } catch (error) {
    debug('dwh analytics error: %o', error);
  }
}

Auth0Metrics.prototype.getData = function() {
  return {
    path: window.location.pathname,
    url: window.location.toString(),
    title: document.title,
    referrer: document.referrer,
    search: window.location.search,
    label: this.$options.label
  }
}

Auth0Metrics.prototype.ready = function (cb) {
  var analytics = this.analytics();
  if (!analytics) { return cb(new Error('no segment integration on page')) }

  // await for 1000ms tops for analytics integrations
  // to load in page so analytics could get tracked
  analytics.ready(onready(1000));

  function onready (timeout) {
    var timer = setTimeout(function () {
      debug('segment timeout, continuing with page load anyways');
      cb(new Error('segment timeout, continuing with page load anyways'));
      timer = null;
    }, timeout);

    return function onanalyticsready() {
      if (!timer) {
        return debug('stop analytics.ready execution fired too late')
      }

      debug('segment integration ready!');
      clearTimeout(timer);
      timer = null;
      cb();
    }
  }
}


Auth0Metrics.prototype.middleware = function (opts) {
  return function middleware (ctx, next) {
    try {
      debug('page track');
      this.page();
    } catch (e) {
      debug(e);
    } finally {
      next();
    }
  }
}
