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

export const createFile = (name: string) => {
    socket?.emit('create-file', name);
};

export const createFolder = (name: string) => {
    socket?.emit('create-folder', name);
};