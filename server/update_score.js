var User = require('./model/user');

module.exports = function(){
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
};