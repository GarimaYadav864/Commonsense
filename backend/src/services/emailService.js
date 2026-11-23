const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Password reset email is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Reset your Commonsense password",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#18352b;line-height:1.6">
          <h2 style="color:#031f1b">Reset your password</h2>
          <p>We received a request to reset the password for your Commonsense account.</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#031f1b;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p>
          <p>This link expires in 15 minutes and can only be used once.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p style="color:#718078;font-size:12px">Commonsense · A Community Needs and Resource Matching Engine</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider rejected the message: ${details}`);
  }
};

module.exports = { sendPasswordResetEmail };
