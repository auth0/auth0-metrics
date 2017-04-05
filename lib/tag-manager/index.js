var debug = require('debug')('auth0-metrics');
var initialize = require('auth0-metrics-tag-manager').initialize;

module.exports = function bootTagManager(label) {
  var tagManager = initialize(label, tagManagerReady);

  var analytics = {};
  var readyCallbacks = [];
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

  analytics.track = tagManager.track;
  analytics.page = tagManager.page;
  analytics.invoked = true;
  analytics.loaded = false;
  analytics.SNIPPET_VERSION = '3.0.1';

  window.analytics = analytics;

  return analytics;

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
}
