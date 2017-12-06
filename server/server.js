var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var morgan = require("morgan");
var scheduler = require('node-schedule');

var index = require("./routes/index");
var privacy = require("./routes/privacy");
var user_api = require('./routes/user_api');
var ride_api = require('./routes/ride_api');
var chat_api = require('./routes/chat_api');
var config = require('./config');
var updateScore = require('./update_score');

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
app.use("/privacy", privacy);
app.use("/users", user_api);
app.use("/rides", ride_api);
app.use("/chat", chat_api);

//scheduled job
scheduler.scheduleJob('1 * * * * *', updateScore);