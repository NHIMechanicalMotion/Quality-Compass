import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  ExternalLink, 
  Video, 
  FileText, 
  Globe, 
  CheckCircle2, 
  X,
  Cpu,
  Clock
} from 'lucide-react';
import type { 
  TrainingModule, 
  Equipment, 
  TrainingCategory, 
  FrequencyType, 
  ResourceType 
} from '../../types/training';
import { saveTraining, saveTrainingResource } from '../../services/trainingService';

interface TrainingCatalogViewProps {
  trainings: TrainingModule[];
  equipment: Equipment[];
  currentUserName: string;
  onRefreshData: () => void;
  onOpenRecordModal: (empId?: string, trnId?: string) => void;
}

export const TrainingCatalogView: React.FC<TrainingCatalogViewProps> = ({
  trainings,
  equipment,
  currentUserName,
  onRefreshData,
  onOpenRecordModal
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Add / Edit Module Modal
  const [editingModule, setEditingModule] = useState<Partial<TrainingModule> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Add Resource Modal
  const [resourceTargetModule, setResourceTargetModule] = useState<TrainingModule | null>(null);
  const [newResourceTitle, setNewResourceTitle] = useState<string>('');
  const [newResourceType, setNewResourceType] = useState<ResourceType>('YOUTUBE');
  const [newResourceUrl, setNewResourceUrl] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filtered Modules
  const filteredTrainings = useMemo(() => {
    return trainings.filter(m => {
      const matchesCat = selectedCategory === 'ALL' || m.category === selectedCategory;
      const matchesSearch = !searchQuery ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCat && matchesSearch;
    });
  }, [trainings, selectedCategory, searchQuery]);

  const handleOpenAdd = () => {
    setEditingModule({
      code: `SOP-TRN-${Math.floor(100 + Math.random() * 900)}`,
      title: '',
      description: '',
      category: 'QUALITY',
      frequency_type: 'ANNUAL',
      custom_frequency_months: 12,
      passing_score: 80,
      status: 'ACTIVE'
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (mod: TrainingModule) => {
    setEditingModule({ ...mod });
    setIsEditModalOpen(true);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editingModule.title || !editingModule.code) return;

    try {
      setIsSubmitting(true);
      await saveTraining(editingModule, currentUserName);
      setIsSubmitting(false);
      setIsEditModalOpen(false);
      setEditingModule(null);
      setFeedback('Training module saved successfully.');
      setTimeout(() => setFeedback(null), 3000);
      onRefreshData();
    } catch (err: any) {
      setIsSubmitting(false);
      alert('Failed to save module: ' + err?.message);
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTargetModule || !newResourceTitle || !newResourceUrl) return;

    try {
      setIsSubmitting(true);
      await saveTrainingResource({
        training_id: resourceTargetModule.id,
        title: newResourceTitle,
        resource_type: newResourceType,
        url: newResourceUrl,
        is_required: true
      });
      setIsSubmitting(false);
      setResourceTargetModule(null);
      setNewResourceTitle('');
      setNewResourceUrl('');
      setFeedback('Resource linked successfully.');
      setTimeout(() => setFeedback(null), 3000);
      onRefreshData();
    } catch (err: any) {
      setIsSubmitting(false);
      alert('Failed to add resource: ' + err?.message);
    }
  };

  const getCategoryColor = (cat: TrainingCategory) => {
    switch (cat) {
      case 'OSHA': return 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300 border-rose-300';
      case 'QUALITY': return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300';
      case 'MACHINE': return 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300';
      case 'HR': default: return 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border-blue-300';
    }
  };

  const renderResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'YOUTUBE': return <Video className="w-4 h-4 text-rose-500" />;
      case 'PDF': return <FileText className="w-4 h-4 text-amber-500" />;
      case 'SHAREPOINT': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'WEB': default: return <Globe className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-600 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="min-h-[48px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="OSHA">OSHA & Safety</option>
              <option value="QUALITY">Quality & Metrology</option>
              <option value="MACHINE">Machine Standard Work</option>
              <option value="HR">HR & Enterprise</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search training..."
              className="w-full min-h-[48px] pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="min-h-[48px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center gap-2 shadow-sm shrink-0 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Add Training Module</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-base font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Training Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTrainings.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-base text-slate-500">
            No training modules found matching criteria.
          </div>
        ) : (
          filteredTrainings.map((mod) => (
            <div
              key={mod.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-base text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                      {mod.code}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-base font-bold border ${getCategoryColor(mod.category)}`}>
                      {mod.category}
                    </span>
                  </div>

                  <span className="text-base text-slate-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{mod.frequency_type}</span>
                  </span>
                </div>

                <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-3">
                  {mod.title}
                </h3>

                {mod.description && (
                  <p className="mt-2 text-base text-slate-600 dark:text-slate-400 line-clamp-2">
                    {mod.description}
                  </p>
                )}

                {mod.linked_equipment_name && (
                  <div className="mt-3 flex items-center gap-2 text-base text-indigo-700 dark:text-indigo-400 font-medium">
                    <Cpu className="w-4 h-4" />
                    <span>Linked Work Center: <strong>{mod.linked_equipment_name}</strong></span>
                  </div>
                )}

                {/* Multimodal Resources Box */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-base">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Training Guides & Media ({mod.resources?.length || 0}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setResourceTargetModule(mod)}
                      className="text-base font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Media</span>
                    </button>
                  </div>

                  {mod.resources && mod.resources.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {mod.resources.map((res) => (
                        <a
                          key={res.id}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-base text-slate-800 dark:text-slate-200 hover:text-blue-600 flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {renderResourceIcon(res.resource_type)}
                            <span className="font-medium truncate">{res.title}</span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0 ml-2" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-base text-slate-500 italic py-1">
                      No multimedia or video SOP linked yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(mod)}
                  className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-base flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenRecordModal(undefined, mod.id)}
                  className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Record Completion</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD / EDIT TRAINING MODULE MODAL */}
      {isEditModalOpen && editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingModule.id ? 'Edit Training Course' : 'Add New Training Course'}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveModule} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Course Code:
                  </label>
                  <input
                    type="text"
                    value={editingModule.code || ''}
                    onChange={(e) => setEditingModule({ ...editingModule, code: e.target.value })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                    required
                  />
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Category:
                  </label>
                  <select
                    value={editingModule.category || 'QUALITY'}
                    onChange={(e) => setEditingModule({ ...editingModule, category: e.target.value as TrainingCategory })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  >
                    <option value="OSHA">OSHA & Safety</option>
                    <option value="QUALITY">Quality & Metrology</option>
                    <option value="MACHINE">Machine Standard Work</option>
                    <option value="HR">HR & Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Course / SOP Title:
                </label>
                <input
                  type="text"
                  value={editingModule.title || ''}
                  onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                  placeholder="e.g. Lockout/Tagout (LOTO) Authorized Worker"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Description & Competency Criteria:
                </label>
                <textarea
                  rows={2}
                  value={editingModule.description || ''}
                  onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                  className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Frequency / Expiry:
                  </label>
                  <select
                    value={editingModule.frequency_type || 'ANNUAL'}
                    onChange={(e) => setEditingModule({ ...editingModule, frequency_type: e.target.value as FrequencyType })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  >
                    <option value="ONE_TIME">One-Time (No Expiry)</option>
                    <option value="ANNUAL">Annual (12 Months)</option>
                    <option value="BIENNIAL">Biennial (24 Months)</option>
                    <option value="TRIENNIAL">Triennial (36 Months)</option>
                    <option value="CUSTOM_MONTHS">Custom Months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    Linked Work Center:
                  </label>
                  <select
                    value={editingModule.linked_equipment_id || ''}
                    onChange={(e) => setEditingModule({ ...editingModule, linked_equipment_id: e.target.value || undefined })}
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  >
                    <option value="">None (General SOP)</option>
                    {equipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        [{eq.code}] {eq.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-md"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Training Module'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MULTIMEDIA RESOURCE MODAL */}
      {resourceTargetModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Add Resource Guide
              </h2>
              <button
                onClick={() => setResourceTargetModule(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-4">
              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Guide / Video Title:
                </label>
                <input
                  type="text"
                  value={newResourceTitle}
                  onChange={(e) => setNewResourceTitle(e.target.value)}
                  placeholder="e.g. Haas Setup Tutorial Video"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Media Type:
                </label>
                <select
                  value={newResourceType}
                  onChange={(e) => setNewResourceType(e.target.value as ResourceType)}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                >
                  <option value="YOUTUBE">YouTube Video</option>
                  <option value="SHAREPOINT">SharePoint Document</option>
                  <option value="PDF">PDF Manual</option>
                  <option value="WEB">Web Link / Article</option>
                </select>
              </div>

              <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Resource URL:
                </label>
                <input
                  type="url"
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                  <span>{isSubmitting ? 'Linking...' : 'Link Resource'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
