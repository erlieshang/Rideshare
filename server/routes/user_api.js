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
var auth = require('./authenticate');

var router = express.Router();
var upload = multer({dest: './uploads/'});
var transporter = config.transporter;
var email_reg = /^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$/;

mongoose.connect(config.database);
grid.mongo = mongoose.mongo;

router.post('/test', function (req, res) {
    return res.json(req.body);
});

router.post('/register', function (req, res) {
    if (!req.body.email || !req.body.password || !email_reg.test(req.body.email))
        res.json({'success': false, 'code': error.key_information_missing});
    else {
        User.findOne({email: req.body.email}, function (err, user) {
            if (err) throw err;
            if (user) {
                return res.json({
                    'success': false,
                    'code': error.user_existed
                });
            }
            var verification_code = Math.ceil(Math.random() * 999999);
            var gender = true;
            if (req.body.gender == 'female')
                gender = false;
            var newUser = new User({
                firstName: req.body.firstName || null,
                lastName: req.body.lastName || null,
                email: req.body.email,
                number: req.body.number || null,
                password: bcrypt.hashSync(req.body.password),
                verifyCode: verification_code,
                gender: gender,
                'payment.paypal': req.body.paypal || null
            });
            newUser.save(function (err) {
                if (err) res.send(err);
                else {
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
                            });
                        }
                    });
                    opts.text = opts.text.replace(String(verification_code), "");
                }
            });
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
    User.findOne({email: req.body.email}, function (err, user) {
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
                    expiresIn: '1y'
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

router.use(auth);

router.post('/change_password', function (req, res) {
    if(!req.body.old_pass || !req.body.new_pass)
        res.json({'success': false, 'code': error.key_information_missing});
    else {
        User.findById(req.decoded.id, function (err, user) {
            if (err) throw err;
            if (!bcrypt.compareSync(String(req.body.old_pass), user.password)) {
                res.json({
                    'success': false,
                    'code': error.wrong_password
                });
            }
            else {
                user.password = bcrypt.hashSync(req.body.new_pass);
                user.save(function (err, updated) {
                    if (err)
                        res.json({'success': false, 'code': error.unknown});
                    else
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

router.post('/upload_avatar', upload.single('avatar'), function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) throw err;
        var readStream = fs.createReadStream(req.file.path);
        var gfs = grid(mongoose.connection.db);
        var writeStream = gfs.createWriteStream({filename: req.file.filename});
        readStream.pipe(writeStream);
        if (writeStream.id) {
            var previous_avatar = user.avatar;
            user.avatar = writeStream.id;
            user.save(function (err, updated) {
                if (err) throw err;
                res.json({
                    'success': true,
                    'code': error.no_error,
                    'info': updated
                });
            });
            if (previous_avatar)
                gfs.remove({_id: previous_avatar}, function (err) {
                    if (err) throw err;
                });
        }
        else
            res.json({
                'success': false,
                'code': error.upload_failed
            });
    });
});

router.get('/delete_avatar', function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) throw err;
        var gfs = grid(mongoose.connection.db);
        var previous_avatar = user.avatar;
        user.avatar = null;
        user.save(function (err, updated) {
            if (err) throw err;
            res.json({
                'success': true,
                'code': error.no_error,
                'info': updated
            });
        });
        gfs.remove({_id: previous_avatar}, function (err) {
            if (err) throw err;
        });

    });
});

router.get('/get_avatar', function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) throw err;
        var gfs = grid(mongoose.connection.db);
        gfs.findOne({_id: user.avatar}, function (err, file) {
            if (err) throw err;
            if (file.length > 0) {
                res.set('Content-Type', 'image/jpeg');
                var readStream = gfs.createReadStream({_id: user.avatar});
                readStream.pipe(res);
            }
            else
                res.json({
                    'success': false,
                    'code': error.file_not_found
                });
        });
    });
});

router.post('/upload_alipay', upload.single('alipay'), function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) throw err;
        var readStream = fs.createReadStream(req.file.path);
        var gfs = grid(mongoose.connection.db);
        var writeStream = gfs.createWriteStream({filename: req.file.filename});
        readStream.pipe(writeStream);
        if (writeStream.id) {
            var previous = user.payment.alipay;
            user.payment.alipay = writeStream.id;
            user.save(function (err, updated) {
                if (err) throw err;
                if (previous)
                    gfs.remove({_id: previous}, function (err) {
                        if (err) throw err;
                    });
                res.json({
                    'success': true,
                    'code': error.no_error,
                    'info': updated
                });
            });
        }
        else
            res.json({
                'success': false,
                'code': error.upload_failed
            });
    });
});

router.get('/delete_alipay', function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) throw err;
        var gfs = grid(mongoose.connection.db);
        var previous = user.payment.alipay;
        user.user.payment.alipay = null;
        user.save(function (err, updated) {
            if (err) throw err;
            gfs.remove({_id: previous}, function (err) {
                if (err) throw err;
            });
            res.json({
                'success': true,
                'code': error.no_error,
                'info': updated
            });
        });
    });
});

router.get('/get_alipay', function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) throw err;
        var gfs = grid(mongoose.connection.db);
        gfs.findOne({_id: user.payment.alipay}, function (err, file) {
            if (err) throw err;
            if (file.length > 0) {
                res.set('Content-Type', 'image/jpeg');
                var readStream = gfs.createReadStream({_id: user.payment.alipay});
                readStream.pipe(res);
            }
            else
                res.json({
                    'success': false,
                    'code': error.file_not_found
                });
        });
    });
});

router.post('/upload_wechat', upload.single('wechat'), function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) throw err;
        var readStream = fs.createReadStream(req.file.path);
        var gfs = grid(mongoose.connection.db);
        var writeStream = gfs.createWriteStream({filename: req.file.filename});
        readStream.pipe(writeStream);
        if (writeStream.id) {
            var previous = user.payment.wechat;
            user.payment.wechat = writeStream.id;
            user.save(function (err, updated) {
                if (err) throw err;
                if (previous)
                    gfs.remove({_id: previous}, function (err) {
                        if (err) throw err;
                    });
                res.json({
                    'success': true,
                    'code': error.no_error,
                    'info': updated
                });
            });
        }
        else
            res.json({
                'success': false,
                'code': error.upload_failed
            });
    });
});

router.get('/delete_wechat', function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) throw err;
        var gfs = grid(mongoose.connection.db);
        var previous = user.payment.wechat;
        user.user.payment.wechat = null;
        user.save(function (err, updated) {
            if (err) throw err;
            gfs.remove({_id: previous}, function (err) {
                if (err) throw err;
            });
            res.json({
                'success': true,
                'code': error.no_error,
                'info': updated
            });
        });
    });
});

router.get('/get_wechat', function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) throw err;
        var gfs = grid(mongoose.connection.db);
        gfs.findOne({_id: user.payment.wechat}, function (err, file) {
            if (err) throw err;
            if (file.length > 0) {
                res.set('Content-Type', 'image/jpeg');
                var readStream = gfs.createReadStream({_id: user.payment.wechat});
                readStream.pipe(res);
            }
            else
                res.json({
                    'success': false,
                    'code': error.file_not_found
                });
        });
    });
});

router.post('/edit_profile', function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) return res.json({'code': error.db_error, 'info': err});
        else {
            user.firstName = req.body.firstName || user.firstName;
            user.lastName = req.body.lastName || user.lastName;
            user.number = req.body.number || user.number;
            user.gender = req.body.gender || user.gender;
            user.payment.paypal = req.body.paypal || user.payment.paypal;
            user.save(function (err) {
                if (err) return res.json({'code': error.db_error, 'info': err});
                else return res.json({'code': error.no_error});
            });
        }
    });
});

router.post('/update_email', function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) res.json(err);
        else if (!req.body.email || !email_reg.test(req.body.email))
            res.json({
                'success': false,
                'code': error.key_information_missing
            });
        else {
            var verification_code = Math.ceil(Math.random() * 999999);
            user.email = req.body.email;
            user.verified = false;
            user.verifyCode = verification_code;
            user.save(function (err) {
                if (err) res.json(err);
                else {
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
        }
    });
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

router.get('/get_notifications', function (req, res) {
    User.finfById(req.decoded.id, function (err, user) {
        if (user.notifications.length == 0)
            return res.json({'code': error.no_notifications});
        res.json({'code': error.new_notifications, 'data': user.notifications});
        user.notifications = [];
        user.save(function (err) {
            if (err) throw err;
        });
    });

});


router.get("/info", function (req, res) {
    User.findById(req.decoded.id, function (err, user) {
        if (err) return res.json({'code': error.db_error});
        if (user)
            return res.json({'code': error.no_error, 'data': user});
        else
            return res.json({'code': error.user_not_found})
    });
});

module.exports = router;