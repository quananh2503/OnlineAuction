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

async function sendQuestionNotification({ to, productName, questionContent, productUrl }) {
    if (!to) return;
    await transporter.sendMail({
        from: `"Online Auction" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Câu hỏi mới cho sản phẩm ${productName}`,
        html: `
            <p>Bạn vừa nhận được một câu hỏi mới cho sản phẩm <strong>${productName}</strong>.</p>
            <blockquote>${questionContent}</blockquote>
            <p>Trả lời nhanh tại đây: <a href="${productUrl}" target="_blank">${productUrl}</a></p>
        `
    });
}

async function sendAnswerNotification({ to, productName, questionContent, answerContent, productUrl }) {
    if (!to) return;
    await transporter.sendMail({
        from: `"Online Auction" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Người bán đã trả lời câu hỏi về ${productName}`,
        html: `
            <p>Câu hỏi của bạn về <strong>${productName}</strong> đã được trả lời.</p>
            <p><em>Câu hỏi:</em></p>
            <blockquote>${questionContent}</blockquote>
            <p><em>Trả lời:</em></p>
            <blockquote>${answerContent}</blockquote>
            <p>Xem chi tiết sản phẩm: <a href="${productUrl}" target="_blank">${productUrl}</a></p>
        `
    });
}

async function sendBuyNowNotification({ sellerEmail, buyerEmail, productName, priceFormatted, productUrl }) {
    const promises = [];
    const subject = `Giao dịch mua ngay - ${productName}`;
    const html = `
        <p>Sản phẩm <strong>${productName}</strong> vừa được mua ngay với giá ${priceFormatted}.</p>
        <p>Xem chi tiết đơn hàng: <a href="${productUrl}" target="_blank">${productUrl}</a></p>
    `;
    if (sellerEmail) {
        promises.push(transporter.sendMail({
            from: `"Online Auction" <${process.env.EMAIL_USER}>`,
            to: sellerEmail,
            subject,
            html
        }));
    }
    if (buyerEmail) {
        promises.push(transporter.sendMail({
            from: `"Online Auction" <${process.env.EMAIL_USER}>`,
            to: buyerEmail,
            subject,
            html
        }));
    }
    await Promise.all(promises);
}

async function sendAuctionWonNotification({ sellerEmail, winnerEmail, productName, priceFormatted, productUrl }) {
    const promises = [];
    const subject = `Kết quả đấu giá - ${productName}`;

    if (sellerEmail) {
        promises.push(transporter.sendMail({
            from: `"Online Auction" <${process.env.EMAIL_USER}>`,
            to: sellerEmail,
            subject,
            html: `
                <p>Chúc mừng! Sản phẩm <strong>${productName}</strong> của bạn đã được đấu giá thành công.</p>
                <p>Giá chốt: <strong>${priceFormatted}</strong></p>
                <p>Vui lòng liên hệ người thắng để hoàn tất giao dịch.</p>
                <p><a href="${productUrl}" target="_blank">Xem chi tiết</a></p>
            `
        }));
    }

    if (winnerEmail) {
        promises.push(transporter.sendMail({
            from: `"Online Auction" <${process.env.EMAIL_USER}>`,
            to: winnerEmail,
            subject,
            html: `
                <p>Chúc mừng! Bạn đã thắng đấu giá sản phẩm <strong>${productName}</strong>.</p>
                <p>Giá chốt: <strong>${priceFormatted}</strong></p>
                <p>Vui lòng liên hệ người bán để hoàn tất giao dịch.</p>
                <p><a href="${productUrl}" target="_blank">Xem chi tiết</a></p>
            `
        }));
    }

    await Promise.all(promises);
}

module.exports = {
    sendVerificationEmail,
    sendQuestionNotification,
    sendAnswerNotification,
    sendBuyNowNotification,
    sendAuctionWonNotification
};
