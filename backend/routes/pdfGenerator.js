// routes/pdfGenerator.js
const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// ─── Register Handlebars Helpers ─────────────────────────────────────────────

handlebars.registerHelper('formatDate', (dateStr) => {
  if (!dateStr) return '__________';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
});

handlebars.registerHelper('eq', (a, b) => a === b);
handlebars.registerHelper('or', (a, b) => a || b || '');

// ─── Helper: compile HBS template ────────────────────────────────────────────
const compileTemplate = (templateName, data) => {
  const templatePath = path.join(__dirname, '../templates', templateName);
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateSource);

  const enrichedData = {
    ...data,
    currentDate: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
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
    stipend_amount: data.stipend_amount || 'Nil',
    guide_name_industry: data.guide_name_industry || 'N/A',
    guide_contact: data.guide_contact || 'N/A',
    cgpa: data.cgpa || data.student_cgpa || '__',
    semester_completed: data.semester_completed || '__',
    company_address: data.company_address || data.co_address || '',
    company_city: data.company_city || data.co_city || '',
    company_state: data.company_state || data.co_state || '',
  };

  return template(enrichedData);
};

// ─── Helper: generate PDF from HTML string ────────────────────────────────────
const generatePDF = async (htmlContent) => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    // ↑ use your actual Chrome path — check below if unsure
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      // In generatePDF(), change margins from 15mm to:
      margin: {
        top:    '12mm',
        right:  '16mm',
        bottom: '10mm',
        left:   '16mm',
      },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
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

    // Fetch full application data from DB
    const { rows } = await pool.query(`
      SELECT a.*,
             COALESCE(c.name, a.company_name_manual) AS company_name,
             c.address AS co_address,
             c.city AS co_city,
             c.state AS co_state,
             c.country AS co_country,
             s.full_name AS student_name,
             s.roll_number,
             s.email AS student_email,
             s.cgpa AS student_cgpa,
             p.programme,
             p.department,
             u.full_name AS tutor_name
      FROM internship_applications a
      LEFT JOIN companies c ON a.company_id = c.company_id
      JOIN users s ON a.student_id = s.user_id
      LEFT JOIN programmes p ON s.prog_id = p.prog_id
      LEFT JOIN users u ON a.tutor_id = u.user_id
      WHERE a.application_id = $1
    `, [application_id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = rows[0];
    console.log('✅ Data fetched:', app.student_name, app.roll_number, app.duration_type);

    const isSummer = app.duration_type === 'summer';
    const templateName = isSummer
      ? 'summer-internship.hbs'
      : 'six-month-internship.hbs';

    const html = compileTemplate(templateName, app);
    console.log('✅ HTML length:', html.length);

    const pdfBuffer = await generatePDF(html);
    const safeBuffer = Buffer.from(pdfBuffer);
    console.log('✅ PDF size:', safeBuffer.length, 'bytes');

    const prefix = isSummer ? 'Summer' : 'FinalSemester';
    const filename = `${prefix}_Internship_${app.roll_number || 'Student'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', safeBuffer.length);
    res.end(safeBuffer);

  } catch (err) {
    console.error('❌ PDF Error:', err.message);
    console.error('❌ Stack:', err.stack);
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

    const { rows } = await pool.query(`
      SELECT a.*,
             COALESCE(c.name, a.company_name_manual) AS company_name,
             c.address AS co_address,
             c.city AS co_city,
             c.state AS co_state,
             c.country AS co_country,
             s.full_name AS student_name,
             s.roll_number,
             s.email AS student_email,
             s.cgpa AS student_cgpa,
             p.programme,
             p.department,
             u.full_name AS tutor_name
      FROM internship_applications a
      LEFT JOIN companies c ON a.company_id = c.company_id
      JOIN users s ON a.student_id = s.user_id
      LEFT JOIN programmes p ON s.prog_id = p.prog_id
      LEFT JOIN users u ON a.tutor_id = u.user_id
      WHERE a.application_id = $1
    `, [application_id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = rows[0];
    const isSummer = app.duration_type === 'summer';
    const templateName = isSummer ? 'summer-internship.hbs' : 'six-month-internship.hbs';

    const html = compileTemplate(templateName, app);
    const pdfBuffer = await generatePDF(html);
    const base64 = Buffer.from(pdfBuffer).toString('base64');

    res.status(200).json({ pdf: base64 });

  } catch (err) {
    console.error('PDF preview error:', err.message);
    res.status(500).json({ error: 'Failed to generate preview.' });
  }
});

module.exports = router;