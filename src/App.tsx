import React, { useState, useRef, useEffect, useCallback } from "react";
const W = 800, H = 600;

// ── Seeded-ish rand for stable per-shape variation ────────────────────────────
function shapeRng(seed: number) {
  let s = Math.abs(seed * 9301 + 49297) % 233280;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function ovalPts(cx: number, cy: number, rx: number, ry: number, rotDeg=0, n=15) {
  const rot = (rotDeg * Math.PI) / 180;
  const rng = shapeRng(cx*1000 + cy*100 + rx*10 + ry);
  const startOffset = (rng() - 0.5) * 0.4;
  const rawDeltas = Array.from({length: n}, () => 0.7 + rng() * 0.6);
  const total = rawDeltas.reduce((a,b)=>a+b, 0);
  const deltas = rawDeltas.map(d => d / total * Math.PI * 2);
  const pts: [number, number][] = [];
  let angle = startOffset;
  for (let i = 0; i <= n; i++) {
    const wobble = 1 + (rng() - 0.5) * 0.10;
    const wrx = rx * wobble, wry = ry * wobble;
    const ox = wrx * Math.cos(angle), oy = wry * Math.sin(angle);
    pts.push([
      cx + ox*Math.cos(rot) - oy*Math.sin(rot),
      cy + ox*Math.sin(rot) + oy*Math.cos(rot),
    ]);
    if (i < n) angle += deltas[i % deltas.length];
  }
  const closeNoise = Math.min(rx, ry) * 0.06;
  pts[pts.length - 1] = [
    pts[0][0] + (rng() - 0.5) * closeNoise,
    pts[0][1] + (rng() - 0.5) * closeNoise,
  ];
  return pts;
}

function arcPts(cx: number, cy: number, rx: number, ry: number, startDeg: number, endDeg: number, n=12) {
  const sa = (startDeg*Math.PI)/180, ea = (endDeg*Math.PI)/180;
  const rng = shapeRng(cx*777 + cy*333 + startDeg);
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const tWobble = t + (rng() - 0.5) * 0.06 * (t > 0 && t < 1 ? 1 : 0);
    const a = sa + tWobble * (ea - sa);
    const wobble = 1 + (rng() - 0.5) * 0.14;
    pts.push([cx + rx*wobble*Math.cos(a), cy + ry*wobble*Math.sin(a)]);
  }
  return pts;
}

function linePts(x1: number, y1: number, x2: number, y2: number) {
  const len = Math.hypot(x2-x1, y2-y1);
  const sway = Math.min(0.025, len * 0.18);
  const rng = shapeRng(x1*500 + y1*300 + x2 + y2);
  const mx1 = (x1+x2)/2 + (x1-x2)*0.1 + (rng()-0.5)*sway*2;
  const my1 = (y1+y2)/2 + (y1-y2)*0.1 + (rng()-0.5)*sway*2;
  return [[x1,y1],[mx1,my1],[x2,y2]] as [number, number][];
}

function strokeToPoints(s: any): [number, number][] {
  switch(s.type){
    case"oval": return ovalPts(s.cx,s.cy,s.rx,s.ry,s.rotation||0);
    case"arc":  return arcPts(s.cx,s.cy,s.rx,s.ry,s.startDeg??0,s.endDeg??180);
    case"line": return linePts(s.x1,s.y1,s.x2,s.y2);
    case"path": return (s.points||[]).map((p: any)=> p.x !== undefined ? [p.x, p.y] : (Array.isArray(p)?p:[.5,.5]));
    default:    return [];
  }
}

function cr(P0: number[],P1: number[],P2: number[],P3: number[],t: number){
  const t2=t*t,t3=t2*t;
  return[.5*(2*P1[0]+(-P0[0]+P2[0])*t+(2*P0[0]-5*P1[0]+4*P2[0]-P3[0])*t2+(-P0[0]+3*P1[0]-3*P2[0]+P3[0])*t3),
         .5*(2*P1[1]+(-P0[1]+P2[1])*t+(2*P0[1]-5*P1[1]+4*P2[1]-P3[1])*t2+(-P0[1]+3*P1[1]-3*P2[1]+P3[1])*t3)] as [number, number];
}

function interp(pts: [number, number][], res=12) {
  if(pts.length<2)return pts;
  const n=pts.length,out: [number, number][]=[];
  for(let i=0;i<n-1;i++){
    const P0=pts[Math.max(0,i-1)],P1=pts[i],P2=pts[Math.min(n-1,i+1)],P3=pts[Math.min(n-1,i+2)];
    for(let j=0;j<res;j++)out.push(cr(P0,P1,P2,P3,j/res));
  }
  out.push(pts[n-1]);return out;
}

function tremor(pts: [number, number][], s: any) {
  const size = s.type==="oval" ? (s.rx+s.ry) : s.type==="line" ? Math.hypot((s.x2-s.x1),(s.y2-s.y1)) : 0.1;
  const base = Math.min(0.006, size * 0.032);
  return pts.map(([x, y], i) => {
    const t = i / Math.max(1, pts.length - 1);
    const envelope = 0.4 + 0.6 * Math.sin(Math.PI * t);
    const amt = base * envelope;
    return [x + (Math.random()-0.5)*amt, y + (Math.random()-0.5)*amt] as [number, number];
  });
}

function velAt(t: number,mu=-1.4,sig=.75){
  if(t<=.001||t>=.999)return .05;
  return Math.max(.05,Math.min(4.5,((1/(t*sig))*Math.exp(-((Math.log(t)-mu)**2)/(2*sig**2)))*.55));
}

function px([x,y]: [number, number]){return[x*W, y*H];}

function drawBoard(ctx: CanvasRenderingContext2D){
  ctx.fillStyle="#2a362c"; // Chalkboard slate green
  ctx.fillRect(0,0,W,H);
  // Add some subtle noise/texture for chalkboard
  for(let i=0; i<8000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.025})`;
    ctx.fillRect(Math.random()*W, Math.random()*H, 1.5, 1.5);
  }
}

function getStrokeStyle(phase: number, prog: number, isCorrection = false) {
  let alpha = 0.8;
  let width = 2.0;
  if (phase === 1) { alpha = 0.15; width = 1.0; } // Ghost
  else if (phase === 2) { alpha = 0.35; width = 1.5; } // Construction
  else if (phase === 3) { alpha = 0.85; width = 2.5; } // Defining
  else if (phase === 5) { alpha = 1.0; width = 3.0; } // Detail
  
  const dustyAlpha = alpha * (0.6 + 0.4 * Math.random());
  // Warm tint for AI corrections to make them visible to the observer
  const color = isCorrection ? `rgba(255, 210, 180, ${dustyAlpha})` : `rgba(245, 250, 245, ${dustyAlpha})`;
  
  return {
    color,
    width: width * (0.8 + 0.4 * Math.sin(Math.PI * prog))
  };
}

function drawInstant(ctx: CanvasRenderingContext2D, strokes: any[]) {
  drawBoard(ctx);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const s of strokes) {
    const pts = tremor(interp(strokeToPoints(s), 16), s);
    if (pts.length < 2) continue;
    ctx.beginPath();
    
    const style = getStrokeStyle(s.phase || 3, 0.5, s.isCorrection);
    ctx.lineWidth = style.width;
    ctx.strokeStyle = style.color;
    
    const [sx, sy] = px(pts[0]); ctx.moveTo(sx, sy);
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = px(pts[i]); ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function animateOneStroke(ctx: CanvasRenderingContext2D, s: any, animRef: React.MutableRefObject<number | null>) {
  return new Promise<void>(resolve => {
    const pts = tremor(interp(strokeToPoints(s), 16), s);
    if (pts.length < 2) { resolve(); return; }
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    
    const [sx, sy] = px(pts[0]);
    ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); 
    ctx.fillStyle = `rgba(255,255,255,${s.phase === 1 ? 0.2 : 0.6})`; ctx.fill();
    
    let pi = 0;
    const tick = () => {
      if (pi >= pts.length) { resolve(); return; }
      const prog = pi / Math.max(1, pts.length - 1);
      const speed = velAt(prog);
      const style = getStrokeStyle(s.phase || 3, prog, s.isCorrection);
      
      const step = Math.max(1, Math.round(speed * 4));
      const end = Math.min(pi + step, pts.length);
      
      if (pi > 0) {
        ctx.beginPath(); 
        ctx.lineWidth = style.width;
        ctx.strokeStyle = style.color;
        const [ppx, ppy] = px(pts[pi - 1]); ctx.moveTo(ppx, ppy);
        for (let i = pi; i < end; i++) {
          const [x, y] = px(pts[i]); ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        if (Math.random() > 0.6) {
            const [lx, ly] = px(pts[end-1]);
            ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.2})`;
            ctx.fillRect(lx + (Math.random()-0.5)*12, ly + (Math.random()-0.5)*12, 1.5, 1.5);
        }
      }
      pi = end;
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  });
}


export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number | null>(null);
  const abortRef  = useRef(false);
  
  const [artistState, setArtistState] = useState("idle"); // idle, thinking, drawing, done, error
  const [artistThought, setArtistThought] = useState("Draw something to wake me up...");
  const [log, setLog] = useState<any[]>([]);
  const [apiLog, setApiLog] = useState<any[]>([]);
  const [rawStream, setRawStream] = useState<string>("");

  // Concurrency Refs
  const strokeQueue = useRef<any[]>([]);
  const isStreaming = useRef(false);
  const isDrawing = useRef(false);
  const buffer = useRef("");
  const parsedIndex = useRef(0);
  
  // User Drawing State
  const [isUserDrawing, setIsUserDrawing] = useState(false);
  const lastPos = useRef<{x: number, y: number} | null>(null);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(()=>{
    if (canvasRef.current) drawBoard(canvasRef.current.getContext("2d")!);
  },[]);

  const stop = () => {
    abortRef.current = true;
    if(animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = null;
    isStreaming.current = false;
    isDrawing.current = false;
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isStreaming.current || isDrawing.current) {
      stop(); // Interrupt AI
      setLog(prev => [...prev, { type: "plan", label: "Interrupted", thought: "Child took the chalk" }]);
    }
    setArtistState("idle");
    setArtistThought("Watching you draw...");
    setIsUserDrawing(true);
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    
    const rect = canvasRef.current!.getBoundingClientRect();
    lastPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const drawUserStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isUserDrawing || !lastPos.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 3.0; // Slightly thicker for kids
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    if (Math.random() > 0.5) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.4})`;
      ctx.fillRect(x + (Math.random()-0.5)*12, y + (Math.random()-0.5)*12, 1.5, 1.5);
    }
    
    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    setIsUserDrawing(false);
    lastPos.current = null;
    
    // Start the pause timer
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => {
      triggerAITurn();
    }, 2000); // 2 seconds of pause triggers the AI
  };

  // ── Streaming JSON Parser ───────────────────────────────────────────────────
  const parseStream = () => {
    let depth = 0;
    let inStr = false;
    let esc = false;
    let objStart = -1;
    const newStrokes = [];
    
    for (let i = parsedIndex.current; i < buffer.current.length; i++) {
      const char = buffer.current[i];
      if (esc) { esc = false; continue; }
      if (char === '\\') { esc = true; continue; }
      if (char === '"') { inStr = !inStr; continue; }
      if (!inStr) {
        if (char === '{') {
          if (depth === 0) objStart = i;
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0 && objStart !== -1) {
            const objStr = buffer.current.slice(objStart, i + 1);
            try {
              const obj = JSON.parse(objStr);
              if (obj.type && obj.phase) newStrokes.push(obj);
            } catch(e) { /* ignore partial/malformed */ }
            parsedIndex.current = i + 1;
            objStart = -1;
          }
        }
      }
    }
    return newStrokes;
  };

  // ── Drawing Engine (Pulls from Queue) ───────────────────────────────────────
  const processQueue = async (ctx: CanvasRenderingContext2D) => {
    if (isDrawing.current) return;
    isDrawing.current = true;
    
    while (strokeQueue.current.length > 0 || isStreaming.current) {
      if (abortRef.current) break;
      
      if (strokeQueue.current.length === 0) {
        await new Promise(r => setTimeout(r, 50));
        continue;
      }
      
      const stroke = strokeQueue.current.shift();
      
      setArtistThought(stroke.thought || `Drawing: ${stroke.label}`);
      
      await animateOneStroke(ctx, stroke, animRef);
      
      setLog(prev => [...prev, {
        type: "draw",
        label: stroke.label,
        thought: stroke.thought
      }]);
      
      await new Promise(r => setTimeout(r, 80));
    }
    
    isDrawing.current = false;
    if (!abortRef.current) {
      setArtistState("done");
      setArtistThought("Your turn! Draw something else.");
    }
  };

  // ── AI Turn Trigger ───────────────────────────────────────────────────────
  const triggerAITurn = async () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    
    abortRef.current = false;
    strokeQueue.current = [];
    buffer.current = "";
    parsedIndex.current = 0;
    
    setArtistState("thinking");
    setArtistThought("Hmm, what should we add?");

    try {
      isStreaming.current = true;
      processQueue(ctx);

      const img = canvasRef.current!.toDataURL("image/jpeg", 0.6).split(",")[1];

      setApiLog(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'req', data: { image: img.substring(0, 40) + "...[base64 truncated]" } }]);
      setRawStream("");

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: img })
      });

      if (!response.ok) {
        const errInfo = await response.text();
        throw new Error(errInfo || "Failed to fetch from backend API");
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response string from API");
      
      const decoder = new TextDecoder("utf-8");

      while (true) {
        if (abortRef.current) break;
        const { value, done } = await reader.read();
        if (done) break;
        buffer.current += decoder.decode(value, { stream: true });
        setRawStream(buffer.current);
        const newStrokes = parseStream();
        if (newStrokes.length > 0) {
          strokeQueue.current.push(...newStrokes);
        }
      }
      
      let finalData: any = buffer.current;
      try { finalData = JSON.parse(buffer.current); } catch(e) {}
      setApiLog(prev => [...prev, { time: new Date().toLocaleTimeString(), type: 'res', data: finalData }]);
      setRawStream("");
      
    } catch(e: any) { 
      console.error(e);
      setArtistState("error"); 
      setArtistThought(`Oops: ${e.message || e.toString()}`); 
    } finally {
      isStreaming.current = false;
    }
  };

  const stateColor: Record<string, string> = {
    thinking: "#d4aa60", drawing: "#88c0d0", done: "#a3be8c", idle: "#d8dee9", error: "#bf616a"
  };

  return(
    <div className="min-h-screen bg-[#1a201c] flex items-start justify-center p-6 font-mono text-slate-300 gap-6">
      <div className="flex flex-col items-center gap-4 w-full max-w-[840px] shrink-0">
        
        <div className="w-full flex justify-between items-baseline pb-3 border-b border-slate-700">
          <span className="font-serif italic text-2xl text-slate-200 tracking-wide">Magic Slate</span>
          <div className="flex gap-4 items-center">
            <span className="text-xs text-slate-500 tracking-widest uppercase">Co-Creation Mode</span>
            <button onClick={() => { stop(); drawBoard(canvasRef.current!.getContext("2d")!); setLog([]); setArtistThought("Draw something to wake me up..."); }} className="text-xs text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Wipe Board</button>
          </div>
        </div>

        <div className="relative shadow-2xl shadow-black/50 border border-slate-700 rounded-sm overflow-hidden touch-none" style={{width: W, height: H}}>
          <canvas 
            ref={canvasRef} 
            width={W} 
            height={H} 
            className="block w-full h-full cursor-crosshair"
            onPointerDown={startDrawing}
            onPointerMove={drawUserStroke}
            onPointerUp={stopDrawing}
            onPointerOut={stopDrawing}
          />
          
          {/* Status Bar */}
          <div className="absolute bottom-0 left-0 right-0 flex border-t border-white/10 bg-[#2a362c]/90 backdrop-blur-sm pointer-events-none">
            <div className="flex-1 px-4 py-3" style={{ color: stateColor[artistState] || "#d8dee9" }}>
              <span className="text-[10px] opacity-50 mr-3 uppercase tracking-widest">Magic Chalk</span>
              <span className="text-sm italic tracking-wide">{artistThought}</span>
            </div>
          </div>
        </div>

        {log.length > 0 && (
          <div className="w-full flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
            {log.slice(-20).map((e,i)=>(
              <div key={i} className="flex items-baseline gap-2 text-[10px] tracking-wide leading-relaxed animate-fade-in"
                   style={{color: e.type==="plan"?"#b48ead":"#a3be8c"}}>
                <span className="opacity-70 min-w-[16px]">{e.type==="plan"?"⊞":"✨"}</span>
                <span className="min-w-[100px] font-bold">{e.label}</span>
                {e.thought && <span className="opacity-50 italic text-[9px]">{e.thought}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Panel */}
      <div className="w-[450px] h-[675px] bg-[#111] border border-slate-800 rounded-sm hidden xl:flex flex-col overflow-hidden shadow-2xl mt-14">
        <div className="p-3 border-b border-slate-800 bg-[#151a17] flex justify-between items-center shrink-0">
          <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isStreaming.current ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]' : 'bg-emerald-500'}`}></span>
            API Debug Stream
          </span>
          <button onClick={() => { setApiLog([]); setRawStream(""); }} className="text-[9px] text-slate-500 hover:text-white uppercase tracking-widest transition-colors">Clear Log</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4 bg-[#0a0a0a]">
          {apiLog.map((logItem, idx) => (
             <div key={idx} className="bg-[#151a17] p-3 rounded-md border border-slate-800/80 shadow-sm">
                <div className="text-slate-500 mb-2 pb-2 border-b border-slate-800/80 flex justify-between items-center">
                  <span className={`text-[10px] tracking-wider font-bold ${logItem.type === 'req' ? 'text-blue-400' : 'text-emerald-400'}`}>
                    {logItem.type === 'req' ? 'OUTGOING REQUEST' : 'RESPONSE COMPLETE'}
                  </span>
                  <span className="text-[9px] opacity-40">{logItem.time}</span>
                </div>
                <div className="whitespace-pre-wrap text-slate-400 font-mono text-[10px] leading-relaxed">
                  {JSON.stringify(logItem.data, null, 2)}
                </div>
             </div>
          ))}
          
          {isStreaming.current && rawStream && (
            <div className="bg-[#151a17] p-3 rounded-md border border-amber-900/40 shadow-[0_0_15px_rgba(251,191,36,0.03)] animate-fade-in">
              <div className="text-amber-500/60 mb-2 pb-2 border-b border-amber-900/40 text-[9px] uppercase tracking-widest flex items-center gap-2">
                <span className="animate-pulse">Receiving Chunks...</span>
              </div>
              <div className="whitespace-pre-wrap text-amber-400/90 font-mono text-[10px] leading-relaxed break-all">
                {rawStream}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(2px); }
          to { opacity: 1; transform: none; }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out both; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4c566a; border-radius: 4px; }
      `}</style>
    </div>
  );
}
