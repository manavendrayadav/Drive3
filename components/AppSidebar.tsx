import React from 'react';
import { Folder, HardDrive, Shield, Briefcase, User, DollarSign, Image, GraduationCap, Layout, Archive } from 'lucide-react';
import { FileCategory } from '../types';

const categories = [
  { id: FileCategory.WORK, label: 'Work', icon: Briefcase, color: 'text-blue-500' },
  { id: FileCategory.PERSONAL, label: 'Personal', icon: User, color: 'text-green-500' },
  { id: FileCategory.FINANCE, label: 'Finance', icon: DollarSign, color: 'text-emerald-600' },
  { id: FileCategory.LEGAL, label: 'Legal', icon: Shield, color: 'text-red-500' },
  { id: FileCategory.PHOTOS_VIDEOS, label: 'Media', icon: Image, color: 'text-purple-500' },
  { id: FileCategory.LEARNING, label: 'Learning', icon: GraduationCap, color: 'text-yellow-500' },
  { id: FileCategory.TEMPLATES, label: 'Templates', icon: Layout, color: 'text-gray-500' },
  { id: FileCategory.ARCHIVE, label: 'Archive', icon: Archive, color: 'text-slate-400' },
];

export const AppSidebar: React.FC = () => {
  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 h-screen flex flex-col hidden md:flex sticky top-0">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-lg shadow-lg">
          <HardDrive className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-lg leading-tight">Gemini Drive</h1>
          <p className="text-xs text-slate-500 font-medium">Pro Organizer</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">My Drive</p>
        {categories.map((cat) => (
          <div key={cat.id} className="group flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all cursor-pointer">
            <cat.icon className={`w-4 h-4 ${cat.color} opacity-75 group-hover:opacity-100`} />
            <span className="flex-1">{cat.label}</span>
            {cat.id === FileCategory.ARCHIVE && (
              <span className="bg-slate-200 text-slate-600 py-0.5 px-2 rounded-full text-[10px]">Auto</span>
            )}
          </div>
        ))}
        
        <div className="mt-8 px-3">
          <div className="bg-gradient-to-b from-indigo-50 to-white border border-indigo-100 rounded-xl p-4 text-center">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2 text-indigo-600">
              <Folder size={16} />
            </div>
            <h3 className="text-xs font-bold text-indigo-900 mb-1">Archivist Active</h3>
            <p className="text-[10px] text-indigo-600 leading-relaxed">
              Applying semantic analysis and lifecycle rules to your files.
            </p>
          </div>
        </div>
      </nav>
      
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Gemini 3 Pro Connected
        </div>
      </div>
    </div>
  );
};
