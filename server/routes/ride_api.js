var express = require("express");
var mongoose = require("mongoose");
var unirest = require('unirest');

var config = require("../config");
var error = require('../error');
var auth = require('./authenticate');
var ride_valid = require('./ride_valild');
var notification = require('./notification');
var User = require("../model/user");
var Ride = require('../model/ride');

var router = express.Router();

mongoose.connect(config.database);

router.use(auth);
router.use(ride_valid);

router.post('/test', function (req, res) {

});


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
        var pick_up = {};
        var drop_off = {};
        unirest.get(config.map_url)
            .query({'address': req.body.pickUpLoc})
            .query({'key': config.map_key})
            .end(function (response) {
                if (response.error) {
                    return res.json({'code': error.map_error});
                } else {
                    pick_up.lat = response.body.results[0].geometry.location.lat;
                    pick_up.lng = response.body.results[0].geometry.location.lng;
                    unirest.get(config.map_url)
                        .query({'address': req.body.dropOffLoc})
                        .query({'key': config.map_key})
                        .end(function (response) {
                            if (response.error) {
                                return res.json({'code': error.map_error});
                            } else {
                                drop_off.lat = response.body.results[0].geometry.location.lat;
                                drop_off.lng = response.body.results[0].geometry.location.lng;
                                for (var i = 0; i < results.length; i++) {
                                    var dx_p = results[i].pickUpLoc.lat - pick_up.lat;
                                    var dy_p = results[i].pickUpLoc.lng - pick_up.lng;
                                    var pick = (dx_p * dx_p + dy_p * dy_p <= Math.pow(results[i].pickUpLoc.range * 0.01, 2));
                                    var dx_d = results[i].dropOffLoc.lat - drop_off.lat;
                                    var dy_d = results[i].dropOffLoc.lng - drop_off.lng;
                                    var drop = (dx_d * dx_d + dy_d * dy_d <= Math.pow(results[i].dropOffLoc.range * 0.01, 2));
                                    if (pick && drop)
                                        ret_ride.push(results[i]);
                                }
                                return res.json({'success': true, 'code': error.no_error, 'data': ret_ride});
                            }
                        });
                }
            });
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
            ride.applications.push({
                userID: req.decoded.id,
                seatsReserved: req.body.seats || 1,
                note: req.body.note || null,
                accepted: null
            });
            User.findById(ride.driver, function (err, user) {
                if (err) return res.json({'success': false, 'code': error.db_error});
                user.notifications.push(notification.someone_joined);
                user.save(function (err) {
                    if (err) return res.json({'success': false, 'code': error.save_failed});
                });
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
            if (err) return res.json({'success': false, 'code': error.db_error});
            if (user.driverPermission) {
                var pick_up = {};
                var drop_off = {};
                unirest.get(config.map_url)
                    .query({'address': req.body.pickUpLoc.address})
                    .query({'key': config.map_key})
                    .end(function (response) {
                        if (response.error) {
                            return res.json({'code': error.map_error});
                        } else {
                            pick_up.lat = response.body.results[0].geometry.location.lat;
                            pick_up.lng = response.body.results[0].geometry.location.lng;
                            pick_up.formattedAddress = response.body.results[0].formatted_address;
                            unirest.get(config.map_url)
                                .query({'address': req.body.dropOffLoc.address})
                                .query({'key': config.map_key})
                                .end(function (response) {
                                    if (response.error) {
                                        return res.json({'code': error.map_error});
                                    } else {
                                        drop_off.lat = response.body.results[0].geometry.location.lat;
                                        drop_off.lng = response.body.results[0].geometry.location.lng;
                                        drop_off.formattedAddress = response.body.results[0].formatted_address;
                                        var newRide = new Ride({
                                            driver: req.decoded.id,
                                            departDate: {
                                                from: new Date(req.body.departDate.from),
                                                to: new Date(req.body.departDate.to)
                                            },
                                            pickUpLoc: {
                                                lat: pick_up.lat,
                                                lng: pick_up.lng,
                                                range: req.body.pickUpLoc.range,
                                                formattedAddress: pick_up.formattedAddress
                                            },
                                            dropOffLoc: {
                                                lat: drop_off.lat,
                                                lng: drop_off.lng,
                                                range: req.body.dropOffLoc.range,
                                                formattedAddress: drop_off.formattedAddress
                                            },
                                            showNumber: req.body.showNumber || false,
                                            totalSeats: req.body.totalSeats,
                                            price: req.body.price || null
                                        });
                                        newRide.save(function (err) {
                                            if (err) return res.json({'code': error.db_error});
                                            res.json({
                                                'success': true,
                                                'code': error.no_error
                                            });
                                        });

                                    }
                                });
                        }
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

router.post('/edit_key_information_ride', function (req, res) {
    if (!req.body.ride)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.ride_not_found});
        else if (ride.driver != req.decoded.id)
            return res.json({'success': false, 'code': error.edit_others_ride});
        else if (Date.now() - ride.departDate.from <= 60000)
            return res.json({'success': false, 'code': error.cannot_edit_ride_within_1_hour});
        ride.departDate.from = req.body.departDate.from ? new Date(req.body.departDate.from) : ride.departDate.from;
        ride.departDate.to = req.body.departDate.to ? new Date(req.body.departDate.to) : ride.departDate.to;
        ride.pickUpLoc.lat = req.body.pickUpLoc.lat || ride.pickUpLoc.lat;
        ride.pickUpLoc.lng = req.body.pickUpLoc.lng || ride.pickUpLoc.lng;
        ride.pickUpLoc.range = req.body.pickUpLoc.range || ride.pickUpLoc.range;
        ride.dropOffLoc.lat = req.body.dropOffLoc.lat || ride.dropOffLoc.lat;
        ride.dropOffLoc.lng = req.body.dropOffLoc.lng || ride.dropOffLoc.lng;
        ride.dropOffLoc.range = req.body.dropOffLoc.range || ride.dropOffLoc.range;
        ride.price = req.body.price || ride.price;
        for (var i = 0; i < ride.applications.length; i++) {
            User.findById(ride.applications[i].userID, function (err, user) {
                if (err) return res.json({'success': false, 'code': error.db_error});
                user.notifications.push(notification.ride_information_changed);
                user.save(function (err) {
                    if (err) return res.json({'success': false, 'code': error.save_failed});
                });
            });
        }
        ride.save(function (err) {
            if (err) return res.json({'success': false, 'code': error.save_failed});
            else return res.json({'success': true, 'code': error.no_error});
        });
    });
});

router.post('/edit_ride', function (req, res) {
    if (!req.body.ride)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.ride_not_found});
        else if (ride.driver != req.decoded.id)
            return res.json({'success': false, 'code': error.edit_others_ride});
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
        ride.valid = false;
        for (var i = 0; i < ride.applications.length; i++) {
            User.findById(ride.applications[i].userID, function (err, user) {
                if (err) return res.json({'success': false, 'code': error.db_error});
                user.notifications.push(notification.ride_cancelled);
                user.save(function (err) {
                    if (err) return res.json({'success': false, 'code': error.save_failed});
                });
            });
        }
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

//passengers quit within 1 hour before the ride starts, get default bad rate
router.post('/quit_ride', function (req, res) {
    if (!req.body.ride || !req.body.application)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.ride_not_found});
        else if (ride.driver == req.decoded.id)
            return res.json({'success': false, 'code': error.join_your_own_ride});
        var application = ride.applications.id(req.body.application);
        if (!application.valid)
            return res.json({'success': false, 'code': error.already_deleted});
        else if (application.userID != req.decoded.id)
            return res.json({'success': false, 'code': error.edit_others_ride});
        else {
            application.valid = false;
            ride.occupiedSeats -= application.seatsReserved;
            User.findById(ride.driver, function (err, user) {
                if (err) return res.json({'success': false, 'code': error.db_error});
                user.notifications.push(notification.someone_quited);
                user.save(function (err) {
                    if (err) return res.json({'success': false, 'code': error.save_failed});
                });
            });
            if (Date.now() - ride.departDate.from <= 60000) {
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
            }
            ride.save(function (err) {
                if (err) return res.json({'success': false, 'code': error.db_error});
                return res.json({'success': true, 'code': error.no_error});
            });
        }
    });
});

router.post('/passenger_on_board', function (req, res) {
    if (!req.body.ride || !req.body.application)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.ride_not_found});
        else if (ride.driver == req.decoded.id)
            return res.json({'success': false, 'code': error.join_your_own_ride});
        var application = ride.applications.id(req.body.application);
        if (!application.valid)
            return res.json({'success': false, 'code': error.application_invalid});
        else if (application.userID != req.decoded.id)
            return res.json({'success': false, 'code': error.edit_others_ride});
        else {
            application.onBoard = true;
            ride.save(function (err) {
                if (err) return res.json({'success': false, 'code': error.db_error});
                return res.json({'success': true, 'code': error.no_error});
            });
        }
    });
});

router.post('/driver_all_on_board', function (req, res) {
    if (!req.body.ride)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.ride_not_found});
        else if (ride.driver != req.decoded.id)
            return res.json({'success': false, 'code': error.edit_others_ride});
        ride.allOnBoard = true;
        ride.save(function (err) {
            if (err) return res.json({'success': false, 'code': error.db_error});
            return res.json({'success': true, 'code': error.no_error});
        });
    });
});

router.post('/post_comment', function (req, res) {
    if (!req.body.ride || !req.body.user || !req.body.type || !req.body.rate)
        res.json({'success': false, 'code': error.key_information_missing});
    else {
        User.findById(req.body.user, function (err, user) {
            if (err)
                return res.json({'success': false, 'code': error.db_error});
            user.comments.push({
                from: req.decoded.id,
                order: req.body.ride,
                content: req.body.content || '',
                type: req.body.type,
                rate: req.body.rate
            });
            user.save(function (err) {
                if (err) return res.json({'success': false, 'code': error.save_failed, 'info': err});
                return res.json({'success': true, 'code': error.no_error});
            });
        });
    }
});


router.get('/ride', function (req, res) {
    if (!req.body.ride)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.db_error});
        res.json({'success': true, 'code': error.no_error, 'data': ride});
    });
});

//get applications for a particular ride (no whether valid or not)
router.get('/application', function (req, res) {
    if (!req.body.ride)
        return res.json({'success': false, 'code': error.key_information_missing});
    Ride.findById(req.body.ride, function (err, ride) {
        if (err)
            return res.json({'success': false, 'code': error.db_error});
        if (ride.driver == req.decoded.id)
            return res.json({'success': false, 'code': error.join_your_own_ride});
        var results = [];
        for (var i = 0; i < ride.applications.length; i++) {
            if (ride.applications[i].UserID == req.decoded.id)
                results.push(ride.applications[i]);
        }
        if (results.length > 0)
            return res.json({'success': false, 'code': error.no_error, 'data': results});
        else
            return res.json({'success': false, 'code': error.user_not_in_applications});
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