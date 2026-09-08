import React, { useState, useEffect, useRef } from 'react';
import {
  Gauge,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import type {
  PpapSubmission,
  CapacityAnalysisData,
  CapacityDailyLog,
} from '../../types/apqpPpap';
import { updatePpapSubmission } from '../../services/apqpPpapSupabase';
import { exportPopulatedAiagPpapWorkbook } from '../../utils/aiagExcelService';
import { ActionTooltip } from '../common/ActionTooltip';

interface Props {
  submission: PpapSubmission;
  onSubmissionUpdated: (updated: PpapSubmission) => void;
}

const DEFAULT_CAPACITY_DATA: CapacityAnalysisData = {
  constraint_type: 'MACHINE',
  constraint_description: 'OP 30: 5-Axis Pinion Bore CNC Milling (Makino A61nx)',
  num_constraints: 2,
  shifts_per_day: 2,
  hours_per_shift: 7.5,
  daily_demand: 420,
  days_in_sample: 5,
  daily_logs: [
    { day_no: 1, date: '2026-03-02', workers: 2, hours_worked: 15.0, downtime_hours: 0.6, overtime_hours: 0.0, units_produced: 452, scrap_units: 4 },
    { day_no: 2, date: '2026-03-03', workers: 2, hours_worked: 15.0, downtime_hours: 0.4, overtime_hours: 0.0, units_produced: 460, scrap_units: 3 },
    { day_no: 3, date: '2026-03-04', workers: 2, hours_worked: 15.0, downtime_hours: 0.8, overtime_hours: 0.0, units_produced: 448, scrap_units: 5 },
    { day_no: 4, date: '2026-03-05', workers: 2, hours_worked: 15.0, downtime_hours: 0.5, overtime_hours: 0.0, units_produced: 455, scrap_units: 4 },
    { day_no: 5, date: '2026-03-06', workers: 2, hours_worked: 15.0, downtime_hours: 0.3, overtime_hours: 0.0, units_produced: 468, scrap_units: 2 },
  ],
};

export const PpapCapacityAnalysis: React.FC<Props> = ({
  submission,
  onSubmissionUpdated,
}) => {
  const [capacity, setCapacity] = useState<CapacityAnalysisData>(
    submission.capacity_data || DEFAULT_CAPACITY_DATA
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize when submission prop updates
  useEffect(() => {
    if (submission.capacity_data) {
      setCapacity(submission.capacity_data);
    }
  }, [submission.id, submission.capacity_data]);

  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const unitsInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const focusAndHighlightRow = (index: number, message?: string) => {
    setHighlightedIdx(index);
    if (message) {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 4000);
    }

    setTimeout(() => {
      rowRefs.current.get(index)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      unitsInputRefs.current.get(index)?.focus();
      unitsInputRefs.current.get(index)?.select();
    }, 80);

    setTimeout(() => {
      setHighlightedIdx(null);
    }, 2800);
  };

  // Math & Calculations based on AIAG 4th Edition Capacity Model
  const daysCount = capacity.daily_logs.length || 1;
  const totalGrossUnits = capacity.daily_logs.reduce((acc, l) => acc + (Number(l.units_produced) || 0), 0);
  const totalScrapUnits = capacity.daily_logs.reduce((acc, l) => acc + (Number(l.scrap_units) || 0), 0);
  const totalNetGoodUnits = totalGrossUnits - totalScrapUnits;

  const totalActualHours = capacity.daily_logs.reduce((acc, l) => acc + (Number(l.hours_worked) || 0), 0);
  const totalDowntimeHours = capacity.daily_logs.reduce((acc, l) => acc + (Number(l.downtime_hours) || 0), 0);
  const totalOvertimeHours = capacity.daily_logs.reduce((acc, l) => acc + (Number(l.overtime_hours) || 0), 0);

  // Available Hours per Day = Shifts * HoursPerShift
  const plannedHoursPerDay = (Number(capacity.shifts_per_day) || 2) * (Number(capacity.hours_per_shift) || 7.5);
  const constraintMultiplier = Number(capacity.num_constraints) || 1;
  const totalPlannedHoursPerDay = plannedHoursPerDay * constraintMultiplier;

  // Average actual operating hrs per day
  const avgActualHoursPerDay = totalActualHours / daysCount;
  const avgProductiveHoursPerDay = (totalActualHours - totalDowntimeHours + totalOvertimeHours) / daysCount;

  // Demonstrated Capacity (Units/Day) = Total Net Good Units / Days Count
  const demonstratedCapacityPerDay = daysCount > 0 ? Math.round((totalNetGoodUnits / daysCount) * 10) / 10 : 0;

  // Average Units per Hour worked = Total Net Good Units / Total Hours
  const avgUnitsPerHour = totalActualHours > 0 ? totalNetGoodUnits / totalActualHours : 0;
  const cycleTimeMinutesPerPart = avgUnitsPerHour > 0 ? 60 / avgUnitsPerHour : 0;
  const standardHoursPerPart = cycleTimeMinutesPerPart / 60;

  // Theoretical Capacity (Units/Day) = Total Planned Hours per Day / Standard Hours per Part
  const theoreticalCapacityPerDay =
    standardHoursPerPart > 0 ? Math.round(totalPlannedHoursPerDay / standardHoursPerPart) : 0;

  // Utilization & Downtime
  const downtimePct = totalActualHours > 0 ? (totalDowntimeHours / totalActualHours) * 100 : 0;
  const scrapRatePct = totalGrossUnits > 0 ? (totalScrapUnits / totalGrossUnits) * 100 : 0;
  const operatingUtilization = totalPlannedHoursPerDay > 0 ? avgProductiveHoursPerDay / totalPlannedHoursPerDay : 0;

  // Rated Capacity (Units/Day) = Demonstrated sustainable output adjusted for operating utilization
  const ratedCapacityPerDay =
    standardHoursPerPart > 0
      ? Math.round((avgProductiveHoursPerDay * operatingUtilization) / standardHoursPerPart) || demonstratedCapacityPerDay
      : demonstratedCapacityPerDay;

  // % of Rated Capacity Used = Daily Demand / Rated Capacity
  const dailyDemand = Number(capacity.daily_demand) || 420;
  const capacityUsedPct =
    ratedCapacityPerDay > 0 ? Math.round((dailyDemand / ratedCapacityPerDay) * 1000) / 10 : 0;

  // AIAG Decision Verdict:
  // < 85%: GOOD
  // 85% - 90%: Potential Problem
  // > 90%: NO / Insufficient Capacity
  let verdict: 'GOOD' | 'POTENTIAL_PROBLEM' | 'INSUFFICIENT' = 'GOOD';
  if (capacityUsedPct > 90) verdict = 'INSUFFICIENT';
  else if (capacityUsedPct >= 85) verdict = 'POTENTIAL_PROBLEM';

  const handleUpdateField = <K extends keyof CapacityAnalysisData>(
    field: K,
    val: CapacityAnalysisData[K]
  ) => {
    setCapacity((prev) => ({ ...prev, [field]: val }));
  };

  const handleUpdateDayLog = (idx: number, field: keyof CapacityDailyLog, val: number | string) => {
    const nextLogs = [...capacity.daily_logs];
    nextLogs[idx] = { ...nextLogs[idx], [field]: val };
    setCapacity((prev) => ({ ...prev, daily_logs: nextLogs, days_in_sample: nextLogs.length }));
  };

  const handleAddDay = () => {
    const nextDayNo = capacity.daily_logs.length + 1;
    if (nextDayNo > 14) {
      alert('AIAG R@R capacity template supports up to 14 sample production days.');
      return;
    }
    const lastDate = capacity.daily_logs[capacity.daily_logs.length - 1]?.date || '2026-03-06';
    const nextDateObj = new Date(lastDate);
    nextDateObj.setDate(nextDateObj.getDate() + 1);
    const nextDateStr = nextDateObj.toISOString().split('T')[0];

    const newLog: CapacityDailyLog = {
      day_no: nextDayNo,
      date: nextDateStr,
      workers: capacity.num_constraints || 2,
      hours_worked: (capacity.shifts_per_day || 2) * (capacity.hours_per_shift || 7.5),
      downtime_hours: 0.5,
      overtime_hours: 0.0,
      units_produced: Math.round(dailyDemand * 1.08),
      scrap_units: 3,
    };
    const nextLogs = [...capacity.daily_logs, newLog];
    const newIdx = nextLogs.length - 1;
    setCapacity((prev) => ({ ...prev, daily_logs: nextLogs, days_in_sample: nextLogs.length }));
    focusAndHighlightRow(newIdx, `✅ Added Run @ Rate Day ${nextDayNo}`);
  };

  const handleDeleteDay = async (idx: number) => {
    if (capacity.daily_logs.length <= 1) {
      alert('Capacity analysis requires at least 1 production run sample day.');
      return;
    }
    const target = capacity.daily_logs[idx];
    const nextLogs = capacity.daily_logs.filter((_, i) => i !== idx).map((l, i) => ({ ...l, day_no: i + 1 }));
    const updatedCapacity: CapacityAnalysisData = {
      ...capacity,
      daily_logs: nextLogs,
      days_in_sample: nextLogs.length,
    };
    setCapacity(updatedCapacity);
    setToastMessage(`Removed Day ${target?.day_no || idx + 1}`);

    try {
      const updated = await updatePpapSubmission(submission.id, {
        capacity_data: updatedCapacity,
      });
      onSubmissionUpdated(updated);
    } catch (err) {
      console.error('Failed to auto-save capacity day deletion:', err);
    }

    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAutoPopulateRunAtRate = () => {
    const baseTarget = Number(capacity.daily_demand) || 420;
    const stdHours = (Number(capacity.shifts_per_day) || 2) * (Number(capacity.hours_per_shift) || 7.5);
    const machines = Number(capacity.num_constraints) || 2;

    const sample5Days: CapacityDailyLog[] = [
      { day_no: 1, date: '2026-03-02', workers: machines, hours_worked: stdHours, downtime_hours: 0.6, overtime_hours: 0.0, units_produced: Math.round(baseTarget * 1.07), scrap_units: 4 },
      { day_no: 2, date: '2026-03-03', workers: machines, hours_worked: stdHours, downtime_hours: 0.4, overtime_hours: 0.0, units_produced: Math.round(baseTarget * 1.09), scrap_units: 3 },
      { day_no: 3, date: '2026-03-04', workers: machines, hours_worked: stdHours, downtime_hours: 0.8, overtime_hours: 0.0, units_produced: Math.round(baseTarget * 1.05), scrap_units: 5 },
      { day_no: 4, date: '2026-03-05', workers: machines, hours_worked: stdHours, downtime_hours: 0.5, overtime_hours: 0.0, units_produced: Math.round(baseTarget * 1.08), scrap_units: 4 },
      { day_no: 5, date: '2026-03-06', workers: machines, hours_worked: stdHours, downtime_hours: 0.3, overtime_hours: 0.0, units_produced: Math.round(baseTarget * 1.11), scrap_units: 2 },
    ];

    setCapacity((prev) => ({
      ...prev,
      days_in_sample: 5,
      daily_logs: sample5Days,
    }));
  };

  const handleSaveToSupabase = async () => {
    try {
      setIsSaving(true);
      const updatedSub: PpapSubmission = {
        ...submission,
        capacity_data: capacity,
      };
      const saved = await updatePpapSubmission(submission.id, {
        capacity_data: capacity,
      });
      onSubmissionUpdated({ ...updatedSub, ...saved });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save capacity data:', err);
      alert('Failed to save capacity data to Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const currentSubWithCapacity: PpapSubmission = {
        ...submission,
        capacity_data: capacity,
      };
      await exportPopulatedAiagPpapWorkbook(currentSubWithCapacity);
    } catch (err) {
      console.error('Export Excel failed:', err);
      alert(`Export error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-amber-500/60 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                AIAG Capacity Analysis & Run @ Rate (R@R)
              </h2>
              <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                APQP Phase 4 & PPAP Element 11/14
              </span>
              {JSON.stringify(capacity) !== JSON.stringify(submission.capacity_data || DEFAULT_CAPACITY_DATA) && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Unsaved Changes</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Constraint Workstation Validation, Sustainable Rated Output, and Customer Demand Headroom
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <ActionTooltip
            title="Generate 5-Day Sample"
            description="Auto-populates 5-day Run @ Rate production shifts with validated operational data."
            position="bottom"
            badge="Sample"
          >
            <button
              onClick={handleAutoPopulateRunAtRate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Generate 5-Day Sample</span>
            </button>
          </ActionTooltip>

          <ActionTooltip
            title="Export AIAG Excel Workbook"
            description="Downloads the 17-sheet PPAP Excel file with sheet 14 'Capacity' fully mapped with live formula evaluations."
            position="bottom"
            badge="Excel .xlsx"
          >
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isExportingExcel ? 'Exporting...' : 'Export to Excel (.xlsx)'}</span>
            </button>
          </ActionTooltip>

          <ActionTooltip
            title="Save Capacity Analysis"
            description="Persists constraint parameters and Run @ Rate daily logs to Supabase database."
            position="bottom"
            badge="Save"
          >
            <button
              onClick={handleSaveToSupabase}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                savedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : JSON.stringify(capacity) !== JSON.stringify(submission.capacity_data || DEFAULT_CAPACITY_DATA)
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30 font-extrabold ring-2 ring-emerald-400/40'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4 text-emerald-400" />}
              <span>{savedSuccess ? 'Saved to Supabase!' : isSaving ? 'Saving...' : JSON.stringify(capacity) !== JSON.stringify(submission.capacity_data || DEFAULT_CAPACITY_DATA) ? 'Save Capacity (Unsaved)' : 'Save Capacity'}</span>
            </button>
          </ActionTooltip>
        </div>
      </div>

      {/* AIAG Capacity KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Customer Daily Demand */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Customer Demand</span>
          <p className="text-xl font-mono font-bold text-cyan-300 mt-1">
            {dailyDemand.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pcs/day</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Contracted daily requirement</span>
        </div>

        {/* Card 2: Demonstrated Capacity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Demonstrated Output</span>
          <p className="text-xl font-mono font-bold text-white mt-1">
            {demonstratedCapacityPerDay.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pcs/day</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Avg {avgActualHoursPerDay.toFixed(1)} hrs/day operating
          </span>
        </div>

        {/* Card 3: Rated Capacity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Rated Capacity</span>
          <p className="text-xl font-mono font-bold text-indigo-300 mt-1">
            {ratedCapacityPerDay.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pcs/day</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Theoretical: {theoreticalCapacityPerDay.toLocaleString()} pcs/day
          </span>
        </div>

        {/* Card 4: Capacity Loading Ratio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">% Rated Cap. Loaded</span>
          <p
            className={`text-xl font-mono font-bold mt-1 ${
              capacityUsedPct < 85 ? 'text-emerald-400' : capacityUsedPct <= 90 ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            {capacityUsedPct}%
          </p>
          <div className="w-full bg-slate-950 h-1.5 rounded-full mt-1.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full ${
                capacityUsedPct < 85 ? 'bg-emerald-500' : capacityUsedPct <= 90 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(capacityUsedPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 5: AIAG Verdict */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 block">Sufficient Capacity?</span>
          <div className="flex items-center gap-2 mt-1">
            {verdict === 'GOOD' ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                GOOD (&lt;85%)
              </span>
            ) : verdict === 'POTENTIAL_PROBLEM' ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                WARNING (85-90%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-300 bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-md">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                NO (&gt;90%)
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">AIAG 4th Ed decision criteria</span>
        </div>

        {/* Card 6: Scrap & Cycle Time */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 block">Scrap & Downtime</span>
          <p className="text-xl font-mono font-bold text-amber-300 mt-1">
            {scrapRatePct.toFixed(2)}% <span className="text-xs text-slate-400 font-normal">scrap</span>
          </p>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
            Downtime: {downtimePct.toFixed(1)}% | {cycleTimeMinutesPerPart.toFixed(1)} min/part
          </span>
        </div>
      </div>

      {/* Operating Parameters Configuration Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Constraint Station & Shift Operating Parameters
          </h3>
          <span className="text-[11px] text-slate-400">
            Total Available: <strong className="text-cyan-300 font-mono">{totalPlannedHoursPerDay} hrs/day</strong> ({capacity.shifts_per_day} shifts × {capacity.hours_per_shift} hrs × {capacity.num_constraints} units)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          {/* Constraint Process Description */}
          <div className="sm:col-span-2">
            <label className="text-slate-400 block mb-1 font-medium">
              Constraint Process / Workstation Description
            </label>
            <input
              type="text"
              value={capacity.constraint_description}
              onChange={(e) => handleUpdateField('constraint_description', e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium outline-none focus:border-blue-500"
              placeholder="OP 30: Pinion Bore Milling"
            />
          </div>

          {/* Number of Constraint Units */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">
              Constraint Machines / Crew Size
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={capacity.num_constraints}
              onChange={(e) => handleUpdateField('num_constraints', Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono outline-none focus:border-blue-500"
            />
          </div>

          {/* Shifts per Day */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">
              Shifts per Workday
            </label>
            <select
              value={capacity.shifts_per_day}
              onChange={(e) => handleUpdateField('shifts_per_day', Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium outline-none focus:border-blue-500"
            >
              <option value={1} className="bg-slate-900">1 Shift / Day</option>
              <option value={2} className="bg-slate-900">2 Shifts / Day (Standard Automotive)</option>
              <option value={3} className="bg-slate-900">3 Shifts / Day (24-Hour Operation)</option>
            </select>
          </div>

          {/* Hours per Shift */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">
              Productive Hours / Shift (excl. lunch)
            </label>
            <input
              type="number"
              step={0.1}
              min={4}
              max={12}
              value={capacity.hours_per_shift}
              onChange={(e) => handleUpdateField('hours_per_shift', Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono outline-none focus:border-blue-500"
            />
          </div>

          {/* Daily Customer Demand */}
          <div className="sm:col-span-2">
            <label className="text-slate-400 block mb-1 font-medium">
              Contracted Daily Customer Demand (Parts/Day)
            </label>
            <input
              type="number"
              min={1}
              value={capacity.daily_demand}
              onChange={(e) => handleUpdateField('daily_demand', Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-cyan-300 font-bold font-mono outline-none focus:border-blue-500"
            />
          </div>

          {/* Constraint Type */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">
              Bottleneck Constraint Type
            </label>
            <select
              value={capacity.constraint_type}
              onChange={(e) => handleUpdateField('constraint_type', e.target.value as 'MACHINE' | 'LABOR')}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-medium outline-none focus:border-blue-500"
            >
              <option value="MACHINE" className="bg-slate-900">Machine / Tooling Bottleneck</option>
              <option value="LABOR" className="bg-slate-900">Labor / Assembly Crew Bottleneck</option>
            </select>
          </div>

          {/* Sample Run Days */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">
              Sample Days in Run @ Rate
            </label>
            <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 font-mono">
              {capacity.daily_logs.length} Days (Min 1, Max 14)
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Run @ Rate Production Log Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Daily Run @ Rate Validation Production Log
            </h3>
            <p className="text-[11px] text-slate-400">
              Recorded production logs during PPAP trial run. Mapped directly into Columns B through O in Excel.
            </p>
          </div>

          <ActionTooltip
            title="Add Production Day"
            description="Inserts a new sample production day log and scrolls directly into view."
            position="bottom"
            badge="Add Day"
          >
            <button
              onClick={handleAddDay}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Production Day</span>
            </button>
          </ActionTooltip>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                <th className="p-2.5 text-center w-12">Day</th>
                <th className="p-2.5 min-w-[130px]">Production Date</th>
                <th className="p-2.5 text-center min-w-[90px]">Active Units</th>
                <th className="p-2.5 text-center min-w-[100px]">Actual Hrs</th>
                <th className="p-2.5 text-center min-w-[100px]">Downtime Hrs</th>
                <th className="p-2.5 text-center min-w-[100px]">Overtime Hrs</th>
                <th className="p-2.5 text-center min-w-[120px]">Gross Output</th>
                <th className="p-2.5 text-center min-w-[100px]">Scrap Pcs</th>
                <th className="p-2.5 text-center min-w-[110px]">Net Good Pcs</th>
                <th className="p-2.5 text-center min-w-[100px]">Rate (Pcs/Hr)</th>
                <th className="p-2.5 text-center min-w-[90px]">Scrap %</th>
                <th className="p-2.5 text-center w-12">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {capacity.daily_logs.map((log, idx) => {
                const netUnits = (Number(log.units_produced) || 0) - (Number(log.scrap_units) || 0);
                const hrs = Number(log.hours_worked) || 0;
                const pcsPerHour = hrs > 0 ? (netUnits / hrs).toFixed(1) : '0';
                const dayScrapPct =
                  Number(log.units_produced) > 0
                    ? (((Number(log.scrap_units) || 0) / Number(log.units_produced)) * 100).toFixed(1)
                    : '0.0';
                const isHighlighted = highlightedIdx === idx;

                return (
                  <tr
                    key={log.day_no}
                    ref={(el) => {
                      if (el) rowRefs.current.set(idx, el);
                      else rowRefs.current.delete(idx);
                    }}
                    className={`transition-all duration-300 ${
                      isHighlighted
                        ? 'bg-amber-500/20 ring-2 ring-amber-400/80 shadow-lg'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="p-2.5 text-center font-bold text-amber-400">
                      Day {log.day_no}
                    </td>

                    <td className="p-2.5">
                      <input
                        type="date"
                        value={log.date}
                        onChange={(e) => handleUpdateDayLog(idx, 'date', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none w-full"
                      />
                    </td>

                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min={1}
                        value={log.workers}
                        onChange={(e) => handleUpdateDayLog(idx, 'workers', Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center w-16 outline-none"
                      />
                    </td>

                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        value={log.hours_worked}
                        onChange={(e) => handleUpdateDayLog(idx, 'hours_worked', Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center w-20 outline-none"
                      />
                    </td>

                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        value={log.downtime_hours}
                        onChange={(e) => handleUpdateDayLog(idx, 'downtime_hours', Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-amber-300 text-xs text-center w-20 outline-none"
                      />
                    </td>

                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        value={log.overtime_hours}
                        onChange={(e) => handleUpdateDayLog(idx, 'overtime_hours', Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs text-center w-20 outline-none"
                      />
                    </td>

                    <td className="p-2.5 text-center">
                      <input
                        ref={(el) => {
                          if (el) unitsInputRefs.current.set(idx, el);
                          else unitsInputRefs.current.delete(idx);
                        }}
                        type="number"
                        min={0}
                        value={log.units_produced}
                        onChange={(e) => handleUpdateDayLog(idx, 'units_produced', Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 focus:border-amber-500 rounded px-2 py-1 text-white font-bold text-xs text-center w-24 outline-none"
                      />
                    </td>

                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min={0}
                        value={log.scrap_units}
                        onChange={(e) => handleUpdateDayLog(idx, 'scrap_units', Number(e.target.value))}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-red-400 font-bold text-xs text-center w-16 outline-none"
                      />
                    </td>

                    <td className="p-2.5 text-center font-bold text-emerald-400">
                      {netUnits.toLocaleString()}
                    </td>

                    <td className="p-2.5 text-center text-slate-300">
                      {pcsPerHour}
                    </td>

                    <td className="p-2.5 text-center text-amber-400">
                      {dayScrapPct}%
                    </td>

                    <td className="p-2.5 text-center">
                      <ActionTooltip
                        title="Delete Day"
                        description="Removes this sample production day from the capacity analysis study."
                        position="left"
                        badge="Delete"
                      >
                        <button
                          type="button"
                          onClick={() => handleDeleteDay(idx)}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </ActionTooltip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-950 text-white font-bold border-t border-slate-700 text-xs">
                <td colSpan={3} className="p-2.5 text-right uppercase text-slate-400">
                  Sample Totals / Averages:
                </td>
                <td className="p-2.5 text-center text-cyan-300 font-mono">
                  {totalActualHours.toFixed(1)} hrs
                </td>
                <td className="p-2.5 text-center text-amber-400 font-mono">
                  {totalDowntimeHours.toFixed(1)} hrs
                </td>
                <td className="p-2.5 text-center text-slate-400 font-mono">
                  {totalOvertimeHours.toFixed(1)} hrs
                </td>
                <td className="p-2.5 text-center text-white font-mono">
                  {totalGrossUnits.toLocaleString()}
                </td>
                <td className="p-2.5 text-center text-red-400 font-mono">
                  {totalScrapUnits}
                </td>
                <td className="p-2.5 text-center text-emerald-400 font-mono">
                  {totalNetGoodUnits.toLocaleString()}
                </td>
                <td className="p-2.5 text-center text-cyan-300 font-mono">
                  {avgUnitsPerHour.toFixed(1)}
                </td>
                <td className="p-2.5 text-center text-amber-400 font-mono">
                  {scrapRatePct.toFixed(2)}%
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Full-Width Action Button */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800">
          <ActionTooltip
            title="Add Production Day"
            description="Appends a new sample production day log and scrolls into view."
            position="top"
            badge="Add"
          >
            <button
              onClick={handleAddDay}
              className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-amber-500/80 hover:bg-amber-600/10 text-slate-400 hover:text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Add Production Day (Run @ Rate)</span>
            </button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
};
