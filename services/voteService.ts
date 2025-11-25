
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

// 預設名單 (當 Google Sheet Config 還是空的，或網路斷線時的備案)
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

class VoteService {
  private listeners: Array<() => void> = [];
  private candidates: Candidate[] = [...INITIAL_CANDIDATES]; 
  private pollingIntervalId: any = null;
  private pollingSubscriberCount = 0; // Reference counting for polling
  public isDemoMode = false;
  
  // Stress Test State
  public isRunningStressTest = false;

  constructor() {
      // No local storage loading for candidates anymore.
      // We rely on "Initial" -> "Google Sheet Remote"
  }

  // --- PUBLIC API ---

  getCandidates(): Candidate[] {
    return this.candidates;
  }

  // --- GOOGLE SHEET CONFIG SYNC (WRITE) ---

  /**
   * Sends a command to Google Apps Script to update the Excel Sheet.
   * Note: This uses 'no-cors' mode, so we won't get a readable response content,
   * but the action will be executed on the server.
   */
  private async sendConfigToSheet(action: 'ADD' | 'UPDATE' | 'DELETE', payload: any) {
    if (this.isDemoMode) {
        console.log(`🧪 [Demo Mode] Config change simulated: ${action}`, payload);
        this.applyLocalDemoChange(action, payload);
        return;
    }

    try {
        console.log(`📡 Sending Config Update: ${action}`, payload);
        
        // We use fetch with POST to the same exec URL
        // Payload must be stringified in the body
        await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Important for GAS Web Apps
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                payload: payload
            })
        });

        // Trigger an immediate poll to update the UI
        setTimeout(() => this.fetchLatestData(), 1000);
        setTimeout(() => this.fetchLatestData(), 3000); // Double tap to be sure

    } catch (e) {
        console.error("Config Sync Failed:", e);
        alert("同步至 Google Sheet 失敗，請檢查網路或是 Apps Script 部署權限。");
    }
  }

  // Admin: Add new candidate -> Writes to Sheet
  async addCandidate(c: Omit<Candidate, 'totalScore' | 'voteCount' | 'color'>) {
      await this.sendConfigToSheet('ADD', c);
  }

  // Admin: Update candidate -> Writes to Sheet
  async updateCandidate(id: string, updates: Partial<Candidate>) {
      // We need to send the full object or at least ID + updates
      await this.sendConfigToSheet('UPDATE', { id, ...updates });
  }

  // Admin: Delete candidate -> Writes to Sheet
  async deleteCandidate(id: string) {
      await this.sendConfigToSheet('DELETE', { id });
  }

  // Only used for Demo Mode to show UI changes without backend
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
  }

  // Added ignoreHistory param for Stress Testing
  async castVote(candidateId: string, score: number, ignoreHistory = false): Promise<{ success: boolean; message?: string }> {
    const scoredIds = this.getScoredCandidateIds();
    
    // Check history unless we are stress testing
    if (!ignoreHistory && scoredIds.includes(candidateId)) {
      return { success: false, message: "您已經評分過這位參賽者了！" };
    }

    if (this.isDemoMode) {
        if (!ignoreHistory) this.saveVoteLocally(candidateId);
        return { success: true };
    }

    // 關鍵修改：使用 URLSearchParams 而不是 FormData
    // 這對 Google Form 來說更穩定
    const params = new URLSearchParams();
    params.append(CONFIG.FORM_FIELDS.CANDIDATE_ID, candidateId);
    params.append(CONFIG.FORM_FIELDS.SCORE, score.toString());

    try {
      // Use 'no-cors' to send data to Google Form without reading response
      await fetch(CONFIG.GOOGLE_FORM_ACTION_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      if (!ignoreHistory) {
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

  // --- REAL STRESS TEST ---
  // This sends ACTUAL requests to Google Form
  async runStressTest(totalVotes: number, durationSeconds: number, onProgress: (count: number) => void) {
      if (this.isRunningStressTest) return;
      this.isRunningStressTest = true;
      
      console.log(`🔥 Starting REAL Stress Test: ${totalVotes} votes in ${durationSeconds}s`);
      console.log(`🎯 Target URL: ${CONFIG.GOOGLE_FORM_ACTION_URL}`);
      
      let sentCount = 0;
      const delayMs = (durationSeconds * 1000) / totalVotes;

      // Use a recursive timeout loop to prevent browser hanging and allow UI updates
      const sendNextBatch = async () => {
          if (sentCount >= totalVotes || !this.isRunningStressTest) {
              this.isRunningStressTest = false;
              console.log("🔥 Stress Test Finished");
              return;
          }

          // Randomize Candidate and Score
          const randomCandidate = this.candidates[Math.floor(Math.random() * this.candidates.length)];
          const randomScore = Math.floor(Math.random() * 10) + 1;

          try {
             // Fire the vote (ignoring history)
             await this.castVote(randomCandidate.id, randomScore, true);
             console.log(`🚀 Stress Test Vote Sent (${sentCount+1}/${totalVotes}): ${randomCandidate.id} = ${randomScore}分`);
          } catch(e) {
             console.error(`❌ Vote Failed: ${e}`);
          }

          sentCount++;
          onProgress(sentCount);

          // Add a little randomness to the delay (Jitter) to avoid exact robotic timing blocking
          const jitter = Math.random() * 50; 
          setTimeout(sendNextBatch, delayMs + jitter); 
      };

      sendNextBatch();
  }

  stopStressTest() {
      this.isRunningStressTest = false;
  }

  // --- LIVE POLLING ---

  startPolling() {
    this.pollingSubscriberCount++;
    console.log(`📡 [系統] 連線請求 (目前訂閱數: ${this.pollingSubscriberCount})`);
    
    if (this.pollingIntervalId) return; // 已經在跑了，不需要重複啟動
    
    console.log("🚀 [系統] 啟動即時同步 (每3秒)");
    this.fetchLatestData(); 
    this.pollingIntervalId = setInterval(() => {
      this.fetchLatestData();
    }, CONFIG.POLLING_INTERVAL);
  }

  stopPolling() {
    this.pollingSubscriberCount--;
    console.log(`📡 [系統] 取消連線請求 (目前訂閱數: ${this.pollingSubscriberCount})`);

    if (this.pollingSubscriberCount <= 0) {
      this.pollingSubscriberCount = 0; // 防呆
      if (this.pollingIntervalId) {
        console.log("🛑 [系統] 所有頁面已離開，停止同步以節省流量");
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

  // Made Public for one-off fetching (e.g., on Vote Page load)
  public async fetchLatestData() {
    try {
      const url = `${CONFIG.GOOGLE_SCRIPT_URL}?t=${Date.now()}`;
      const res = await fetch(url);
      
      if (!res.ok) return;
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return;
      }

      // Expected Structure: { s: { scores }, c: [ config array ] }
      const remoteScores = data.s || data;
      const remoteConfig = data.c || [];

      let hasChanges = false;
      let newCandidateList = [...this.candidates];

      // 1. 同步名單 (Remote Config from Sheet)
      // 如果 Sheet 有回傳 Config 資料，我們就以 Sheet 為準
      if (Array.isArray(remoteConfig) && remoteConfig.length > 0) {
          const mergedList = remoteConfig.map((rc: any, index: number) => {
              // 嘗試保留本地的一些暫存狀態 (如果有的話)，但主要是覆蓋
              const existing = this.candidates.find(c => c.id === rc.id);
              return {
                  id: rc.id,
                  name: rc.name,
                  song: rc.song,
                  image: rc.image || '',
                  videoLink: rc.videoLink || '',
                  totalScore: existing?.totalScore || 0,
                  voteCount: existing?.voteCount || 0,
                  color: existing?.color || COLORS[index % COLORS.length]
              };
          });

          // 簡單檢查是否有變更 (避免不必要的 re-render)
          if (JSON.stringify(mergedList) !== JSON.stringify(this.candidates.map(c => ({...c, totalScore:0, voteCount:0})))) {
              // 只比對基本欄位，不比對分數
              newCandidateList = mergedList;
              hasChanges = true;
          }
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
