import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Grid3X3, 
  Users, 
  Cpu, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  LogOut, 
  UserCheck, 
  HardHat, 
  UploadCloud, 
  Download, 
  Building,
  CheckCircle2
} from 'lucide-react';
import type { 
  Employee, 
  Department, 
  Equipment, 
  TrainingModule, 
  TrainingRecord, 
  EquipmentQualification, 
  MissingRequirementItem 
} from '../../types/training';
import { 
  fetchDepartments, 
  fetchEmployees, 
  fetchEquipment, 
  fetchTrainings, 
  fetchTrainingRecords, 
  fetchEquipmentQualifications, 
  fetchTrainingRequirements,
  calculateMissingRequirements
} from '../../services/trainingService';
import { TrainingDashboardView } from './TrainingDashboardView';
import { SkillsMatrixView } from './SkillsMatrixView';
import { EmployeeManagementView } from './EmployeeManagementView';
import { EquipmentManagementView } from './EquipmentManagementView';
import { TrainingCatalogView } from './TrainingCatalogView';
import { EmployeeTrainingFileView } from './EmployeeTrainingFileView';
import { TrainingLoginModal, type CurrentUserSession } from './TrainingLoginModal';
import { RecordTrainingModal } from './RecordTrainingModal';
import { SupervisorSignoffModal } from './SupervisorSignoffModal';
import { CsvImportModal } from './CsvImportModal';
import { AdminExportModal } from './AdminExportModal';
import { useAuth } from '../../context/AuthContext';

interface TrainingPhase1RootProps {
  onExitToQualityCompass?: () => void;
}

type MainTab = 'DASHBOARD' | 'MATRIX' | 'EMPLOYEES' | 'EQUIPMENT' | 'TRAININGS';

export const TrainingPhase1Root: React.FC<TrainingPhase1RootProps> = ({
  onExitToQualityCompass
}) => {
  // Navigation State (Max 5 items per brief)
  const [activeTab, setActiveTab] = useState<MainTab>('DASHBOARD');
  
  // Selected employee for training file dossier view
  const [selectedFileEmployee, setSelectedFileEmployee] = useState<Employee | null>(null);

  // Collapsible Header: Defaults to collapsed on phone screens (< 768px)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  // Current Logged-in User Session (from unified enterprise AuthContext)
  const { currentUser: authUser } = useAuth();

  const currentUser: CurrentUserSession = React.useMemo(() => {
    if (!authUser) {
      return {
        role: 'OPERATOR',
        employeeId: '',
        name: 'Sign In Required',
        badgeNumber: '—',
        department: 'Shop Floor',
      };
    }
    let trainingRole: any = 'OPERATOR';
    if (authUser.roles.some((r) => r.module_code === 'SYSTEM_ADMIN' || r.role_code === 'ADMIN')) {
      trainingRole = 'ADMIN';
    } else if (authUser.roles.some((r) => r.role_code === 'SUPERVISOR')) {
      trainingRole = 'SUPERVISOR';
    } else if (authUser.roles.some((r) => r.role_code === 'TRAINER')) {
      trainingRole = 'TRAINER';
    }

    return {
      role: trainingRole,
      employeeId: authUser.person.id,
      name: `${authUser.person.first_name} ${authUser.person.last_name}`,
      badgeNumber: authUser.person.employee_number || '',
      department: authUser.person.job_title || authUser.person.operating_company,
    };
  }, [authUser]);

  // Database / Local Store Collections
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [trainings, setTrainings] = useState<TrainingModule[]>([]);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [qualifications, setQualifications] = useState<EquipmentQualification[]>([]);
  const [missingRequirements, setMissingRequirements] = useState<MissingRequirementItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals Open/Close States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  
  // Record Training Modal Props
  const [recordModalConfig, setRecordModalConfig] = useState<{
    isOpen: boolean;
    defaultEmployeeId?: string;
    defaultTrainingId?: string;
  }>({ isOpen: false });

  // Supervisor Sign-off Modal Props
  const [signoffModalConfig, setSignoffModalConfig] = useState<{
    isOpen: boolean;
    defaultEmployeeId?: string;
    defaultEquipmentId?: string;
  }>({ isOpen: false });

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load all system data
  const loadSystemData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [depts, emps, eqs, trns, recs, quals, reqs] = await Promise.all([
        fetchDepartments(),
        fetchEmployees(true),
        fetchEquipment(true),
        fetchTrainings(true),
        fetchTrainingRecords(),
        fetchEquipmentQualifications(),
        fetchTrainingRequirements()
      ]);

      setDepartments(depts);
      setEmployees(emps);
      setEquipment(eqs);
      setTrainings(trns);
      setRecords(recs);
      setQualifications(quals);

      const missing = calculateMissingRequirements(emps, quals, recs, reqs, trns);
      setMissingRequirements(missing);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load training system data:', err);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSystemData();
  }, [loadSystemData]);

  // Tab switch handler: auto-collapse header on phones when entering task views
  const handleTabSwitch = (tab: MainTab) => {
    setActiveTab(tab);
    setSelectedFileEmployee(null);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsHeaderCollapsed(true);
    }
  };

  const handleOpenRecordModal = (empId?: string, trnId?: string) => {
    setRecordModalConfig({
      isOpen: true,
      defaultEmployeeId: empId,
      defaultTrainingId: trnId
    });
  };

  const handleOpenSignoffModal = (empId?: string, eqId?: string) => {
    setSignoffModalConfig({
      isOpen: true,
      defaultEmployeeId: empId,
      defaultEquipmentId: eqId
    });
  };

  const handleRecordSaved = () => {
    loadSystemData();
    setToastMessage('Training record successfully committed to audit log.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSignoffSaved = () => {
    loadSystemData();
    setToastMessage('Supervisor sign-off successfully endorsed and updated.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectEmployeeFile = (emp: Employee) => {
    setSelectedFileEmployee(emp);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsHeaderCollapsed(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-base font-bold animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP COLLAPSIBLE ENTERPRISE HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        {/* Compact Bar (Always Visible, gives 1-click expand/collapse on mobile) */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-800 text-base">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-400" />
            <span className="font-extrabold tracking-wide text-base">
              NHI Mechanical Motion <span className="text-emerald-400 font-semibold">&bull; Training Hub</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Active user role chip */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="min-h-[44px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-base font-bold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              title={authUser ? `Logged in as ${currentUser.name} (${currentUser.role}). Click to switch or sign out.` : 'Click to sign in'}
            >
              <HardHat className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{currentUser.name}</span>
              <span className={`px-2 py-0.5 rounded-md text-sm font-bold ${
                authUser ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {authUser ? currentUser.role : 'Sign In'}
              </span>
            </button>

            {/* Header Collapse/Expand Toggle */}
            <button
              type="button"
              onClick={() => setIsHeaderCollapsed(prev => !prev)}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
              aria-label={isHeaderCollapsed ? 'Expand Header' : 'Collapse Header'}
            >
              {isHeaderCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>

            {/* Exit to Quality Compass */}
            {onExitToQualityCompass && (
              <button
                type="button"
                onClick={onExitToQualityCompass}
                className="min-h-[44px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                title="Return to CAD / Quality Compass"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline text-base font-semibold">Exit</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Action Bar (Hidden when collapsed) */}
        {!isHeaderCollapsed && (
          <div className="px-4 py-3 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 text-base animate-in slide-in-from-top-2 duration-150">
            <div className="text-base text-slate-400">
              ISO 9001:2015 Clause 7.2 Competency & Shop-Floor Qualification Engine
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(true)}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-base flex items-center gap-2 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                <span>Import CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="min-h-[44px] px-3.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-base flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-purple-400" />
                <span>Export ZIP</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenRecordModal()}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center gap-2 shadow-sm transition-colors active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>Record Training</span>
              </button>
            </div>
          </div>
        )}

        {/* 5-ITEM GLOBAL NAVIGATION BAR (Mandatory per Project Brief Rule 4) */}
        <nav className="px-2 sm:px-4 bg-slate-950 flex items-center justify-around sm:justify-start gap-1 sm:gap-2 overflow-x-auto py-1.5">
          <button
            type="button"
            onClick={() => handleTabSwitch('DASHBOARD')}
            className={`min-h-[48px] px-3 sm:px-5 rounded-xl font-bold text-base flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'DASHBOARD' && !selectedFileEmployee
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('MATRIX')}
            className={`min-h-[48px] px-3 sm:px-5 rounded-xl font-bold text-base flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'MATRIX' && !selectedFileEmployee
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
            <span>Skills Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('EMPLOYEES')}
            className={`min-h-[48px] px-3 sm:px-5 rounded-xl font-bold text-base flex items-center gap-2 transition-all shrink-0 ${
              (activeTab === 'EMPLOYEES' || selectedFileEmployee)
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Workers</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('EQUIPMENT')}
            className={`min-h-[48px] px-3 sm:px-5 rounded-xl font-bold text-base flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'EQUIPMENT' && !selectedFileEmployee
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-5 h-5" />
            <span>Work Centers</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('TRAININGS')}
            className={`min-h-[48px] px-3 sm:px-5 rounded-xl font-bold text-base flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'TRAININGS' && !selectedFileEmployee
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>Trainings</span>
          </button>
        </nav>
      </header>

      {/* MAIN VIEW CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-xl font-bold text-slate-700 dark:text-slate-300">
              Loading Shop-Floor Qualification Engine...
            </div>
          </div>
        ) : selectedFileEmployee ? (
          /* Single-Page Printable Training File Dossier */
          <EmployeeTrainingFileView
            employee={selectedFileEmployee}
            qualifications={qualifications}
            records={records}
            onBack={() => setSelectedFileEmployee(null)}
            onOpenSignoffModal={(empId, eqId) => handleOpenSignoffModal(empId, eqId)}
          />
        ) : (
          <>
            {activeTab === 'DASHBOARD' && (
              <TrainingDashboardView
                employees={employees}
                equipment={equipment}
                qualifications={qualifications}
                departments={departments}
                missingRequirements={missingRequirements}
                onOpenRecordModal={handleOpenRecordModal}
                onOpenSignoffModal={handleOpenSignoffModal}
                onSelectEmployeeFile={handleSelectEmployeeFile}
              />
            )}

            {activeTab === 'MATRIX' && (
              <SkillsMatrixView
                employees={employees}
                equipment={equipment}
                qualifications={qualifications}
                departments={departments}
                onOpenSignoffModal={handleOpenSignoffModal}
                onSelectEmployeeFile={handleSelectEmployeeFile}
              />
            )}

            {activeTab === 'EMPLOYEES' && (
              <EmployeeManagementView
                employees={employees}
                departments={departments}
                currentUserName={currentUser.name}
                onRefreshData={loadSystemData}
                onSelectEmployeeFile={handleSelectEmployeeFile}
              />
            )}

            {activeTab === 'EQUIPMENT' && (
              <EquipmentManagementView
                equipment={equipment}
                departments={departments}
                currentUserName={currentUser.name}
                onRefreshData={loadSystemData}
                onOpenSignoffModal={handleOpenSignoffModal}
              />
            )}

            {activeTab === 'TRAININGS' && (
              <TrainingCatalogView
                trainings={trainings}
                equipment={equipment}
                currentUserName={currentUser.name}
                onRefreshData={loadSystemData}
                onOpenRecordModal={handleOpenRecordModal}
              />
            )}
          </>
        )}
      </main>

      {/* POPUP MODALS */}
      <TrainingLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <RecordTrainingModal
        isOpen={recordModalConfig.isOpen}
        onClose={() => setRecordModalConfig({ isOpen: false })}
        employees={employees}
        trainings={trainings}
        defaultEmployeeId={recordModalConfig.defaultEmployeeId}
        defaultTrainingId={recordModalConfig.defaultTrainingId}
        currentUserName={currentUser.name}
        onRecordSaved={handleRecordSaved}
      />

      <SupervisorSignoffModal
        isOpen={signoffModalConfig.isOpen}
        onClose={() => setSignoffModalConfig({ isOpen: false })}
        employees={employees}
        equipment={equipment}
        defaultEmployeeId={signoffModalConfig.defaultEmployeeId}
        defaultEquipmentId={signoffModalConfig.defaultEquipmentId}
        currentSupervisorName={currentUser.name}
        onSignoffSaved={handleSignoffSaved}
      />

      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        currentUserName={currentUser.name}
        onImportSuccess={() => {
          loadSystemData();
          setToastMessage('CSV records imported successfully!');
          setTimeout(() => setToastMessage(null), 3500);
        }}
      />

      <AdminExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentUserName={currentUser.name}
      />
    </div>
  );
};
