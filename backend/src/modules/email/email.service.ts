import nodemailer from 'nodemailer';
import { config } from '../../config';
import { buildPasswordResetEmail, buildAppointmentDeclinedEmail } from './email.templates';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (!transporter) {
        const { email } = config;
        transporter = nodemailer.createTransport({
            host: email.smtpHost,
            port: email.smtpPort,
            secure: email.smtpPort === 465,
            auth:
                email.smtpUser && email.smtpPass
                    ? { user: email.smtpUser, pass: email.smtpPass }
                    : undefined,
        });
    }
    return transporter;
}

/**
 * Low-level send. Used by all higher-level send* functions.
 */
export async function sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
): Promise<void> {
    const { email } = config;
    if (!email.mailFrom) {
        throw new Error('Email not configured: MAIL_FROM is required');
    }

    await getTransporter().sendMail({
        from: email.mailFrom,
        to,
        subject,
        text,
        html,
    });
}

/**
 * Send password reset email. Used by auth forgot-password flow.
 */
export async function sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const { subject, text, html } = buildPasswordResetEmail({ to, resetLink });
    await sendEmail(to, subject, text, html);
}

/**
 * Notify patient that their appointment was declined, with doctor's reason.
 */
export async function sendAppointmentDeclined(
    to: string,
    patientName: string,
    doctorName: string,
    scheduledAt: Date,
    declineReason: string,
): Promise<void> {
    const { subject, text, html } = buildAppointmentDeclinedEmail({
        to,
        patientName,
        doctorName,
        scheduledAt,
        declineReason,
    });
    await sendEmail(to, subject, text, html);
}

/* Future: sendSignupVerification, sendAppointmentConfirmation, sendAppointmentReminder,
   sendVideoCallLink, sendAppointmentRescheduled */
