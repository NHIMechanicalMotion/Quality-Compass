import React, { useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckSquare, 
  Square, 
  FileText, 
  ThumbsUp 
} from 'lucide-react';
import type { TrainingLesson } from '../../data/mockTrainingData';
import { StatusBadge } from './StatusBadge';

interface TrainingModuleDetailViewProps {
  lesson: TrainingLesson;
  onBackToDashboard: () => void;
  onCompleteLesson: (lessonId: string) => void;
}

export const TrainingModuleDetailView: React.FC<TrainingModuleDetailViewProps> = ({
  lesson,
  onBackToDashboard,
  onCompleteLesson,
}) => {
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [isCompletedState, setIsCompletedState] = useState(false);

  const toggleStep = (stepNumber: number) => {
    setCheckedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  const allStepsChecked = lesson.steps.every((s) => !!checkedSteps[s.stepNumber]);

  const handleFinish = () => {
    setIsCompletedState(true);
    onCompleteLesson(lesson.id);
  };

  return (
    <div className="max-w-3xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBackToDashboard}
          className="min-h-[48px] px-5 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border-2 border-slate-600 text-white font-semibold text-base rounded-xl flex items-center gap-2.5 transition-colors focus:outline-none focus:ring-4 focus:ring-slate-500/50"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to My Training</span>
        </button>

        <span className="text-slate-400 text-base font-medium">
          Standard Work Guide
        </span>
      </div>

      {/* Lesson Header Card */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge
            status={isCompletedState ? 'QUALIFIED' : lesson.status}
            customText={isCompletedState ? 'Completed Just Now' : lesson.daysRemainingText}
            size="large"
          />
          <span className="text-slate-300 text-base font-medium flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-slate-400" />
            Estimated {lesson.durationMinutes} minutes
          </span>
          <span className="text-slate-400 text-base">
            &bull; {lesson.department}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
          {lesson.title}
        </h1>

        <p className="text-slate-200 text-base sm:text-lg leading-relaxed bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          {lesson.summary}
        </p>
      </div>

      {/* PPE Safety Box */}
      <div className="bg-amber-950/40 border-2 border-amber-500/80 rounded-2xl p-6 space-y-3 shadow-md">
        <h2 className="text-xl font-bold text-amber-200 flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
          <span>Required Personal Safety Gear (PPE)</span>
        </h2>
        <div className="space-y-2">
          {lesson.ppeRequired.map((ppe, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 text-base text-slate-100 bg-slate-900/80 border border-amber-500/30 rounded-lg p-3"
            >
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="font-medium">{ppe}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step by Step Work Instructions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-sky-400" />
            <span>Step-by-Step Training Instructions</span>
          </h2>
          <span className="text-slate-400 text-base">
            Tap step when done
          </span>
        </div>

        <div className="space-y-4">
          {lesson.steps.map((step) => {
            const isChecked = !!checkedSteps[step.stepNumber];
            return (
              <div
                key={step.stepNumber}
                onClick={() => toggleStep(step.stepNumber)}
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all shadow-md select-none ${
                  isChecked
                    ? 'bg-emerald-950/30 border-emerald-500'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    aria-label={`Mark step ${step.stepNumber} complete`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <Square className="w-7 h-7 text-slate-400" />
                    )}
                  </button>

                  <div className="space-y-2 flex-1 pt-1">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-md bg-slate-800 text-slate-200 font-bold text-base border border-slate-700">
                        Step {step.stepNumber}
                      </span>
                      <h3 className="text-xl font-bold text-white">
                        {step.title}
                      </h3>
                    </div>

                    <p className="text-slate-200 text-base sm:text-lg leading-relaxed">
                      {step.description}
                    </p>

                    {step.safetyCaution && (
                      <div className="mt-2 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/80 text-rose-200 text-base flex items-start gap-2.5 font-medium">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{step.safetyCaution}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion Action Bottom Bar */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
        {isCompletedState ? (
          <div className="bg-emerald-950/80 border-2 border-emerald-500 rounded-xl p-5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <ThumbsUp className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              Training Marked Complete!
            </h3>
            <p className="text-emerald-200 text-base">
              Your training record has been updated. A notification has been sent to your shift supervisor.
            </p>
            <button
              onClick={onBackToDashboard}
              className="min-h-[48px] px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-lg rounded-xl transition-colors shadow-md w-full sm:w-auto"
            >
              Return to My Training
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-slate-200 font-bold text-lg flex items-center gap-2">
                {allStepsChecked ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>All {lesson.steps.length} steps reviewed!</span>
                  </>
                ) : (
                  <span>Finished reviewing all steps?</span>
                )}
              </p>
              <p className="text-slate-400 text-base">
                {allStepsChecked
                  ? 'Ready to submit your training completion record.'
                  : 'You can check steps above as you go, or tap below when done.'}
              </p>
            </div>

            <button
              onClick={handleFinish}
              className="min-h-[48px] px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-400/50"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>Mark Lesson Completed</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
