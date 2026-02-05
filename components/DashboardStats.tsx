import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ProcessedFile, FileCategory, AppState } from '../types';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface Props {
  files: ProcessedFile[];
  appState: AppState;
}

export const DashboardStats: React.FC<Props> = ({ files, appState }) => {
  const hasFiles = files.length > 0;
  
  // Calculate stats
  const totalFiles = files.length;
  const approved = files.filter(f => f.status === 'approved').length;
  const organizedPercentage = hasFiles ? Math.round((approved / totalFiles) * 100) : 0;
  const highRiskCount = files.filter(f => f.analysis?.sensitivity === 'High Risk').length;
  
  // Category Breakdown
  const categoryCount = files.reduce((acc, file) => {
    const cat = file.analysis?.category || 'Unclassified';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(categoryCount).map(key => ({
    name: key.replace(/^\d+_/, ''),
    value: categoryCount[key]
  }));

  const COLORS = ['#3b82f6', '#10b981', '#10b981', '#ef4444', '#a855f7', '#eab308', '#64748b', '#94a3b8'];

  if (appState === AppState.IDLE) {
    return (
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="text-sm font-medium text-slate-500 mb-1">System Status</h3>
           <p className="text-2xl font-bold text-slate-800">Ready</p>
           <div className="mt-4 text-xs text-slate-400">Waiting for batch upload</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="text-sm font-medium text-slate-500 mb-1">Archive Policy</h3>
           <p className="text-2xl font-bold text-slate-800">2 Years+</p>
           <div className="mt-4 text-xs text-slate-400">Auto-detecting old projects</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="text-sm font-medium text-slate-500 mb-1">Renaming Style</h3>
           <p className="text-2xl font-bold text-slate-800">Professional</p>
           <div className="mt-4 text-xs text-slate-400">Human-readable, no robotic tone</div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Progress Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        <h3 className="text-sm font-medium text-slate-500 mb-2">Clean-up Progress</h3>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold text-slate-900">{organizedPercentage}%</span>
          <span className="text-sm text-slate-400 mb-1.5">organized</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${organizedPercentage}%` }}
          />
        </div>
      </div>

      {/* Count Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-medium text-slate-500 mb-2">Files Processed</h3>
         <div className="flex items-end gap-2">
          <span className="text-4xl font-bold text-slate-900">{totalFiles}</span>
          <span className="text-sm text-slate-400 mb-1.5">files in batch</span>
        </div>
        <div className="mt-4 flex gap-4 text-xs">
           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> {approved} Approved</div>
           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> {totalFiles - approved} Pending</div>
        </div>
      </div>

      {/* Risk Card */}
      <div className={`p-6 rounded-xl border shadow-sm ${highRiskCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-sm font-medium mb-2 ${highRiskCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>Compliance Scan</h3>
         <div className="flex items-end gap-2">
          {highRiskCount > 0 ? (
            <ShieldAlert className="text-rose-600 w-8 h-8 mb-1" />
          ) : (
            <ShieldCheck className="text-emerald-500 w-8 h-8 mb-1" />
          )}
          <span className={`text-4xl font-bold ${highRiskCount > 0 ? 'text-rose-900' : 'text-slate-900'}`}>{highRiskCount}</span>
          <span className={`text-sm mb-1.5 ${highRiskCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>risks found</span>
        </div>
        <div className={`mt-4 text-xs ${highRiskCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
           {highRiskCount > 0 ? 'Review sensitive files immediately.' : 'No PII or sensitive data detected.'}
        </div>
      </div>

      {/* Chart Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <h3 className="text-sm font-medium text-slate-500 mb-2">Taxonomy</h3>
        <div className="flex-1 min-h-[100px]">
           <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ fontSize: '12px', color: '#1e293b' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};