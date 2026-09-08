import React, { useState } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Plus, 
  ListChecks, 
  Award,
  X
} from 'lucide-react';
import type { 
  QmsManagementReview, 
  ManagementReviewAction,
  ReviewActionStatus,
  ReviewActionPriority 
} from '../../types/qms';

interface Props {
  reviews: QmsManagementReview[];
  onAddReview: (review: Partial<QmsManagementReview>) => Promise<void>;
  onAddAction: (action: Partial<ManagementReviewAction>) => Promise<void>;
  onUpdateActionStatus: (actionId: string, status: ReviewActionStatus) => Promise<void>;
}

export const QmsManagementReviewComponent: React.FC<Props> = ({
  reviews,
  onAddReview,
  onAddAction,
  onUpdateActionStatus,
}) => {
  const [selectedReviewId, setSelectedReviewId] = useState<string>(reviews[0]?.id || '');
  const [isAddReviewModalOpen, setIsAddReviewModalOpen] = useState(false);
  const [isAddActionModalOpen, setIsAddActionModalOpen] = useState(false);

  const selectedReview = reviews.find(r => r.id === selectedReviewId) || reviews[0];

  // New Review Form State
  const [newReview, setNewReview] = useState<Partial<QmsManagementReview>>(() => ({
    review_code: `MR-2026-Q${Math.min(4, Math.floor(reviews.length + 1))}`,
    title: `2026 Q${Math.min(4, Math.floor(reviews.length + 1))} Executive Quality Management Review`,
    review_period: `Q${Math.min(4, Math.floor(reviews.length + 1))} 2026`,
    meeting_date: new Date().toISOString().slice(0, 10),
    facilitator: 'Sarah Jenkins (QA VP)',
    attendees: ['COO', 'QA VP', 'VP Engineering', 'Plant Manager', 'Chief Auditor'],
    status: 'CONDUCTED',
    summary_notes: 'Reviewed QMS suitability, resource adequacy, and First Article inspection yield. Approved next-generation CMM fixture acquisition.',
    inputs_evaluated: [
      { clause: '9.3.2.a', topic: 'Actions from previous management reviews', status: 'CONFORMING', notes: 'All prior review action items closed.' },
      { clause: '9.3.2.b', topic: 'Changes in external & internal context', status: 'CONFORMING', notes: 'Supply chain dual-sourcing active.' },
      { clause: '9.3.2.c.1', topic: 'Customer satisfaction & complaints', status: 'EXCELLENT', notes: 'Customer rating 97.4% YTD.' },
      { clause: '9.3.2.c.2', topic: 'Quality objectives & KPIs', status: 'CONFORMING', notes: 'Scrap at 1.12% vs target 1.5%.' },
      { clause: '9.3.2.c.4', topic: 'Nonconformities and CAPAs (8D)', status: 'CONFORMING', notes: 'Average MTTR 18.2 days.' },
      { clause: '9.3.2.c.6', topic: 'Audit results (Internal & External)', status: 'CONFORMING', notes: 'Internal audit scored 96%.' },
      { clause: '9.3.2.d', topic: 'Adequacy of resources', status: 'CONFORMING', notes: 'Tooling budget increased by 15%.' },
    ],
  }));

  // New Action Form State
  const [newAction, setNewAction] = useState<Partial<ManagementReviewAction>>(() => ({
    action_description: '',
    owner: '',
    due_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    priority: 'MEDIUM',
    status: 'OPEN',
  }));

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.title || !newReview.facilitator) return;
    await onAddReview(newReview);
    setIsAddReviewModalOpen(false);
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAction.action_description || !newAction.owner || !selectedReview) return;
    await onAddAction({ ...newAction, review_id: selectedReview.id });
    setIsAddActionModalOpen(false);
    setNewAction({
      action_description: '',
      owner: '',
      due_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      priority: 'MEDIUM',
      status: 'OPEN',
    });
  };

  const actions = selectedReview?.actions || [];
  const completedActions = actions.filter(a => a.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" />
            ISO 9001:2015 Clause 9.3 Management Review
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Top management review of QMS suitability, resource adequacy, quality policy alignment, and improvement actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddReviewModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Schedule / Log Review Meeting
          </button>
        </div>
      </div>

      {/* Review Session Selector Carousel */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {reviews.map((rev) => {
          const isSelected = rev.id === selectedReview?.id;
          return (
            <div
              key={rev.id}
              onClick={() => setSelectedReviewId(rev.id)}
              className={`p-4 rounded-xl cursor-pointer border min-w-[260px] transition-all ${
                isSelected
                  ? 'bg-slate-800/90 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {rev.review_code}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  rev.status === 'COMPLETED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  {rev.status}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate">{rev.title}</h4>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>{rev.meeting_date}</span>
                <span>{rev.actions?.length || 0} Action Items</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedReview ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: ISO 9.3 Required Input Evaluation Matrix */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-emerald-400" />
                    Clause 9.3.2 Mandatory Inputs Evaluation
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Formal top management review across all 7 required ISO 9001:2015 input dimensions.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                  {selectedReview.inputs_evaluated.length} Clauses Evaluated
                </span>
              </div>

              {/* Review Inputs List */}
              <div className="space-y-2.5">
                {selectedReview.inputs_evaluated.map((input, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {input.clause}
                        </span>
                        <span className="text-xs font-bold text-white">{input.topic}</span>
                      </div>
                      <p className="text-xs text-slate-300 pl-1">{input.notes}</p>
                    </div>

                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 self-start ${
                      input.status === 'EXCELLENT'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : input.status === 'CONFORMING'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {input.status}
                    </span>
                  </div>
                ))}
              </div>

              {selectedReview.summary_notes && (
                <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <strong className="text-white block mb-1">Top Management Executive Summary & Strategic Directives:</strong>
                  {selectedReview.summary_notes}
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Clause 9.3.3 Output Action Registry */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-400" />
                    Review Action Items (Outputs)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assigned improvement directives & resource allocations.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddActionModalOpen(true)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Action
                </button>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Progress: <strong className="text-white">{completedActions.length}/{actions.length} Closed</strong></span>
                <span className="text-emerald-400 font-bold">
                  {actions.length > 0 ? Math.round((completedActions.length / actions.length) * 100) : 100}%
                </span>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {actions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
                    No open action items required for this review period.
                  </div>
                ) : (
                  actions.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs text-slate-200 font-medium">
                          {act.action_description}
                        </p>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          act.priority === 'HIGH'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {act.priority}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                        <span>Owner: <strong className="text-slate-300">{act.owner}</strong></span>
                        <span>Due: {act.due_date}</span>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => onUpdateActionStatus(
                            act.id, 
                            act.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED'
                          )}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors ${
                            act.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {act.status === 'COMPLETED' ? 'Closed' : 'Mark Complete'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4 text-xs text-slate-400">
              Facilitator: <strong className="text-slate-200">{selectedReview.facilitator}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">No Management Review sessions logged yet.</div>
      )}

      {/* Modal: Schedule Review */}
      {isAddReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Schedule / Record Management Review
              </h3>
              <button onClick={() => setIsAddReviewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Review Code</label>
                  <input
                    type="text"
                    value={newReview.review_code}
                    onChange={(e) => setNewReview({ ...newReview, review_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Review Period</label>
                  <input
                    type="text"
                    value={newReview.review_period}
                    onChange={(e) => setNewReview({ ...newReview, review_period: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Meeting Title</label>
                <input
                  type="text"
                  value={newReview.title}
                  onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Meeting Date</label>
                  <input
                    type="date"
                    value={newReview.meeting_date}
                    onChange={(e) => setNewReview({ ...newReview, meeting_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Facilitator</label>
                  <input
                    type="text"
                    value={newReview.facilitator}
                    onChange={(e) => setNewReview({ ...newReview, facilitator: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Executive Summary & Decisions</label>
                <textarea
                  rows={3}
                  value={newReview.summary_notes || ''}
                  onChange={(e) => setNewReview({ ...newReview, summary_notes: e.target.value })}
                  placeholder="Summary of quality objectives, policy confirmation, and resource decisions..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddReviewModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold shadow-lg shadow-emerald-500/20"
                >
                  Save to Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Review Action */}
      {isAddActionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Add Management Review Action Item
              </h3>
              <button onClick={() => setIsAddActionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-medium">Action Directive Description</label>
                <textarea
                  rows={3}
                  placeholder="Specify improvement action, resource request, or procedural change..."
                  value={newAction.action_description}
                  onChange={(e) => setNewAction({ ...newAction, action_description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Assigned Owner</label>
                  <input
                    type="text"
                    placeholder="e.g. David Chen"
                    value={newAction.owner}
                    onChange={(e) => setNewAction({ ...newAction, owner: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1 font-medium">Priority</label>
                  <select
                    value={newAction.priority}
                    onChange={(e) => setNewAction({ ...newAction, priority: e.target.value as ReviewActionPriority })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-medium">Target Completion Date</label>
                <input
                  type="date"
                  value={newAction.due_date}
                  onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddActionModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-semibold shadow-lg shadow-emerald-500/20"
                >
                  Add Directive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
