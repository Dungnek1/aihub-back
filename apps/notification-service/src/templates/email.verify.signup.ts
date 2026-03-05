interface EmailData {
    name: string;
    logoUrl: string;
    companyName: string;
    email: string;
    hotline: string;
}

const header = (event: EmailData) => `
  <div style="width: 100%; font-family: 'Arial', sans-serif; padding: 20px 0;">
    <table align="center" width="600" cellpadding="0" cellspacing="0" >
      <tr>
        <td style="padding: 20px; text-align: center;">
          <table align="center" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: middle;">
                <img 
                  src="${event.logoUrl}" 
                  alt="Company Logo" 
                  style="max-width: 120px; width: 100%; height: auto; display: block;"
                >
              </td>
              <td style="vertical-align: middle; padding-left: 10px; font-size: 16px; font-weight: bold; color: #555;">
                ${event.companyName}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <h2 style="color: #2a9d8f; font-size: 20px; font-weight: 600; margin: 0;">
      Hello ${event.name},
    </h2>
  </div>
`;

const footer = (event: EmailData) => `
  <div style="margin-top: 30px; font-size: 13px; color: #777; text-align: center;">
    <hr style="margin: 20px 0;" />
    <p>Best regards,</p>
    <p><b>Customer Support Team</b></p>
    <p>Email: <a href="mailto:${event.email}">${event.email}</a> | Hotline: ${event.hotline}</p>
  </div>
`;

export function generateVerificationEmail(data: {
    username: string;
    verificationCode: string;
    companyName: string;
    logoUrl: string;
    hotline: string;
    supportEmail: string;
}): string {
    const contentHTML = `
    <div style="padding: 20px 0;">
      <p style="font-size: 15px; line-height: 1.6; color: #555;">
        Thank you for registering an account at <strong>${data.companyName}</strong>!
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #555;">
        To complete the registration process, please use the verification code below:
      </p>
      
      <div style="background-color: #f0f8ff; border: 2px dashed #2a9d8f; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
        <p style="margin: 0; font-size: 14px; color: #666; margin-bottom: 10px;">Your verification code:</p>
        <h1 style="margin: 0; font-size: 36px; color: #2a9d8f; letter-spacing: 8px; font-weight: bold;">
          ${data.verificationCode}
        </h1>
      </div>

      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          ⚠️ <strong>Note:</strong> This code will expire in <strong>5 minutes</strong>.
        </p>
      </div>

      <div class="info">
        <p style="font-size: 14px; color: #666; margin: 15px 0;">
          <strong>🔒 Security:</strong>
        </p>
        <ul style="font-size: 14px; color: #666; line-height: 1.8;">
          <li>Do not share this code with anyone</li>
          <li>We will never ask for this code via phone</li>
          <li>If you did not request this code, please ignore this email</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #666; margin-top: 25px;">
        If you need assistance, please contact us via email 
        <a href="mailto:${data.supportEmail}" style="color: #2a9d8f; text-decoration: none;">${data.supportEmail}</a>
        or hotline <strong>${data.hotline}</strong>.
      </p>
    </div>
  `;

    const emailData: EmailData = {
        name: data.username,
        logoUrl: data.logoUrl,
        companyName: data.companyName,
        email: data.supportEmail,
        hotline: data.hotline,
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
              font-family: Arial, sans-serif; 
              color: #333; 
              background-color: #f9f9f9; 
              margin: 0; 
              padding: 20px; 
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #fff; 
              padding: 20px; 
              border-radius: 8px; 
              border: 1px solid #ccc; 
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .info { margin: 15px 0; }
            .info ul { padding-left: 20px; }
            .info li { margin: 8px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            ${header(emailData)}
            ${contentHTML}
            ${footer(emailData)}
        </div>
    </body>
    </html>
  `;
}