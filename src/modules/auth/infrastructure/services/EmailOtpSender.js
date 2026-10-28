const nodemailer = require('nodemailer');
const AuthError = require('../../application/AuthError');

class EmailOtpSender {
  async sendVerificationOtp(email, code) {
    const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
    const port = Number(process.env.SMTP_PORT || 587);
    const from = SMTP_FROM || SMTP_USER;
    const fromAddress = from && (from.match(/<([^<>]+)>/) || [null, from])[1];
    const smtpPassword = SMTP_HOST && SMTP_HOST.toLowerCase() === 'smtp.gmail.com' && SMTP_PASS
      ? SMTP_PASS.replace(/\s/g, '')
      : SMTP_PASS;

    if (!SMTP_HOST || !fromAddress || !fromAddress.includes('@')
      || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new AuthError(500, 'Configure SMTP_HOST, a valid SMTP_FROM (or SMTP_USER), and a valid SMTP_PORT.');
    }

    if (SMTP_USER && !smtpPassword) {
      throw new AuthError(500, 'Configure SMTP_PASS when SMTP_USER is set.');
    }

    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: smtpPassword || '' } } : {}),
    });

    await transport.sendMail({
      from,
      to: email,
      subject: 'Verify your NYX Tournament account',
      text: `Your NYX Tournament verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your NYX Tournament verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
    });
  }
}

module.exports = EmailOtpSender;