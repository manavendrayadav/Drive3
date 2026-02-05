import React, { useState, useEffect } from 'react';
import { HardDrive, Search, Folder, FileText, CheckCircle2, ChevronRight, AlertTriangle, RefreshCw, ChevronLeft, Home, LogOut, Info } from 'lucide-react';
import { initGapi, initGis, requestAccessToken, listDriveFiles, getFileContent } from '../services/driveService';
import { DriveFile } from '../types';

interface Props {
  apiKey: string;
  onFilesSelected: (files: DriveFile[]) => void;
}

interface FolderStackItem {
  id: string;
  name: string;
}

export const DriveSelector: React.FC<Props> = ({ apiKey, onFilesSelected }) => {
  // Initialize with persisted ID or Environment variable if available
  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem('google_client_id') || process.env.GOOGLE_CLIENT_ID || '';
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Navigation State
  const [folderStack, setFolderStack] = useState<FolderStackItem[]>([{ id: 'root', name: 'My Drive' }]);

  const currentFolder = folderStack[folderStack.length - 1];

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    const cleanClientId = clientId.trim();

    try {
      // Step 1: Init GAPI (Without API Key, relying on OAuth)
      await initGapi();
      
      // Step 2: Init GIS (OAuth)
      await initGis(cleanClientId);
      
      // Step 3: Trigger Popup & Set Token
      await requestAccessToken();
      
      // Persist the working Client ID
      localStorage.setItem('google_client_id', cleanClientId);
      
      setIsConnected(true);
      fetchFiles('root');
    } catch (err: any) {
      console.error(err);
      
      let msg = "Connection failed.";
      const errStr = JSON.stringify(err);

      if (err instanceof Error) {
         msg = err.message;
      } 
      
      // Specific handlers for common configuration errors
      if (
          err.error === 'idpiframe_initialization_failed' || 
          err.message?.includes('origin_mismatch') || 
          errStr.includes('storagerelay') ||
          errStr.includes('redirect_uri_mismatch')
      ) {
        msg = "CONFIGURATION ERROR: Origin Mismatch.\n\nThe URL of this app (" + window.location.origin + ") is not authorized.\n\nFIX:\n1. Go to Google Cloud Console > APIs & Services > Credentials.\n2. Edit your OAuth 2.0 Client ID.\n3. Add '" + window.location.origin + "' to 'Authorized JavaScript origins'.\n4. Remove everything from 'Authorized redirect URIs'.\n5. Save and wait 5 minutes.";
      } else if (err.error === 'popup_closed_by_user') {
        msg = "Login Cancelled: Popup was closed before authorization.";
      } else if (errStr.includes('access_denied')) {
        msg = "ACCESS BLOCKED / DENIED\n\nCommon Cause: 'App has not completed Google verification' or 'Test User' missing.\n\nFIX:\n1. Go to Google Cloud Console > APIs & Services > OAuth Consent Screen.\n2. Scroll down to 'Test users'.\n3. Click 'Add Users' and add YOUR email address.\n4. Save and try again.";
      } else if (errStr.includes('invalid_client')) {
        msg = "Invalid Client ID: Please check for spaces or typos.";
      } else {
        msg = `Connection failed: ${err.message || err.error || errStr}`;
      }

      alert(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchAccount = () => {
    setIsConnected(false);
    setFiles([]);
    setFolderStack([{ id: 'root', name: 'My Drive' }]);
  };

  const fetchFiles = async (folderId: string) => {
    setLoadingFiles(true);
    try {
      const driveFiles = await listDriveFiles(folderId);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error(err);
      if (err.result && err.result.error && err.result.error.code === 401) {
          alert("Session expired. Please reconnect.");
          setIsConnected(false);
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFolderClick = (folder: { id: string, name: string }) => {
    const newStack = [...folderStack, folder];
    setFolderStack(newStack);
    fetchFiles(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newStack = folderStack.slice(0, index + 1);
    setFolderStack(newStack);
    fetchFiles(newStack[newStack.length - 1].id);
  };

  const handleBack = () => {
    if (folderStack.length > 1) {
      const newStack = folderStack.slice(0, -1);
      setFolderStack(newStack);
      fetchFiles(newStack[newStack.length - 1].id);
    }
  };

  const handleSelection = (id: string, isFolder: boolean) => {
    if (isFolder) return; 
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleAnalyzeSelection = async () => {
    if (selectedIds.size === 0) return;

    const selectedFiles = files.filter(f => selectedIds.has(f.id));
    
    const processedFiles: DriveFile[] = [];

    for (const f of selectedFiles) {
        const content = await getFileContent(f.id, f.mimeType);
        processedFiles.push({
            id: f.id,
            name: f.name,
            size: parseInt(f.size || '0'),
            type: f.mimeType,
            lastModified: new Date(f.modifiedTime).getTime(),
            contentSnippet: content.substring(0, 1000), 
            iconLink: f.iconLink,
            webViewLink: f.webViewLink,
            parents: f.parents 
        });
    }

    onFilesSelected(processedFiles);
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <HardDrive size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Connect Google Drive</h3>
        <p className="text-slate-500 mb-6 text-sm">
          To fetch files directly from your account, we need a Client ID. 
          <br/><span className="text-xs text-slate-400">(This runs entirely in your browser)</span>
        </p>
        
        <form onSubmit={handleConnect} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-slate-700 ml-1 mb-1 block">OAUTH CLIENT ID</label>
            <input 
              type="text" 
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g. 12345...apps.googleusercontent.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            
            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded p-3">
              <div className="flex gap-2 items-start">
                 <Info size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                 <div className="text-[11px] text-yellow-800 leading-tight">
                   <strong>ACTION REQUIRED:</strong>
                   <p className="mt-1 mb-1">Copy this exact URL and add it to <strong>"Authorized JavaScript origins"</strong> in your Google Cloud Console Credentials.</p>
                   <code className="bg-white border border-yellow-200 px-2 py-1 rounded block mt-1 font-mono text-center select-all cursor-pointer hover:bg-yellow-100" title="Click to select">
                     {window.location.origin}
                   </code>
                   <p className="mt-2 text-[10px] text-yellow-700">Warning: "Authorized redirect URIs" should usually be empty for this app.</p>
                 </div>
              </div>
            </div>
          </div>
          <button 
            type="submit"
            disabled={isConnecting}
            className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            {isConnecting ? 'Connecting...' : 'Authorize Access'} <ChevronRight size={16} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
      {/* Header & Breadcrumbs */}
      <div className="p-4 border-b border-slate-100">
         <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2">
                 <button 
                   onClick={handleBack} 
                   disabled={folderStack.length === 1}
                   className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                 >
                    <ChevronLeft size={20} className="text-slate-600" />
                 </button>
                 <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <HardDrive size={18} className="text-blue-500"/>
                    <span className="truncate max-w-[200px]">{currentFolder.name}</span>
                 </h3>
             </div>
             <div className="flex items-center gap-1">
                <button onClick={handleSwitchAccount} className="text-slate-400 hover:text-red-600 p-2" title="Disconnect Drive">
                    <LogOut size={16} />
                </button>
                <button onClick={() => fetchFiles(currentFolder.id)} className="text-slate-400 hover:text-blue-600 p-2" title="Refresh">
                    <RefreshCw size={16} />
                </button>
             </div>
         </div>
         
         {/* Breadcrumbs */}
         <div className="flex items-center gap-1 text-xs text-slate-500 overflow-x-auto whitespace-nowrap pb-1">
             <Home size={12} className="cursor-pointer hover:text-blue-600" onClick={() => handleBreadcrumbClick(0)} />
             {folderStack.slice(1).map((folder, idx) => (
                 <React.Fragment key={folder.id}>
                     <ChevronRight size={10} className="text-slate-300" />
                     <span 
                       onClick={() => handleBreadcrumbClick(idx + 1)}
                       className="cursor-pointer hover:text-blue-600 hover:underline"
                     >
                       {folder.name}
                     </span>
                 </React.Fragment>
             ))}
         </div>
      </div>
      
      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
        {loadingFiles ? (
           <div className="flex flex-col justify-center items-center h-full text-slate-400 gap-3">
             <RefreshCw className="animate-spin text-blue-500" size={24}/> 
             <span className="text-sm font-medium">Loading files...</span>
           </div>
        ) : (
           <div className="space-y-1">
             {files.length === 0 && (
                 <div className="text-center py-20 text-slate-400 text-sm">
                     Folder is empty
                 </div>
             )}
             {files.map(file => {
               const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
               return (
                 <div 
                   key={file.id} 
                   onClick={() => isFolder ? handleFolderClick(file) : handleSelection(file.id, isFolder)}
                   className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                       selectedIds.has(file.id) 
                       ? 'bg-blue-50 border-blue-200' 
                       : 'bg-white border-transparent hover:border-slate-200 hover:shadow-sm'
                   }`}
                 >
                   {/* Checkbox or Icon */}
                   <div className="flex-shrink-0">
                       {isFolder ? (
                           <Folder className="text-slate-400 fill-slate-100" size={20} />
                       ) : (
                           <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${selectedIds.has(file.id) ? 'bg-blue-500 text-white' : 'border border-slate-300 text-transparent hover:border-blue-400'}`}>
                                <CheckCircle2 size={14} />
                           </div>
                       )}
                   </div>

                   {/* Icon */}
                   {file.iconLink && !isFolder && (
                      <img src={file.iconLink} alt="" className="w-5 h-5 opacity-75" />
                   )}
                   
                   <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                      <div className="flex gap-3 text-[10px] text-slate-400 mt-0.5">
                          {isFolder ? (
                              <span>Folder</span>
                          ) : (
                              <span>{Math.round(parseInt(file.size || '0')/1024)} KB</span>
                          )}
                          <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                      </div>
                   </div>

                   {isFolder && <ChevronRight size={16} className="text-slate-300" />}
                 </div>
               );
             })}
           </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
         <span className="text-sm text-slate-600 font-medium">
            {selectedIds.size} files ready for analysis
         </span>
         <button 
           onClick={handleAnalyzeSelection}
           disabled={selectedIds.size === 0}
           className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100"
         >
            Analyze Selected
         </button>
      </div>
    </div>
  );
};