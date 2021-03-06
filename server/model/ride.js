var mongoose = require("mongoose");
var User = require('./user');
var Schema = mongoose.Schema;

var passengerSchema = new Schema({
    userID: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    seatsReserved: Number,
    note: String,
    accepted: Boolean,
    valid: {type: Boolean, default: true},
    onBoard: {type: Boolean, default: false}
});

var rideSchema = new Schema({
    driver: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    postDate: {type: Date, default: Date.now},
    departDate: {
        from: Date,
        to: Date
    },
    pickUpLoc: {
        lat: {type: Number, min: -90, max: 90},
        lng: {type: Number, min: -180, max: 180},
        range: Number, //unit 1 km, which means 0.01 degree in lat or lng
        formattedAddress: String
    },
    dropOffLoc: {
        lat: {type: Number, min: -90, max: 90},
        lng: {type: Number, min: -180, max: 180},
        range: Number, //unit 1 km, which means 0.01 degree in lat or lng
        formattedAddress: String
    },
    showNumber: Boolean,
    totalSeats: Number,
    occupiedSeats: {type: Number, default: 0},
    price: Number,
    internal: {type: Boolean, default: true},
    visible: {type: Boolean, default: true},
    valid: {type: Boolean, default: true},
    allOnBoard: {type: Boolean, default: false},
    applications: [passengerSchema]
}, {
    runSettersOnQuery: true
});

module.exports = mongoose.model('Ride', rideSchema);