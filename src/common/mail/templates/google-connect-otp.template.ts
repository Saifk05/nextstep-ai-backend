export interface GoogleConnectOtpTemplateData {
  firstName?: string;
  email: string;
  otp: string;
  expiryMinutes?: number;
}

export function googleConnectOtpTemplate(data: GoogleConnectOtpTemplateData) {
  const firstName = data.firstName || 'there';
  const expiryMinutes = data.expiryMinutes || 10;
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NextStep AI Verification Code</title>
</head>

<body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f7fb; padding:34px 14px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:720px; background:#ffffff; border:1px solid #e2e8f0; border-radius:26px; overflow:hidden; box-shadow:0 24px 70px rgba(15,23,42,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:34px 44px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <div style="font-size:26px; font-weight:800; color:#0f172a; letter-spacing:-0.6px;">
                      NextStep <span style="color:#2563eb;">AI</span>
                    </div>
                  </td>
                  <td align="right">
                    <div style="display:inline-block; padding:9px 15px; border-radius:999px; background:#eff6ff; color:#2563eb; font-size:13px; font-weight:700;">
                      Security Verification
                    </div>
                  </td>
                </tr>
              </table>

              <div style="height:1px; background:#e8eef7; margin-top:30px;"></div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:20px 44px 0;">

              <div style="display:inline-block; padding:8px 12px; background:#eff6ff; color:#2563eb; border-radius:999px; font-size:13px; font-weight:700; margin-bottom:22px;">
                Google Account Connection
              </div>

              <h1 style="margin:0; font-size:42px; line-height:1.14; font-weight:800; color:#0f172a; letter-spacing:-1.3px;">
                Verify your Google<br />
                account connection
              </h1>

              <p style="margin:30px 0 0; font-size:17px; line-height:1.75; color:#334155;">
                Hi <strong style="color:#2563eb;">${firstName}</strong>,
              </p>

              <p style="margin:18px 0 0; font-size:17px; line-height:1.8; color:#334155;">
                You're connecting a new Google account to your NextStep AI workspace.
                Use the verification code below to confirm this secure connection.
              </p>

            </td>
          </tr>

          <!-- Email -->
          <tr>
            <td style="padding:34px 44px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #dbe3ee; border-radius:18px; background:#ffffff;">
                <tr>
                  <td style="padding:22px 24px;">
                    <div style="font-size:13px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:8px;">
                      Primary login email
                    </div>
                    <div style="font-size:18px; font-weight:800; color:#0f172a; word-break:break-all;">
                      ${data.email}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- OTP -->
          <tr>
            <td style="padding:30px 44px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:linear-gradient(135deg,#eff6ff 0%,#ffffff 100%); border:1px solid #bfdbfe; border-radius:22px;">
                <tr>
                  <td align="center" style="padding:38px 20px;">
                    <div style="font-size:14px; font-weight:800; letter-spacing:1.4px; color:#2563eb; text-transform:uppercase; margin-bottom:24px;">
                      Verification Code
                    </div>

                    <div style="font-size:62px; font-weight:900; color:#1d4ed8; letter-spacing:16px; line-height:1;">
                      ${data.otp}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry -->
          <tr>
            <td style="padding:28px 44px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px;">
                <tr>
                  <td style="padding:18px 22px; font-size:15px; line-height:1.7; color:#334155;">
                    This code will expire in
                    <strong style="color:#2563eb;">${expiryMinutes} minutes</strong>.
                    Do not share this code with anyone.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding:28px 44px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff; border:1px solid #bfdbfe; border-left:5px solid #2563eb; border-radius:18px;">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-size:18px; font-weight:800; color:#0f172a; margin-bottom:10px;">
                      Didn't initiate this request?
                    </div>

                    <div style="font-size:15.5px; color:#334155; line-height:1.75;">
                      If you didn't try to connect a Google account to your NextStep AI workspace,
                      you can safely ignore this email. No changes will be made to your account.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support -->
          <tr>
            <td style="padding:28px 44px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:18px;">
                <tr>
                  <td style="padding:22px 24px;">
                    <div style="font-size:17px; font-weight:800; color:#0f172a; margin-bottom:7px;">
                      Need help?
                    </div>

                    <div style="font-size:15px; color:#475569; line-height:1.6;">
                      Our support team is here if you need assistance.
                    </div>
                  </td>

                  <td align="right" style="padding:22px 24px; white-space:nowrap;">
                    <span style="font-size:15px; font-weight:800; color:#2563eb;">
                      Contact Support →
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:42px 44px 38px;">
              <div style="height:1px; background:#e8eef7; margin-bottom:26px;"></div>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <div style="font-size:14px; color:#64748b; line-height:1.7;">
                      This is an automated security email from
                      <strong style="color:#0f172a;">NextStep AI</strong>.
                      <br />
                      Please do not reply to this email.
                    </div>

                    <div style="margin-top:16px; font-size:13px; color:#94a3b8;">
                      © ${year} NextStep AI. All rights reserved.
                    </div>
                  </td>

                  <td align="right">
                    <div style="display:inline-block; padding:14px 18px; background:#eff6ff; border-radius:14px; color:#2563eb; font-size:13px; font-weight:800; line-height:1.4;">
                      Secure by design
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
}