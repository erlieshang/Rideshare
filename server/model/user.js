var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var commentSchema = new Schema({
    from: {type: Schema.Types.ObjectId, required: true},
    content: String,
    date: {type: Date, default: Date.now },
    rate: Number
});

var userSchema = new Schema({
    firstName: String,
    lastName: String,
    email: {type: String, lowercase: true, required: true, unique: true},
    number: String,
    avatar: Schema.Types.ObjectId,
    admin: {type: Boolean, default: false},
    password: {type: String, required: true},
    score: {type: Number, default: 10},
    verified: {type: Boolean, default: false},
    verifyCode: Number,
    gender: Boolean, //true for male, false for female
    driverPermission: {type: Boolean, default: false},
    driversLicense: {type: String, default: ''},
    vehiclePlate: {type: String, default: ''},
    comments: [commentSchema]
    }, {
        runSettersOnQuery: true
    });

module.exports = mongoose.model('User', userSchema);
