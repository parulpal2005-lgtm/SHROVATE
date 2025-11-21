import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Image as ImageIcon, Mic, MicOff, Zap, Brain, Cpu, Volume2, Paperclip, X, Loader2, Globe, Video, Download, FileText } from 'lucide-react';
import { Message, Sender } from '../types';
import { sendMessageToGemini, transcribeAudio, AIMode } from '../services/geminiService';

// --- Audio Decoding Utilities (Client Side) ---
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function playPCMAudio(base64Data: string, context: AudioContext) {
    try {
        const bytes = decodeBase64(base64Data);
        
        const dataInt16 = new Int16Array(bytes.buffer);
        const sampleRate = 24000;
        const numChannels = 1;
        const frameCount = dataInt16.length / numChannels;
        
        const buffer = context.createBuffer(numChannels, frameCount, sampleRate);
        
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start();
        return source;
    } catch (e) {
        console.error("Audio Playback Error:", e);
    }
}

// --- Blob Utils ---
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: Sender.System,
      text: 'SHROVATE System initialized. Neural link established. How may I assist you, Operator?',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>('standard');
  
  // --- Attachments State ---
  const [attachment, setAttachment] = useState<{ data: string, mimeType: string, preview: string, type: 'image' | 'video' } | null>(null);
  
  // --- Recording State ---
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const isStopRequestedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
     return () => {
         if (audioContextRef.current) {
             audioContextRef.current.close();
         }
     }
  }, []);

  const playAudio = async (base64Data: string) => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
    }
    await playPCMAudio(base64Data, audioContextRef.current!);
  };

  useEffect(() => {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === Sender.System && lastMsg.audioData && isVoiceMode) {
          playAudio(lastMsg.audioData);
      }
  }, [messages, isVoiceMode]);

  // --- Download Functions ---
  const downloadChatLog = () => {
    const logContent = messages.map(m => 
        `[${new Date(m.timestamp).toLocaleString()}] ${m.sender}:\n${m.text}\n${m.imageUrl ? '[ATTACHED_IMAGE]' : ''}${m.videoUrl ? '[ATTACHED_VIDEO]' : ''}${m.webSources ? `\n[SOURCES: ${m.webSources.map(s => s.uri).join(', ')}]` : ''}`
    ).join('\n\n------------------------------------------------\n\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SHROVATE_LOG_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadMedia = (url: string, type: 'image' | 'video') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `SHROVATE_MEDIA_${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- Audio Recording Handlers ---
  const startRecording = async () => {
    isStopRequestedRef.current = false;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (isStopRequestedRef.current) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            if (audioBlob.size > 0) {
                setTranscribing(true);
                try {
                    const base64Audio = await blobToBase64(audioBlob);
                    const text = await transcribeAudio(base64Audio, audioBlob.type || 'audio/webm');
                    setInput(prev => (prev ? prev + " " + text : text));
                } catch (err) {
                    console.error("Transcription Failed", err);
                } finally {
                    setTranscribing(false);
                }
            }
            stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setIsRecording(true);
    } catch (e) {
        console.error("Failed to start recording", e);
        alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
      isStopRequestedRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  // --- File Upload Handler (Image/Video) ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          const isVideo = file.type.startsWith('video/');
          
          reader.onload = (ev) => {
              const result = ev.target?.result as string;
              const base64Data = result.split(',')[1];
              setAttachment({
                  data: base64Data,
                  mimeType: file.type,
                  preview: result,
                  type: isVideo ? 'video' : 'image'
              });
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const removeAttachment = () => setAttachment(null);

  // --- Sending Logic ---
  const handleSend = async () => {
    if ((!input.trim() && !attachment) || loading || transcribing) return;

    const currentInput = input;
    const currentAttachment = attachment;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      text: currentInput,
      imageUrl: currentAttachment?.type === 'image' ? currentAttachment.preview : undefined,
      videoUrl: currentAttachment?.type === 'video' ? currentAttachment.preview : undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachment(null);
    setLoading(true);

    // Detect Voice Mode Toggle
    let nextVoiceMode = isVoiceMode;
    const lowerInput = currentInput.toLowerCase();
    if (/\b(voice\s*on|listen|speak|answer\s*in\s*voice)\b/.test(lowerInput)) {
        nextVoiceMode = true;
        setIsVoiceMode(true);
    } else if (/\b(voice\s*off|text\s*mode)\b/.test(lowerInput)) {
        nextVoiceMode = false;
        setIsVoiceMode(false);
    }

    try {
      const { text, imageUrl, videoUrl, audioData, webSources } = await sendMessageToGemini(
          currentInput, 
          nextVoiceMode, 
          aiMode, 
          currentAttachment ? { data: currentAttachment.data, mimeType: currentAttachment.mimeType } : undefined
      );
      
      const sysMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.System,
        text: text,
        imageUrl: imageUrl,
        videoUrl: videoUrl,
        audioData: audioData,
        webSources: webSources,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, sysMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.System,
        text: "ERROR: Connection to Gemini Core failed.",
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full w-full font-mono">
      {/* Top Bar */}
      <div className="bg-shrovate-bg/50 p-2 border-b border-shrovate-primary/20 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <span className="hidden md:inline text-xs text-shrovate-primary/70 ml-2">TERMINAL_OUTPUT // STREAM_A2</span>
            {isVoiceMode && (
                <div className="flex items-center gap-1 text-xs text-shrovate-secondary font-bold animate-pulse border border-shrovate-secondary/30 px-2 py-0.5 rounded-full">
                    <Mic className="w-3 h-3" />
                    VOICE_MODE
                </div>
            )}
            
            <button 
                onClick={downloadChatLog}
                className="flex items-center gap-1 text-[10px] text-shrovate-primary hover:text-white border border-shrovate-primary/30 px-2 py-1 rounded-sm transition-colors bg-shrovate-primary/5 hover:bg-shrovate-primary/20"
                title="Download Chat Log"
            >
                <FileText className="w-3 h-3" />
                SAVE_LOG
            </button>
        </div>
        
        {/* AI Mode Selector */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded border border-shrovate-primary/20">
            <button 
                onClick={() => setAiMode('turbo')}
                className={`p-1.5 rounded transition-all flex items-center gap-1 ${aiMode === 'turbo' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'text-gray-500 hover:text-white'}`}
                title="Turbo Mode (Flash Lite) - Fastest Response"
            >
                <Zap className="w-3 h-3" />
                <span className="text-[10px] font-bold hidden md:inline">TURBO</span>
            </button>
            <button 
                onClick={() => setAiMode('standard')}
                className={`p-1.5 rounded transition-all flex items-center gap-1 ${aiMode === 'standard' ? 'bg-shrovate-primary/20 text-shrovate-primary border border-shrovate-primary/50' : 'text-gray-500 hover:text-white'}`}
                title="Standard Mode (Flash) - Balanced with Search"
            >
                {aiMode === 'standard' ? <Globe className="w-3 h-3"/> : <Cpu className="w-3 h-3" />}
                <span className="text-[10px] font-bold hidden md:inline">STD</span>
            </button>
            <button 
                onClick={() => setAiMode('thinking')}
                className={`p-1.5 rounded transition-all flex items-center gap-1 ${aiMode === 'thinking' ? 'bg-shrovate-secondary/20 text-shrovate-secondary border border-shrovate-secondary/50' : 'text-gray-500 hover:text-white'}`}
                title="Deep Think (Pro) - Complex Reasoning"
            >
                <Brain className="w-3 h-3" />
                <span className="text-[10px] font-bold hidden md:inline">THINK</span>
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-shrovate-primary scrollbar-track-transparent">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.sender === Sender.User ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-sm border ${
              msg.sender === Sender.User 
                ? 'bg-shrovate-primary/10 border-shrovate-primary text-white rounded-tr-none' 
                : msg.isError
                    ? 'bg-red-900/20 border-red-500 text-red-200 rounded-tl-none'
                    : 'bg-shrovate-secondary/10 border-shrovate-secondary text-shrovate-core rounded-tl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1 border-b border-white/10 pb-1 justify-between">
                 <div className="flex items-center gap-2">
                    {msg.sender === Sender.System ? <Terminal className="w-3 h-3"/> : <div className="w-3 h-3 rounded-full bg-shrovate-primary"/>}
                    <span className="text-[10px] tracking-widest uppercase opacity-70">
                    {msg.sender}
                    </span>
                 </div>
                 {msg.audioData && (
                     <button 
                        onClick={() => playAudio(msg.audioData!)}
                        className="text-shrovate-primary hover:text-white transition-colors"
                        title="Replay Audio"
                     >
                         <Volume2 className="w-3 h-3" />
                     </button>
                 )}
              </div>
              <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{msg.text}</p>
              
              {/* Web Sources */}
              {msg.webSources && msg.webSources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-shrovate-primary/20">
                      <span className="text-[10px] text-shrovate-primary/70 uppercase tracking-wider mb-2 block flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Verified Sources
                      </span>
                      <div className="flex flex-wrap gap-2">
                          {msg.webSources.map((source, idx) => (
                              <a 
                                  key={idx} 
                                  href={source.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[10px] bg-shrovate-primary/5 text-shrovate-primary border border-shrovate-primary/30 px-2 py-1 rounded-sm hover:bg-shrovate-primary hover:text-black transition-all truncate max-w-[200px]"
                                  title={source.title}
                              >
                                  {source.title || new URL(source.uri).hostname}
                              </a>
                          ))}
                      </div>
                  </div>
              )}

              {/* Media Display (Image/Video) */}
              {msg.imageUrl && (
                <div className="mt-4 mb-2 relative group overflow-hidden rounded-sm border border-shrovate-primary/50 max-w-md">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-shrovate-primary to-shrovate-secondary z-10"></div>
                    <img 
                        src={msg.imageUrl} 
                        alt="Content" 
                        className="w-full h-auto object-contain bg-black/50"
                    />
                    
                    {/* Download Button Overlay */}
                    <button 
                        onClick={() => downloadMedia(msg.imageUrl!, 'image')}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-shrovate-primary hover:text-black z-20"
                        title="Download Image"
                    >
                        <Download className="w-4 h-4" />
                    </button>

                    {msg.sender === Sender.System && (
                        <div className="absolute bottom-0 left-0 w-full bg-black/80 backdrop-blur-sm p-2 flex items-center gap-2 border-t border-shrovate-primary/30">
                            <ImageIcon className="w-3 h-3 text-shrovate-primary" />
                            <span className="text-[10px] text-shrovate-primary tracking-wider">VISUAL_MATRIX_GENERATED</span>
                        </div>
                    )}
                </div>
              )}

              {msg.videoUrl && (
                  <div className="mt-4 mb-2 relative group overflow-hidden rounded-sm border border-shrovate-primary/50 max-w-md">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-shrovate-primary to-shrovate-secondary z-10"></div>
                      <video 
                          src={msg.videoUrl} 
                          controls
                          className="w-full h-auto object-contain bg-black/50"
                      />
                      
                      {/* Download Button Overlay */}
                      <button 
                          onClick={() => downloadMedia(msg.videoUrl!, 'video')}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-shrovate-primary hover:text-black z-20"
                          title="Download Video"
                      >
                          <Download className="w-4 h-4" />
                      </button>

                      {msg.sender === Sender.System && (
                          <div className="absolute bottom-0 left-0 w-full bg-black/80 backdrop-blur-sm p-2 flex items-center gap-2 border-t border-shrovate-primary/30">
                              <Video className="w-3 h-3 text-shrovate-primary" />
                              <span className="text-[10px] text-shrovate-primary tracking-wider">VEO_SYNTHESIS_COMPLETE</span>
                          </div>
                      )}
                  </div>
              )}
            </div>
            <span className="text-[10px] text-gray-500 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        
        {(loading || transcribing) && (
            <div className="flex items-start">
                <div className="bg-shrovate-secondary/10 border border-shrovate-secondary/50 p-3 rounded-sm rounded-tl-none max-w-[200px]">
                     <div className="flex items-center gap-2 text-shrovate-secondary text-xs font-bold animate-pulse">
                        {transcribing 
                            ? <><Mic className="w-3 h-3"/> TRANSCRIBING...</> 
                            : (loading && aiMode === 'thinking')
                                ? <><Brain className="w-3 h-3" /> THINKING...</>
                                : <><Terminal className="w-3 h-3" /> PROCESSING...</>
                        }
                     </div>
                </div>
            </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-shrovate-bg/80 border-t border-shrovate-primary/20 backdrop-blur-sm">
        
        {/* Attachment Preview */}
        {attachment && (
            <div className="flex items-center gap-2 mb-2 bg-shrovate-primary/10 p-2 rounded border border-shrovate-primary/30 w-fit">
                {attachment.type === 'image' ? (
                    <img src={attachment.preview} alt="Preview" className="h-12 w-12 object-cover rounded-sm border border-shrovate-primary/50" />
                ) : (
                    <div className="h-12 w-12 bg-black flex items-center justify-center border border-shrovate-primary/50 rounded-sm">
                        <Video className="w-6 h-6 text-shrovate-primary" />
                    </div>
                )}
                <div className="flex flex-col">
                    <span className="text-[10px] text-shrovate-primary truncate max-w-[150px]">
                        {attachment.type === 'video' ? 'VIDEO_DATA' : 'IMAGE_DATA'}
                    </span>
                    <span className="text-[9px] text-gray-400">{Math.round(attachment.data.length / 1024)} KB</span>
                </div>
                <button onClick={removeAttachment} className="ml-2 text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        <div className="flex items-end gap-2 relative">
          <div className="absolute left-0 bottom-3 pl-3 pointer-events-none text-shrovate-primary">
             <span className="animate-pulse">{'>'}</span>
          </div>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isVoiceMode ? "Listening mode active..." : isRecording ? "Recording..." : "Enter command or attach media..."}
            disabled={isRecording || transcribing}
            className="w-full bg-black/50 border border-shrovate-primary/50 rounded-sm py-3 pl-8 pr-24 text-white placeholder-shrovate-primary/30 focus:outline-none focus:border-shrovate-primary focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] resize-none overflow-hidden min-h-[50px]"
            rows={1}
            style={{ height: 'auto', minHeight: '50px' }}
          />

          {/* Input Controls */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {/* File Upload (Image & Video) */}
            <label className="p-2 text-shrovate-primary hover:text-white hover:bg-shrovate-primary/20 rounded-sm transition-colors cursor-pointer">
                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} disabled={loading || isRecording} />
                <Paperclip className="w-5 h-5" />
            </label>

            {/* Voice/Mic Control */}
            <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={loading || transcribing}
                className={`p-2 rounded-sm transition-colors ${
                    isRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : transcribing 
                            ? 'text-yellow-500' 
                            : 'text-shrovate-primary hover:text-white hover:bg-shrovate-primary/20'
                }`}
            >
                {transcribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Send Button */}
            <button
                onClick={handleSend}
                disabled={loading || isRecording || transcribing || (!input.trim() && !attachment)}
                className="p-2 text-shrovate-primary hover:text-white hover:bg-shrovate-primary/20 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex justify-between mt-1 px-1">
            <span className="text-[10px] text-gray-500 flex items-center gap-2">
                STATUS: {loading ? (aiMode === 'thinking' ? 'THINKING' : 'BUSY') : isRecording ? 'RECORDING' : 'READY'}
                {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
            </span>
            <span className="text-[10px] text-gray-500 flex items-center gap-2">
                {isVoiceMode ? 'MODE: VOICE' : 'MODE: TEXT'}
                <button onClick={() => setIsVoiceMode(!isVoiceMode)} className="hover:text-shrovate-primary">
                    {isVoiceMode ? <Mic className="w-3 h-3 text-shrovate-secondary"/> : <MicOff className="w-3 h-3"/>}
                </button>
            </span>
        </div>
      </div>
    </div>
  );
};