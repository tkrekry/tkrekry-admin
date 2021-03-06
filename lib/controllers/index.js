const path = require('path');
const debug = require('debug')('tkrekry:controllers:index');
const express = require('express');
const middleware = require('../middleware');
const routes = express.Router();

/**
 * Send partial, or 404 if it doesn't exist
 */
routes.get(/^\/(partials|template|employer|advertisement|settings|organisation|user|respond)\/(.+)/, function (req, res) {
  var stripped = req.url.split('.')[0];
  var requestedView = path.join('./', stripped);
  res.render(requestedView, function (err, html) {
    if (err) {
      debug("error: %o rendering partial '%s' ", err, requestedView);
      res.status(404).end();
    } else {
      res.status(200).send(html).end();
    }
  });
});

/**
 * Send our single page app
 */
routes.get('/', middleware.setUserCookie, (req, res) => res.render('index'));

module.exports = routes;
