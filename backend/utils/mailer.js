require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) console.log('⚠️ Mail server error:', error.message);
  else console.log('✅ Mail server ready');
});

// Green-themed HTML email template
const htmlWrap = (title, body) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:30px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#344E41,#588157);padding:28px 32px;text-align:center;">
            <p style="margin:0;color:#A3B18A;font-size:12px;letter-spacing:2px;text-transform:uppercase;">PSG College of Technology</p>
            <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700;">Internship Portal</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#344E41;font-size:18px;margin:0 0 16px;">${title}</h2>
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e8f0e8;padding:16px 32px;text-align:center;">
            <p style="margin:0;color:#888;font-size:12px;">
              © ${new Date().getFullYear()} PSG College of Technology · Coimbatore – 641 004
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ====================== Existing Emails ======================

const sendApprovalEmail = async (studentEmail, studentName, companyName, appId) => {
  const body = `
    Dear ${studentName},<br><br>
    Good news! Your internship application for <strong>${companyName}</strong> has been <strong>APPROVED</strong> by your tutor.<br><br>
    <strong>Application ID:</strong> #${appId}<br><br>
    You can now download the permission letter from your portal.
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: studentEmail,
    subject: `Application Approved - #${appId}`,
    html: htmlWrap('Application Approved', body),
  });
};

const sendRejectionEmail = async (studentEmail, studentName, companyName, remarks, appId) => {
  const body = `
    Dear ${studentName},<br><br>
    Your internship application for <strong>${companyName}</strong> has been <strong>REJECTED</strong>.<br><br>
    <strong>Application ID:</strong> #${appId}<br>
    <strong>Remarks:</strong> ${remarks || 'No remarks provided'}<br><br>
    Please contact your tutor for more details.
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: studentEmail,
    subject: `Application Rejected - #${appId}`,
    html: htmlWrap('Application Rejected', body),
  });
};

const sendOtpEmail = async (email, otp) => {
  const body = `
    <p style="color:#555;line-height:1.7;">You requested a One-Time Password for PSG Tech Internship Portal.</p>
    <div style="text-align:center;margin:24px 0;">
      <div style="background:#f0fdf4;border:2px dashed #A3B18A;padding:20px 32px;border-radius:12px;display:inline-block;">
        <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:12px;color:#344E41;">${otp}</p>
      </div>
    </div>
    <p style="color:#555;line-height:1.7;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
  `;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'PSG Tech Portal <noreply@psgtech.ac.in>',
    to: email,
    subject: `${otp} – Your OTP for PSG Tech Internship Portal`,
    html: htmlWrap('Your One-Time Password', body),
  });
};

// ====================== NEW: Tutor Notification ======================
const sendTutorNotificationEmail = async (tutorEmail, tutorName, studentName, companyName, appId) => {
  const body = `
    <p style="color:#555;line-height:1.7;">Dear <strong style="color:#344E41;">${tutorName}</strong>,</p>
    <p style="color:#555;line-height:1.7;">
      A new internship application has been submitted by 
      <strong>${studentName}</strong> for <strong>${companyName}</strong>.
    </p>
    <p style="color:#555;line-height:1.7;">
      <strong>Application ID:</strong> #${appId}<br><br>
      Please review and take action at the earliest in the Tutor Portal.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tutor/queue" 
         style="background:#588157;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">
        Review Application →
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'PSG Tech Portal <noreply@psgtech.ac.in>',
    to: tutorEmail,
    subject: `🔔 New Application #${appId} - ${studentName}`,
    html: htmlWrap('New Student Application', body),
  });
};

module.exports = { 
  transporter, 
  sendApprovalEmail, 
  sendRejectionEmail, 
  sendOtpEmail,
  sendTutorNotificationEmail 
};