'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, ImageIcon } from 'lucide-react';
import { Attachment } from '@/types';
import { generateId, fileToBase64, formatBytes } from '@/lib/utils';
import Image from 'next/image';

interface ScreenshotUploadProps {
  onUpload: (attachments: Attachment[]) => void;
  onClose: () => void;
}

export default function ScreenshotUpload({ onUpload, onClose }: ScreenshotUploadProps) {
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const processFile = useCallback(async (file: File) => {
    const base64 = await fileToBase64(file);
    setPreview({
      id: generateId(),
      type: 'image',
      url: base64,
      name: file.name,
      size: file.size,
    });
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxFiles: 1,
    onDrop: (files) => {
      if (files[0]) processFile(files[0]);
    },
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
  });

  const handleAnalyze = () => {
    if (preview) {
      onUpload([preview]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0d1526] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm">Screenshot Analysis</div>
              <div className="text-xs text-white/40">Upload to scan for threats</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!preview ? (
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-cyan-500 bg-cyan-500/10 scale-[1.02]'
                  : 'border-white/20 hover:border-white/40 hover:bg-white/5'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
                  <Upload className={`w-7 h-7 transition-colors ${isDragActive ? 'text-cyan-400' : 'text-white/30'}`} />
                </div>
                <div>
                  <p className="font-semibold text-white/80 text-sm">
                    {isDragActive ? 'Drop it here!' : 'Drag & drop a screenshot'}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    or click to browse · PNG, JPG, WEBP
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                <Image
                  src={preview.url}
                  alt={preview.name}
                  width={448}
                  height={250}
                  className="w-full object-contain max-h-[250px] bg-black/20"
                  unoptimized
                />
                <button
                  onClick={() => setPreview(null)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40 px-1">
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="truncate">{preview.name}</span>
                <span className="ml-auto flex-shrink-0">{formatBytes(preview.size)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!preview}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-black text-sm font-bold transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
            >
              🔍 Analyze Threat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
