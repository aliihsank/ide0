"use client";
import { useState } from 'react';
import { FileItem } from '@/types/ide';

interface Props {
  items: FileItem[];
  onFileClick: (path: string) => void;
  activeFile: string;
}

export default function FileTree({ items, onFileClick, activeFile }: Props) {
  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <FileNode 
          key={item.path} 
          item={item} 
          onFileClick={onFileClick} 
          activeFile={activeFile} 
        />
      ))}
    </div>
  );
}

function FileNode({ item, onFileClick, activeFile }: { item: FileItem, onFileClick: (path: string) => void, activeFile: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (item.isDirectory) {
    return (
      <div>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-1 text-sm cursor-pointer hover:bg-[#2a2d2e] text-gray-300"
        >
          <span>{isOpen ? '📂' : '📁'}</span>
          <span className="truncate">{item.name}</span>
        </div>
        {isOpen && item.children && (
          <div className="pl-4 border-l border-gray-700 ml-6">
            <FileTree items={item.children} onFileClick={onFileClick} activeFile={activeFile} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={() => onFileClick(item.path)}
      className={`flex items-center gap-2 px-4 py-1 text-sm cursor-pointer hover:bg-[#2a2d2e] 
        ${activeFile === item.path ? 'bg-[#37373d] text-blue-400' : 'text-gray-300'}`}
    >
      <span>📄</span>
      <span className="truncate">{item.name}</span>
    </div>
  );
}
