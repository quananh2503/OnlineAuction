const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const config = require('./mail.config');

const transporter = nodemailer.createTransport(config);

// Helper to read template and replace placeholders
const getTemplate = (templateName, data) => {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
    let html = fs.readFileSync(templatePath, 'utf8');

    for (const key in data) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, data[key] || '');
    }
    return html;
};

const sendMail = async ({ to, subject, template, data, bcc }) => {
    try {
        const html = getTemplate(template, data);
        const mailOptions = {
            from: config.from,
            to,
            bcc,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// 1. Bid Success
const sendBidSuccessEmail = async ({ sellerEmail, bidderEmail, prevBidderEmail, productName, price, time, productUrl, bidderName }) => {
    // Email to Bidder
    if (bidderEmail) {
        await sendMail({
            to: bidderEmail,
            subject: `Ra giá thành công - ${productName}`,
            template: 'bid_success',
            data: { bidderName: bidderName || 'Bạn', productName, price, time, productUrl }
        });
    }

    // Email to Seller (Simple notification, reusing template or creating a new one? 
    // User asked for specific content. I'll use a generic notification or just send text if template not strictly required for seller, 
    // but let's try to be consistent. I'll create a simple notification for seller if needed, or just reuse logic.)
    // Actually, the requirement says: "Email Seller, Bidder, Previous Bidder".
    // I'll use the same template for Bidder. For Seller and Previous Bidder, I might need slightly different content.
    // But to keep it simple as requested, I will focus on the main requirement.
    // Let's create a generic notification for Seller/PrevBidder or just use text.

    // For simplicity and speed, I will use `sendMail` with custom HTML if needed, or just create more templates.
    // Let's stick to the requested templates. I'll add a generic 'notification.html' if I need to, but let's see.

    // Seller Notification
    if (sellerEmail) {
        await transporter.sendMail({
            from: config.from,
            to: sellerEmail,
            subject: `Có người ra giá mới - ${productName}`,
            html: `<p>Sản phẩm <strong>${productName}</strong> vừa có lượt ra giá mới.</p><p>Giá hiện tại: <strong>${price}</strong></p><p><a href="${productUrl}">Xem chi tiết</a></p>`
        });
    }

    // Previous Bidder Notification
    if (prevBidderEmail) {
        await transporter.sendMail({
            from: config.from,
            to: prevBidderEmail,
            subject: `Bạn đã bị vượt giá - ${productName}`,
            html: `<p>Có người vừa ra giá cao hơn bạn cho sản phẩm <strong>${productName}</strong>.</p><p>Giá mới: <strong>${price}</strong></p><p>Hãy ra giá lại ngay!</p><p><a href="${productUrl}">Đấu giá ngay</a></p>`
        });
    }
};

// 2. Bidder Blocked
const sendBidderBlockedEmail = async ({ bidderEmail, bidderName, productName, reason, sellerName }) => {
    await sendMail({
        to: bidderEmail,
        subject: `Bạn bị từ chối ra giá - ${productName}`,
        template: 'bidder_blocked',
        data: { bidderName, productName, reason, sellerName }
    });
};

// 3. Auction Ended - No Winner
const sendAuctionEndedNoWinnerEmail = async ({ sellerEmail, sellerName, productName, endTime, productUrl }) => {
    await sendMail({
        to: sellerEmail,
        subject: `Đấu giá kết thúc (Không có người mua) - ${productName}`,
        template: 'auction_ended_no_winner',
        data: { sellerName, productName, endTime, productUrl }
    });
};

// 4. Auction Ended - Winner
const sendAuctionEndedWinnerEmail = async ({ sellerEmail, winnerEmail, winnerName, productName, price, transactionUrl, productUrl }) => {
    // To Winner
    await sendMail({
        to: winnerEmail,
        subject: `Chúc mừng! Bạn đã thắng đấu giá - ${productName}`,
        template: 'auction_ended_winner',
        data: { winnerName, productName, price, transactionUrl }
    });

    // To Seller
    if (sellerEmail) {
        await transporter.sendMail({
            from: config.from,
            to: sellerEmail,
            subject: `Sản phẩm đã được đấu giá thành công - ${productName}`,
            html: `<p>Chúc mừng! Sản phẩm <strong>${productName}</strong> đã có người mua.</p><p>Giá chốt: <strong>${price}</strong></p><p>Người thắng: <strong>${winnerName}</strong></p><p>Vui lòng kiểm tra trang giao dịch.</p><p><a href="${productUrl}">Xem chi tiết</a></p>`
        });
    }
};

// 5. New Question
const sendNewQuestionEmail = async ({ sellerEmail, sellerName, askerName, productName, question, productUrl }) => {
    await sendMail({
        to: sellerEmail,
        subject: `Câu hỏi mới cho sản phẩm ${productName}`,
        template: 'question_new',
        data: { sellerName, askerName, productName, question, productUrl }
    });
};

// 6. Answer
const sendAnswerEmail = async ({ toList, productName, question, answer, productUrl }) => {
    if (!toList || toList.length === 0) return;
    await sendMail({
        bcc: toList,
        subject: `Người bán đã trả lời câu hỏi về ${productName}`,
        template: 'question_answer',
        data: { productName, question, answer, productUrl }
    });
};

// 7. Verification Email
const sendVerificationEmail = async (to, otp) => {
    await transporter.sendMail({
        from: config.from,
        to: to,
        subject: 'Mã xác thực tài khoản',
        html: `
            <h2>Cảm ơn bạn đã đăng ký!</h2>
            <p>Mã OTP của bạn là:</p>
            <h1 style="font-size: 36px; letter-spacing: 5px;">${otp}</h1>
            <p>Mã này sẽ hết hạn trong 10 phút.</p>
        `
    });
};

// 8. Buy Now Notification
const sendBuyNowNotification = async ({ sellerEmail, buyerEmail, productName, price, productUrl }) => {
    const subject = `Giao dịch mua ngay - ${productName}`;
    const html = `
        <p>Sản phẩm <strong>${productName}</strong> vừa được mua ngay với giá ${price}.</p>
        <p>Xem chi tiết đơn hàng: <a href="${productUrl}" target="_blank">${productUrl}</a></p>
    `;

    if (sellerEmail) {
        await transporter.sendMail({ from: config.from, to: sellerEmail, subject, html });
    }
    if (buyerEmail) {
        await transporter.sendMail({ from: config.from, to: buyerEmail, subject, html });
    }
};

module.exports = {
    sendMail,
    sendBidSuccessEmail,
    sendBidderBlockedEmail,
    sendAuctionEndedNoWinnerEmail,
    sendAuctionEndedWinnerEmail,
    sendNewQuestionEmail,
    sendAnswerEmail,
    sendVerificationEmail,
    sendBuyNowNotification
};
