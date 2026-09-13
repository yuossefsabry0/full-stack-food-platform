'use strict';

const env = require('../config/env');


async function sendOtpEmail({ toEmail, otp, expiresInMinutes }) {
  if (env.nodeEnv !== 'production') {
    // eslint-disable-next-line no-console
    console.log(
      `[dev-mailer] Password-reset OTP for ${toEmail}: ${otp} (expires in ${expiresInMinutes} minutes)`
    );
  }
  // Production provider call goes here (e.g. nodemailer / SES / SendGrid).
  return { delivered: env.nodeEnv === 'production' ? false : true, channel: 'dev-log' };
}

module.exports = { sendOtpEmail };
