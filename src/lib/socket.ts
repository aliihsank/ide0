import { io } from 'socket.io-client';

export const socket = typeof window !== 'undefined' ? io('http://localhost:3001') : null;

export const runCode = (code: string) => {
  if (socket) {
    socket.emit('run-code', code);
  }
};

export const requestFiles = () => {
    socket?.emit('get-files');
};

export const readFile = (fileName: string) => {
    socket?.emit('read-file', fileName);
};

export const saveFile = (filePath: string, content: string) => {
    socket?.emit('save-file', { filePath, content });
};

export const createFile = (name: string, parentPath?: string) => {
    socket?.emit('create-file', { fileName: name, parentPath });
};

export const createFolder = (name: string, parentPath?: string) => {
    socket?.emit('create-folder', { folderName: name, parentPath });
};

export const deleteItem = (path: string) => {
    socket?.emit('delete-item', path);
};

export const renameItem = (oldPath: string, newName: string) => {
    socket?.emit('rename-item', { oldPath, newName });
};

export const setProjectPath = (path: string) => {
    socket?.emit('set-project-path', path);
}