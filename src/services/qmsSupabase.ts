import { supabase } from './supabase';
import type {
  ControlledDocument,
  QmsDocumentRevision,
  QmsAudit,
  QmsAuditFinding,
  QmsManagementReview,
  ManagementReviewAction,
  QmsCapa,
  ContinuousImprovement,
  EightDStep,
  CapaStatus,
  FindingStatus,
  ReviewActionStatus,
  DocumentStatus,
  CiStatus,
} from '../types/qms';

// Untyped helper to bypass TS strict schema mismatch with generic client
const db = supabase as any;

/* =========================================================================
   1. CONTROLLED DOCUMENT SYSTEM (DCS)
   ========================================================================= */

export async function fetchControlledDocuments(): Promise<ControlledDocument[]> {
  try {
    const { data: docs, error: docError } = await db
      .from('qms_documents')
      .select('*')
      .order('doc_number', { ascending: true });

    if (docError) throw docError;

    const { data: revs, error: revError } = await db
      .from('qms_document_revisions')
      .select('*')
      .order('created_at', { ascending: false });

    if (revError) console.warn('Could not load revisions:', revError);

    const revisionsByDoc = (revs || []).reduce((acc: Record<string, QmsDocumentRevision[]>, rev: any) => {
      acc[rev.document_id] = acc[rev.document_id] || [];
      acc[rev.document_id].push(rev);
      return acc;
    }, {});

    return (docs || []).map((d: any) => ({
      ...d,
      revisions: revisionsByDoc[d.id] || [],
    }));
  } catch (err) {
    console.error('Failed to fetch controlled documents from Supabase:', err);
    return [];
  }
}

export async function createControlledDocument(doc: Partial<ControlledDocument>): Promise<ControlledDocument> {
  const { data, error } = await db
    .from('qms_documents')
    .insert([
      {
        doc_number: doc.doc_number,
        title: doc.title,
        category: doc.category,
        department: doc.department,
        current_revision: doc.current_revision || 'Rev A',
        status: doc.status || 'DRAFT',
        owner: doc.owner,
        effective_date: doc.effective_date || new Date().toISOString().slice(0, 10),
        next_review_date: doc.next_review_date,
        description: doc.description,
        file_url: doc.file_url,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating document:', error);
    throw error;
  }

  // Also insert the initial revision record
  await db.from('qms_document_revisions').insert([
    {
      document_id: data.id,
      revision: data.current_revision,
      change_summary: 'Initial document release.',
      created_by: data.owner,
      approved_by: data.status === 'APPROVED' ? data.owner : null,
      status: data.status,
    },
  ]);

  return data;
}

export async function addDocumentRevision(
  documentId: string,
  revisionNumber: string,
  changeSummary: string,
  createdBy: string,
  approvedBy?: string
): Promise<QmsDocumentRevision> {
  const { data: rev, error: revError } = await db
    .from('qms_document_revisions')
    .insert([
      {
        document_id: documentId,
        revision: revisionNumber,
        change_summary: changeSummary,
        created_by: createdBy,
        approved_by: approvedBy || null,
        status: approvedBy ? 'APPROVED' : 'IN_REVIEW',
      },
    ])
    .select()
    .single();

  if (revError) throw revError;

  // Update master document current revision and status
  await db
    .from('qms_documents')
    .update({
      current_revision: revisionNumber,
      status: approvedBy ? 'APPROVED' : 'IN_REVIEW',
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  return rev;
}

export async function updateDocumentStatus(documentId: string, status: DocumentStatus): Promise<void> {
  const { error } = await db
    .from('qms_documents')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', documentId);

  if (error) throw error;
}

/* =========================================================================
   2. INTERNAL & EXTERNAL AUDITS
   ========================================================================= */

export async function fetchQmsAudits(): Promise<QmsAudit[]> {
  try {
    const { data: audits, error: auditError } = await db
      .from('qms_audits')
      .select('*')
      .order('start_date', { ascending: false });

    if (auditError) throw auditError;

    const { data: findings, error: findingError } = await db
      .from('qms_audit_findings')
      .select('*')
      .order('finding_number', { ascending: true });

    if (findingError) console.warn('Could not load findings:', findingError);

    const findingsByAudit = (findings || []).reduce((acc: Record<string, QmsAuditFinding[]>, f: any) => {
      acc[f.audit_id] = acc[f.audit_id] || [];
      acc[f.audit_id].push(f);
      return acc;
    }, {});

    return (audits || []).map((a: any) => ({
      ...a,
      findings: findingsByAudit[a.id] || [],
    }));
  } catch (err) {
    console.error('Failed to fetch audits from Supabase:', err);
    return [];
  }
}

export async function createQmsAudit(audit: Partial<QmsAudit>): Promise<QmsAudit> {
  const { data, error } = await db
    .from('qms_audits')
    .insert([
      {
        audit_number: audit.audit_number,
        title: audit.title,
        audit_type: audit.audit_type,
        scope_standard: audit.scope_standard,
        lead_auditor: audit.lead_auditor,
        department: audit.department,
        start_date: audit.start_date,
        end_date: audit.end_date,
        status: audit.status || 'SCHEDULED',
        score: audit.score || 95,
        summary_notes: audit.summary_notes,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return { ...data, findings: [] };
}

export async function createAuditFinding(finding: Partial<QmsAuditFinding>): Promise<QmsAuditFinding> {
  const { data, error } = await db
    .from('qms_audit_findings')
    .insert([
      {
        audit_id: finding.audit_id,
        finding_number: finding.finding_number,
        severity: finding.severity,
        standard_clause: finding.standard_clause,
        description: finding.description,
        department: finding.department,
        target_closure_date: finding.target_closure_date,
        status: finding.status || 'OPEN',
        root_cause: finding.root_cause,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFindingStatus(findingId: string, status: FindingStatus): Promise<void> {
  const { error } = await db
    .from('qms_audit_findings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', findingId);

  if (error) throw error;
}

/* =========================================================================
   3. MANAGEMENT REVIEW (ISO 9001:2015 Clause 9.3)
   ========================================================================= */

export async function fetchManagementReviews(): Promise<QmsManagementReview[]> {
  try {
    const { data: reviews, error: revError } = await db
      .from('qms_management_reviews')
      .select('*')
      .order('meeting_date', { ascending: false });

    if (revError) throw revError;

    const { data: actions, error: actionError } = await db
      .from('qms_review_actions')
      .select('*')
      .order('due_date', { ascending: true });

    if (actionError) console.warn('Could not load review actions:', actionError);

    const actionsByReview = (actions || []).reduce((acc: Record<string, ManagementReviewAction[]>, act: any) => {
      acc[act.review_id] = acc[act.review_id] || [];
      acc[act.review_id].push(act);
      return acc;
    }, {});

    return (reviews || []).map((r: any) => ({
      ...r,
      inputs_evaluated: typeof r.inputs_evaluated === 'string' ? JSON.parse(r.inputs_evaluated) : (r.inputs_evaluated || []),
      actions: actionsByReview[r.id] || [],
    }));
  } catch (err) {
    console.error('Failed to fetch management reviews from Supabase:', err);
    return [];
  }
}

export async function createManagementReview(review: Partial<QmsManagementReview>): Promise<QmsManagementReview> {
  const { data, error } = await db
    .from('qms_management_reviews')
    .insert([
      {
        review_code: review.review_code,
        title: review.title,
        review_period: review.review_period,
        meeting_date: review.meeting_date,
        facilitator: review.facilitator,
        attendees: review.attendees || [],
        status: review.status || 'SCHEDULED',
        inputs_evaluated: review.inputs_evaluated || [],
        summary_notes: review.summary_notes,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return { ...data, actions: [] };
}

export async function addReviewAction(action: Partial<ManagementReviewAction>): Promise<ManagementReviewAction> {
  const { data, error } = await db
    .from('qms_review_actions')
    .insert([
      {
        review_id: action.review_id,
        action_description: action.action_description,
        owner: action.owner,
        due_date: action.due_date,
        priority: action.priority || 'MEDIUM',
        status: action.status || 'OPEN',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReviewActionStatus(actionId: string, status: ReviewActionStatus): Promise<void> {
  const { error } = await db
    .from('qms_review_actions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', actionId);

  if (error) throw error;
}

/* =========================================================================
   4. CAPAs (8D WORKFLOW) & CONTINUOUS IMPROVEMENT (CI)
   ========================================================================= */

export async function fetchQmsCapas(): Promise<QmsCapa[]> {
  try {
    const { data, error } = await db
      .from('qms_capas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((c: any) => ({
      ...c,
      eight_d_data: typeof c.eight_d_data === 'string' ? JSON.parse(c.eight_d_data) : (c.eight_d_data || {}),
      odoo_cost_impact: Number(c.odoo_cost_impact || 0),
    }));
  } catch (err) {
    console.error('Failed to fetch CAPAs from Supabase:', err);
    return [];
  }
}

export async function createQmsCapa(capa: Partial<QmsCapa>): Promise<QmsCapa> {
  const { data, error } = await db
    .from('qms_capas')
    .insert([
      {
        capa_number: capa.capa_number,
        title: capa.title,
        source: capa.source || 'INTERNAL_AUDIT',
        severity: capa.severity || 'MAJOR',
        status: capa.status || 'OPEN',
        current_step: capa.current_step || 'D1_TEAM',
        owner: capa.owner,
        target_close_date: capa.target_close_date,
        eight_d_data: capa.eight_d_data || {},
        odoo_cost_impact: capa.odoo_cost_impact || 0,
        odoo_alert_id: capa.odoo_alert_id,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCapaStep(capaId: string, currentStep: EightDStep, status?: CapaStatus): Promise<void> {
  const payload: any = {
    current_step: currentStep,
    updated_at: new Date().toISOString(),
  };
  if (status) payload.status = status;

  const { error } = await db
    .from('qms_capas')
    .update(payload)
    .eq('id', capaId);

  if (error) throw error;
}

export async function fetchContinuousImprovements(): Promise<ContinuousImprovement[]> {
  try {
    const { data, error } = await db
      .from('qms_continuous_improvements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((ci: any) => ({
      ...ci,
      estimated_annual_savings: Number(ci.estimated_annual_savings || 0),
      actual_savings: Number(ci.actual_savings || 0),
    }));
  } catch (err) {
    console.error('Failed to fetch continuous improvements from Supabase:', err);
    return [];
  }
}

export async function createContinuousImprovement(ci: Partial<ContinuousImprovement>): Promise<ContinuousImprovement> {
  const { data, error } = await db
    .from('qms_continuous_improvements')
    .insert([
      {
        ci_number: ci.ci_number,
        title: ci.title,
        submitted_by: ci.submitted_by,
        department: ci.department,
        category: ci.category || 'CYCLE_TIME_REDUCTION',
        status: ci.status || 'SUBMITTED',
        estimated_annual_savings: ci.estimated_annual_savings || 0,
        description: ci.description,
        actual_savings: ci.actual_savings || 0,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCiStatus(ciId: string, status: CiStatus): Promise<void> {
  const { error } = await db
    .from('qms_continuous_improvements')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ciId);

  if (error) throw error;
}
