var mongoose = require("mongoose");

module.exports = mongoose.model('User', new mongoose.Schema({
    name: String,
    password: String,
    admin: Boolean
}));