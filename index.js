
/**
 * Module dependencies.
 */

var debug = require('debug')('auth0-metrics');
var uuid = require('uuid');
var _ = require('lodash');

/**
 * Expose `Auth0Metrics` constructor
 */
module.exports = Auth0Metrics;

/**
 * Create `Auth0Metrics` instance
 * resolving `options`. If you send an empty ('') segmentKey, it will be mocked up
 *
 * @param {String} segmentKey
 * @param {String} dwhEndpoint
 * @param {String} label
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

  require('./lib/tag-manager')(label);


}

/**
 * Expose current `Auth0Metrics`'s version
 */

Auth0Metrics.version = require('package.version');

/**
 * @public
 */
Auth0Metrics.prototype.segment = function() {
    return window.analytics;
}

/**
 * @public
 */
Auth0Metrics.prototype.track = function(name, data, callback) {
  var segment = this.segment();
  var extended = this.extendData(data);

  if (!segment.loaded) {
    debug('track call without segment');
  }

  //Segment
  try {
    segment.track.call(segment, name, extended, null);
  } catch (error) {
    debug('segment analytics error: %o', error);
    this._trackSegmentError('track', error);
  }

  //DWH
  try {
    this.dwh.track(name, extended, callback);
  } catch (error) {
    debug('dwh analytics error: %o', error);
    'function' === typeof callback && callback();
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
 * @param {Function} cb
 * @public
 */

Auth0Metrics.prototype.setUserId = function(uid) {
  var segment = this.segment();
  if (!segment.loaded) return;

  try {
    var aid = segment.user().anonymousId();
    segment.user().id(uid);
    segment.user().anonymousId(aid);
  } catch (error) {
    debug('segment error: %o', error);
  }
}

/**
 * @public
 */
Auth0Metrics.prototype.identify = function (id, traits, callback) {
  var args = [].slice.call(arguments);

  // Argument reshuffling.
  if (_.isFunction(traits)) callback = traits, traits = null;
  if (_.isPlainObject(id)) traits = id, id = null;

  var segment = this.segment();

  if (segment.loaded) {
    if (null != id) this.setUserId(id);

    try {
      if (_.isFunction(args[args.length - 1])) args.pop();
      segment.identify.apply(segment, args);
    } catch (error) {
      debug('segment analytics error: %o', error);
      this._trackSegmentError('identify', error);
    }

  } else{
    debug('identify call without segment');
  }

  try {
    this.dwh.identify(id, traits, callback);
  } catch (error) {
    debug('dwh analytics error: %o', error);
    'function' === typeof callback && callback();
  }
}

/**
 * @public
 */
Auth0Metrics.prototype.alias = function (userId, callback) {
  var segment = this.segment();

  if (!segment.loaded) {
    debug('alias call without segment');

  }

  //Segment
  try {
    segment.alias.apply(segment, arguments);
  } catch (error) {
    debug('segment analytics error: %o', error);
    this._trackSegmentError('alias', error);
  }

  //DWH
  try {
    this.dwh.alias(userId, callback);
  } catch (error) {
    debug('dwh analytics error: %o', error);
    'function' === typeof callback && callback();
  }
}

/**
 * @public
 */
Auth0Metrics.prototype.page = function () {
  var segment = this.segment();
  var args = this.extendPageArguments(arguments);

  if (!segment.loaded) {
    debug('track call without segment');
  }

  //Segment
  try {
    segment.page.apply(segment, args);
  } catch (error) {
    debug('segment analytics error: %o', error);
    this._trackSegmentError('page', error);
  }

  //DWH
  try {
    this.dwh.page.apply(this.dwh, args);
  } catch (error) {
    debug('dwh analytics error: %o', error);
  }
}

/**
 * @public
 */
Auth0Metrics.prototype.traits = function() {
  return this.dwh.traits();
}

/**
 * @public
 */
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

/**
 * @private
 */
Auth0Metrics.prototype.extendData = function(data) {
  var extended = _.assign({}, this.getData(), data || {});
  extended.uuid = uuid();
  return extended;
}

/**
 * @private
 */
Auth0Metrics.prototype.extendPageArguments = function(args) {
  var base = { uuid: uuid() };
  args = Array.prototype.concat.apply([], args);

  if (!args.length) {
    return args.push(base), args;
  }

  for (var i = 0; i < args.length; i++) {
    if (_.isPlainObject(args[i])) {
      return _.assign(args[i], base), args;
    }
  }

  ('string' === typeof args[0])
    ? args.splice(1, 0, base)
    : args.unshift(base);

  return args;
}

/**
 * @public
 */
Auth0Metrics.prototype.ready = function (cb) {
  var segment = this.segment();
  if (!segment.loaded) { return cb(new Error('no segment integration on page')) }

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

Auth0Metrics.prototype._trackSegmentError = function(action, error) {
  try {
    this.dwh.track('segment:fail:' + action, {
      messsage: error.message,
      stack: error.stack
    });
  } catch (e) {
    debug('dwh analytics error: %o', e);
  }
}
