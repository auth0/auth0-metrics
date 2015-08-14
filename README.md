# auth0-metrics

This library provides a module to track all frontend usage on auth0.com, it wraps Segment and sends the same data both to segment and our own endpoint.

## Installation

To install the dependencies, execute:

`npm install`



## Usage (local)
To build and run the library locally, you can run
`npm run dev`, that will let you include the library from http://localhost:9999/auth0-metrics.js, you can also test the methods included in http://localhost:9999/

## Usage (deploy)
To use it, you have to include the script which has been built, it is built with major, minor and fix versions to be able to granularly specify versioning. You can include either the complete or minified version.

For example, for version 1.3.7, the following files will be built:

```
metrics-1.js
metrics-1.3.js
metrics-1.3.7.js
metrics-1.min.js
metrics-1.3.min.js
metrics-1.3.7.min.js
```

Then you have to call the constructor with the correct dev/prod variables

`var metrics = new Auth0Metrics('segmentKey', 'dwhEndpoint', 'website');`

## API


### .setUserId(uid)
Sets the userId of the currently connected client
#### Parameters
* `uid` user id to set

### .page(callback)
Sends information of the current page to track it
#### Parameters
* `callback` a function to call after sending this event

### .track(event, data, callback)
Sends information of a custom event to track.
#### Parameters
* `event` a string with the name of the event to track
* `data` an object with any data we need to pass
* `callback` a function to call after sending this event

### .identify(id, traits, callback)
Sends information of an identification (login/signup) to track.
#### Parameters
* `id` user id to identify the current user to
* `traits` additional properties to set to the user
* `callback` a function to call after sending this event

### .alias(id, callback)
Sends an alias (renaming a previous id to a new one).
#### Parameters
* `id` new user id to map to, the previous id will be taken from the cookie.
* `callback` a function to call after sending this event

### .traits()
Traits (additional properties) of the current user


### .ready(cb)
Executes a callback when segment finishes loading.
#### Parameters
* `cb` function to run when segment finishes loading.

## Known issues
If you need to add traits to the current user without identifying the user id, you need to run segment's native identify, using metrics.segment().identify()
