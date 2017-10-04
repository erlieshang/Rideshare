var jwt = require("jsonwebtoken");
var config = require("../config");
var error = require('../error');

module.exports = function(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.param('token') || req.headers['x-access-token'];

    // decode token
    if (token) {
        jwt.verify(token, config.secret, function(err, decoded) {
            if (err) {
                return res.json({ 'success': false, 'code': error.authentication_failed });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });
    }
    else {
        return res.status(403).json({
            'success': false,
            'code': error.no_token_provided
        });
    }
};