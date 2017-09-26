var express = require("express");
var mongojs = require("mongojs");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var config = require("../config");
var User = require("../model/user");

var router = express.Router();

// var db = mongojs(config.database);
var transporter = config.transporter;
mongoose.connect(config.database);

router.post("/get_email_code", function (req, res) {
    var data = req.body;
    if (!data.email) {
        res.status(400);
        res.json({
            "error":"No email address!"
        });
    }
    else {
        var opts = config.email_content;
        opts.to = data.email;
        opts.text += '123456';
        transporter.sendMail(opts, function(error, info){
            if (error) {
                res.send(error);
            } else {
                res.send(info);
            }
        });
    }
});

router.get('/setup', function (req, res) {
    var nick = new User({
        name: 'admin',
        password: 'admin',
        admin: true
    });
    nick.save(function (err) {
        if (err) throw err;
        res.json({'success':true});
    });
});

router.post('/get_token', function (req, res) {
    User.findOne({
        name: req.body.name
    }, function (err, user) {
        if (err) throw err;
        if (!user) {
            res.json({
                'success': false,
                'message': 'User not found'
            });
        }
        else {
            if (user.password != req.body.password) {
                res.json({
                    'success': false,
                    'message': 'Wrong password'
                });
            }
            else {
                var token = jwt.sign({
                    id: user._id,
                    name: user.name
                }, config.secret, {
                    expiresIn: '1y'
                });
                res.json({
                    'success': true,
                    'message': 'Authenticate succeed!',
                    'token': token
                });
            }
        }
    });
});

router.use(function(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.body.token || req.param('token') || req.headers['x-access-token'];

    // decode token
    if (token) {
        jwt.verify(token, config.secret, function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: 'Failed to authenticate token.' });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });
    }
    else {
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
});

router.get("/users", function (req, res) {
    User.find({}, function (err, users) {
        if (err) throw err;
        res.json(users);
    });
});
//
// router.post("/rideshare", function (req, res, next) {
//     var info = req.body;
//     console.log(info);
//     if (!info.name) {
//         res.status(400);
//         res.json({
//             error:"Bad data"
//         });
//     }
//     else {
//         db.users.save(info, function (err, saved) {
//             if (err) {
//                 res.send(err);
//             }
//             res.json(saved);
//         })
//     }
// });

module.exports = router;