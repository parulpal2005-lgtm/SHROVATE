import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Zap, MapPin, Cloud, Wind, Calendar, Droplets, Database, Download, Share2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { ChatInterface } from './ChatInterface';
import { VoiceControl } from './VoiceControl';

// Mock data for visualizations
const SYSTEM_DATA = Array.from({ length: 20 }, (_, i) => ({
  name: i,
  val: Math.floor(Math.random() * 40) + 30,
  val2: Math.floor(Math.random() * 20) + 10,
}));

export const Dashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  // Simulated Weather Data for Prayagraj
  const [weather, setWeather] = useState({ temp: 32, aqi: 152, humidity: 45 });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Subtle random fluctuation for "live" feel
    const weatherTimer = setInterval(() => {
        setWeather(prev => ({
            temp: 32 + (Math.random() > 0.5 ? 0 : -1),
            aqi: 150 + Math.floor(Math.random() * 10 - 5),
            humidity: 45 + Math.floor(Math.random() * 4 - 2)
        }));
    }, 5000);

    return () => {
        clearInterval(timer);
        clearInterval(weatherTimer);
    };
  }, []);

  // Format: "MONDAY, 12 OCT"
  const dateString = currentTime.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short' 
  }).toUpperCase();

  const handleSystemDownload = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SHROVATE // SYSTEM LAUNCHER</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;900&display=swap');
        body { 
            background: #050505; 
            color: #00f3ff; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0; 
            font-family: 'Orbitron', monospace; 
            overflow: hidden;
        }
        .container {
            text-align: center;
            border: 1px solid rgba(0, 243, 255, 0.3);
            padding: 40px;
            background: rgba(0, 243, 255, 0.05);
            box-shadow: 0 0 30px rgba(0, 243, 255, 0.1);
            border-radius: 5px;
        }
        h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 0 0 10px #00f3ff; }
        p { color: #bc13fe; letter-spacing: 2px; margin-bottom: 30px; }
        .btn { 
            display: inline-block;
            padding: 15px 40px; 
            border: 2px solid #00f3ff; 
            color: #00f3ff; 
            background: transparent; 
            text-decoration: none; 
            font-size: 18px; 
            font-weight: bold;
            cursor: pointer; 
            transition: all 0.3s ease; 
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .btn:hover { 
            background: #00f3ff; 
            color: #050505; 
            box-shadow: 0 0 30px #00f3ff; 
        }
        .footer {
            margin-top: 20px;
            font-size: 10px;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>SHROVATE</h1>
        <p>SECURE NEURAL LINK // ACCESS PORTAL</p>
        <a href="${window.location.href}" class="btn" target="_blank">INITIALIZE SYSTEM</a>
        <div class="footer">SYSTEM VERSION 2.5 // BUILD 9442</div>
    </div>
</body>
</html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'SHROVATE_LAUNCHER.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen w-full p-2 md:p-4 gap-4 max-w-[1920px] mx-auto">
      
      {/* HEADER */}
      <header className="flex items-center justify-between bg-shrovate-panel border border-shrovate-primary/30 p-4 rounded-sm backdrop-blur-sm shadow-[0_0_20px_rgba(0,243,255,0.1)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-shrovate-primary rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border border-shrovate-primary animate-ping opacity-20"></div>
            <Zap className="w-6 h-6 text-shrovate-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wider text-shrovate-primary drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]">SHROVATE</h1>
            <div className="flex items-center gap-2 text-xs text-shrovate-primary/70 font-mono">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              SYSTEM ONLINE
            </div>
          </div>
        </div>

        {/* SYSTEM STATUS BAR (RIGHT SIDE) */}
        <div className="flex items-center gap-4 md:gap-8 font-mono text-sm">
          
          {/* Desktop Status Info */}
          <div className="hidden md:flex items-center gap-8">
              {/* Location & Weather Block */}
              <div className="flex flex-col items-end border-r border-shrovate-primary/20 pr-6 mr-2">
                 <div className="flex items-center gap-2 text-shrovate-primary mb-1">
                    <MapPin className="w-3 h-3" />
                    <span className="font-bold tracking-wider text-xs">PRAYAGRAJ, UP</span>
                 </div>
                 
                 <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-gray-300" title="Temperature">
                        <Cloud className="w-3 h-3 text-shrovate-core" /> {weather.temp}°C
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400" title="Air Quality Index">
                        <Wind className="w-3 h-3" /> AQI {weather.aqi}
                    </span>
                    <span className="flex items-center gap-1 text-blue-400" title="Humidity">
                        <Droplets className="w-3 h-3" /> {weather.humidity}%
                    </span>
                 </div>
              </div>

              {/* Date & Time Block */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 text-gray-400 text-xs tracking-widest mb-1">
                    <Calendar className="w-3 h-3" />
                    {dateString}
                </div>
                <div className="text-2xl font-bold text-white tracking-widest leading-none tabular-nums">
                  {currentTime.toLocaleTimeString('en-GB', { hour12: false })}
                </div>
              </div>
          </div>

          {/* Download App Button */}
          <button 
            onClick={handleSystemDownload}
            className="flex items-center gap-2 bg-shrovate-primary text-black px-4 py-2 rounded-sm font-bold hover:bg-white transition-all shadow-[0_0_10px_rgba(0,243,255,0.3)] ml-2"
            title="Download System Launcher"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">INSTALL APP</span>
          </button>
          
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        
        {/* LEFT SIDEBAR - METRICS */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4 overflow-y-auto pr-1">
          
          {/* Metric Card 1 */}
          <div className="bg-shrovate-panel border border-shrovate-primary/20 p-4 rounded-sm">
            <div className="flex items-center justify-between mb-4 border-b border-shrovate-primary/10 pb-2">
              <h3 className="flex items-center gap-2 font-mono text-shrovate-primary text-sm">
                <Cpu className="w-4 h-4" /> CPU_CORE_0
              </h3>
              <span className="text-xs text-shrovate-secondary">RUNNING</span>
            </div>
            <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SYSTEM_DATA}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="val" stroke="#00f3ff" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metric Card 2 */}
          <div className="bg-shrovate-panel border border-shrovate-primary/20 p-4 rounded-sm flex-1">
            <div className="flex items-center justify-between mb-4 border-b border-shrovate-primary/10 pb-2">
              <h3 className="flex items-center gap-2 font-mono text-shrovate-primary text-sm">
                <Activity className="w-4 h-4" /> NEURAL_LINK
              </h3>
              <span className="text-xs text-green-400">OPTIMAL</span>
            </div>
             <div className="h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={SYSTEM_DATA}>
                   <XAxis dataKey="name" hide />
                   <YAxis hide domain={[0, 100]} />
                   <Tooltip 
                    contentStyle={{ backgroundColor: '#050505', borderColor: '#bc13fe', color: '#fff' }} 
                    itemStyle={{ color: '#bc13fe' }}
                   />
                  <Line type="stepAfter" dataKey="val2" stroke="#bc13fe" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2 font-mono text-xs text-gray-400">
                <div className="flex justify-between">
                    <span>PACKETS_SENT</span>
                    <span className="text-white">4,092 TB</span>
                </div>
                <div className="flex justify-between">
                    <span>LATENCY</span>
                    <span className="text-white">12ms</span>
                </div>
                <div className="flex justify-between">
                    <span>ENCRYPTION</span>
                    <span className="text-shrovate-primary">AES-4096</span>
                </div>
            </div>
          </div>

        </aside>

        {/* CENTER - CHAT TERMINAL */}
        <main className="col-span-1 lg:col-span-6 flex flex-col bg-shrovate-panel border border-shrovate-primary/30 rounded-sm relative overflow-hidden">
            {/* Decorative Corner Lines */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-shrovate-primary rounded-tl-sm pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-shrovate-primary rounded-tr-sm pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-shrovate-primary rounded-bl-sm pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-shrovate-primary rounded-br-sm pointer-events-none"></div>
            
            <ChatInterface />
        </main>

        {/* RIGHT SIDEBAR - INFO & CONTROLS */}
        <aside className="hidden lg:flex lg:col-span-3 flex-col gap-4">
             <VoiceControl />
        </aside>

      </div>
    </div>
  );
};