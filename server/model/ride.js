var mongoose = require("mongoose");
var User = require('./user');
var Schema = mongoose.Schema;

var passengerSchema = new Schema({
    userID: {type: Schema.Types.ObjectId, required: true, ref: User},
    seatsReserved: Number,
    note: String,
    accepted: Boolean
});

var rideSchema = new Schema({
    driver: {type: Schema.Types.ObjectId, required: true, ref: User},
    postDate: {type: Date, default: Date.now},
    departDate: {
        from: Date,
        to: Date
    },
    pickUpLoc: {
        lat: {type: Number, min: -90, max: 90},
        lng: {type: Number, min: -180, max: 180},
        range: Number //unit 1 km, which means 0.01 degree in lat or lng
    },
    dropOffLoc: {
        lat: {type: Number, min: -90, max: 90},
        lng: {type: Number, min: -180, max: 180},
        range: Number //unit 1 km, which means 0.01 degree in lat or lng
    },
    showNumber: Boolean,
    totalSeats: Number,
    price: Number,
    internal: {type: Boolean, default: true},
    visible: {type: Boolean, default: true},
    applications: [passengerSchema]
}, {
    runSettersOnQuery: true
});

module.exports = mongoose.model('Ride', rideSchema);