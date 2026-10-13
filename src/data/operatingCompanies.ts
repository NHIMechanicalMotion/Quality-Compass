export type OperatingCompanyId = 'ALL' | 'NHI' | 'TERRE' | 'MANTIS' | 'MAKERS';

export interface OperatingCompany {
  id: OperatingCompanyId;
  name: string;
  shortCode: string;
  tagline: string;
  nature: string;
  isSubCompany: boolean;
  parentCompany?: string;
  subCompanyType?: string;
  primaryColor: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  facilityAddress: string;
  description: string;
  coreCapabilities: string[];
}

export const OPERATING_COMPANIES: Record<OperatingCompanyId, OperatingCompany> = {
  ALL: {
    id: 'ALL',
    name: 'NHI Mechanical Motion LLC',
    shortCode: 'NHIMM',
    tagline: 'Consolidated Enterprise Quality, APQP & Engineering Rollup',
    nature: 'Parent Enterprise',
    isSubCompany: false,
    primaryColor: '#0B2545',
    badgeBg: 'bg-[#0B2545]',
    badgeBorder: 'border-[#132E58]',
    textColor: 'text-blue-300',
    facilityAddress: '35 Connecticut Riverbend Place, Claremont NH 03743',
    description:
      'Executive parent entity consolidating quality engineering, PPAP submissions, operational risk, and APQP launch targets across all four operating companies (NHI, Terre Products, Mantis Conveyor Products, and Makers Automation).',
    coreCapabilities: [
      'Automotive & Heavy Industry APQP / PPAP Governance',
      'Unified Quality Management System (Quality Compass)',
      'Enterprise Resource Planning (Odoo / Epicor ERP Sync)',
      'Precision Machining, Broaching & Robotic Automation',
      'Dual Facility Production, Tooling & Lab Certification',
    ],
  },
  NHI: {
    id: 'NHI',
    name: 'NHI',
    shortCode: 'NHI',
    tagline: 'Precision Mechanical Motion, Machined Hubs, Pulleys & Tensioners',
    nature: 'Products',
    isSubCompany: true,
    parentCompany: 'NHI Mechanical Motion LLC',
    subCompanyType: 'Operating Sub-Company (Products)',
    primaryColor: '#70c128',
    badgeBg: 'bg-lime-950/80',
    badgeBorder: 'border-lime-500',
    textColor: 'text-lime-300',
    facilityAddress: '35 Connecticut Riverbend Place, Claremont NH 03743',
    description:
      'High-precision mechanical motion manufacturing operating company of NHI Mechanical Motion LLC, producing high-torque pulley assemblies, ductile iron hub machining, and induction-hardened spline drive shafts.',
    coreCapabilities: [
      'Multi-Axis CNC Lathe & Turning Center Boring',
      'Precision Spindle Hub & Shaft Broaching',
      'Automated Idler & Drive Pulley Assembly Lines',
      '100% In-Process Gauging & CMM Dimensional Runout Verification',
      'OEM Long-Term Agreements & Direct Kanbans',
    ],
  },
  TERRE: {
    id: 'TERRE',
    name: 'Terre Products',
    shortCode: 'TERRE',
    tagline: 'Heavy-Duty Power Transmission, Castings & Driveline Components',
    nature: 'Products',
    isSubCompany: true,
    parentCompany: 'NHI Mechanical Motion LLC',
    subCompanyType: 'Operating Sub-Company (Products)',
    primaryColor: '#5c6f5a',
    badgeBg: 'bg-emerald-950/70',
    badgeBorder: 'border-emerald-600/70',
    textColor: 'text-emerald-200',
    facilityAddress: '35 Connecticut Riverbend Place, Claremont NH 03743',
    description:
      'Specialized power transmission operating company of NHI Mechanical Motion LLC, delivering rugged agricultural drivetrain hubs, cast sprockets, and heavy equipment motion components engineered for severe-duty environments.',
    coreCapabilities: [
      'Heavy-Duty Agricultural & Turf Drive Pulleys',
      'Ductile & Gray Iron Casting Machining & Finishing',
      'High-Torque Splined Hub & Keyway Power Transfer Systems',
      'Case Hardening & High-Capacity Bearing Retention Cells',
      'Aftermarket & OEM Fast-Turn Order Distribution',
    ],
  },
  MANTIS: {
    id: 'MANTIS',
    name: 'Mantis Conveyor Products',
    shortCode: 'MANTIS',
    tagline: 'Engineered Conveyor Components, Precision Rollers, Idlers & Belt Pulleys',
    nature: 'Products',
    isSubCompany: true,
    parentCompany: 'NHI Mechanical Motion LLC',
    subCompanyType: 'Operating Sub-Company (Products)',
    primaryColor: '#81C341',
    badgeBg: 'bg-green-950/80',
    badgeBorder: 'border-[#81C341]',
    textColor: 'text-[#81C341]',
    facilityAddress: '35 Connecticut Riverbend Place, Claremont NH 03743',
    description:
      'Engineered conveyor components operating company of NHI Mechanical Motion LLC, manufacturing industrial-grade conveyor pulleys, heavy-duty troughing idlers, and precision motorized rollers.',
    coreCapabilities: [
      'Heavy-Duty Drum & Wing Conveyor Pulleys',
      'Precision Vulcanized Rubber & Ceramic Lagging Application',
      'Automated Conveyor Roller Swaging & Bearing Pressing',
      'Dynamic Balancing & High-Speed TIR Runout Testing',
      'Continuous Bulk Material Handling Motion Systems',
    ],
  },
  MAKERS: {
    id: 'MAKERS',
    name: 'Makers Automation',
    shortCode: 'MAKERS',
    tagline: 'Turnkey Robotic Cells, Custom Industrial Automation & Controls Engineering',
    nature: 'Products & Services',
    isSubCompany: true,
    parentCompany: 'NHI Mechanical Motion LLC',
    subCompanyType: 'Operating Sub-Company (Automation & Systems)',
    primaryColor: '#ea580c',
    badgeBg: 'bg-orange-950/80',
    badgeBorder: 'border-orange-500',
    textColor: 'text-orange-300',
    facilityAddress: '35 Connecticut Riverbend Place, Claremont NH 03743',
    description:
      'Custom industrial automation and robotics operating company of NHI Mechanical Motion LLC, designing turnkey robotic machine-tending cells, automated vision inspection fixtures, and PLC controls.',
    coreCapabilities: [
      'Turnkey 6-Axis Fanuc / ABB Robotic Machine Tending Cells',
      'Custom Poka-Yoke Automated Inspection Fixturing',
      'High-Speed Vision Guidance & Keyence Laser Profilometry',
      'Allen-Bradley PLC Programming & SCADA Integration',
      'Autonomous Mobile Robot (AMR) Material Handling Integration',
    ],
  },
};

/**
 * Match a raw company name, company ID, or department string against an OperatingCompanyId.
 */
export function matchOperatingCompany(companyValue?: string | number | null, selectedCompany?: OperatingCompanyId): boolean {
  if (!selectedCompany || selectedCompany === 'ALL') return true;
  if (!companyValue) {
    // If unspecified, NHI is the primary manufacturing company
    return selectedCompany === 'NHI';
  }
  const str = String(companyValue).toLowerCase().trim();
  switch (selectedCompany) {
    case 'NHI':
      return str.includes('nhi') || str.includes('industries') || str.includes('mechanical') || str === 'nhi';
    case 'TERRE':
      return str.includes('terre');
    case 'MANTIS':
      return str.includes('mantis');
    case 'MAKERS':
      return str.includes('maker') || str.includes('automation');
    default:
      return true;
  }
}

/**
 * Accurately match any QMS or Odoo record to an OperatingCompanyId.
 * Checks explicit company_name, metadata comments in notes, and NHIMM product naming taxonomy.
 */
export function matchRecordOperatingCompany(
  record: {
    company_name?: string | null;
    product_name?: string | null;
    product_sku?: string | null;
    customer_name?: string | null;
    notes?: string | null;
  },
  selectedCompany: OperatingCompanyId
): boolean {
  if (selectedCompany === 'ALL') return true;

  // 1. Direct company_name match
  if (record.company_name) {
    return matchOperatingCompany(record.company_name, selectedCompany);
  }

  // 2. Embedded metadata in notes (e.g. <!-- meta:{"company":"..."} -->)
  if (record.notes && record.notes.includes('<!-- meta:')) {
    const metaMatch = record.notes.match(/<!-- meta:.*?"company"\s*:\s*"([^"]+)".*?-->/);
    if (metaMatch && metaMatch[1]) {
      return matchOperatingCompany(metaMatch[1], selectedCompany);
    }
  }

  // 3. Fallback inference based on product naming, SKU conventions & customer patterns
  const text = `${record.product_sku || ''} ${record.product_name || ''} ${record.customer_name || ''}`.toLowerCase();

  const isTerre = text.includes('terre') || text.includes('sprocket') || text.includes('v-groove') || /35\d{6}/.test(text);
  const isMakers = text.includes('maker') || text.includes('automation') || /\bam\d+/.test(text) || text.includes('fixture') || text.includes('robot');
  const isMantis = text.includes('mantis') || text.includes('conveyor') || text.includes('lagging') || text.includes('wing pulley');

  if (selectedCompany === 'TERRE') return isTerre;
  if (selectedCompany === 'MAKERS') return isMakers;
  if (selectedCompany === 'MANTIS') return isMantis;
  if (selectedCompany === 'NHI') return !isTerre && !isMakers && !isMantis;

  return true;
}
