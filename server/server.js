var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var morgan = require("morgan");

var index = require("./routes/index");
var rideshare = require("./routes/rideshare");

var app = express();

var port = 3000;

app.listen(port, function () {
    console.log("Server running on port", port);
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
app.use("/api", rideshare);