// Clean Summer Internship PDF Generator - Matching Official Format
export const generateInternshipPDF = async (app, allowDownload = true) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210;
  let y = 18;

  // ====================== HEADER ======================
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PSG COLLEGE OF TECHNOLOGY, COIMBATORE 641 004', W/2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(11);
  doc.text('Permission and Undertaking for Summer Internship / Short Duration Internship', W/2, y, { align: 'center' });
  y += 18;

  // ====================== DATE & FROM ======================
  doc.setFontSize(10);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 20, y);
  y += 12;

  doc.text('From', 20, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(app.student_name || '', 30, y);
  y += 5;
  if (app.roll_number) doc.text(app.roll_number, 30, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.text('To', 20, y);
  y += 6;
  doc.text('The Principal', 30, y);
  y += 5;
  doc.text('PSG College of Technology', 30, y);
  y += 5;
  doc.text('Coimbatore – 641004', 30, y);
  y += 8;

  doc.text(`Through: The Head of the Department, ${app.department || '________________'}`, 30, y);
  y += 15;

  // ====================== SUBJECT ======================
  doc.setFont('helvetica', 'bold');
  doc.text('Sub: Undertaking while pursuing Internship/Project Work in Industry / Institutions.', 20, y);
  y += 12;

  // ====================== INTRODUCTION ======================
  doc.setFont('helvetica', 'normal');
  const intro = "I wish to inform that I have been offered Summer internship/Short Duration internship in the organization, details of which are provided below. The activities carried out during this internship will be useful for my placement and final year project work.";
  const introLines = doc.splitTextToSize(intro, 170);
  doc.text(introLines, 20, y);
  y += introLines.length * 5.5 + 12;

  // ====================== TABLE ======================
  const tableY = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);

  doc.text('Name & Address of the Industry / Institution', 20, y);
  doc.text('with contact details & Mobile number', 20, y + 5);

  doc.text('Internship Period', 105, y);
  doc.text('From (Date)     To (Date)', 105, y + 5);

  doc.text('Name of Mentor/Guide', 145, y);
  doc.text('in the Industry & Department', 145, y + 5);

  doc.text('Duration for which', 175, y);
  doc.text('Attendance needed', 175, y + 5);

  y = tableY + 28;

  // Draw Table Borders
  doc.setLineWidth(0.4);
  doc.rect(20, tableY - 8, 170, 48);

  doc.line(100, tableY - 8, 100, tableY + 40);
  doc.line(142, tableY - 8, 142, tableY + 40);
  doc.line(172, tableY - 8, 172, tableY + 40);

  // Fill Data
  doc.setFont('helvetica', 'normal');

  const companyAddr = [
    app.company_display_name || app.company_name || app.company_name_manual || '',
    app.company_address || '',
    [app.company_city, app.company_state].filter(Boolean).join(', ')
  ].filter(Boolean).join('\n');

  doc.text(companyAddr, 22, y);

  const startDate = app.start_date ? new Date(app.start_date).toLocaleDateString('en-IN') : '';
  const endDate = app.end_date ? new Date(app.end_date).toLocaleDateString('en-IN') : '';
  doc.text(startDate, 105, y);
  doc.text(endDate, 125, y);

  const guideText = [
    app.guide_name_industry || '',
    app.guide_department || '',
    app.guide_contact || ''
  ].filter(Boolean).join('\n');
  doc.text(guideText, 144, y);

  doc.text(`${app.attendance_days || ''} days`, 175, y);

  y += 28;

  // CGPA
  doc.text(`My CGPA up to semester ${app.semester_completed || '__'} is ${app.cgpa || '__'}`, 20, y);
  y += 18;

  // ====================== UNDERTAKING ======================
  doc.setFont('helvetica', 'bold');
  doc.text('I hereby undertake the following.', 20, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  const points = [
    "1. I will be regular and sincere in carrying out my internship at the above organization and I will obey the Rules and Regulations of the organization.",
    "2. I will obtain the attendance certificate and submit the same at academic section within a week from the last date of my internship and also submit the copy of the report of the internship to the HoD.",
    "3. I will study on my own, the syllabi covered in the class during my internship.",
    "4. After return from internship, I will also complete the assessment components (except CA Test 1 if total CA tests are three) and laboratory experiments missed during the internship period after regular class hours.",
    "5. I have enclosed the offer letter for internship.",
    "6. I have enclosed parent’s consent Letter."
  ];

  points.forEach(point => {
    const lines = doc.splitTextToSize(point, 170);
    doc.text(lines, 20, y);
    y += lines.length * 5 + 3;
  });

  // ====================== SIGNATURE ======================
  y = 245;
  doc.text('(Signature of the Student)', 20, y);

  // Signature Boxes
  const sigY = 252;
  const labels = ['Tutor', 'Guide (Dept)', 'Programme Co-ordinator', 'HoD', 'Dean (P&T)', 'Dean-Academic'];
  const xPos = [20, 55, 88, 125, 155, 185];

  doc.setFontSize(8);
  labels.forEach((label, i) => {
    doc.rect(xPos[i], sigY, 30, 18);
    doc.text(label, xPos[i] + 2, sigY + 22);
  });

  doc.setFontSize(10);
  doc.text('PRINCIPAL', 90, 285, { align: 'center' });

  // Final Note
  doc.setFontSize(9);
  doc.text('NOTE: Original Form shall be submitted to Placement Office and Photo copies to Academic Section and Head of the Department.', W/2, 295, { align: 'center' });

  if (allowDownload) {
    const fileName = `PSG_Summer_Internship_${app.roll_number || 'Student'}_${app.application_id}.pdf`;
    doc.save(fileName);
  }

  return doc;
};