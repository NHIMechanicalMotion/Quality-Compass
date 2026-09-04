import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  GitBranch,
  ShieldCheck
} from 'lucide-react';
import { 
  fetchAllDrawingsFromSupabase, 
  fetchDrawingFromSupabase, 
  createNewRevisionInSupabase,
  saveFullDrawingToSupabase 
} from '../services/supabase';
import { PRELOADED_DRAWINGS } from '../data/sampleDrawings';
import type { TitleBlockMetadata } from '../types/cad';
import type { InspectionBalloon } from '../types/balloon';
import type { InspectionControlPlanItem, ChinaApprovalRecord } from '../types/inspection';

interface SupabaseRevisionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDrawingId: string;
  metadata: TitleBlockMetadata;
  balloons: InspectionBalloon[];
  items: InspectionControlPlanItem[];
  chinaApproval: ChinaApprovalRecord;
  complianceScore: number;
  auditStatus: string;
  onLoadDrawingData: (
    drawingId: string,
    metadata: TitleBlockMetadata,
    balloons: InspectionBalloon[],
    items: InspectionControlPlanItem[],
    chinaApproval: ChinaApprovalRecord
  ) => void;
}

export const SupabaseRevisionsModal: React.FC<SupabaseRevisionsModalProps> = ({
  isOpen,
  onClose,
  currentDrawingId,
  metadata,
  balloons,
  items,
  chinaApproval,
  complianceScore,
  auditStatus,
  onLoadDrawingData,
}) => {
  const [savedDrawings, setSavedDrawings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [newRevisionLetter, setNewRevisionLetter] = useState<string>('C');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDrawingsList = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchAllDrawingsFromSupabase();
      setSavedDrawings(data || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch drawings from Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDrawingsList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save current active drawing to Supabase
  const handleSaveCurrent = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await saveFullDrawingToSupabase(
        currentDrawingId,
        metadata,
        balloons,
        items,
        chinaApproval,
        complianceScore,
        auditStatus
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadDrawingsList();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error saving to Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  // Seed sample drawings to Supabase
  const handleSeedSamples = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      for (const sample of PRELOADED_DRAWINGS) {
        await saveFullDrawingToSupabase(
          sample.id,
          sample.metadata,
          sample.dimensions,
          [],
          chinaApproval,
          sample.id === 'drawing-defective' ? 25 : 94,
          sample.id === 'drawing-defective' ? 'FAILED_CRITICAL' : 'PASSED'
        );
      }
      await loadDrawingsList();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error seeding samples to Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  // Load a drawing revision from Supabase
  const handleLoadFromDb = async (drawingId: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchDrawingFromSupabase(drawingId);
      onLoadDrawingData(
        drawingId,
        data.metadata,
        data.balloons,
        data.items,
        data.chinaApproval
      );
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error loading drawing from Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new revision in Supabase
  const handleCreateNewRevision = async () => {
    if (!newRevisionLetter.trim()) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const result = await createNewRevisionInSupabase(currentDrawingId, newRevisionLetter.toUpperCase());
      onLoadDrawingData(
        result.newDrawingId,
        result.metadata,
        result.balloons,
        result.items,
        chinaApproval
      );
      await loadDrawingsList();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error creating revision in Supabase');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Supabase Cloud Database (Quality_Compass)
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                jggdqmygudsiueaiqzcn.supabase.co
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Actions Card */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-white mb-1">
                Active Drawing: {metadata.partName || 'Flange'} ({metadata.drawingNumber || 'DWG'})
              </h4>
              <p className="text-xs text-slate-400">
                Revision: <span className="font-mono text-blue-400 font-bold">Rev {metadata.revision}</span> | Balloons: <span className="font-mono text-emerald-400 font-bold">{balloons.length}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={isSaving}
                onClick={handleSaveCurrent}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                <span>Save to Supabase</span>
              </button>

              <button
                disabled={isSaving}
                onClick={handleSeedSamples}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
                title="Populate Supabase with all 4 built-in CAD drawing standards & balloons"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Seed Sample Drawings</span>
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {saveSuccess && (
            <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Drawing, dimension balloons, and inspection plan successfully synced with Supabase!</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Branch / Create New Revision Section */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold text-white">
                  Create New Revision from Active Drawing
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Clones all balloons & specs into a new revision index
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">New Revision Letter:</span>
                <input
                  type="text"
                  maxLength={3}
                  value={newRevisionLetter}
                  onChange={(e) => setNewRevisionLetter(e.target.value.toUpperCase())}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-center text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <button
                disabled={isSaving}
                onClick={handleCreateNewRevision}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Fork to Rev {newRevisionLetter}</span>
              </button>
            </div>
          </div>

          {/* Database Drawings List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold text-white">
                  Saved Drawings & Revisions in Supabase ({savedDrawings.length})
                </h4>
              </div>
              <button
                onClick={loadDrawingsList}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh List</span>
              </button>
            </div>

            {savedDrawings.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-500 text-xs">
                No drawings currently saved in Supabase database. Click "Save to Supabase" or "Seed Sample Drawings" above!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedDrawings.map((dwg) => (
                  <div
                    key={dwg.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono font-bold text-xs text-white">
                          {dwg.drawing_number}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                          Rev {dwg.revision}
                        </span>
                      </div>
                      <h5 className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {dwg.part_name}
                      </h5>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Score: {dwg.compliance_score || 100}%</span>
                      </div>

                      <button
                        onClick={() => handleLoadFromDb(dwg.id)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg font-semibold border border-blue-500/30 transition-colors"
                      >
                        <DownloadCloud className="w-3.5 h-3.5" />
                        <span>Load Drawing</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
