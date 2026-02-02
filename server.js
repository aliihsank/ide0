const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

let ptyProcess = null;
let rootPath = process.cwd(); // Varsayılan başlangıç dizini

const setupTerminal = (workingDir) => {
    if (ptyProcess) {
        ptyProcess.removeAllListeners();
        ptyProcess.kill();
    }

    ptyProcess = pty.spawn(process.platform === 'win32' ? 'powershell.exe' : 'bash', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: workingDir,
        env: process.env
    });

    ptyProcess.onData((data) => {
        io.emit('output', data);
    });
};

const getFiles = (dirPath) => {
    try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        return items
            .filter(item => !['node_modules', '.git', '.next'].includes(item.name))
            .map(item => {
                const fullPath = path.join(dirPath, item.name);
                const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');
                
                const node = {
                    name: item.name,
                    path: relativePath,
                    isDirectory: item.isDirectory()
                };

                if (item.isDirectory()) {
                    node.children = getFiles(fullPath);
                }
                return node;
            });
    } catch (e) { return []; }
};

io.on('connection', (socket) => {
    console.log('Kullanıcı bağlandı:', socket.id);

    socket.emit('file-list', getFiles(rootPath));

    socket.on('input', (data) => {
        if (ptyProcess) {
            ptyProcess.write(data);
        }
    });

    socket.on('set-project-path', (newPath) => {
        if (fs.existsSync(newPath)) {
            rootPath = newPath;
            setupTerminal(rootPath);
            io.emit('file-list', getFiles(rootPath));
            console.log(`Dizin değiştirildi: ${rootPath}`);
        }
    });

    socket.on('read-file', (filePath) => {
        try {
            const fullPath = path.join(rootPath, filePath);
            const content = fs.readFileSync(fullPath, 'utf-8');
            socket.emit('file-content', { fileName: filePath, content });
        } catch (err) { console.error(err); }
    });

    socket.on('save-file', ({ filePath, content }) => {
        try {
            const fullPath = path.join(rootPath, filePath);
            fs.writeFileSync(fullPath, content, 'utf-8');
            socket.emit('save-success', { filePath });
        } catch (err) { console.error(err); }
    });

    socket.on('create-file', ({fileName, parentPath}) => {
        try {
            const filePath = path.join(rootPath, parentPath || '', fileName);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, '', 'utf-8');
                io.emit('file-list', getFiles(rootPath)); 
            }
        } catch (err) { console.error(err); }
    });

    socket.on('create-folder', ({folderName, parentPath}) => {
        try {
            const folderPath = path.join(rootPath, parentPath || '', folderName);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                io.emit('file-list', getFiles(rootPath));
            }
        } catch (err) { console.error(err); }
    });

    socket.on('delete-item', (itemPath) => {
        try {
            const fullPath = path.join(rootPath, itemPath);
            if (fs.existsSync(fullPath)) {
                fs.rmSync(fullPath, { recursive: true, force: true });
                io.emit('file-list', getFiles(rootPath));
            }
        } catch (err) { console.error(err); }
    });

    socket.on('rename-item', ({ oldPath, newName }) => {
        try {
            const fullOldPath = path.join(rootPath, oldPath);
            const directory = path.dirname(fullOldPath);
            const fullNewPath = path.join(directory, newName);
            
            if (fs.existsSync(fullOldPath)) {
                fs.renameSync(fullOldPath, fullNewPath);
                io.emit('file-list', getFiles(rootPath));
            }
        } catch (err) { console.error(err); }
    });
});

server.listen(3001, () => {
    console.log('ide0 Backend 3001 portunda hazır');
});
