var debug = require('debug')('auth0-metrics');
var initialize = require('auth0-tag-manager').initialize;

module.exports = function bootTagManager(config) {
  var analytics = {};
  var readyCallbacks = [];

  function tagManagerReady() {
    analytics.loaded = true;
    readyCallbacks.forEach(function (callback) {
      try {
        callback();
      } catch (e) {
        debug('Error while calling ready callback');
        debug(e);
      }
    });
  }

  var tagManager = initialize(config, tagManagerReady);

  var methods = [
    'trackSubmit',
    'trackClick',
    'trackLink',
    'trackForm',
    'user',
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

  methods.forEach(function (method) {
    analytics[method] = function () {};
  });

  analytics.ready = function (callback) {
    readyCallbacks.push(callback);
  };

  analytics.user = function () {
    return {
      id: function() {},
      anonymousId: function() {}
    }
  }

  if (tagManager) {
    analytics.track = tagManager.track;
    analytics.page = tagManager.page;
    analytics.invoked = true;
    analytics.loaded = false;
    analytics.SNIPPET_VERSION = '3.0.1';
  }

  window.analytics = analytics;

  return analytics;
}
