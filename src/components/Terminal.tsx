"use client";
import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { socket } from '@/lib/socket'; 
import 'xterm/css/xterm.css';

export default function TerminalComponent() {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terminalRef.current || !socket) return;

    const term = new Terminal({ cursorBlink: true, theme: { background: '#000000' } });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    socket.on('output', (data) => term.write(data));
    
    term.onData((data) => {
      socket?.emit('input', data);
    });

    return () => {
      term.dispose();
      socket?.off('output');
    };
  }, []);

  return <div ref={terminalRef} className="h-full w-full" />;
}