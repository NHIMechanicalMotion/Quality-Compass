import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ProcessFlowItem, ControlPlanRow, ProcessStepType, PpapSubmission } from '../types/apqpPpap';

/**
 * Downloads a standardized AIAG APQP / PPAP Excel template (.xlsx)
 * containing both the Process Flow Diagram (Sheet 1) and Control Plan (Sheet 2).
 */
export async function downloadAiagProcessFlowControlPlanTemplate(
  partNumber = 'FC-7782-B',
  partName = 'Planetary Carrier Assembly'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Quality Compass AIAG Launch Platform';
  workbook.created = new Date();

  // =========================================================================
  // SHEET 1: PROCESS FLOW DIAGRAM (PFD)
  // =========================================================================
  const wsPfd = workbook.addWorksheet('Process Flow (PFD)', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  wsPfd.mergeCells('A1:G1');
  const pfdTitle = wsPfd.getCell('A1');
  pfdTitle.value = 'AIAG APQP PROCESS FLOW DIAGRAM (PFD) TEMPLATE';
  pfdTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  pfdTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // slate-900
  pfdTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wsPfd.getRow(1).height = 34;

  // Metadata rows
  wsPfd.mergeCells('A2:D2');
  wsPfd.getCell('A2').value = `Part Name: ${partName}  |  Part Number: ${partNumber}`;
  wsPfd.getCell('A2').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };

  wsPfd.mergeCells('E2:G2');
  wsPfd.getCell('E2').value = `Template Standard: AIAG APQP 3rd Ed / PPAP 4th Ed`;
  wsPfd.getCell('E2').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  wsPfd.getCell('E2').alignment = { horizontal: 'right' };
  wsPfd.getRow(2).height = 20;

  // Table Headers
  const pfdHeaders = [
    'Op #',
    'Process Step / Operation Description',
    'Step Type (OPERATION / INSPECTION / TRANSPORT / STORAGE)',
    'Work Center / Machine',
    'Key Product Characteristic',
    'Key Process Characteristic',
    'Control Method',
  ];

  const headerRowPfd = wsPfd.getRow(4);
  headerRowPfd.values = pfdHeaders;
  headerRowPfd.height = 28;
  headerRowPfd.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRowPfd.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  for (let c = 1; c <= 7; c++) {
    const cell = headerRowPfd.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // slate-800
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  }

  // Sample Process Flow Data Rows
  const samplePfdRows = [
    [10, 'Raw Forging Receipt & Ultrasonic Test', 'INSPECTION', 'Receiving Dock / UT Station', 'Material Hardness (28-32 HRC), Flaws', 'Probe freq 5MHz, coupling gel', 'Mill Cert & 100% UT Scan'],
    [20, 'CNC Rough Turning & Flange Facing', 'OPERATION', 'Okuma LB-3000 Lathe', 'Flange OD 145.00 ± 0.15 mm, Face Runout', 'Spindle RPM 1200, Feed 0.25mm', 'Vernier Caliper & Dial Indicator'],
    [30, '5-Axis Center Bore Machining', 'OPERATION', 'Mori Seiki NHX-5000', 'Main Bearing Bore 50.000 +0.015/-0.000 mm', 'Chiller temp 20°C, Tool Life Counter', 'Air Bore Gage (SPC Cpk >= 1.67)'],
    [40, 'Pinion Pocket Precision Milling', 'OPERATION', 'Mori Seiki NHX-5000', 'Pocket Pitch Circle 92.500 ± 0.020 mm PCD', 'Spindle speed 8500 RPM, flood coolant', 'Zeiss Contura CMM Inspection'],
    [50, 'Induction Case Hardening & Quench', 'OPERATION', 'Inductoheat 50kW Scanner', 'Case Depth 1.2-1.6 mm, Hardness 58-62 HRC', 'Power 48kW, Quench flow 120 L/min', 'Optical Pyrometer & Micro-Vickers'],
    [60, 'High Pressure Deburr & Ultrasonic Wash', 'OPERATION', 'Sugino UJ-Clean 500bar', 'Residual Contamination < 2.0 mg / part', 'Wash pressure 450 bar, DI rinse', 'Gravimetric Extraction Lab'],
    [70, 'Final Layout & 100% Visual Inspection', 'INSPECTION', 'Quality Inspection Bay 2', '100% Critical Dimensions & Finish', 'Lab Temp 20°C ± 0.5°C', 'Zeiss CMM Automated Routine'],
    [80, 'VCI Packaging & Finished Goods Storage', 'STORAGE', 'Warehouse Bay C4', 'Corrosion-free VCI bag & barcode label', 'Desiccant pack placed, sealed box', 'Bar-code Scan Verification'],
  ];

  samplePfdRows.forEach((rowVals, idx) => {
    const rowNum = idx + 5;
    const row = wsPfd.getRow(rowNum);
    row.values = rowVals;
    row.height = 22;
    row.alignment = { vertical: 'middle' };
    row.font = { name: 'Arial', size: 9 };

    const isEven = idx % 2 === 0;
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  wsPfd.columns = [
    { width: 10 },
    { width: 40 },
    { width: 22 },
    { width: 28 },
    { width: 38 },
    { width: 34 },
    { width: 30 },
  ];

  // =========================================================================
  // SHEET 2: AIAG CONTROL PLAN (CP)
  // =========================================================================
  const wsCp = workbook.addWorksheet('AIAG Control Plan', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  wsCp.mergeCells('A1:K1');
  const cpTitle = wsCp.getCell('A1');
  cpTitle.value = 'AIAG APQP CONTROL PLAN (PRE-LAUNCH & PRODUCTION) TEMPLATE';
  cpTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  cpTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  cpTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wsCp.getRow(1).height = 34;

  // Metadata
  wsCp.mergeCells('A2:F2');
  wsCp.getCell('A2').value = `Part Name: ${partName}  |  Part Number: ${partNumber}  |  Phase: Production`;
  wsCp.getCell('A2').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };

  wsCp.mergeCells('G2:K2');
  wsCp.getCell('G2').value = `Reference: AIAG APQP / IATF 16949 Clause 8.5.1.1`;
  wsCp.getCell('G2').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  wsCp.getCell('G2').alignment = { horizontal: 'right' };
  wsCp.getRow(2).height = 20;

  // Control Plan Headers
  const cpHeaders = [
    'Op #',
    'Process Step / Operation Description',
    'Machine / Device / Jig',
    'Characteristic Description',
    'Special Class (CRITICAL / DIAMOND / NONE)',
    'Specification / Tolerance',
    'Evaluation / Measurement Technique',
    'Sample Size',
    'Sample Frequency',
    'Control Method',
    'Reaction Plan',
  ];

  const headerRowCp = wsCp.getRow(4);
  headerRowCp.values = cpHeaders;
  headerRowCp.height = 28;
  headerRowCp.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRowCp.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  for (let c = 1; c <= 11; c++) {
    const cell = headerRowCp.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // slate-700
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } },
    };
  }

  // Sample Control Plan Rows
  const sampleCpRows = [
    [10, 'Raw Forging Receipt & Ultrasonic Test', 'Receiving Dock / UT Station', 'Material Hardness & Internal Flaws', 'DIAMOND', 'AISI 4140H / 28-32 HRC', 'Rockwell Tester / UT-Pro', '5 pcs / lot', 'Per Heat', 'Mill Cert & 100% UT Scan', 'Quarantine Lot & Tag MRB'],
    [20, 'CNC Rough Turn & Face Flange', 'Okuma LB-3000 Lathe', 'Flange OD & Face Runout', 'NONE', '145.00 ± 0.15 mm', 'Digital Vernier Caliper', '3 pcs', '1 / 2 Hours', 'X-Bar R Chart', 'Adjust Tool Offset & Inspect Prev 5'],
    [30, '5-Axis High Precision Center Bore', 'Mori Seiki NHX-5000', 'Main Bearing Bore Diameter', 'CRITICAL', '50.000 +0.015 / -0.000 mm', 'Air Bore Gage / CMM', '5 pcs', '1 / Hour', 'SPC Real-Time Chart (Cpk >= 1.67)', 'Stop Spindle, 100% Quarantine lot'],
    [40, 'Pinion Pocket Precision Milling', 'Mori Seiki NHX-5000', 'Pocket Pitch Circle Diameter', 'CRITICAL', '92.500 ± 0.020 mm PCD', 'Zeiss Contura CMM', '2 pcs', 'Every 4 Hours', 'Automated CMM Routine', 'Reset Datum Fixture & Calibrate Probe'],
    [50, 'Induction Case Hardening & Temper', 'Inductoheat 50kW Scanner', 'Effective Case Depth & Hardness', 'DIAMOND', '58-62 HRC / 1.2-1.6 mm Depth', 'Micro-Vickers / Cut Section', '1 pc', 'Start / End of Shift', 'Destructive Lab Sample', 'Hold Shift Production for NDT'],
    [60, 'Final High-Pressure Clean & Deburr', 'Sugino UJ-Clean 500bar', 'Residual Contamination (Millipore)', 'DIAMOND', '< 2.0 mg per part / Max particle 200um', 'Gravimetric Extraction Lab', '1 pc', 'Weekly Verification', 'Lab Cleanliness Certificate', 'Flush Cleaning Tank & Replace Filters'],
  ];

  sampleCpRows.forEach((rowVals, idx) => {
    const rowNum = idx + 5;
    const row = wsCp.getRow(rowNum);
    row.values = rowVals;
    row.height = 22;
    row.alignment = { vertical: 'middle' };
    row.font = { name: 'Arial', size: 8.5 };

    const isEven = idx % 2 === 0;
    for (let c = 1; c <= 11; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).font = { name: 'Arial', size: 8.5, bold: true };
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  wsCp.columns = [
    { width: 8 },
    { width: 34 },
    { width: 25 },
    { width: 30 },
    { width: 18 },
    { width: 28 },
    { width: 26 },
    { width: 14 },
    { width: 18 },
    { width: 26 },
    { width: 30 },
  ];

  // Write and Save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `AIAG_Process_Flow_and_Control_Plan_Template_${partNumber}.xlsx`);
}

/**
 * Imports an uploaded Excel spreadsheet (.xlsx), extracting Process Flow items
 * and Control Plan rows based on sheet headers and column labels.
 */
export async function importProcessFlowAndControlPlanFromExcel(
  file: File
): Promise<{ processFlow: ProcessFlowItem[]; controlPlan: ControlPlanRow[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const result: { processFlow: ProcessFlowItem[]; controlPlan: ControlPlanRow[] } = {
    processFlow: [],
    controlPlan: [],
  };

  // Inspect each worksheet
  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name.toLowerCase();

    // -------------------------------------------------------------
    // Case 1: Process Flow Sheet
    // -------------------------------------------------------------
    if (sheetName.includes('flow') || sheetName.includes('pfd') || sheetName.includes('process')) {
      // Find header row (search first 10 rows)
      let headerRowIndex = 4;
      for (let r = 1; r <= 10; r++) {
        const row = worksheet.getRow(r);
        const text = (row.values as any[])?.join(' ').toLowerCase() || '';
        if (text.includes('op') && (text.includes('step') || text.includes('description') || text.includes('operation'))) {
          headerRowIndex = r;
          break;
        }
      }

      // Read data rows starting after header
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIndex) return;

        const rawValues = row.values as any[];
        if (!rawValues || rawValues.length < 2) return;

        // Try extracting values
        const opVal = parseInt(String(rawValues[1] || '').trim()) || (result.processFlow.length + 1) * 10;
        const opName = String(rawValues[2] || '').trim();
        if (!opName) return; // Skip empty rows

        const stepTypeRaw = String(rawValues[3] || 'OPERATION').toUpperCase();
        let stepType: ProcessStepType = 'OPERATION';
        if (stepTypeRaw.includes('INSPECT')) stepType = 'INSPECTION';
        else if (stepTypeRaw.includes('TRANS')) stepType = 'TRANSPORT';
        else if (stepTypeRaw.includes('STORE') || stepTypeRaw.includes('STORAGE')) stepType = 'STORAGE';
        else if (stepTypeRaw.includes('DELAY')) stepType = 'DELAY';

        const workCenter = String(rawValues[4] || 'Main Work Center').trim();
        const prodChar = String(rawValues[5] || '').trim();
        const procChar = String(rawValues[6] || '').trim();
        const ctrlMethod = String(rawValues[7] || 'Standard In-Process Inspection').trim();

        result.processFlow.push({
          op_no: opVal,
          operation_name: opName,
          step_type: stepType,
          work_center: workCenter,
          key_product_char: prodChar,
          key_process_char: procChar,
          control_method: ctrlMethod,
        });
      });
    }

    // -------------------------------------------------------------
    // Case 2: Control Plan Sheet
    // -------------------------------------------------------------
    if (sheetName.includes('control') || sheetName.includes('plan') || sheetName.includes('cp')) {
      let headerRowIndex = 4;
      for (let r = 1; r <= 10; r++) {
        const row = worksheet.getRow(r);
        const text = (row.values as any[])?.join(' ').toLowerCase() || '';
        if (text.includes('op') && (text.includes('specification') || text.includes('reaction') || text.includes('characteristic'))) {
          headerRowIndex = r;
          break;
        }
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIndex) return;

        const rawValues = row.values as any[];
        if (!rawValues || rawValues.length < 3) return;

        const opVal = parseInt(String(rawValues[1] || '').trim()) || (result.controlPlan.length + 1) * 10;
        const stepName = String(rawValues[2] || '').trim();
        if (!stepName) return;

        const machine = String(rawValues[3] || 'CNC Machining Center').trim();
        const charDesc = String(rawValues[4] || 'Critical Dimension').trim();
        const rawClass = String(rawValues[5] || '').toUpperCase();
        let classSymbol: 'NONE' | 'CRITICAL' | 'DIAMOND' | 'MAJOR' = 'NONE';
        if (rawClass.includes('CRIT') || rawClass.includes('∇')) classSymbol = 'CRITICAL';
        else if (rawClass.includes('DIAMOND') || rawClass.includes('SIGNIF') || rawClass.includes('◇')) classSymbol = 'DIAMOND';
        else if (rawClass.includes('MAJOR')) classSymbol = 'MAJOR';

        const spec = String(rawValues[6] || 'Per Drawing Specification').trim();
        const evalTech = String(rawValues[7] || 'Calibrated Gage').trim();
        const sampleSize = String(rawValues[8] || '5 pcs').trim();
        const sampleFreq = String(rawValues[9] || 'Per Shift').trim();
        const ctrlMethod = String(rawValues[10] || 'Inspection Sheet').trim();
        const reactionPlan = String(rawValues[11] || 'Quarantine & Tag MRB').trim();

        result.controlPlan.push({
          op_no: opVal,
          process_step: stepName,
          machine,
          char_desc: charDesc,
          class_symbol: classSymbol,
          spec,
          eval_technique: evalTech,
          sample_size: sampleSize,
          sample_freq: sampleFreq,
          control_method: ctrlMethod,
          reaction_plan: reactionPlan,
        });
      });
    }
  });

  return result;
}

/**
 * Populates the official AIAG PPAP Forms Workbook (4th Edition)
 * (or a custom uploaded .xlsx/.xltm template) with all live data from the current PPAP submission
 * and downloads it with fully mapped, professional sheets:
 * 1. Cover
 * 2. THE-1001 PSW (Part Submission Warrant Form CFG-1001)
 * 3. Flow (Process Flow Diagram)
 * 4. Control Plan (AIAG Prototype / Pre-Launch / Production Control Plan)
 * 5. Dimensional CFG1003 (Dimensional Test Results Form CFG-1003)
 * 6. FMEA (Process Failure Mode and Effects Analysis)
 */
export async function exportPopulatedAiagPpapWorkbook(
  submission: PpapSubmission,
  customTemplateBuffer?: ArrayBuffer
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  if (customTemplateBuffer) {
    await workbook.xlsx.load(customTemplateBuffer);
  } else {
    // Try .xlsx first (universal browser MIME support), fallback to .xltm
    let buffer: ArrayBuffer | null = null;
    try {
      const res = await fetch('/templates/PPAP_Forms_Workbook_4th_Edition.xlsx');
      if (res.ok) buffer = await res.arrayBuffer();
    } catch {
      // Fallback
    }

    if (!buffer) {
      const res = await fetch('/templates/PPAP_Forms_Workbook_4th_Edition.xltm');
      if (!res.ok) {
        throw new Error(`Failed to load AIAG PPAP template workbook (${res.status})`);
      }
      buffer = await res.arrayBuffer();
    }

    await workbook.xlsx.load(buffer);
  }

  // 1. Cover Sheet
  const wsCover = workbook.getWorksheet('Cover');
  if (wsCover) {
    wsCover.getCell('C10').value = submission.supplier_name || 'Acme Precision Machining Corp.';
    wsCover.getCell('C11').value = submission.facility_address || '1200 Industrial Parkway';
    wsCover.getCell('C12').value = 'MI';
    wsCover.getCell('C13').value = '48126';
    wsCover.getCell('C14').value = 'USA';
    wsCover.getCell('C16').value = submission.psw_data?.authorized_rep || 'Lead Quality Engineer';
    wsCover.getCell('C17').value = submission.psw_data?.supplier_email || '';
    wsCover.getCell('C18').value = submission.psw_data?.supplier_phone || '';
    wsCover.getCell('C20').value = submission.part_name || '';
    wsCover.getCell('C21').value = `${submission.part_number || ''} Rev. ${submission.drawing_revision || ''}`;
  }

  // 2. THE-1001 PSW Sheet
  const wsPsw = workbook.getWorksheet('THE-1001 PSW');
  if (wsPsw) {
    wsPsw.getCell('D3').value = submission.part_name || '';
    wsPsw.getCell('L3').value = submission.psw_data?.cust_part_number || submission.part_number || '';
    wsPsw.getCell('P3').value = submission.drawing_revision || '';
    wsPsw.getCell('D6').value = `PO-${submission.submission_number || ''}`;
    wsPsw.getCell('L6').value = submission.engineering_change_level || '';
    wsPsw.getCell('Q6').value = submission.psw_data?.submission_date || new Date().toISOString().split('T')[0];
    wsPsw.getCell('G8').value = submission.drawing_revision ? `ECN-${submission.drawing_revision}` : '';
    wsPsw.getCell('Q8').value = submission.psw_data?.submission_date || new Date().toISOString().split('T')[0];
    wsPsw.getCell('E10').value = submission.drawing_number || '';
    wsPsw.getCell('M10').value = submission.submission_number || '';
    wsPsw.getCell('P10').value = submission.weight_kg || '';
    wsPsw.getCell('E12').value = `${submission.part_number || ''}-GAGE`;
    wsPsw.getCell('L12').value = submission.engineering_change_level || '';
    wsPsw.getCell('Q12').value = submission.psw_data?.submission_date || new Date().toISOString().split('T')[0];

    // Organization Information
    wsPsw.getCell('B16').value = `${submission.supplier_name || ''} / Code: ${submission.supplier_code || ''}`;
    wsPsw.getCell('B19').value = submission.facility_address || '';
    wsPsw.getCell('B22').value = 'Dearborn';
    wsPsw.getCell('G22').value = 'MI 48126';

    // Customer Information
    wsPsw.getCell('J16').value = `${submission.customer_name || ''}${submission.customer_division ? ' / ' + submission.customer_division : ''}`;
    wsPsw.getCell('J19').value = submission.psw_data?.customer_reviewer || '';
    wsPsw.getCell('J22').value = submission.application || '';

    // Reasons for Submission
    const reason = submission.submission_reason;
    if (reason === 'INITIAL_SUBMISSION') wsPsw.getCell('B30').value = 'X';
    else if (reason === 'ENGINEERING_CHANGE') wsPsw.getCell('B31').value = 'X';
    else if (reason === 'TOOLING_TRANSFER') wsPsw.getCell('B32').value = 'X';
    else if (reason === 'CORRECTION_DISCREPANCY') wsPsw.getCell('B33').value = 'X';
    else if (reason === 'PROCESS_CHANGE') wsPsw.getCell('K32').value = 'X';
    else if (reason === 'OTHER') {
      wsPsw.getCell('K34').value = 'X';
      wsPsw.getCell('L35').value = submission.reason_other_description || '';
    }

    // Submission Level
    const lvl = submission.submission_level;
    if (lvl === 1) wsPsw.getCell('B37').value = 'X';
    else if (lvl === 2) wsPsw.getCell('B38').value = 'X';
    else if (lvl === 3) wsPsw.getCell('B39').value = 'X';
    else if (lvl === 4) wsPsw.getCell('B40').value = 'X';
    else if (lvl === 5) wsPsw.getCell('B43').value = 'X';

    // Declarations
    wsPsw.getCell('D25').value = submission.psw_data?.materials_reporting
      ? `Yes (IMDS: ${submission.imds_number || 'Complete'})`
      : 'No';
    wsPsw.getCell('D27').value = submission.psw_data?.polymeric_parts_identified ? 'Yes' : 'N/A';
    wsPsw.getCell('E50').value =
      submission.psw_data?.customer_comments ||
      'Production run at rate validated. Conformance to all engineering specifications verified.';
    wsPsw.getCell('F55').value = submission.psw_data?.authorized_rep || '';
    wsPsw.getCell('C57').value = submission.psw_data?.rep_title || '';
    wsPsw.getCell('K57').value = submission.psw_data?.supplier_phone || '';
    wsPsw.getCell('P57').value = submission.psw_data?.submission_date || new Date().toISOString().split('T')[0];
    wsPsw.getCell('K59').value = submission.psw_data?.supplier_email || '';

    // Customer Disposition
    wsPsw.getCell('D65').value = submission.psw_data?.customer_disposition || 'APPROVED';
    wsPsw.getCell('L64').value = submission.psw_data?.customer_reviewer || '';
    wsPsw.getCell('L68').value = submission.psw_data?.customer_signature_date || '';
  }

  // 3. Dimensional CFG1003 Sheet
  const wsDim = workbook.getWorksheet('Dimensional CFG1003');
  if (wsDim) {
    wsDim.getCell('D4').value = submission.supplier_name || '';
    wsDim.getCell('J4').value = submission.part_number || '';
    wsDim.getCell('D5').value = submission.supplier_code || '';
    wsDim.getCell('J5').value = submission.part_name || '';
    wsDim.getCell('J6').value = submission.drawing_revision || '';
    wsDim.getCell('D7').value = submission.psw_data?.submission_date || new Date().toISOString().split('T')[0];
    wsDim.getCell('J7').value = 'Acme Metrology Lab (ISO/IEC 17025 Accredited)';

    (submission.dimensional_results || []).forEach((dim, idx) => {
      const r = 9 + idx;
      wsDim.getCell(`A${r}`).value = dim.balloon_no;
      wsDim.getCell(`B${r}`).value = `${dim.feature_desc} (Nom: ${dim.nominal}, Tol: +${dim.upper_tol}/${dim.lower_tol})`;
      wsDim.getCell(`D${r}`).value = 5;
      wsDim.getCell(`E${r}`).value = `S1:${dim.sample_1}, S2:${dim.sample_2}, S3:${dim.sample_3}, S4:${dim.sample_4}, S5:${dim.sample_5} [${dim.gage_tool}]`;
      wsDim.getCell(`G${r}`).value = dim.status === 'PASS' ? 'X' : '';
      wsDim.getCell(`H${r}`).value = dim.status === 'FAIL' ? 'X' : '';
    });
  }

  // 4. Control Plan Sheet
  const wsCp = workbook.getWorksheet('Control Plan');
  if (wsCp) {
    wsCp.getCell('D2').value = `CP-${submission.part_number}-PROD-01`;
    wsCp.getCell('Q2').value = `${submission.psw_data?.authorized_rep || ''} / ${submission.psw_data?.supplier_phone || ''}`;
    wsCp.getCell('W2').value = submission.created_at ? submission.created_at.split('T')[0] : '2026-01-15';
    wsCp.getCell('AC2').value = submission.psw_data?.submission_date || new Date().toISOString().split('T')[0];
    wsCp.getCell('D4').value = `${submission.part_number} Rev ${submission.drawing_revision}`;
    wsCp.getCell('Q4').value = submission.part_name || '';
    wsCp.getCell('W4').value = `${submission.supplier_name || ''} / Quality Assurance`;

    (submission.control_plan_data || []).forEach((cp, idx) => {
      const r = 10 + idx;
      wsCp.getCell(`A${r}`).value = `OP ${cp.op_no}`;
      wsCp.getCell(`C${r}`).value = cp.process_step;
      wsCp.getCell(`G${r}`).value = cp.machine;
      wsCp.getCell(`J${r}`).value = idx + 1;
      wsCp.getCell(`K${r}`).value = cp.char_desc;
      wsCp.getCell(`M${r}`).value = cp.process_step;
      wsCp.getCell(`O${r}`).value = cp.class_symbol === 'CRITICAL' ? '∇' : cp.class_symbol === 'DIAMOND' ? '◇' : '';
      wsCp.getCell(`Q${r}`).value = cp.spec;
      wsCp.getCell(`S${r}`).value = cp.eval_technique;
      wsCp.getCell(`U${r}`).value = cp.sample_size;
      wsCp.getCell(`W${r}`).value = cp.sample_freq;
      wsCp.getCell(`Y${r}`).value = cp.control_method;
      wsCp.getCell(`AB${r}`).value = cp.reaction_plan;
    });
  }

  // 5. Flow Sheet
  const wsFlow = workbook.getWorksheet('Flow');
  if (wsFlow) {
    wsFlow.getCell('C3').value = `${submission.part_name} - Manufacturing & Assembly Process Flow`;
    wsFlow.getCell('M3').value = submission.psw_data?.submission_date || new Date().toISOString().split('T')[0];
    wsFlow.getCell('C4').value = `${submission.supplier_name || ''} - Main Production Facility`;

    (submission.process_flow_data || []).forEach((f, idx) => {
      const r = 8 + idx;
      wsFlow.getCell(`A${r}`).value = `OP ${f.op_no}`;
      wsFlow.getCell(`B${r}`).value = `${f.operation_name} [${f.step_type}]`;
      wsFlow.getCell(`C${r}`).value = 'Manufacturing Technician';
      wsFlow.getCell(`D${r}`).value = f.work_center;
      wsFlow.getCell(`K${r}`).value = '15m';
      wsFlow.getCell(`L${r}`).value = '180s';
      wsFlow.getCell(`M${r}`).value = `${f.key_product_char ? 'Char: ' + f.key_product_char + ' | ' : ''}Control: ${f.control_method}`;
    });
  }

  // 6. FMEA Sheet
  const wsFmea = workbook.getWorksheet('FMEA');
  if (wsFmea) {
    (submission.fmea_items || []).forEach((fmea, idx) => {
      const r = 11 + idx;
      wsFmea.getCell(`B${r}`).value = fmea.process_step;
      wsFmea.getCell(`C${r}`).value = fmea.failure_mode;
      wsFmea.getCell(`E${r}`).value = fmea.failure_effect;
      wsFmea.getCell(`J${r}`).value = fmea.severity;
      wsFmea.getCell(`M${r}`).value = fmea.severity >= 8 ? '∇' : '';
      wsFmea.getCell(`N${r}`).value = fmea.cause;
      wsFmea.getCell(`O${r}`).value = fmea.occurrence;
      wsFmea.getCell(`Q${r}`).value = fmea.prev_controls;
      wsFmea.getCell(`T${r}`).value = fmea.det_controls;
      wsFmea.getCell(`V${r}`).value = fmea.detection;
      wsFmea.getCell(`Y${r}`).value = fmea.actions_taken || 'Implement SPC monitor';
      wsFmea.getCell(`AB${r}`).value = submission.psw_data?.authorized_rep || 'Lead Quality Eng';
    });
  }

  // 7. Capacity Analysis and R@R Sheet
  const wsCapacity = workbook.getWorksheet('Capacity Analysis and R@R');
  if (wsCapacity) {
    const cap = submission.capacity_data || {
      constraint_type: 'MACHINE',
      constraint_description: 'OP 30: 5-Axis Pinion Bore CNC Milling (Makino A61nx)',
      num_constraints: 2,
      shifts_per_day: 2,
      hours_per_shift: 7.5,
      daily_demand: 420,
      days_in_sample: 5,
      daily_logs: [
        { day_no: 1, date: '2026-03-02', workers: 2, hours_worked: 15.0, downtime_hours: 0.6, overtime_hours: 0.0, units_produced: 452, scrap_units: 4 },
        { day_no: 2, date: '2026-03-03', workers: 2, hours_worked: 15.0, downtime_hours: 0.4, overtime_hours: 0.0, units_produced: 460, scrap_units: 3 },
        { day_no: 3, date: '2026-03-04', workers: 2, hours_worked: 15.0, downtime_hours: 0.8, overtime_hours: 0.0, units_produced: 448, scrap_units: 5 },
        { day_no: 4, date: '2026-03-05', workers: 2, hours_worked: 15.0, downtime_hours: 0.5, overtime_hours: 0.0, units_produced: 455, scrap_units: 4 },
        { day_no: 5, date: '2026-03-06', workers: 2, hours_worked: 15.0, downtime_hours: 0.3, overtime_hours: 0.0, units_produced: 468, scrap_units: 2 },
      ],
    };

    // Header Info
    wsCapacity.getCell('I1').value = submission.supplier_name || 'Acme Precision Machining Corp.';
    wsCapacity.getCell('I2').value = submission.supplier_code || 'DUNS-09-881-2241';
    wsCapacity.getCell('I3').value = submission.psw_data?.submission_date || new Date().toISOString().split('T')[0];

    // Constraint & Operating Parameters
    wsCapacity.getCell('E4').value = cap.constraint_type === 'LABOR' ? 'Labor / Crew' : 'Machine';
    wsCapacity.getCell('F4').value = Number(cap.num_constraints) || 2;
    wsCapacity.getCell('H4').value = cap.constraint_description || 'Constraint Workstation';
    wsCapacity.getCell('F5').value = Number(cap.shifts_per_day) || 2;
    wsCapacity.getCell('F6').value = Number(cap.hours_per_shift) || 7.5;
    const numDays = cap.daily_logs?.length || 5;
    wsCapacity.getCell('F7').value = numDays;
    const dailyDemand = Number(cap.daily_demand) || 420;
    wsCapacity.getCell('F8').value = dailyDemand;

    // Clear columns B to O to wipe any template remnants or leftover formulas
    for (let c = 0; c < 14; c++) {
      const col = String.fromCharCode(66 + c); // B to O
      wsCapacity.getCell(`${col}11`).value = null;
      wsCapacity.getCell(`${col}12`).value = null;
      wsCapacity.getCell(`${col}13`).value = null;
      wsCapacity.getCell(`${col}14`).value = null;
      wsCapacity.getCell(`${col}15`).value = null;
      wsCapacity.getCell(`${col}23`).value = null;
      wsCapacity.getCell(`${col}24`).value = null;
    }

    let totalGross = 0;
    let totalScrap = 0;
    let totalActualHours = 0;
    let totalDowntimeHours = 0;

    (cap.daily_logs || []).forEach((log, idx) => {
      if (idx >= 14) return;
      const col = String.fromCharCode(66 + idx);
      wsCapacity.getCell(`${col}11`).value = log.date;
      wsCapacity.getCell(`${col}12`).value = Number(log.workers) || Number(cap.num_constraints) || 2;
      wsCapacity.getCell(`${col}13`).value = Number(log.hours_worked) || 15.0;
      wsCapacity.getCell(`${col}14`).value = Number(log.downtime_hours) || 0.5;
      wsCapacity.getCell(`${col}15`).value = Number(log.overtime_hours) || 0.0;
      wsCapacity.getCell(`${col}23`).value = Number(log.units_produced) || 450;
      wsCapacity.getCell(`${col}24`).value = Number(log.scrap_units) || 3;

      const hrs = Number(log.hours_worked) || 15.0;
      const down = Number(log.downtime_hours) || 0.5;
      const ot = Number(log.overtime_hours) || 0;
      const gross = Number(log.units_produced) || 450;
      const scrap = Number(log.scrap_units) || 3;
      const prodHours = hrs - down + ot;
      const net = gross - scrap;
      const rate = hrs > 0 ? net / hrs : 0;

      wsCapacity.getCell(`${col}17`).value = { formula: `+IF(${col}13="","", ${col}13-${col}14+${col}15)`, result: prodHours };
      wsCapacity.getCell(`${col}27`).value = { formula: `+IF(${col}13="","",(${col}23-${col}24)/(${col}13+${col}15))`, result: rate };

      totalGross += gross;
      totalScrap += scrap;
      totalActualHours += hrs;
      totalDowntimeHours += down;
    });

    const netGoodTotal = totalGross - totalScrap;
    const demonstratedCap = numDays > 0 ? netGoodTotal / numDays : 0;
    const avgUnitsPerHr = totalActualHours > 0 ? netGoodTotal / totalActualHours : 0;
    const stdHrsPerPart = avgUnitsPerHr > 0 ? (60 / avgUnitsPerHr) / 60 : 0.033;
    const plannedHrsPerDay = (Number(cap.shifts_per_day) || 2) * (Number(cap.hours_per_shift) || 7.5) * (Number(cap.num_constraints) || 2);
    const theoreticalCap = stdHrsPerPart > 0 ? Math.round(plannedHrsPerDay / stdHrsPerPart) : Math.round(demonstratedCap * 1.3);
    const avgEffectiveHours = numDays > 0 ? (totalActualHours - totalDowntimeHours) / numDays : 14.5;
    const ratedCap = stdHrsPerPart > 0 ? Math.round(avgEffectiveHours / stdHrsPerPart) : Math.round(demonstratedCap * 1.05);
    const capUsedRatio = ratedCap > 0 ? dailyDemand / ratedCap : 0.8;
    const verdict = capUsedRatio < 0.85 ? 'GOOD' : capUsedRatio <= 0.9 ? 'Potential Problem' : 'NO';

    wsCapacity.getCell('P23').value = { formula: '+SUM(B23:O23)', result: totalGross };
    wsCapacity.getCell('P24').value = { formula: '+SUM(B24:O24)', result: totalScrap };
    wsCapacity.getCell('B34').value = { formula: '+(F9/F7)/P30', result: theoreticalCap };
    wsCapacity.getCell('B35').value = { formula: '+(P23-P24)/$F$7', result: Math.round(demonstratedCap * 10) / 10 };
    wsCapacity.getCell('B36').value = { formula: '+((P17)*P32*P19)/P30', result: ratedCap };
    wsCapacity.getCell('B37').value = { formula: '+F8', result: dailyDemand };
    wsCapacity.getCell('C38').value = { formula: '+(B37/B36)', result: Math.round(capUsedRatio * 1000) / 1000 };
    wsCapacity.getCell('B38').value = {
      formula: '+IF(C38<0.85,"GOOD", IF(C38>0.9, "NO", "Potential Problem"))',
      result: verdict,
    };
  }

  const outBuffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `${submission.part_number || 'AIAG'}_PPAP_4th_Edition_Workbook.xlsx`);
}
