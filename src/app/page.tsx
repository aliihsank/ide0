"use client";
import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import dynamic from 'next/dynamic';
import { socket, requestFiles, readFile, runCode } from '@/lib/socket';
import { saveFile } from '@/lib/socket';
import { createFile, createFolder, deleteItem, renameItem, setProjectPath } from '@/lib/socket';
import FileTree from '@/components/FileTree';
import { FileItem } from '@/types/ide';

const Terminal = dynamic(() => import('@/components/Terminal'), { ssr: false });


export default function IDEPage() {
  const [code, setCode] = useState("// Bir dosya seçin...");
  const [activeFile, setActiveFile] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [menu, setMenu] = useState<{ x: number, y: number, path: string, isDirectory: boolean } | null>(null);

  const closeMenu = () => setMenu(null);

  useEffect(() => {
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

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

  const handleContextMenu = (e: React.MouseEvent, path: string, isDir: boolean) => {
    e.preventDefault();

    const menuWidth = 192;  // Menü genişliği (w-48)
    const menuHeight = 160; // Tahmini menü yüksekliği

    let x = e.clientX;
    let y = e.clientY;

    // Ekranın sağına taşıyorsa sola doğru aç
    if (x + menuWidth > window.innerWidth) {
      x = x - menuWidth;
    }

    // Ekranın altına taşıyorsa yukarı doğru aç
    if (y + menuHeight > window.innerHeight) {
      y = y - menuHeight;
    }

    setMenu({ x, y, path, isDirectory: isDir });
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
    const name = prompt(`${selectedFolder || 'Root'} içine yeni dosya adı:`);
    if (name) createFile(name, selectedFolder);
  };

  const handleNewFolder = () => {
    const name = prompt(`${selectedFolder || 'Root'} içine yeni klasör adı:`);
    if (name) createFolder(name, selectedFolder);
  };

  const handleDelete = () => {
    const pathToDelete = activeFile || selectedFolder;
    if (!pathToDelete) return alert("Silmek için bir dosya veya klasör seçin.");
    
    if (confirm(`${pathToDelete} kalıcı olarak silinecek. Emin misiniz?`)) {
      deleteItem(pathToDelete);
      if (pathToDelete === activeFile) {
        setActiveFile("");
        setCode("");
      }
      setSelectedFolder("");
    }
  };

  const changeProjectPath = () => {
    const path = prompt("Lütfen açmak istediğiniz projenin tam yolunu girin:", "C:/Users/Documents/my-project");
    if (path) {
        setProjectPath(path);
    }
  };

  return (
    <main className="h-screen flex flex-col bg-[#1e1e1e]">
      <nav className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#252526]">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-blue-500">ide0</span>
          <span className="text-xs text-gray-400">{activeFile || "Yeni Dosya"}</span>
        </div>
        <div className="flex gap-2">
          <button 
                onClick={changeProjectPath}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs"
            >
                Open
          </button>
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
        <aside className="w-64 border-r border-[#333] bg-[#252526] overflow-y-auto"
          onContextMenu={(e) => {
            e.preventDefault();
            
            if (e.target === e.currentTarget) {
              handleContextMenu(e, "", true);
            }
          }}>
          <div className="p-2 flex justify-between items-center border-b border-[#333] mb-2 px-4">
            <span className="text-[10px] uppercase font-bold text-gray-500">Explorer</span>
            <div className="flex gap-2">
              <button onClick={handleNewFile} title="New File" className="p-1 hover:bg-gray-700 rounded">📄+</button>
              <button onClick={handleNewFolder} title="New Folder" className="p-1 hover:bg-gray-700 rounded">📁+</button>
              <button onClick={handleDelete} title="Delete" className="p-1 hover:bg-red-900 rounded text-red-400">🗑️</button>
            </div>
          </div>
          {/* Dosya Listesi */}
          <div 
            className="flex-1" 
            onContextMenu={(e) => {
              e.preventDefault();

              if (e.target === e.currentTarget) {
                handleContextMenu(e, "", true);
              }
            }}
          >
            <FileTree 
              items={files} 
              onFileClick={handleFileClick}
              onFolderSelect={(path) => setSelectedFolder(path)}
              activeFile={activeFile}
              selectedFolder={selectedFolder}
              onContextMenu={handleContextMenu}
            />
          </div>
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
      {menu && (
        <div 
          className="fixed z-50 bg-[#252526] border border-[#454545] shadow-xl py-1 rounded w-48 text-sm text-gray-300"
          style={{ top: menu.y, left: menu.x }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="px-4 py-1 text-[10px] text-gray-500 border-b border-[#333] mb-1 italic">
          {menu.path === "" ? "Root Directory" : menu.path}
        </div>
          {menu.isDirectory && (
            <>
              <button onClick={() => { createFile(prompt("Dosya adı:") || "", menu.path); closeMenu(); }} className="w-full text-left px-4 py-1 hover:bg-[#094771] hover:text-white">New File</button>
              <button onClick={() => { createFolder(prompt("Klasör adı:") || "", menu.path); closeMenu(); }} className="w-full text-left px-4 py-1 hover:bg-[#094771] hover:text-white border-b border-[#454545] mb-1 pb-2">New Folder</button>
            </>
          )}
          {menu.path !== "" && (
          <button 
            onClick={() => { 
              if(confirm(`${menu.path} silinsin mi?`)) deleteItem(menu.path); 
              closeMenu(); 
            }} 
            className="w-full text-left px-4 py-1 hover:bg-[#c42b1c] hover:text-white"
          >
            Delete
          </button>
          )}
          <button 
            onClick={() => {
              const currentName = menu.path.split(/[\\/]/).pop();
              const newName = prompt("New name:", currentName || "");
              if (newName) {
                renameItem(menu.path, newName);
              }
              closeMenu();
            }
          } 
          className="w-full text-left px-4 py-1 hover:bg-[#094771]"
        >
          Rename
        </button>
        </div>
      )}
    </main>
  );
}
