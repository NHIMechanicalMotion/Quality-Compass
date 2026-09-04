import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { InspectionControlPlan, InspectionMethodTool } from '../types/inspection';
import type { AuditReport } from '../types/cad';
import { INSPECTION_TOOLS_DATABASE } from './toolRecommender';

export async function exportInspectionControlPlanToExcel(
  plan: InspectionControlPlan,
  auditReport?: AuditReport,
  customTools?: InspectionMethodTool[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Quality Compass Engineering QA Platform';
  workbook.created = new Date();

  // -------------------------------------------------------------
  // SHEET 1: Inspection Control Plan (检验控制计划与首件检验报告)
  // -------------------------------------------------------------
  const wsPlan = workbook.addWorksheet('Inspection Control Plan 检验计划', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  wsPlan.mergeCells('A1:S1');
  const titleCell = wsPlan.getCell('A1');
  titleCell.value = 'QUALITY COMPASS - FIRST ARTICLE & QUALITY INSPECTION CONTROL PLAN / 首件检验与质量控制计划';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsPlan.getRow(1).height = 36;

  // Header Metadata Rows
  const metadataRows = [
    [
      'Part Name / 零件名称:', plan.partName, '',
      'Part Number / 零件图号:', plan.partNumber, '',
      'Revision / 版本:', plan.revision, '',
      'Standard / 适用标准:', plan.standardApplied, '',
    ],
    [
      'Supplier Facility / 制造基地:', plan.supplierFacility, '',
      'Prepared By / 编制人:', plan.preparedBy, '',
      'Inspection Date / 检验日期:', plan.chinaApproval.inspectionDate || plan.creationDate, '',
      'China QC Inspector / 检验员:', plan.chinaApproval.inspectorName || 'Zhang Wei (张伟)', '',
    ],
    [
      'Approval Status / 批准结论:', plan.chinaApproval.decision, '',
      'QA Approver / 审核人:', plan.chinaApproval.qaManagerName || 'Li Ming (李明)', '',
      'Approval Date / 批准日期:', plan.chinaApproval.approvalDate || new Date().toISOString().slice(0, 10), '',
      'Concession Notes / 备注特采:', plan.chinaApproval.decisionNotes || 'Production ready / 符合投产要求', '',
    ],
  ];

  metadataRows.forEach((rowVals, idx) => {
    const rowNum = idx + 2;
    const row = wsPlan.getRow(rowNum);
    row.values = [
      rowVals[0], rowVals[1], '',
      rowVals[3], rowVals[4], '',
      rowVals[6], rowVals[7], '',
      rowVals[9], rowVals[10], '',
    ];
    row.height = 22;

    // Merge key-value pairs
    wsPlan.mergeCells(`A${rowNum}:A${rowNum}`);
    wsPlan.mergeCells(`B${rowNum}:C${rowNum}`);
    wsPlan.mergeCells(`D${rowNum}:D${rowNum}`);
    wsPlan.mergeCells(`E${rowNum}:F${rowNum}`);
    wsPlan.mergeCells(`G${rowNum}:G${rowNum}`);
    wsPlan.mergeCells(`H${rowNum}:I${rowNum}`);
    wsPlan.mergeCells(`J${rowNum}:J${rowNum}`);
    wsPlan.mergeCells(`K${rowNum}:S${rowNum}`);

    // Style metadata labels
    ['A', 'D', 'G', 'J'].forEach(col => {
      const c = wsPlan.getCell(`${col}${rowNum}`);
      c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF334155' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      c.alignment = { vertical: 'middle' };
    });

    ['B', 'E', 'H', 'K'].forEach(col => {
      const c = wsPlan.getCell(`${col}${rowNum}`);
      c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };
      c.alignment = { vertical: 'middle' };
    });
  });

  // Blank spacer row
  wsPlan.getRow(5).height = 10;

  // Table Column Headers
  const tableHeaders = [
    'Item #\n气泡序号',
    'Feature Description\n检验特性描述',
    'Class\n特性类别',
    'Zone\n图区',
    'Nominal\n标准值',
    'Lower Tol\n下偏差',
    'Upper Tol\n上偏差',
    'Min Spec\n规格下限',
    'Max Spec\n规格上限',
    'Unit\n单位',
    'Inspection Method (Tooling)\n测量工具 / 检具 (现场选定)',
    'Sampling\n检验频次',
    'Sample 1\n实测 1',
    'Sample 2\n实测 2',
    'Sample 3\n实测 3',
    'Sample 4\n实测 4',
    'Sample 5\n实测 5',
    'Result\n判定',
    'China QC Remarks\n现场检验备注 / 偏差处理',
  ];

  const headerRow = wsPlan.getRow(6);
  headerRow.values = tableHeaders;
  headerRow.height = 32;

  for (let c = 1; c <= 19; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  }

  // Populate Items
  let startRow = 7;
  plan.items.forEach((item, index) => {
    const r = startRow + index;
    const row = wsPlan.getRow(r);

    const isCritical = item.classification === 'CRITICAL';
    const toolText = item.selectedToolZh || `${item.recommendedToolEn} (${item.recommendedToolZh})`;

    row.values = [
      item.itemNumber,
      `${item.characteristicNameEn} / ${item.characteristicNameZh}`,
      item.classification,
      item.drawingZone || 'Zone 1',
      item.nominal,
      item.lowerTol,
      item.upperTol,
      { formula: `E${r}+F${r}`, result: item.minLimit },
      { formula: `E${r}+G${r}`, result: item.maxLimit },
      item.unit,
      toolText,
      item.samplingPlanZh || item.samplingPlanEn,
      item.measurements.sample1 ?? '',
      item.measurements.sample2 ?? '',
      item.measurements.sample3 ?? '',
      item.measurements.sample4 ?? '',
      item.measurements.sample5 ?? '',
      {
        formula: `IF(COUNTA(M${r}:Q${r})=0,"PENDING",IF(AND(MIN(M${r}:Q${r})>=H${r}-0.0001,MAX(M${r}:Q${r})<=I${r}+0.0001),"PASS","FAIL"))`,
        result: item.status,
      },
      item.deviationNotes || (item.status === 'PASS' ? 'In Tolerance' : ''),
    ];

    row.height = 24;

    // Apply borders and alternating background
    const bgArgb = index % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
    for (let colIdx = 1; colIdx <= 19; colIdx++) {
      const cell = row.getCell(colIdx);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle' };
    }

    // Centered columns: Item #, Class, Zone, Unit, Result
    [1, 3, 4, 10, 18].forEach(c => {
      row.getCell(c).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Right-align numbers: Nominal, Tols, Limits, Samples
    [5, 6, 7, 8, 9, 13, 14, 15, 16, 17].forEach(c => {
      const cell = row.getCell(c);
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = '0.000';
    });

    // Highlight Critical items
    if (isCritical) {
      row.getCell(3).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFDC2626' } };
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    }

    // Highlight Status
    const statusCell = row.getCell(18);
    statusCell.font = { name: 'Arial', size: 9, bold: true };
    if (item.status === 'PASS') {
      statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF15803D' } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    } else if (item.status === 'FAIL') {
      statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    } else {
      statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFD97706' } };
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    }
  });

  // Sign-off / Approval Block at Bottom
  const bottomRowStart = startRow + plan.items.length + 2;
  wsPlan.mergeCells(`A${bottomRowStart}:S${bottomRowStart}`);
  const signTitle = wsPlan.getCell(`A${bottomRowStart}`);
  signTitle.value = 'CHINA QC FACILITY INSPECTION SIGN-OFF & APPROVAL / 中国制造工厂质检审批确认';
  signTitle.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  signTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  signTitle.alignment = { vertical: 'middle', horizontal: 'left' };
  wsPlan.getRow(bottomRowStart).height = 24;

  const signInfoRows = [
    ['Inspector (检验员):', plan.chinaApproval.inspectorName || 'Zhang Wei', 'Date (日期):', plan.chinaApproval.inspectionDate || plan.creationDate, 'Facility (工厂):', plan.chinaApproval.facilityLocation || 'Suzhou Plant / 苏州精密生产线'],
    ['QA Manager (质量经理):', plan.chinaApproval.qaManagerName || 'Li Ming', 'Approval Date (审批日期):', plan.chinaApproval.approvalDate || plan.creationDate, 'Decision (审核结论):', plan.chinaApproval.decision],
  ];

  signInfoRows.forEach((rVals, idx) => {
    const rNum = bottomRowStart + 1 + idx;
    const row = wsPlan.getRow(rNum);
    row.values = [rVals[0], rVals[1], '', rVals[2], rVals[3], '', rVals[4], rVals[5]];
    wsPlan.mergeCells(`B${rNum}:C${rNum}`);
    wsPlan.mergeCells(`E${rNum}:F${rNum}`);
    wsPlan.mergeCells(`H${rNum}:S${rNum}`);
    row.height = 22;
    row.font = { name: 'Arial', size: 9 };
    row.alignment = { vertical: 'middle' };
  });

  // Set explicit column widths
  wsPlan.columns = [
    { width: 10 },
    { width: 34 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
    { width: 11 },
    { width: 11 },
    { width: 12 },
    { width: 12 },
    { width: 8 },
    { width: 32 },
    { width: 14 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 11 },
    { width: 12 },
    { width: 28 },
  ];

  // -------------------------------------------------------------
  // SHEET 2: CAD Standards Audit Report (图纸规范审核报告)
  // -------------------------------------------------------------
  if (auditReport) {
    const wsAudit = workbook.addWorksheet('Standards Audit 审核报告', {
      views: [{ showGridLines: true }],
    });

    wsAudit.mergeCells('A1:F1');
    const auditTitle = wsAudit.getCell('A1');
    auditTitle.value = `CAD DRAWING STANDARDS AUDIT REPORT / 图纸规范审核报告 (${auditReport.standardApplied})`;
    auditTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    auditTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    auditTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    wsAudit.getRow(1).height = 32;

    // Score Summary
    wsAudit.getRow(3).values = ['Compliance Score / 规范合规率:', `${auditReport.complianceScore}%`, '', 'Overall Status / 审核结论:', auditReport.overallStatus];
    wsAudit.mergeCells('B3:C3');
    wsAudit.mergeCells('E3:F3');
    wsAudit.getRow(3).height = 24;
    wsAudit.getRow(3).font = { name: 'Arial', size: 10, bold: true };

    wsAudit.getRow(4).values = [
      'Total Checks / 总核验数:', auditReport.totalChecks,
      'Passed / 合格:', auditReport.passedCount,
      'Warnings / 警告:', auditReport.warningCount,
      'Critical Failures / 严重缺陷:', auditReport.criticalCount,
    ];
    wsAudit.getRow(4).height = 20;

    // Table of Findings
    const auditHeaderRow = wsAudit.getRow(6);
    auditHeaderRow.values = ['Check ID', 'Category / 类别', 'Standard Rule / 检验条款', 'Status / 结果', 'Finding Details / 说明', 'Remediation / 整改建议'];
    auditHeaderRow.height = 26;
    for (let c = 1; c <= 6; c++) {
      const cell = auditHeaderRow.getCell(c);
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    auditReport.findings.forEach((finding, idx) => {
      const r = 7 + idx;
      const row = wsAudit.getRow(r);
      row.values = [
        finding.ruleId,
        finding.category,
        finding.title,
        finding.status.toUpperCase(),
        finding.message,
        finding.remediation || 'N/A',
      ];
      row.height = 22;
      row.font = { name: 'Arial', size: 9 };
      row.alignment = { vertical: 'middle' };

      const statusCell = row.getCell(4);
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
      statusCell.font = { name: 'Arial', size: 9, bold: true };
      if (finding.status === 'pass') {
        statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF15803D' } };
      } else if (finding.status === 'critical') {
        statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB91C1C' } };
      } else {
        statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFD97706' } };
      }
    });

    wsAudit.columns = [
      { width: 14 },
      { width: 18 },
      { width: 34 },
      { width: 14 },
      { width: 45 },
      { width: 45 },
    ];
  }

  // -------------------------------------------------------------
  // SHEET 3: Tooling Guide & Metrology Database (量检具推荐指南)
  // -------------------------------------------------------------
  const wsTools = workbook.addWorksheet('Tooling Guide 检具指南', {
    views: [{ showGridLines: true }],
  });

  wsTools.mergeCells('A1:E1');
  const toolTitle = wsTools.getCell('A1');
  toolTitle.value = 'METROLOGY EQUIPMENT & INSPECTION TOOLING STANDARD GUIDE / 推荐量检具规范';
  toolTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  toolTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  toolTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wsTools.getRow(1).height = 30;

  const toolHeaders = wsTools.getRow(3);
  toolHeaders.values = ['Code / 编号', 'Tool Name (English)', 'Tool Name (Chinese 中文)', 'Category / 分类', 'Measuring Accuracy / 精度指标'];
  toolHeaders.height = 24;
  for (let c = 1; c <= 5; c++) {
    const cell = toolHeaders.getCell(c);
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  const toolsToExport = customTools && customTools.length > 0
    ? [...INSPECTION_TOOLS_DATABASE, ...customTools]
    : INSPECTION_TOOLS_DATABASE;

  toolsToExport.forEach((tool, idx) => {
    const r = 4 + idx;
    const row = wsTools.getRow(r);
    row.values = [tool.code, tool.nameEn, tool.nameZh, tool.category, tool.accuracyRange];
    row.height = 22;
    row.font = { name: 'Arial', size: 9 };
    row.alignment = { vertical: 'middle' };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  wsTools.columns = [
    { width: 14 },
    { width: 38 },
    { width: 32 },
    { width: 18 },
    { width: 22 },
  ];

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `${plan.partNumber || 'PART'}_REV_${plan.revision || 'A'}_Inspection_Control_Plan.xlsx`;
  saveAs(blob, filename);
}
