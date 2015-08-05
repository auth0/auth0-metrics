
/**
 * Module dependencies.
 */

var debug = require('debug')('auth0-metrics');
var _ = require('lodash');

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

  debug("Loading segment...");

  this._segment = require('./lib/boot-segment')(segmentKey);


}

/**
 * Expose current `Auth0Metrics`'s version
 */

Auth0Metrics.version = require('package.version');

Auth0Metrics.prototype.segment = function() {
    return this._segment;
}

Auth0Metrics.prototype.track = function(name, data, cb) {
  var segment = this.segment();

  if (!segment) {
    debug('track call without segment');
  }

  //Segment
  try {
    segment.track.call(segment, name, _.assign({}, this.getData(), data || {}), null);
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
  var segment = this.segment();
  if (!segment) return;

  try {
    var aid = segment.user().anonymousId();
    segment.user().id(uid);
    segment.user().anonymousId(aid);
  } catch (error) {
    console.error('segment error: %o', error);
  }
}


Auth0Metrics.prototype.identify = function (id, traits) {
  var segment = this.segment();

  if (!segment) {
    debug('identify call without segment');
  }

  if(typeof id !== 'string'){
    traits = id;
    id = null;
  }


  try {
    segment.identify(id, traits);
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
  var segment = this.segment();

  if (!segment) {
    debug('alias call without segment');

  }

  //Segment
  try {
    segment.alias.apply(segment, arguments);
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
  var segment = this.segment();

  if (!segment) {
    debug('track call without segment');
  }

  //Segment
  try {
    segment.page.apply(segment, arguments);
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

Auth0Metrics.prototype.traits = function() {
  return this.dwh.traits();
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
  var segment = this.segment();
  if (!segment) { return cb(new Error('no segment integration on page')) }

  // await for 1000ms tops for segment integrations
  // to load in page so segment could get tracked
  segment.ready(onready(1000));

  function onready (timeout) {
    var timer = setTimeout(function () {
      debug('segment timeout, continuing with page load anyways');
      cb(new Error('segment timeout, continuing with page load anyways'));
      timer = null;
    }, timeout);

    return function onanalyticsready() {
      if (!timer) {
        return debug('stop segment.ready execution fired too late')
      }

      debug('segment integration ready!');
      clearTimeout(timer);
      timer = null;
      cb();
    }
  }
}
