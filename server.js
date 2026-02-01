const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

io.on('connection', (socket) => {
    const fs = require('fs');
    const path = require('path');

   const getFiles = (dirPath) => {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    return items
        .filter(item => !['node_modules', '.git', '.next'].includes(item.name))
        .map(item => {
            const fullPath = path.relative(process.cwd(), path.join(dirPath, item.name));
            if (item.isDirectory()) {
                return {
                    name: item.name,
                    path: fullPath,
                    isDirectory: true,
                    children: getFiles(path.join(dirPath, item.name))
                };
            }
            return {
                name: item.name,
                path: fullPath,
                isDirectory: false
            };
        });
    };

    socket.on('get-files', () => {
        const files = getFiles(process.cwd());
        socket.emit('file-list', files);
    });

    socket.on('read-file', (fileName) => {
        const content = fs.readFileSync(path.join(process.cwd(), fileName), 'utf-8');
        socket.emit('file-content', { fileName, content });
    });

    socket.on('save-file', ({ filePath, content }) => {
        try {
            const fullPath = path.join(process.cwd(), filePath);
            fs.writeFileSync(fullPath, content, 'utf-8');
            console.log(`Dosya kaydedildi: ${filePath}`);
            socket.emit('save-success', { filePath });
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            socket.emit('save-error', { message: 'Dosya kaydedilemedi.' });
        }
    });

    socket.on('create-file', (fileName) => {
        try {
            const filePath = path.join(process.cwd(), fileName);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, '', 'utf-8');

                const files = getFiles(process.cwd());
                io.emit('file-list', files); 
            }
        } catch (error) {
            socket.emit('error', { message: 'Dosya oluşturulamadı' });
        }
    });

    socket.on('create-folder', (folderName) => {
        try {
            const folderPath = path.join(process.cwd(), folderName);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
                const files = getFiles(process.cwd());
                io.emit('file-list', files);
            }
        } catch (error) {
            socket.emit('error', { message: 'Klasör oluşturulamadı' });
        }
    });
});

server.listen(3001, () => console.log('Terminal backend 3001 portunda çalışıyor'));