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

router.get('/chat_list', function (req, res) {
    Conv.find({$or: [{user1: req.decoded.id}, {user2: req.decoded.id}]})
        .select({user1: 1, user2: 1, createdAt: 1, messages:{$slice: -1}})
        .populate('user1', 'firstName lastName')
        .populate('user2', 'firstName lastName')
        .exec(function (err, results) {
            if (err)
                return res.json({code: error.db_error, info: err});
            var formatted = [];
            for (var i = 0; i < results.length; i++) {
                var tmp = {createdAt: results[i].createdAt, messages:results[i].messages[0]};
                if (results[i].user1.id == req.decoded.id)
                    tmp['user'] = results[i].user2;
                else
                    tmp['user'] = results[i].user1;
                formatted.push(tmp);
            }
            return res.json({code: error.no_error, data: formatted});
        });
});

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

router.post('/get_history', function (req, res) {
    if (!req.body.user)
        return res.json({'success': false, 'code': error.key_information_missing});
    if (req.decoded.id == req.body.user)
        return res.json({'success': false, 'code': error.send_msg_to_yourself});
    Conv.findOne({$or: [{user1: req.body.user, user2: req.decoded.id}, {user2: req.body.user, user1: req.decoded.id}]})
        .populate('messages.from', 'firstName lastName')
        .exec(function (err, result) {
            if (err) return res.json({code: error.db_error, info: err});
            if (result == null)
                return res.json([]);
            var ret = [];
            for (var i = result.messages.length - 1; i >= 0; i--) {
                var tmp_user = {
                    _id: result.messages[i].from.id,
                    name: result.messages[i].from.firstName + ' ' + result.messages[i].from.lastName
                };
                var tmp = {
                    createdAt: result.messages[i].createdAt,
                    text: result.messages[i].text,
                    _id: result.messages[i].id,
                    user: tmp_user
                };
                ret.push(tmp);
            }
            return res.json(ret);
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