/**
 * Module dependencies.
 */

 var debug = require('debug')('auth0-metrics:boot-segment');

 /**
  * Expose dwh
  */
 module.exports = bootSegment;


  /**
   * Create `bootSegment`
   *
   * @param {Object} segmentKey   Write key for segment
   * @constructor
   */
  function bootSegment(segmentKey) {

   var analytics = window.analytics = [];

   analytics.invoked = true;
   analytics.loaded = false;

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
       debug('Called segment method without segment loaded', method);
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
       analytics.loaded = true;
     }

     var first = document.getElementsByTagName('script')[0];
     first.parentNode.insertBefore(script, first);
   };

   analytics.SNIPPET_VERSION = '3.0.1';

   if(segmentKey === ''){
     debug('empty segmentKey passed, segment methods will be mocked')
   }else{
     analytics.load(segmentKey);
   }

   return analytics;
 }
