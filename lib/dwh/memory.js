/* eslint consistent-return:1 */

/**
 * Module Dependencies.
 */

 var _ = require('lodash');

/**
 * HOP.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Expose `Memory`
 */

module.exports = Memory;

/**
 * Initialize `Memory` store
 */

function Memory() {
  if (!(this instanceof Memory)) {
    return new Memory();
  }

  this.store = {};
}

/**
 * Set a `key` and `value`.
 *
 * @param {String} key
 * @param {Mixed} value
 * @return {Boolean}
 */

Memory.prototype.set = function (key, value) {
  this.store[key] =  _.isObject(value) ? _.assign({}, value) : value;
  return true;
};

/**
 * Get a `key`.
 *
 * @param {String} key
 */

Memory.prototype.get = function (key) {
  if (!has.call(this.store, key)) return;
  if (_.isObject(this.store[key])) return _.assign({}, this.store[key]);
  return this.store[key];
};

/**
 * Remove a `key`.
 *
 * @param {String} key
 * @return {Boolean}
 */

Memory.prototype.remove = function (key) {
  delete this.store[key];
  return true;
};
