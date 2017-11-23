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
        .populate('user1', 'firstName lastName')
        .populate('user2', 'firstName lastName')
        .exec(function (err, results) {
            if (err)
                return res.json({code: error.db_error, info: err});
            var formatted = [];
            var total_unread = 0;
            for (var i = 0; i < results.length; i++) {
                var tmp = {createdAt: results[i].createdAt, messages:results[i].messages[results[i].messages.length - 1]};
                var unread = 0;
                if (results[i].user1.id == req.decoded.id)
                    tmp['user'] = results[i].user2;
                else
                    tmp['user'] = results[i].user1;
                for (var j = results[i].messages.length - 1; j >= 0; j--) {
                    if (results[i].messages[j].to == req.decoded.id) {
                        if (results[i].messages[j].sent)
                            break;
                        else
                            unread += 1;
                    }
                }
                tmp.unread = unread;
                total_unread += unread;
                formatted.push(tmp);
            }
            return res.json({code: error.no_error, data: formatted, unread: total_unread});
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
                result.messages[i].sent = true;
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
            result.save(function (err) {
                if (err) return res.json({code: error.db_error, info: err});
                return res.json(ret);
            });
        });
});

router.post('/check_conv', function (req, res) {
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
                if (result.messages[i].to != req.decoded.id && !result.messages[i].sent) {
                    result.messages[i].sent = true;
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
            }
            result.save(function (err) {
                if (err) return res.json({code: error.db_error, info: err});
                Conv.find({$or: [{user1: req.decoded.id}, {user2: req.decoded.id}]})
                    .exec(function (err, results) {
                        if (err)
                            return res.json({code: error.db_error, info: err});
                        var total_unread = 0;
                        for (var i = 0; i < results.length; i++) {
                            if (results[i].user1 != req.body.user && results[i].user2 != req.body.user) {
                                var unread = 0;
                                for (var j = results[i].messages.length - 1; j >= 0; j--) {
                                    if (results[i].messages[j].to == req.decoded.id) {
                                        if (results[i].messages[j].sent)
                                            break;
                                        else
                                            unread += 1;
                                    }
                                }
                                total_unread += unread;
                            }
                        }
                        return res.json({code: error.no_error, data: ret, unread: total_unread});
                    });
            });
        });
});

module.exports = router;