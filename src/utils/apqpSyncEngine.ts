import type {
  ProcessFlowItem,
  FmeaRow,
  ControlPlanRow,
  ProcessStepType,
} from '../types/apqpPpap';

/**
 * Calculates AIAG-VDA Action Priority based on Severity (S), Occurrence (O), and Detection (D).
 */
export function calculateActionPriority(s: number, o: number, d: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (s >= 8 && (o >= 4 || d >= 4)) return 'HIGH';
  if (s >= 5 && o >= 5 && d >= 4) return 'HIGH';
  if (s >= 7 || (o >= 4 && d >= 4)) return 'MEDIUM';
  return 'LOW';
}

/**
 * Generates sensible AIAG default failure modes, effects, and controls for a Process Flow operation.
 */
function generateDefaultFmeaForStep(item: ProcessFlowItem): FmeaRow {
  const opLabel = `Op ${item.op_no}: ${item.operation_name}`;
  const stepType: ProcessStepType = item.step_type || 'OPERATION';

  if (stepType === 'INSPECTION') {
    const s = 8;
    const o = 2;
    const d = 2;
    return {
      process_step: opLabel,
      failure_mode: `Measurement Gage Error (False Accept or False Reject of ${item.key_product_char || 'spec'})`,
      failure_effect: 'Non-conforming parts escape to vehicle assembly plant or unnecessary line scrap',
      severity: s,
      cause: `Gage calibration drift, optical probe misalignment, or operator micrometer technique on ${item.work_center}`,
      occurrence: o,
      prev_controls: 'Gage R&R < 10%, master setting ring calibration every 8-hour shift',
      det_controls: item.control_method || 'Automated 100% CMM laser scanning & dual verification',
      detection: d,
      rpn: s * o * d,
      action_priority: calculateActionPriority(s, o, d),
      actions_taken: 'Certified master coupon verification logged in Quality Compass before every shift.',
    };
  }

  if (stepType === 'TRANSPORT') {
    const s = 5;
    const o = 2;
    const d = 2;
    return {
      process_step: opLabel,
      failure_mode: 'Mechanical handling ding, scratch, or surface burr during transfer',
      failure_effect: 'Sealing face scratch causing hydraulic oil leakage at customer engine block',
      severity: s,
      cause: `AGV conveyor roller impact or robotic gripper excessive clamping force at ${item.work_center}`,
      occurrence: o,
      prev_controls: 'Urethane soft-touch grippers, controlled deceleration velocity',
      det_controls: item.control_method || 'Automated optical scratch sensor before nesting',
      detection: d,
      rpn: s * o * d,
      action_priority: calculateActionPriority(s, o, d),
      actions_taken: 'Installed polyurethane bumpers on all automation transition chutes.',
    };
  }

  if (stepType === 'STORAGE') {
    const s = 6;
    const o = 1;
    const d = 2;
    return {
      process_step: opLabel,
      failure_mode: 'Oxidation, atmospheric corrosion, or airborne particulate contamination',
      failure_effect: 'Bearing bore pitting leading to early bearing seizure during dyno testing',
      severity: s,
      cause: 'Humidity variation in buffer staging area or missing VCI rust preventative bag',
      occurrence: o,
      prev_controls: 'Automated VCI oil dip spray, temperature/humidity climate control buffer',
      det_controls: item.control_method || 'Visual receiving inspection and white glove wipe test',
      detection: d,
      rpn: s * o * d,
      action_priority: calculateActionPriority(s, o, d),
      actions_taken: 'Sealed ESD/VCI returnable containers with barcoded shelf-life expiration.',
    };
  }

  // Standard Machining / Assembly OPERATION
  const isCritical = item.key_product_char?.toLowerCase().includes('critical') ||
    item.key_product_char?.toLowerCase().includes('bore') ||
    item.key_product_char?.toLowerCase().includes('diameter') ||
    item.key_product_char?.toLowerCase().includes('gear');

  const s = isCritical ? 8 : 7;
  const o = 2;
  const d = 2;

  return {
    process_step: opLabel,
    failure_mode: `Dimensional out-of-tolerance or surface roughness on ${item.key_product_char || 'feature'}`,
    failure_effect: isCritical
      ? 'Loss of gear pitch line mesh tolerance, increased powertrain NVH noise, potential warranty failure'
      : 'Downstream clamping fixture interference or assembly difficulty',
    severity: s,
    cause: `Cutting insert chipped, spindle thermal expansion, or coolant wash pressure drop on ${item.work_center}`,
    occurrence: o,
    prev_controls: `Automated Renishaw tool touch probe, rigid hydraulic fixture clamping, preset tool life counters (${item.key_process_char || 'Speed/Feed'})`,
    det_controls: item.control_method || '100% In-line air gage check with automated feedback offset',
    detection: d,
    rpn: s * o * d,
    action_priority: calculateActionPriority(s, o, d),
    actions_taken: 'Integrated acoustic tool breakage sensor and closed-loop CNC tool wear compensation.',
  };
}

/**
 * Synchronizes Process Flow Items into the PFMEA matrix.
 * Preserves user edits on existing rows while adding missing operations or updating operation headers.
 */
export function syncProcessFlowToFmea(
  flowItems: ProcessFlowItem[],
  existingFmea: FmeaRow[]
): FmeaRow[] {
  if (!flowItems || flowItems.length === 0) return existingFmea || [];

  const existingMap = new Map<number, FmeaRow[]>();
  const unmatchedRows: FmeaRow[] = [];

  // Group existing FMEA rows by Op number pattern (e.g. "Op 10:")
  (existingFmea || []).forEach((row) => {
    const match = row.process_step.match(/Op\s*(\d+)/i);
    if (match) {
      const opNo = parseInt(match[1]);
      if (!existingMap.has(opNo)) {
        existingMap.set(opNo, []);
      }
      existingMap.get(opNo)!.push(row);
    } else {
      unmatchedRows.push(row);
    }
  });

  const result: FmeaRow[] = [];
  const handledOps = new Set<number>();

  flowItems.forEach((flowItem) => {
    handledOps.add(flowItem.op_no);
    const existingList = existingMap.get(flowItem.op_no);
    const updatedStepName = `Op ${flowItem.op_no}: ${flowItem.operation_name}`;

    if (existingList && existingList.length > 0) {
      // Preserve all existing failure modes for this operation
      existingList.forEach((existing) => {
        const s = existing.severity || 7;
        const o = existing.occurrence || 2;
        const d = existing.detection || 2;
        result.push({
          ...existing,
          process_step: updatedStepName,
          rpn: existing.rpn || s * o * d,
          action_priority: existing.action_priority || calculateActionPriority(s, o, d),
          det_controls: existing.det_controls || flowItem.control_method || 'In-process verification',
        });
      });
    } else {
      // Generate new intelligent default row for this operation
      result.push(generateDefaultFmeaForStep(flowItem));
    }
  });

  // Preserve any existing FMEA rows whose operation was not in flowItems
  existingMap.forEach((rows, opNo) => {
    if (!handledOps.has(opNo)) {
      result.push(...rows);
    }
  });

  // Preserve any manually added rows without an Op pattern (e.g. "New Machining Operation")
  result.push(...unmatchedRows);

  return result;
}

/**
 * Synchronizes Process Flow Items and PFMEA rows into the AIAG Control Plan.
 * Seamlessly brings forward machines, characteristics, tolerances, special classification symbols (∇, ◊),
 * detection methods, sample frequencies, and reaction plans.
 */
export function syncProcessFlowAndFmeaToControlPlan(
  flowItems: ProcessFlowItem[],
  fmeaItems: FmeaRow[],
  existingCp: ControlPlanRow[]
): ControlPlanRow[] {
  if (!flowItems || flowItems.length === 0) return existingCp || [];

  // Map FMEA by Op number (first/highest severity FMEA row for the op)
  const fmeaMap = new Map<number, FmeaRow>();
  (fmeaItems || []).forEach((f) => {
    const match = f.process_step.match(/Op\s*(\d+)/i);
    if (match) {
      const op = parseInt(match[1]);
      const current = fmeaMap.get(op);
      if (!current || f.severity > current.severity) {
        fmeaMap.set(op, f);
      }
    }
  });

  // Map Existing CP by Op number (group to preserve multiple characteristics per op)
  const existingMap = new Map<number, ControlPlanRow[]>();
  (existingCp || []).forEach((cp) => {
    if (!existingMap.has(cp.op_no)) {
      existingMap.set(cp.op_no, []);
    }
    existingMap.get(cp.op_no)!.push(cp);
  });

  const result: ControlPlanRow[] = [];
  const handledOps = new Set<number>();

  flowItems.forEach((flowItem) => {
    handledOps.add(flowItem.op_no);
    const existingList = existingMap.get(flowItem.op_no);
    const fmea = fmeaMap.get(flowItem.op_no);

    // Determine AIAG Special Characteristic symbol based on FMEA Severity & AP
    let classSymbol: 'NONE' | 'CRITICAL' | 'DIAMOND' | 'MAJOR' = 'NONE';
    if (fmea) {
      if (fmea.severity >= 8 || fmea.action_priority === 'HIGH') {
        classSymbol = 'CRITICAL'; // ∇ Critical / Safety Characteristic
      } else if (fmea.severity >= 6 || fmea.action_priority === 'MEDIUM') {
        classSymbol = 'DIAMOND'; // ◊ Significant / Key Characteristic
      }
    } else if (flowItem.step_type === 'INSPECTION') {
      classSymbol = 'CRITICAL';
    }

    if (existingList && existingList.length > 0) {
      // Preserve all custom user characteristics for this operation
      existingList.forEach((existing) => {
        result.push({
          ...existing,
          op_no: flowItem.op_no,
          process_step: flowItem.operation_name || existing.process_step,
          machine: flowItem.work_center || existing.machine,
          char_desc: existing.char_desc || flowItem.key_product_char || 'Critical Dimension / Feature',
          class_symbol: existing.class_symbol !== 'NONE' ? existing.class_symbol : classSymbol,
          spec: existing.spec || flowItem.key_process_char || 'Per Engineering Blueprint',
          eval_technique: existing.eval_technique || fmea?.det_controls || flowItem.control_method || 'Air Gage / Micrometer',
          control_method: existing.control_method || fmea?.prev_controls || flowItem.control_method || 'X-Bar R Chart',
          reaction_plan: existing.reaction_plan || fmea?.actions_taken || 'Quarantine lot, adjust tool offset, inspect last 5 pcs',
        });
      });
    } else {
      // New Control Plan row synthesized directly from PFD + PFMEA
      result.push({
        op_no: flowItem.op_no,
        process_step: flowItem.operation_name,
        machine: flowItem.work_center,
        char_desc: flowItem.key_product_char || 'Critical Dimension / Surface Integrity',
        class_symbol: classSymbol,
        spec: flowItem.key_process_char || 'Per Engineering Blueprint',
        eval_technique: fmea?.det_controls || flowItem.control_method || 'Air Gage / Micrometer',
        sample_size: flowItem.step_type === 'INSPECTION' ? '100%' : '5 pcs',
        sample_freq: flowItem.step_type === 'INSPECTION' ? 'Continuous' : '1 / Hour',
        control_method: fmea?.prev_controls || 'Statistical Process Control (SPC)',
        reaction_plan: fmea?.actions_taken || 'Quarantine lot, adjust tool offset, inspect last 5 pcs',
      });
    }
  });

  // Preserve any existing CP rows not matching flowItems
  existingMap.forEach((rows, opNo) => {
    if (!handledOps.has(opNo)) {
      result.push(...rows);
    }
  });

  return result;
}
