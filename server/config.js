var nodemailer = require("nodemailer");

module.exports = {
    'secret': 'rideshareapp',
    'database': 'mongodb://eshang:1234@ds149134.mlab.com:49134/rideshare',
    'port': process.env.PORT || 3000,
    'map_key': 'AIzaSyCTm49O74oV_qxfDomdco5o2OyP4acq6Sw',
    'map_url': 'https://maps.googleapis.com/maps/api/geocode/json',
    'transporter': nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'noreply.rideshare@gmail.com',
            pass: 'RideshareWaterloo'
        }
    }),
    'email_content': {
        from: 'noreply.rideshare@gmail.com',
        to: '',
        subject: 'Verification Code From Rideshare',
        text: 'Enter the following code in the Rideshare App to verify your email address: '
    },
    'email_join': {
        from: 'noreply.rideshare@gmail.com',
        to: '',
        subject: 'Someone wants to join your ride!',
        text: 'Dear User, someone wants to join your ride! Checkout your RideShare app to approve or reject!'
    }
};