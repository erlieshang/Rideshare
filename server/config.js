var nodemailer = require("nodemailer");

module.exports = {
    'secret': 'rideshareapp',
    'database': 'mongodb://eshang:1234@ds149134.mlab.com:49134/rideshare',
    'transporter': nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'noreply.rideshare@gmail.com',
            pass: 'rideshare123'
        }
    }),
    'email_content': {
        from: 'noreply.rideshare@gmail.com',
        to: '',
        subject: 'Verification Code From Rideshare',
        text: 'Enter the following code in the Rideshare App to verify your email address: '
    }
};