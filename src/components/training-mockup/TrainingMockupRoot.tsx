import React, { useState, useEffect } from 'react';
import { 
  Home, 
  GraduationCap, 
  UserCheck, 
  Grid3X3, 
  RotateCcw, 
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Menu
} from 'lucide-react';
import { 
  INITIAL_OPERATORS_DATA, 
  MACHINES_DATA, 
  type OperatorRecord, 
  type TrainingLesson 
} from '../../data/mockTrainingData';
import { TrainingHomeScreen } from './TrainingHomeScreen';
import { OperatorDashboardView } from './OperatorDashboardView';
import { TrainingModuleDetailView } from './TrainingModuleDetailView';
import { SupervisorSignoffView } from './SupervisorSignoffView';
import { SkillsMatrixView } from './SkillsMatrixView';

interface TrainingMockupRootProps {
  onExitMockup?: () => void;
}

type ActiveView = 
  | 'HOME' 
  | 'OPERATOR' 
  | 'TRAINING_DETAIL' 
  | 'SUPERVISOR' 
  | 'MATRIX';

export const TrainingMockupRoot: React.FC<TrainingMockupRootProps> = ({
  onExitMockup,
}) => {
  // Navigation State
  const [activeView, setActiveView] = useState<ActiveView>('HOME');
  
  // Collapsible Header State (leaves maximum visible phone screen for shop-floor tasks)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Mutable Mock Data in memory (allows testing sign-off and completion flows)
  const [operators, setOperators] = useState<OperatorRecord[]>(INITIAL_OPERATORS_DATA);
  const machines = MACHINES_DATA;

  // Active Operator (for Operator View)
  const [activeOperatorId, setActiveOperatorId] = useState<string>('op-marcus-vance');
  
  // Active Training Lesson (when viewing training details)
  const [activeLesson, setActiveLesson] = useState<TrainingLesson | null>(null);

  // Success Toast / Banner message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeOperator = operators.find((op) => op.id === activeOperatorId) || operators[0];

  // Auto-collapse header when scrolling down on phone screens (< 768px)
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        if (currentScrollY > 60 && currentScrollY > lastScrollY + 15) {
          setIsHeaderCollapsed(true);
        }
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Safe navigation that auto-collapses on phone screens so user sees full view immediately
  const handleNavigate = (view: ActiveView) => {
    setActiveView(view);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      // Auto-collapse when entering a task view; expand when returning to home
      setIsHeaderCollapsed(view !== 'HOME');
    }
  };

  // Reset demo data
  const handleResetDemo = () => {
    setOperators(INITIAL_OPERATORS_DATA);
    handleNavigate('HOME');
    setToastMessage('Demo state reset to initial factory conditions.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sign off an operator (Task B mutation)
  const handleSignoffConfirm = (operatorId: string, machineId: string, supervisorName: string) => {
    setOperators((prev) =>
      prev.map((op) => {
        if (op.id !== operatorId) return op;
        const currentSkill = op.skills[machineId];
        return {
          ...op,
          skills: {
            ...op.skills,
            [machineId]: {
              ...currentSkill,
              level: 2,
              levelLabel: 'Level 2 (Qualified Operator)',
              status: 'QUALIFIED',
              lastCertifiedDate: '2026-10-12',
              expirationDate: '2027-10-12',
              certifiedBy: supervisorName,
              notes: 'Signed off via mobile floor evaluation.',
            },
          },
        };
      })
    );
  };

  // Complete a lesson (Task A mutation)
  const handleCompleteLesson = (lessonId: string) => {
    setOperators((prev) =>
      prev.map((op) => {
        if (op.id !== activeOperator.id) return op;
        return {
          ...op,
          upcomingTrainings: op.upcomingTrainings.filter((t) => t.id !== lessonId),
        };
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#07172C] text-slate-100 flex flex-col font-sans">
      {/* GLOBAL TOP NAVIGATION HEADER (Rule: Max 5 navigation items, 48px touch targets, >=16px text) */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b-2 border-slate-700 backdrop-blur-md px-3 sm:px-6 py-2 shadow-xl transition-all duration-200">
        {isHeaderCollapsed ? (
          /* COLLAPSED COMPACT HEADER: 1 slim row (52px), frees up 100px+ vertical phone space */
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 min-h-[48px]">
            <button
              onClick={() => handleNavigate('HOME')}
              className="flex items-center gap-2.5 text-left focus:outline-none focus:ring-2 focus:ring-lime-400 rounded-lg p-1 min-h-[48px] max-w-[70%]"
            >
              <div className="w-10 h-10 rounded-xl bg-lime-500/20 border-2 border-lime-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-lime-400" />
              </div>
              <div className="truncate">
                <span className="text-white font-bold text-base sm:text-lg block truncate leading-tight">
                  {activeView === 'HOME' && 'NHI Training Hub'}
                  {activeView === 'OPERATOR' && `Operator: ${activeOperator.name}`}
                  {activeView === 'TRAINING_DETAIL' && `Training: ${activeLesson?.title || 'Guide'}`}
                  {activeView === 'SUPERVISOR' && 'Sign Off Worker'}
                  {activeView === 'MATRIX' && 'Skills Matrix'}
                </span>
                <span className="text-lime-400 font-semibold text-base block -mt-0.5 truncate">
                  {activeView === 'HOME' ? 'Home Screen' : 'Tap Menu to Switch Views'}
                </span>
              </div>
            </button>

            {/* Menu Expand Button (Rule: >=48px touch target, >=16px text, plain words) */}
            <button
              onClick={() => setIsHeaderCollapsed(false)}
              className="min-h-[48px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border-2 border-lime-400/80 rounded-xl text-white font-bold text-base flex items-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-lime-400 shrink-0"
              title="Expand navigation menu"
            >
              <Menu className="w-5 h-5 text-lime-400" />
              <span>Menu</span>
              <ChevronDown className="w-5 h-5 text-lime-400" />
            </button>
          </div>
        ) : (
          /* EXPANDED HEADER: Full 5-item navigation bar + Collapse button */
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
            {/* Logo & Module Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavigate('HOME')}
                className="flex items-center gap-2.5 text-left focus:outline-none focus:ring-2 focus:ring-lime-400 rounded-lg p-1"
              >
                <div className="w-10 h-10 rounded-xl bg-lime-500/20 border-2 border-lime-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-lime-400" />
                </div>
                <div>
                  <span className="text-white font-bold text-lg sm:text-xl block leading-tight">
                    NHI Training Hub
                  </span>
                  <span className="text-lime-400 font-semibold text-base block -mt-0.5">
                    Phase 1a Mock-Up
                  </span>
                </div>
              </button>
            </div>

            {/* EXACTLY 5 NAVIGATION ITEMS (Max 5 Rule) */}
            <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
              {/* Nav Item 1: Home */}
              <button
                onClick={() => handleNavigate('HOME')}
                className={`min-h-[48px] px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-base flex items-center gap-2 transition-all border-2 ${
                  activeView === 'HOME'
                    ? 'bg-slate-800 text-white border-lime-400 shadow-md ring-2 ring-lime-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
                }`}
              >
                <Home className="w-5 h-5 text-lime-400 shrink-0" />
                <span className="hidden sm:inline">Home</span>
              </button>

              {/* Nav Item 2: Operator View */}
              <button
                onClick={() => handleNavigate('OPERATOR')}
                className={`min-h-[48px] px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-base flex items-center gap-2 transition-all border-2 ${
                  activeView === 'OPERATOR' || activeView === 'TRAINING_DETAIL'
                    ? 'bg-sky-950 text-sky-200 border-sky-400 shadow-md ring-2 ring-sky-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
                }`}
              >
                <GraduationCap className="w-5 h-5 text-sky-400 shrink-0" />
                <span>Operator</span>
              </button>

              {/* Nav Item 3: Sign Off Worker */}
              <button
                onClick={() => handleNavigate('SUPERVISOR')}
                className={`min-h-[48px] px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-base flex items-center gap-2 transition-all border-2 ${
                  activeView === 'SUPERVISOR'
                    ? 'bg-emerald-950 text-emerald-200 border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
                }`}
              >
                <UserCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Sign Off</span>
              </button>

              {/* Nav Item 4: Skills Matrix */}
              <button
                onClick={() => handleNavigate('MATRIX')}
                className={`min-h-[48px] px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-base flex items-center gap-2 transition-all border-2 ${
                  activeView === 'MATRIX'
                    ? 'bg-purple-950 text-purple-200 border-purple-400 shadow-md ring-2 ring-purple-400/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 border-transparent'
                }`}
              >
                <Grid3X3 className="w-5 h-5 text-purple-400 shrink-0" />
                <span>Matrix</span>
              </button>

              {/* Nav Item 5: Reset Demo */}
              <button
                onClick={handleResetDemo}
                title="Reset mock data to factory state"
                className="min-h-[48px] px-3 sm:px-3.5 py-2.5 rounded-xl font-semibold text-base text-slate-400 hover:text-white hover:bg-slate-800 border-2 border-slate-700 hover:border-slate-500 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-5 h-5 shrink-0" />
                <span className="hidden md:inline">Reset Demo</span>
              </button>
            </nav>

            {/* Collapse Header Button + Return Link */}
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <button
                onClick={() => setIsHeaderCollapsed(true)}
                className="min-h-[48px] px-3.5 sm:px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 active:bg-slate-900 border-2 border-slate-600 hover:border-slate-500 rounded-xl text-slate-200 hover:text-white font-bold text-base flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-400"
                title="Collapse header to see more phone screen"
              >
                <span>Collapse</span>
                <ChevronUp className="w-5 h-5 text-lime-400 shrink-0" />
              </button>

              {onExitMockup && (
                <button
                  onClick={onExitMockup}
                  className="min-h-[48px] px-3 sm:px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-xl text-slate-300 hover:text-white font-medium text-base flex items-center gap-2 transition-colors"
                >
                  <span className="hidden lg:inline">Quality Compass</span>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Interactive Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-lime-500 text-slate-950 px-4 py-3 text-center font-bold text-base shadow-lg animate-in slide-in-from-top duration-300">
          {toastMessage}
        </div>
      )}

      {/* MAIN VIEW CONTAINER */}
      <main className="flex-1 pb-16 pt-4">
        {activeView === 'HOME' && (
          <TrainingHomeScreen
            activeOperatorName={activeOperator.name}
            onSelectFlow={(flow) => {
              if (flow === 'OPERATOR') handleNavigate('OPERATOR');
              else if (flow === 'SUPERVISOR') handleNavigate('SUPERVISOR');
              else if (flow === 'MATRIX') handleNavigate('MATRIX');
            }}
          />
        )}

        {activeView === 'OPERATOR' && (
          <OperatorDashboardView
            operator={activeOperator}
            onBackToHome={() => handleNavigate('HOME')}
            onOpenTraining={(lesson) => {
              setActiveLesson(lesson);
              handleNavigate('TRAINING_DETAIL');
            }}
          />
        )}

        {activeView === 'TRAINING_DETAIL' && activeLesson && (
          <TrainingModuleDetailView
            lesson={activeLesson}
            onBackToDashboard={() => handleNavigate('OPERATOR')}
            onCompleteLesson={(lessonId) => {
              handleCompleteLesson(lessonId);
            }}
          />
        )}

        {activeView === 'SUPERVISOR' && (
          <SupervisorSignoffView
            operators={operators}
            machines={machines}
            onSignoffConfirm={handleSignoffConfirm}
            onBackToHome={() => handleNavigate('HOME')}
          />
        )}

        {activeView === 'MATRIX' && (
          <SkillsMatrixView
            operators={operators}
            machines={machines}
            onBackToHome={() => handleNavigate('HOME')}
            onSelectOperatorForSignoff={(opId) => {
              setActiveOperatorId(opId);
              handleNavigate('SUPERVISOR');
            }}
          />
        )}
      </main>

      {/* FOOTER BAR (Confirms UI Rules for Testers) */}
      <footer className="bg-slate-950 border-t border-slate-800 py-4 px-4 text-center text-slate-400 text-base">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>NHI Mechanical Motion &bull; Shop Floor Quality & Skills System</span>
          <span className="text-lime-400 font-semibold">
            All buttons &ge; 48px &bull; All text &ge; 16px &bull; 5 Nav Items
          </span>
        </div>
      </footer>
    </div>
  );
};
