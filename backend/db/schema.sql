 =============================================
-- SAFE MIGRATION FOR CUSTOM APPLICATION ID
-- =============================================
ALTER TABLE internship_applications 
ADD PRIMARY KEY (application_id);
ALTER TABLE internship_applications DROP COLUMN IF EXISTS application_id;



ALTER TABLE internship_applications ADD COLUMN application_id VARCHAR(50);

-- 1. Drop old constraints
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_application_id_fkey;
ALTER TABLE email_notifications DROP CONSTRAINT IF EXISTS email_notifications_application_id_fkey;

-- 2. Drop old application_id if exists
ALTER TABLE internship_applications DROP COLUMN IF EXISTS application_id;

-- 3. Add new column
ALTER TABLE internship_applications ADD COLUMN application_id VARCHAR(50);

-- 4. Update existing rows with custom ID (Simple & Safe)
[5:15 pm, 15/05/2026] Subhaharini: Character: 264
[5:16 pm, 15/05/2026] Supreetha Psg: UPDATE internship_applications
SET application_id = 
    CONCAT(
        COALESCE((SELECT roll_number FROM users WHERE user_id = internship_applications.student_id), 'UNKNOWN'),
        '/',
        EXTRACT(YEAR FROM created_at)::TEXT,
        '/',
        LPAD(application_id::TEXT, 3, '0')     -- using the serial id
    )
WHERE application_id IS NULL;

UPDATE internship_applications a
SET application_id = 
    CONCAT(
        COALESCE((SELECT roll_number FROM users WHERE user_id = a.student_id), 'UNKNOWN'),
        '/',
        EXTRACT(YEAR FROM a.created_at)::TEXT,
        '/',
        LPAD(
            ((SELECT COUNT(*) + 1 
              FROM internship_applications b 
              WHERE b.student_id = a.student_id 
                AND b.created_at <= a.created_at))::TEXT, 
            3, '0'
        )
    )
WHERE application_id IS NULL;

ALTER TABLE internship_applications 
ADD PRIMARY KEY (application_id);


ALTER TABLE internship_applications 
ADD COLUMN IF NOT EXISTS tutor_email VARCHAR(255);

ALTER TABLE internship_applications 
ADD COLUMN IF NOT EXISTS tutor_name VARCHAR(255);

-- Drop existing table (if you can) or add new column
ALTER TABLE internship_applications 
DROP COLUMN IF EXISTS application_id;

ALTER TABLE internship_applications 
ADD COLUMN application_id VARCHAR(50) PRIMARY KEY;

-- Also add index
CREATE INDEX idx_apps_custom_id ON internship_applications(application_id);

-- ============================================================
-- PSG TECH INTERNSHIP PORTAL - FULL SCHEMA v2.0
-- ============================================================

-- Drop existing types if re-running
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS work_mode_type CASCADE;
DROP TYPE IF EXISTS duration_type CASCADE;
DROP TYPE IF EXISTS intern_type CASCADE;
DROP TYPE IF EXISTS decision_type CASCADE;

-- ENUMS
CREATE TYPE user_role AS ENUM ('student', 'tutor', 'admin');
CREATE TYPE application_status AS ENUM (
    'draft',
    'pending_tutor',
    'approved',
    'rejected',
    'cancelled'
);
CREATE TYPE work_mode_type AS ENUM ('on_site', 'remote', 'hybrid');
CREATE TYPE duration_type AS ENUM ('summer', 'six_month');
CREATE TYPE intern_type AS ENUM ('research', 'industry');

-- ============================================================
-- PROGRAMMES
-- ============================================================
CREATE TABLE IF NOT EXISTS programmes (
    prog_id    VARCHAR(4)   PRIMARY KEY,
    programme  VARCHAR(150) NOT NULL,
    department VARCHAR(150) NOT NULL
);

INSERT INTO programmes (prog_id, programme, department) VALUES
('FD',  'MSc Fashion Design & Merchandising', 'Apparel & Fashion Design'),
('S',   'BSc Applied Science', 'Applied Science'),
('X',   'BSc Computer Systems & Design', 'Applied Mathematics & Computational Sciences'),
('XC',  'MSc Cyber Security', 'Applied Mathematics & Computational Sciences'),
('XD',  'MSc Data Science', 'Applied Mathematics & Computational Sciences'),
('XW',  'MSc Software Systems', 'Applied Mathematics & Computational Sciences'),
('A',   'BE Automobile Engineering', 'Automobile Engineering'),
('D',   'BE Biomedical Engineering', 'Biomedical Engineering'),
('B',   'BTech Biotechnology', 'Biotechnology'),
('C',   'BE Civil Engineering', 'Civil Engineering'),
('Z',   'BE Computer Science & Engineering', 'Computer Science & Engineering'),
('N',   'BE CSE (AI & ML)', 'Computer Science & Engineering'),
('ZC',  'ME Computer Science & Engineering', 'Computer Science & Engineering'),
('MX',  'Master of Computer Applications', 'Computer Applications'),
('L',   'BE Electronics & Communication Engineering', 'Electronics & Communication Engineering'),
('V',   'BTech Electronics Engineering (VLSI)', 'Electronics & Communication Engineering'),
('E',   'BE Electrical & Electronics Engineering', 'Electrical & Electronics Engineering'),
('H',   'BTech Fashion Technology', 'Fashion Technology'),
('I',   'BTech Information Technology', 'Information Technology'),
('M',   'BE Mechanical Engineering', 'Mechanical Engineering'),
('P',   'BE Production Engineering', 'Production Engineering'),
('R',   'BE Robotics & Automation', 'Robotics and Automation Engineering'),
('T',   'BTech Textile Technology', 'Textile Technology'),
('PW',  'Master of Computer Applications', 'Computer Applications'),
('GM',  'Master of Business Administration', 'Management Studies')
ON CONFLICT (prog_id) DO NOTHING;

-- ============================================================
-- USERS (single table for all roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id         SERIAL          PRIMARY KEY,
    email           VARCHAR(100)    NOT NULL UNIQUE,
    password_hash   TEXT            NOT NULL,
    full_name       VARCHAR(150)    NOT NULL,
    role            user_role       NOT NULL,
    phone           VARCHAR(15),
    -- student fields
    roll_number     VARCHAR(20)     UNIQUE,
    prog_id         VARCHAR(4)      REFERENCES programmes(prog_id),
    year_of_joining SMALLINT,
    cgpa            NUMERIC(4,2),
    -- timestamps
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- Seed admin (password: 'password')
INSERT INTO users (email, password_hash, full_name, role)
VALUES ('admin@psgtech.ac.in', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    company_id  SERIAL          PRIMARY KEY,
    name        VARCHAR(200)    NOT NULL,
    address     TEXT,
    city        VARCHAR(100),
    state       VARCHAR(100),
    country     VARCHAR(100)    DEFAULT 'India',
    website     VARCHAR(255),
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    added_by    INTEGER         REFERENCES users(user_id),
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(LOWER(name));

INSERT INTO companies (name, city, state) VALUES
('Tata Consultancy Services', 'Chennai', 'Tamil Nadu'),
('Infosys Limited', 'Bengaluru', 'Karnataka'),
('Wipro Limited', 'Bengaluru', 'Karnataka'),
('HCL Technologies', 'Noida', 'Uttar Pradesh'),
('Tech Mahindra Limited', 'Pune', 'Maharashtra'),
('Zoho Corporation', 'Chennai', 'Tamil Nadu'),
('Freshworks Inc', 'Chennai', 'Tamil Nadu'),
('Cognizant Technology Solutions', 'Chennai', 'Tamil Nadu'),
('Accenture India', 'Mumbai', 'Maharashtra'),
('IBM India Pvt Ltd', 'Bengaluru', 'Karnataka'),
('Oracle India Pvt Ltd', 'Bengaluru', 'Karnataka'),
('SAP Labs India', 'Bengaluru', 'Karnataka'),
('Intel Technology India', 'Bengaluru', 'Karnataka'),
('Texas Instruments India', 'Bengaluru', 'Karnataka'),
('Qualcomm India', 'Bengaluru', 'Karnataka'),
('Samsung Semiconductor India Research', 'Bengaluru', 'Karnataka'),
('Bosch Limited', 'Bengaluru', 'Karnataka'),
('ABB India Limited', 'Bengaluru', 'Karnataka'),
('Siemens Limited', 'Mumbai', 'Maharashtra'),
('Honeywell Technology Solutions', 'Bengaluru', 'Karnataka'),
('L&T Technology Services', 'Mumbai', 'Maharashtra'),
('Mahindra & Mahindra', 'Mumbai', 'Maharashtra'),
('TVS Motor Company Limited', 'Hosur', 'Tamil Nadu'),
('Royal Enfield', 'Chennai', 'Tamil Nadu'),
('Sundram Fasteners Limited', 'Chennai', 'Tamil Nadu'),
('Amazon India', 'Hyderabad', 'Telangana'),
('Microsoft India', 'Hyderabad', 'Telangana'),
('Google India', 'Bengaluru', 'Karnataka'),
('ELGI Equipments Ltd', 'Coimbatore', 'Tamil Nadu'),
('CRI Pumps Private Limited', 'Coimbatore', 'Tamil Nadu'),
('Tractors and Farm Equipment', 'Chennai', 'Tamil Nadu'),
('Pricol Limited', 'Coimbatore', 'Tamil Nadu'),
('Lucas TVS', 'Coimbatore', 'Tamil Nadu'),
('Tata Elxsi Limited', 'Bengaluru', 'Karnataka')
ON CONFLICT DO NOTHING;

-- ============================================================
-- INTERNSHIP APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS internship_applications (
    application_id          SERIAL              PRIMARY KEY,
    student_id              INTEGER             NOT NULL REFERENCES users(user_id),
    tutor_id                INTEGER             REFERENCES users(user_id),
    company_id              INTEGER             REFERENCES companies(company_id),
    company_name_manual     VARCHAR(200),       -- if not in list

    -- Role & Location
    role_title              VARCHAR(200),
    intern_type             intern_type         DEFAULT 'industry',
    company_address         TEXT,
    company_city            VARCHAR(100),
    company_state           VARCHAR(100),
    company_country         VARCHAR(100)        DEFAULT 'India',
    company_phone           VARCHAR(20),

    -- Internship details
    duration_type           duration_type       NOT NULL DEFAULT 'summer',
    work_mode               work_mode_type      NOT NULL DEFAULT 'on_site',
    how_obtained            VARCHAR(200),       -- placement, self, campus etc.
    start_date              DATE,
    end_date                DATE,
    attendance_days         INTEGER,            -- calculated

    -- Guide info (industry)
    guide_name_industry     VARCHAR(200),
    guide_department        VARCHAR(200),
    guide_contact           VARCHAR(200),

    -- Student academic details
    cgpa                    NUMERIC(4,2),
    semester_completed      SMALLINT,
    ra_courses              TEXT,               -- RA course details if any
    pending_courses         TEXT,
    has_declined_other      BOOLEAN             DEFAULT FALSE,
    declined_company_details TEXT,

    -- Stipend
    stipend_amount          NUMERIC(10,2),

    -- Communication
    student_note            TEXT,
    tutor_remarks           TEXT,
    admin_remarks           TEXT,

    -- Status
    status                  application_status  NOT NULL DEFAULT 'draft',

    -- Timestamps (full audit trail)
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    submitted_at            TIMESTAMPTZ,
    tutor_reviewed_at       TIMESTAMPTZ,
    approved_at             TIMESTAMPTZ,
    rejected_at             TIMESTAMPTZ,

    -- PDF
    pdf_generated_at        TIMESTAMPTZ,
    pdf_download_count      INTEGER             DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_apps_student ON internship_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_apps_tutor   ON internship_applications(tutor_id);
CREATE INDEX IF NOT EXISTS idx_apps_status  ON internship_applications(status);

-- ============================================================
-- AUDIT LOG (every action is logged)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    log_id          SERIAL          PRIMARY KEY,
    application_id  INTEGER         REFERENCES internship_applications(application_id),
    user_id         INTEGER         REFERENCES users(user_id),
    action          VARCHAR(100)    NOT NULL,
    details         JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_app ON audit_log(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);

-- ============================================================
-- EMAIL NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS email_notifications (
    notif_id        SERIAL          PRIMARY KEY,
    application_id  INTEGER         REFERENCES internship_applications(application_id),
    recipient_email VARCHAR(100)    NOT NULL,
    subject         VARCHAR(300),
    status          VARCHAR(20)     DEFAULT 'sent',
    sent_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);