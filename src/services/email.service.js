const mailService = require('../mail/mail.service');

module.exports = {
    ...mailService,
    // Aliases for backward compatibility
    sendBidPlacedNotification: mailService.sendBidSuccessEmail,
    sendBidRejectedNotification: mailService.sendBidderBlockedEmail,
    sendAuctionEndedNoWinnerNotification: mailService.sendAuctionEndedNoWinnerEmail,
    sendQuestionNotification: mailService.sendNewQuestionEmail,
    sendAnswerNotification: mailService.sendAnswerEmail,
    sendAuctionWonNotification: mailService.sendAuctionEndedWinnerEmail,
    sendDescriptionUpdateNotification: mailService.sendDescriptionUpdatedEmail,
};
