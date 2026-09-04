import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { TitleBlockMetadata } from '../types/cad';
import type { InspectionBalloon, CharacteristicClassification, DimensionType } from '../types/balloon';
import type { InspectionControlPlanItem, ChinaApprovalRecord, ChinaApprovalDecision, ConformanceStatus } from '../types/inspection';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jggdqmygudsiueaiqzcn.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VtnkkwSDUE7_f9n0v1cvsA_CYRupQBe';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper to get untyped table interface to avoid postgrest TS inference issues
 */
const db = supabase as any;

/**
 * Save / Upsert drawing metadata, balloons, inspection control items, and China approval to Supabase
 */
export async function saveFullDrawingToSupabase(
  drawingId: string,
  metadata: TitleBlockMetadata,
  balloons: InspectionBalloon[],
  items: InspectionControlPlanItem[],
  chinaApproval: ChinaApprovalRecord,
  complianceScore: number = 100,
  auditStatus: string = 'PASSED'
) {
  // 1. Upsert drawing record
  const { error: drawingError } = await db
    .from('drawings')
    .upsert({
      id: drawingId,
      drawing_number: metadata.drawingNumber || 'DWG-UNASSIGNED',
      part_name: metadata.partName || 'PART-UNASSIGNED',
      revision: metadata.revision || 'A',
      organization: metadata.organization,
      drawn_by: metadata.drawnBy,
      checked_by: metadata.checkedBy,
      approved_by: metadata.approvedBy,
      release_date: metadata.date,
      scale: metadata.scale,
      sheet: metadata.sheet,
      material: metadata.material,
      finish: metadata.finish,
      units: metadata.units,
      projection: metadata.projection,
      general_tolerance_note: metadata.generalToleranceNote,
      compliance_score: complianceScore,
      audit_status: auditStatus,
      updated_at: new Date().toISOString(),
    });

  if (drawingError) {
    console.error('Error saving drawing to Supabase:', drawingError);
    throw drawingError;
  }

  // 2. Clear old balloons and items for this drawing before re-inserting
  await db.from('inspection_control_items').delete().eq('drawing_id', drawingId);
  await db.from('dimension_balloons').delete().eq('drawing_id', drawingId);

  // 3. Insert balloons
  if (balloons.length > 0) {
    const balloonRows = balloons.map((b) => ({
      id: b.id,
      drawing_id: drawingId,
      item_number: b.itemNumber,
      dimension_name: b.dimensionName,
      dimension_name_zh: b.dimensionNameZh || null,
      dimension_type: b.type,
      classification: b.classification,
      nominal: b.nominal,
      upper_tol: b.upperTol,
      lower_tol: b.lowerTol,
      min_limit: b.minLimit,
      max_limit: b.maxLimit,
      unit: b.unit,
      raw_callout: b.rawCallout,
      drawing_zone: b.drawingZone || null,
      sheet_number: b.sheet || 1,
      pos_x: b.x,
      pos_y: b.y,
      leader_x: b.leaderTargetX || null,
      leader_y: b.leaderTargetY || null,
      balloon_color: b.balloonColor || '#2563eb',
      gdt_symbol: b.gdtFrame?.symbol || null,
      gdt_tolerance: b.gdtFrame?.tolerance || null,
      gdt_datums: b.gdtFrame?.datums || null,
    }));

    const { error: balloonError } = await db
      .from('dimension_balloons')
      .insert(balloonRows);

    if (balloonError) {
      console.error('Error saving dimension balloons to Supabase:', balloonError);
      throw balloonError;
    }
  }

  // 4. Insert inspection control plan items
  if (items.length > 0) {
    const itemRows = items.map((it) => ({
      id: it.id,
      drawing_id: drawingId,
      balloon_id: it.balloonId,
      item_number: it.itemNumber,
      recommended_tool_en: it.recommendedToolEn || null,
      recommended_tool_zh: it.recommendedToolZh || null,
      selected_tool_en: it.selectedToolEn || null,
      selected_tool_zh: it.selectedToolZh || null,
      sampling_plan_en: it.samplingPlanEn || null,
      sampling_plan_zh: it.samplingPlanZh || null,
      sample1: it.measurements.sample1 ?? null,
      sample2: it.measurements.sample2 ?? null,
      sample3: it.measurements.sample3 ?? null,
      sample4: it.measurements.sample4 ?? null,
      sample5: it.measurements.sample5 ?? null,
      status: it.status,
      deviation_notes: it.deviationNotes || null,
    }));

    const { error: itemError } = await db
      .from('inspection_control_items')
      .insert(itemRows);

    if (itemError) {
      console.error('Error saving inspection control items to Supabase:', itemError);
      throw itemError;
    }
  }

  // 5. Upsert China QC Approval
  const { error: approvalError } = await db
    .from('china_approvals')
    .upsert({
      id: `approval-${drawingId}`,
      drawing_id: drawingId,
      inspector_name: chinaApproval.inspectorName || null,
      inspector_name_zh: chinaApproval.inspectorNameZh || null,
      inspection_date: chinaApproval.inspectionDate || null,
      facility_location: chinaApproval.facilityLocation || null,
      qa_manager_name: chinaApproval.qaManagerName || null,
      approval_date: chinaApproval.approvalDate || null,
      decision: chinaApproval.decision,
      decision_notes: chinaApproval.decisionNotes || null,
      updated_at: new Date().toISOString(),
    });

  if (approvalError) {
    console.error('Error saving China approval to Supabase:', approvalError);
    throw approvalError;
  }

  return { success: true };
}

/**
 * Fetch all saved drawings with revisions from Supabase
 */
export async function fetchAllDrawingsFromSupabase() {
  const { data, error } = await db
    .from('drawings')
    .select('id, drawing_number, part_name, revision, compliance_score, audit_status, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching drawings from Supabase:', error);
    throw error;
  }

  return data;
}

/**
 * Fetch complete drawing details, balloons, and inspection items by drawing ID
 */
export async function fetchDrawingFromSupabase(drawingId: string) {
  // 1. Fetch drawing row
  const { data: drawing, error: drawingErr } = await db
    .from('drawings')
    .select('*')
    .eq('id', drawingId)
    .single();

  if (drawingErr) throw drawingErr;

  // 2. Fetch balloons
  const { data: balloonsData, error: balloonsErr } = await db
    .from('dimension_balloons')
    .select('*')
    .eq('drawing_id', drawingId)
    .order('item_number', { ascending: true });

  if (balloonsErr) throw balloonsErr;

  // 3. Fetch inspection items
  const { data: itemsData, error: itemsErr } = await db
    .from('inspection_control_items')
    .select('*')
    .eq('drawing_id', drawingId)
    .order('item_number', { ascending: true });

  if (itemsErr) throw itemsErr;

  // 4. Fetch approval
  const { data: approvalData } = await db
    .from('china_approvals')
    .select('*')
    .eq('drawing_id', drawingId)
    .maybeSingle();

  // Map to frontend application types
  const metadata: TitleBlockMetadata = {
    drawingNumber: drawing.drawing_number,
    partName: drawing.part_name,
    revision: drawing.revision,
    organization: drawing.organization || '',
    drawnBy: drawing.drawn_by || '',
    checkedBy: drawing.checked_by || '',
    approvedBy: drawing.approved_by || '',
    date: drawing.release_date || '',
    sheet: drawing.sheet || '1 OF 1',
    scale: drawing.scale || '1:1',
    material: drawing.material || '',
    finish: drawing.finish || '',
    units: (drawing.units as 'mm' | 'inch') || 'mm',
    projection: (drawing.projection as any) || 'THIRD_ANGLE',
    generalToleranceNote: drawing.general_tolerance_note || '',
  };

  const balloons: InspectionBalloon[] = (balloonsData || []).map((row: any) => ({
    id: row.id,
    itemNumber: row.item_number,
    dimensionName: row.dimension_name,
    dimensionNameZh: row.dimension_name_zh || '',
    type: row.dimension_type as DimensionType,
    classification: row.classification as CharacteristicClassification,
    nominal: Number(row.nominal),
    upperTol: Number(row.upper_tol),
    lowerTol: Number(row.lower_tol),
    minLimit: Number(row.min_limit),
    maxLimit: Number(row.max_limit),
    unit: (row.unit as 'mm' | 'inch') || 'mm',
    rawCallout: row.raw_callout,
    drawingZone: row.drawing_zone || 'B-2',
    sheet: row.sheet_number || 1,
    x: Number(row.pos_x),
    y: Number(row.pos_y),
    leaderTargetX: row.leader_x !== null ? Number(row.leader_x) : undefined,
    leaderTargetY: row.leader_y !== null ? Number(row.leader_y) : undefined,
    balloonColor: row.balloon_color || '#2563eb',
    gdtFrame: row.gdt_symbol
      ? {
          symbol: row.gdt_symbol,
          symbolName: 'GD&T Characteristic',
          tolerance: row.gdt_tolerance || '',
          datums: row.gdt_datums || [],
        }
      : undefined,
  }));

  const items: InspectionControlPlanItem[] = (itemsData || []).map((row: any) => {
    const matchingBalloon = balloons.find(b => b.id === row.balloon_id);
    return {
      id: row.id,
      itemNumber: row.item_number,
      balloonId: row.balloon_id,
      characteristicNameEn: matchingBalloon ? matchingBalloon.dimensionName : `Characteristic ${row.item_number}`,
      characteristicNameZh: matchingBalloon ? matchingBalloon.dimensionNameZh : `检验项目 ${row.item_number}`,
      dimensionType: matchingBalloon ? matchingBalloon.type : 'LINEAR',
      classification: matchingBalloon ? matchingBalloon.classification : 'MAJOR',
      drawingZone: matchingBalloon?.drawingZone || 'B-2',
      nominal: matchingBalloon?.nominal || 0,
      lowerTol: matchingBalloon?.lowerTol || 0,
      upperTol: matchingBalloon?.upperTol || 0,
      minLimit: matchingBalloon?.minLimit || 0,
      maxLimit: matchingBalloon?.maxLimit || 0,
      unit: matchingBalloon?.unit || 'mm',
      rawCallout: matchingBalloon?.rawCallout || '',
      recommendedToolId: 'CALIPER_DIGITAL',
      recommendedToolEn: row.recommended_tool_en || 'Digital Caliper',
      recommendedToolZh: row.recommended_tool_zh || '数显卡尺',
      selectedToolEn: row.selected_tool_en || row.recommended_tool_en || 'Digital Caliper',
      selectedToolZh: row.selected_tool_zh || row.recommended_tool_zh || '数显卡尺',
      samplingPlanEn: row.sampling_plan_en || '5 pcs / Lot',
      samplingPlanZh: row.sampling_plan_zh || '5件/批次',
      measurements: {
        sample1: row.sample1 !== null ? Number(row.sample1) : undefined,
        sample2: row.sample2 !== null ? Number(row.sample2) : undefined,
        sample3: row.sample3 !== null ? Number(row.sample3) : undefined,
        sample4: row.sample4 !== null ? Number(row.sample4) : undefined,
        sample5: row.sample5 !== null ? Number(row.sample5) : undefined,
      },
      status: (row.status as ConformanceStatus) || 'PENDING',
      deviationNotes: row.deviation_notes || '',
    };
  });

  const chinaApproval: ChinaApprovalRecord = {
    inspectorName: approvalData?.inspector_name || 'Zhang Wei (张伟)',
    inspectorNameZh: approvalData?.inspector_name_zh || '张伟',
    inspectionDate: approvalData?.inspection_date || new Date().toISOString().slice(0, 10),
    facilityLocation: approvalData?.facility_location || 'Suzhou Precision Facility / 苏州精密生产线',
    qaManagerName: approvalData?.qa_manager_name || 'Li Ming (李明)',
    approvalDate: approvalData?.approval_date || new Date().toISOString().slice(0, 10),
    decision: (approvalData?.decision as ChinaApprovalDecision) || 'APPROVED',
    decisionNotes: approvalData?.decision_notes || 'All dimensions verified.',
    correctiveActionRequired: approvalData?.decision === 'REJECTED',
  };

  return {
    drawing,
    metadata,
    balloons,
    items,
    chinaApproval,
  };
}

/**
 * Create a new revision in Supabase based on an existing drawing
 */
export async function createNewRevisionInSupabase(
  baseDrawingId: string,
  newRevision: string
) {
  const existing = await fetchDrawingFromSupabase(baseDrawingId);
  const newDrawingId = `${existing.metadata.drawingNumber}-REV-${newRevision}`;

  const updatedMetadata: TitleBlockMetadata = {
    ...existing.metadata,
    revision: newRevision,
    date: new Date().toISOString().slice(0, 10),
  };

  // Clone balloons with new IDs
  const clonedBalloons = existing.balloons.map((b) => ({
    ...b,
    id: `b-${newDrawingId}-${b.itemNumber}`,
  }));

  const clonedItems = existing.items.map((it, idx) => ({
    ...it,
    id: `item-${newDrawingId}-${it.itemNumber}`,
    balloonId: clonedBalloons[idx]?.id || it.balloonId,
  }));

  await saveFullDrawingToSupabase(
    newDrawingId,
    updatedMetadata,
    clonedBalloons,
    clonedItems,
    existing.chinaApproval
  );

  return { newDrawingId, metadata: updatedMetadata, balloons: clonedBalloons, items: clonedItems };
}
