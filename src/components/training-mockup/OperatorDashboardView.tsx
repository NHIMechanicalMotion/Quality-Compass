import React from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  BookOpen, 
  Award, 
  ChevronRight
} from 'lucide-react';
import type { OperatorRecord, TrainingLesson } from '../../data/mockTrainingData';
import { StatusBadge } from './StatusBadge';

interface OperatorDashboardViewProps {
  operator: OperatorRecord;
  onOpenTraining: (lesson: TrainingLesson) => void;
  onBackToHome: () => void;
}

export const OperatorDashboardView: React.FC<OperatorDashboardViewProps> = ({
  operator,
  onOpenTraining,
  onBackToHome,
}) => {
  const machineSkillsList = Object.values(operator.skills);
  const qualifiedMachines = machineSkillsList.filter((s) => s.level >= 2);

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      {/* Top Breadcrumb / Back Button */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBackToHome}
          className="min-h-[48px] px-5 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border-2 border-slate-600 text-white font-semibold text-base rounded-xl flex items-center gap-2.5 transition-colors focus:outline-none focus:ring-4 focus:ring-slate-500/50"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>

        <span className="text-slate-400 text-base font-medium">
          Task A: Operator View
        </span>
      </div>

      {/* Operator Identity Header */}
      <div className="bg-slate-900 border-2 border-sky-500/50 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-600/30 border-2 border-sky-400 flex items-center justify-center text-sky-200 text-2xl font-bold">
              {operator.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {operator.name}
                </h1>
                <span className="px-3 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-base">
                  Badge #{operator.badgeNumber}
                </span>
              </div>
              <p className="text-slate-300 text-base sm:text-lg mt-1">
                {operator.department} &bull; {operator.shift}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-xl px-4 py-2.5 text-center">
              <span className="block text-emerald-400 font-bold text-2xl">
                {qualifiedMachines.length}
              </span>
              <span className="text-emerald-200 font-medium text-base">
                Machines Qualified
              </span>
            </div>
            <div className="bg-amber-950/80 border border-amber-500/60 rounded-xl px-4 py-2.5 text-center">
              <span className="block text-amber-400 font-bold text-2xl">
                {operator.upcomingTrainings.length}
              </span>
              <span className="text-amber-200 font-medium text-base">
                Trainings Needed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: WHAT TRAINING I NEED TO DO NEXT */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Clock className="w-7 h-7 text-amber-400" />
              <span>What Training I Need Next</span>
            </h2>
            <p className="text-slate-300 text-base mt-0.5">
              Review and open any training that is due soon or overdue.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {operator.upcomingTrainings.map((lesson) => (
            <div
              key={lesson.id}
              className={`rounded-2xl p-6 border-2 transition-all shadow-lg ${
                lesson.status === 'EXPIRED'
                  ? 'bg-rose-950/40 border-rose-500'
                  : 'bg-amber-950/30 border-amber-500'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2.5 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge
                      status={lesson.status}
                      customText={lesson.daysRemainingText}
                      size="large"
                    />
                    <span className="text-slate-300 text-base flex items-center gap-1.5 font-medium">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      {lesson.dueDate}
                    </span>
                    <span className="text-slate-400 text-base">
                      &bull; Estimated {lesson.durationMinutes} minutes
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    {lesson.title}
                  </h3>

                  <p className="text-slate-200 text-base sm:text-lg leading-relaxed">
                    {lesson.summary}
                  </p>
                </div>

                {/* 48px Action Button */}
                <button
                  onClick={() => onOpenTraining(lesson)}
                  className="min-h-[48px] px-6 py-3.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-colors shadow-md shrink-0 w-full md:w-auto focus:outline-none focus:ring-4 focus:ring-amber-400/50"
                >
                  <BookOpen className="w-6 h-6" />
                  <span>Open Training Guide</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: WHICH MACHINES I AM QUALIFIED ON */}
      <section className="space-y-4 pt-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Award className="w-7 h-7 text-emerald-400" />
            <span>Which Machines I Am Qualified On</span>
          </h2>
          <p className="text-slate-300 text-base mt-0.5">
            Your certified equipment levels and recertification dates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {machineSkillsList
            .filter((skill) => skill.level > 0)
            .map((skill) => (
              <div
                key={skill.machineId}
                className="bg-slate-900 border-2 border-slate-700 hover:border-slate-500 rounded-2xl p-5 space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white">
                      {skill.machineName}
                    </h3>
                    <p className="text-slate-400 text-base">
                      {skill.department}
                    </p>
                  </div>
                  <StatusBadge
                    status={skill.status}
                    customText={skill.levelLabel}
                  />
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-base">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Certified By:</span>
                    <span className="font-medium text-white">{skill.certifiedBy}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Valid Through:</span>
                    <span className={`font-semibold ${skill.status === 'DUE_SOON' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {skill.expirationDate}
                    </span>
                  </div>
                  {skill.notes && (
                    <div className="pt-1.5 border-t border-slate-800 text-slate-300 text-base italic">
                      "{skill.notes}"
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
};
