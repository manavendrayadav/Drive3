import React, { useState, useMemo } from 'react';
import { ProcessedFile, FileCategory, AnalysisResult, SensitivityLevel } from '../types';
import { Check, X, ArrowRight, FolderOpen, Archive, FileText, Edit2, Save, AlertTriangle, ShieldAlert, Shield, Filter, CornerDownRight } from 'lucide-react';

interface Props {
  files: ProcessedFile[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
  onUpdate: (id: string, updates: Partial<AnalysisResult>) => void;
}

const CategoryBadge: React.FC<{ category?: FileCategory }> = ({ category }) => {
  const colors: Record<string, string> = {
    [FileCategory.WORK]: 'bg-blue-100 text-blue-700 border-blue-200',
    [FileCategory.PERSONAL]: 'bg-green-100 text-green-700 border-green-200',
    [FileCategory.FINANCE]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    [FileCategory.LEGAL]: 'bg-red-100 text-red-700 border-red-200',
    [FileCategory.PHOTOS_VIDEOS]: 'bg-purple-100 text-purple-700 border-purple-200',
    [FileCategory.ARCHIVE]: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const defaultColor = 'bg-gray-100 text-gray-600 border-gray-200';
  
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${category ? colors[category] || defaultColor : defaultColor}`}>
      {category?.split('_')[1] || 'Unknown'}
    </span>
  );
};

const SensitivityBadge: React.FC<{ level?: SensitivityLevel }> = ({ level }) => {
  if (!level || level === 'Normal') return null;

  if (level === 'High Risk') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded">
        <ShieldAlert size={10} /> HIGH RISK
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded">
      <Shield size={10} /> CONFIDENTIAL
    </span>
  );
};

export const ReviewTable: React.FC<Props> = ({ files, onApprove, onReject, onApproveAll, onUpdate }) => {
  const [filter, setFilter] = useState<'all' | 'needs_review' | 'archive' | 'sensitive'>('all');
  
  // Track editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{name: string, path: string}>({ name: '', path: '' });

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      if (f.status !== 'pending' && filter !== 'all') return false; 

      if (filter === 'needs_review') {
        return f.analysis?.reasoning.toLowerCase().includes('manual') || (f.analysis?.confidence || 1) < 0.8;
      }
      if (filter === 'archive') return f.analysis?.shouldArchive;
      if (filter === 'sensitive') return f.analysis?.sensitivity === 'High Risk' || f.analysis?.sensitivity === 'Confidential';
      return true;
    });
  }, [files, filter]);

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const sensitiveCount = files.filter(f => f.analysis?.sensitivity === 'High Risk' && f.status === 'pending').length;

  const startEdit = (file: ProcessedFile) => {
    if (file.analysis) {
      setEditingId(file.id);
      setEditForm({
        name: file.analysis.suggestedName,
        path: file.analysis.suggestedPath
      });
    }
  };

  const saveEdit = (id: string) => {
    onUpdate(id, {
      suggestedName: editForm.name,
      suggestedPath: editForm.path
    });
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Sticky Header */}
      <div className="border-b border-slate-100 bg-white sticky top-0 z-20">
        <div className="p-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Review Suggestions
              <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full border border-indigo-100">{pendingCount} Pending</span>
            </h2>
            <p className="text-xs text-slate-500">Approve Gemini's renaming and moves. Edit if needed.</p>
          </div>
          <div className="flex gap-3">
             {sensitiveCount > 0 && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-md text-xs font-bold border border-rose-100 animate-pulse">
                 <ShieldAlert size={14} /> {sensitiveCount} High Risk Files Detected
               </div>
             )}
            {pendingCount > 0 && (
              <button 
                 onClick={onApproveAll}
                 className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Check size={16} /> Approve All Pending
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex px-4 gap-6 text-sm font-medium text-slate-500">
           <button 
             onClick={() => setFilter('all')}
             className={`pb-3 border-b-2 transition-colors ${filter === 'all' ? 'border-indigo-600 text-indigo-700' : 'border-transparent hover:text-slate-700'}`}
           >
             All Files
           </button>
           <button 
             onClick={() => setFilter('needs_review')}
             className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${filter === 'needs_review' ? 'border-amber-500 text-amber-700' : 'border-transparent hover:text-slate-700'}`}
           >
             <AlertTriangle size={14} /> Needs Attention
           </button>
           <button 
             onClick={() => setFilter('archive')}
             className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${filter === 'archive' ? 'border-slate-500 text-slate-700' : 'border-transparent hover:text-slate-700'}`}
           >
             <Archive size={14} /> To Archive
           </button>
           <button 
             onClick={() => setFilter('sensitive')}
             className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${filter === 'sensitive' ? 'border-rose-500 text-rose-700' : 'border-transparent hover:text-slate-700'}`}
           >
             <Shield size={14} /> Sensitive Data
           </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 bg-slate-50/50">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 text-xs font-semibold text-slate-500 uppercase tracking-wider z-10 shadow-sm">
            <tr>
              <th className="p-4 border-b border-slate-200 w-[30%]">Original</th>
              <th className="p-4 border-b border-slate-200 w-8"><ArrowRight size={16} className="text-slate-300 mx-auto"/></th>
              <th className="p-4 border-b border-slate-200 w-[40%]">Gemini Proposal</th>
              <th className="p-4 border-b border-slate-200 w-[15%]">Taxonomy</th>
              <th className="p-4 border-b border-slate-200 text-right w-[15%]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredFiles.length === 0 ? (
               <tr>
                 <td colSpan={5} className="p-12 text-center text-slate-400">
                   <div className="flex flex-col items-center gap-2">
                     <Filter size={24} className="opacity-20" />
                     <p>No files match this filter.</p>
                   </div>
                 </td>
               </tr>
            ) : (
              filteredFiles.map((file) => {
              const isEditing = editingId === file.id;
              const isSensitive = file.analysis?.sensitivity === 'High Risk';
              const isRenamed = file.analysis?.suggestedName !== file.name;

              return (
                <tr key={file.id} className={`hover:bg-slate-50 transition-colors ${file.status !== 'pending' && !isEditing ? 'opacity-50 grayscale' : ''} ${isSensitive ? 'bg-rose-50/30' : ''}`}>
                  <td className="p-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded text-slate-500 mt-1">
                         <FileText size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-slate-700 truncate max-w-[200px]" title={file.name}>{file.name}</div>
                        <div className="text-xs text-slate-400 mt-1 flex gap-2">
                          <span>{new Date(file.lastModified).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{(file.size / 1024).toFixed(0)} KB</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4 align-top pt-6 text-center">
                     <ArrowRight size={16} className="text-slate-300 mx-auto"/>
                  </td>

                  <td className="p-4 align-top">
                    {isEditing ? (
                      <div className="space-y-2">
                         <input 
                           type="text" 
                           value={editForm.name}
                           onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                           className="w-full text-sm font-semibold text-indigo-700 border border-indigo-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
                         />
                         <div className="flex items-center gap-1.5">
                           <FolderOpen size={12} className="text-slate-400"/>
                           <input 
                             type="text" 
                             value={editForm.path}
                             onChange={(e) => setEditForm({...editForm, path: e.target.value})}
                             className="w-full text-xs text-slate-500 font-mono bg-slate-100 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-300"
                           />
                         </div>
                         <button 
                           onClick={() => saveEdit(file.id)}
                           className="text-xs bg-indigo-600 text-white px-3 py-1 rounded flex items-center gap-1 hover:bg-indigo-700"
                         >
                           <Save size={12} /> Save Changes
                         </button>
                      </div>
                    ) : (
                      <div className="space-y-1 group/edit">
                        <div className="flex items-start justify-between gap-2">
                          <div className={`text-sm font-semibold break-words flex items-center gap-2 ${isRenamed ? 'text-indigo-700' : 'text-slate-700'}`}>
                             {file.analysis?.suggestedName}
                             <SensitivityBadge level={file.analysis?.sensitivity} />
                          </div>
                          {file.status === 'pending' && (
                            <button 
                              onClick={() => startEdit(file)}
                              className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover/edit:opacity-100 transition-opacity"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                               <CornerDownRight size={12} className="text-slate-300" />
                               <div className="bg-slate-100 px-2 py-0.5 rounded inline-block break-all flex items-center gap-1.5">
                                 <FolderOpen size={12} className="flex-shrink-0 text-slate-400" />
                                 {file.analysis?.suggestedPath}
                               </div>
                           </div>
                        </div>

                        {file.analysis?.shouldArchive && (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-medium mt-1">
                            <Archive size={10} /> Recommended for Archive
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 italic mt-1 line-clamp-2">
                          "{file.analysis?.reasoning}"
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="p-4 align-top pt-6">
                    <CategoryBadge category={file.analysis?.category} />
                  </td>

                  <td className="p-4 text-right align-top pt-5">
                    {file.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => onReject(file.id)}
                          title="Reject"
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <X size={18} />
                        </button>
                        <button 
                          onClick={() => onApprove(file.id)}
                          title="Approve"
                          className="p-2 text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-full transition-colors bg-indigo-50"
                        >
                          <Check size={18} />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        file.status === 'approved' ? 'text-green-600 bg-green-50' : 
                        file.status === 'synced' ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' :
                        'text-red-600 bg-red-50'
                      }`}>
                        {file.status === 'synced' ? 'MOVED' : file.status.toUpperCase()}
                      </span>
                    )}
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
