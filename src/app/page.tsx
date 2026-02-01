"use client";
import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import dynamic from 'next/dynamic';
import { socket, requestFiles, readFile, runCode } from '@/lib/socket';
import { saveFile } from '@/lib/socket';
import { createFile, createFolder } from '@/lib/socket';
import FileTree from '@/components/FileTree';
import { FileItem } from '@/types/ide';

const Terminal = dynamic(() => import('@/components/Terminal'), { ssr: false });


export default function IDEPage() {
  const [code, setCode] = useState("// Bir dosya seçin...");
  const [activeFile, setActiveFile] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    if (!socket) return;

    requestFiles();

    socket.on('file-list', (fileList: FileItem[]) => {
      setFiles(fileList);
    });

    socket.on('file-content', ({ fileName, content }: { fileName: string, content: string }) => {
      setActiveFile(fileName);
      setCode(content);
    });

    return () => {
      socket?.off('file-list');
      socket?.off('file-content');
    };
  }, []);

  const handleFileClick = (filePath: string) => {
    readFile(filePath);
  };

  const handleSave = useCallback(() => {
    if (activeFile && code) {
      saveFile(activeFile, code);
      // Opsiyonel: Kullanıcıya kaydedildiğine dair bir bildirim gösterilebilir
    }
  }, [activeFile, code]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Tarayıcının varsayılan kaydetme penceresini engelle
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleNewFile = () => {
    const name = prompt("Dosya adı girin (uzantısıyla birlikte):");
    if (name) createFile(name);
  };

  const handleNewFolder = () => {
    const name = prompt("Klasör adı girin:");
    if (name) createFolder(name);
  };

  return (
    <main className="h-screen flex flex-col bg-[#1e1e1e]">
      <nav className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#252526]">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-blue-500">CLOUD_IDE</span>
          <span className="text-xs text-gray-400">{activeFile || "Yeni Dosya"}</span>
        </div>
        <div className="flex gap-2">
          {/* Kaydet Butonu */}
          <button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-all"
          >
            Save
          </button>
          <button 
            onClick={() => runCode(code)} 
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
          >
            Run
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* SOL PANEL: Explorer */}
        <aside className="w-64 border-r border-[#333] bg-[#252526] overflow-y-auto">
          <div className="p-2 flex justify-between items-center border-b border-[#333] mb-2 px-4">
            <span className="text-[10px] uppercase font-bold text-gray-500">Explorer</span>
            <div className="flex gap-2">
              {/* Yeni Dosya Butonu */}
              <button onClick={handleNewFile} title="New File" className="hover:bg-[#37373d] p-1 rounded text-gray-400">
                <span className="text-xs">📄+</span>
              </button>
              {/* Yeni Klasör Butonu */}
              <button onClick={handleNewFolder} title="New Folder" className="hover:bg-[#37373d] p-1 rounded text-gray-400">
                <span className="text-xs">📁+</span>
              </button>
            </div>
          </div>
          
          <FileTree 
            items={files} 
            onFileClick={handleFileClick} 
            activeFile={activeFile} 
          />
        </aside>

        {/* SAĞ PANEL: Editor & Terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1">
            <Editor
              height="100%"
              theme="vs-dark"
              path={activeFile} // Dosya uzantısına göre otomatik dil algılama
              value={code}
              onChange={(v) => setCode(v || "")}
              options={{ automaticLayout: true, minimap: { enabled: false } }}
            />
          </div>
          <div className="h-1/3 border-t border-[#333]">
            <Terminal />
          </div>
        </div>
      </div>
    </main>
  );
}
