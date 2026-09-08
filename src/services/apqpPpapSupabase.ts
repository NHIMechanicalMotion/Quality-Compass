import { supabase } from './supabase';
import type {
  ApqpProject,
  PpapSubmission,
  PpapDocumentAttachment,
  PpapElementItem,
  ApqpPhaseNumber,
} from '../types/apqpPpap';

const db = supabase as any;

/* =========================================================================
   1. DEFAULT AIAG 18-ELEMENT PPAP CHECKLIST INITIALIZER
   ========================================================================= */
export const DEFAULT_AIAG_18_ELEMENTS: Record<string, PpapElementItem> = {
  elem_1_design_records: {
    name: '1. Design Records (Ballooned Drawings / CAD Specs)',
    status: 'INCLUDED',
    comments: 'Full ballooned print linked from Quality Compass CAD Canvas',
  },
  elem_2_eng_change_docs: {
    name: '2. Authorized Engineering Change Documents',
    status: 'INCLUDED',
    comments: 'ECN / ECO documentation approved',
  },
  elem_3_cust_eng_approval: {
    name: '3. Customer Engineering Approval',
    status: 'INCLUDED',
    comments: 'Customer OEM STA / Engineering sign-off on file',
  },
  elem_4_dfmea: {
    name: '4. Design FMEA (DFMEA)',
    status: 'INCLUDED',
    comments: 'AIAG-VDA compliant design failure mode analysis',
  },
  elem_5_process_flow: {
    name: '5. Process Flow Diagrams (PFD)',
    status: 'INCLUDED',
    comments: 'Process flow chart from receiving to dock dispatch',
  },
  elem_6_pfmea: {
    name: '6. Process FMEA (PFMEA)',
    status: 'INCLUDED',
    comments: 'Process risk assessment mapped to control plan',
  },
  elem_7_control_plan: {
    name: '7. Control Plan (Pre-Launch & Production)',
    status: 'INCLUDED',
    comments: 'Complete parameter specifications and reaction plans',
  },
  elem_8_msa: {
    name: '8. Measurement System Analysis (MSA)',
    status: 'INCLUDED',
    comments: 'Gage R&R studies < 10% on critical gages',
  },
  elem_9_dimensional: {
    name: '9. Dimensional Results (Form CFG-1003)',
    status: 'INCLUDED',
    comments: 'Full 100% layout inspection of 5 sample pieces',
  },
  elem_10_materials_test: {
    name: '10. Material / Performance Test Results',
    status: 'INCLUDED',
    comments: 'Chemical composition, hardness, tensile certs attached',
  },
  elem_11_process_studies: {
    name: '11. Initial Process Studies (Ppk / Cpk >= 1.67)',
    status: 'INCLUDED',
    comments: 'SPC 30-piece capability study on critical dimensions',
  },
  elem_12_lab_docs: {
    name: '12. Qualified Laboratory Documentation',
    status: 'INCLUDED',
    comments: 'ISO/IEC 17025 accredited laboratory test certificates',
  },
  elem_13_aar: {
    name: '13. Appearance Approval Report (AAR)',
    status: 'NOT_APPLICABLE',
    comments: 'Not applicable for internal mechanical powertrain parts',
  },
  elem_14_sample_parts: {
    name: '14. Sample Production Parts',
    status: 'INCLUDED',
    comments: 'Physical tagged samples delivered to customer plant',
  },
  elem_15_master_sample: {
    name: '15. Master Sample',
    status: 'RETAINED_AT_SUPPLIER',
    comments: 'Retained in Quality Vault under controlled environment',
  },
  elem_16_checking_aids: {
    name: '16. Checking Aids & Fixtures',
    status: 'INCLUDED',
    comments: 'Inspection fixtures certified and calibrated',
  },
  elem_17_csr: {
    name: '17. Customer-Specific Requirements (CSR)',
    status: 'INCLUDED',
    comments: 'Full compliance with OEM supplier quality manual',
  },
  elem_18_psw: {
    name: '18. Part Submission Warrant (PSW - CFG-1001)',
    status: 'INCLUDED',
    comments: 'AIAG standard warrant signed by authorized Quality Director',
  },
};

/* =========================================================================
   2. APQP PROJECTS CRUD
   ========================================================================= */

import { DEFAULT_APQP_CHECKLIST } from '../utils/defaultApqpChecklist';

export async function fetchApqpProjects(): Promise<ApqpProject[]> {
  try {
    const { data, error } = await db
      .from('apqp_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const projects = (data || []) as ApqpProject[];
    return projects.map((p) => ({
      ...p,
      workflow_mode: p.workflow_mode || 'ENFORCED',
      checklist_data: p.checklist_data && p.checklist_data.length > 0 ? p.checklist_data : DEFAULT_APQP_CHECKLIST,
    }));
  } catch (err) {
    console.error('Failed to fetch APQP projects from Supabase:', err);
    return [];
  }
}

export async function createApqpProject(project: Partial<ApqpProject>): Promise<ApqpProject> {
  const payload = {
    project_code: project.project_code || `APQP-${Date.now().toString().slice(-4)}`,
    project_name: project.project_name || 'New APQP Launch',
    customer_name: project.customer_name || 'Tier-1 Customer',
    customer_contact: project.customer_contact || '',
    part_number: project.part_number || 'PART-001',
    part_revision: project.part_revision || 'Rev 01',
    program_name: project.program_name || '',
    target_sop_date: project.target_sop_date || null,
    target_ppap_date: project.target_ppap_date || null,
    current_phase: project.current_phase || 1,
    workflow_mode: project.workflow_mode || 'ENFORCED',
    checklist_data: project.checklist_data || DEFAULT_APQP_CHECKLIST,
    phase_gates: project.phase_gates || {
      phase1: { name: 'Plan & Define Program', status: 'IN_PROGRESS', completion_pct: 25, sign_off_date: null, approved_by: '' },
      phase2: { name: 'Product Design & Development', status: 'NOT_STARTED', completion_pct: 0, sign_off_date: null, approved_by: '' },
      phase3: { name: 'Process Design & Development', status: 'NOT_STARTED', completion_pct: 0, sign_off_date: null, approved_by: '' },
      phase4: { name: 'Product & Process Validation', status: 'NOT_STARTED', completion_pct: 0, sign_off_date: null, approved_by: '' },
      phase5: { name: 'Feedback, Assessment & Corrective Action', status: 'NOT_STARTED', completion_pct: 0, sign_off_date: null, approved_by: '' },
    },
    lead_engineer: project.lead_engineer || 'Quality Engineering Lead',
    status: project.status || 'ACTIVE',
  };

  const { data, error } = await db
    .from('apqp_projects')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating APQP project in Supabase:', error);
    throw error;
  }
  return data as ApqpProject;
}

export async function updateApqpProjectPhase(
  projectId: string,
  newPhase: ApqpPhaseNumber,
  phaseGates: any,
  status?: string
): Promise<void> {
  const updatePayload: any = {
    current_phase: newPhase,
    phase_gates: phaseGates,
    updated_at: new Date().toISOString(),
  };
  if (status) updatePayload.status = status;

  const { error } = await db
    .from('apqp_projects')
    .update(updatePayload)
    .eq('id', projectId);

  if (error) {
    console.error('Error updating APQP project in Supabase:', error);
    throw error;
  }
}

export async function updateApqpProjectChecklist(
  projectId: string,
  checklist: any[]
): Promise<void> {
  const { error } = await db
    .from('apqp_projects')
    .update({
      checklist_data: checklist,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    console.error('Error updating APQP project checklist in Supabase:', error);
    throw error;
  }
}

export async function updateApqpProjectWorkflowMode(
  projectId: string,
  mode: 'ENFORCED' | 'FLEXIBLE'
): Promise<void> {
  const { error } = await db
    .from('apqp_projects')
    .update({
      workflow_mode: mode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  if (error) {
    console.error('Error updating APQP project workflow mode in Supabase:', error);
    throw error;
  }
}

/* =========================================================================
   3. PPAP SUBMISSIONS CRUD
   ========================================================================= */

export async function fetchPpapSubmissions(projectId?: string): Promise<PpapSubmission[]> {
  try {
    let query = db.from('ppap_submissions').select('*').order('created_at', { ascending: false });
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as PpapSubmission[];
  } catch (err) {
    console.error('Failed to fetch PPAP submissions from Supabase:', err);
    return [];
  }
}

export async function createPpapSubmission(
  submission: Partial<PpapSubmission>
): Promise<PpapSubmission> {
  const payload = {
    project_id: submission.project_id,
    submission_number: submission.submission_number || `PPAP-${Date.now().toString().slice(-4)}`,
    part_name: submission.part_name || 'Production Part',
    part_number: submission.part_number || 'PART-001',
    drawing_number: submission.drawing_number || 'DWG-001',
    drawing_revision: submission.drawing_revision || 'Rev 01',
    engineering_change_level: submission.engineering_change_level || 'ECL-001',
    supplier_name: submission.supplier_name || 'Quality Compass Precision Technologies',
    supplier_code: submission.supplier_code || 'DUNS: 83-921-4401',
    facility_address: submission.facility_address || '100 Innovation Parkway, Detroit, MI 48226',
    customer_name: submission.customer_name || 'OEM Automotive',
    customer_division: submission.customer_division || 'Powertrain',
    application: submission.application || '',
    submission_level: submission.submission_level || 3,
    submission_reason: submission.submission_reason || 'INITIAL_SUBMISSION',
    reason_other_description: submission.reason_other_description || '',
    imds_number: submission.imds_number || '',
    weight_kg: submission.weight_kg || 1.0,
    status: submission.status || 'DRAFT',
    psw_data: submission.psw_data || {
      part_name: submission.part_name || 'Production Part',
      cust_part_number: submission.part_number || 'PART-001',
      supplier_name: submission.supplier_name || 'Quality Compass Precision Technologies',
      supplier_phone: '(313) 555-0199',
      supplier_email: 'quality@qualitycompass.io',
      authorized_rep: 'Quality Manager',
      rep_title: 'Quality Director',
      submission_date: new Date().toISOString().split('T')[0],
      materials_reporting: true,
      polymeric_parts_identified: true,
      meets_all_specs: true,
      process_meets_capability: true,
      customer_disposition: 'PENDING',
    },
    elements_status: submission.elements_status || DEFAULT_AIAG_18_ELEMENTS,
    control_plan_data: submission.control_plan_data || [],
    dimensional_results: submission.dimensional_results || [],
    fmea_items: submission.fmea_items || [],
  };

  const { data, error } = await db
    .from('ppap_submissions')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating PPAP submission in Supabase:', error);
    throw error;
  }
  return data as PpapSubmission;
}

export async function updatePpapSubmission(
  id: string,
  updates: Partial<PpapSubmission>
): Promise<PpapSubmission> {
  const { data, error } = await db
    .from('ppap_submissions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating PPAP submission in Supabase:', error);
    throw error;
  }
  return data as PpapSubmission;
}

/* =========================================================================
   4. PPAP ATTACHED DOCUMENTS & ARTIFACTS
   ========================================================================= */

export async function fetchPpapDocuments(ppapId: string): Promise<PpapDocumentAttachment[]> {
  try {
    const { data, error } = await db
      .from('ppap_documents')
      .select('*')
      .eq('ppap_id', ppapId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PpapDocumentAttachment[];
  } catch (err) {
    console.error('Failed to fetch PPAP documents from Supabase:', err);
    return [];
  }
}

export async function savePpapDocument(
  doc: Partial<PpapDocumentAttachment>
): Promise<PpapDocumentAttachment> {
  const payload = {
    ppap_id: doc.ppap_id,
    project_id: doc.project_id || null,
    title: doc.title || 'AIAG PPAP Document',
    doc_type: doc.doc_type || 'PSW_WARRANT',
    file_url: doc.file_url || null,
    file_data: doc.file_data || null,
    file_size: doc.file_size || 0,
  };

  const { data, error } = await db
    .from('ppap_documents')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error saving PPAP document in Supabase:', error);
    throw error;
  }
  return data as PpapDocumentAttachment;
}
