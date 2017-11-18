var express = require("express");
var mongoose = require("mongoose");

var config = require("../config");
var error = require('../error');
var auth = require('./authenticate');
var User = require("../model/user");
var Msg = require('../model/message');

var router = express.Router();

mongoose.connect(config.database);

router.post('/test', function (req, res) {
    return res.json(req);
});

router.use(auth);

router.post('/send', function (req, res) {
    if (!req.body.to || !req.body.text)
        return res.json({'success': false, 'code': error.key_information_missing});
    var newMsg = new Msg({
        from: req.decoded.id,
        to: req.body.to,
        text: req.body.text
    });
    newMsg.save(function (err) {
        if (err)
            return res.json({code: error.db_error, info: err});
        else
            return res.json({code: error.no_error});
    });
});

router.get('/check', function (req, res) {
    Msg.find({to: req.decoded.id, sent: false})
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