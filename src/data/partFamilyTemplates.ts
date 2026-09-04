import type { PartFamilyProfile } from '../types/templates';

/**
 * Standard Single Pulley Profile
 * Built for V-Belt, Idler, and Serpentine Pulleys per SAE/RMA standards and OEM engineering prints
 */
export const SINGLE_PULLEY_PROFILE: PartFamilyProfile = {
  id: 'profile-single-pulley',
  name: 'Single Pulley (V-Belt & Idler Pulleys)',
  nameZh: '单皮带轮 (V型带轮/惰轮标准规范)',
  category: 'PULLEY',
  description: 'Standard dimensional conventions, groove geometry, runout controls, and stamping notes for single-groove automotive and industrial pulleys.',
  descriptionZh: '适用于汽车及工业单槽皮带轮的标准尺寸标注规范、槽型几何尺寸、跳动度控制及刻字标识技术要求。',
  standardFeatures: [
    {
      id: 'PULLEY_WIDTH',
      featureName: 'Pulley Width',
      featureNameZh: '皮带轮总宽',
      dimensionType: 'LINEAR',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Overall axial width across front and rear rim/flange faces.',
      descriptionZh: '皮带轮前后面之间的整体轴向总宽度。',
      matchingCriteria: {
        keywords: ['width', 'overall', 'face', 'pulley width'],
        nominalRange: [0.5, 4.0],
        isDiameter: false,
        isAngle: false,
        expectedLocationHint: 'TOP',
      },
    },
    {
      id: 'OUTSIDE_DIAMETER',
      featureName: 'Outside Diameter',
      featureNameZh: '外径 (OD)',
      dimensionType: 'DIAMETER',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Major outer diameter across the pulley rim flanges.',
      descriptionZh: '皮带轮轮缘的最大外径尺寸。',
      matchingCriteria: {
        keywords: ['od', 'outside', 'dia', 'diameter', 'outer'],
        nominalRange: [2.0, 15.0],
        isDiameter: true,
        isAngle: false,
        hasLimits: true,
        expectedLocationHint: 'LEFT',
      },
    },
    {
      id: 'PULLEY_BORE',
      featureName: 'Pulley Bore',
      featureNameZh: '轴孔内径 (Bore)',
      dimensionType: 'DIAMETER',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Precision mounting inner bore diameter for shaft press-fit or bearing seating.',
      descriptionZh: '用于配合轴或轴承装配的中心精密安装孔内径。',
      matchingCriteria: {
        keywords: ['bore', 'id', 'hole', 'shaft'],
        nominalRange: [0.375, 4.0],
        isDiameter: true,
        isAngle: false,
        hasLimits: true,
        expectedLocationHint: 'RIGHT',
      },
    },
    {
      id: 'OVER_PIN_DIMENSION',
      featureName: 'Over Pin Dimension',
      featureNameZh: '跨销测量尺寸 (Over Pin)',
      dimensionType: 'DIAMETER',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Diameter measurement across standard gage balls or pins inserted in the V-groove to verify belt seating pitch diameter.',
      descriptionZh: '在V型槽中放入标准量棒/测球测得的跨销直径，用于确保皮带节径吻合。',
      matchingCriteria: {
        keywords: ['over pin', 'pin', 'ball', 'pitch', 'belt'],
        nominalRange: [2.0, 15.0],
        isDiameter: true,
        hasLimits: true,
        expectedLocationHint: 'RIGHT',
      },
    },
    {
      id: 'PULLEY_ANGLE',
      featureName: 'Pulley Angle',
      featureNameZh: '皮带槽夹角 (Groove Angle)',
      dimensionType: 'CHAMFER',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Included angle of the V-belt groove sidewalls (typically 32°, 34°, 36°, or 38°).',
      descriptionZh: 'V型槽侧壁之间的包含夹角 (常见为 32°、34°、36° 或 38°)。',
      matchingCriteria: {
        keywords: ['angle', 'deg', '°', 'groove angle'],
        isAngle: true,
        nominalRange: [25, 55],
        expectedLocationHint: 'BOTTOM',
      },
    },
    {
      id: 'GROOVE_RADIUS',
      featureName: 'Groove / Flange Radius',
      featureNameZh: '槽底/轮缘圆角 (Radius)',
      dimensionType: 'RADIUS',
      classification: 'MAJOR',
      isRequired: false,
      description: 'Bottom groove blend radius and outer flange lip radius.',
      descriptionZh: '皮带轮槽底过渡圆角及边缘卷边圆角。',
      matchingCriteria: {
        keywords: ['radius', 'rad', 'r'],
        nominalRange: [0.01, 1.5],
        expectedLocationHint: 'BOTTOM',
      },
    },
    {
      id: 'FLANGE_THICKNESS',
      featureName: 'Flange / Web Thickness',
      featureNameZh: '轮缘/腹板壁厚',
      dimensionType: 'LINEAR',
      classification: 'MAJOR',
      isRequired: false,
      description: 'Material sheet metal wall thickness of formed flange or web.',
      descriptionZh: '冲压成形腹板或轮缘的材料厚度。',
      matchingCriteria: {
        keywords: ['thickness', 'wall', 'stock'],
        nominalRange: [0.05, 0.5],
        isDiameter: false,
      },
    },
    {
      id: 'INNER_HUB_CLEARANCE',
      featureName: 'Inner Hub Clearance',
      featureNameZh: '内毂避空孔径 (MAX Limit)',
      dimensionType: 'LINEAR',
      classification: 'MAJOR',
      isRequired: false,
      description: 'Maximum allowable clearance diameter or step in the hub recess.',
      descriptionZh: '轮毂内侧最大允许避空尺寸 (MAX)。',
      matchingCriteria: {
        keywords: ['hub', 'max', 'clearance', 'recess'],
        nominalRange: [1.0, 6.0],
      },
    },
    {
      id: 'BORE_STEP_DIA',
      featureName: 'Bore Step / Counterbore',
      featureNameZh: '沉孔/过渡台阶直径',
      dimensionType: 'DIAMETER',
      classification: 'MAJOR',
      isRequired: false,
      description: 'Counterbore or inner transition step diameter.',
      descriptionZh: '轴孔处沉孔或台阶过渡直径。',
      matchingCriteria: {
        keywords: ['step', 'cbore', 'trans'],
        nominalRange: [0.3, 3.0],
        isDiameter: true,
      },
    },
    {
      id: 'BELT_OFFSET_REF',
      featureName: 'Groove Centerline Offset (REF)',
      featureNameZh: '带槽中心线偏移深度 (参考尺寸)',
      dimensionType: 'LINEAR',
      classification: 'REFERENCE',
      isRequired: false,
      description: 'Reference dimension locating groove centerline from mounting reference face.',
      descriptionZh: '从安装基准面到皮带槽中心线的参考定位尺寸。',
      matchingCriteria: {
        keywords: ['ref', 'reference', 'offset'],
        nominalRange: [0.2, 3.0],
      },
    },
  ],
  requiredNotes: [
    {
      key: 'RADIAL_RUNOUT',
      labelEn: 'Radial Runout Control (径向跳动要求)',
      labelZh: '径向圆跳动技术要求',
      keywords: ['radial runout', 'runout', 'radial'],
      isRequired: true,
    },
    {
      key: 'AXIAL_RUNOUT',
      labelEn: 'Axial Runout Control (轴向跳动要求)',
      labelZh: '轴向圆跳动技术要求',
      keywords: ['axial runout', 'runout', 'axial'],
      isRequired: true,
    },
    {
      key: 'MATERIAL_SPEC',
      labelEn: 'Material Specification (材质要求 - SPHC/Steel)',
      labelZh: '原材料材质规格 (如 SPHC/钢板)',
      keywords: ['material', 'sphc', 'steel', 'alloy'],
      isRequired: true,
    },
    {
      key: 'FINISH_SPEC',
      labelEn: 'Finish / Post-treatment Condition (表面状态说明)',
      labelZh: '表面处理及后处理技术说明',
      keywords: ['finish', 'plating', 'paint', 'after finish'],
      isRequired: true,
    },
    {
      key: 'MARKING_STAMP',
      labelEn: 'Part Marking & Country of Origin Stamping (零件打标与产地标识)',
      labelZh: '零件钢印及产地标识要求',
      keywords: ['stamp', 'nhi', 'made in china', 'marking'],
      isRequired: false,
    },
  ],
};

/**
 * Standard Precision Stepped Shaft Profile
 */
export const STEPPED_SHAFT_PROFILE: PartFamilyProfile = {
  id: 'profile-stepped-shaft',
  name: 'Precision Stepped Shaft',
  nameZh: '精密阶梯轴规范',
  category: 'SHAFT',
  description: 'Shaft turnings with bearing journals, thread ends, keyway slots, and cylindrical runout.',
  descriptionZh: '包含轴承配合位、螺纹轴端、键槽和圆柱圆跳动的回转轴类零件规范。',
  standardFeatures: [
    {
      id: 'OVERALL_LENGTH',
      featureName: 'Overall Shaft Length',
      featureNameZh: '轴总长',
      dimensionType: 'LINEAR',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'End-to-end overall shaft length.',
      descriptionZh: '轴两端之间的整体总长。',
      matchingCriteria: { keywords: ['length', 'oal', 'overall'] },
    },
    {
      id: 'BEARING_JOURNAL_OD',
      featureName: 'Bearing Journal Diameter',
      featureNameZh: '轴承位外径',
      dimensionType: 'DIAMETER',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Precision ground bearing journal seating diameter.',
      descriptionZh: '用于轴承安装的精密磨削外径位。',
      matchingCriteria: { isDiameter: true, hasLimits: true },
    },
    {
      id: 'THREAD_SPEC',
      featureName: 'Shaft End Thread',
      featureNameZh: '轴端螺纹规格',
      dimensionType: 'THREAD',
      classification: 'MAJOR',
      isRequired: false,
      description: 'External thread specification.',
      descriptionZh: '轴端外螺纹规格。',
      matchingCriteria: { keywords: ['m', 'unf', 'unc'] },
    },
  ],
  requiredNotes: [
    { key: 'HEAT_TREAT', labelEn: 'Heat Treatment (热处理硬度要求)', labelZh: '热处理及淬火硬度', keywords: ['hrc', 'heat treat', 'quench'], isRequired: true },
    { key: 'MATERIAL_SPEC', labelEn: 'Material Specification (材料要求)', labelZh: '材质技术要求', keywords: ['material', 'aisi', '4140', '1045'], isRequired: true },
  ],
};

/**
 * Standard Flange / Bushing Profile
 */
export const TURNED_FLANGE_PROFILE: PartFamilyProfile = {
  id: 'profile-turned-flange',
  name: 'Turned Flange / Bushing',
  nameZh: '车削法兰/轴套套筒规范',
  category: 'FLANGE',
  description: 'Circular flanges with pilot bore, mounting bolt circle (PCD), and face seal surface roughness.',
  descriptionZh: '包含中心定位孔、螺栓分度圆 (PCD) 和端面粗糙度的法兰套筒类零件规范。',
  standardFeatures: [
    {
      id: 'FLANGE_OD',
      featureName: 'Flange Outer Diameter',
      featureNameZh: '法兰最大外径',
      dimensionType: 'DIAMETER',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Major flange outside diameter.',
      descriptionZh: '法兰最大外廓外径。',
      matchingCriteria: { isDiameter: true },
    },
    {
      id: 'PILOT_BORE',
      featureName: 'Pilot Center Bore',
      featureNameZh: '中心定位内孔',
      dimensionType: 'DIAMETER',
      classification: 'CRITICAL',
      isRequired: true,
      description: 'Precision locating center bore.',
      descriptionZh: '用于定位的中心孔直径。',
      matchingCriteria: { isDiameter: true },
    },
    {
      id: 'BOLT_CIRCLE_PCD',
      featureName: 'Bolt Circle (PCD)',
      featureNameZh: '螺栓分布圆直径 (PCD)',
      dimensionType: 'DIAMETER',
      classification: 'MAJOR',
      isRequired: true,
      description: 'Pitch circle diameter of mounting holes.',
      descriptionZh: '安装固定孔的节圆中心孔距。',
      matchingCriteria: { keywords: ['pcd', 'bc', 'bolt circle'] },
    },
    {
      id: 'FLANGE_THICKNESS',
      featureName: 'Flange Overall Thickness',
      featureNameZh: '法兰整体厚度',
      dimensionType: 'LINEAR',
      classification: 'MAJOR',
      isRequired: true,
      description: 'Axial thickness of flange body.',
      descriptionZh: '法兰本体轴向厚度。',
      matchingCriteria: { isDiameter: false },
    },
  ],
  requiredNotes: [
    { key: 'SURFACE_TREATMENT', labelEn: 'Plating / Coating Specification', labelZh: '电镀防锈处理要求', keywords: ['plate', 'zinc', 'anodize'], isRequired: false },
    { key: 'MATERIAL_SPEC', labelEn: 'Material Specification', labelZh: '原材料材质规格', keywords: ['material', 'aluminum', 'steel'], isRequired: true },
  ],
};

/**
 * Generic Engineering CAD Profile (Fallback)
 */
export const GENERIC_CAD_PROFILE: PartFamilyProfile = {
  id: 'profile-generic-cad',
  name: 'General Engineering CAD (ASME / ISO)',
  nameZh: '通用机械工程图 (ASME / ISO 标准)',
  category: 'GENERIC',
  description: 'Standard CAD review against general ASME Y14.5 and ISO 1101 standards without component-specific rules.',
  descriptionZh: '遵循通用 ASME Y14.5 与 ISO 1101 标准的基础制图与尺寸公差核查。',
  standardFeatures: [],
  requiredNotes: [
    { key: 'MATERIAL_SPEC', labelEn: 'Material Specification', labelZh: '材质要求', keywords: ['material'], isRequired: true },
  ],
};

export const BUILTIN_PART_FAMILY_PROFILES: PartFamilyProfile[] = [
  SINGLE_PULLEY_PROFILE,
  STEPPED_SHAFT_PROFILE,
  TURNED_FLANGE_PROFILE,
  GENERIC_CAD_PROFILE,
];

export const PART_FAMILY_PROFILES = BUILTIN_PART_FAMILY_PROFILES;
