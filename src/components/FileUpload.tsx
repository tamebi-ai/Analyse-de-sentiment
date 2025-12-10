import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { FileWithPreview } from '../types';

interface FileUploadProps {
  files: FileWithPreview[];
  setFiles: React.Dispatch<React.SetStateAction<FileWithPreview[]>>;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Fix: Explicitly type 'file' as File to resolve 'unknown' argument type error in URL.createObjectURL
      const newFiles = Array.from(e.target.files).map((file: File) => 
        Object.assign(file, {
          preview: URL.createObjectURL(file)
        })
      );
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  return (
    <div className="w-full space-y-4">
      <div 
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer
          ${disabled ? 'bg-slate-100 border-slate-300 cursor-not-allowed' : 'bg-white border-blue-300 hover:bg-blue-50 hover:border-blue-500'}
        `}
      >
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          ref={inputRef}
          onChange={handleFileChange}
          disabled={disabled}
        />
        <Upload className={`w-12 h-12 mb-4 ${disabled ? 'text-slate-400' : 'text-blue-500'}`} />
        <h3 className="text-lg font-semibold text-slate-700">Déposer des captures d'écran</h3>
        <p className="text-slate-500 text-sm mt-1">Formats PNG, JPG supportés</p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {files.map((file, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-100">
              <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => removeFile(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                {file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};