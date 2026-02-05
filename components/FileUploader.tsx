import React, { useRef } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { DriveFile } from '../types';

interface Props {
  onFilesSelected: (files: DriveFile[]) => void;
}

export const FileUploader: React.FC<Props> = ({ onFilesSelected }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: DriveFile[] = [];
      
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        let contentSnippet = undefined;

        // Simple text snippet reading for context
        if (file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('markdown')) {
          try {
             const text = await file.text();
             contentSnippet = text.substring(0, 500); // Only first 500 chars for context
          } catch (err) {
            console.warn("Could not read file text", err);
          }
        }

        newFiles.push({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          size: file.size,
          type: file.type || 'unknown',
          lastModified: file.lastModified,
          contentSnippet
        });
      }
      onFilesSelected(newFiles);
    }
  };

  return (
    <div 
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 rounded-2xl p-12 text-center cursor-pointer transition-all group bg-white"
    >
      <input 
        type="file" 
        multiple 
        className="hidden" 
        ref={inputRef}
        onChange={handleFileChange} 
      />
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
        <UploadCloud size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Drop batch here or click to upload</h3>
      <p className="text-slate-500 mb-6 max-w-sm mx-auto">
        Recommended batch size: 200–300 files. Gemini will analyze content, classify into taxonomy, and suggest professional renames.
      </p>
      <div className="flex justify-center gap-4 text-xs text-slate-400 font-medium">
        <span className="flex items-center gap-1"><FileText size={12}/> Documents</span>
        <span className="flex items-center gap-1"><FileText size={12}/> Images</span>
        <span className="flex items-center gap-1"><FileText size={12}/> PDFs</span>
      </div>
    </div>
  );
};
