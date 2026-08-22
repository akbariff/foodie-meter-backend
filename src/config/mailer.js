const nodemailer = require('nodemailer');
const env = require('./env');

let transporterPromise;

function isPlaceholderConfig() {
  return !env.smtp.user || !env.smtp.pass || env.smtp.pass.includes('16-char-app-password');
}

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  if (isPlaceholderConfig()) {
    transporterPromise = nodemailer.createTestAccount().then((testAccount) => {
      console.warn(
        '[mailer] SMTP_USER/SMTP_PASS not configured — using a disposable Ethereal test inbox.\n' +
          '[mailer] Set real Gmail App Password creds in .env to send actual email.'
      );
      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    });
  } else {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.secure,
        auth: { user: env.smtp.user, pass: env.smtp.pass },
      })
    );
  }

  return transporterPromise;
}

async function sendCodeEmail({ to, subject, label }, code) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: env.smtp.from || 'Foodie Meter <no-reply@foodiemeter.dev>',
    to,
    subject,
    text: `Your ${label} code is ${code}. It expires in ${env.verificationCodeTtlMinutes} minutes.`,
    html: `<p>Your ${label} code is <strong>${code}</strong>.</p><p>It expires in ${env.verificationCodeTtlMinutes} minutes.</p>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[mailer] Preview ${label} email: ${previewUrl}`);
  }
}

async function sendVerificationEmail(to, code) {
  await sendCodeEmail({ to, subject: 'Your Foodie Meter verification code', label: 'verification' }, code);
}

async function sendPasswordResetEmail(to, code) {
  await sendCodeEmail({ to, subject: 'Your Foodie Meter password reset code', label: 'password reset' }, code);
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
