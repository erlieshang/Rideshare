var express = require("express");
var mongoose = require("mongoose");
var jwt = require("jsonwebtoken");
var bcrypt = require('bcryptjs');
var multer = require('multer');
var fs = require('fs');
var grid = require('gridfs-stream');

var config = require("../config");
var error = require('../error');
var User = require("../model/user");

var router = express.Router();
var upload = multer({ dest: './uploads/'});
var transporter = config.transporter;

mongoose.connect(config.database);
grid.mongo = mongoose.mongo;

router.post('/upload_avatar', upload.single('avatar'), function (req, res) {
    var readStream = fs.createReadStream(req.file.path);
    var gfs = grid(mongoose.connection.db);
    var writeStream = gfs.createWriteStream({ filename: req.file.filename});
    readStream.pipe(writeStream);
    res.json({
        'code': error.no_error
    });
});

router.post('/register', function (req, res) {
    if (!req.body.email || !req.body.password)
        res.json({'success': false, 'code': error.key_information_missing});
    else {
        var verification_code = Math.ceil(Math.random() * 999999);
        var newUser = new User({
            firstName: req.body.firstName || 'none',
            lastName: req.body.lastName || 'none',
            email: req.body.email,
            number: req.body.number || 'none',
            password: bcrypt.hashSync(req.body.password),
            verifyCode: verification_code,
            gender: req.body.gender || true
        });
        newUser.save(function (err) {
            if (err) res.send(err);
        });
        //sending verification code
        var opts = config.email_content;
        opts.to = req.body.email;
        opts.text += String(verification_code);
        transporter.sendMail(opts, function (err, info) {
            if (err) {
                res.send(err);
            } else {
                res.json({
                    'info': info,
                    'code': error.no_error
                })
            }
        });
    }
});

router.post('/verify', function (req, res) {
    if (!req.body.email || !req.body.code)
        res.json({'success': false, 'code': error.key_information_missing});
    else {
        var query = User.where({email: req.body.email});
        query.findOne(function (err, user) {
            if (err) throw err;
            if (!user) {
                res.json({
                    'success': false,
                    'code': error.user_not_found
                });
            }
            else if (user.verifyCode != Number(req.body.code)) {
                res.json({
                    'success': false,
                    'code': error.wrong_verification_code
                });
            }
            else {
                user.verified = true;
                user.save(function (err, updated) {
                    if (err) throw err;
                    res.json({
                        'success': true,
                        'code': error.no_error,
                        'info': updated
                    });
                });
            }
        });
    }
});

router.post('/get_token', function (req, res) {
    User.findOne({
        email: req.body.email
    }, function (err, user) {
        if (err) throw err;
        if (!user) {
            res.json({
                'success': false,
                'code': error.user_not_found
            });
        }
        else if (!user.verified) {
            res.json({
                'success': false,
                'code': error.user_not_verified
            });
        }
        else {
            if (!bcrypt.compareSync(String(req.body.password), user.password)) {
                res.json({
                    'success': false,
                    'code': error.wrong_password
                });
            }
            else {
                var token = jwt.sign({
                    id: user._id,
                    email: user.email
                }, config.secret, {
                    expiresIn: '1m'
                });
                res.json({
                    'success': true,
                    'code': error.no_error,
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
});

router.post('/apply_for_driver_permission', function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) throw err;
        if (!req.body.driversLicense || !req.body.vehiclePlate)
            res.json({
                'success': false,
                'code': error.key_information_missing
            });
        else {
            user.driversLicense = req.body.driversLicense;
            user.vehiclePlate = req.body.vehiclePlate;
            user.driverPermission = true;
            user.save(function (err, updated) {
                if (err) throw err;
                res.json({
                    'success': true,
                    'code': error.no_error,
                    'info': updated
                });
            });
        }
    });
});



router.get("/users", function (req, res) {
    User.find({}, function (err, users) {
        if (err) throw err;
        res.json(users);
    });
});

module.exports = router;