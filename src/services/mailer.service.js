'use strict';

const env = require('../config/env');


function isOtpDevExposeEnabled() {
  return (
    process.env.OTP_DEV_EXPOSE === 'true' &&
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')
  );
}

async function sendOtpEmail({ toEmail, otp, expiresInMinutes }) {
  if (isOtpDevExposeEnabled()) {
    // eslint-disable-next-line no-console
    console.log(
      `[dev-mailer] Password-reset OTP for ${toEmail}: ${otp} (expires in ${expiresInMinutes} minutes)`
    );
  }
  // Production provider call goes here (e.g. nodemailer / SES / SendGrid).
  return { delivered: env.nodeEnv === 'production' ? false : true, channel: 'dev-log' };
}

module.exports = { sendOtpEmail };
