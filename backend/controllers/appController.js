const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { sendApprovalEmail, sendRejectionEmail } = require('../utils/mailer');
const { sendTutorNotificationEmail } = require('../utils/mailer'); 

// ──── SHARED ────

const getProgrammes = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM programmes ORDER BY department, programme');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getCompanies = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT company_id, name, address, city, state, country FROM companies WHERE is_active=TRUE ORDER BY name'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getTutors = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT user_id, full_name, email FROM users WHERE role='tutor' ORDER BY full_name"
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ──── STUDENT ────

const getStudentProfile = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*, p.programme, p.department FROM users u
       LEFT JOIN programmes p ON u.prog_id = p.prog_id
       WHERE u.user_id=$1`, [req.user.user_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...safe } = rows[0];
    res.json(safe);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getMyApplications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, 
              COALESCE(c.name, a.company_name_manual) AS company_name,
              u.full_name AS tutor_name
       FROM internship_applications a
       LEFT JOIN companies c ON a.company_id = c.company_id
       LEFT JOIN users u ON a.tutor_id = u.user_id
       WHERE a.student_id=$1
       ORDER BY a.created_at DESC`, [req.user.user_id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getApplicationById = async (req, res) => {
  // Capture full ID with slashes (e.g. 24pw33/2026/003)
  const application_id = req.params[0];

  try {
    const { rows } = await pool.query(
      `SELECT a.*,
              COALESCE(c.name, a.company_name_manual) AS company_display_name,
              c.name AS company_name, c.address AS co_address,
              c.city AS co_city, c.state AS co_state, c.country AS co_country,
              u.full_name AS tutor_name, u.email AS tutor_email,
              s.full_name AS student_name, s.roll_number, s.email AS student_email,
              s.cgpa AS student_cgpa,
              p.programme, p.department
       FROM internship_applications a
       LEFT JOIN companies c ON a.company_id = c.company_id
       LEFT JOIN users u ON a.tutor_id = u.user_id
       JOIN users s ON a.student_id = s.user_id
       LEFT JOIN programmes p ON s.prog_id = p.prog_id
       WHERE a.application_id = $1`, [application_id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Application not found' });

    const app = rows[0];

    // Permission check
    if (req.user.role === 'student' && app.student_id !== req.user.user_id)
      return res.status(403).json({ error: 'Forbidden' });
    if (req.user.role === 'tutor' && app.tutor_id !== req.user.user_id)
      return res.status(403).json({ error: 'Forbidden' });

    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ==================== SAVE DRAFT ====================
const saveDraft = async (req, res) => {
  const {
    company_id, company_name_manual, role_title, intern_type,
    company_address, company_city, company_state, company_country, company_phone,
    duration_type, work_mode, how_obtained,
    start_date, end_date, attendance_days,
    guide_name_industry, guide_department, guide_contact,
    cgpa, semester_completed, ra_courses, pending_courses,
    has_declined_other, declined_company_details,
    stipend_amount, student_note, tutor_id, tutor_email
  } = req.body;

  try {
    const year = new Date().getFullYear();

    // Check limit: Max 2 applications per year
    const countRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM internship_applications
      WHERE student_id = $1 AND EXTRACT(YEAR FROM created_at) = $2
    `, [req.user.user_id, year]);

    if (parseInt(countRes.rows[0].total) >= 2) {
      return res.status(400).json({ 
        error: "You can only apply for maximum 2 internships per year." 
      });
    }

    // Check if student has any pending application
    const pendingRes = await pool.query(`
      SELECT application_id FROM internship_applications
      WHERE student_id = $1 AND status = 'pending_tutor'
    `, [req.user.user_id]);

    if (pendingRes.rows.length > 0) {
      return res.status(400).json({ 
        error: "You already have a pending application. Please wait for tutor decision." 
      });
    }

    // Get student roll number
    const rollRes = await pool.query(
      "SELECT roll_number FROM users WHERE user_id = $1", 
      [req.user.user_id]
    );

    if (!rollRes.rows.length) 
      return res.status(404).json({ error: "Student not found" });

    const rollNumber = rollRes.rows[0].roll_number || "UNKNOWN";
    const totalApplications = parseInt(countRes.rows[0].total) + 1;
    const seq = String(totalApplications).padStart(2, '0');
    const application_id = `${rollNumber}/${year}/${seq}/${seq}`;

    // Insert new draft (unlocked)
    const { rows } = await pool.query(`
      INSERT INTO internship_applications (
        application_id, student_id, company_id, company_name_manual, role_title, intern_type,
        company_address, company_city, company_state, company_country, company_phone,
        duration_type, work_mode, how_obtained, start_date, end_date, attendance_days,
        guide_name_industry, guide_department, guide_contact,
        cgpa, semester_completed, ra_courses, pending_courses,
        has_declined_other, declined_company_details, stipend_amount, student_note,
        tutor_id, tutor_email, status, locked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, 'draft', FALSE)
      RETURNING application_id
    `, [
      application_id, req.user.user_id, company_id || null, company_name_manual || null,
      role_title || null, intern_type || 'industry',
      company_address || null, company_city || null, company_state || null,
      company_country || 'India', company_phone || null,
      duration_type || 'summer', work_mode || 'on_site', how_obtained || null,
      start_date || null, end_date || null, attendance_days || null,
      guide_name_industry || null, guide_department || null, guide_contact || null,
      cgpa || null, semester_completed || null,
      ra_courses || null, pending_courses || null,
      has_declined_other || false, declined_company_details || null,
      stipend_amount || null, student_note || null, 
      tutor_id || null, tutor_email || null
    ]);

    res.json({ 
      message: "Draft saved successfully", 
      application_id: rows[0].application_id 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to save draft' });
  }
};

// ==================== SUBMIT FOR APPROVAL ====================
const submitForApproval = async (req, res) => {
  const { application_id } = req.body;
  const student_id = req.user.user_id;

  try {
    // Fetch application with necessary details
    const { rows } = await pool.query(`
      SELECT a.*,
             s.full_name AS student_name,
             s.email AS student_email,
             COALESCE(a.tutor_email, u.email) AS tutor_email,
             COALESCE(a.tutor_name, u.full_name) AS tutor_name
      FROM internship_applications a
      JOIN users s ON a.student_id = s.user_id
      LEFT JOIN users u ON a.tutor_id = u.user_id
      WHERE a.application_id = $1 AND a.student_id = $2
    `, [application_id, student_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = rows[0];

    // Lock and submit
    await pool.query(`
      UPDATE internship_applications 
      SET status = 'pending_tutor',
          locked = TRUE,
          submitted_at = NOW(),
          updated_at = NOW()
      WHERE application_id = $1
    `, [application_id]);

    // Send tutor notification
    if (app.tutor_email) {
      try {
        await sendTutorNotificationEmail(
          app.tutor_email,
          app.tutor_name || 'Tutor',
          app.student_name,
          app.company_name_manual || 'Company',
          application_id
        );
      } catch (mailErr) {
        console.error("Tutor email failed:", mailErr.message);
      }
    }

    res.json({ 
      success: true, 
      message: 'Application submitted successfully! Form is now locked.' 
    });

  } catch (err) {
    console.error("Submit Error:", err);
    res.status(500).json({ error: err.message || 'Failed to submit application' });
  }
};
const trackPdfDownload = async (req, res) => {
  const { application_id } = req.body;
  try {
    // Only allow download if approved or if tutor/admin
    if (req.user.role === 'student') {
      const { rows } = await pool.query(
        "SELECT status FROM internship_applications WHERE application_id=$1 AND student_id=$2",
        [application_id, req.user.user_id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      if (rows[0].status !== 'approved')
        return res.status(403).json({ error: 'PDF download is only available after tutor approval.' });
    }

    await pool.query(
      `UPDATE internship_applications 
       SET pdf_download_count = pdf_download_count + 1, pdf_generated_at=NOW(), updated_at=NOW()
       WHERE application_id=$1`,
      [application_id]
    );

    await pool.query(
      `INSERT INTO audit_log (application_id, user_id, action) VALUES ($1,$2,'pdf_downloaded')`,
      [application_id, req.user.user_id]
    );

    res.json({ allowed: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ──── TUTOR ────

// ──── TUTOR ────

const getTutorQueue = async (req, res) => {
  try {
    const { filter } = req.query;   // Optional: ?filter=pending_tutor

    let statusCondition = "a.status IN ('pending_tutor','approved','rejected')";

    if (filter === 'pending_tutor') {
      statusCondition = "a.status = 'pending_tutor'";
    } else if (filter === 'reviewed') {
      statusCondition = "a.status IN ('approved','rejected')";
    }

    const { rows } = await pool.query(
      `SELECT a.*,
              COALESCE(c.name, a.company_name_manual) AS company_name,
              s.full_name AS student_name, 
              s.roll_number, 
              s.email AS student_email,
              p.programme, 
              p.department
       FROM internship_applications a
       LEFT JOIN companies c ON a.company_id = c.company_id
       JOIN users s ON a.student_id = s.user_id
       LEFT JOIN programmes p ON s.prog_id = p.prog_id
       WHERE a.tutor_id = $1 
         AND ${statusCondition}
       ORDER BY a.submitted_at DESC NULLS LAST, a.created_at DESC`, 
      [req.user.user_id]
    );

    res.json(rows);
  } catch (err) { 
    console.error('getTutorQueue Error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' }); 
  }
};

const tutorDecision = async (req, res) => {
  const { application_id, decision, remarks } = req.body;

  try {
    let finalDecision = decision?.toLowerCase();

    if (!['approve', 'reject'].includes(finalDecision)) {
      return res.status(400).json({ error: "Invalid decision. Use 'approve' or 'reject'" });
    }

    const newStatus = finalDecision === 'approve' ? 'approved' : 'rejected';

    const { rows } = await pool.query(`
      UPDATE internship_applications 
      SET 
        status = $1,
        tutor_remarks = $2,
        decided_at = NOW(),
        updated_at = NOW(),
        locked = $3
      WHERE application_id = $4
      RETURNING *, 
                (SELECT email FROM users WHERE user_id = student_id) as student_email,
                (SELECT full_name FROM users WHERE user_id = student_id) as student_name
    `, [newStatus, remarks || null, finalDecision === 'approve', application_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = rows[0];

    // Send Email Notification to Student
    if (app.student_email) {
      try {
        console.log(`📧 Attempting to send ${finalDecision} email to: ${app.student_email}`);

        if (finalDecision === 'approve') {
          await sendApprovalEmail(app.student_email, app.student_name || 'Student', application_id);
          console.log(`✅ Approval email sent successfully to ${app.student_email}`);
        } else {
          await sendRejectionEmail(app.student_email, app.student_name || 'Student', application_id, remarks);
          console.log(`✅ Rejection email sent successfully to ${app.student_email}`);
        }
      } catch (mailErr) {
        console.error("❌ Email sending failed:", mailErr.message);
      }
    } else {
      console.log("⚠️ No student email found");
    }

    res.json({
      success: true,
      message: `Application ${newStatus.toUpperCase()} successfully.`,
      status: newStatus
    });

  } catch (err) {
    console.error("Tutor Decision Error:", err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
};
// ──── ADMIN ────

const getAdminStats = async (req, res) => {
  try {
    const [students, tutors, apps, approved, pending, rejected, companies] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role='student'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role='tutor'"),
      pool.query('SELECT COUNT(*) FROM internship_applications'),
      pool.query("SELECT COUNT(*) FROM internship_applications WHERE status='approved'"),
      pool.query("SELECT COUNT(*) FROM internship_applications WHERE status='pending_tutor'"),   // ← This must be pending_tutor
      pool.query("SELECT COUNT(*) FROM internship_applications WHERE status='rejected'"),
      pool.query('SELECT COUNT(*) FROM companies WHERE is_active=TRUE'),
    ]);

    res.json({
      total_students: parseInt(students.rows[0].count),
      total_tutors: parseInt(tutors.rows[0].count),
      total_applications: parseInt(apps.rows[0].count),
      approved: parseInt(approved.rows[0].count),
      pending: parseInt(pending.rows[0].count),           // ← Should now show correctly
      rejected: parseInt(rejected.rows[0].count),
      total_companies: parseInt(companies.rows[0].count),
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
};

const getAllApplications = async (req, res) => {
  const { search, status } = req.query;
  try {
    let q = `SELECT a.application_id, a.status, a.duration_type, a.work_mode,
                    a.start_date, a.end_date, a.created_at, a.submitted_at, a.approved_at,
                    COALESCE(c.name, a.company_name_manual) AS company_name,
                    s.full_name AS student_name, s.roll_number, s.email AS student_email,
                    u.full_name AS tutor_name, p.programme, p.department
             FROM internship_applications a
             LEFT JOIN companies c ON a.company_id = c.company_id
             JOIN users s ON a.student_id = s.user_id
             LEFT JOIN users u ON a.tutor_id = u.user_id
             LEFT JOIN programmes p ON s.prog_id = p.prog_id
             WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); q += ` AND a.status=$${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      q += ` AND (s.full_name ILIKE $${params.length} OR s.roll_number ILIKE $${params.length} OR COALESCE(c.name,'') ILIKE $${params.length})`;
    }
    q += ' ORDER BY a.created_at DESC';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAdminUsers = async (req, res) => {
  const { role } = req.query;
  try {
    let q = `SELECT u.user_id, u.full_name, u.email, u.role, u.roll_number,
                    u.phone, u.created_at, u.last_login_at, p.programme, p.department
             FROM users u LEFT JOIN programmes p ON u.prog_id = p.prog_id WHERE 1=1`;
    const params = [];
    if (role) { params.push(role); q += ` AND u.role=$${params.length}`; }
    q += ' ORDER BY u.created_at DESC';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const createUser = async (req, res) => {
  const { email, password, full_name, role, roll_number, prog_id, phone } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, role, roll_number, prog_id, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING user_id, email, full_name, role`,
      [email, hash, full_name, role, roll_number || null, prog_id || null, phone || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email or roll number already exists.' });
    res.status(500).json({ error: err.message });
  }
};

const getCompaniesAdmin = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM companies ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const addCompany = async (req, res) => {
  const { name, address, city, state, country, website } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO companies (name,address,city,state,country,website,added_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, address, city, state, country, website, req.user.user_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAuditLog = async (req, res) => {
  const { application_id } = req.query;
  try {
    let q = `SELECT l.*, u.full_name, u.email, u.role FROM audit_log l 
             LEFT JOIN users u ON l.user_id = u.user_id WHERE 1=1`;
    const params = [];
    if (application_id) { params.push(application_id); q += ` AND l.application_id=$${params.length}`; }
    q += ' ORDER BY l.created_at DESC LIMIT 200';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
// ==================== ADMIN: GET DELETE REQUESTS ====================
const getDeleteRequests = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.application_id, a.delete_reason, a.status,
             s.full_name AS student_name, s.roll_number,
             COALESCE(c.name, a.company_name_manual) AS company_name
      FROM internship_applications a
      JOIN users s ON a.student_id = s.user_id
      LEFT JOIN companies c ON a.company_id = c.company_id
      WHERE a.delete_requested = TRUE
      ORDER BY a.updated_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== STUDENT: REQUEST DELETE ====================
const requestDelete = async (req, res) => {
  const { application_id, reason } = req.body;

  try {
    await pool.query(`
      UPDATE internship_applications 
      SET delete_requested = TRUE, 
          delete_reason = $1,
          updated_at = NOW()
      WHERE application_id = $2 AND student_id = $3
    `, [reason || 'No reason provided', application_id, req.user.user_id]);

    res.json({ message: "Delete request sent to Admin successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== ADMIN: DELETE APPLICATION ====================
const adminDeleteApplication = async (req, res) => {
  // Handle ID with slashes (24pw33/2026/006)
  let id = req.params[0];   // This captures the full path after /applications/

  try {
    const result = await pool.query(
      "DELETE FROM internship_applications WHERE application_id = $1", 
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    console.log("✅ Deleted:", id);
    res.json({ success: true, message: "Application deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete application" });
  }
};

// ==================== ADMIN: UNLOCK FORM ====================
const unlockForm = async (req, res) => {
  const { application_id } = req.body;

  try {
    await pool.query(`
      UPDATE internship_applications 
      SET locked = FALSE, 
          admin_unlocked = TRUE,
          updated_at = NOW()
      WHERE application_id = $1
    `, [application_id]);

    res.json({ success: true, message: "Form unlocked successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==================== FINAL EXPORTS ====================
module.exports = {
  getProgrammes, 
  getCompanies, 
  getTutors,
  getStudentProfile, 
  getMyApplications, 
  getApplicationById,
  saveDraft, 
  submitForApproval, 
  trackPdfDownload,
  getTutorQueue, 
  tutorDecision,
  getAdminStats, 
  getAllApplications, 
  getAdminUsers, 
  createUser,
  getCompaniesAdmin, 
  addCompany, 
  getAuditLog,
  getDeleteRequests,
  
  requestDelete,
  adminDeleteApplication,
  unlockForm,
};