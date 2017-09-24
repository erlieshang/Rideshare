var express = require("express");
var router = express.Router();
var mongojs = require("mongojs");

var db = mongojs("mongodb://eshang:1234@ds149134.mlab.com:49134/rideshare");

router.get("/rideshare", function (req, res, next) {
    db.users.find(function (err, users) {
        if (err)
            res.send(err);
        res.json(users);
    })
});

module.exports = router;