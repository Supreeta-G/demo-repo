const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const appCtrl = require('../controllers/appController');

console.log("✅ Routes file loaded successfully");

// ====================== PUBLIC ROUTES (No token needed) ======================
router.post('/auth/send-otp', authCtrl.sendOtp);
router.post('/auth/verify-otp', authCtrl.verifyOtp);
router.post('/auth/signup', authCtrl.signup);
router.post('/auth/login', authCtrl.login);
router.post('/auth/reset-password', authCtrl.resetPassword);   // ← MUST BE HERE

// ====================== PROTECTED ROUTES (Token required) ======================
router.use(authenticateToken);

// Shared
router.get('/programmes', appCtrl.getProgrammes);
router.get('/companies', appCtrl.getCompanies);
router.get('/tutors', appCtrl.getTutors);
router.get('/applications/*', appCtrl.getApplicationById);

// Student
router.get('/student/profile', requireRole('student'), appCtrl.getStudentProfile);
router.get('/student/applications', requireRole('student'), appCtrl.getMyApplications);
//router.get('/applications/:id', authenticateToken, ctrl.getApplicationById);
router.post('/applications/draft', requireRole('student'), appCtrl.saveDraft);
router.post('/applications/submit', requireRole('student'), appCtrl.submitForApproval);
router.post('/applications/request-delete', requireRole('student'), appCtrl.requestDelete);
router.post('/applications/pdf-download', appCtrl.trackPdfDownload);
router.post('/applications/upload-offer', requireRole('student'), appCtrl.uploadOfferLetter);
router.post('/applications/upload-parent-permission', authenticateToken, requireRole('student'), appCtrl.uploadParentPermission);
// Tutor
router.get('/tutor/queue', requireRole('tutor'), appCtrl.getTutorQueue);
router.post('/tutor/decision', requireRole('tutor'), appCtrl.tutorDecision);

// Admin
router.get('/admin/stats', requireRole('admin'), appCtrl.getAdminStats);
router.get('/admin/applications', requireRole('admin'), appCtrl.getAllApplications);
router.get('/admin/users', requireRole('admin'), appCtrl.getAdminUsers);
router.post('/admin/users', requireRole('admin'), appCtrl.createUser);
router.get('/admin/companies', requireRole('admin'), appCtrl.getCompaniesAdmin);
router.post('/admin/companies', requireRole('admin'), appCtrl.addCompany);
router.get('/admin/delete-requests', requireRole('admin'), appCtrl.getDeleteRequests);

// Admin Actions
router.delete('/admin/applications/*', requireRole('admin'), appCtrl.adminDeleteApplication);
router.post('/admin/unlock', requireRole('admin'), appCtrl.unlockForm);

module.exports = router;