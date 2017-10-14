var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var morgan = require("morgan");
var schedule = require('node-schedule');

var index = require("./routes/index");
var user_api = require('./routes/user_api');
var ride_api = require('./routes/ride_api');
var config = require('./config');
var User = require('./model/user');

schedule.scheduleJob('1 * * * * *', function(){
    User.find(function (err, users) {
        if (err) throw err;
        for (var i = 0; i < users.length; i++) {
            if (users[i].comments.length != 0) {
                var avgRate = 0;
                for (var j = 0; j < users[i].comments.length; j++) {
                    avgRate += users[i].comments[j].rate;
                }
                avgRate /= users[i].comments.length;
                users[i].score = avgRate;
                users[i].save(function (err) {
                    if (err) throw err;
                });
            }
        }
    });
});

var app = express();

app.listen(config.port, function () {
    console.log("Server running on port", config.port);
});

//views

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.engine("html", require("ejs").renderFile);

//middlewares

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));

//Routes

app.use("/", index);
app.use("/users", user_api);
app.use("/rides", ride_api);