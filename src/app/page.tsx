"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);

  // Chat/History State'leri
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', content: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setMenu(null);

  // Mesajlar eklendiğinde en alta kaydır
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    if (!socket) return;
    requestFiles();
    socket.on('file-list', (fileList: FileItem[]) => {
      setFiles(fileList);
      setIsLoading(false);
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = { role: 'user' as const, content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Simülasyon bot yanıtı
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', content: "ide0 asistanı: Mesajınızı aldım." }]);
    }, 600);
  };

  const handleFileClick = (filePath: string) => readFile(filePath);

  const handleContextMenu = (e: React.MouseEvent, path: string, isDir: boolean) => {
    e.preventDefault();
    const menuWidth = 192;
    const menuHeight = 160;
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;
    setMenu({ x, y, path, isDirectory: isDir });
  };

  const handleSave = useCallback(() => {
    if (activeFile && code) saveFile(activeFile, code);
  }, [activeFile, code]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
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
      if (pathToDelete === activeFile) { setActiveFile(""); setCode(""); }
      setSelectedFolder("");
    }
  };

  return (
    <main className="h-screen flex flex-col bg-[#1e1e1e]">
      {/* Üst Navigasyon */}
      <nav className="h-10 border-b border-[#333] flex items-center px-4 justify-between bg-[#252526] shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-blue-500 italic">ide0</span>
          <span className="text-[11px] text-gray-400 font-mono">{activeFile || "Yeni Dosya"}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            const path = prompt("Proje yolu:", "C:/Projects");
            if (path) {
              setIsLoading(true);
              setProjectPath(path);
            }
          }} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs">Open</button>
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">Save</button>
          <button onClick={() => runCode(code)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">Run</button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* SOL: Explorer */}
        <aside className="w-64 border-r border-[#333] bg-[#252526] flex flex-col shrink-0"
          onContextMenu={(e) => { e.preventDefault(); if (e.target === e.currentTarget) handleContextMenu(e, "", true); }}>
          <div className="p-2 flex justify-between items-center border-b border-[#333] mb-2 px-4">
            <span className="text-[10px] uppercase font-bold text-gray-500">Explorer</span>
            <div className="flex gap-1">
              <button onClick={handleNewFile} className="p-1 hover:bg-gray-700 rounded text-xs">📄+</button>
              <button onClick={handleNewFolder} className="p-1 hover:bg-gray-700 rounded text-xs">📁+</button>
              <button onClick={handleDelete} className="p-1 hover:bg-red-900 rounded text-xs text-red-400">🗑️</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto relative" onContextMenu={(e) => { e.preventDefault(); if (e.target === e.currentTarget) handleContextMenu(e, "", true); }}>
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#252526] z-10">
                {/* Tailwind ile Spinner Animasyonu */}
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] text-gray-500 mt-2 font-mono animate-pulse">Scanning Files...</p>
              </div>
            ) : (
              <FileTree items={files} onFileClick={handleFileClick} onFolderSelect={setSelectedFolder} activeFile={activeFile} selectedFolder={selectedFolder} onContextMenu={handleContextMenu} />
            )}
          </div>
        </aside>

        {/* ORTA: Editor & Terminal */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#333]">
          <div className="flex-1 min-h-0">
            <Editor height="100%" theme="vs-dark" path={activeFile} value={code} onChange={(v) => setCode(v || "")} options={{ automaticLayout: true, minimap: { enabled: false } }} />
          </div>
          <div className="h-1/3 border-t border-[#333] bg-[#1e1e1e]">
            <Terminal />
          </div>
        </div>

        {/* SAĞ: Chat/History Paneli */}
        <aside className="w-80 bg-[#252526] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#333] flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">History & Chat</span>
          </div>
          
          {/* Mesaj Listesi */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="text-center text-gray-600 mt-10 text-xs italic">Henüz bir aktivite yok.</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`p-2 rounded text-sm ${msg.role === 'user' ? 'bg-[#37373d] ml-4' : 'bg-[#0e639c]/10 border border-[#0e639c]/20 mr-4'}`}>
                <span className={`text-[9px] font-bold block mb-1 uppercase ${msg.role === 'user' ? 'text-gray-400' : 'text-blue-400'}`}>
                  {msg.role}
                </span>
                <div className="leading-relaxed text-gray-200 whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Alanı */}
          <div className="p-3 border-t border-[#333] bg-[#1e1e1e]">
            <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                placeholder="Bir mesaj yazın veya komut verin..."
                className="w-full bg-[#2d2d2d] text-gray-200 text-xs border border-[#454545] rounded p-2 focus:outline-none focus:border-[#0e639c] resize-none h-20"
              />
              <button type="submit" className="bg-[#0e639c] hover:bg-[#1177bb] text-white text-[11px] font-bold py-1.5 rounded transition-colors shadow-lg">
                GÖNDER
              </button>
            </form>
          </div>
        </aside>
      </div>

      {/* Context Menu */}
      {menu && (
        <div className="fixed z-50 bg-[#252526] border border-[#454545] shadow-2xl py-1 rounded w-48 text-sm text-gray-300" style={{ top: menu.y, left: menu.x }}>
          <div className="px-4 py-1 text-[10px] text-gray-500 border-b border-[#333] mb-1 italic truncate">{menu.path || "Root"}</div>
          {menu.isDirectory && (
            <>
              <button onClick={() => { handleNewFile(); closeMenu(); }} className="w-full text-left px-4 py-1 hover:bg-[#094771]">New File</button>
              <button onClick={() => { handleNewFolder(); closeMenu(); }} className="w-full text-left px-4 py-1 hover:bg-[#094771] border-b border-[#333]">New Folder</button>
            </>
          )}
          {menu.path !== "" && (
            <button onClick={() => { if (confirm(`${menu.path} silinsin mi?`)) deleteItem(menu.path); closeMenu(); }} className="w-full text-left px-4 py-1 hover:bg-red-800 text-red-300">Delete</button>
          )}
          <button onClick={() => {
            const currentName = menu.path.split(/[\\/]/).pop();
            const newName = prompt("New name:", currentName || "");
            if (newName) renameItem(menu.path, newName);
            closeMenu();
          }} className="w-full text-left px-4 py-1 hover:bg-[#094771]">Rename</button>
        </div>
      )}
    </main>
  );
}
