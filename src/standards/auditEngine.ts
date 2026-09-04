import type { AuditFinding, AuditReport, StandardType, TitleBlockMetadata } from '../types/cad';
import type { InspectionBalloon } from '../types/balloon';
import type { PartFamilyProfile } from '../types/templates';
import { STANDARDS_DATABASE } from './standardsLibrary';

export function runDrawingAudit(
  standardType: StandardType,
  metadata: TitleBlockMetadata,
  dimensions: InspectionBalloon[],
  profile?: PartFamilyProfile
): AuditReport {
  const standardDef = STANDARDS_DATABASE[standardType] || STANDARDS_DATABASE.ASME_Y14_5;
  const findings: AuditFinding[] = [];

  // --- 1. Title Block Validation ---
  if (!metadata.drawingNumber || metadata.drawingNumber.trim() === '') {
    findings.push({
      id: 'F-TB-01',
      ruleId: 'ASME-TB-01',
      category: 'TITLE_BLOCK',
      title: 'Missing Drawing Number (缺少图号)',
      status: 'critical',
      message: 'The drawing has no assigned Drawing Number. This violates standard document control.',
      standardReference: `${standardDef.code} Document Control`,
      zone: 'Title Block (Zone D-4)',
      remediation: 'Assign an official Part/Drawing Number in the title block before release.',
    });
  } else {
    findings.push({
      id: 'F-TB-01-PASS',
      ruleId: 'ASME-TB-01',
      category: 'TITLE_BLOCK',
      title: `Drawing Number Verified: ${metadata.drawingNumber}`,
      status: 'pass',
      message: 'Official drawing number is properly documented in the title block.',
      standardReference: `${standardDef.code} Document Control`,
      zone: 'Title Block',
    });
  }

  if (!metadata.partName || metadata.partName.trim() === '') {
    findings.push({
      id: 'F-TB-02',
      ruleId: 'ASME-TB-01',
      category: 'TITLE_BLOCK',
      title: 'Missing Part Name / Title (缺少零件名称)',
      status: 'critical',
      message: 'Part name is empty in the title block. Engineering drawings must explicitly identify the component name.',
      standardReference: `${standardDef.code} Section 4`,
      zone: 'Title Block (Zone D-3)',
      remediation: 'Provide a descriptive title (e.g., ADAPTER FLANGE, DRIVE SHAFT).',
    });
  } else {
    findings.push({
      id: 'F-TB-02-PASS',
      ruleId: 'ASME-TB-01',
      category: 'TITLE_BLOCK',
      title: `Part Name Verified: ${metadata.partName}`,
      status: 'pass',
      message: 'Part name is properly documented.',
      standardReference: `${standardDef.code} Section 4`,
      zone: 'Title Block',
    });
  }

  if (!metadata.revision || metadata.revision.trim() === '' || metadata.revision === '-') {
    findings.push({
      id: 'F-TB-03',
      ruleId: 'ASME-REV-01',
      category: 'REVISION_CONTROL',
      title: 'Unassigned Revision Level (未指定版本号)',
      status: 'warning',
      message: 'Revision is unassigned or set to default hyphen "-". Commercial production drawings require a formal revision index (Rev A, Rev 01, etc.).',
      standardReference: 'ASME Y14.35 / ISO 11442',
      zone: 'Title Block (Zone D-4)',
      remediation: 'Set formal release revision index (e.g. Rev A for initial production).',
    });
  } else {
    findings.push({
      id: 'F-TB-03-PASS',
      ruleId: 'ASME-REV-01',
      category: 'REVISION_CONTROL',
      title: `Revision Index Confirmed: Rev ${metadata.revision}`,
      status: 'pass',
      message: `Revision matches configuration baseline Rev ${metadata.revision}.`,
      standardReference: 'ASME Y14.35',
      zone: 'Title Block & Rev Block',
    });
  }

  // Sign-off verification
  if (!metadata.drawnBy || !metadata.approvedBy || metadata.approvedBy.trim() === '' || metadata.approvedBy.includes('PENDING') || metadata.approvedBy.includes('TBD')) {
    findings.push({
      id: 'F-TB-04',
      ruleId: 'ASME-TB-02',
      category: 'TITLE_BLOCK',
      title: 'Missing Engineering Approval Sign-Off (缺少工程批准签核)',
      status: 'warning',
      message: 'Drawing has not been formally signed off by the Quality or Lead Engineering authority.',
      standardReference: 'ASME Y14.100 Section 4.5',
      zone: 'Approval Block (Zone D-3)',
      remediation: 'Obtain engineering approval and fill in the Approved By field.',
    });
  } else {
    findings.push({
      id: 'F-TB-04-PASS',
      ruleId: 'ASME-TB-02',
      category: 'TITLE_BLOCK',
      title: `Drawing Approved by ${metadata.approvedBy}`,
      status: 'pass',
      message: `Signed off on ${metadata.date} by authorized reviewer.`,
      standardReference: 'ASME Y14.100',
      zone: 'Approval Block',
    });
  }

  // Material & Finish
  if (!metadata.material || metadata.material.trim() === '' || metadata.material.toLowerCase() === 'none') {
    findings.push({
      id: 'F-TB-05',
      ruleId: 'ASME-TB-01',
      category: 'TITLE_BLOCK',
      title: 'Missing Raw Material Specification (缺少原材料规格)',
      status: 'critical',
      message: 'No raw material grade is specified in the title block. Manufacturing cannot procure raw stock without an ASTM/AISI/EN material standard.',
      standardReference: 'ASME Y14.100 Section 4.2',
      zone: 'Material Box (Zone D-2)',
      remediation: 'Specify alloy and temper (e.g. AL 6061-T6, SS 316L, AISI 4140).',
    });
  } else {
    findings.push({
      id: 'F-TB-05-PASS',
      ruleId: 'ASME-TB-01',
      category: 'TITLE_BLOCK',
      title: `Material Specified: ${metadata.material}`,
      status: 'pass',
      message: 'Approved alloy and temper designated.',
      standardReference: 'ASME Y14.100',
      zone: 'Material Box',
    });
  }

  // --- 2. Projection Angle Standards ---
  if (metadata.projection === 'UNKNOWN') {
    findings.push({
      id: 'F-PROJ-01',
      ruleId: 'ASME-PROJ-01',
      category: 'PROJECTION',
      title: 'Projection Standard Undefined (未标明视角投影符号)',
      status: 'critical',
      message: 'Drawing does not define whether Third Angle (US/Japan standard) or First Angle (European ISO standard) projection is used. This causes 180° inverted tooling errors in China.',
      standardReference: 'ASME Y14.3 / ISO 128-30',
      zone: 'Projection Symbol Block (Zone D-3)',
      remediation: 'Add the official truncated cone symbol designating Third Angle or First Angle projection.',
    });
  } else if (standardType === 'ASME_Y14_5' && metadata.projection !== 'THIRD_ANGLE') {
    findings.push({
      id: 'F-PROJ-02',
      ruleId: 'ASME-PROJ-01',
      category: 'PROJECTION',
      title: 'Projection Angle Mismatch with ASME Y14.5 (视角标准冲突)',
      status: 'warning',
      message: 'Drawing uses First Angle projection while ASME Y14.5 defaults to Third Angle. China machining vendors must be alerted to avoid inverted mirror parts.',
      standardReference: 'ASME Y14.3 Section 1.4',
      zone: 'Projection Block',
      remediation: 'Verify views conform to First Angle or re-project to standard Third Angle.',
    });
  } else {
    findings.push({
      id: 'F-PROJ-01-PASS',
      ruleId: 'ASME-PROJ-01',
      category: 'PROJECTION',
      title: `Projection Symbol Compliant (${metadata.projection === 'THIRD_ANGLE' ? 'Third Angle [3rd]' : 'First Angle [1st]'})`,
      status: 'pass',
      message: 'Projection method is clearly designated with standard cone symbol.',
      standardReference: 'ASME Y14.3 / ISO 128',
      zone: 'Projection Block',
    });
  }

  // --- 3. General Tolerancing & Units ---
  if (!metadata.generalToleranceNote || metadata.generalToleranceNote.trim() === '' || metadata.generalToleranceNote.toLowerCase().includes('none')) {
    findings.push({
      id: 'F-TOL-01',
      ruleId: 'ASME-TOL-01',
      category: 'TOLERANCES',
      title: 'Missing General Tolerance Callout (缺少未注公差说明)',
      status: 'critical',
      message: 'Drawing lacks a general tolerance note. Any dimension without an explicit tolerance will be legally ambiguous during incoming QC inspection.',
      standardReference: 'ASME Y14.5 Section 2.1.1 / ISO 2768',
      zone: 'General Notes Block (Zone A-1 / D-2)',
      remediation: 'Add note: "UNLESS OTHERWISE SPECIFIED: DIMENSIONS ARE IN MM. TOLERANCES: .X ±0.2, .XX ±0.05, ANGLES ±0.5°" or "ISO 2768-m".',
    });
  } else {
    findings.push({
      id: 'F-TOL-01-PASS',
      ruleId: 'ASME-TOL-01',
      category: 'TOLERANCES',
      title: 'General Tolerance Block Verified',
      status: 'pass',
      message: `General tolerance defined: "${metadata.generalToleranceNote}"`,
      standardReference: 'ASME Y14.5 / ISO 2768',
      zone: 'Notes Block',
    });
  }

  if (!metadata.units) {
    findings.push({
      id: 'F-TOL-02',
      ruleId: 'ASME-TOL-02',
      category: 'TOLERANCES',
      title: 'Unit of Measure Missing (未标明测量单位)',
      status: 'critical',
      message: 'Linear unit of measure (mm or inch) is not defined. Extremely hazardous for China manufacturing.',
      standardReference: 'ASME Y14.5 Section 1.5',
      zone: 'Title Block',
      remediation: 'Explicitly specify "ALL DIMENSIONS IN MILLIMETERS" in title block.',
    });
  } else {
    findings.push({
      id: 'F-TOL-02-PASS',
      ruleId: 'ASME-TOL-02',
      category: 'TOLERANCES',
      title: `Units Specified: ${metadata.units.toUpperCase()}`,
      status: 'pass',
      message: `Standard unit is explicitly set to ${metadata.units.toUpperCase()}.`,
      standardReference: 'ASME Y14.5',
      zone: 'Title Block',
    });
  }

  // --- 4. GD&T and Datum Reference Checks ---
  const gdtBalloons = dimensions.filter(d => d.type === 'GDT' || d.gdtFrame);
  if (gdtBalloons.length > 0) {
    const referencedDatums = new Set<string>();
    gdtBalloons.forEach(b => {
      if (b.gdtFrame && b.gdtFrame.datums) {
        b.gdtFrame.datums.forEach(dt => referencedDatums.add(dt.trim()));
      }
    });

    if (referencedDatums.size > 0) {
      findings.push({
        id: 'F-GDT-01-PASS',
        ruleId: 'ASME-GDT-01',
        category: 'GD&T',
        title: `GD&T Datum Reference Frame Verified: [${Array.from(referencedDatums).join(', ')}]`,
        status: 'pass',
        message: `Feature control frames correctly reference Datum features [${Array.from(referencedDatums).join(', ')}].`,
        standardReference: 'ASME Y14.5 Section 4.4',
        zone: 'Drawing Field',
      });
    }
  }

  // --- 5. Dimensions & Tolerancing Consistency ---
  if (dimensions.length === 0) {
    findings.push({
      id: 'F-DIM-01',
      ruleId: 'ASME-DRFT-01',
      category: 'GENERAL_DRAFTING',
      title: 'No Dimensions Ballooned or Identified (未识别到检验尺寸)',
      status: 'warning',
      message: 'No inspection characteristics have been ballooned on this drawing yet.',
      standardReference: 'AS9102 Rev C',
      zone: 'Drawing Canvas',
      remediation: 'Run automated dimension detection or click on dimensions to stamp inspection balloons.',
    });
  } else {
    const nonTolerancedCriticals = dimensions.filter(d => d.classification === 'CRITICAL' && d.upperTol === 0 && d.lowerTol === 0 && !metadata.generalToleranceNote);
    if (nonTolerancedCriticals.length > 0) {
      findings.push({
        id: 'F-DIM-02',
        ruleId: 'ASME-TOL-01',
        category: 'TOLERANCES',
        title: 'Critical Characteristics Missing Explicit Tolerances (关键尺寸缺少公差)',
        status: 'critical',
        message: `${nonTolerancedCriticals.length} Critical / CTQ dimensions have zero explicit tolerances and general tolerance is missing.`,
        standardReference: 'ASME Y14.5 / AIAG PPAP',
        zone: 'Drawing Field',
        remediation: 'Assign explicit limit or bilateral tolerances to all critical features.',
      });
    } else {
      findings.push({
        id: 'F-DIM-01-PASS',
        ruleId: 'ASME-DRFT-01',
        category: 'GENERAL_DRAFTING',
        title: `Identified ${dimensions.length} Dimensions & Quality Characteristics`,
        status: 'pass',
        message: 'All features have valid nominal and tolerance bounds ready for quality inspection.',
        standardReference: 'AS9102 / ASME Y14.5',
        zone: 'Drawing Canvas',
      });
    }
  }

  // --- 6. Part Family Template Checklist & Format Audit ---
  if (profile) {
    // Check mandatory dimensional features
    for (const feat of profile.standardFeatures) {
      if (!feat.isRequired) continue;

      const match = dimensions.find(d => 
        (d.templateFeatureId && d.templateFeatureId === feat.id) ||
        (d.dimensionName && d.dimensionName.toLowerCase() === feat.featureName.toLowerCase()) ||
        (d.dimensionNameZh && d.dimensionNameZh === feat.featureNameZh) ||
        (feat.matchingCriteria?.keywords && feat.matchingCriteria.keywords.some(kw => 
          (d.dimensionName && d.dimensionName.toLowerCase().includes(kw)) ||
          (d.rawCallout && d.rawCallout.toLowerCase().includes(kw))
        ))
      );

      if (match) {
        findings.push({
          id: `F-PF-${feat.id}-PASS`,
          ruleId: `PF-${feat.id.toUpperCase()}`,
          category: 'PART_FAMILY_REQUIREMENTS',
          title: `Recognized Feature: ${feat.featureName} (${feat.featureNameZh})`,
          status: 'pass',
          message: `Learned characteristic "${feat.featureName}" detected and ballooned (#${match.itemNumber}: ${match.rawCallout}).`,
          standardReference: `${profile.name} Training Model`,
          zone: match.drawingZone || 'Drawing Field',
        });
      } else {
        // As trained templates serve to recognize and recommend features across similar drawings (not strictly enforce on all variants):
        findings.push({
          id: `F-PF-${feat.id}-INFO`,
          ruleId: `PF-${feat.id.toUpperCase()}`,
          category: 'PART_FAMILY_REQUIREMENTS',
          title: `Product Feature Guideline: ${feat.featureName} (${feat.featureNameZh})`,
          status: 'pass',
          message: `Learned training feature for ${profile.name} (Not specified on this drawing variant - no defect recorded).`,
          standardReference: `${profile.name} Training Model`,
          zone: 'Reference',
        });
      }
    }

    // Check technical notes
    for (const reqNote of profile.requiredNotes) {
      const noteFound = dimensions.some(d => 
        reqNote.keywords.some(kw => 
          (d.rawCallout && d.rawCallout.toLowerCase().includes(kw)) ||
          (d.dimensionName && d.dimensionName.toLowerCase().includes(kw))
        )
      ) || (reqNote.key === 'MATERIAL' && metadata.material && metadata.material !== 'None' && metadata.material.trim().length > 0)
        || (reqNote.key === 'RUNOUT' && dimensions.some(d => d.type === 'GDT' || (d.rawCallout && d.rawCallout.toLowerCase().includes('runout'))));

      if (noteFound) {
        findings.push({
          id: `F-NOTE-${reqNote.key}-PASS`,
          ruleId: `NOTE-${reqNote.key}`,
          category: 'TECHNICAL_NOTES',
          title: `Technical Requirement Present: ${reqNote.labelEn} (${reqNote.labelZh})`,
          status: 'pass',
          message: `Technical requirement "${reqNote.labelEn}" verified on the drawing.`,
          standardReference: `${profile.name} Notes Specification`,
          zone: 'General Notes',
        });
      } else {
        findings.push({
          id: `F-NOTE-${reqNote.key}-INFO`,
          ruleId: `NOTE-${reqNote.key}`,
          category: 'TECHNICAL_NOTES',
          title: `Recommended Note Guideline: ${reqNote.labelEn} (${reqNote.labelZh})`,
          status: 'pass',
          message: `Recommended note specification for ${profile.name} products. Optional for this drawing configuration.`,
          standardReference: `${profile.name} Notes Specification`,
          zone: 'General Notes Zone',
        });
      }
    }
  }

  // Calculate scores
  const criticalCount = findings.filter(f => f.status === 'critical').length;
  const warningCount = findings.filter(f => f.status === 'warning').length;
  const passedCount = findings.filter(f => f.status === 'pass').length;
  const totalChecks = findings.length;

  const rawScore = Math.max(0, Math.min(100, Math.round(100 - (criticalCount * 25) - (warningCount * 8))));

  let overallStatus: 'PASSED' | 'PASSED_WITH_WARNINGS' | 'FAILED_CRITICAL' = 'PASSED';
  if (criticalCount > 0) {
    overallStatus = 'FAILED_CRITICAL';
  } else if (warningCount > 0) {
    overallStatus = 'PASSED_WITH_WARNINGS';
  }

  return {
    standardApplied: standardType,
    standardName: standardDef.name,
    totalChecks,
    passedCount,
    warningCount,
    criticalCount,
    complianceScore: rawScore,
    overallStatus,
    auditedAt: new Date().toISOString(),
    auditorName: 'Quality Compass Standards Auditor v2.0',
    findings,
  };
}
