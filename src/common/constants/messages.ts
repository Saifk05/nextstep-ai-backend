export const MESSAGES = {
  // Common
  SUCCESS: 'Success',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  BAD_REQUEST: 'Bad request',

  // User
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  USER_CREATED_SUCCESSFULLY: 'User created successfully',
  USER_UPDATED_SUCCESSFULLY: 'User updated successfully',

  // Email
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  EMAIL_NOT_FOUND: 'Email not found',

  // Phone
  PHONE_NUMBER_ALREADY_EXISTS: 'Phone number already exists',
  PHONE_NUMBER_NOT_FOUND: 'Phone number not found',

  // Auth
  INVALID_CREDENTIALS: 'Invalid credentials',
  LOGIN_SUCCESSFUL: 'Login successful',
  LOGOUT_SUCCESSFUL: 'Logout successful',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',

  // Password
  PASSWORD_CHANGED_SUCCESSFULLY: 'Password changed successfully',
  PASSWORD_RESET_SUCCESSFULLY: 'Password reset successfully',
  CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
  SAME_PASSWORD_ERROR:
    'New password cannot be the same as current password',

  // OTP
  OTP_SENT_SUCCESSFULLY: 'OTP sent successfully',
  OTP_VERIFIED_SUCCESSFULLY: 'OTP verified successfully',
  INVALID_OTP: 'Invalid OTP',
  OTP_EXPIRED: 'OTP has expired',

  // Account Security
  ACCOUNT_LOCKED:
    'Your account has been locked due to multiple failed attempts',
  TOO_MANY_LOGIN_ATTEMPTS:
    'Too many login attempts. Please try again later',

  // Token
  INVALID_TOKEN: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  REFRESH_TOKEN_REQUIRED: 'Refresh token is required',

  // Google OAuth
  GOOGLE_LOGIN_SUCCESSFUL: 'Google login successful',
  GOOGLE_ACCOUNT_NOT_FOUND: 'Google account not found',

  // Onboarding
  GMAIL_CONNECTED_SUCCESSFULLY:
    'Gmail connected successfully',
  CALENDAR_CONNECTED_SUCCESSFULLY:
    'Calendar connected successfully',
};