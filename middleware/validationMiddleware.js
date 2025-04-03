// Validate registration input
const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;

  // Check if all fields are provided
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, email and password',
    });
  }

  // Validate email format
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email',
    });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long',
    });
  }

  // Check for password strength (at least one uppercase, one lowercase, one number, one special character)
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    });
  }

  next();
};

// Validate login input
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  // Check if all fields are provided
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password',
    });
  }

  next();
};

// Validate OTP input
const validateOTP = (req, res, next) => {
  const { email, otp } = req.body;

  // Check if all fields are provided
  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and OTP',
    });
  }

  // Validate OTP format (6 digits)
  const otpRegex = /^\d{6}$/;
  if (!otpRegex.test(otp)) {
    return res.status(400).json({
      success: false,
      message: 'OTP must be 6 digits',
    });
  }

  next();
};

// Validate forgot password input
const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;

  // Check if email is provided
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email',
    });
  }

  next();
};

// Validate reset password input
const validateResetPassword = (req, res, next) => {
  const { password, confirmPassword } = req.body;

  // Check if all fields are provided
  if (!password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide password and confirm password',
    });
  }

  // Check if passwords match
  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Passwords do not match',
    });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long',
    });
  }

  // Check for password strength (at least one uppercase, one lowercase, one number, one special character)
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    });
  }

  next();
};

// Validate change password input
const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Check if all fields are provided
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message:
        'Please provide current password, new password and confirm password',
    });
  }

  // Check if new password and confirm password match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'New password and confirm password do not match',
    });
  }

  // Validate password strength
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long',
    });
  }

  // Check for password strength (at least one uppercase, one lowercase, one number, one special character)
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateOTP,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
};
