import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Candidate, COLORS } from './types';
import { voteService } from './services/voteService';
import { generateLiveCommentary } from './services/geminiService';
import Fireworks from './components/Fireworks';

// --- Shared Components ---

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = "https://images.unsplash.com/photo-1516280440614-6697288d5d38?auto=format&fit=crop&w=800&q=80";
};

// Custom Confirmation Modal
const ConfirmModal: React.FC<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDangerous?: boolean;
}> = ({ isOpen, title, message, onConfirm, onCancel, isDangerous }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-600 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-scale-up">
                <h3 className={`text-xl font-bold mb-2 ${isDangerous ? 'text-red-500' : 'text-white'}`}>{title}</h3>
                <p className="text-slate-300 mb-6 whitespace-pre-wrap">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                    >
                        取消
                    </button>
                    <button 
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-lg font-bold text-white transition-colors ${isDangerous ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                    >
                        確定執行
                    </button>
                </div>
            </div>
        </div>
    );
};

const Header: React.FC<{ title?: string; subtitle?: string; size?: 'small' | 'large' }> = ({ title, subtitle, size = 'large' }) => (
  <header className="text-center relative z-10 py-4 md:py-8 select-none animate-fade-in-down w-full">
    {/* Event Logo / Image Area */}
    <div className="flex justify-center mb-8 relative group">
        <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
        
        {/* 
            ⬇️⬇️⬇️ 這裡更換最上面的 LOGO 圖片 ⬇️⬇️⬇️
        */}
        <img 
            src="https://storage.googleapis.com/example-eggy-addressable/DownloadFile/Slogan.png" 
            alt="Spring Gala Logo" 
            onError={handleImageError}
            className="h-40 md:h-56 object-contain drop-shadow-[0_0_25px_rgba(234,179,8,0.5)] relative z-10"
        />
    </div>

    <div className="inline-block relative px-4">
      <div className="absolute inset-0 bg-red-600 blur-2xl opacity-30 rounded-full animate-pulse"></div>
      <h1 className={`font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-yellow-600 drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)] ${size === 'large' ? 'text-3xl md:text-5xl' : 'text-2xl md:text-4xl'} tracking-wider leading-tight`}>
        2026 廣達BU1,BU11,BU15<br className="md:hidden"/>春酒晚宴
      </h1>
    </div>
    {subtitle && (
      <p className="text-yellow-100/90 mt-2 font-bold tracking-[0.2em] uppercase text-xs md:text-lg drop-shadow-md">
        — {subtitle} —
      </p>
    )}
  </header>
);

// --- Pages ---

const VotePage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [scoredIds, setScoredIds] = useState<string[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [score, setScore] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGlobalTestMode, setIsGlobalTestMode] = useState(false);

  useEffect(() => {
    // 進入投票頁面時，主動抓取一次最新資料 (解決換頁延遲問題)
    voteService.fetchLatestData();

    const sync = () => {
      setCandidates(voteService.getCandidates());
      setScoredIds(voteService.getScoredCandidateIds());
      setIsGlobalTestMode(voteService.isGlobalTestMode);
    };
    sync();
    return voteService.subscribe(sync);
  }, []);

  const handleVote = async () => {
    if (!selectedCandidate) return;
    setIsSubmitting(true);
    
    // 假裝在忙，優化 UX
    await new Promise(r => setTimeout(r, 600)); 
    
    const result = await voteService.castVote(selectedCandidate.id, score);
    if (result.success) {
      setScoredIds([...scoredIds, selectedCandidate.id]);
      setSelectedCandidate(null); 
    } else {
      alert(result.message);
    }
    setIsSubmitting(false);
  };

  const openModal = (c: Candidate) => {
    // 只有在非測試模式下，才檢查是否投過
    if (!isGlobalTestMode && scoredIds.includes(c.id)) {
        alert("您已經評分過這位參賽者囉！");
        return;
    }
    setSelectedCandidate(c);
    setScore(10);
  };

  const sliderPercentage = ((score - 1) / 9) * 100;

  return (
    <div className="min-h-screen pb-24 px-4 relative z-10">
      <Header subtitle="歌唱大賽評分系統" />
      
      {/* Test Mode Banner */}
      {isGlobalTestMode && (
          <div className="flex justify-center mb-4 animate-fade-in-up">
              <div className="bg-green-600/90 text-white px-6 py-2 rounded-full flex items-center gap-2 shadow-lg animate-pulse border-2 border-green-400">
                  <span className="text-xl">🔧</span>
                  <span className="font-bold">測試模式：不限投票次數</span>
              </div>
          </div>
      )}

      {/* 提示訊息區塊 (正式模式才顯示) */}
      {!isGlobalTestMode && (
        <div className="flex justify-center mt-2 mb-6 animate-fade-in-up px-2">
            <div className="bg-slate-800/80 backdrop-blur-md border border-yellow-500/30 text-yellow-300 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(234,179,8,0.15)] max-w-full">
                <span className="text-xl animate-bounce">💡</span>
                <span className="font-bold text-sm md:text-base text-center leading-tight">提醒：每位演唱者只能評分一次喔！</span>
            </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {candidates.map((candidate) => {
          const isScored = scoredIds.includes(candidate.id);
          const isDisabled = isScored && !isGlobalTestMode; // 測試模式下永不禁用

          return (
            <div 
              key={candidate.id}
              onClick={() => !isDisabled && openModal(candidate)}
              className={`
                relative overflow-hidden rounded-[2rem] cursor-pointer transition-all duration-300 group
                ${isDisabled 
                  ? 'opacity-60 grayscale-[0.8] scale-95 cursor-default border-slate-700' 
                  : 'hover:scale-[1.03] hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(var(--color-glow),0.4)] border-slate-600'
                }
                bg-slate-800 border-2 shadow-2xl
              `}
              style={{ '--color-glow': candidate.color } as React.CSSProperties}
            >
              {/* Image Section */}
              <div className="h-64 w-full relative overflow-hidden">
                 {candidate.image ? (
                    <img 
                        src={candidate.image} 
                        alt={candidate.name} 
                        onError={handleImageError}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                 ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center text-5xl">🎤</div>
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90"></div>
                 
                 <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-xs font-bold text-white">
                    編號 #{candidate.id}
                 </div>

                 {isScored && !isGlobalTestMode && (
                     <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center z-10 backdrop-blur-[2px]">
                         <span className="bg-green-500 text-white px-8 py-3 rounded-full font-black text-xl transform -rotate-12 border-4 border-white shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                           ✓ 已評分
                         </span>
                     </div>
                 )}
                 {isScored && isGlobalTestMode && (
                     <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-md text-xs font-bold shadow-lg">
                         已投過
                     </div>
                 )}
              </div>

              {/* Content Section */}
              <div className="p-6 relative bg-slate-800 -mt-2">
                <h3 className="text-2xl font-black text-white group-hover:text-yellow-400 transition-colors line-clamp-1">
                  {candidate.name}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-yellow-500 animate-bounce">🎵</span>
                  <span className="text-slate-300 text-lg font-medium line-clamp-1">{candidate.song}</span>
                </div>
                
                {!isDisabled ? (
                  <button className="mt-6 w-full bg-slate-700 group-hover:bg-gradient-to-r group-hover:from-yellow-500 group-hover:to-red-500 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2">
                    <span>⭐</span> 點擊評分
                  </button>
                ) : (
                   <div className="mt-6 w-full text-center text-slate-500 text-sm py-4 font-bold border-t border-slate-700/50">
                     感謝您的參與
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Voting Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 w-full md:max-w-lg md:rounded-3xl rounded-t-3xl border-t md:border border-yellow-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-6 md:p-8 relative overflow-hidden animate-slide-up">
                <button 
                    onClick={() => setSelectedCandidate(null)}
                    className="absolute top-4 right-4 w-10 h-10 bg-slate-800 rounded-full text-slate-400 flex items-center justify-center z-10 hover:bg-slate-700 transition-colors"
                >✕</button>

                <div className="text-center mb-6">
                    <div className="w-28 h-28 mx-auto rounded-full p-1 bg-gradient-to-tr from-yellow-400 to-red-600 mb-4 shadow-xl">
                        {selectedCandidate.image ? (
                            <img 
                                src={selectedCandidate.image} 
                                onError={handleImageError}
                                className="w-full h-full rounded-full object-cover border-4 border-slate-900" 
                            />
                        ) : (
                            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-4xl">🎤</div>
                        )}
                    </div>
                    <h2 className="text-3xl font-black text-white mb-1 tracking-tight">{selectedCandidate.name}</h2>
                    <p className="text-yellow-400 text-lg font-medium">{selectedCandidate.song}</p>
                    
                    {selectedCandidate.videoLink && (
                        <a 
                            href={selectedCandidate.videoLink} 
                            target="_blank" 
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold transition-transform active:scale-95 shadow-lg shadow-blue-900/50"
                        >
                            <span>📺 觀看表演影片</span>
                        </a>
                    )}
                </div>

                <div className="mb-8 bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
                    <div className="flex justify-between text-slate-300 text-sm mb-6 font-bold uppercase tracking-wider">
                        <span>😐 普通</span>
                        <span className="text-yellow-400 text-xl animate-pulse">分數: {score}</span>
                        <span>🤩 超神</span>
                    </div>
                    
                    <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={score} 
                        onChange={(e) => setScore(Number(e.target.value))}
                        className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, #eab308 0%, #eab308 ${sliderPercentage}%, #334155 ${sliderPercentage}%, #334155 100%)`
                        }}
                    />
                    
                    <div className="flex justify-between mt-4 px-1">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <div 
                                key={n} 
                                onClick={() => setScore(n)}
                                className={`w-8 h-10 rounded-lg flex items-center justify-center text-sm font-bold cursor-pointer transition-all border
                                ${n === score 
                                    ? 'bg-yellow-500 text-black scale-125 border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.6)]' 
                                    : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600 hover:text-white'}`}
                            >
                                {n}
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleVote}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-yellow-500 to-red-600 text-white text-2xl font-black py-4 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.4)] active:scale-95 transition-all disabled:opacity-50 hover:brightness-110 relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    {isSubmitting ? '傳送中...' : `確認送出 ${score} 分`}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

const ResultsPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [commentary, setCommentary] = useState<string>("AI 正在分析戰況...");
  const [totalScore, setTotalScore] = useState(0);
  
  useEffect(() => {
    voteService.startPolling();

    const updateData = () => {
      const current = voteService.getCandidates();
      // Sort: Total Score Descending
      const sorted = [...current].sort((a, b) => b.totalScore - a.totalScore);
      setCandidates(sorted);
      setTotalScore(sorted.reduce((acc, c) => acc + c.totalScore, 0));
    };

    updateData();
    const unsub = voteService.subscribe(updateData);
    
    // AI Commentary Loop
    const commentInterval = setInterval(async () => {
        const currentCandidates = voteService.getCandidates();
        if (currentCandidates.length > 0) {
            const text = await generateLiveCommentary(currentCandidates);
            setCommentary(text);
        }
    }, 20000); // Update every 20s

    return () => {
        voteService.stopPolling();
        unsub();
        clearInterval(commentInterval);
    };
  }, []);

  // Top 3 for Podium
  const top3 = candidates.slice(0, 3);
  const others = candidates.slice(3);

  // Dynamic Font Size Calculation
  const maxScore = candidates[0]?.totalScore || 1;
  const getFontSizeClass = (score: number) => {
      const ratio = score / maxScore;
      if (ratio > 0.9) return "text-6xl md:text-8xl text-yellow-300 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]";
      if (ratio > 0.7) return "text-5xl md:text-7xl text-gray-100";
      return "text-4xl md:text-5xl text-gray-300";
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden relative pb-20">
      <Fireworks />
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/20 blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 px-4 md:px-8 py-6 max-w-7xl mx-auto h-full flex flex-col">
        <Header size="small" subtitle="即時戰況" />

        {/* AI Commentary Marquee */}
        <div className="mb-8 bg-slate-800/50 backdrop-blur-md border border-slate-600 p-4 rounded-xl shadow-lg relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
            <div className="flex items-center gap-4">
                <span className="text-2xl animate-spin-slow">🤖</span>
                <p className="text-xl md:text-2xl font-bold text-yellow-100 typing-effect whitespace-nowrap overflow-hidden text-ellipsis">
                    {commentary}
                </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </div>

        {/* Podium Layout (Top 3) */}
        <div className="flex flex-col md:flex-row justify-center items-end gap-4 md:gap-8 mb-12 min-h-[400px]">
            {/* 2nd Place */}
            {top3[1] && (
                <div className="order-2 md:order-1 w-full md:w-1/3 flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="relative mb-4">
                         <div className="w-24 h-24 rounded-full border-4 border-slate-400 overflow-hidden shadow-[0_0_20px_rgba(148,163,184,0.5)]">
                             <img src={top3[1].image} onError={handleImageError} className="w-full h-full object-cover" />
                         </div>
                         <div className="absolute -bottom-2 -right-2 text-4xl animate-pulse">🥈</div>
                    </div>
                    <div className="bg-slate-800/80 w-full p-4 rounded-t-2xl border-t-4 border-slate-400 flex flex-col items-center h-[200px] justify-end backdrop-blur-sm">
                         <h3 className="text-xl font-bold text-slate-300 text-center">{top3[1].name}</h3>
                         <span className="text-4xl font-black text-white mt-2">{top3[1].totalScore}</span>
                         <span className="text-xs text-slate-500 uppercase mt-1">Total Score</span>
                    </div>
                </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
                <div className="order-1 md:order-2 w-full md:w-1/3 flex flex-col items-center z-20 animate-slide-up">
                    <div className="relative mb-6">
                        <div className="absolute -inset-4 bg-yellow-500/30 blur-xl rounded-full animate-pulse"></div>
                        <div className="w-32 h-32 rounded-full border-4 border-yellow-400 overflow-hidden shadow-[0_0_40px_rgba(234,179,8,0.6)] relative z-10">
                            <img src={top3[0].image} onError={handleImageError} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-6xl animate-bounce z-20">👑</div>
                         <div className="absolute -bottom-2 -right-2 text-5xl drop-shadow-md z-20">🥇</div>
                    </div>
                    <div className="bg-gradient-to-b from-yellow-600/20 to-slate-800/90 w-full p-6 rounded-t-3xl border-t-4 border-yellow-400 flex flex-col items-center h-[260px] justify-end backdrop-blur-md shadow-2xl">
                         <h3 className="text-3xl font-black text-yellow-300 text-center drop-shadow-md mb-1">{top3[0].name}</h3>
                         <p className="text-yellow-100/70 text-sm font-bold mb-4">{top3[0].song}</p>
                         <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-yellow-200 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]">
                             {top3[0].totalScore}
                         </span>
                         <span className="text-sm text-yellow-500 font-bold uppercase mt-2 tracking-widest">Champion</span>
                    </div>
                </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
                <div className="order-3 md:order-3 w-full md:w-1/3 flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <div className="relative mb-4">
                         <div className="w-24 h-24 rounded-full border-4 border-orange-700 overflow-hidden shadow-[0_0_20px_rgba(194,65,12,0.5)]">
                             <img src={top3[2].image} onError={handleImageError} className="w-full h-full object-cover" />
                         </div>
                         <div className="absolute -bottom-2 -right-2 text-4xl animate-pulse">🥉</div>
                    </div>
                    <div className="bg-slate-800/80 w-full p-4 rounded-t-2xl border-t-4 border-orange-700 flex flex-col items-center h-[160px] justify-end backdrop-blur-sm">
                         <h3 className="text-xl font-bold text-orange-200 text-center">{top3[2].name}</h3>
                         <span className="text-4xl font-black text-white mt-2">{top3[2].totalScore}</span>
                         <span className="text-xs text-slate-500 uppercase mt-1">Total Score</span>
                    </div>
                </div>
            )}
        </div>

        {/* List for the rest */}
        <div className="grid grid-cols-1 gap-4">
            {others.map((c, idx) => (
                <div key={c.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 flex items-center gap-4 hover:bg-slate-700/50 transition-colors animate-fade-in-up" style={{ animationDelay: `${0.5 + idx * 0.1}s` }}>
                    <span className="text-2xl font-bold text-slate-500 w-8 text-center">#{idx + 4}</span>
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-slate-600">
                        {c.image && <img src={c.image} onError={handleImageError} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-white truncate">{c.name}</h4>
                        <p className="text-slate-400 text-sm truncate">🎵 {c.song}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-slate-300">{c.totalScore}</span>
                        <span className="text-xs text-slate-500 block">pts</span>
                    </div>
                </div>
            ))}
        </div>
        
        {/* Total Votes Footer */}
        <div className="mt-12 text-center pb-8">
            <div className="inline-block bg-slate-900/80 px-8 py-2 rounded-full border border-slate-700">
                <span className="text-slate-400">總累積票數: </span>
                <span className="text-white font-mono font-bold text-xl ml-2">{totalScore}</span>
            </div>
        </div>

      </div>
    </div>
  );
};

const AdminPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidate, setNewCandidate] = useState({ name: '', song: '', image: '', videoLink: '' });
  const [stressCount, setStressCount] = useState(0);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [globalTestMode, setGlobalTestMode] = useState(false);
  
  // Dialog States
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, isDangerous?: boolean}>({
      isOpen: false, title: '', message: '', onConfirm: () => {}
  });
  
  // Loading States
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    voteService.startPolling();
    const update = () => {
        setCandidates(voteService.getCandidates());
        setIsStressTesting(voteService.isRunningStressTest);
        setGlobalTestMode(voteService.isGlobalTestMode);
    };
    update();
    const unsub = voteService.subscribe(update);
    return () => {
        voteService.stopPolling();
        unsub();
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin888') {
      setIsAuthenticated(true);
    } else {
      alert('密碼錯誤');
    }
  };

  const handleGlobalTestModeToggle = async () => {
      const newState = !globalTestMode;
      setIsSaving(true);
      await voteService.setGlobalTestMode(newState);
      setIsSaving(false);
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `c${Date.now()}`;
    
    setConfirmModal({
        isOpen: true,
        title: '新增參賽者',
        message: `確定要新增 "${newCandidate.name}" 嗎？\n這將會寫入 Google Sheet。`,
        onConfirm: async () => {
            setConfirmModal(prev => ({...prev, isOpen: false}));
            setIsSaving(true);
            await voteService.addCandidate({ id, ...newCandidate });
            setNewCandidate({ name: '', song: '', image: '', videoLink: '' });
            setIsSaving(false);
        }
    });
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({
        isOpen: true,
        title: '刪除參賽者',
        message: `⚠️ 警告：確定要刪除 "${name}" 嗎？\n此操作無法復原，且會同步刪除 Excel 中的資料。`,
        isDangerous: true,
        onConfirm: async () => {
            setConfirmModal(prev => ({...prev, isOpen: false}));
            setIsSaving(true);
            await voteService.deleteCandidate(id);
            setIsSaving(false);
        }
    });
  };

  const handleStressTest = () => {
    setConfirmModal({
        isOpen: true,
        title: '🔥 開始壓力測試',
        message: '這將會在 60 秒內發送 100 筆真實請求到 Google Form。\n請確保您的網路穩定。\n\n確定要開始嗎？',
        isDangerous: true,
        onConfirm: () => {
            setConfirmModal(prev => ({...prev, isOpen: false}));
            voteService.runStressTest(100, 60, (count) => setStressCount(count));
        }
    });
  };

  const handleTestConnection = async () => {
      const res = await voteService.testConnection();
      alert(res.message);
  };

  const openFormDiagnostic = () => {
      window.open(voteService.getFormUrl(), '_blank');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <form onSubmit={handleLogin} className="glass-panel p-8 rounded-2xl w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6">後台管理登入</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 mb-4 text-white focus:ring-2 focus:ring-yellow-500 outline-none"
            placeholder="請輸入密碼"
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors">
            登入
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 pb-24">
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
        isDangerous={confirmModal.isDangerous}
      />

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">⚙️ 控制台</h1>
            <div className="flex gap-2">
                <button onClick={() => voteService.clearMyHistory()} className="bg-slate-700 px-4 py-2 rounded-lg text-sm">清除本機投票紀錄</button>
                <button onClick={() => setIsAuthenticated(false)} className="bg-red-600 px-4 py-2 rounded-lg text-sm">登出</button>
            </div>
        </div>

        {/* Sync Status Overlay */}
        {isSaving && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
                <div className="bg-slate-800 p-6 rounded-xl flex items-center gap-4 border border-slate-600 shadow-2xl">
                    <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-white font-bold">正在同步至 Google Sheet...</span>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
              {/* Global Mode Switch */}
              <div className="glass-panel p-6 rounded-2xl border-l-4 border-purple-500">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      🎮 活動模式設定
                      <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400">全場同步</span>
                  </h2>
                  <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl">
                      <div>
                          <p className={`font-bold text-lg ${globalTestMode ? 'text-green-400' : 'text-blue-400'}`}>
                              {globalTestMode ? '🛠 測試模式 (無限投票)' : '🏆 正式活動 (一人一票)'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                              {globalTestMode ? '允許重複投票，方便測試' : '嚴格限制裝置，防止灌票'}
                          </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={globalTestMode}
                              onChange={handleGlobalTestModeToggle}
                              disabled={isSaving}
                          />
                          <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                  </div>
              </div>

              {/* Stress Test */}
              <div className="glass-panel p-6 rounded-2xl border-l-4 border-red-500">
                <h2 className="text-xl font-bold mb-4">🚀 壓力測試</h2>
                <div className="bg-slate-800 p-4 rounded-lg mb-4">
                    <p className="text-sm text-slate-300 mb-2">
                        ⚠️ 警告：這會發送 <span className="text-red-400 font-bold">真實的 HTTP 請求</span> 到 Google Form。
                        請勿在正式活動時使用，以免干擾數據。
                    </p>
                    {isStressTesting ? (
                         <div className="text-center py-4">
                             <div className="text-2xl font-bold text-yellow-400 animate-pulse mb-2">正在發射... {stressCount}</div>
                             <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                 <div className="h-full bg-yellow-500 animate-pulse w-full"></div>
                             </div>
                             <button onClick={() => voteService.stopStressTest()} className="mt-4 bg-red-600 px-6 py-2 rounded-full font-bold">停止測試</button>
                         </div>
                    ) : (
                        <button 
                            onClick={handleStressTest}
                            className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/50 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <span>🔥</span> 開始真·壓力測試 (寫入 DB)
                        </button>
                    )}
                </div>
              </div>

              {/* Diagnostics */}
              <div className="glass-panel p-6 rounded-2xl border-l-4 border-blue-500">
                  <h2 className="text-xl font-bold mb-4">🔧 連線診斷</h2>
                  <div className="grid grid-cols-2 gap-4">
                      <button onClick={openFormDiagnostic} className="bg-slate-700 hover:bg-slate-600 p-3 rounded-lg text-sm text-left">
                          📝 1. 打開表單 (檢查權限)
                          <span className="block text-xs text-slate-400 mt-1">若看到登入畫面=失敗</span>
                      </button>
                      <button onClick={handleTestConnection} className="bg-slate-700 hover:bg-slate-600 p-3 rounded-lg text-sm text-left">
                          📡 2. 測試 API 讀取
                          <span className="block text-xs text-slate-400 mt-1">檢查 Apps Script</span>
                      </button>
                  </div>
                  <div className="mt-4 text-xs text-slate-400 bg-black/20 p-2 rounded">
                      <strong>私人帳號常見 401 錯誤：</strong><br/>
                      請至 Google 表單設定 &rarr; 回覆 &rarr; 關閉「僅限 1 次回覆」。這是最常見的原因。
                  </div>
              </div>
          </div>

          {/* Right Column: Manage Candidates */}
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-yellow-500">
             <h2 className="text-xl font-bold mb-4 flex justify-between items-center">
                 🎤 參賽者管理
             </h2>
             <div className="bg-yellow-500/10 text-yellow-200 p-3 rounded-lg text-sm mb-6 border border-yellow-500/20">
                 💡 這裡的操作會直接同步到 Google Sheet 的 <strong>Config</strong> 分頁。全場裝置重新整理後會看到變更。
             </div>

             <form onSubmit={handleAddCandidate} className="mb-8 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                 <h3 className="font-bold mb-4 text-slate-300">新增參賽者</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <input placeholder="參賽者/隊伍名稱" required className="bg-slate-900 border border-slate-600 rounded p-2" value={newCandidate.name} onChange={e => setNewCandidate({...newCandidate, name: e.target.value})} />
                     <input placeholder="演唱歌曲" required className="bg-slate-900 border border-slate-600 rounded p-2" value={newCandidate.song} onChange={e => setNewCandidate({...newCandidate, song: e.target.value})} />
                     <input placeholder="照片 URL (選填)" className="bg-slate-900 border border-slate-600 rounded p-2" value={newCandidate.image} onChange={e => setNewCandidate({...newCandidate, image: e.target.value})} />
                     <input placeholder="影片 URL (選填)" className="bg-slate-900 border border-slate-600 rounded p-2" value={newCandidate.videoLink} onChange={e => setNewCandidate({...newCandidate, videoLink: e.target.value})} />
                 </div>
                 <button type="submit" disabled={isSaving} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg disabled:opacity-50">
                     {isSaving ? '處理中...' : '+ 新增並同步'}
                 </button>
             </form>

             <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                 {candidates.map(c => (
                     <div key={c.id} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between group hover:bg-slate-750 transition-colors">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-slate-600 overflow-hidden">
                                 {c.image && <img src={c.image} className="w-full h-full object-cover" />}
                             </div>
                             <div>
                                 <div className="font-bold">{c.name}</div>
                                 <div className="text-xs text-slate-400">{c.song}</div>
                             </div>
                         </div>
                         <div className="flex items-center gap-4">
                             <div className="text-right">
                                 <div className="font-mono font-bold text-yellow-400">{c.totalScore}</div>
                                 <div className="text-[10px] text-slate-500">votes: {c.voteCount}</div>
                             </div>
                             <button 
                                onClick={() => handleDelete(c.id, c.name)}
                                className="text-slate-500 hover:text-red-500 p-2 transition-colors"
                                title="刪除"
                             >
                                 ✕
                             </button>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Dev Nav (Floating) ---
const DevNav: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    
    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 w-10 h-10 bg-slate-800/80 backdrop-blur text-white rounded-full flex items-center justify-center border border-slate-600 shadow-lg hover:scale-110 transition-transform opacity-50 hover:opacity-100"
            >
                🛠
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900/90 backdrop-blur border border-slate-600 p-2 rounded-xl flex flex-col gap-2 shadow-2xl animate-scale-up">
            <div className="flex justify-between items-center px-2 mb-1 border-b border-slate-700 pb-1">
                <span className="text-xs font-bold text-slate-400">快速導覽</span>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <Link to="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-center">📱 投票頁</Link>
            <Link to="/results" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-center">📺 電視牆</Link>
            <Link to="/admin" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-center">⚙️ 後台</Link>
        </div>
    );
};

// --- Main App ---

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<VotePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <DevNav />
    </HashRouter>
  );
};

export default App;