var Ride = require('../model/ride');
var error = require('../error');

module.exports = function(req, res, next) {
    if (req.body.ride) {
        Ride.findById(req.body.ride, function (err, ride) {
            if (err)
                return res.json({'success': false, 'code': error.ride_not_found});
            else if (!ride.valid)
                return res.json({'success': false, 'code': error.already_deleted});
            else
                next();
        })
    }
    else
        next();
};