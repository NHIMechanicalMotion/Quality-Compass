import type { PartFamilyProfile, PartFamilyFeatureRule } from '../types/templates';
import { SINGLE_PULLEY_PROFILE, STEPPED_SHAFT_PROFILE, TURNED_FLANGE_PROFILE, GENERIC_CAD_PROFILE } from '../data/partFamilyTemplates';

/**
 * Splined Pulley Assembly Profile
 * Built for heavy-duty pulleys with internal involute splines, bolt circles, and hub stock
 * (e.g. NHI SDV-100-4L-25)
 */
export const SPLINED_PULLEY_PROFILE: PartFamilyProfile = {
  id: 'profile-splined-pulley',
  name: 'Splined Pulley Assembly (Involute Spline & Hub)',
  nameZh: '花键皮带轮总成 (渐开线花键与轮毂)',
  category: 'PULLEY',
  description: 'Dimensional and technical specifications for heavy-duty V-belt pulley assemblies with internal involute splined hubs and bolt circles.',
  descriptionZh: '适用于重载带内渐开线花键孔、安装螺栓圆(B.C.)及轮毂组件的皮带轮总成标准图纸规范。',
  standardFeatures: [
    {
      id: 'PULLEY_WIDTH',
      featureName: 'Overall Assembly Width',
      featureNameZh: '总成总轴向宽度',
      dimensionType: 'LINEAR',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Overall axial width across front hub face and rear rim face (e.g. 1.513 ±.030).',
      descriptionZh: '前端轮毂面至后端轮缘面之间的整体装配总宽度。',
      matchingCriteria: {
        keywords: ['width', 'overall', 'face', 'total width', 'assembly width'],
        nominalRange: [0.8, 6.0],
        isDiameter: false,
        isAngle: false,
        expectedLocationHint: 'BOTTOM',
      },
    },
    {
      id: 'PULLEY_ANGLE',
      featureName: 'Pulley Groove Angle',
      featureNameZh: '皮带槽夹角 (38° / 32°)',
      dimensionType: 'CHAMFER',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Included angle of the V-groove flanks (typically 38° for heavy-duty, or 32°/34°/36°).',
      descriptionZh: '皮带槽两侧壁之间的包含夹角 (如 38° 或 32°/34°)。',
      matchingCriteria: {
        keywords: ['angle', 'deg', '°', 'groove angle', '38°', '32°'],
        isAngle: true,
        nominalRange: [25, 55],
        expectedLocationHint: 'BOTTOM',
      },
    },
    {
      id: 'OVER_PIN_DIMENSION',
      featureName: 'Over Pin Dimension',
      featureNameZh: '跨销测量外径 (Over Pin)',
      dimensionType: 'DIAMETER',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Gage pin contact diameter across V-groove with radial runout tolerance (e.g. Ø 6.603 / 6.553).',
      descriptionZh: '置入标准量棒后测得的跨销直径，通常带圆跳动公差。',
      matchingCriteria: {
        keywords: ['over pin', 'pin', 'ball', 'pitch dia'],
        nominalRange: [2.0, 18.0],
        isDiameter: true,
        hasLimits: true,
        expectedLocationHint: 'RIGHT',
      },
    },
    {
      id: 'OUTSIDE_DIAMETER',
      featureName: 'Outside Diameter (Flange OD)',
      featureNameZh: '轮缘外径 (Flange OD)',
      dimensionType: 'DIAMETER',
      classification: 'MAJOR',
      isRequired: true,
      description: 'Major diameter across the outer pulley rim flanges (e.g. 6.25 / 6.19).',
      descriptionZh: '外侧轮缘的最大外径尺寸。',
      matchingCriteria: {
        keywords: ['od', 'outside', 'dia', 'diameter', 'outer', 'flange od'],
        nominalRange: [2.0, 18.0],
        isDiameter: true,
        hasLimits: true,
        expectedLocationHint: 'LEFT',
      },
    },
    {
      id: 'BLANK_BORE',
      featureName: 'Blank Bore Diameter',
      featureNameZh: '内孔毛坯/精加工直径',
      dimensionType: 'DIAMETER',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Precision inner blank bore diameter (e.g. Ø 2.127 / 2.125).',
      descriptionZh: '精密内孔加工直径，用于轴承配合或过渡。',
      matchingCriteria: {
        keywords: ['blank bore', 'bore', 'inner bore', 'blank'],
        nominalRange: [0.5, 5.0],
        isDiameter: true,
        hasLimits: true,
        expectedLocationHint: 'RIGHT',
      },
    },
    {
      id: 'COUNTERBORE_DIA',
      featureName: 'Counterbore / Step Diameter',
      featureNameZh: '沉孔/退刀台阶内径',
      dimensionType: 'DIAMETER',
      classification: 'MAJOR',
      isRequired: false,
      description: 'Secondary counterbore or inner step diameter (e.g. Ø 1.75).',
      descriptionZh: '次级沉孔或阶梯内径。',
      matchingCriteria: {
        keywords: ['counterbore', 'step dia', 'recess'],
        nominalRange: [0.5, 5.0],
        isDiameter: true,
        expectedLocationHint: 'RIGHT',
      },
    },
    {
      id: 'HUB_STOCK_DIA',
      featureName: 'Hub Stock Diameter',
      featureNameZh: '轮毂毛坯外径 (Stock Dia)',
      dimensionType: 'DIAMETER',
      classification: 'MAJOR',
      isRequired: false,
      description: 'Outer diameter of the center hub stock material (e.g. Ø 2.50 STOCK).',
      descriptionZh: '中心轮毂的毛坯料外径。',
      matchingCriteria: {
        keywords: ['stock', 'hub', 'stock dia', 'hub od'],
        nominalRange: [1.0, 8.0],
        isDiameter: true,
        expectedLocationHint: 'LEFT',
      },
    },
    {
      id: 'BOLT_CIRCLE_HOLES',
      featureName: 'Bolt Circle Mounting Holes',
      featureNameZh: '节圆安装孔阵 (B.C. Holes)',
      dimensionType: 'DIAMETER',
      classification: 'MAJOR',
      isRequired: false,
      description: 'Pattern of equally spaced mounting holes on a bolt circle (e.g. 3x Ø .313 EQ. SP. ON Ø 3.50 B.C.).',
      descriptionZh: '分度节圆上的等分安装孔阵。',
      matchingCriteria: {
        keywords: ['b.c.', 'bolt circle', 'eq. sp.', 'eq sp', 'mounting holes'],
        expectedLocationHint: 'TOP',
      },
    },
    {
      id: 'GAGE_PIN_DIA',
      featureName: 'Gage Pin Reference Diameter',
      featureNameZh: '标准量棒参考直径',
      dimensionType: 'DIAMETER',
      classification: 'REFERENCE',
      isRequired: false,
      description: 'Diameter of the gage pin used for pitch diameter inspection (e.g. Ø .4375 or Ø .5625).',
      descriptionZh: '用于跨销测量检测的标准量棒直径。',
      matchingCriteria: {
        keywords: ['pin dia', 'pin', 'gage pin'],
        nominalRange: [0.2, 1.0],
        isDiameter: true,
        expectedLocationHint: 'TOP',
      },
    },
  ],
  requiredNotes: [
    {
      key: 'RUNOUT',
      labelEn: 'Runout Specification (e.g. ES-2 or 0.015 MAX)',
      labelZh: '跳动度技术规范 (如 ES-2 或 0.015 MAX)',
      keywords: ['runout', 'es-2', 'radial', 'axial', 'runouts'],
      isRequired: true,
    },
    {
      key: 'SPLINE_DATA',
      labelEn: 'Internal Involute Spline Data (ANSI B92.1)',
      labelZh: '渐开线花键参数表 (ANSI B92.1)',
      keywords: ['spline', 'involute', 'teeth', 'b92.1', 'pitch', 'pressure angle'],
      isRequired: true,
    },
    {
      key: 'MATERIAL',
      labelEn: 'Steel Specification (e.g. Steel per MS-100 / MS-102)',
      labelZh: '原材料钢材牌号 (如 MS-100 / MS-102)',
      keywords: ['steel', 'ms-100', 'ms-102', 'material', 'sphc'],
      isRequired: true,
    },
    {
      key: 'STAMP',
      labelEn: 'Part Number Stamping Location',
      labelZh: '零件号打标钢印位置要求',
      keywords: ['stamp', 'part number', 'marking', 'nhi'],
      isRequired: false,
    },
  ],
};

export const BUILTIN_PART_FAMILY_PROFILES: PartFamilyProfile[] = [
  SINGLE_PULLEY_PROFILE,
  SPLINED_PULLEY_PROFILE,
  STEPPED_SHAFT_PROFILE,
  TURNED_FLANGE_PROFILE,
  GENERIC_CAD_PROFILE,
];

const LOCAL_STORAGE_KEY = 'qc_trained_templates';

/**
 * Loads all active part family profiles (merging built-in templates with user-trained templates)
 */
export function getStoredPartFamilyProfiles(): PartFamilyProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return BUILTIN_PART_FAMILY_PROFILES;
    const parsed: PartFamilyProfile[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return BUILTIN_PART_FAMILY_PROFILES;

    // Merge: keep custom profiles and overridden built-ins
    const customIds = new Set(parsed.map(p => p.id));
    const unoverriddenBuiltins = BUILTIN_PART_FAMILY_PROFILES.filter(bp => !customIds.has(bp.id));
    return [...parsed, ...unoverriddenBuiltins];
  } catch (err) {
    console.warn('Error loading custom trained templates from localStorage:', err);
    return BUILTIN_PART_FAMILY_PROFILES;
  }
}

/**
 * Saves a custom or updated template to localStorage
 */
export function savePartFamilyProfile(profile: PartFamilyProfile): void {
  const current = getStoredPartFamilyProfiles();
  const existingIdx = current.findIndex(p => p.id === profile.id);

  let updated: PartFamilyProfile[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = profile;
  } else {
    updated = [profile, ...current];
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save profile to localStorage:', err);
  }
}

/**
 * Adds a new feature rule to train a part family profile on a specific drawing feature
 */
export function trainNewFeatureOnProfile(
  profileId: string,
  newRule: PartFamilyFeatureRule
): PartFamilyProfile | null {
  const profiles = getStoredPartFamilyProfiles();
  const target = profiles.find(p => p.id === profileId);
  if (!target) return null;

  const existingRuleIdx = target.standardFeatures.findIndex(f => f.id === newRule.id);
  const updatedFeatures = [...target.standardFeatures];
  if (existingRuleIdx >= 0) {
    updatedFeatures[existingRuleIdx] = newRule;
  } else {
    updatedFeatures.push(newRule);
  }

  const updatedProfile: PartFamilyProfile = {
    ...target,
    standardFeatures: updatedFeatures,
  };

  savePartFamilyProfile(updatedProfile);
  return updatedProfile;
}

export function resetPartFamilyProfilesToDefault(): PartFamilyProfile[] {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (err) {
    console.warn('Error clearing custom templates:', err);
  }
  return [...BUILTIN_PART_FAMILY_PROFILES];
}
