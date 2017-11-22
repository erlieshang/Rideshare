var mongoose = require("mongoose");
var User = require('./user');
var Schema = mongoose.Schema;

var messageSchema = new Schema({
    from: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    to: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    text: {type: String, required: true},
    createdAt: {type: Date, default: Date.now},
    sent: {type: Boolean, default: false}
});

var conversationSchema = new Schema({
    user1: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    user2: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    messages:[messageSchema],
    createdAt: {type: Date, default: Date.now}
}, {
    runSettersOnQuery: true
});

module.exports = mongoose.model('Conversation', conversationSchema);
