/**
 * Email types for the BacancyTeleCare notification system.
 * Extensible for future: signup_verification, appointment_confirmation, appointment_reminder,
 * video_call_link, appointment_cancelled, appointment_rescheduled.
 */
export type EmailType =
  | "password_reset"
  | "signup_verification"
  | "appointment_confirmation"
  | "appointment_reminder"
  | "video_call_link"
  | "appointment_cancelled"
  | "appointment_rescheduled";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}
