import type { DimensionType } from '../types/balloon';
import type { InspectionMethodTool } from '../types/inspection';

export const INSPECTION_TOOLS_DATABASE: InspectionMethodTool[] = [
  {
    id: 'CMM',
    code: 'CMM-01',
    nameEn: 'Coordinate Measuring Machine (CMM)',
    nameZh: '三坐标测量机 (CMM)',
    category: 'GEOMETRIC',
    accuracyRange: '±0.0015 mm',
  },
  {
    id: 'MICROMETER_OUTSIDE',
    code: 'MIC-OUT',
    nameEn: 'Outside Micrometer (0-25 / 25-50mm)',
    nameZh: '外径千分尺 (0-25 / 25-50mm)',
    category: 'DIMENSIONAL',
    accuracyRange: '±0.002 mm',
  },
  {
    id: 'MICROMETER_INSIDE',
    code: 'MIC-IN',
    nameEn: 'Inside Micrometer / Bore Gauge',
    nameZh: '内径千分尺 / 内径百分表',
    category: 'DIMENSIONAL',
    accuracyRange: '±0.003 mm',
  },
  {
    id: 'CALIPER_DIGITAL',
    code: 'CAL-01',
    nameEn: 'Digital Vernier Caliper (0-150 / 0-200mm)',
    nameZh: '数显游标卡尺 (0-150 / 0-200mm)',
    category: 'DIMENSIONAL',
    accuracyRange: '±0.02 mm',
  },
  {
    id: 'HEIGHT_GAUGE',
    code: 'HG-01',
    nameEn: 'Digital Height Gauge & Granitic Plate',
    nameZh: '数显高度规与大理石平台',
    category: 'DIMENSIONAL',
    accuracyRange: '±0.01 mm',
  },
  {
    id: 'PIN_GAUGE',
    code: 'PG-SET',
    nameEn: 'Precision Pin Gauge Set (Go / No-Go)',
    nameZh: '精密针规 / 塞规 (通止检具)',
    category: 'ATTRIBUTE',
    accuracyRange: '±0.001 mm',
  },
  {
    id: 'THREAD_GAUGE_PLUG',
    code: 'TG-PLUG',
    nameEn: 'Thread Plug Gauge (6H / 2B Go/No-Go)',
    nameZh: '螺纹塞规 (通端/止端 6H/2B)',
    category: 'ATTRIBUTE',
    accuracyRange: 'Class 6H / 2B',
  },
  {
    id: 'THREAD_GAUGE_RING',
    code: 'TG-RING',
    nameEn: 'Thread Ring Gauge (6g / 2A Go/No-Go)',
    nameZh: '螺纹环规 (通端/止端 6g/2A)',
    category: 'ATTRIBUTE',
    accuracyRange: 'Class 6g / 2A',
  },
  {
    id: 'OPTICAL_COMPARATOR',
    code: 'VMM-01',
    nameEn: 'Optical Comparator / 2.5D Vision System',
    nameZh: '光学投影仪 / 二次元影像仪',
    category: 'GEOMETRIC',
    accuracyRange: '±0.003 mm',
  },
  {
    id: 'RADIUS_GAUGE',
    code: 'RG-SET',
    nameEn: 'Radius Gauge Leaf Set',
    nameZh: '圆角样板 / R规组',
    category: 'ATTRIBUTE',
    accuracyRange: '±0.05 mm',
  },
  {
    id: 'ROUGHNESS_TESTER',
    code: 'SRT-01',
    nameEn: 'Stylus Surface Roughness Tester (Ra / Rz)',
    nameZh: '接触式表面粗糙度仪 (Ra / Rz)',
    category: 'SURFACE',
    accuracyRange: '0.01 µm',
  },
  {
    id: 'HARDNESS_TESTER',
    code: 'HT-01',
    nameEn: 'Rockwell / Vickers Hardness Tester',
    nameZh: '洛氏 / 维氏硬度计',
    category: 'MECHANICAL',
    accuracyRange: '±1.0 HRC',
  },
  {
    id: 'DIAL_INDICATOR',
    code: 'IND-01',
    nameEn: 'Dial Indicator & V-Blocks / Runout Gage',
    nameZh: '杠杆百分表 / 偏摆仪 (跳动度检具)',
    category: 'GEOMETRIC',
    accuracyRange: '±0.001 mm / .0001 in',
  },
  {
    id: 'MATERIAL_CERT',
    code: 'MTR-01',
    nameEn: 'Material Mill Test Report (MTR) / XRF Analyzer',
    nameZh: '材料质保书 (MTR) / 手持光谱仪 (材质验证)',
    category: 'MECHANICAL',
    accuracyRange: 'Chemistry & Mechanical Conformance',
  },
  {
    id: 'VISUAL_INSPECTION',
    code: 'VIS-01',
    nameEn: 'Visual & Drawing Specification Audit (10x Loupe)',
    nameZh: '目视与图纸规范核对 (10倍放大镜/目测)',
    category: 'ATTRIBUTE',
    accuracyRange: 'Drawing & Workmanship Standard',
  },
];

export function recommendInspectionTool(
  type: DimensionType,
  nominal: number,
  toleranceBand: number,
  rawCallout: string
): InspectionMethodTool {
  const calloutLower = rawCallout.toLowerCase();

  // 0. Material, General Notes & Specifications
  if (type === 'NOTE') {
    if (calloutLower.includes('material') || calloutLower.includes('alloy') || calloutLower.includes('steel') || calloutLower.includes('aluminum') || calloutLower.includes('6061') || calloutLower.includes('ss304')) {
      return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'MATERIAL_CERT')!;
    }
    return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'VISUAL_INSPECTION')!;
  }

  // 1. Thread checking
  if (type === 'THREAD' || (calloutLower.includes('m') && calloutLower.includes('x')) || calloutLower.includes('unc') || calloutLower.includes('unf') || calloutLower.includes('tap')) {
    if (calloutLower.includes('internal') || calloutLower.includes('hole') || calloutLower.includes('th') || calloutLower.includes('6h') || calloutLower.includes('2b')) {
      return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'THREAD_GAUGE_PLUG')!;
    }
    return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'THREAD_GAUGE_RING')!;
  }

  // 2. Surface Roughness
  if (type === 'SURFACE_FINISH' || calloutLower.includes('ra') || calloutLower.includes('rz') || calloutLower.includes('roughness')) {
    return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'ROUGHNESS_TESTER')!;
  }

  // 2.5 Runout GD&T (Radial Runout, Axial Runout)
  if (calloutLower.includes('runout') || calloutLower.includes('radial runout') || calloutLower.includes('axial runout')) {
    return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'DIAL_INDICATOR')!;
  }

  // 3. GD&T Features (True position, profile, perpendicularity)
  if (type === 'GDT' || calloutLower.includes('⌖') || calloutLower.includes('⏥') || calloutLower.includes('⟂') || calloutLower.includes('↗') || calloutLower.includes('datum')) {
    return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'CMM')!;
  }

  // 4. Chamfers & Angles
  if (type === 'CHAMFER' || type === 'ANGLE' || calloutLower.includes('°') || calloutLower.includes('x45') || calloutLower.includes('c1') || calloutLower.includes('c2')) {
    return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'OPTICAL_COMPARATOR')!;
  }

  // 5. Radii
  if (type === 'RADIUS' || calloutLower.startsWith('r')) {
    if (toleranceBand <= 0.05) {
      return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'OPTICAL_COMPARATOR')!;
    }
    return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'RADIUS_GAUGE')!;
  }

  // 6. Internal Diameter / Holes
  if (type === 'DIAMETER' && (calloutLower.includes('hole') || calloutLower.includes('bore') || calloutLower.includes('thru') || calloutLower.includes('id'))) {
    if (nominal <= 25 && toleranceBand >= 0.01) {
      return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'PIN_GAUGE')!;
    }
    if (toleranceBand < 0.015) {
      return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'MICROMETER_INSIDE')!;
    }
  }

  // 7. High-Precision external dimensions (Tight tolerance < 0.02 mm)
  if (toleranceBand < 0.02 && toleranceBand > 0) {
    if (type === 'DIAMETER') {
      return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'MICROMETER_OUTSIDE')!;
    }
    return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'CMM')!;
  }

  // 8. Height / Step dimensions
  if (calloutLower.includes('height') || calloutLower.includes('step') || calloutLower.includes('depth')) {
    return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'HEIGHT_GAUGE')!;
  }

  // 9. Standard Diameters
  if (type === 'DIAMETER') {
    if (toleranceBand <= 0.03) {
      return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'MICROMETER_OUTSIDE')!;
    }
    return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'CALIPER_DIGITAL')!;
  }

  // 10. Default General Linear Dimension
  return INSPECTION_TOOLS_DATABASE.find(t => t.id === 'CALIPER_DIGITAL')!;
}
