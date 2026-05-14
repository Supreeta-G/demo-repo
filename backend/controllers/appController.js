const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { sendApprovalEmail, sendRejectionEmail } = require('../utils/mailer');

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
       WHERE a.application_id=$1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Application not found' });
    const app = rows[0];

    if (req.user.role === 'student' && app.student_id !== req.user.user_id)
      return res.status(403).json({ error: 'Forbidden' });
    if (req.user.role === 'tutor' && app.tutor_id !== req.user.user_id)
      return res.status(403).json({ error: 'Forbidden' });

    res.json(app);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const saveDraft = async (req, res) => {
  const {
    company_id, company_name_manual, role_title, intern_type,
    company_address, company_city, company_state, company_country, company_phone,
    duration_type, work_mode, how_obtained,
    start_date, end_date, attendance_days,
    guide_name_industry, guide_department, guide_contact,
    cgpa, semester_completed, ra_courses, pending_courses,
    has_declined_other, declined_company_details,
    stipend_amount, student_note, tutor_id,
  } = req.body;

  try {
    const existing = await pool.query(
      "SELECT application_id FROM internship_applications WHERE student_id=$1 AND status='draft' LIMIT 1",
      [req.user.user_id]
    );

    let appId;
    const params = [
      company_id || null, company_name_manual || null, role_title || null,
      intern_type || 'industry',
      company_address || null, company_city || null, company_state || null,
      company_country || 'India', company_phone || null,
      duration_type || 'summer', work_mode || 'on_site', how_obtained || null,
      start_date || null, end_date || null, attendance_days || null,
      guide_name_industry || null, guide_department || null, guide_contact || null,
      cgpa || null, semester_completed || null,
      ra_courses || null, pending_courses || null,
      has_declined_other || false, declined_company_details || null,
      stipend_amount || null, student_note || null, tutor_id || null,
    ];

    if (existing.rows.length > 0) {
      appId = existing.rows[0].application_id;
      await pool.query(
        `UPDATE internship_applications SET
          company_id=$1, company_name_manual=$2, role_title=$3, intern_type=$4,
          company_address=$5, company_city=$6, company_state=$7, company_country=$8, company_phone=$9,
          duration_type=$10, work_mode=$11, how_obtained=$12,
          start_date=$13, end_date=$14, attendance_days=$15,
          guide_name_industry=$16, guide_department=$17, guide_contact=$18,
          cgpa=$19, semester_completed=$20, ra_courses=$21, pending_courses=$22,
          has_declined_other=$23, declined_company_details=$24,
          stipend_amount=$25, student_note=$26, tutor_id=$27, updated_at=NOW()
         WHERE application_id=$28`,
        [...params, appId]
      );
    } else {
      const r = await pool.query(
        `INSERT INTO internship_applications
          (student_id, company_id, company_name_manual, role_title, intern_type,
           company_address, company_city, company_state, company_country, company_phone,
           duration_type, work_mode, how_obtained, start_date, end_date, attendance_days,
           guide_name_industry, guide_department, guide_contact,
           cgpa, semester_completed, ra_courses, pending_courses,
           has_declined_other, declined_company_details, stipend_amount, student_note, tutor_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,'draft')
         RETURNING application_id`,
        [req.user.user_id, ...params]
      );
      appId = r.rows[0].application_id;
    }

    // Audit
    await pool.query(
      `INSERT INTO audit_log (application_id, user_id, action, details) VALUES ($1,$2,'draft_saved',$3)`,
      [appId, req.user.user_id, JSON.stringify({ duration_type, company_id, company_name_manual })]
    );

    res.json({ message: 'Draft saved', application_id: appId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const submitForApproval = async (req, res) => {
  const { application_id } = req.body;

  try {
    const { rows } = await pool.query(
      `SELECT a.*, 
              s.full_name AS student_name, 
              t.full_name AS tutor_name, 
              t.email AS tutor_email,
              COALESCE(c.name, a.company_name_manual) AS company_name
       FROM internship_applications a
       JOIN users s ON a.student_id = s.user_id
       JOIN users t ON a.tutor_id = t.user_id
       LEFT JOIN companies c ON a.company_id = c.company_id
       WHERE a.application_id=$1 AND a.student_id=$2`,
      [application_id, req.user.user_id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Application not found' });

    const app = rows[0];

    if (app.status !== 'draft') 
      return res.status(400).json({ error: 'Only draft applications can be submitted.' });

    if (!app.tutor_id) 
      return res.status(400).json({ error: 'Please select a tutor before submitting.' });

    // Update status
    await pool.query(
      `UPDATE internship_applications 
       SET status = 'pending_tutor', 
           submitted_at = NOW(), 
           updated_at = NOW() 
       WHERE application_id = $1`,
      [application_id]
    );

    // Send email to Tutor
    try {
      await sendTutorNotificationEmail(
        app.tutor_email, 
        app.tutor_name, 
        app.student_name, 
        app.company_name, 
        application_id
      );
    } catch (e) {
      console.error("Tutor email failed:", e.message);
    }

    res.json({ message: 'Application submitted successfully! Tutor has been notified via email.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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
  if (!['approve', 'reject'].includes(decision))
    return res.status(400).json({ error: 'Invalid decision' });

  try {
    const { rows } = await pool.query(
      "SELECT a.*, s.full_name AS student_name, s.email AS student_email, COALESCE(c.name, a.company_name_manual) AS company_name FROM internship_applications a JOIN users s ON a.student_id=s.user_id LEFT JOIN companies c ON a.company_id=c.company_id WHERE a.application_id=$1 AND a.tutor_id=$2 AND a.status='pending_tutor'",
      [application_id, req.user.user_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Application not found or not pending.' });

    const app = rows[0];
    const newStatus = decision === 'approve' ? 'approved' : 'rejected';
    const nowField = decision === 'approve' ? ', approved_at=NOW()' : ', rejected_at=NOW()';

    await pool.query(
      `UPDATE internship_applications SET status=$1, tutor_remarks=$2, tutor_reviewed_at=NOW(), updated_at=NOW()${nowField} WHERE application_id=$3`,
      [newStatus, remarks || null, application_id]
    );

    // Audit
    await pool.query(
      `INSERT INTO audit_log (application_id, user_id, action, details) VALUES ($1,$2,$3,$4)`,
      [application_id, req.user.user_id, `tutor_${newStatus}`, JSON.stringify({ remarks })]
    );

    // Email notification to student
    try {
      if (decision === 'approve') {
        await sendApprovalEmail(app.student_email, app.student_name, application_id, app.company_name, remarks);
      } else {
        await sendRejectionEmail(app.student_email, app.student_name, application_id, app.company_name, remarks);
      }
      // Log email
      await pool.query(
        `INSERT INTO email_notifications (application_id, recipient_email, subject, status) VALUES ($1,$2,$3,'sent')`,
        [application_id, app.student_email, `Application ${newStatus} – ${app.company_name}`]
      );
    } catch (mailErr) {
      console.error('Email send error:', mailErr.message);
    }

    res.json({ message: `Application ${newStatus}.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
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



module.exports = {
  getProgrammes, getCompanies, getTutors,
  getStudentProfile, getMyApplications, getApplicationById,
  saveDraft, submitForApproval, trackPdfDownload,
  getTutorQueue, tutorDecision,
  getAdminStats, getAllApplications, getAdminUsers, createUser,
  getCompaniesAdmin, addCompany, getAuditLog,
};
