import auth from '@react-native-firebase/auth';

/**
 * Step 1 — send OTP via Firebase (returns confirmation object).
 * phoneE164 must be in E.164 format, e.g. "+919876543210"
 */
export async function sendFirebaseOtp(phoneE164) {
  const confirmation = await auth().signInWithPhoneNumber(phoneE164);
  return confirmation;
}

/**
 * Step 2 — confirm OTP. Returns the Firebase idToken on success.
 * Throws on wrong code or expiry.
 */
export async function confirmFirebaseOtp(confirmation, otp) {
  const credential = await confirmation.confirm(otp);
  const idToken = await credential.user.getIdToken();
  return idToken;
}

/** Format a 10-digit Indian number to E.164 */
export function toE164India(tenDigits) {
  return '+91' + String(tenDigits).replace(/\D/g, '').slice(-10);
}

/**
 * Translates Firebase Auth errors to user-friendly messages.
 */
export function friendlyFirebaseError(err) {
  const code = err?.code || '';
  if (code === 'auth/invalid-verification-code') return 'Incorrect OTP. Please try again.';
  if (code === 'auth/code-expired') return 'OTP expired. Request a new one.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a moment.';
  if (code === 'auth/invalid-phone-number') return 'Invalid phone number format.';
  if (code === 'auth/session-expired') return 'Session expired. Request a new OTP.';
  return err?.message || 'Something went wrong. Please try again.';
}
