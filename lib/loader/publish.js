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

  var template = fs.readFileSync(path.resolve(__dirname, 'template.ejs'), 'utf8');
  var rendered = ejs.render(template, {
    globalNamespace: "metricsLib",
    loadErrorMessage: "No metrics",
    majorFileName: env.opts.query.majorFileName,
    methods: JSON.stringify(methods)
  });
  fs.writeFileSync(path.join(opts.destination, "loader.js"), rendered);
};
