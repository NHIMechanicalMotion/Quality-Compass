import type { CharacteristicClassification, DimensionType } from '../types/balloon';
import type { ConformanceStatus, SampleMeasurement } from '../types/inspection';

export interface ParsedDimensionResult {
  nominal: number;
  upperTol: number;
  lowerTol: number;
  minLimit: number;
  maxLimit: number;
  type: DimensionType;
  classification: CharacteristicClassification;
  nameEn: string;
  nameZh: string;
  rawCallout: string;
  unit: 'mm' | 'inch';
  gdtFrame?: {
    symbol: string;
    symbolName: string;
    tolerance: string;
    datums: string[];
  };
}

export function parseDimensionString(text: string, defaultUnit: 'mm' | 'inch' = 'mm'): ParsedDimensionResult {
  const clean = text.trim();
  let type: DimensionType = 'LINEAR';
  let classification: CharacteristicClassification = 'MAJOR';
  let nominal = 0;
  let upperTol = 0.1;
  let lowerTol = -0.1;
  let nameEn = 'Linear Dimension';
  let nameZh = '线性尺寸';
  let gdtFrame: ParsedDimensionResult['gdtFrame'] | undefined;

  // 1. GD&T Feature Control Frame: [⌖ | Ø0.05Ⓜ | A | B | C]
  if (clean.includes('⌖') || clean.includes('⏥') || clean.includes('⟂') || clean.includes('↗') || clean.includes('//') || clean.includes('POSITION') || clean.includes('FLATNESS')) {
    type = 'GDT';
    classification = 'CRITICAL';
    let symbol = '⌖';
    let symbolName = 'True Position / 位置度';
    if (clean.includes('⏥') || clean.includes('FLAT')) { symbol = '⏥'; symbolName = 'Flatness / 平面度'; }
    if (clean.includes('⟂') || clean.includes('PERP')) { symbol = '⟂'; symbolName = 'Perpendicularity / 垂直度'; }
    if (clean.includes('//') || clean.includes('PARA')) { symbol = '//'; symbolName = 'Parallelism / 平行度'; }
    if (clean.includes('↗') || clean.includes('RUNOUT')) { symbol = '↗'; symbolName = 'Runout / 跳动度'; }

    nameEn = `GD&T ${symbolName.split('/')[0].trim()}`;
    nameZh = `形位公差 ${symbolName.split('/')[1]?.trim() || ''}`;
    nominal = 0;
    upperTol = 0.05;
    lowerTol = 0;

    gdtFrame = {
      symbol,
      symbolName,
      tolerance: 'Ø0.05Ⓜ',
      datums: ['A', 'B', 'C'],
    };

    return {
      nominal,
      upperTol,
      lowerTol,
      minLimit: 0,
      maxLimit: upperTol,
      type,
      classification,
      nameEn,
      nameZh,
      rawCallout: clean,
      unit: defaultUnit,
      gdtFrame,
    };
  }

  // 2. Surface Finish: Ra 1.6 or Ra 0.8
  if (clean.toLowerCase().includes('ra') || clean.toLowerCase().includes('rz')) {
    type = 'SURFACE_FINISH';
    classification = 'MAJOR';
    const numMatch = clean.match(/ra\s*([\d.]+)/i) || clean.match(/([\d.]+)/);
    const val = numMatch ? parseFloat(numMatch[1]) : 1.6;
    return {
      nominal: val,
      upperTol: 0,
      lowerTol: 0,
      minLimit: 0,
      maxLimit: val,
      type,
      classification,
      nameEn: `Surface Roughness Ra ${val} µm`,
      nameZh: `表面粗糙度 Ra ${val} µm`,
      rawCallout: clean,
      unit: defaultUnit,
    };
  }

  // 3. Threads: e.g. 4x M6x1.0 - 6H or M24x1.5
  if (clean.toUpperCase().includes('M') && /\bM\d+/i.test(clean)) {
    type = 'THREAD';
    classification = 'CRITICAL';
    const threadMatch = clean.match(/M(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?/i);
    const dia = threadMatch ? parseFloat(threadMatch[1]) : 6;
    const pitch = threadMatch && threadMatch[2] ? parseFloat(threadMatch[2]) : 1.0;
    return {
      nominal: dia,
      upperTol: 0.1,
      lowerTol: 0,
      minLimit: dia,
      maxLimit: dia + 0.1,
      type,
      classification,
      nameEn: `Metric Thread M${dia}x${pitch}`,
      nameZh: `公制螺纹 M${dia}x${pitch}`,
      rawCallout: clean,
      unit: defaultUnit,
    };
  }

  // 4. Chamfers: 2 x 45° or C1.5
  if (clean.includes('45°') || clean.includes('x 45') || clean.toUpperCase().startsWith('C')) {
    type = 'CHAMFER';
    classification = 'MINOR';
    const chamfMatch = clean.match(/([\d.]+)\s*(?:x\s*45|°)/i) || clean.match(/C\s*([\d.]+)/i);
    const val = chamfMatch ? parseFloat(chamfMatch[1]) : 1.0;
    return {
      nominal: val,
      upperTol: 0.2,
      lowerTol: -0.2,
      minLimit: Math.round((val - 0.2) * 1000) / 1000,
      maxLimit: Math.round((val + 0.2) * 1000) / 1000,
      type,
      classification,
      nameEn: `Chamfer ${val} x 45°`,
      nameZh: `倒角 ${val} x 45°`,
      rawCallout: clean,
      unit: defaultUnit,
    };
  }

  // 5. Radii: R 12.5 ±0.1
  if (clean.toUpperCase().startsWith('R') || clean.includes('R ') || clean.includes('RAD')) {
    type = 'RADIUS';
    classification = 'MINOR';
    const radMatch = clean.match(/R\s*([\d.]+)/i);
    const val = radMatch ? parseFloat(radMatch[1]) : 5.0;
    nameEn = `Radius R${val}`;
    nameZh = `圆角半径 R${val}`;
    nominal = val;
  }
  // 6. Diameters: Ø 120.00 or DIA 50
  else if (clean.includes('Ø') || clean.toLowerCase().includes('dia') || clean.includes('%%c')) {
    type = 'DIAMETER';
    classification = 'CRITICAL';
    const diaMatch = clean.match(/(?:Ø|DIA|%%c)\s*([\d.]+)/i);
    const val = diaMatch ? parseFloat(diaMatch[1]) : 25.0;
    nominal = val;
    nameEn = nominal > 50 ? `Major Diameter Ø${nominal}` : `Bore Diameter Ø${nominal}`;
    nameZh = nominal > 50 ? `大外径 Ø${nominal}` : `孔径 Ø${nominal}`;
  }
  // 7. General Linear
  else {
    const numMatch = clean.match(/([\d.]+)/);
    nominal = numMatch ? parseFloat(numMatch[1]) : 10.0;
    nameEn = `Linear Dimension ${nominal}`;
    nameZh = `线性尺寸 ${nominal}`;
  }

  // Extract tolerances
  const pmMatch = clean.match(/±\s*([\d.]+)/);
  if (pmMatch) {
    const t = parseFloat(pmMatch[1]);
    upperTol = t;
    lowerTol = -t;
  } else {
    const asymMatch = clean.match(/\+\s*([\d.]+)\s*\/\s*-\s*([\d.]+)/);
    if (asymMatch) {
      upperTol = parseFloat(asymMatch[1]);
      lowerTol = -parseFloat(asymMatch[2]);
    } else {
      upperTol = 0.05;
      lowerTol = -0.05;
    }
  }

  const minLimit = Math.round((nominal + lowerTol) * 10000) / 10000;
  const maxLimit = Math.round((nominal + upperTol) * 10000) / 10000;

  return {
    nominal,
    upperTol,
    lowerTol,
    minLimit,
    maxLimit,
    type,
    classification,
    nameEn,
    nameZh,
    rawCallout: clean,
    unit: defaultUnit,
    gdtFrame,
  };
}

export function evaluateMeasurements(
  measurements: SampleMeasurement,
  minLimit: number,
  maxLimit: number
): ConformanceStatus {
  const samples = [
    measurements.sample1,
    measurements.sample2,
    measurements.sample3,
    measurements.sample4,
    measurements.sample5,
  ].filter((v): v is number => v !== undefined && v !== null && !isNaN(v));

  if (samples.length === 0) {
    return 'PENDING';
  }

  const allWithinSpec = samples.every(s => s >= minLimit - 0.0001 && s <= maxLimit + 0.0001);
  return allWithinSpec ? 'PASS' : 'FAIL';
}
