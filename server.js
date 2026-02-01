const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

io.on('connection', (socket) => {
    const fs = require('fs');
    const path = require('path');

    let rootPath = "C:\\Projects"; // process.cwd();

    const getFiles = (dirPath) => {
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
    };

    socket.on('set-project-path', (newPath) => {
        if (fs.existsSync(newPath)) {
            rootPath = newPath;
            
            io.emit('file-list', getFiles(rootPath));
            console.log(`ide0 çalışma dizini değişti: ${rootPath}`);
        } else {
            socket.emit('error', { message: "Geçersiz dizin yolu!" });
        }
    });

    socket.on('get-files', () => {
        const files = getFiles(rootPath);
        socket.emit('file-list', files);
    });

    socket.on('read-file', (fileName) => {
        const content = fs.readFileSync(path.join(rootPath, fileName), 'utf-8');
        socket.emit('file-content', { fileName, content });
    });

    socket.on('save-file', ({ filePath, content }) => {
        try {
            const fullPath = path.join(rootPath, filePath);
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`Dosya kaydedildi: ${filePath}`);
            socket.emit('save-success', { filePath });
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            socket.emit('save-error', { message: 'Dosya kaydedilemedi.' });
        }
    });

    socket.on('create-file', ({fileName, parentPath}) => {
        try {
            const filePath = path.join(rootPath, parentPath || '', fileName);

            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, '', 'utf-8');

                const files = getFiles(rootPath);
                io.emit('file-list', files); 
            }
        } catch (error) {
            socket.emit('error', { message: 'Dosya oluşturulamadı' });
        }
    });

    socket.on('create-folder', ({folderName, parentPath}) => {
        try {
            const folderPath = path.join(rootPath, parentPath || '', folderName);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                const files = getFiles(rootPath);
                io.emit('file-list', files);
            }
        } catch (error) {
            socket.emit('error', { message: 'Klasör oluşturulamadı' });
        }
    });

    socket.on('delete-item', (itemPath) => {
        try {
            const fullPath = path.join(rootPath, itemPath);
            if (fs.existsSync(fullPath)) {
                fs.rmSync(fullPath, { recursive: true, force: true });
                io.emit('file-list', getFiles(rootPath));
                console.log(`${itemPath} silindi.`);
            }
        } catch (error) {
            socket.emit('error', { message: 'Silme işlemi başarısız' });
        }
    });

    socket.on('rename-item', ({ oldPath, newName }) => {
        try {
            const directory = path.dirname(oldPath);
            const newPath = path.join(directory, newName);
            
            const fullOldPath = path.join(rootPath, oldPath);
            const fullNewPath = path.join(rootPath, newPath);

            if (fs.existsSync(fullOldPath)) {
                fs.renameSync(fullOldPath, fullNewPath);
                io.emit('file-list', getFiles(rootPath));
                console.log(`Yeniden adlandırıldı: ${oldPath} -> ${newName}`);
            }
        } catch (error) {
            socket.emit('error', { message: 'Yeniden adlandırma başarısız' });
        }
    });
});

server.listen(3001, () => console.log('Terminal backend 3001 portunda çalışıyor'));