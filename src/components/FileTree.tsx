"use client";
import { useState } from 'react';
import { FileItem } from '@/types/ide';

interface Props {
  items: FileItem[];
  onFileClick: (path: string) => void;
  onFolderSelect: (path: string) => void;
  activeFile: string;
  selectedFolder: string;
  onContextMenu: (e: React.MouseEvent, path: string, isDir: boolean) => void;
}

export default function FileTree({ items, onFileClick, onFolderSelect, activeFile, selectedFolder, onContextMenu }: Props) {
  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <FileNode 
          key={item.path} 
          item={item} 
          onFileClick={onFileClick}
          onFolderSelect={onFolderSelect}
          activeFile={activeFile}
          selectedFolder={selectedFolder}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}

function FileNode({ item, onFileClick, onFolderSelect, activeFile, selectedFolder, onContextMenu }: 
  { item: FileItem, 
    onFileClick: (path: string) => void, 
    onFolderSelect: (path: string) => void, 
    activeFile: string, 
    selectedFolder: string,
    onContextMenu: (e: React.MouseEvent, path: string, isDir: boolean) => void
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, item.path, item.isDirectory);
  };

  if (item.isDirectory) {
    return (
      <div onContextMenu={handleRightClick}>
        <div 
          onClick={() => {
            setIsOpen(!isOpen)
            onFolderSelect(item.path);
          }}
          className={`flex items-center gap-2 px-4 py-1 text-sm cursor-pointer hover:bg-[#2a2d2e] 
            ${selectedFolder === item.path ? 'bg-[#37373d] text-blue-300' : 'text-gray-300'}`}
        >
          <span>{isOpen ? '📂' : '📁'}</span>
          <span className="truncate">{item.name}</span>
        </div>
        {isOpen && item.children && (
          <div className="pl-4 border-l border-gray-700 ml-6">
            <FileTree 
              items={item.children} 
              onFileClick={onFileClick} 
              onFolderSelect={onFolderSelect} 
              activeFile={activeFile}
              selectedFolder={selectedFolder} 
              onContextMenu={onContextMenu}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onContextMenu={handleRightClick}
      onClick={() => {
        onFileClick(item.path);
        onFolderSelect("");
      }}
      className={`flex items-center gap-2 px-4 py-1 text-sm cursor-pointer hover:bg-[#2a2d2e] 
        ${activeFile === item.path ? 'bg-[#37373d] text-blue-400' : 'text-gray-300'}`}
    >
      <span>📄</span>
      <span className="truncate">{item.name}</span>
    </div>
  );
}
