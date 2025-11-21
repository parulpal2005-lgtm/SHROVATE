import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Monitor, Power, Terminal, Video, Command, ExternalLink, Cpu } from 'lucide-react';

type CmdMap = {
  [key: string]: () => void;
};

export const VoiceControl: React.FC = () => {
  const [listening, setListening] = useState(false);
  const [lastText, setLastText] = useState('');
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const r = new SpeechRecognition();
    r.lang = 'en-IN';
    r.interimResults = false;
    r.maxAlternatives = 1;

    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript.trim();
      setLastText(text);
      handleCommand(text.toLowerCase());
    };

    r.onend = () => {
      if (listening) r.start();
    };

    recognitionRef.current = r;
    return () => {
      try { r.stop(); } catch(e) {}
    };
  }, [listening]);

  function startListening() {
    const r = recognitionRef.current;
    if (!r) return alert('SpeechRecognition not supported. Use Chrome.');
    try {
      r.start();
      setListening(true);
    } catch (e) {
      console.warn(e);
    }
  }

  function stopListening() {
    const r = recognitionRef.current;
    if (!r) return;
    try { r.stop(); } catch(e) {}
    setListening(false);
  }

  function openUrl(url: string) {
    window.open(url, '_blank');
  }

  async function callLocalHelper(path: string) {
    try {
      const res = await fetch(path, { mode: 'cors' });
      const txt = await res.text();
      console.log('Local helper response:', txt);
    } catch (e) {
      console.error('Local helper unreachable', e);
      alert('Local Command Node Offline. Ensure local-helper.js is running on port 5000.');
    }
  }

  async function startScreenRecording() {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = function () {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SHROVATE_REC_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error(err);
      alert('Screen recording init failed.');
    }
  }

  function stopScreenRecording() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
  }

  const commands: CmdMap = {
    'open youtube': () => openUrl('https://youtube.com'),
    'open google': () => openUrl('https://google.com'),
    'open github': () => openUrl('https://github.com'),
    'open arduino ide': () => callLocalHelper('http://localhost:5000/launch?app=arduino'),
    'open code': () => callLocalHelper('http://localhost:5000/launch?app=code'),
    'open vs code': () => callLocalHelper('http://localhost:5000/launch?app=code'),
    'start screen recording': () => startScreenRecording(),
    'stop recording': () => stopScreenRecording(),
    'shutdown pc': () => callLocalHelper('http://localhost:5000/shutdown'),
    'restart pc': () => callLocalHelper('http://localhost:5000/restart'),
    'lock pc': () => callLocalHelper('http://localhost:5000/lock'),
  };

  async function handleCommand(text: string) {
    if (commands[text]) {
      commands[text]();
      return;
    }

    if (text.includes('open') && text.includes('youtube')) return openUrl('https://youtube.com');
    if (text.includes('open') && text.includes('github')) return openUrl('https://github.com');
    if (text.includes('open') && text.includes('google')) return openUrl('https://google.com');
    if (text.includes('start') && text.includes('record')) return startScreenRecording();
    if (text.includes('stop') && text.includes('record')) return stopScreenRecording();
    if (text.includes('shutdown')) return callLocalHelper('http://localhost:5000/shutdown');
  }

  return (
    <div className="bg-shrovate-panel border border-shrovate-primary/20 p-4 rounded-sm h-full flex flex-col font-mono relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4 border-b border-shrovate-primary/20 pb-2">
        <Command className="w-5 h-5 text-shrovate-primary" />
        <h3 className="font-bold text-shrovate-primary tracking-wider">COMMAND_NODE</h3>
        {listening && <span className="w-2 h-2 bg-red-500 rounded-full animate-ping ml-auto"></span>}
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <button 
            onClick={() => (listening ? stopListening() : startListening())}
            className={`flex items-center justify-center gap-2 p-3 rounded-sm border transition-all ${listening ? 'bg-red-500/10 border-red-500 text-red-400 hover:bg-red-500/20' : 'bg-shrovate-primary/5 border-shrovate-primary/30 text-shrovate-primary hover:bg-shrovate-primary/20'}`}
        >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span className="font-bold">{listening ? 'TERMINATE LINK' : 'INITIATE VOICE'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
             <button 
                onClick={startScreenRecording}
                className="flex flex-col items-center gap-1 p-2 bg-shrovate-bg border border-shrovate-primary/30 text-xs text-gray-300 hover:border-shrovate-primary hover:text-white transition-colors"
            >
                <Video className="w-4 h-4 text-shrovate-secondary" />
                <span>REC_SCREEN</span>
            </button>
             <button 
                onClick={() => callLocalHelper('http://localhost:5000/shutdown')}
                className="flex flex-col items-center gap-1 p-2 bg-shrovate-bg border border-red-500/30 text-xs text-gray-300 hover:border-red-500 hover:text-red-400 transition-colors"
            >
                <Power className="w-4 h-4 text-red-500" />
                <span>SYS_KILL</span>
            </button>
        </div>
      </div>

      <div className="flex-1 bg-black/50 border border-shrovate-primary/10 rounded p-2 overflow-hidden flex flex-col">
        <span className="text-[10px] text-shrovate-primary/50 mb-1">INPUT_LOG</span>
        <div className="flex-1 overflow-y-auto text-xs text-gray-300 font-mono">
            {lastText ? `> ${lastText}` : '> Waiting for input...'}
        </div>
      </div>

      <div className="mt-4">
         <details className="text-[10px] text-gray-500 cursor-pointer group">
            <summary className="hover:text-shrovate-primary transition-colors flex items-center gap-1">
                <Terminal className="w-3 h-3" /> LOCAL_DAEMON_CONFIG
            </summary>
            <div className="mt-2 p-2 bg-black border border-shrovate-primary/20 text-shrovate-primary/70 rounded overflow-x-auto">
                <code className="whitespace-pre block">
{`// run locally for sys control
const express = require('express');
const { exec } = require('child_process');
const app = express();

app.get('/launch', (req, res) => {
  const app = req.query.app;
  if (app === 'code') exec('code');
  res.send('Launched');
});

app.get('/shutdown', (req, res) => {
  exec('shutdown /s /t 0');
});

app.listen(5000);`}
                </code>
            </div>
         </details>
      </div>
    </div>
  );
};