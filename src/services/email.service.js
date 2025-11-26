const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendVerificationEmail(to, otp) {
    const mailOptions = {
        from: `"Online Auction" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Your Account Verification Code',
        html: `
            <h2>Thank you for registering!</h2>
            <p>Your One-Time Password (OTP) is:</p>
            <h1 style="font-size: 36px; letter-spacing: 5px;">${otp}</h1>
            <p>This code will expire in 10 minutes.</p>
        `,
    };

    await transporter.sendMail(mailOptions);
}

module.exports = { sendVerificationEmail };