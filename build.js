var path = require('path');
var landRegistryElements = require('land-registry-elements');

/**
 * Call the land registry elements pattern library to grab our assets
 */
landRegistryElements({
  'includePath': __dirname,
  'destination': path.join(__dirname, 'dist'),
  'assetPath': 'assets',
  'components': [
    'pages/find-property-information/landing-form',
    'pages/find-property-information/search-form',
    'pages/find-property-information/search-results',
    'pages/find-property-information/order-confirmation',
    'pages/find-property-information/summary',
    'pages/find-property-information/cookies',
    'pages/land-registry/error-page'
  ]
})
  .then(function(dest) {
    console.log('Assets built to', dest);
  })
  .catch(function(e) {
    console.error(e);
  });