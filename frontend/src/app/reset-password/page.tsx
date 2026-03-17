"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Stethoscope } from "lucide-react";
import { motion } from "motion/react";
import { authApi } from "@/services/api";

const PASSWORD_MAX_LENGTH = 128;

function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    maxLength: password.length <= PASSWORD_MAX_LENGTH,
  };
}

function getStrengthLevel(password: string): {
  label: "Weak" | "Fair" | "Good" | "Strong";
  activeBars: number;
  barClassName: string;
  textClassName: string;
} {
  const checks = getPasswordChecks(password);
  const score =
    Number(checks.minLength) +
    Number(checks.uppercase) +
    Number(checks.lowercase) +
    Number(checks.number) +
    Number(checks.special);

  if (score >= 5) {
    return {
      label: "Strong",
      activeBars: 4,
      barClassName: "bg-emerald-500",
      textClassName: "text-emerald-600",
    };
  }
  if (score === 4) {
    return {
      label: "Good",
      activeBars: 3,
      barClassName: "bg-sky-500",
      textClassName: "text-sky-600",
    };
  }
  if (score === 3) {
    return {
      label: "Fair",
      activeBars: 2,
      barClassName: "bg-orange-500",
      textClassName: "text-orange-600",
    };
  }
  return {
    label: "Weak",
    activeBars: password ? 1 : 0,
    barClassName: "bg-red-500",
    textClassName: "text-red-600",
  };
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    newPassword?: string;
    confirmPassword?: string;
    form?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const passwordChecks = React.useMemo(() => getPasswordChecks(newPassword), [newPassword]);
  const strength = React.useMemo(() => getStrengthLevel(newPassword), [newPassword]);

  function validate(): boolean {
    const nextErrors: {
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!newPassword) {
      nextErrors.newPassword = "New password is required.";
    } else if (!passwordChecks.maxLength) {
      nextErrors.newPassword = "Must be less than 128 characters.";
    } else if (!passwordChecks.minLength) {
      nextErrors.newPassword = "Must be at least 8 characters.";
    } else if (!passwordChecks.uppercase) {
      nextErrors.newPassword = "Must contain at least one uppercase letter.";
    } else if (!passwordChecks.lowercase) {
      nextErrors.newPassword = "Must contain at least one lowercase letter.";
    } else if (!passwordChecks.number) {
      nextErrors.newPassword = "Must contain at least one number.";
    } else if (!passwordChecks.special) {
      nextErrors.newPassword = "Must contain at least one special character.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    if (!token) {
      setErrors({
        form: "Reset token is missing. Please use the reset link from your email.",
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await authApi.resetPassword(token, newPassword);
      setIsSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset password. Please try again.";
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-24 bg-white relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-100">
              <Stethoscope className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">TeleCare</span>
          </div>

          <h2 className="text-4xl font-bold text-slate-900 mb-2">Reset Password</h2>
          <p className="text-slate-500 mb-10">Enter your new password below.</p>

          {isSuccess ? (
            <div className="space-y-6">
              <p className="text-sm text-emerald-700 font-medium bg-emerald-50 px-4 py-3 rounded-2xl">
                Your password has been reset successfully! You can now log in with your new password.
              </p>
              <Link
                href="/login"
                className="w-full py-5 bg-brand-500 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-600 hover:shadow-brand-200 transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2 group"
              >
                Go to Login
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">New Password</label>
                <div className="relative group">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    disabled={isSubmitting}
                    className={`w-full px-4 pr-12 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium disabled:opacity-70 ${
                      errors.newPassword ? "border-red-500" : "border-transparent focus:border-brand-500"
                    }`}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-500 transition-colors"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Password Strength
                    </span>
                    <span className={`text-xs font-bold ${strength.textClassName}`}>{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className={`h-2 rounded-full ${
                          index < strength.activeBars ? strength.barClassName : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <p
                    className={`text-xs font-medium ${
                      passwordChecks.minLength ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {passwordChecks.minLength ? "✓" : "✕"} At least 8 characters
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      passwordChecks.uppercase ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {passwordChecks.uppercase ? "✓" : "✕"} One uppercase letter
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      passwordChecks.lowercase ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {passwordChecks.lowercase ? "✓" : "✕"} One lowercase letter
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      passwordChecks.number ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {passwordChecks.number ? "✓" : "✕"} One number
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      passwordChecks.special ? "text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {passwordChecks.special ? "✓" : "✕"} One special character
                  </p>
                </div>

                {errors.newPassword && (
                  <p className="text-xs text-red-500 font-medium ml-1">{errors.newPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Confirm Password</label>
                <div className="relative group">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    disabled={isSubmitting}
                    className={`w-full px-4 pr-12 py-4 bg-slate-50 border-2 rounded-2xl focus:bg-white outline-none transition-all font-medium disabled:opacity-70 ${
                      errors.confirmPassword ? "border-red-500" : "border-transparent focus:border-brand-500"
                    }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-500 transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 font-medium ml-1">{errors.confirmPassword}</p>
                )}
              </div>

              {errors.form && (
                <p className="text-sm text-red-500 font-medium text-center bg-red-50 px-4 py-3 rounded-2xl">
                  {errors.form}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-brand-500 text-white font-bold rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-600 hover:shadow-brand-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-10 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700 underline decoration-2 underline-offset-4"
            >
              <span aria-hidden="true">←</span>
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 bg-brand-600 relative overflow-hidden items-center justify-center p-24">
        <div className="relative z-10 max-w-lg text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[32px] flex items-center justify-center mx-auto mb-12 border border-white/30">
              <Stethoscope className="text-white w-12 h-12" />
            </div>
            <h3 className="text-5xl font-bold text-white mb-8 leading-tight">Set a New Password.</h3>
            <p className="text-xl text-brand-100 leading-relaxed">
              Create a strong password to secure your TeleCare account and continue safely.
            </p>
          </motion.div>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-900/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPasswordContent />
    </React.Suspense>
  );
}
