/**
 * Email template builders. Add new template functions for future notification types.
 */

export interface PasswordResetTemplatePayload {
    to: string;
    resetLink: string;
}

export function buildPasswordResetEmail(payload: PasswordResetTemplatePayload): {
    subject: string;
    text: string;
    html: string;
} {
    const { resetLink } = payload;
    const subject = 'Reset your BacancyTeleCare password';
    const text = `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`;
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
  <h2>Reset your BacancyTeleCare password</h2>
  <p>You requested a password reset. Click the button below to reset your password:</p>
  <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background: #f58220; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
  <p style="color: #666; font-size: 0.9em;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  <p style="color: #666; font-size: 0.85em;">Or copy this link: ${resetLink}</p>
</body>
</html>`;
    return { subject, text, html };
}

export interface AppointmentDeclinedTemplatePayload {
    to: string;
    patientName: string;
    doctorName: string;
    scheduledAt: Date;
    declineReason: string;
}

export function buildAppointmentDeclinedEmail(payload: AppointmentDeclinedTemplatePayload): {
    subject: string;
    text: string;
    html: string;
} {
    const { patientName, doctorName, scheduledAt, declineReason } = payload;
    const dateStr = scheduledAt.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const timeStr = scheduledAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const subject = 'Your appointment request was declined';

    const displayDoctor = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;
    const text = `Hi ${patientName},\n\nUnfortunately, ${displayDoctor} has declined your appointment request scheduled for ${dateStr} at ${timeStr}.\n\nReason: ${declineReason}\n\nYou can book a new appointment with another available doctor on BacancyTeleCare.\n\nThe BacancyTeleCare Team`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;">
  <div style="background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: #ef4444; padding: 24px 32px;">
      <h1 style="color: white; margin: 0; font-size: 20px;">Appointment Declined</h1>
    </div>
    <div style="padding: 32px;">
      <p>Hi <strong>${patientName}</strong>,</p>
      <p>Unfortunately, <strong>${displayDoctor}</strong> has declined your appointment request.</p>

      <div style="background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Appointment Details</p>
        <p style="margin: 0 0 4px;"><strong>Date:</strong> ${dateStr}</p>
        <p style="margin: 0;"><strong>Time:</strong> ${timeStr}</p>
      </div>

      <div style="background: #fef2f2; border-radius: 8px; padding: 16px 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Reason for Declining</p>
        <p style="margin: 0; color: #374151;">${declineReason}</p>
      </div>

      <p>You can book a new appointment with another available doctor on BacancyTeleCare.</p>
      <p style="color: #64748b; font-size: 14px;">— The BacancyTeleCare Team</p>
    </div>
  </div>
</body>
</html>`;

    return { subject, text, html };
}

/* Future template stubs:
export function buildSignupVerificationEmail(...): { subject, text, html } { ... }
export function buildAppointmentConfirmationEmail(...): { subject, text, html } { ... }
export function buildAppointmentReminderEmail(...): { subject, text, html } { ... }
export function buildVideoCallLinkEmail(...): { subject, text, html } { ... }
export function buildAppointmentRescheduledEmail(...): { subject, text, html } { ... }
*/
