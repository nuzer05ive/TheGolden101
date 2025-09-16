'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}
function hexToBigInt(hex: string): bigint { return BigInt('0x' + hex); }
function bigIntMod(n: bigint, m: number): number { return Number(n % BigInt(m)); }

export type SP1RLAddress = {
  rawHash: bigint;
  index: number;
  seat_core: number;
  wobble_slot: number;
  cluster: number;
  seat_id?: number;
};

function buildRing(seedHash: bigint): number[] {
  const base: number[] = Array.from({ length: 89 }, (_, i) => i);
  const ring = base.slice();
  for (let j = 0; j < 11; j++) {
    const off = Number((seedHash >> BigInt(j + 1)) % BigInt(89));
    const insertAt = (off + j) % (ring.length + 1);
    ring.splice(insertAt, 0, 89 + j);
  }
  return ring;
}
function roleAtTime(seatId: number, tTurn: number) {
  const phase = Math.floor(tTurn / 89);
  let localPos = seatId;
  if (phase % 2 === 1) {
    const inCore = seatId < 89;
    localPos = inCore ? 88 - (seatId % 89) : (89 + (seatId - 89));
  }
  const roleIndex = (localPos + tTurn) % 100;
  return { roleIndex, cluster: Math.floor(roleIndex / 10), subrole: roleIndex % 10, phase };
}
async function sp1rlAddress(isoTs: string): Promise<SP1RLAddress> {
  const hHex = await sha256Hex(isoTs);
  const H = hexToBigInt(hHex);
  const index = bigIntMod(H, 1_000_000);
  const seat_core = index % 89;
  const wobble_slot = Number((H >> 16n) % 11n);
  const cluster = Math.floor(index / 1000) % 10;
  return { rawHash: H, index, seat_core, wobble_slot, cluster };
}
function polarLayout(n: number, radius: number, cx: number, cy: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const theta = (i / n) * Math.PI * 2;
    pts.push({ x: cx + radius * Math.cos(theta), y: cy + radius * Math.sin(theta) });
  }
  return pts;
}

export default function SpirlViewer() {
  const [timestamps, setTimestamps] = useState<string>(['1990-01-01T12:00:00Z','1993-07-12T14:05:00Z','2000-05-09T10:16:00-07:00'].join('\\n'));
  const [addresses, setAddresses] = useState<SP1RLAddress[]>([]);
  const [ring, setRing] = useState<number[]>(Array.from({ length: 100 }, (_, i) => i));
  const [t, setT] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const rafRef = useRef<number | null>(null);
  const lastTick = useRef<number | null>(null);

  const generate = async () => {
    const lines = timestamps.split(/\\n+/).map(s => s.trim()).filter(Boolean);
    const seedTs = lines[0] || new Date().toISOString();
    const seed = await sp1rlAddress(seedTs);
    const ringLayout = buildRing(seed.rawHash);

    const addrs: SP1RLAddress[] = [];
    for (const ts of lines) {
      const a = await sp1rlAddress(ts);
      const seat_id = ringLayout.indexOf(a.seat_core);
      addrs.push({ ...a, seat_id });
    }
    setRing(ringLayout);
    setAddresses(addrs);
    setT(0);
  };
  useEffect(() => { generate(); }, []);

  useEffect(() => {
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; lastTick.current = null; return; }
    const loop = (now: number) => {
      if (lastTick.current == null) lastTick.current = now;
      const dt = (now - lastTick.current) / 1000;
      const advance = dt * speed;
      if (advance >= 1/30) { setT(prev => prev + Math.max(1, Math.floor(advance * 1))); lastTick.current = now; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed]);

  const size = 720, cx = size/2, cy = size/2;
  const pts = useMemo(() => polarLayout(100, size * 0.33, cx, cy), [size]);
  const sentinel = useMemo(() => ({ at89: t % 89 === 0 && t !== 0, at101: t % 101 === 0 && t !== 0, at103: t % 103 === 0 && t !== 0 }), [t]);

  return (
    <div className="w-full min-h-screen p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">SP1RL React Viewer</h1>
          <p className="text-slate-300 text-sm">100-seat ring • 89-core + 11 wobble • Möbius role rotation</p>
          <label className="block text-sm mb-1">Birth timestamps (ISO, one per line)</label>
          <textarea className="w-full h-40 rounded-2xl bg-slate-900/70 border border-slate-700 p-3 focus:outline-none focus:ring-2 focus:ring-teal-400" value={timestamps} onChange={e => setTimestamps(e.target.value)} />
          <div className="flex items-center gap-3">
            <button onClick={generate} className="px-4 py-2 rounded-2xl bg-teal-500/90 hover:bg-teal-400 text-black font-semibold shadow">Generate</button>
            <button onClick={() => setPlaying(p => !p)} className="px-4 py-2 rounded-2xl bg-indigo-500/90 hover:bg-indigo-400 text-black font-semibold shadow">{playing ? 'Pause' : 'Play'}</button>
            <button onClick={() => setT(0)} className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600">Reset</button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Turn t = <span className="font-mono">{t}</span></span>
              <span className="font-mono">phase ⟳ = {Math.floor(t / 89)}</span>
            </div>
            <input type="range" min={0} max={999} value={t} onChange={e => setT(parseInt(e.target.value))} className="w-full" />
            <div className="flex items-center justify-between text-sm">
              <span>Speed</span>
              <input type="range" min={0} max={10} value={speed} onChange={e => setSpeed(parseInt(e.target.value))} className="w-48" />
            </div>
          </div>
          <div className="rounded-2xl p-3 border border-slate-700 bg-slate-900/60">
            <div className="text-sm font-semibold mb-2">Sentinel</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className={`rounded-xl px-2 py-1 text-center ${sentinel.at89 ? 'bg-teal-400 text-black' : 'bg-slate-800'}`}>89</div>
              <div className={`rounded-xl px-2 py-1 text-center ${sentinel.at101 ? 'bg-fuchsia-400 text-black' : 'bg-slate-800'}`}>101</div>
              <div className={`rounded-xl px-2 py-1 text-center ${sentinel.at103 ? 'bg-amber-300 text-black' : 'bg-slate-800'}`}>103</div>
            </div>
          </div>
          <div className="rounded-2xl p-3 border border-slate-700 bg-slate-900/60">
            <div className="text-sm font-semibold mb-2">Addresses ({addresses.length})</div>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {addresses.map((a, i) => (
                <div key={i} className="rounded-xl p-2 bg-slate-800/60 border border-slate-700">
                  <div className="text-xs">seat_core: <span className="font-mono">{a.seat_core}</span> → seat_id: <span className="font-mono">{a.seat_id}</span></div>
                  <div className="text-xs">index: <span className="font-mono">{a.index}</span> • cluster: <span className="font-mono">{a.cluster}</span> • wobble_slot: <span className="font-mono">{a.wobble_slot}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-4">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full">
              <defs>
                <radialGradient id="halo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#0ff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx={cx} cy={cy} r={size * 0.36} fill="url(#halo)" />
              {ring.map((id, i) => {
                const pts = (i2: number) => { const theta = (i2 / 100) * Math.PI * 2; return { x: cx + size*0.33*Math.cos(theta), y: cy + size*0.33*Math.sin(theta) }; };
                const a = pts(i); const b = pts((i + 1) % 100);
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1e293b" strokeWidth={2} />;
              })}
              {ring.map((id, i) => {
                const theta = (i / 100) * Math.PI * 2;
                const x = cx + size*0.33*Math.cos(theta); const y = cy + size*0.33*Math.sin(theta);
                const inCore = id < 89; const fill = inCore ? '#14b8a6' : '#a78bfa'; const r = inCore ? 8 : 9.5;
                return <circle key={i} cx={x} cy={y} r={r} fill={fill} opacity={0.85} />;
              })}
              {addresses.map((a, idx) => {
                if (a.seat_id == null) return null;
                const role = roleAtTime(a.seat_id, t);
                const theta = (a.seat_id / 100) * Math.PI * 2;
                const x = cx + size*0.33*Math.cos(theta); const y = cy + size*0.33*Math.sin(theta);
                const hueBase = role.cluster * 36; const color = `hsl(${hueBase}, 85%, 60%)`;
                return (
                  <g key={idx}>
                    <circle cx={x} cy={y} r={14} fill={color} stroke="#0f172a" strokeWidth={2} />
                    <text x={x} y={y + 4} textAnchor="middle" style={{ fontSize: 10, fontFamily: 'ui-monospace, SFMono-Regular' }} fill="#000">
                      {role.cluster}:{role.subrole}
                    </text>
                  </g>
                );
              })}
              <g>
                <rect x={16} y={16} width={240} height={92} rx={16} ry={16} fill="#020617" stroke="#334155" />
                <text x={28} y={40} fill="#e2e8f0" style={{ fontSize: 14, fontWeight: 700 }}>Legend</text>
                <circle cx={32} cy={60} r={6} fill="#14b8a6" />
                <text x={46} y={64} fill="#cbd5e1" style={{ fontSize: 12 }}>89-core seat</text>
                <circle cx={32} cy={80} r={6} fill="#a78bfa" />
                <text x={46} y={84} fill="#cbd5e1" style={{ fontSize: 12 }}>wobble seat (88+1→100)</text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
