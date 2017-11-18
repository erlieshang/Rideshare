var mongoose = require("mongoose");
var User = require('./user');
var Schema = mongoose.Schema;

var messageSchema = new Schema({
    from: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    to: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    text: {type: String, required: true},
    date: {type: Date, default: Date.now},
    sent: {type: Boolean, default: false}
}, {
    runSettersOnQuery: true
});

module.exports = mongoose.model('Message', messageSchema);
