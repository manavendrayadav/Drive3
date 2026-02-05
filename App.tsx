import React, { useState, useEffect } from 'react';
import { AppSidebar } from './components/AppSidebar';
import { FileUploader } from './components/FileUploader';
import { DriveSelector } from './components/DriveSelector';
import { ReviewTable } from './components/ReviewTable';
import { DashboardStats } from './components/DashboardStats';
import { analyzeFilesBatch } from './services/geminiService';
import { ensureFolderPath, applyFileUpdate } from './services/driveService';
import { AppState, DriveFile, ProcessedFile, AnalysisResult } from './types';
import { Loader2, Sparkles, CheckCircle2, Play, HardDrive, Key, ChevronRight, LogOut, Info, UploadCloud, RefreshCw } from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // 'upload' | 'drive'
  const [sourceMode, setSourceMode] = useState<'upload' | 'drive'>('drive'); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check for stored session on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
    setIsLoadingSession(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim().length > 10) {
      const key = inputKey.trim();
      setApiKey(key);
      localStorage.setItem('gemini_api_key', key);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey(null);
    setInputKey('');
    setFiles([]);
    setAppState(AppState.IDLE);
  };

  const handleFilesSelected = async (selectedFiles: DriveFile[]) => {
    setFiles(selectedFiles.map(f => ({ ...f, status: 'pending' })));
    setAppState(AppState.ANALYZING);
    setError(null);

    try {
      if (!apiKey) throw new Error("Session expired. Please sign in again.");
      
      const analysisResults = await analyzeFilesBatch(selectedFiles, apiKey);
      setFiles(prev => prev.map(f => {
        const result = analysisResults.find(r => r.fileId === f.id);
        return result ? { ...f, analysis: result } : f;
      }));
      setAppState(AppState.REVIEW);
    } catch (err) {
      console.error(err);
      setError("Gemini failed to analyze the files. Please ensure your API key is valid.");
      setAppState(AppState.IDLE);
    }
  };

  const handleApprove = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'approved' } : f));
  };

  const handleReject = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'rejected' } : f));
  };

  const handleApproveAll = () => {
    setFiles(prev => prev.map(f => f.status === 'pending' ? { ...f, status: 'approved' } : f));
  };

  const handleUpdateAnalysis = (id: string, updates: Partial<AnalysisResult>) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id && f.analysis) {
        return {
          ...f,
          analysis: { ...f.analysis, ...updates }
        };
      }
      return f;
    }));
  };

  const handleSyncToDrive = async () => {
    if (sourceMode === 'upload') {
        alert("Cannot sync uploaded local files back to Google Drive directly. This feature works with 'Connect Drive' mode.");
        return;
    }

    const approvedFiles = files.filter(f => f.status === 'approved');
    if (approvedFiles.length === 0) return;

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: approvedFiles.length });

    for (let i = 0; i < approvedFiles.length; i++) {
        const file = approvedFiles[i];
        if (!file.analysis) continue;

        try {
            // 1. Resolve path to a folder ID
            let targetFolderId = undefined;
            if (file.analysis.suggestedPath && file.analysis.suggestedPath !== '/' && file.analysis.suggestedPath !== '.') {
                targetFolderId = await ensureFolderPath(file.analysis.suggestedPath);
            }

            // 2. Apply updates
            await applyFileUpdate(file.id, file.analysis.suggestedName, file.parents, targetFolderId);

            // 3. Mark synced
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'synced' } : f));

        } catch (err) {
            console.error("Sync error for file", file.name, err);
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'error' } : f));
        }
        setSyncProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsSyncing(false);
    
    // Check if we are done
    setTimeout(() => {
         if (confirm("Sync Complete! Start a new batch?")) {
             setFiles([]);
             setAppState(AppState.IDLE);
         }
    }, 500);
  };

  const handleReset = () => {
    setFiles([]);
    setAppState(AppState.IDLE);
  };

  // Loading Screen
  if (isLoadingSession) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Login Screen
  if (!apiKey) {
    return (
        <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <HardDrive className="text-white w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Gemini Drive</h1>
                <p className="text-slate-500 mb-6">
                    Sign in with your Free Tier API Key to start organizing.
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-left text-xs text-blue-800">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>
                      <strong>No Credit Card Required:</strong> Google provides a generous Free Tier for the Gemini API. This is separate from "Gemini Advanced".
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="relative text-left">
                    <label className="text-xs font-bold text-slate-700 ml-1 mb-1 block">API KEY</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                        type="password" 
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        placeholder="Paste key starting with AIza..." 
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={inputKey.length < 10}
                    className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    Start Session <ChevronRight size={16} />
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                        Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline">Get a free key from Google AI Studio</a>
                    </p>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <AppSidebar />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Sync Overlay */}
        {isSyncing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full text-center">
                    <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">Applying Changes to Drive</h3>
                    <p className="text-sm text-slate-500 mb-6">Creating folders and moving files...</p>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-indigo-600 h-full transition-all duration-300" 
                            style={{width: `${(syncProgress.current / syncProgress.total) * 100}%`}}
                        ></div>
                    </div>
                    <div className="mt-2 text-xs text-indigo-600 font-mono">
                        {syncProgress.current} / {syncProgress.total} processed
                    </div>
                </div>
            </div>
        )}

        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
             <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
             {appState === AppState.REVIEW && (
               <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-md font-medium border border-indigo-100">
                 Batch Active
               </span>
             )}
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200 text-green-700">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-bold">
                  Free Tier Active
                </span>
             </div>
             
             <button 
               onClick={handleLogout} 
               className="flex items-center gap-2 text-slate-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium"
               title="Sign Out"
             >
                <LogOut size={14} /> Sign Out
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto h-full flex flex-col">
            
            <DashboardStats files={files} appState={appState} />

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            {/* View: IDLE */}
            {appState === AppState.IDLE && (
              <div className="flex-1 flex flex-col justify-center pb-20">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-3">Drive Hygiene: Critical</h1>
                  <p className="text-slate-500 max-w-lg mx-auto">
                    Select a source to begin the classification and clean-up sequence.
                  </p>
                </div>

                <div className="flex justify-center mb-8 gap-4">
                   <button 
                     onClick={() => setSourceMode('drive')}
                     className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${sourceMode === 'drive' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                   >
                     <HardDrive size={20} /> Connect Drive
                   </button>
                   <button 
                     onClick={() => setSourceMode('upload')}
                     className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${sourceMode === 'upload' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                   >
                     <UploadCloud size={20} /> Upload Files
                   </button>
                </div>

                {sourceMode === 'upload' ? (
                   <FileUploader onFilesSelected={handleFilesSelected} />
                ) : (
                   <DriveSelector apiKey={apiKey} onFilesSelected={handleFilesSelected} />
                )}
              </div>
            )}

            {/* View: ANALYZING */}
            {appState === AppState.ANALYZING && (
              <div className="flex-1 flex flex-col items-center justify-center pb-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-25"></div>
                  <div className="w-20 h-20 bg-white border-4 border-blue-100 rounded-full flex items-center justify-center relative z-10 shadow-sm">
                    <Sparkles className="text-blue-600 w-8 h-8 animate-pulse" />
                  </div>
                </div>
                <h3 className="mt-8 text-xl font-bold text-slate-800">Gemini is thinking...</h3>
                <p className="text-slate-500 mt-2">Reading contents, determining taxonomy, and humanizing filenames.</p>
                
                <div className="mt-8 max-w-md w-full bg-white rounded-lg p-4 border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Loader2 size={16} className="animate-spin text-blue-500"/> Fetching file content from Drive
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 opacity-75">
                    <Loader2 size={16} className="animate-spin text-blue-500"/> Checking against "Phase 2" Prompt
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600 opacity-50">
                    <Loader2 size={16} className="animate-spin text-blue-500"/> Generating structured JSON
                  </div>
                </div>
              </div>
            )}

            {/* View: REVIEW */}
            {appState === AppState.REVIEW && (
              <div className="flex-1 flex flex-col min-h-0">
                <ReviewTable 
                  files={files} 
                  onApprove={handleApprove} 
                  onReject={handleReject} 
                  onApproveAll={handleApproveAll}
                  onUpdate={handleUpdateAnalysis}
                />
                <div className="mt-6 flex justify-between items-center bg-slate-100 p-4 rounded-lg">
                   <p className="text-sm text-slate-500">
                     Reviewing batch {files.length} files. {files.every(f => f.status !== 'pending') ? "Ready to Sync." : "Pending user approval."}
                   </p>
                   <div className="flex gap-3">
                      {/* Standard Finish Button */}
                      {files.every(f => f.status !== 'pending') && sourceMode === 'drive' && (
                        <button 
                          onClick={handleSyncToDrive}
                          className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-100"
                        >
                          <RefreshCw size={18} /> Apply Changes to Drive
                        </button>
                      )}

                      {files.every(f => f.status !== 'pending') && sourceMode === 'upload' && (
                        <button 
                          onClick={handleReset}
                          className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle2 size={18} /> Finish (Simulation Only)
                        </button>
                      )}

                      {/* Streamlined Button */}
                      {files.some(f => f.status === 'pending') && (
                        <button 
                          onClick={handleApproveAll}
                          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                          <Play size={18} fill="currentColor" /> Approve All
                        </button>
                      )}
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
