/**
 * Module dependencies.
 */
var _ = require('lodash');
var request = require('superagent');
var uuid = require('uuid');
var cookie = require('./cookie')();
var store = require('./store')();
var memory = require('./memory')();
var debug = require('debug')('auth0-metrics:dwh');

 /**
  * Expose dwh
  */
 module.exports = dwh;

 /**
  * Create `dwh`
  *
  * @param {Object} url     Url to send analytics to
  * @param {Object} label     label indicates which part of the system we are tracking
  * @constructor
  */
 function dwh(url, label) {
  if (!(this instanceof dwh)) {
    return new dwh(url, label);
  }
  debug("Initializing DWH with parameters ", url, label);

  this.url = url;
  this.label = label;

  //Initialize storage

  cookie.set('ajs:cookies', true);
  // cookies are enabled.
  if (cookie.get('ajs:cookies')) {
    cookie.remove('ajs:cookies');
    this._storage = cookie;
    this.storageType = 'cookie';
    return;
  }

  // localStorage is enabled.
  if (store.enabled) {
    this._storage = store;
    this.storageType = 'localStorage';
    return;
  }

  // fallback to memory storage.
  debug('warning using memory store both cookies and localStorage are disabled');
  this._storage = memory;
  this.storageType = 'memory';

 }


 dwh.prototype.anonymousId = function(anonymousId){
   var store = this._storage;

   // set / remove
   if (arguments.length) {
     store.set('ajs_anonymous_id', anonymousId);
     return this;
   }

   // new
   anonymousId = store.get('ajs_anonymous_id');
   if (anonymousId) {
     return anonymousId;
   }

   // empty
   anonymousId = uuid();
   store.set('ajs_anonymous_id', anonymousId);
   return store.get('ajs_anonymous_id');
 };

  dwh.prototype.userid = function(userid){
    var store = this._storage;

    // set / remove
    if (arguments.length) {
      store.set('ajs_user_id', userid);
      return this;
    }

    // get
    return store.get('ajs_user_id');

  };

  dwh.prototype.traits = function(newTraits){
    // set / remove
    if (arguments.length) {
      store.set('ajs_user_traits', newTraits);
      return this;
    }

    // get
    return store.get('ajs_user_traits');
  }

dwh.prototype.annexData = function(data){
  data.sentAt = (new Date()).getTime();
  data.userAgent = navigator.userAgent;
  data.messageId = uuid();
  data.anonymousId = this.anonymousId();
  data.storageType = this.storageType;
  data.path = window.location.pathname;
  data.url = window.location.toString();
  data.title = document.title;
  data.referrer = document.referrer;
  data.search = window.location.search;
  data.label = this.label;

  return data;
}

  dwh.prototype.genericRequest = function(url, type, data, callback) {

    var data = this.annexData(data);

    debug('Sending request to DWH: ', type, data);

    request
      .post(url)
      .send(JSON.stringify({"type": type, "data": data}))
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .end(callback);
  }


  dwh.prototype.track = function(event, data, callback) {
    this.genericRequest(this.url, "track", { userId: this.userid(), event: event, properties: data }, callback);
  }

  dwh.prototype.page = function(event, data, callback) {
    if ('function' === typeof event) {
      callback = event;
      data = null;
    }

    if ('function' === typeof data) {
      callback = data;
      data = null;
    }

    if (_.isObject(event)) {
      data = event;
      event = null;
    }

    this.genericRequest(this.url, "page", { userId: this.userid(), properties: data }, callback);
  }

  dwh.prototype.identify = function(id, traits, callback) {
    var newId = id;
    if(newId == null){
      newId = this.userid();
    }else{
      this.userid(newId);
    }

    var newTraits = _.assign({}, this.traits(), traits);
    this.traits(newTraits);

    this.genericRequest(this.url, "identify", {userId: newId, traits: newTraits}, callback);
  }

  dwh.prototype.alias = function(id, callback) {
    var newId = id;
    if(newId == null){
      return;
    }

    var oldId = this.userid();
    this.userid(newId);

    this.genericRequest(this.url, "alias", {previousId: oldId, userId: newId}, callback);
  }
