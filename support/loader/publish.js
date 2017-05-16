var ejs = require('ejs');
var fs = require('fs');
var path = require('path');

/**
 * Generate loader script.
 *
 * @param {TAFFY} data - A TaffyDB collection representing
 *                       all the symbols documented in your code.
 * @param {object} opts - An object with options information.
 */
exports.publish = function(data, opts) {

  // Query that will allow us to filter Doclet objects that are public instance
  // functions of Auth0Metrics.
  var query = {
    access: 'public',
    kind: 'function',
    memberof: 'Auth0Metrics',
    scope: 'instance'
  };

  // Perform the query and map Doclet objects to its names, because is the only
  // thing we care about.
  var methods = data(query).get().map(function(x) { return x.name; });

  if (!methods.length) {
    throw new Error("Can't build loader script, no public methods to stub have been found.");
  }

  var rendered = ejs.renderFile('./support/loader/loader.js.ejs', {
    globalNamespace: "metricsLib",
    loadErrorMessage: "metricsLib couldn't be loaded.",
    version: env.opts.query.version,
    methods: JSON.stringify(methods)
  }, function(err, str) {
    if (err) {
      throw new Error("Can't build loader script, an error ocurred when rendering the template.");
    }

    try {
      fs.writeFileSync(path.join(opts.destination, "auth0-metrics-loader.js"), str);
    } catch (err) {
      throw new Error("Can't build loader script, an error ocurred when writing the file.");
    }
  });
};
