require('dotenv/config');
const nodemailer = require('nodemailer');

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.verify();

  console.log('SMTP connection successful');

  const info = await transporter.sendMail({
    from: {
      name: 'FoodieMeter',
      address: process.env.MAIL_FROM,
    },

    // Change this to an email inbox you can check
    to: 'hyuhang.com@gmail.com',

    subject: 'FoodieMeter SMTP Test',
    text: 'Brevo SMTP is working successfully.',
  });

  console.log('Test email sent successfully');
  console.log('Message ID:', info.messageId);
}

main().catch((error) => {
  console.error('SMTP test failed');
  console.error(error);
  process.exitCode = 1;
});