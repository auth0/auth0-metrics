!function(){
  var metricsLib = window.metricsLib = window.metricsLib || [];
  // A list of the methods in metrics.js to stub.
  metricsLib.methods = ["segment","track","setUserId","identify","alias","page","traits","getData","ready"];
  metricsLib.factory = function(method){
    return function(){
      var args = Array.prototype.slice.call(arguments);
      args.unshift(method);
      metricsLib.push(args);
      return metricsLib;
    };
  };
  for (var i = 0; i < metricsLib.methods.length; i++) {
    var key = metricsLib.methods[i];
    metricsLib[key] = metricsLib.factory(key);
  }
  metricsLib.load = loader;

  function loader(config) {
    // TODO: validate arguments and throw an error if needed

    if(null != window.Auth0Metrics){
      window.metricsLib = new Auth0Metrics(config.segmentKey, config.dwhEndpoint, config.label);
      return;
    }

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = ('https:' === document.location.protocol
      ? 'https://' : 'http://')
      + 'cdn.auth0.com/js/m/1.4.7/auth0-metrics-loader.min.js';
    script.onerror = function(){
      console.error('metricsLib couldn&#39;t be loaded.');
    }
    script.onload = function(){
      // Grab analytics and make it private
      window.metricsLib = new Auth0Metrics(config.segmentKey, config.dwhEndpoint, config.label);
    }
    var first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(script, first);
  };
}();
