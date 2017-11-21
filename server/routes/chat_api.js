var express = require("express");
var mongoose = require("mongoose");

var config = require("../config");
var error = require('../error');
var auth = require('./authenticate');
var User = require("../model/user");
var Conv = require('../model/conversation');

var router = express.Router();

mongoose.connect(config.database);

router.post('/test', function (req, res) {
    return res.json(req);
});

router.use(auth);

router.post('/send', function (req, res) {
    if (!req.body.to || !req.body.text)
        return res.json({'success': false, 'code': error.key_information_missing});
    if (req.decoded.id == req.body.to)
        return res.json({'success': false, 'code': error.send_msg_to_yourself});
    Conv.findOne({$or: [{user1: req.body.to, user2: req.decoded.id}, {user2: req.body.to, user1: req.decoded.id}]})
        .exec(function (err, result) {
            if (err) return res.json({'code': error.db_error, 'info': err});
            if (result == null) {
                var newConv = new Conv({
                    user1: req.decoded.id,
                    user2: req.body.to
                });
                newConv.messages.push({
                    from: req.decoded.id,
                    to: req.body.to,
                    text: req.body.text
                });
                newConv.save(function (err) {
                    if (err) return res.json({'code': error.db_error, 'info': err});
                    return res.json({'code': error.no_error});
                });
            }
            else {
                result.messages.push({
                    from: req.decoded.id,
                    to: req.body.to,
                    text: req.body.text
                });
                result.save(function (err) {
                    if (err) return res.json({'code': error.db_error, 'info': err});
                    return res.json({'code': error.no_error});
                });
            }
        });
});

router.get('/check', function (req, res) {
    Conv.find({$or: [{user1: req.decoded.id}, {user2: req.decoded.id}]})
        .exec(function (err, results) {
            if (err)
                return res.json({code: error.db_error, info: err});
            if (results.length == 0)
                return res.json({code: error.no_error, info: false});
            else
                return res.json({code: error.no_error, info: true});
        });
});

module.exports = router;