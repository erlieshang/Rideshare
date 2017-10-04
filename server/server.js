var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var morgan = require("morgan");

var index = require("./routes/index");
var user_api = require('./routes/user_api');
var config = require('./config');

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
app.use("/api/user", user_api);