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
        'departDate.to': {$gte: req.body.departDate}
    }).
    sort('-postDate').
    exec(function (err, results) {
        if (err) return res.json({'success': false, 'code': error.db_error});
        
        return res.json(results);
    });
});

router.post('/apply_to_join', function (req, res) {
    if (!req.body.ride)
        res.json({'success': false, 'code': error.key_information_missing});
    else {
        Ride.findById(req.body.ride, function (err, ride) {
            if (err) return res.json({'success': false, 'code':error.ride_not_found});
            if (ride.driver == req.decoded.id) return res.json({'success': false, 'code':error.join_your_own_ride});
            ride.applications.push({
                userID: req.decoded.id,
                seatsReserved: req.body.seats || 1,
                note: req.body.note || null,
                accepted: null
            });
            ride.save(function (err) {
                if (err) return res.json({'success': false, 'code':error.save_failed, 'info': err});
                return res.json({'success': true, 'code':error.no_error, 'info': err});
            });
        });
    }
});

router.post('/respond_to_ride', function (req, res) {
    if (!req.body.ride || !req.body.accept || !req.body.application)
        res.json({'success': false, 'code': error.key_information_missing});
    else {
        Ride.findById(req.body.ride, function (err, ride) {
            if (err) return res.json({'success': false, 'code':error.ride_not_found});
            if (ride.driver != req.decoded.id) return res.json({'success': false, 'code':error.edit_others_ride});
            var application = ride.applications.id(req.body.application);
            if (!application)
                res.json({'success': false, 'code': error.application_not_existing});
            else if (application.accepted)
                res.json({'success': false, 'code': error.application_already_responded});
            else {
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
                    totalSeats: req.body.totalSeats || -1,
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

module.exports = router;