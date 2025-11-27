
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Candidate, COLORS } from './types';
import { voteService } from './services/voteService';
import { generateLiveCommentary } from './services/geminiService';
import Fireworks from './components/Fireworks';

// --- Shared Components ---

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = "https://storage.googleapis.com/example-eggy-addressable/DownloadFile/Slogan.png";
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
            src="https://images.unsplash.com/photo-1548625361-98770742d4a0?auto=format&fit=crop&w=600&q=80" 
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
      const data = voteService.getCandidates();
      const sorted = [...data].sort((a, b) => b.totalScore - a.totalScore);
      setCandidates(sorted);
      setTotalScore(sorted.reduce((acc, curr) => acc + curr.totalScore, 0));
    };
    
    updateData();
    const unsubscribe = voteService.subscribe(updateData);

    return () => {
      unsubscribe();
      voteService.stopPolling();
    };
  }, []);

  useEffect(() => {
    const fetchCommentary = async () => {
      const currentCandidates = voteService.getCandidates();
      if (currentCandidates.length > 0 && currentCandidates.some(c => c.totalScore > 0)) {
        const text = await generateLiveCommentary(currentCandidates);
        setCommentary(text);
      }
    };
    
    const timer = setTimeout(fetchCommentary, 3000);
    const interval = setInterval(fetchCommentary, 20000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const top3 = candidates.slice(0, 3);
  const others = candidates.slice(3);
  const maxScore = candidates.length > 0 ? candidates[0].totalScore : 1;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white relative font-sans overflow-x-hidden">
      
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
        style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1920&q=80')`,
        }}
      >
        <div className="absolute inset-0 bg-slate-950/80 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full p-4 md:p-6">
        <Header subtitle={`總熱度: ${totalScore}`} size="small" />

        <div className="flex flex-col md:flex-row justify-center items-end gap-6 md:gap-8 mb-8 mt-4 md:h-[450px]">
           
           {/* 2nd Place */}
           {top3[1] && (
               <div className="order-2 md:order-1 w-full md:w-1/4 flex flex-col justify-end h-full animate-slide-up z-10" style={{ animationDelay: '0.2s' }}>
                   <div className="relative bg-slate-800/80 backdrop-blur-md rounded-t-3xl border-t-4 border-slate-400 p-6 text-center shadow-[0_0_30px_rgba(148,163,184,0.3)] h-[70%] flex flex-col items-center">
                        <div className="absolute -top-10 text-6xl drop-shadow-lg filter grayscale-[0.2] animate-float">🥈</div>
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-400 mb-2 mt-4 bg-slate-900">
                             {top3[1].image ? <img src={top3[1].image} onError={handleImageError} className="w-full h-full object-cover" /> : null}
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold truncate w-full">{top3[1].name}</h2>
                        <p className="text-slate-400 text-sm mb-4">{top3[1].song}</p>
                        <div className="mt-auto text-4xl font-black text-slate-200">{top3[1].totalScore}</div>
                   </div>
               </div>
           )}

           {/* 1st Place */}
           {top3[0] && (
               <div className="order-1 md:order-2 w-full md:w-1/3 flex flex-col justify-end h-full animate-slide-up z-20 mb-8 md:mb-0">
                   <div className="relative bg-gradient-to-b from-yellow-900/80 to-slate-900/90 backdrop-blur-md rounded-t-[3rem] border-t-8 border-yellow-400 p-8 text-center shadow-[0_0_60px_rgba(234,179,8,0.6)] h-[85%] flex flex-col items-center transform md:-translate-y-4">
                        <div className="absolute -top-14 text-8xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] animate-bounce">🥇</div>
                        <div className="absolute top-0 right-0 left-0 h-full w-full bg-yellow-400/5 rounded-t-[3rem] animate-pulse"></div>
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-yellow-400 mb-4 mt-8 shadow-xl bg-slate-900">
                             {top3[0].image ? <img src={top3[0].image} onError={handleImageError} className="w-full h-full object-cover" /> : null}
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-white truncate w-full mb-1">{top3[0].name}</h2>
                        <p className="text-yellow-400 font-bold text-lg mb-6">{top3[0].song}</p>
                        <div className="mt-auto text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 drop-shadow-sm">
                            {top3[0].totalScore}
                        </div>
                   </div>
               </div>
           )}

           {/* 3rd Place */}
           {top3[2] && (
               <div className="order-3 md:order-3 w-full md:w-1/4 flex flex-col justify-end h-full animate-slide-up z-10" style={{ animationDelay: '0.4s' }}>
                   <div className="relative bg-slate-800/80 backdrop-blur-md rounded-t-3xl border-t-4 border-orange-500 p-6 text-center shadow-[0_0_30px_rgba(249,115,22,0.3)] h-[60%] flex flex-col items-center">
                        <div className="absolute -top-10 text-6xl drop-shadow-lg filter sepia-[0.5] animate-float" style={{ animationDelay: '1s' }}>🥉</div>
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-orange-500 mb-2 mt-4 bg-slate-900">
                             {top3[2].image ? <img src={top3[2].image} onError={handleImageError} className="w-full h-full object-cover" /> : null}
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold truncate w-full">{top3[2].name}</h2>
                        <p className="text-slate-400 text-sm mb-4">{top3[2].song}</p>
                        <div className="mt-auto text-4xl font-black text-orange-200">{top3[2].totalScore}</div>
                   </div>
               </div>
           )}
        </div>

        {others.length > 0 && (
            <div className="max-w-5xl mx-auto w-full grid gap-3 animate-fade-in-up pb-8">
                {others.map((c, idx) => (
                    <div key={c.id} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-xl p-3 flex items-center gap-4 hover:bg-slate-700/60 transition-colors">
                        <div className="font-bold text-slate-400 w-8 text-center text-xl">#{idx + 4}</div>
                        <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                             {c.image ? <img src={c.image} onError={handleImageError} className="w-full h-full object-cover" /> : null}
                        </div>
                        <div className="flex-grow min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                             <div className="font-bold text-lg text-white truncate w-48">{c.name}</div>
                             <div className="text-sm text-slate-400 truncate md:w-48">🎵 {c.song}</div>
                             
                             <div className="hidden md:block flex-grow h-2 bg-slate-700 rounded-full overflow-hidden relative">
                                 <div 
                                    className="h-full bg-slate-500 rounded-full" 
                                    style={{ width: `${(c.totalScore / maxScore) * 100}%`, backgroundColor: c.color }}
                                 ></div>
                             </div>
                        </div>
                        <div className="text-2xl font-bold text-white w-20 text-right">{c.totalScore}</div>
                    </div>
                ))}
            </div>
        )}
        
        <div className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-md border-t border-yellow-500/30 p-2 md:p-3 flex items-center justify-center z-50">
            <span className="text-2xl mr-3 animate-pulse">🎤</span>
            <p className="text-sm md:text-xl font-bold text-yellow-100 text-center truncate max-w-4xl">{commentary}</p>
        </div>
      </div>
      <Fireworks />
    </div>
  );
};

const AdminPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isGlobalTestMode, setIsGlobalTestMode] = useState(false); // 全域測試模式狀態
  const [isSaving, setIsSaving] = useState(false); 
  
  const [stressProgress, setStressProgress] = useState({ count: 0, total: 0 });
  const [isStressing, setIsStressing] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCandidate, setNewCandidate] = useState({ id: '', name: '', song: '', image: '' });
  const [editForm, setEditForm] = useState({ name: '', song: '', image: '' });
  const [diagResult, setDiagResult] = useState<string>('');

  const [confirmState, setConfirmState] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      isDangerous: boolean;
      onConfirm: () => void;
  }>({
      isOpen: false,
      title: '',
      message: '',
      isDangerous: false,
      onConfirm: () => {}
  });

  useEffect(() => {
    if (isAuthed) {
        voteService.startPolling();
    }
    const update = () => {
        setCandidates(voteService.getCandidates());
        setIsDemoMode(voteService.isDemoMode);
        setIsGlobalTestMode(voteService.isGlobalTestMode);
    };
    voteService.subscribe(update);
    return () => {
        if (isAuthed) {
             voteService.stopPolling();
        }
    }
  }, [isAuthed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin888') setIsAuthed(true);
    else alert('Wrong password');
  };

  const toggleDemoMode = () => {
      const newState = !isDemoMode;
      voteService.setDemoMode(newState);
      setIsDemoMode(newState);
  };
  
  // 切換全域測試模式 (寫入 Excel)
  const toggleGlobalTestMode = async () => {
      const newState = !isGlobalTestMode;
      setIsSaving(true);
      try {
          await voteService.setGlobalTestMode(newState);
      } finally {
          setIsSaving(false);
      }
  };
  
  const testApi = async () => {
      setDiagResult("正在測試 API...");
      const res = await voteService.testConnection();
      setDiagResult(res.message);
  };

  const requestStressTest = () => {
      if (isDemoMode) {
          alert("請先關閉 Demo Mode，否則只是在跑假資料動畫！");
          return;
      }
      setConfirmState({
          isOpen: true,
          title: '🔥 確認執行壓力測試',
          message: '⚠️ 警告：這將會在一分鐘內對 Google Form 發送大量真實請求！\n\n這會導致 Google Sheet 瞬間增加數百行資料。\n\n確定要執行嗎？',
          isDangerous: true,
          onConfirm: () => {
              setConfirmState(prev => ({...prev, isOpen: false}));
              startStressTest();
          }
      });
  };

  const startStressTest = () => {
      setIsStressing(true);
      setStressProgress({ count: 0, total: 100 });
      
      voteService.runStressTest(100, 60, (c) => {
          setStressProgress(prev => ({ ...prev, count: c }));
          if (c >= 100) setIsStressing(false);
      });
  };

  const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCandidate.id || !newCandidate.name) return;
      
      setIsSaving(true);
      try {
          await voteService.addCandidate(newCandidate);
          setNewCandidate({ id: '', name: '', song: '', image: '' });
          alert("指令已發送！請稍等 3-5 秒，Excel 同步完成後列表將自動更新。");
      } finally {
          setIsSaving(false);
      }
  };

  const confirmDelete = (id: string) => {
      setConfirmState({
          isOpen: true,
          title: '🗑️ 確認刪除參賽者',
          message: `確定要刪除 ${id} 嗎?\n\n此操作將會刪除 Excel 中的資料，且全場觀眾端也會同步移除。`,
          isDangerous: true,
          onConfirm: () => {
              setConfirmState(prev => ({...prev, isOpen: false}));
              executeDelete(id);
          }
      });
  };

  const executeDelete = async (id: string) => {
      setIsSaving(true);
      try {
          await voteService.deleteCandidate(id);
      } finally {
          setIsSaving(false);
      }
  };

  const startEdit = (c: Candidate) => {
      setEditingId(c.id);
      setEditForm({ name: c.name, song: c.song, image: c.image || '' });
  };

  const saveEdit = async (id: string) => {
      setIsSaving(true);
      try {
          await voteService.updateCandidate(id, editForm);
          setEditingId(null);
      } finally {
          setIsSaving(false);
      }
  };

  if (!isAuthed) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-6 w-80 border border-slate-700">
          <h1 className="text-3xl text-white font-bold">後台管理登入</h1>
          <input 
            type="password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="bg-slate-700 text-white px-4 py-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-yellow-500 transition-all"
            placeholder="請輸入密碼"
          />
          <button className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold px-4 py-3 rounded-lg w-full hover:brightness-110 transition-all">登入</button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 text-white pb-24">
      <ConfirmModal 
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(prev => ({...prev, isOpen: false}))}
          isDangerous={confirmState.isDangerous}
      />

      <div className="max-w-7xl mx-auto">
        <Header subtitle="賽事控制台" size="small" />
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-slate-800/50 p-4 rounded-xl backdrop-blur-sm">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-200">
             🔧 管理工具
          </h2>
          <div className="flex items-center gap-4">
             {/* Global Test Mode Toggle */}
             <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-600">
                 <span className={`text-sm font-bold ${isGlobalTestMode ? 'text-green-400' : 'text-slate-400'}`}>
                     {isGlobalTestMode ? '🛠 測試模式 (無限投票)' : '🏆 正式活動 (一人一票)'}
                 </span>
                 <button 
                    onClick={toggleGlobalTestMode}
                    disabled={isSaving}
                    className={`w-14 h-7 rounded-full p-1 transition-colors relative ${isGlobalTestMode ? 'bg-green-600' : 'bg-slate-600'}`}
                 >
                     <div className={`w-5 h-5 bg-white rounded-full transition-transform shadow-md ${isGlobalTestMode ? 'translate-x-7' : 'translate-x-0'}`}></div>
                 </button>
             </div>

             <div className="flex items-center gap-2 border-l border-slate-600 pl-4">
                 <span className="text-sm font-bold text-slate-500">Demo (Local)</span>
                 <button 
                    onClick={toggleDemoMode}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${isDemoMode ? 'bg-blue-500' : 'bg-slate-700'}`}
                 >
                     <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isDemoMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                 </button>
             </div>
          </div>
        </div>
        
        {/* 連線診斷區塊 */}
        <div className="mb-8 grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-slate-200 mb-2">🚑 連線診斷</h3>
                <div className="flex flex-wrap gap-4">
                    <a 
                        href={voteService.getFormUrl()} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                    >
                        <span>📝 1. 打開表單 (檢查權限)</span>
                    </a>
                    <button 
                        onClick={testApi}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                    >
                        <span>📡 2. 測試 API 讀取</span>
                    </button>
                </div>
                {diagResult && (
                    <div className="mt-4 p-3 bg-black/30 rounded font-mono text-sm text-yellow-300">
                        {diagResult}
                    </div>
                )}
            </div>

            {/* 壓力測試區塊 */}
            <div className="bg-red-900/30 border border-red-700 p-6 rounded-2xl relative overflow-hidden">
                <h3 className="text-xl font-bold text-red-200 mb-2 flex items-center gap-2">
                    🔥 真·壓力測試 (Real Stress Test)
                </h3>
                <p className="text-sm text-red-300/80 mb-4">
                    這會在一分鐘內發送 <b>100 筆</b> 真實請求到 Google Form。<br/>
                    這會導致 Google Sheet 快速增加資料列，可測試後端承載力。
                </p>
                <button 
                    onClick={requestStressTest}
                    disabled={isStressing}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2"
                >
                   {isStressing ? `轟炸中... (${stressProgress.count}/100)` : '開始 60秒 / 100票 真實寫入測試'}
                </button>
                {isStressing && (
                    <div className="w-full bg-slate-700 h-2 mt-4 rounded-full overflow-hidden">
                        <div 
                            className="bg-red-500 h-full transition-all duration-300" 
                            style={{ width: `${(stressProgress.count / 100) * 100}%` }}
                        ></div>
                    </div>
                )}
            </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-12 mb-8 items-start">
          
          {/* Add Candidate Form */}
          <div className="md:col-span-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl md:sticky md:top-4 z-20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-slate-700 pb-2">
              <span className="text-green-400">➕ 新增參賽者</span>
            </h2>
            <div className="mb-4 text-xs bg-blue-900/30 text-blue-200 p-2 rounded border border-blue-700/50">
               ℹ️ 這裡的操作會同步寫入 <b>Google Sheet (Config 分頁)</b>，全場觀眾的手機會在 3-5 秒後自動更新。
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
                <input 
                    placeholder="ID (例: c6)" 
                    value={newCandidate.id}
                    onChange={e => setNewCandidate({...newCandidate, id: e.target.value})}
                    className="w-full bg-slate-700 p-3 rounded text-white"
                    disabled={isSaving}
                />
                <input 
                    placeholder="名稱 (例: 業務部)" 
                    value={newCandidate.name}
                    onChange={e => setNewCandidate({...newCandidate, name: e.target.value})}
                    className="w-full bg-slate-700 p-3 rounded text-white"
                    disabled={isSaving}
                />
                <input 
                    placeholder="歌名" 
                    value={newCandidate.song}
                    onChange={e => setNewCandidate({...newCandidate, song: e.target.value})}
                    className="w-full bg-slate-700 p-3 rounded text-white"
                    disabled={isSaving}
                />
                <input 
                    placeholder="照片連結 (選填)" 
                    value={newCandidate.image}
                    onChange={e => setNewCandidate({...newCandidate, image: e.target.value})}
                    className="w-full bg-slate-700 p-3 rounded text-white"
                    disabled={isSaving}
                />
                <button 
                    disabled={isSaving}
                    className={`w-full py-3 rounded font-bold transition-all flex items-center justify-center gap-2 ${isSaving ? 'bg-slate-600 cursor-wait' : 'bg-green-600 hover:bg-green-500'}`}
                >
                    {isSaving ? (
                        <>
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                            同步中...
                        </>
                    ) : '新增至雲端'}
                </button>
            </form>
          </div>

          {/* List */}
          <div className="md:col-span-8 bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl flex flex-col z-10">
            <div className="p-5 bg-slate-750 border-b border-slate-700 flex justify-between items-center">
              <h2 className="font-bold text-lg">目前參賽者名單</h2>
              <span className="text-xs text-slate-400">資料來源: Google Sheet</span>
            </div>
            <div className="flex-grow overflow-y-auto max-h-[70vh] md:max-h-[800px]">
                {candidates.map(c => (
                    <div key={c.id} className="flex items-center p-4 border-b border-slate-700 last:border-0 hover:bg-slate-700/40 transition-colors group">
                    <div className="w-16 h-16 rounded-xl bg-slate-700 overflow-hidden flex-shrink-0 border border-slate-600 mr-5 shadow-md relative">
                        {c.image ? <img src={c.image} onError={handleImageError} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl">👤</div>}
                    </div>
                    
                    {editingId === c.id ? (
                        <div className="flex-grow grid grid-cols-2 gap-2">
                             <input disabled={isSaving} className="bg-slate-900 p-2 rounded text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="名稱" />
                             <input disabled={isSaving} className="bg-slate-900 p-2 rounded text-sm" value={editForm.song} onChange={e => setEditForm({...editForm, song: e.target.value})} placeholder="歌名" />
                             <input disabled={isSaving} className="bg-slate-900 p-2 rounded text-sm col-span-2" value={editForm.image} onChange={e => setEditForm({...editForm, image: e.target.value})} placeholder="圖片URL" />
                             <div className="col-span-2 flex gap-2 mt-2">
                                <button disabled={isSaving} onClick={() => saveEdit(c.id)} className="bg-green-600 px-4 py-1 rounded text-sm disabled:opacity-50">
                                    {isSaving ? '...' : '儲存'}
                                </button>
                                <button disabled={isSaving} onClick={() => setEditingId(null)} className="bg-slate-600 px-4 py-1 rounded text-sm disabled:opacity-50">取消</button>
                             </div>
                        </div>
                    ) : (
                        <div className="flex-grow">
                            <div className="flex items-center gap-2">
                                <span className="bg-slate-900 text-slate-400 text-xs px-2 py-0.5 rounded font-mono">{c.id}</span>
                                <div className="font-bold text-xl text-slate-100">{c.name}</div>
                            </div>
                            <div className="text-yellow-500 font-medium">{c.song}</div>
                            <div className="flex gap-4 mt-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-700">🏆 總分: <b className="text-white">{c.totalScore}</b></span>
                                <span className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-700">👥 人數: <b className="text-white">{c.voteCount}</b></span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                        {editingId !== c.id && (
                            <>
                                <button disabled={isSaving} onClick={() => startEdit(c)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50">
                                    編輯
                                </button>
                                <button disabled={isSaving} onClick={() => confirmDelete(c.id)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold disabled:opacity-50">
                                    刪除
                                </button>
                            </>
                        )}
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

const DevNav = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 print:hidden">
      {/* Menu */}
      {isOpen && (
        <div className="bg-slate-900/95 p-3 rounded-xl border border-slate-600 shadow-2xl backdrop-blur-md text-sm animate-fade-in-up flex flex-col gap-2 min-w-[160px]">
           <div className="text-slate-400 text-center border-b border-slate-700 pb-2 mb-1 text-xs font-bold uppercase tracking-wider">
             快速切換 (Demo)
           </div>
           <Link onClick={() => setIsOpen(false)} to="/" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${location.pathname === '/' ? 'bg-yellow-600 text-white font-bold shadow-lg' : 'text-slate-300 hover:bg-slate-700'}`}>
             <span className="text-lg">📱</span> 投票頁 (手機)
           </Link>
           <Link onClick={() => setIsOpen(false)} to="/results" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${location.pathname === '/results' ? 'bg-blue-600 text-white font-bold shadow-lg' : 'text-slate-300 hover:bg-slate-700'}`}>
             <span className="text-lg">📺</span> 電視牆 (結果)
           </Link>
           <Link onClick={() => setIsOpen(false)} to="/admin" className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${location.pathname === '/admin' ? 'bg-slate-700 text-white font-bold shadow-lg border border-slate-500' : 'text-slate-300 hover:bg-slate-700'}`}>
             <span className="text-lg">⚙️</span> 後台 (管理)
           </Link>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-slate-600 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
      >
        {isOpen ? '✕' : '🛠'}
      </button>
    </div>
  );
};

// --- App ---

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="font-sans text-white selection:bg-yellow-500 selection:text-black">
        <Routes>
          <Route path="/" element={<VotePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
        <DevNav />
      </div>
    </HashRouter>
  );
};

export default App;
