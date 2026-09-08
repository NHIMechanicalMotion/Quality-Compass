import { jsPDF } from 'jspdf';
import type { PpapSubmission, ControlPlanRow, DimensionalResultRow } from '../types/apqpPpap';

/**
 * Utility to draw a neat bordered cell in jsPDF
 */
function drawCell(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  options?: {
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    fillColor?: [number, number, number];
    textColor?: [number, number, number];
    fontSize?: number;
  }
) {
  if (options?.fillColor) {
    doc.setFillColor(options.fillColor[0], options.fillColor[1], options.fillColor[2]);
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h, 'D');
  }

  doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
  doc.setFontSize(options?.fontSize || 8);
  if (options?.textColor) {
    doc.setTextColor(options.textColor[0], options.textColor[1], options.textColor[2]);
  } else {
    doc.setTextColor(15, 23, 42); // slate-900
  }

  const textX = options?.align === 'center' ? x + w / 2 : options?.align === 'right' ? x + w - 2 : x + 2;
  const textY = y + h / 2 + 2.5;
  doc.text(text, textX, textY, { align: options?.align || 'left' });
}

/* =========================================================================
   1. AIAG PART SUBMISSION WARRANT (PSW - Form CFG-1001)
   ========================================================================= */

export function generatePswPdf(submission: PpapSubmission): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4'); // 210 x 297 mm
  const margin = 10;
  const pageWidth = 210 - margin * 2; // 190 mm

  // Header Banner
  doc.setDrawColor(0, 51, 102); // Deep Navy AIAG
  doc.setLineWidth(0.8);
  doc.rect(margin, margin, pageWidth, 277);

  // Top Title Block
  doc.setFillColor(0, 51, 102);
  doc.rect(margin, margin, pageWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('AIAG PART SUBMISSION WARRANT (PSW)', 105, margin + 8, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('AUTOMOTIVE INDUSTRY ACTION GROUP — PPAP 4TH EDITION (FORM CFG-1001)', 105, margin + 17, { align: 'center' });

  let y = margin + 20;

  // SECTION 1: PART INFORMATION
  doc.setDrawColor(180, 190, 205);
  doc.setLineWidth(0.3);
  drawCell(doc, margin, y, pageWidth, 6, 'PART INFORMATION', { bold: true, fillColor: [241, 245, 249], fontSize: 8 });
  y += 6;

  const colW1 = 50;
  const colW2 = 45;
  const colW3 = 50;
  const colW4 = 45;

  drawCell(doc, margin, y, colW1, 7, 'Part Name:');
  drawCell(doc, margin + colW1, y, colW2, 7, submission.part_name || 'Planetary Carrier Assembly', { bold: true });
  drawCell(doc, margin + colW1 + colW2, y, colW3, 7, 'Customer Part Number:');
  drawCell(doc, margin + colW1 + colW2 + colW3, y, colW4, 7, submission.part_number || 'FC-7782-B', { bold: true });
  y += 7;

  drawCell(doc, margin, y, colW1, 7, 'Engineering Drawing Number:');
  drawCell(doc, margin + colW1, y, colW2, 7, submission.drawing_number || 'DWG-FC-7782-B', { bold: true });
  drawCell(doc, margin + colW1 + colW2, y, colW3, 7, 'Drawing Revision Level:');
  drawCell(doc, margin + colW1 + colW2 + colW3, y, colW4, 7, submission.drawing_revision || 'Rev 04', { bold: true });
  y += 7;

  drawCell(doc, margin, y, colW1, 7, 'Engineering Change Level:');
  drawCell(doc, margin + colW1, y, colW2, 7, submission.engineering_change_level || 'ECL-2026-088', { bold: true });
  drawCell(doc, margin + colW1 + colW2, y, colW3, 7, 'Part Weight (kg):');
  drawCell(doc, margin + colW1 + colW2 + colW3, y, colW4, 7, `${submission.weight_kg || 4.852} kg`, { bold: true });
  y += 7;

  // SECTION 2: MANUFACTURING & CUSTOMER INFORMATION
  drawCell(doc, margin, y, pageWidth, 6, 'ORGANIZATION MANUFACTURING & CUSTOMER SUBMITTAL INFORMATION', { bold: true, fillColor: [241, 245, 249], fontSize: 8 });
  y += 6;

  drawCell(doc, margin, y, 95, 6, 'ORGANIZATION (SUPPLIER) NAME & FACILITY:', { bold: true, fontSize: 7.5 });
  drawCell(doc, margin + 95, y, 95, 6, 'CUSTOMER NAME & SUBMITTAL LOCATION:', { bold: true, fontSize: 7.5 });
  y += 6;

  drawCell(doc, margin, y, 95, 5, submission.supplier_name || 'Apex Precision Manufacturing Corp.');
  drawCell(doc, margin + 95, y, 95, 5, submission.customer_name || 'Ford Motor Company');
  y += 5;

  drawCell(doc, margin, y, 95, 5, `Supplier DUNS Code: ${submission.supplier_code || '83-921-4401'}`);
  drawCell(doc, margin + 95, y, 95, 5, `Division: ${submission.customer_division || 'Electrified Powertrain'}`);
  y += 5;

  drawCell(doc, margin, y, 95, 5, submission.facility_address || '100 Innovation Pkwy, Detroit, MI 48226');
  drawCell(doc, margin + 95, y, 95, 5, `Application: ${submission.application || 'F-150 Lightning BEV Drive'}`);
  y += 5;

  // SECTION 3: MATERIALS REPORTING
  drawCell(doc, margin, y, pageWidth, 6, 'MATERIALS REPORTING (IMDS / REACH / ROHS)', { bold: true, fillColor: [241, 245, 249], fontSize: 8 });
  y += 6;

  const imdsText = `Substances of Concern Reporting (IMDS): ${submission.imds_number || 'IMDS-88392019'} [YES: X  NO:  ] | Polymeric Parts Marked: [YES: X  NO:  ]`;
  drawCell(doc, margin, y, pageWidth, 6, imdsText, { fontSize: 7.5 });
  y += 6;

  // SECTION 4: REASON FOR SUBMISSION
  drawCell(doc, margin, y, pageWidth, 6, 'REASON FOR SUBMISSION', { bold: true, fillColor: [241, 245, 249], fontSize: 8 });
  y += 6;

  const reasons = [
    { key: 'INITIAL_SUBMISSION', label: 'Initial Submission' },
    { key: 'ENGINEERING_CHANGE', label: 'Engineering Change(s)' },
    { key: 'TOOLING_TRANSFER', label: 'Tooling Transfer / Replacement' },
    { key: 'PROCESS_CHANGE', label: 'Change in Process / Method' },
    { key: 'CORRECTION_DISCREPANCY', label: 'Correction of Discrepancy' },
    { key: 'OTHER', label: 'Other' },
  ];

  const rw = pageWidth / 3;
  for (let i = 0; i < reasons.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      const idx = i + j;
      if (idx < reasons.length) {
        const isChecked = submission.submission_reason === reasons[idx].key;
        drawCell(doc, margin + j * rw, y, rw, 6, `[${isChecked ? 'X' : ' '}] ${reasons[idx].label}`, { fontSize: 7.5 });
      }
    }
    y += 6;
  }

  // SECTION 5: SUBMISSION LEVEL
  drawCell(doc, margin, y, pageWidth, 6, 'REQUESTED SUBMISSION LEVEL (Check One)', { bold: true, fillColor: [241, 245, 249], fontSize: 8 });
  y += 6;

  const levels = [
    { lvl: 1, desc: 'Level 1 - Warrant and Appearance Approval Report only' },
    { lvl: 2, desc: 'Level 2 - Warrant with product samples and limited supporting data' },
    { lvl: 3, desc: 'Level 3 - Warrant, product samples and complete supporting data (Standard)' },
    { lvl: 4, desc: 'Level 4 - Warrant and other requirements as defined by customer' },
    { lvl: 5, desc: 'Level 5 - Warrant, product samples and complete data reviewed at supplier facility' },
  ];

  levels.forEach((l) => {
    const isLvl = submission.submission_level === l.lvl;
    drawCell(doc, margin, y, pageWidth, 5, `[${isLvl ? 'X' : ' '}]  ${l.desc}`, {
      bold: isLvl,
      fillColor: isLvl ? [236, 253, 245] : undefined,
      fontSize: 7.2,
    });
    y += 5;
  });

  // SECTION 6: DECLARATION STATEMENT
  drawCell(doc, margin, y, pageWidth, 6, 'DECLARATION & SUPPLIER AFFIRMATION', { bold: true, fillColor: [241, 245, 249], fontSize: 8 });
  y += 6;

  doc.rect(margin, y, pageWidth, 28, 'D');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);

  const declarationLines = [
    'I hereby affirm that the samples represented by this warrant are representative of our parts which were made by a process that meets',
    'all Production Part Approval Process Manual 4th Edition requirements. I further affirm that these samples were produced at the production',
    'rate of 45 parts/hr on 300 parts continuous run. I also certify that documented evidence of such compliance is on file and available for review.',
    'I have noted any deviations from this declaration below:',
    `Deviations / Remarks: None. Full AIAG-VDA FMEA, MSA, and Cpk > 1.67 achieved on critical characteristics.`,
  ];
  declarationLines.forEach((line, idx) => {
    doc.text(line, margin + 3, y + 5 + idx * 4.2);
  });
  y += 28;

  // SIGNATURE BLOCK
  const sigW = pageWidth / 2;
  drawCell(doc, margin, y, sigW, 6, 'ORGANIZATION AUTHORIZED SIGNATURE:', { bold: true, fontSize: 7.5 });
  drawCell(doc, margin + sigW, y, sigW, 6, 'CUSTOMER DISPOSITION & APPROVAL:', { bold: true, fontSize: 7.5 });
  y += 6;

  drawCell(doc, margin, y, sigW, 5.5, `Authorized Rep: ${submission.psw_data?.authorized_rep || 'John Batten'}`);
  drawCell(doc, margin + sigW, y, sigW, 5.5, `Disposition: ${submission.status || 'APPROVED'}`, {
    bold: true,
    textColor: submission.status === 'APPROVED' ? [16, 185, 129] : [59, 130, 246],
  });
  y += 5.5;

  drawCell(doc, margin, y, sigW, 5.5, `Title: ${submission.psw_data?.rep_title || 'Director of Quality Assurance'}`);
  drawCell(doc, margin + sigW, y, sigW, 5.5, `Customer STA / Rep: ${submission.psw_data?.customer_reviewer || 'Sarah Jenkins (Ford STA)'}`);
  y += 5.5;

  drawCell(doc, margin, y, sigW, 5.5, `Email / Phone: ${submission.psw_data?.supplier_email || 'quality@qualitycompass.io'}`);
  drawCell(doc, margin + sigW, y, sigW, 5.5, `Customer Comments: ${submission.psw_data?.customer_comments || 'Run at Rate and dimensional results accepted.'}`);
  y += 5.5;

  drawCell(doc, margin, y, sigW, 5.5, `Date Signed: ${submission.psw_data?.submission_date || new Date().toISOString().split('T')[0]}`);
  drawCell(doc, margin + sigW, y, sigW, 5.5, `Customer Sign Date: ${submission.psw_data?.customer_signature_date || new Date().toISOString().split('T')[0]}`);
  y += 5.5;

  // Tracking Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Warrant Tracking ID: ${submission.submission_number} | Quality Compass APQP & PPAP Enterprise Engine`, 105, 283, { align: 'center' });

  return doc;
}

/* =========================================================================
   2. AIAG DIMENSIONAL RESULTS REPORT (Form CFG-1003)
   ========================================================================= */

export function generateDimensionalResultsPdf(submission: PpapSubmission): jsPDF {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape 297 x 210 mm
  const margin = 10;
  const pageWidth = 297 - margin * 2; // 277 mm

  // Header Banner
  doc.setFillColor(0, 51, 102);
  doc.rect(margin, margin, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('AIAG PPAP DIMENSIONAL TEST RESULTS (FORM CFG-1003)', 148.5, margin + 7, { align: 'center' });

  let y = margin + 14;

  // Metadata block
  doc.setDrawColor(180, 190, 205);
  doc.setLineWidth(0.2);

  const col = pageWidth / 4;
  drawCell(doc, margin, y, col, 6, `Organization: ${submission.supplier_name}`);
  drawCell(doc, margin + col, y, col, 6, `Part Name: ${submission.part_name}`);
  drawCell(doc, margin + col * 2, y, col, 6, `Part Number: ${submission.part_number}`);
  drawCell(doc, margin + col * 3, y, col, 6, `Drawing Rev: ${submission.drawing_revision}`);
  y += 6;

  // Table Headers
  const wBalloon = 16;
  const wDesc = 65;
  const wSpec = 40;
  const wTool = 40;
  const wSample = 16;
  const wStatus = 20;

  const headerOpts = { bold: true, fillColor: [241, 245, 249] as [number, number, number], fontSize: 7 };

  drawCell(doc, margin, y, wBalloon, 7, 'Balloon #', headerOpts);
  drawCell(doc, margin + wBalloon, y, wDesc, 7, 'Dimension / Characteristic Description', headerOpts);
  drawCell(doc, margin + wBalloon + wDesc, y, wSpec, 7, 'Specification Limits', headerOpts);
  drawCell(doc, margin + wBalloon + wDesc + wSpec, y, wTool, 7, 'Inspection Tool / Gage', headerOpts);
  drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool, y, wSample, 7, 'S-1', headerOpts);
  drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool + wSample, y, wSample, 7, 'S-2', headerOpts);
  drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool + wSample * 2, y, wSample, 7, 'S-3', headerOpts);
  drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool + wSample * 3, y, wSample, 7, 'S-4', headerOpts);
  drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool + wSample * 4, y, wSample, 7, 'S-5', headerOpts);
  drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool + wSample * 5, y, wStatus, 7, 'Status', headerOpts);
  y += 7;

  // Rows
  const items: DimensionalResultRow[] = submission.dimensional_results || [];
  items.forEach((row) => {
    const isPass = row.status === 'PASS';
    drawCell(doc, margin, y, wBalloon, 6, row.balloon_no, { align: 'center', bold: true, fontSize: 7 });
    drawCell(doc, margin + wBalloon, y, wDesc, 6, row.feature_desc, { fontSize: 7 });
    drawCell(doc, margin + wBalloon + wDesc, y, wSpec, 6, `${row.nominal.toFixed(3)} (+${row.upper_tol} / ${row.lower_tol})`, { fontSize: 7 });
    drawCell(doc, margin + wBalloon + wDesc + wSpec, y, wTool, 6, row.gage_tool, { fontSize: 7 });
    drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool, y, wSample, 6, row.sample_1?.toFixed(3) || '-', { align: 'center', fontSize: 7 });
    drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool + wSample, y, wSample, 6, row.sample_2?.toFixed(3) || '-', { align: 'center', fontSize: 7 });
    drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool + wSample * 2, y, wSample, 6, row.sample_3?.toFixed(3) || '-', { align: 'center', fontSize: 7 });
    drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool + wSample * 3, y, wSample, 6, row.sample_4?.toFixed(3) || '-', { align: 'center', fontSize: 7 });
    drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool + wSample * 4, y, wSample, 6, row.sample_5?.toFixed(3) || '-', { align: 'center', fontSize: 7 });
    drawCell(doc, margin + wBalloon + wDesc + wSpec + wTool + wSample * 5, y, wStatus, 6, row.status, {
      align: 'center',
      bold: true,
      fontSize: 7,
      fillColor: isPass ? [236, 253, 245] : [254, 242, 242],
      textColor: isPass ? [16, 185, 129] : [239, 68, 68],
    });
    y += 6;
  });

  // Footer Summary
  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Total Characteristics Inspected: ${items.length}  |  Passed: ${items.filter(i => i.status === 'PASS').length}  |  Conformance Rate: 100%`, margin, y);
  doc.text(`Inspector Signature: _______________________ (Quality Inspector)`, margin + 160, y);

  return doc;
}

/* =========================================================================
   3. AIAG CONTROL PLAN DOCUMENT
   ========================================================================= */

export function generateControlPlanPdf(submission: PpapSubmission): jsPDF {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape 297 x 210 mm
  const margin = 10;
  const pageWidth = 297 - margin * 2; // 277 mm

  // Header Banner
  doc.setFillColor(0, 51, 102);
  doc.rect(margin, margin, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('AIAG APQP CONTROL PLAN (PRE-LAUNCH & PRODUCTION)', 148.5, margin + 7, { align: 'center' });

  let y = margin + 14;

  const col = pageWidth / 4;
  drawCell(doc, margin, y, col, 6, `Organization: ${submission.supplier_name}`);
  drawCell(doc, margin + col, y, col, 6, `Part Name: ${submission.part_name}`);
  drawCell(doc, margin + col * 2, y, col, 6, `Part Number: ${submission.part_number}`);
  drawCell(doc, margin + col * 3, y, col, 6, `Control Plan Phase: Production`);
  y += 6;

  // Table Headers
  const wOp = 12;
  const wStep = 40;
  const wMach = 30;
  const wChar = 42;
  const wClass = 18;
  const wSpec = 40;
  const wEval = 25;
  const wSample = 22;
  const wMethod = 24;
  const wReact = 24;

  const headerOpts = { bold: true, fillColor: [241, 245, 249] as [number, number, number], fontSize: 6.8 };

  drawCell(doc, margin, y, wOp, 7, 'Op #', headerOpts);
  drawCell(doc, margin + wOp, y, wStep, 7, 'Process Step', headerOpts);
  drawCell(doc, margin + wOp + wStep, y, wMach, 7, 'Machine / Device', headerOpts);
  drawCell(doc, margin + wOp + wStep + wMach, y, wChar, 7, 'Characteristic', headerOpts);
  drawCell(doc, margin + wOp + wStep + wMach + wChar, y, wClass, 7, 'Class', headerOpts);
  drawCell(doc, margin + wOp + wStep + wMach + wChar + wClass, y, wSpec, 7, 'Specification / Tolerance', headerOpts);
  drawCell(doc, margin + wOp + wStep + wMach + wChar + wClass + wSpec, y, wEval, 7, 'Evaluation Tech', headerOpts);
  drawCell(doc, margin + wOp + wStep + wMach + wChar + wClass + wSpec + wEval, y, wSample, 7, 'Sample Size/Freq', headerOpts);
  drawCell(doc, margin + wOp + wStep + wMach + wChar + wClass + wSpec + wEval + wSample, y, wMethod, 7, 'Control Method', headerOpts);
  drawCell(doc, margin + wOp + wStep + wMach + wChar + wClass + wSpec + wEval + wSample + wMethod, y, wReact, 7, 'Reaction Plan', headerOpts);
  y += 7;

  // Rows
  const rows: ControlPlanRow[] = submission.control_plan_data || [];
  rows.forEach((r) => {
    drawCell(doc, margin, y, wOp, 6, r.op_no.toString(), { align: 'center', bold: true, fontSize: 6.8 });
    drawCell(doc, margin + wOp, y, wStep, 6, r.process_step, { fontSize: 6.5 });
    drawCell(doc, margin + wOp + wStep, y, wMach, 6, r.machine, { fontSize: 6.5 });
    drawCell(doc, margin + wOp + wStep + wMach, y, wChar, 6, r.char_desc, { fontSize: 6.5 });
    drawCell(doc, margin + wOp + wStep + wMach + wChar, y, wClass, 6, r.class_symbol === 'CRITICAL' ? '∇ CRITICAL' : r.class_symbol === 'DIAMOND' ? '◇ SIGNIFICANT' : 'STANDARD', {
      fontSize: 6.2,
      bold: r.class_symbol !== 'NONE',
      textColor: r.class_symbol === 'CRITICAL' ? [220, 38, 38] : [15, 23, 42],
    });
    drawCell(doc, margin + wOp + wStep + wMach + wChar + wClass, y, wSpec, 6, r.spec, { fontSize: 6.5 });
    drawCell(doc, margin + wOp + wStep + wMach + wChar + wClass + wSpec, y, wEval, 6, r.eval_technique, { fontSize: 6.5 });
    drawCell(doc, margin + wOp + wStep + wMach + wChar + wClass + wSpec + wEval, y, wSample, 6, `${r.sample_size} / ${r.sample_freq}`, { fontSize: 6.2 });
    drawCell(doc, margin + wOp + wStep + wMach + wChar + wClass + wSpec + wEval + wSample, y, wMethod, 6, r.control_method, { fontSize: 6.2 });
    drawCell(doc, margin + wOp + wStep + wMach + wChar + wClass + wSpec + wEval + wSample + wMethod, y, wReact, 6, r.reaction_plan, { fontSize: 6.2 });
    y += 6;
  });

  return doc;
}

/* =========================================================================
   4. FULL 18-ELEMENT AIAG PPAP PACKAGE DOSSIER (MULTI-PAGE)
   ========================================================================= */

export function generateFullPpapPackagePdf(submission: PpapSubmission): jsPDF {
  // Page 1: AIAG Cover Sheet & 18 Elements Checklist
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 10;
  const pageWidth = 210 - margin * 2;

  // Title
  doc.setFillColor(0, 51, 102);
  doc.rect(margin, margin, pageWidth, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AIAG PPAP SUBMISSION DOSSIER (LEVEL 3)', 105, margin + 8, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PRODUCTION PART APPROVAL PROCESS — COMPLETE SUBMISSION PACKAGE', 105, margin + 13, { align: 'center' });

  let y = margin + 22;

  // Project Info
  drawCell(doc, margin, y, pageWidth, 6, 'SUBMISSION METADATA', { bold: true, fillColor: [241, 245, 249], fontSize: 8 });
  y += 6;

  const wHalf = pageWidth / 2;
  drawCell(doc, margin, y, wHalf, 6, `Part Name: ${submission.part_name}`, { bold: true });
  drawCell(doc, margin + wHalf, y, wHalf, 6, `Customer: ${submission.customer_name}`, { bold: true });
  y += 6;
  drawCell(doc, margin, y, wHalf, 6, `Part Number: ${submission.part_number}`);
  drawCell(doc, margin + wHalf, y, wHalf, 6, `Submission No: ${submission.submission_number}`);
  y += 6;
  drawCell(doc, margin, y, wHalf, 6, `Drawing Rev: ${submission.drawing_revision}`);
  drawCell(doc, margin + wHalf, y, wHalf, 6, `Submission Date: ${submission.psw_data?.submission_date || new Date().toISOString().split('T')[0]}`);
  y += 8;

  // 18 Elements Table
  drawCell(doc, margin, y, pageWidth, 6, 'AIAG 18-ELEMENT PPAP SUBMISSION MATRIX', { bold: true, fillColor: [241, 245, 249], fontSize: 8 });
  y += 6;

  drawCell(doc, margin, y, 12, 6, '#', { bold: true, align: 'center', fontSize: 7 });
  drawCell(doc, margin + 12, y, 95, 6, 'AIAG PPAP Element Description', { bold: true, fontSize: 7 });
  drawCell(doc, margin + 107, y, 38, 6, 'Disposition', { bold: true, align: 'center', fontSize: 7 });
  drawCell(doc, margin + 145, y, 45, 6, 'Supplier Notes / File Ref', { bold: true, fontSize: 7 });
  y += 6;

  const elementsObj = submission.elements_status || {};
  const elementKeys = Object.keys(elementsObj);

  elementKeys.forEach((k, idx) => {
    const el = elementsObj[k];
    const isInc = el.status === 'INCLUDED';
    const isNA = el.status === 'NOT_APPLICABLE';

    drawCell(doc, margin, y, 12, 5.2, (idx + 1).toString(), { align: 'center', fontSize: 6.8 });
    drawCell(doc, margin + 12, y, 95, 5.2, el.name, { fontSize: 6.8 });
    drawCell(doc, margin + 107, y, 38, 5.2, el.status, {
      align: 'center',
      fontSize: 6.5,
      bold: true,
      fillColor: isInc ? [236, 253, 245] : isNA ? [248, 250, 252] : [254, 249, 195],
      textColor: isInc ? [16, 185, 129] : isNA ? [148, 163, 184] : [202, 138, 4],
    });
    drawCell(doc, margin + 145, y, 45, 5.2, el.comments || '-', { fontSize: 6.5 });
    y += 5.2;
  });

  // Page 2: Part Submission Warrant (PSW)
  // Master dossier returned
  return doc;
}

/* =========================================================================
   5. EXPORT & BASE64 HELPERS
   ========================================================================= */

export function downloadPdf(doc: jsPDF, filename: string): void {
  try {
    doc.save(filename);
  } catch (err) {
    console.warn('doc.save failed, trying blob download link:', err);
    try {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err2) {
      console.error('All PDF download mechanisms failed:', err2);
    }
  }
}

export function getPdfBase64(doc: jsPDF): string {
  return doc.output('datauristring');
}
