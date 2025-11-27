
import { Candidate, COLORS } from '../types';

// --- CONFIGURATION ---
const CONFIG = {
  // 1. Google Form "Action" URL
  GOOGLE_FORM_ACTION_URL: "https://docs.google.com/forms/d/e/1FAIpQLSfjC1Zw8qajPoEojT2Swwq1ScZAM8fXD-NGT7yevCd66kllYg/formResponse", 

  // 2. Google Apps Script Web App URL
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxbhEbEpeGypeGLckGPlu9ViiCe6V4GLT2GMPabpU9v8ko0oJ1w0hJNsitdqu4M438b/exec",

  // 3. Entry IDs
  FORM_FIELDS: {
    CANDIDATE_ID: "entry.1851129085", 
    SCORE: "entry.672811542",        
  },

  POLLING_INTERVAL: 3000
};

// 預設名單
const INITIAL_CANDIDATES: Candidate[] = [
  { 
    id: 'c1', 
    name: '財務部 - 發財隊', 
    song: '恭喜發財', 
    image: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?auto=format&fit=crop&w=800&q=80',
    videoLink: '',
    totalScore: 0, 
    voteCount: 0,
    color: '#ef4444' 
  },
  { 
    id: 'c2', 
    name: '行銷部 - Lisa', 
    song: 'Super Star', 
    image: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?auto=format&fit=crop&w=800&q=80',
    videoLink: '',
    totalScore: 0, 
    voteCount: 0,
    color: '#f59e0b' 
  },
  { 
    id: 'c3', 
    name: '工程部 - 乖乖隊', 
    song: '堅持', 
    image: 'https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=800&q=80',
    videoLink: '',
    totalScore: 0, 
    voteCount: 0,
    color: '#3b82f6' 
  },
  { 
    id: 'c4', 
    name: '人資部 - 溫暖的心', 
    song: '手牽手', 
    image: 'https://images.unsplash.com/photo-1525994886773-080587e161c2?auto=format&fit=crop&w=800&q=80',
    videoLink: '',
    totalScore: 0, 
    voteCount: 0,
    color: '#d946ef' 
  },
  { 
    id: 'c5', 
    name: '業務部 - 業績長紅', 
    song: '我相信', 
    image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&w=800&q=80',
    videoLink: '',
    totalScore: 0, 
    voteCount: 0,
    color: '#10b981' 
  }
];

const STORAGE_KEY_USER_SCORES = 'spring_gala_user_scores_google_v1';
const SETTING_ROW_ID = 'SETTING_MODE'; // 特殊 ID，用於控制全域設定

class VoteService {
  private listeners: Array<() => void> = [];
  private candidates: Candidate[] = [...INITIAL_CANDIDATES]; 
  private pollingIntervalId: any = null;
  private pollingSubscriberCount = 0; 
  
  // Local Demo Mode (只影響本機顯示，不送出請求)
  public isDemoMode = false;
  
  // Global Test Mode (全場同步，允許重複投票)
  public isGlobalTestMode = false;
  private hasSettingRow = false; // 追蹤 Excel 是否已經有 SETTING_MODE 這一行

  // Stress Test State
  public isRunningStressTest = false;

  constructor() {}

  // --- PUBLIC API ---

  getCandidates(): Candidate[] {
    return this.candidates;
  }

  // --- CONFIG SYNC ---

  private async sendConfigToSheet(action: 'ADD' | 'UPDATE' | 'DELETE', payload: any) {
    if (this.isDemoMode) {
        console.log(`🧪 [Demo Mode] Config change simulated: ${action}`, payload);
        this.applyLocalDemoChange(action, payload);
        return;
    }

    try {
        console.log(`📡 Sending Config Update: ${action}`, payload);
        await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action, payload: payload })
        });
        setTimeout(() => this.fetchLatestData(), 1000);
        setTimeout(() => this.fetchLatestData(), 3000);
    } catch (e) {
        console.error("Config Sync Failed:", e);
        alert("同步至 Google Sheet 失敗，請檢查網路或是 Apps Script 部署權限。");
    }
  }

  async addCandidate(c: Omit<Candidate, 'totalScore' | 'voteCount' | 'color'>) {
      await this.sendConfigToSheet('ADD', c);
  }

  async updateCandidate(id: string, updates: Partial<Candidate>) {
      await this.sendConfigToSheet('UPDATE', { id, ...updates });
  }

  async deleteCandidate(id: string) {
      await this.sendConfigToSheet('DELETE', { id });
  }

  // 設定全域測試模式 (寫入 Excel)
  async setGlobalTestMode(enabled: boolean) {
      const payload = {
          id: SETTING_ROW_ID,
          name: enabled ? 'TEST' : 'OFFICIAL',
          song: 'SYSTEM_CONFIG',
          image: '',
          videoLink: ''
      };

      if (this.hasSettingRow) {
          await this.sendConfigToSheet('UPDATE', payload);
      } else {
          await this.sendConfigToSheet('ADD', payload);
      }
      // 樂觀更新本地狀態，讓 UI 反應更快
      this.isGlobalTestMode = enabled;
      this.notifyListeners();
  }

  private applyLocalDemoChange(action: string, payload: any) {
      if (action === 'ADD') {
           const newC = { ...payload, totalScore: 0, voteCount: 0, color: '#999' };
           this.candidates = [...this.candidates, newC];
      } else if (action === 'UPDATE') {
           this.candidates = this.candidates.map(c => c.id === payload.id ? { ...c, ...payload } : c);
      } else if (action === 'DELETE') {
           this.candidates = this.candidates.filter(c => c.id !== payload.id);
      }
      this.notifyListeners();
  }

  // --- VOTING ---

  getScoredCandidateIds(): string[] {
    const record = localStorage.getItem(STORAGE_KEY_USER_SCORES);
    if (record) {
      try {
        return JSON.parse(record);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  getFormUrl(): string {
      return CONFIG.GOOGLE_FORM_ACTION_URL.replace('formResponse', 'viewform');
  }

  setDemoMode(enabled: boolean) {
      this.isDemoMode = enabled;
      console.log(`🧪 Demo Mode: ${enabled ? 'ON' : 'OFF'}`);
      this.notifyListeners();
  }

  async castVote(candidateId: string, score: number, ignoreHistory = false): Promise<{ success: boolean; message?: string }> {
    const scoredIds = this.getScoredCandidateIds();
    
    // 如果是全域測試模式，或者是壓力測試，就跳過歷史檢查
    const shouldIgnoreHistory = ignoreHistory || this.isGlobalTestMode;
    
    if (!shouldIgnoreHistory && scoredIds.includes(candidateId)) {
      return { success: false, message: "您已經評分過這位參賽者了！" };
    }

    if (this.isDemoMode) {
        if (!shouldIgnoreHistory) this.saveVoteLocally(candidateId);
        return { success: true };
    }

    const params = new URLSearchParams();
    params.append(CONFIG.FORM_FIELDS.CANDIDATE_ID, candidateId);
    params.append(CONFIG.FORM_FIELDS.SCORE, score.toString());

    try {
      await fetch(CONFIG.GOOGLE_FORM_ACTION_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      
      if (!shouldIgnoreHistory) {
         this.saveVoteLocally(candidateId);
      }
      return { success: true };

    } catch (error) {
      console.error("Voting failed:", error);
      return { success: false, message: "傳送失敗，請檢查網路 (401 Check)" };
    }
  }

  private saveVoteLocally(candidateId: string) {
      const scoredIds = this.getScoredCandidateIds();
      const newScoredIds = [...scoredIds, candidateId];
      localStorage.setItem(STORAGE_KEY_USER_SCORES, JSON.stringify(newScoredIds));
      this.notifyListeners();
  }

  // --- STRESS TEST ---
  async runStressTest(totalVotes: number, durationSeconds: number, onProgress: (count: number) => void) {
      if (this.isRunningStressTest) return;
      this.isRunningStressTest = true;
      
      console.log(`🔥 Starting REAL Stress Test: ${totalVotes} votes`);
      let sentCount = 0;
      const delayMs = (durationSeconds * 1000) / totalVotes;

      const sendNextBatch = async () => {
          if (sentCount >= totalVotes || !this.isRunningStressTest) {
              this.isRunningStressTest = false;
              console.log("🔥 Stress Test Finished");
              return;
          }

          const randomCandidate = this.candidates[Math.floor(Math.random() * this.candidates.length)];
          const randomScore = Math.floor(Math.random() * 10) + 1;

          try {
             await this.castVote(randomCandidate.id, randomScore, true);
             console.log(`🚀 Stress Test Vote (${sentCount+1}): ${randomCandidate.id}=${randomScore}`);
          } catch(e) {
             console.error(`❌ Vote Failed: ${e}`);
          }

          sentCount++;
          onProgress(sentCount);
          const jitter = Math.random() * 50; 
          setTimeout(sendNextBatch, delayMs + jitter); 
      };

      sendNextBatch();
  }

  stopStressTest() {
      this.isRunningStressTest = false;
  }

  // --- POLLING ---

  startPolling() {
    this.pollingSubscriberCount++;
    if (this.pollingIntervalId) return; 
    this.fetchLatestData(); 
    this.pollingIntervalId = setInterval(() => {
      this.fetchLatestData();
    }, CONFIG.POLLING_INTERVAL);
  }

  stopPolling() {
    this.pollingSubscriberCount--;
    if (this.pollingSubscriberCount <= 0) {
      this.pollingSubscriberCount = 0; 
      if (this.pollingIntervalId) {
        clearInterval(this.pollingIntervalId);
        this.pollingIntervalId = null;
      }
    }
  }

  async testConnection(): Promise<{ok: boolean, message: string}> {
      try {
          const res = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?t=${Date.now()}`);
          if (res.ok) {
              const text = await res.text();
              return { ok: true, message: `連接成功！API 回傳長度: ${text.length}` };
          } else {
              return { ok: false, message: `HTTP 錯誤: ${res.status}` };
          }
      } catch (e: any) {
          return { ok: false, message: `連接失敗: ${e.message}` };
      }
  }

  public async fetchLatestData() {
    try {
      const url = `${CONFIG.GOOGLE_SCRIPT_URL}?t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) return;
      
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch (e) { return; }

      const remoteScores = data.s || data;
      const remoteConfig = data.c || [];

      let hasChanges = false;
      let newCandidateList: Candidate[] = [];
      
      // 檢查 Config 中是否有 SETTING_MODE
      let settingRowFound = false;
      let newGlobalTestMode = false;

      // 1. 同步名單 & 檢查特殊設定
      if (Array.isArray(remoteConfig) && remoteConfig.length > 0) {
          const mergedList: Candidate[] = [];
          
          remoteConfig.forEach((rc: any, index: number) => {
              // 檢查是否為特殊設定行
              if (rc.id === SETTING_ROW_ID) {
                  settingRowFound = true;
                  if (rc.name === 'TEST') {
                      newGlobalTestMode = true;
                  }
                  return; // 不加入名單列表
              }

              const existing = this.candidates.find(c => c.id === rc.id);
              mergedList.push({
                  id: rc.id,
                  name: rc.name,
                  song: rc.song,
                  image: rc.image || '',
                  videoLink: rc.videoLink || '',
                  totalScore: existing?.totalScore || 0,
                  voteCount: existing?.voteCount || 0,
                  color: existing?.color || COLORS[index % COLORS.length]
              });
          });

          // 更新狀態
          this.hasSettingRow = settingRowFound;
          if (this.isGlobalTestMode !== newGlobalTestMode) {
              this.isGlobalTestMode = newGlobalTestMode;
              hasChanges = true; // 模式改變也要通知 UI
          }

          // 如果名單有變，更新
          // 這裡有個小細節：因為 candidates 隨時在變 (分數在變)，所以不能只比對 Config
          // 暫且相信如果 remoteConfig 有東西，就完全採用它
          if (mergedList.length > 0) {
              // 這裡我們暫時只把架構建立起來，真正分數合併在下面
              newCandidateList = mergedList;
          } else {
              newCandidateList = [...this.candidates];
          }
      } else {
          newCandidateList = [...this.candidates];
      }

      // 2. 更新分數
      newCandidateList = newCandidateList.map(c => {
        const stats = remoteScores[c.id];
        if (stats) {
            const newTotal = stats.total !== undefined ? stats.total : stats.t;
            const newCount = stats.count !== undefined ? stats.count : stats.c;

            if (c.totalScore !== newTotal || c.voteCount !== newCount) {
                hasChanges = true;
                return { ...c, totalScore: newTotal, voteCount: newCount };
            }
        }
        return c;
      });

      // 如果名單結構變了 (例如從預設名單變成 Excel 名單)，也要觸發更新
      if (newCandidateList.length !== this.candidates.length || 
          newCandidateList.some((c, i) => c.id !== this.candidates[i].id)) {
          hasChanges = true;
      }

      if (hasChanges) {
        this.candidates = newCandidateList;
        this.notifyListeners();
      }

    } catch (error) {
      console.error("Polling error:", error);
    }
  }

  // --- STATE MANAGEMENT ---

  subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    callback();
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  clearMyHistory() {
    localStorage.removeItem(STORAGE_KEY_USER_SCORES);
    this.notifyListeners();
  }
}

export const voteService = new VoteService();
