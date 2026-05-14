const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendOtp, verifyOtp, signup, login, resetPassword } = require('../controllers/authController');
const ctrl = require('../controllers/appController');

// ====================== AUTH ROUTES ======================
router.post('/auth/login', login);
router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);
router.post('/auth/signup', signup);
router.post('/reset-password', resetPassword);   // for forgot password    // ← Important for Forgot Password

// ====================== PROTECTED ROUTES ======================
router.get('/programmes', authenticateToken, ctrl.getProgrammes);
router.get('/companies', authenticateToken, ctrl.getCompanies);
router.get('/tutors', authenticateToken, ctrl.getTutors);

// Student Routes
router.get('/student/profile', authenticateToken, requireRole('student'), ctrl.getStudentProfile);
router.get('/student/applications', authenticateToken, requireRole('student'), ctrl.getMyApplications);
router.get('/applications/:id', authenticateToken, ctrl.getApplicationById);
router.post('/applications/draft', authenticateToken, requireRole('student'), ctrl.saveDraft);
router.post('/applications/submit', authenticateToken, requireRole('student'), ctrl.submitForApproval);
router.post('/applications/pdf-download', authenticateToken, ctrl.trackPdfDownload);

// Tutor Routes
router.get('/tutor/queue', authenticateToken, requireRole('tutor'), ctrl.getTutorQueue);
router.post('/tutor/decision', authenticateToken, requireRole('tutor'), ctrl.tutorDecision);

// Admin Routes
router.get('/admin/stats', authenticateToken, requireRole('admin'), ctrl.getAdminStats);
router.get('/admin/applications', authenticateToken, requireRole('admin'), ctrl.getAllApplications);
router.get('/admin/users', authenticateToken, requireRole('admin'), ctrl.getAdminUsers);
router.post('/admin/users', authenticateToken, requireRole('admin'), ctrl.createUser);
router.get('/admin/companies', authenticateToken, requireRole('admin'), ctrl.getCompaniesAdmin);
router.post('/admin/companies', authenticateToken, requireRole('admin'), ctrl.addCompany);

module.exports = router;