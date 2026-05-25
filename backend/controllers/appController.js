const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { sendApprovalEmail, sendRejectionEmail } = require('../utils/mailer');
const { sendTutorNotificationEmail } = require('../utils/mailer'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');
//const html_to_pdf = require('html-pdf-node');
// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/offer_letters');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'offer-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});




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

// ==================== SAVE DRAFT - FULL FUNCTION ====================
const saveDraft = async (req, res) => {
  const {
    application_id: existingId,
    company_id, company_name_manual, role_title, intern_type,
    company_address, company_city, company_state, company_country, company_phone,
    duration_type, work_mode, how_obtained,
    start_date, end_date, attendance_days,
    guide_name_industry, guide_department, guide_contact,
    cgpa, semester_completed, ra_courses, pending_courses,
    has_declined_other, declined_company_details,
    stipend, student_note, tutor_id, tutor_email,
    parent_permission_url, offer_letter_url
  } = req.body;

  try {
    const year = new Date().getFullYear();
    const student_id = req.user.user_id;

    // ====================== EDIT MODE ======================
    if (existingId) {
      const { rowCount } = await pool.query(`
        UPDATE internship_applications 
        SET 
          company_id = $1,
          company_name_manual = $2,
          role_title = $3,
          intern_type = $4,
          company_address = $5,
          company_city = $6,
          company_state = $7,
          company_country = $8,
          company_phone = $9,
          duration_type = $10,
          work_mode = $11,
          how_obtained = $12,
          start_date = $13,
          end_date = $14,
          attendance_days = $15,
          guide_name_industry = $16,
          guide_department = $17,
          guide_contact = $18,
          cgpa = $19,
          semester_completed = $20,
          ra_courses = $21,
          pending_courses = $22,
          has_declined_other = $23,
          declined_company_details = $24,
          stipend_amount = $25,
          student_note = $26,
          tutor_id = $27,
          tutor_email = $28,
          parent_permission_url = $29,
          offer_letter_url = $30,
          updated_at = NOW()
        WHERE application_id = $31 AND student_id = $32
      `, [
        company_id || null, company_name_manual || null, role_title || null, intern_type || 'industry',
        company_address || null, company_city || null, company_state || null,
        company_country || 'India', company_phone || null,
        duration_type || 'summer', work_mode || 'on_site', how_obtained || null,
        start_date || null, end_date || null, attendance_days || null,
        guide_name_industry || null, guide_department || null, guide_contact || null,
        cgpa || null, semester_completed || null,
        ra_courses || null, pending_courses || null,
        has_declined_other || false, declined_company_details || null,
        stipend || null,                    // stipend mapped to stipend_amount
        student_note || null, 
        tutor_id || null, tutor_email || null,
        parent_permission_url || null,
        offer_letter_url || null,
        existingId, student_id
      ]);

      if (rowCount === 0) {
        return res.status(404).json({ error: "Application not found" });
      }

      return res.json({ 
        message: "Draft updated successfully", 
        application_id: existingId 
      });
    }

    // ====================== NEW DRAFT ======================
    const countRes = await pool.query(`
      SELECT COUNT(*) as total
      FROM internship_applications
      WHERE student_id = $1 AND EXTRACT(YEAR FROM created_at) = $2
    `, [student_id, year]);

    if (parseInt(countRes.rows[0].total) >= 2) {
      return res.status(400).json({ error: "You can only apply for maximum 2 internships per year." });
    }

    const rollRes = await pool.query("SELECT roll_number FROM users WHERE user_id = $1", [student_id]);
    const rollNumber = rollRes.rows[0]?.roll_number || "UNKNOWN";
    const totalApplications = parseInt(countRes.rows[0].total) + 1;
    const seq = String(totalApplications).padStart(2, '0');
    const application_id = `${rollNumber}/${year}/${seq}/${seq}`;

    const { rows } = await pool.query(`
      INSERT INTO internship_applications (
        application_id, student_id, company_id, company_name_manual, role_title, intern_type,
        company_address, company_city, company_state, company_country, company_phone,
        duration_type, work_mode, how_obtained, start_date, end_date, attendance_days,
        guide_name_industry, guide_department, guide_contact,
        cgpa, semester_completed, ra_courses, pending_courses,
        has_declined_other, declined_company_details, stipend_amount, student_note,
        tutor_id, tutor_email, parent_permission_url, offer_letter_url, status, locked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, 'draft', FALSE)
      RETURNING application_id
    `, [
      application_id, student_id, company_id || null, company_name_manual || null,
      role_title || null, intern_type || 'industry',
      company_address || null, company_city || null, company_state || null,
      company_country || 'India', company_phone || null,
      duration_type || 'summer', work_mode || 'on_site', how_obtained || null,
      start_date || null, end_date || null, attendance_days || null,
      guide_name_industry || null, guide_department || null, guide_contact || null,
      cgpa || null, semester_completed || null,
      ra_courses || null, pending_courses || null,
      has_declined_other || false, declined_company_details || null,
      stipend || null,                    // stipend mapped to stipend_amount
      student_note || null, 
      tutor_id || null, tutor_email || null,
      parent_permission_url || null,
      offer_letter_url || null
    ]);

    res.json({ 
      message: "Draft saved successfully", 
      application_id: rows[0].application_id 
    });

  } catch (err) {
    console.error("Save Draft Error:", err);
    res.status(500).json({ error: err.message || 'Failed to save draft' });
  }
};

// ==================== SUBMIT FOR APPROVAL ====================
const submitForApproval = async (req, res) => {
  const { application_id } = req.body;
  const student_id = req.user.user_id;

  try {
    const { rows } = await pool.query(`
      SELECT a.*, 
             u.email as tutor_email, 
             u.full_name as tutor_name
      FROM internship_applications a
      LEFT JOIN users u ON a.tutor_id = u.user_id
      WHERE a.application_id = $1 AND a.student_id = $2
    `, [application_id, student_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = rows[0];

    // Allow manual tutor entry
    if (!app.tutor_email && !req.body.tutor_email) {
      return res.status(400).json({ error: 'Please enter Tutor Email' });
    }

    // Update with manual tutor details if provided
    await pool.query(`
      UPDATE internship_applications 
      SET 
        status = 'pending_tutor',
        locked = TRUE,
        submitted_at = NOW(),
        updated_at = NOW(),
        tutor_email = COALESCE($1, tutor_email),
        tutor_name = COALESCE($2, tutor_name)
      WHERE application_id = $3
    `, [req.body.tutor_email, req.body.tutor_name, application_id]);

    // Send email to tutor
    const finalTutorEmail = req.body.tutor_email || app.tutor_email;
    if (finalTutorEmail) {
      try {
        await sendTutorNotificationEmail(
          finalTutorEmail,
          req.body.tutor_name || app.tutor_name || 'Tutor',
          app.student_name || 'Student',
          app.company_name_manual || 'Company',
          application_id
        );
      } catch (mailErr) {
        console.error("Tutor notification failed:", mailErr.message);
      }
    }

    res.json({ success: true, message: 'Application submitted successfully for tutor approval!' });

  } catch (err) {
    console.error("Submit Error:", err);
    res.status(500).json({ error: err.message || 'Failed to submit application' });
  }
};

const trackPdfDownload = async (req, res) => {
  const { application_id } = req.body;
  try {
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

const getTutorQueue = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*,
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
      WHERE (a.tutor_id = $1 OR a.tutor_email = $2)     -- ← Changed
        AND a.status = 'pending_tutor'
      ORDER BY a.submitted_at DESC NULLS LAST, a.created_at DESC`, 
      [req.user.user_id, req.user.email]   // Check both tutor_id and tutor_email
    );
    res.json(rows);
  } catch (err) { 
    console.error('getTutorQueue Error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' }); 
  }
};

const tutorDecision = async (req, res) => {
  const { application_id, decision, remarks = '' } = req.body;
  if (!application_id) {
    return res.status(400).json({ error: "Application ID is required" });
  }
  const tutor_id = req.user.user_id;

  try {
    // Accept both 'reject' and 'return'
    const finalDecision = decision === 'approve' ? 'approved' : 'rejected';

    const { rows } = await pool.query(`
  SELECT a.application_id,
         a.company_name_manual,
         s.full_name AS student_name, 
         s.email AS student_email
  FROM internship_applications a
  JOIN users s ON a.student_id = s.user_id
  WHERE a.application_id = $1 
    AND (a.tutor_id = $2 OR a.tutor_email = $3)   -- ← fix
`, [application_id, tutor_id, req.user.email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = rows[0];
    const companyName = app.company_name_manual || 'Company';

    await pool.query(`
      UPDATE internship_applications 
      SET status = $1, 
          tutor_remarks = $2, 
          ${finalDecision === 'approved' ? 'approved_at = NOW()' : 'rejected_at = NOW()'},
          locked = $3,
          updated_at = NOW()
      WHERE application_id = $4
    `, [finalDecision, remarks, finalDecision === 'approved', application_id]);

    // Send email to student
    if (app.student_email) {
      try {
        if (finalDecision === 'approved') {
          await sendApprovalEmail(app.student_email, app.student_name, companyName, application_id);
        } else {
          await sendRejectionEmail(app.student_email, app.student_name, companyName, remarks || 'No remarks provided', application_id);
        }
      } catch (mailErr) {
        console.error("Email failed:", mailErr.message);
      }
    }

    res.json({ 
      success: true, 
      message: `Application ${finalDecision} successfully.` 
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
      pool.query("SELECT COUNT(*) FROM internship_applications WHERE status='pending_tutor'"),
      pool.query("SELECT COUNT(*) FROM internship_applications WHERE status='rejected'"),   // Changed to 'rejected'
      pool.query('SELECT COUNT(*) FROM companies WHERE is_active=TRUE'),
    ]);

    res.json({
      total_students: parseInt(students.rows[0].count),
      total_tutors: parseInt(tutors.rows[0].count),
      total_applications: parseInt(apps.rows[0].count),
      approved: parseInt(approved.rows[0].count),
      pending: parseInt(pending.rows[0].count),
      rejected: parseInt(rejected.rows[0].count),        
      total_companies: parseInt(companies.rows[0].count) || 0,
    });

  } catch (err) { 
    console.error("❌ getAdminStats Error:", err.message);
    res.status(500).json({ 
      error: err.message,
      total_students: 0,
      total_tutors: 0,
      total_applications: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      total_companies: 0
    });
  }
};
// ==================== ADMIN FUNCTIONS ====================
const getAllApplications = async (req, res) => {
  try {
    const { search, status } = req.query;

    let baseQuery = `
      SELECT 
        a.application_id,
        a.status,
        a.duration_type,
        a.created_at,
        a.submitted_at,
        a.updated_at,
        a.locked,
        a.role_title,
        a.work_mode,
        a.start_date,
        a.end_date,
        a.stipend_amount,
        a.guide_name_industry,
        a.guide_contact,
        a.guide_department,
        a.company_name_manual,
        a.company_address,
        a.company_city,
        a.company_state,
        a.company_country,
        a.company_phone,
        a.cgpa,
        a.semester_completed,
        a.ra_courses,
        a.pending_courses,
        a.offer_letter_url,
        a.parent_permission_url,
        a.tutor_remarks,
        a.admin_remarks,
        a.delete_reason,
        a.delete_requested,
        a.has_declined_other,
        a.declined_company_details,
        a.intern_type,
        a.how_obtained,
        a.attendance_days,
        a.student_note,
        COALESCE(c.name, a.company_name_manual) AS company_name,
        c.address  AS co_address,
        c.city     AS co_city,
        c.state    AS co_state,
        c.country  AS co_country,
        s.full_name   AS student_name,
        s.roll_number,
        s.email       AS student_email,
        s.cgpa        AS student_cgpa,
        p.programme,
        p.department,
        COALESCE(u.full_name, 'Not Assigned') AS tutor_name,
        u.email AS tutor_contact_email
      FROM internship_applications a
      LEFT JOIN companies  c ON a.company_id = c.company_id
      JOIN  users          s ON a.student_id = s.user_id
      LEFT JOIN programmes p ON s.prog_id    = p.prog_id
      LEFT JOIN users      u ON a.tutor_id   = u.user_id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      params.push(`%${search}%`);
      baseQuery += ` AND (
        s.full_name ILIKE $${params.length} OR
        s.roll_number ILIKE $${params.length} OR
        COALESCE(c.name, a.company_name_manual) ILIKE $${params.length}
      )`;
    }

    if (status) {
      params.push(status);
      baseQuery += ` AND a.status = $${params.length}`;
    }

    baseQuery += ` ORDER BY a.created_at DESC LIMIT 200`;

    const { rows } = await pool.query(baseQuery, params);
    res.json(rows);

  } catch (err) {
    console.error("getAllApplications Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
const getAdminUsers = async (req, res) => {
  try {
    const { role } = req.query;

    let query = `
      SELECT u.user_id, u.full_name, u.email, u.role, u.roll_number, 
             u.phone, u.created_at, u.last_login_at,
             p.programme
      FROM users u
      LEFT JOIN programmes p ON u.prog_id = p.prog_id
      WHERE 1=1
    `;

    const params = [];

    if (role && role !== 'all') {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }

    query += ` ORDER BY u.role, u.full_name`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("getAdminUsers Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

const createUser = async (req, res) => {
  const { email, password, full_name, role, roll_number, phone } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(`
      INSERT INTO users (email, password_hash, full_name, role, roll_number, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, email, full_name, role
    `, [email, hashedPassword, full_name, role, roll_number || null, phone || null]);

    res.json({ success: true, message: "User created successfully", user: rows[0] });
  } catch (err) {
    console.error("Create User Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getCompaniesAdmin = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM companies 
      ORDER BY is_active DESC, name
    `);
    res.json(rows);
  } catch (err) {
    console.error("getCompaniesAdmin Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

const addCompany = async (req, res) => {
  const { name, address, city, state, country, website } = req.body;
  try {
    const { rows } = await pool.query(`
      INSERT INTO companies (name, address, city, state, country, website, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING *
    `, [name, address, city, state, country, website || null]);

    res.json({ success: true, message: "Company added successfully", company: rows[0] });
  } catch (err) {
    console.error("Add Company Error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getAuditLog = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM audit_log 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    console.error("getAuditLog Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

const getDeleteRequests = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        a.application_id,
        a.delete_reason,
        a.status,
        s.full_name AS student_name,
        s.roll_number,
        COALESCE(c.name, a.company_name_manual) AS company_name,
        a.updated_at
      FROM internship_applications a
      JOIN users s ON a.student_id = s.user_id
      LEFT JOIN companies c ON a.company_id = c.company_id
      WHERE a.delete_requested = TRUE
      ORDER BY a.updated_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("getDeleteRequests Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

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

const adminDeleteApplication = async (req, res) => {
  // This handles IDs with slashes like "24pw33/2026/003"
  let id = req.params.id || req.params[0];

  // Fallback: If ID is split, join all params
  if (!id && req.params) {
    id = Object.values(req.params).join('/');
  }

  if (!id) {
    return res.status(400).json({ error: "Application ID is required" });
  }

  try {
    console.log(`🗑️ Admin attempting to delete: ${id}`);

    const result = await pool.query(
      "DELETE FROM internship_applications WHERE application_id = $1", 
      [id]
    );

    if (result.rowCount === 0) {
      console.log(`❌ Application not found: ${id}`);
      return res.status(404).json({ error: "Application not found" });
    }

    console.log(`✅ Successfully deleted application: ${id}`);
    res.json({ success: true, message: "Application deleted successfully" });
  } catch (err) {
    console.error("Admin Delete Error:", err);
    res.status(500).json({ error: err.message || "Failed to delete application" });
  }
};

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

// ==================== UPLOAD OFFER LETTER ====================
const uploadOfferLetter = async (req, res) => {
  console.log("🔥 Upload Offer Letter Called");
  console.log("Files:", req.files);
  console.log("Body:", req.body);

  try {
    if (!req.files || !req.files.offer_letter) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.offer_letter;
    let { application_id } = req.body;

    // If no application_id, create a temporary one or skip DB update
    if (!application_id) {
      application_id = `temp_${Date.now()}`;
      console.log("⚠️ No application_id provided. Using temp ID:", application_id);
    }

    // Ensure directory exists
    const uploadDir = path.join(__dirname, '../uploads/offer_letters');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${application_id}_${Date.now()}${path.extname(file.name)}`;
    const filePath = path.join(uploadDir, fileName);

    await file.mv(filePath);

    const fileUrl = `/uploads/offer_letters/${fileName}`;

    // Update database only if real application_id exists
    if (!application_id.startsWith('temp_')) {
      await pool.query(
        `UPDATE internship_applications 
         SET offer_letter_url = $1, updated_at = NOW() 
         WHERE application_id = $2`,
        [fileUrl, application_id]
      );
    }

    console.log("✅ Offer Letter Saved:", fileUrl);

    res.json({ 
      success: true, 
      message: "Offer letter uploaded successfully", 
      url: fileUrl 
    });

  } catch (err) {
    console.error("Upload Offer Letter Error:", err);
    res.status(500).json({ error: "Failed to upload offer letter" });
  }
};
const uploadParentPermission = async (req, res) => {
  console.log("🔥 Upload Parent Permission Called");
  console.log("Files:", req.files);
  console.log("Body:", req.body);

  try {
    if (!req.files || !req.files.parent_permission) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.parent_permission;
    let { application_id } = req.body;

    // If no application_id, create a temporary one
    if (!application_id) {
      application_id = `temp_${Date.now()}`;
      console.log("⚠️ No application_id provided. Using temp ID:", application_id);
    }

    // Ensure directory exists
    const uploadDir = path.join(__dirname, '../uploads/parent_permissions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `parent_${application_id}_${Date.now()}${path.extname(file.name)}`;
    const filePath = path.join(uploadDir, fileName);

    await file.mv(filePath);

    const fileUrl = `/uploads/parent_permissions/${fileName}`;

    // Update database only if real application_id exists
    if (!application_id.startsWith('temp_')) {
      await pool.query(
        `UPDATE internship_applications 
         SET parent_permission_url = $1, updated_at = NOW() 
         WHERE application_id = $2`,
        [fileUrl, application_id]
      );
    }

    console.log("✅ Parent Permission Letter Saved:", fileUrl);

    res.json({ 
      success: true, 
      message: "Parent permission letter uploaded successfully", 
      url: fileUrl 
    });

  } catch (err) {
    console.error("Upload Parent Permission Error:", err);
    res.status(500).json({ error: "Failed to upload parent permission letter" });
  }
};




// ====================== PDF GENERATION WITH HANDLEBARS ====================


// Register date helper
handlebars.registerHelper('formatDate', function(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
});



// ====================== FINAL RELIABLE PDF GENERATION ======================
const puppeteer = require('puppeteer');

const generatePDF = async (req, res) => {
  let browser;
  try {
    console.log("📥 PDF REQUEST STARTED");
    const { application_id } = req.body;
    console.log("Application ID:", application_id);

    if (!application_id) {
      console.log("❌ No application_id");
      return res.status(400).json({ error: "Application ID is required" });
    }

    console.log("🔍 Querying database...");
    const { rows } = await pool.query(`
      SELECT a.*, 
             s.full_name as student_name, 
             s.roll_number,
             s.department,
             COALESCE(c.name, a.company_name_manual) as company_name
      FROM internship_applications a
      JOIN users s ON a.student_id = s.user_id
      LEFT JOIN companies c ON a.company_id = c.company_id
      WHERE a.application_id = $1
    `, [application_id]);

    if (rows.length === 0) {
      console.log("❌ Application not found");
      return res.status(404).json({ error: "Application not found" });
    }

    const app = rows[0];
    console.log("✅ Data loaded. Duration:", app.duration_type);

    app.currentDate = new Date();

    let templateName = 'summer-internship.hbs';
    if (app.duration_type === 'six_month') {
      templateName = 'six-month-internship.hbs';
    }

    const templatePath = path.join(__dirname, '../templates', templateName);
    console.log("📄 Template path:", templatePath);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }

    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    console.log("✅ Template loaded, length:", templateHtml.length);

    const compiledTemplate = handlebars.compile(templateHtml);
    const htmlContent = compiledTemplate(app);
    console.log("✅ HTML compiled, length:", htmlContent.length);

    console.log("🚀 Launching Puppeteer...");
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    console.log("✅ Page content set");

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
    });

    console.log("✅ PDF GENERATED! Size:", pdfBuffer.length, "bytes");

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PSG_Internship_${app.roll_number || 'Student'}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("❌ PDF CRASHED:", err.message);
    console.error("❌ STACK:", err.stack);
    res.status(500).json({ error: err.message || "Failed to generate PDF" });
  } finally {
    if (browser) {
      console.log("🔒 Closing browser");
      await browser.close();
    }
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
  generatePDF,
  uploadOfferLetter,
  uploadParentPermission,
  upload,                    // ← Important
};