const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { sendOtpEmail } = require('../utils/mailer');

// OTP store (in-memory)
const otpStore = new Map();

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const detectRole = (email) => {
  const lower = email.toLowerCase();
  if (!lower.endsWith('@psgtech.ac.in')) return null;
  const local = lower.split('@')[0];
  if (local.indexOf('.') === 3) return 'tutor';
  return 'student';
};

const extractRollNumber = (email) => email.toLowerCase().split('@')[0];

const extractProgId = (rollNumber) => {
  const match = rollNumber.match(/^\d{2}([a-zA-Z]+)\d+$/);
  return match ? match[1].toUpperCase() : null;
};

// ──────────────────────────────────────────────
// SEND OTP
// ──────────────────────────────────────────────
const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const lower = email.toLowerCase();
  if (!lower.endsWith('@psgtech.ac.in'))
    return res.status(400).json({ error: 'Only @psgtech.ac.in email addresses are allowed.' });

  const otp = crypto.randomInt(100000, 999999).toString();
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(lower, { otp, expiry });

  // DEBUG: log OTP to terminal (remove in production)
  console.log(`DEBUG OTP for ${lower} → ${otp}`);

  try {
    await sendOtpEmail(lower, otp);
    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (err) {
    console.error('OTP email error:', err.message);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
};

// ──────────────────────────────────────────────
// VERIFY OTP
// ──────────────────────────────────────────────
const verifyOtp = (req, res) => {
  const { email, otp } = req.body;
  const lower = email.toLowerCase();
  const stored = otpStore.get(lower);

  if (!stored) return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
  if (Date.now() > stored.expiry) {
    otpStore.delete(lower);
    return res.status(400).json({ error: 'OTP has expired.' });
  }
  if (stored.otp !== String(otp)) {
    return res.status(400).json({ error: 'Invalid OTP.' });
  }

  res.json({ success: true, message: 'OTP verified.' });
};

// ──────────────────────────────────────────────
// RESET PASSWORD
// ──────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP and new password are required.' });
  }

  const lower = email.toLowerCase();

  try {
    const stored = otpStore.get(lower);
    if (!stored || Date.now() > stored.expiry || stored.otp !== String(otp)) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    const userResult = await pool.query('SELECT user_id FROM users WHERE LOWER(email) = $1', [lower]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE LOWER(email) = $2',
      [hash, lower]
    );

    otpStore.delete(lower);
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ──────────────────────────────────────────────
// SIGNUP  ← FIXED
// ──────────────────────────────────────────────
const signup = async (req, res) => {
  const { full_name, email, phone, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const lower = email.toLowerCase();

  if (!lower.endsWith('@psgtech.ac.in')) {
    return res.status(400).json({ error: 'Only @psgtech.ac.in emails are allowed.' });
  }

  try {
    const existing = await pool.query(
      'SELECT user_id FROM users WHERE LOWER(email) = $1',
      [lower]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const role = detectRole(lower);
    const roll_number = extractRollNumber(lower);
    const prog_id = extractProgId(roll_number);
    const normalizedProgId = prog_id?.toLowerCase() || null;  // ← only change

    const { rows } = await pool.query(`
      INSERT INTO users (
        email, password_hash, full_name, role, phone,
        roll_number, prog_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING user_id, full_name, email, role
    `, [
      lower,
      password_hash,
      full_name.trim(),
      role || 'student',
      phone?.trim() || null,
      roll_number || null,
      normalizedProgId,              // ← use this instead of prog_id
    ]);

    res.status(201).json({
      message: 'Account created successfully! Please login.',
      user: rows[0],
    });

  } catch (err) {
    console.error('Signup Error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};

// ──────────────────────────────────────────────
// LOGIN
// ──────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required.' });

  const lower = email.toLowerCase();

  try {
    const result = await pool.query(
      `SELECT u.*, p.programme, p.department
       FROM users u LEFT JOIN programmes p ON u.prog_id = p.prog_id
       WHERE LOWER(u.email) = $1`, [lower]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials.' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    await pool.query('UPDATE users SET last_login_at=NOW() WHERE user_id=$1', [user.user_id]);

    await pool.query(
      `INSERT INTO audit_log (user_id, action, details) VALUES ($1, 'login', $2)`,
      [user.user_id, JSON.stringify({ email: lower })]
    );

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  resetPassword,
  signup,
  login,
  detectRole,
};

