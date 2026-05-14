# PSG Tech Internship Portal v2.0

A full-stack internship management portal for PSG College of Technology, Coimbatore.

## Features

### Authentication
- **OTP-based signup** via PSG Tech email
- **Auto role detection from email:**
  - `rollno@psgtech.ac.in` → Student (e.g. `24pw35@psgtech.ac.in`)
  - `abc.xyz@psgtech.ac.in` (dot at position 3) → Tutor
  - `admin@psgtech.ac.in` → Admin
- JWT-based login sessions (8h expiry)
- Full name + roll number stored in DB on signup

### Student Portal
- Dashboard with stats and internship type cards
- **Two internship types:**
  - ☀️ Summer / Short Duration Internship
  - 🎓 Final Semester 6-Month Project
- Full form with: company (searchable list or manual), role, intern type (research/industry), address, work mode, dates (auto attendance calculation), stipend, industry guide, CGPA, RA courses, declined offer details, tutor selection
- **PDF locked until tutor approves** – student gets email notification, then can download
- All actions (draft saved, submitted, downloaded) timestamped in DB

### Tutor Portal
- View pending + reviewed applications
- Full student + company details
- Add remarks, approve or reject
- **Email sent to student on decision** (with styled HTML template)
- Can preview/download PDF at any time

### Admin Portal
- Dashboard with stats (students, tutors, applications, approval rate)
- View/search/filter all applications; download any PDF
- Manage users (view students/tutors, create new accounts)
- Manage companies (view list, add new companies)

### PDF Generation
- Proper PSG format matching official permission letters
- Summer internship: Permission & Undertaking form
- Final semester: Undertaking form with recommendation section
- Includes all student/company/guide details, CGPA, signature boxes, dates

### Database (Audit Trail)
- Every action logged: signup, login, draft_saved, submitted, tutor_approved/rejected, pdf_downloaded
- Timestamps for: created, submitted, tutor reviewed, approved/rejected, PDF downloaded
- Email notification log with status

---

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, React Router, React Select, jsPDF, Lucide React  
**Backend:** Node.js, Express, PostgreSQL, JWT, bcrypt, Nodemailer  
**Fonts:** DM Sans + Playfair Display  
**Theme:** Forest green palette (bone/sage/fern/hunter/forest)

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Gmail account with App Password (for OTP/notification emails)

---

### 1. Database Setup

```bash
psql -U postgres
CREATE DATABASE internship_portal;
\c internship_portal
\i backend/db/schema.sql
```

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

**`.env` configuration:**
```
PORT=5001
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432
DB_NAME=internship_portal
JWT_SECRET=your_very_long_random_secret_key
FRONTEND_URL=http://localhost:5173
EMAIL_USER=yourmail@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=PSG Tech Internship Portal <yourmail@gmail.com>
```

> **Gmail App Password:** Go to Google Account → Security → 2-Step Verification → App Passwords. Generate one for "Mail".

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

### 4. Access the Portal

| URL | Description |
|-----|-------------|
| `http://localhost:5173` | Login page |
| `http://localhost:5173/signup` | Signup with OTP |
| `/student/*` | Student portal |
| `/tutor/*` | Tutor portal |
| `/admin/*` | Admin portal |

**Default Admin credentials:**
- Email: `admin@psgtech.ac.in`
- Password: `password`

---

## Email Logic

| Email Pattern | Role |
|--------------|------|
| `abc.xyz@psgtech.ac.in` | Tutor (dot at index 3) |
| `24pw35@psgtech.ac.in` | Student |
| `admin@psgtech.ac.in` | Admin |

**Full name display:** After login, student name shown as `rollno – Full Name`  
e.g., `24pw35 – Subhaharini P`

---

## DB Tables

| Table | Purpose |
|-------|---------|
| `users` | All users (student/tutor/admin) |
| `programmes` | PSG programme codes |
| `companies` | Company list |
| `internship_applications` | Applications with full audit timestamps |
| `audit_log` | Every user action logged |
| `email_notifications` | Email send log |

---

## Folder Structure

```
internship-portal/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js     # OTP, signup, login
│   │   └── appController.js      # All business logic
│   ├── db/schema.sql
│   ├── middleware/auth.js
│   ├── routes/index.js
│   ├── utils/mailer.js           # Email templates
│   ├── server.js
│   └── .env.example
└── frontend/
    └── src/
        ├── components/
        │   ├── LoginPage.jsx
        │   ├── SignupPage.jsx
        │   ├── student/
        │   │   ├── StudentLayout.jsx
        │   │   ├── StudentHome.jsx
        │   │   ├── InternshipForm.jsx
        │   │   ├── MyApplications.jsx
        │   │   └── pdfGenerator.js
        │   ├── tutor/
        │   │   ├── TutorLayout.jsx
        │   │   └── TutorQueue.jsx
        │   └── admin/
        │       ├── AdminLayout.jsx
        │       ├── AdminDashboard.jsx
        │       ├── AdminApplications.jsx
        │       ├── AdminUsers.jsx
        │       └── AdminCompanies.jsx
        ├── App.jsx
        ├── api.js
        └── index.css
```
