import type { DimensionType, CharacteristicClassification } from './balloon';

export interface PartFamilyFeatureRule {
  id: string;
  featureName: string; // e.g. "Pulley Width", "Outside Diameter"
  featureNameZh: string; // e.g. "皮带轮总宽", "外径"
  dimensionType: DimensionType;
  classification: CharacteristicClassification;
  isRequired: boolean; // Minimum mandatory requirement for standard formatting
  description: string;
  descriptionZh: string;
  // Matching heuristics
  matchingCriteria?: {
    keywords?: string[]; // e.g. ['width', 'overall', 'face']
    calloutPattern?: RegExp;
    nominalRange?: [number, number]; // e.g. [0.5, 6.0]
    isDiameter?: boolean;
    isAngle?: boolean;
    hasLimits?: boolean;
    isRunout?: boolean;
    isNote?: boolean;
    expectedLocationHint?: 'TOP' | 'BOTTOM' | 'CENTER' | 'RIGHT' | 'LEFT' | 'ANY';
  };
}

export interface PartFamilyProfile {
  id: string; // e.g. "profile-single-pulley"
  name: string; // "Single Pulley (V-Belt & Idler Pulleys)"
  nameZh: string; // "单皮带轮 (V型带/惰轮规范)"
  category: 'PULLEY' | 'SHAFT' | 'FLANGE' | 'GENERIC';
  description: string;
  descriptionZh: string;
  standardFeatures: PartFamilyFeatureRule[];
  requiredNotes: {
    key: string;
    labelEn: string;
    labelZh: string;
    keywords: string[];
    isRequired: boolean;
  }[];
}

export interface DetectedNoteLine {
  id: string;
  noteNumber?: number; // 1, 2, 3...
  rawText: string;
  cleanText: string;
  cleanTextZh?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  classification: CharacteristicClassification;
  isRunout: boolean;
  isMaterial: boolean;
  isFinish: boolean;
  isStamping: boolean;
  selected: boolean;
}

export interface TemplateAuditCheckResult {
  ruleId: string;
  featureName: string;
  featureNameZh: string;
  isRequired: boolean;
  status: 'PASS' | 'MISSING' | 'WARNING';
  matchedCallout?: string;
  messageEn: string;
  messageZh: string;
}
