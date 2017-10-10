var express = require("express");
var mongoose = require("mongoose");

var config = require("../config");
var error = require('../error');
var auth = require('./authenticate');
var User = require("../model/user");
var Ride = require('../model/ride');

var router = express.Router();

mongoose.connect(config.database);

router.use(auth);



router.post('/search_ride', function (req, res) {
    if (!req.body.pickUpLoc || !req.body.dropOffLoc || !req.body.departDate)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.find({
        'departDate.from': {$lte: req.body.departDate},
        'departDate.to': {$gte: req.body.departDate},
        'valid': true
    }).sort('-postDate').exec(function (err, results) {
        if (err) return res.json({'success': false, 'code': error.db_error});
        var ret_ride = [];
        for (var i = 0; i < results.length; i++) {
            var dx_p = results[i].pickUpLoc.lat - req.body.pickUpLoc.lat;
            var dy_p = results[i].pickUpLoc.lng - req.body.pickUpLoc.lng;
            var pick = (dx_p * dx_p + dy_p * dy_p <= Math.pow(results[i].pickUpLoc.range * 0.01, 2));
            var dx_d = results[i].dropOffLoc.lat - req.body.dropOffLoc.lat;
            var dy_d = results[i].dropOffLoc.lng - req.body.dropOffLoc.lng;
            var drop = (dx_d * dx_d + dy_d * dy_d <= Math.pow(results[i].dropOffLoc.range * 0.01, 2));
            if (pick && drop)
                ret_ride.push(results[i]);
        }
        return res.json({'success': true, 'code': error.no_error, 'data': ret_ride});
    });
});

router.post('/apply_to_join', function (req, res) {
    if (!req.body.ride)
        res.json({'success': false, 'code': error.key_information_missing});
    else {
        Ride.findById(req.body.ride, function (err, ride) {
            if (err)
                return res.json({'success': false, 'code': error.ride_not_found});
            if (ride.driver == req.decoded.id)
                return res.json({'success': false, 'code': error.join_your_own_ride});
            if (!ride.valid)
                return res.json({'success': false, 'code': error.already_deleted});
            ride.applications.push({
                userID: req.decoded.id,
                seatsReserved: req.body.seats || 1,
                note: req.body.note || null,
                accepted: null
            });
            ride.save(function (err) {
                if (err) return res.json({'success': false, 'code': error.save_failed, 'info': err});
                return res.json({'success': true, 'code': error.no_error});
            });
        });
    }
});

router.post('/respond_to_ride', function (req, res) {
    if (!req.body.ride || !req.body.accept || !req.body.application)
        res.json({'success': false, 'code': error.key_information_missing});
    else {
        Ride.findById(req.body.ride, function (err, ride) {
            if (err)
                return res.json({'success': false, 'code': error.ride_not_found});
            if (ride.driver != req.decoded.id)
                return res.json({'success': false, 'code': error.edit_others_ride});
            if (!ride.valid)
                return res.json({'success': false, 'code': error.already_deleted});
            var application = ride.applications.id(req.body.application);
            if (!application)
                res.json({'success': false, 'code': error.application_not_existing});
            else if (application.accepted)
                res.json({'success': false, 'code': error.application_already_responded});
            else {
                if (req.body.accepted) {
                    if (ride.totalSeats - ride.occupiedSeats < application.seatsReserved)
                        return res.json({'success': false, 'code': error.not_enough_seats});
                    else
                        ride.occupiedSeats += application.seatsReserved;
                }
                application.accepted = req.body.accept;
                ride.save(function (err) {
                    if (err) return res.json({'success': false, 'code': error.save_failed, 'info': err});
                    res.json({'success': true, 'code': error.no_error});
                });
            }
        });
    }
});

router.post('/post_ride', function (req, res) {
    if (!req.body.departDate || !Date.parse(req.body.departDate.from) || !Date.parse(req.body.departDate.to))
        res.json({'success': false, 'code': error.bad_data});
    else if (!req.body.totalSeats || !req.body.pickUpLoc || !req.body.dropOffLoc)
        res.json({'success': false, 'code': error.key_information_missing});
    else {
        User.findById(req.decoded.id, function (err, user) {
            if (err) throw err;
            if (user.driverPermission) {
                var newRide = new Ride({
                    driver: req.decoded.id,
                    departDate: {
                        from: new Date(req.body.departDate.from),
                        to: new Date(req.body.departDate.to)
                    },
                    pickUpLoc: {
                        lat: req.body.pickUpLoc.lat,
                        lng: req.body.pickUpLoc.lng,
                        range: req.body.pickUpLoc.range
                    },
                    dropOffLoc: {
                        lat: req.body.dropOffLoc.lat,
                        lng: req.body.dropOffLoc.lng,
                        range: req.body.dropOffLoc.range
                    },
                    showNumber: req.body.showNumber || false,
                    totalSeats: req.body.totalSeats,
                    price: req.body.price || null
                });
                newRide.save(function (err) {
                    if (err) throw err;
                    res.json({
                        'success': true,
                        'code': error.no_error
                    });
                });
            }
            else {
                res.json({
                    'success': false,
                    'code': error.no_permission
                });
            }
        });
    }
});

router.post('/edit_ride', function (req, res) {
    if (!req.body.ride)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.ride_not_found});
        else if (ride.driver != req.decoded.id)
            return res.json({'success': false, 'code': error.edit_others_ride});
        else if (ride.applications.length != 0)
            return res.json({'success': false, 'code': error.clear_applications_before_editing});
        ride.departDate.from = req.body.departDate.from ? new Date(req.body.departDate.from) : ride.departDate.from;
        ride.departDate.to = req.body.departDate.to ? new Date(req.body.departDate.to) : ride.departDate.to;
        ride.pickUpLoc.lat = req.body.pickUpLoc.lat || ride.pickUpLoc.lat;
        ride.pickUpLoc.lng = req.body.pickUpLoc.lng || ride.pickUpLoc.lng;
        ride.pickUpLoc.range = req.body.pickUpLoc.range || ride.pickUpLoc.range;
        ride.dropOffLoc.lat = req.body.dropOffLoc.lat || ride.dropOffLoc.lat;
        ride.dropOffLoc.lng = req.body.dropOffLoc.lng || ride.dropOffLoc.lng;
        ride.dropOffLoc.range = req.body.dropOffLoc.range || ride.dropOffLoc.range;
        ride.price = req.body.price || ride.price;
        ride.save(function (err) {
            if (err) return res.json({'success': false, 'code': error.save_failed});
            else return res.json({'success': true, 'code': error.no_error});
        });
    });
});

router.post('/update_ride_info', function (req, res) {
    if (!req.body.ride)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.ride_not_found});
        else if (ride.driver != req.decoded.id)
            return res.json({'success': false, 'code': error.edit_others_ride});
        else if (!ride.valid)
            return res.json({'success': false, 'code': error.already_deleted});
        ride.showNumber = req.body.showNumber || ride.showNumber;
        ride.totalSeats = req.body.totalSeats || ride.totalSeats;
        ride.save(function (err) {
            if (err) return res.json({'success': false, 'code': error.save_failed});
            else return res.json({'success': true, 'code': error.no_error});
        });
    });
});

router.post('/delete_ride', function (req, res) {
    if (!req.body.ride)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.ride_not_found});
        else if (ride.driver != req.decoded.id)
            return res.json({'success': false, 'code': error.edit_others_ride});
        else if (!ride.valid)
            return res.json({'success': false, 'code': error.already_deleted});
        ride.valid = false;
        User.findById(req.decoded.id, function (err, user) {
            if (err)
                return res.json({'success': false, 'code': error.db_error});
            for (var i = 0; i < ride.applications.length; i++) {
                if (ride.applications[i].valid) {
                    user.comments.push({
                        from: ride.applications[i].userID,
                        order: ride._id,
                        content: "Default negative review due to cancelling this ride",
                        rate: 0
                    });
                }
            }
            user.save(function (err) {
                if (err) return res.json({'success': false, 'code': error.db_error});
            });
        });
        ride.save(function (err) {
            if (err) return res.json({'success': false, 'code': error.db_error});
            return res.json({'success': true, 'code': error.no_error});
        });
    });
});

router.post('/quit_ride', function (req, res) {
    if (!req.body.ride || !req.body.application)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.ride_not_found});
        else if (ride.driver == req.decoded.id)
            return res.json({'success': false, 'code': error.join_your_own_ride});
        else if (!ride.valid)
            return res.json({'success': false, 'code': error.already_deleted});
        var application = ride.applications.id(req.body.application);
        if (!application.valid)
            return res.json({'success': false, 'code': error.already_deleted});
        else if (application.userID != req.decoded.id)
            return res.json({'success': false, 'code': error.edit_others_ride});
        else
            application.valid = false;
        User.findById(req.decoded.id, function (err, user) {
            if (err)
                return res.json({'success': false, 'code': error.db_error});
            user.comments.push({
                from: ride.driver,
                order: ride._id,
                content: "Default negative review due to quitting this ride",
                rate: 0
            });
            user.save(function (err) {
                if (err) return res.json({'success': false, 'code': error.db_error});
            });
        });
        ride.save(function (err) {
            if (err) return res.json({'success': false, 'code': error.db_error});
            return res.json({'success': true, 'code': error.no_error});
        });
    });
});




router.get('/get_unprocessed_orders', function (req, res) {
    Ride.find({'driver': req.decoded.id, 'applications.accepted': null, valid: true})
        .sort('-postDate')
        .exec(function (err, results) {
            if (err) return res.json({'success': false, 'code': error.db_error});
            return res.json({'success': true, 'code': error.no_error, 'data': results});
        });
});

router.get('/get_offering_orders', function (req, res) {
    Ride.find({'driver': req.decoded.id}).sort('-postDate').exec(function (err, results) {
        if (err) return res.json({'success': false, 'code': error.db_error});
        return res.json({'success': true, 'code': error.no_error, 'data': results});
    });
});

router.get('/get_applied_orders', function (req, res) {
    Ride.find({'applications.userID': req.decoded.id}).sort('-postDate').exec(function (err, results) {
        if (err) return res.json({'success': false, 'code': error.db_error});
        return res.json({'success': true, 'code': error.no_error, 'data': results});
    });
});

module.exports = router;