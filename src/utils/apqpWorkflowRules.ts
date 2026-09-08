import type { ApqpProject, PpapSubmission, ApqpTab, WorkflowMode } from '../types/apqpPpap';

export interface TabLockEvaluation {
  isLocked: boolean;
  reason?: string;
  requiredTab?: ApqpTab;
  requiredStepTitle?: string;
}

export interface WorkflowStep {
  stepIndex: number;
  tab: ApqpTab;
  title: string;
  shortName: string;
  phase: number;
  description: string;
}

export const PPAP_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    stepIndex: 1,
    tab: 'PROCESS_FLOW',
    title: 'Step 1: Process Flow Diagram (PFD)',
    shortName: 'Process Flow',
    phase: 3,
    description: 'Establish the operational sequence from raw material receipt through shipping.',
  },
  {
    stepIndex: 2,
    tab: 'PFMEA',
    title: 'Step 2: AIAG-VDA Process FMEA',
    shortName: 'PFMEA Matrix',
    phase: 3,
    description: 'Identify potential failure modes, causes, and prevention/detection controls.',
  },
  {
    stepIndex: 3,
    tab: 'CONTROL_PLAN',
    title: 'Step 3: AIAG Control Plan',
    shortName: 'Control Plan',
    phase: 3,
    description: 'Formulate parameter specifications, inspection frequencies, and reaction plans.',
  },
  {
    stepIndex: 4,
    tab: 'DIMENSIONAL',
    title: 'Step 4: Dimensional Layout (CFG-1003)',
    shortName: 'Dimensional',
    phase: 4,
    description: 'Execute full layout inspection on 5 sample production parts against CAD print.',
  },
  {
    stepIndex: 5,
    tab: 'CAPACITY_ANALYSIS',
    title: 'Step 5: Capacity Analysis & Run @ Rate',
    shortName: 'Capacity & R@R',
    phase: 4,
    description: 'Conduct multi-day production trial to validate line speed, uptime, and scrap.',
  },
  {
    stepIndex: 6,
    tab: 'ELEMENTS_18',
    title: 'Step 6: AIAG 18-Element Dossier',
    shortName: '18 Elements',
    phase: 4,
    description: 'Verify all 18 PPAP deliverables are included or accounted for.',
  },
  {
    stepIndex: 7,
    tab: 'PSW_WARRANT',
    title: 'Step 7: Part Submission Warrant (PSW)',
    shortName: 'PSW Warrant',
    phase: 4,
    description: 'Affirm compliance declaration and sign official AIAG Form CFG-1001 warrant.',
  },
];

/**
 * Checks whether a specific tab is locked based on project workflow mode and prerequisite deliverables.
 */
export function evaluateTabLock(
  project?: ApqpProject | null,
  submission?: PpapSubmission | null,
  targetTab?: ApqpTab
): TabLockEvaluation {
  if (!targetTab) return { isLocked: false };

  // Always unlocked navigational and overview tabs
  if (targetTab === 'ROADMAP' || targetTab === 'CHECKLIST' || targetTab === 'DOCUMENTS') {
    return { isLocked: false };
  }

  // If project is in FLEXIBLE mode, all tabs are unlocked
  const mode: WorkflowMode = project?.workflow_mode || 'ENFORCED';
  if (mode === 'FLEXIBLE') {
    return { isLocked: false };
  }

  // ENFORCED WORKFLOW CHECKS
  const pfdCount = submission?.process_flow_data?.length || 0;
  const fmeaCount = submission?.fmea_items?.length || 0;
  const controlPlanCount = submission?.control_plan_data?.length || 0;
  const dimensionalCount = submission?.dimensional_results?.length || 0;
  const hasCapacityLogs = (submission?.capacity_data?.daily_logs?.length || 0) > 0;

  // Rule 1: Process Flow Diagram (Step 1)
  // Needs project to be at least in Phase 3 or Phase 1-2 gate reviews started
  if (targetTab === 'PROCESS_FLOW') {
    return { isLocked: false };
  }

  // Rule 2: PFMEA (Step 2)
  // Requires Process Flow Diagram to have at least 1 operation defined
  if (targetTab === 'PFMEA') {
    if (pfdCount === 0) {
      return {
        isLocked: true,
        reason: 'AIAG APQP standard requires the Process Flow Diagram (PFD) to be established before conducting the Process FMEA. You must define operational sequence (Op 10, Op 20...) first.',
        requiredTab: 'PROCESS_FLOW',
        requiredStepTitle: 'Step 1: Process Flow Diagram (PFD)',
      };
    }
    return { isLocked: false };
  }

  // Rule 3: Control Plan (Step 3)
  // Requires both PFD and PFMEA
  if (targetTab === 'CONTROL_PLAN') {
    if (pfdCount === 0) {
      return {
        isLocked: true,
        reason: 'Control Plan operations must be mapped directly from the Process Flow Diagram. Complete the PFD first.',
        requiredTab: 'PROCESS_FLOW',
        requiredStepTitle: 'Step 1: Process Flow Diagram (PFD)',
      };
    }
    if (fmeaCount === 0) {
      return {
        isLocked: true,
        reason: 'Control methods and special characteristics in the Control Plan must address failure modes identified in the PFMEA. Complete the PFMEA first.',
        requiredTab: 'PFMEA',
        requiredStepTitle: 'Step 2: AIAG-VDA Process FMEA',
      };
    }
    return { isLocked: false };
  }

  // Rule 4: Dimensional Results (Step 4)
  // Requires Control Plan so gages and tolerances are established
  if (targetTab === 'DIMENSIONAL') {
    if (controlPlanCount === 0) {
      return {
        isLocked: true,
        reason: 'Dimensional inspection methods and sample sizes must adhere to the Control Plan. Complete the Control Plan before recording pilot dimensional results.',
        requiredTab: 'CONTROL_PLAN',
        requiredStepTitle: 'Step 3: AIAG Control Plan',
      };
    }
    return { isLocked: false };
  }

  // Rule 5: Capacity Analysis & Run @ Rate (Step 5)
  // Requires Dimensional Inspection to be conducted first (must prove capability before proving speed)
  if (targetTab === 'CAPACITY_ANALYSIS') {
    if (dimensionalCount === 0) {
      return {
        isLocked: true,
        reason: 'AIAG Run @ Rate trial requires parts to be confirmed dimensionally conforming prior to high-rate production validation. Complete the Dimensional Layout (CFG-1003) first.',
        requiredTab: 'DIMENSIONAL',
        requiredStepTitle: 'Step 4: Dimensional Layout (CFG-1003)',
      };
    }
    return { isLocked: false };
  }

  // Rule 6: 18 PPAP Elements (Step 6)
  // Requires Capacity trial data
  if (targetTab === 'ELEMENTS_18') {
    if (!hasCapacityLogs) {
      return {
        isLocked: true,
        reason: 'The 18-element submission dossier requires initial process study data and Run @ Rate validation. Complete the Capacity Analysis first.',
        requiredTab: 'CAPACITY_ANALYSIS',
        requiredStepTitle: 'Step 5: Capacity Analysis & Run @ Rate',
      };
    }
    return { isLocked: false };
  }

  // Rule 7: Part Submission Warrant (PSW - Step 7)
  // Strictly locked until all preceding manufacturing deliverables are complete
  if (targetTab === 'PSW_WARRANT') {
    if (pfdCount === 0) {
      return {
        isLocked: true,
        reason: 'The Part Submission Warrant cannot be signed without a validated Process Flow Diagram.',
        requiredTab: 'PROCESS_FLOW',
        requiredStepTitle: 'Step 1: Process Flow Diagram (PFD)',
      };
    }
    if (fmeaCount === 0) {
      return {
        isLocked: true,
        reason: 'The Part Submission Warrant requires a complete AIAG-VDA Process FMEA on file.',
        requiredTab: 'PFMEA',
        requiredStepTitle: 'Step 2: AIAG-VDA Process FMEA',
      };
    }
    if (controlPlanCount === 0) {
      return {
        isLocked: true,
        reason: 'The Part Submission Warrant requires an approved Pre-Launch / Production Control Plan.',
        requiredTab: 'CONTROL_PLAN',
        requiredStepTitle: 'Step 3: AIAG Control Plan',
      };
    }
    if (dimensionalCount === 0) {
      return {
        isLocked: true,
        reason: 'The Part Submission Warrant requires full 100% dimensional layout results (CFG-1003).',
        requiredTab: 'DIMENSIONAL',
        requiredStepTitle: 'Step 4: Dimensional Layout (CFG-1003)',
      };
    }
    if (!hasCapacityLogs) {
      return {
        isLocked: true,
        reason: 'The Part Submission Warrant requires demonstrated Run @ Rate capacity validation.',
        requiredTab: 'CAPACITY_ANALYSIS',
        requiredStepTitle: 'Step 5: Capacity Analysis & Run @ Rate',
      };
    }
    return { isLocked: false };
  }

  return { isLocked: false };
}

/**
 * Returns the current active workflow step and the next recommended action.
 */
export function getNextRecommendedWorkflowStep(
  _project?: ApqpProject | null,
  submission?: PpapSubmission | null
): { currentStep: WorkflowStep; nextStep: WorkflowStep | null; isAllCompleted: boolean } {
  const pfdCount = submission?.process_flow_data?.length || 0;
  const fmeaCount = submission?.fmea_items?.length || 0;
  const controlPlanCount = submission?.control_plan_data?.length || 0;
  const dimensionalCount = submission?.dimensional_results?.length || 0;
  const hasCapacityLogs = (submission?.capacity_data?.daily_logs?.length || 0) > 0;
  const isPswSigned = submission?.psw_data?.meets_all_specs && submission?.status !== 'DRAFT';

  if (pfdCount === 0) {
    return {
      currentStep: PPAP_WORKFLOW_STEPS[0],
      nextStep: PPAP_WORKFLOW_STEPS[1],
      isAllCompleted: false,
    };
  }
  if (fmeaCount === 0) {
    return {
      currentStep: PPAP_WORKFLOW_STEPS[1],
      nextStep: PPAP_WORKFLOW_STEPS[2],
      isAllCompleted: false,
    };
  }
  if (controlPlanCount === 0) {
    return {
      currentStep: PPAP_WORKFLOW_STEPS[2],
      nextStep: PPAP_WORKFLOW_STEPS[3],
      isAllCompleted: false,
    };
  }
  if (dimensionalCount === 0) {
    return {
      currentStep: PPAP_WORKFLOW_STEPS[3],
      nextStep: PPAP_WORKFLOW_STEPS[4],
      isAllCompleted: false,
    };
  }
  if (!hasCapacityLogs) {
    return {
      currentStep: PPAP_WORKFLOW_STEPS[4],
      nextStep: PPAP_WORKFLOW_STEPS[5],
      isAllCompleted: false,
    };
  }
  if (!isPswSigned) {
    return {
      currentStep: PPAP_WORKFLOW_STEPS[6],
      nextStep: null,
      isAllCompleted: false,
    };
  }

  return {
    currentStep: PPAP_WORKFLOW_STEPS[6],
    nextStep: null,
    isAllCompleted: true,
  };
}
