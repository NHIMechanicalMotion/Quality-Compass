export type DimensionType = 
  | 'LINEAR'
  | 'DIAMETER'
  | 'RADIUS'
  | 'THREAD'
  | 'CHAMFER'
  | 'ANGLE'
  | 'GDT'
  | 'SURFACE_FINISH'
  | 'NOTE';

export type CharacteristicClassification = 
  | 'CRITICAL' // CTQ / Key Characteristic
  | 'MAJOR'
  | 'MINOR'
  | 'REFERENCE';

export interface InspectionBalloon {
  id: string;
  itemNumber: number; // 1, 2, 3...
  dimensionName: string; // e.g. "Main Flange OD", "Bore Diameter"
  dimensionNameZh: string; // "外法兰外径", "内孔直径"
  type: DimensionType;
  classification: CharacteristicClassification;
  
  // Nominal & Tolerances
  nominal: number;
  upperTol: number;
  lowerTol: number;
  minLimit: number;
  maxLimit: number;
  unit: 'mm' | 'inch';
  
  // Raw representation on drawing
  rawCallout: string; // e.g. "Ø 120.00 ±0.05"
  gdtFrame?: {
    symbol: string; // e.g. "⌖" (Position), "⏥" (Flatness)
    symbolName: string;
    tolerance: string; // "Ø0.05Ⓜ"
    datums: string[]; // ["A", "B", "C"]
  };
  
  // Placement on drawing canvas (normalized coordinates 0..1000 or absolute canvas units)
  x: number;
  y: number;
  leaderTargetX?: number;
  leaderTargetY?: number;
  
  // Zone / Sheet coordinate (e.g. "B-4", Sheet 1)
  sheet: number;
  drawingZone: string;
  
  // Visual customization
  balloonColor?: string;
  isSelected?: boolean;
  templateFeatureId?: string;
  isNoteLine?: boolean;
}
