// routes/pdfGenerator.js
const express = require('express');
const router  = express.Router();
const puppeteer   = require('puppeteer');
const handlebars  = require('handlebars');
const fs   = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// ─── Register Handlebars Helpers ─────────────────────────────────────────────

handlebars.registerHelper('formatDate', (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
});

handlebars.registerHelper('eq', (a, b) => a === b);
handlebars.registerHelper('or', (a, b) => a || b || '');

// ─── Helper: compile HBS template ────────────────────────────────────────────
const compileTemplate = (templateName, data) => {
  const templatePath   = path.join(__dirname, '../templates', templateName);
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template       = handlebars.compile(templateSource);

  // ── Build RA / Pending course arrays for Handlebars #each ───────────────
  // ra_courses and pending_courses arrive as comma-separated strings from DB
  const raCoursesList = data.ra_courses
    ? data.ra_courses.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const pendingCoursesList = data.pending_courses
    ? data.pending_courses.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // We want the academic table to always show at least 8 rows total.
  // Rows used by RA list come first; remaining rows are filled by pending courses
  // padded with blanks.
  const TABLE_ROWS   = 8;
  const raRowsCount  = Math.max(raCoursesList.length, 0);
  const pendingSlots = Math.max(TABLE_ROWS - raRowsCount, pendingCoursesList.length);
  const pendingPadRows = Array.from({ length: pendingSlots }, (_, i) =>
    pendingCoursesList[i] || ''
  );

  const enrichedData = {
    // ── spread all raw DB fields first ──────────────────────────────────────
    ...data,

    // ── Date fields ──────────────────────────────────────────────────────────
    currentDate: new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    }),
    start_date: data.start_date
      ? new Date(data.start_date).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : '__________',
    end_date: data.end_date
      ? new Date(data.end_date).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'long', year: 'numeric',
        })
      : '__________',

    // ── Student fields ────────────────────────────────────────────────────────
    student_name: data.student_name   || '__________',
    roll_number:  data.roll_number    || '__________',
    programme:    data.programme      || '',
    cgpa:         data.cgpa           ?? data.student_cgpa ?? '',
    student_cgpa: data.student_cgpa   ?? data.cgpa         ?? '',

    // ── Department ───────────────────────────────────────────────────────────
    department: data.department || data.programme || '__________',

    // ── Company / address ────────────────────────────────────────────────────
    company_name:    data.company_name    || data.company_name_manual || '__________',
    company_address: data.company_address || data.co_address || '',
    company_city:    data.company_city    || data.co_city    || '',
    company_state:   data.company_state   || data.co_state   || '',
    company_phone:   data.company_phone   || '',

    // ── Internship type / mode ───────────────────────────────────────────────
    intern_type:   data.intern_type  || '',
    work_mode:     data.work_mode    || '',
    how_obtained:  data.how_obtained || '',
    role_title:    data.role_title   || '',

    // ── Guide – industry side ─────────────────────────────────────────────────
    guide_name_industry: data.guide_name_industry || data.industry_guide_name || '',
    guide_contact:       data.guide_contact       || data.industry_guide_contact || '',

    // ── Guide – department side (tutor from JOIN or manual entry) ────────────
    // Priority: explicit guide_name_dept > tutor_name (from JOIN on users table)
    guide_name_dept: data.guide_name_dept || data.tutor_name || '__________',

    // ── Stipend ───────────────────────────────────────────────────────────────
    stipend_amount: (() => {
      const raw = data.stipend_amount ?? data.stipend;
      if (raw === null || raw === undefined) return '';
      const str = String(raw).trim().toLowerCase();
      if (str === '' || str === '0' || str === 'nil') return '';
      return raw;
    })(),

    // ── Semester / programme ──────────────────────────────────────────────────
    semester_completed: data.semester_completed ?? '',

    // ── Declined internship fields ────────────────────────────────────────────
    has_declined_other:     data.has_declined_other     || false,
    declined_company_name:  data.declined_company_name  || data.declined_company_details || '',
    declined_start_date:    data.declined_start_date    || '',
    declined_end_date:      data.declined_end_date      || '',
    declined_guide_name:    data.declined_guide_name    || '',

    // ── RA / Pending course arrays for #each in template ─────────────────────
    ra_courses_list:  raCoursesList.length  ? raCoursesList  : null,
    pending_pad_rows: pendingPadRows,

    // ── Offer / parent letter URLs (not rendered in PDF but kept for reference) ─
    offer_letter_url:      data.offer_letter_url      || '',
    parent_permission_url: data.parent_permission_url || '',
  };

  console.log('📋 Template data:', JSON.stringify({
    student_name:        enrichedData.student_name,
    roll_number:         enrichedData.roll_number,
    programme:           enrichedData.programme,
    department:          enrichedData.department,
    company_name:        enrichedData.company_name,
    company_address:     enrichedData.company_address,
    company_city:        enrichedData.company_city,
    company_state:       enrichedData.company_state,
    company_phone:       enrichedData.company_phone,
    role_title:          enrichedData.role_title,
    start_date:          enrichedData.start_date,
    end_date:            enrichedData.end_date,
    guide_name_industry: enrichedData.guide_name_industry,
    guide_contact:       enrichedData.guide_contact,
    guide_name_dept:     enrichedData.guide_name_dept,
    stipend_amount:      enrichedData.stipend_amount,
    cgpa:                enrichedData.cgpa,
    semester_completed:  enrichedData.semester_completed,
    ra_courses_list:     enrichedData.ra_courses_list,
    pending_pad_rows:    enrichedData.pending_pad_rows,
    declined_company_name: enrichedData.declined_company_name,
  }, null, 2));

  return template(enrichedData);
};

// ─── Helper: generate PDF from HTML string ───────────────────────────────────
const generatePDF = async (htmlContent) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', right: '16mm', bottom: '10mm', left: '16mm' },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

// ─── Shared DB query ─────────────────────────────────────────────────────────
const fetchApplication = async (application_id) => {
  const { rows } = await pool.query(`
    SELECT
      a.*,
      COALESCE(c.name, a.company_name_manual)  AS company_name,
      c.address                                 AS co_address,
      c.city                                    AS co_city,
      c.state                                   AS co_state,
      c.country                                 AS co_country,
      s.full_name                               AS student_name,
      s.roll_number,
      s.email                                   AS student_email,
      s.cgpa                                    AS student_cgpa,
      p.programme,
      p.department,
      u.full_name                               AS tutor_name
    FROM internship_applications a
    LEFT JOIN companies   c ON a.company_id  = c.company_id
    JOIN       users      s ON a.student_id  = s.user_id
    LEFT JOIN  programmes p ON s.prog_id     = p.prog_id
    LEFT JOIN  users      u ON a.tutor_id    = u.user_id
    WHERE a.application_id = $1
  `, [application_id]);

  return rows[0] || null;
};

// ════════════════════════════════════════════════════════════════════════════
// POST /api/generate-pdf
// Body: { application_id }
// ════════════════════════════════════════════════════════════════════════════
router.post('/generate-pdf', async (req, res) => {
  try {
    const { application_id } = req.body;
    console.log('🔥 generate-pdf hit, ID:', application_id);

    if (!application_id) {
      return res.status(400).json({ error: 'Missing application_id' });
    }

    const app = await fetchApplication(application_id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    console.log('✅ Data fetched:', app.student_name, app.roll_number, app.duration_type);

    const isSummer     = app.duration_type === 'summer';
    const templateName = isSummer ? 'summer-internship.hbs' : 'six-month-internship.hbs';

    const html      = compileTemplate(templateName, app);
    const pdfBuffer = await generatePDF(html);
    const safeBuffer = Buffer.from(pdfBuffer);

    const prefix   = isSummer ? 'Summer' : 'FinalSemester';
    const filename = `${prefix}_Internship_${app.roll_number || 'Student'}.pdf`;

    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length',      safeBuffer.length);
    res.end(safeBuffer);

  } catch (err) {
    console.error('❌ PDF Error:', err.message);
    console.error('❌ Stack:',     err.stack);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// POST /api/preview-pdf
// Returns base64 string for in-browser preview
// ════════════════════════════════════════════════════════════════════════════
router.post('/preview-pdf', async (req, res) => {
  try {
    const { application_id } = req.body;

    if (!application_id) {
      return res.status(400).json({ error: 'Missing application_id' });
    }

    const app = await fetchApplication(application_id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const isSummer     = app.duration_type === 'summer';
    const templateName = isSummer ? 'summer-internship.hbs' : 'six-month-internship.hbs';

    const html      = compileTemplate(templateName, app);
    const pdfBuffer = await generatePDF(html);
    const base64    = Buffer.from(pdfBuffer).toString('base64');

    res.status(200).json({ pdf: base64 });

  } catch (err) {
    console.error('PDF preview error:', err.message);
    res.status(500).json({ error: 'Failed to generate preview.' });
  }
});

module.exports = router;