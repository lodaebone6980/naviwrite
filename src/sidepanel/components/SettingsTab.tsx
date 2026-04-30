import { useState, useEffect } from "react";

export default function SettingsTab() {
  const [apiKey, setApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState<"claude" | "gpt">("claude");
  const [serverUrl, setServerUrl] = useState("https://web-production-184ff.up.railway.app");
  const [obsidianEnabled, setObsidianEnabled] = useState(false);
  const [obsidianUrl, setObsidianUrl] = useState("http://localhost:27123");
  const [blogId, setBlogId] = useState("");
  const [notifications, setNotifications] = useState({
    rankingChange: true,
    feedbackReady: true,
    weeklyReport: false,
  });
  const [saved, setSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  // 마운트 시 저장된 설정 불러오기
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.get("settings", (data) => {
        const s = data?.settings;
        if (s) {
          if (s.apiKey) setApiKey(s.apiKey);
          if (s.aiProvider) setAiProvider(s.aiProvider);
          if (s.serverUrl) setServerUrl(s.serverUrl);
          if (s.obsidianEnabled !== undefined) setObsidianEnabled(s.obsidianEnabled);
          if (s.obsidianApiUrl) setObsidianUrl(s.obsidianApiUrl);
          if (s.naverBlogId) setBlogId(s.naverBlogId);
          if (s.notifications) setNotifications(s.notifications);
        }
      });
    }
  }, []);

  const handleSave = () => {
    const settings = {
      apiKey,
      aiProvider,
      serverUrl,
      obsidianEnabled,
      obsidianApiUrl: obsidianUrl,
      naverBlogId: blogId,
      notifications,
    };

    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.set({ settings }, () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    } else {
      console.log("Settings saved:", settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus("testing");
    try {
      const res = await fetch(`${serverUrl}/api/stats`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setConnectionStatus("ok");
      } else {
        setConnectionStatus("fail");
      }
    } catch {
      setConnectionStatus("fail");
    }
    setTimeout(() => setConnectionStatus("idle"), 3000);
  };

  return (
    <div className="space-y-5">
      {/* 서버 연동 */}
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[12px] font-bold text-primary mb-3">🌐 서버 연동</h3>

        <div className="mb-3">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">서버 URL</label>
          <input
            type="url"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://web-production-184ff.up.railway.app"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <p className="text-[9px] text-gray-400 mt-1">
            Auto-Blog 백엔드 서버 주소입니다
          </p>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={connectionStatus === "testing"}
          className={`w-full py-2 rounded-lg text-[11px] font-bold transition ${
            connectionStatus === "ok"
              ? "bg-success text-white"
              : connectionStatus === "fail"
              ? "bg-danger text-white"
              : connectionStatus === "testing"
              ? "bg-gray-300 text-gray-500 cursor-wait"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {connectionStatus === "testing" ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-gray-400/30 border-t-gray-500 rounded-full animate-spin" />
              연결 테스트 중...
            </span>
          ) : connectionStatus === "ok" ? (
            "연결 성공!"
          ) : connectionStatus === "fail" ? (
            "연결 실패 - URL을 확인해주세요"
          ) : (
            "🔗 서버 연결 테스트"
          )}
        </button>
      </section>

      {/* AI 설정 */}
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[12px] font-bold text-primary mb-3">🤖 AI 엔진 설정</h3>

        <div className="mb-3">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">AI 프로바이더</label>
          <div className="flex gap-2">
            {(["claude", "gpt"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setAiProvider(p)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-semibold border transition ${
                  aiProvider === p
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-500 border-gray-200 hover:border-accent"
                }`}
              >
                {p === "claude" ? "Claude (Anthropic)" : "GPT-4o (OpenAI)"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={aiProvider === "claude" ? "sk-ant-..." : "sk-..."}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <p className="text-[9px] text-gray-400 mt-1">
            API 키는 로컬에만 저장되며 외부로 전송되지 않습니다
          </p>
        </div>
      </section>

      {/* 네이버 연동 */}
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[12px] font-bold text-primary mb-3">🅽 네이버 연동</h3>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">네이버 블로그 ID</label>
          <input
            type="text"
            value={blogId}
            onChange={(e) => setBlogId(e.target.value)}
            placeholder="예: scho990"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <p className="text-[9px] text-gray-400 mt-1">
            순위 추적 및 조회수 수집에 사용됩니다
          </p>
        </div>
      </section>

      {/* 옵시디언 연동 */}
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[12px] font-bold text-primary mb-3">📓 옵시디언 연동 (선택)</h3>

        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-gray-600">옵시디언 볼트 내보내기</span>
          <button
            onClick={() => setObsidianEnabled(!obsidianEnabled)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              obsidianEnabled ? "bg-accent" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                obsidianEnabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {obsidianEnabled && (
          <div className="animate-fadeIn">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">
              Local REST API URL
            </label>
            <input
              type="url"
              value={obsidianUrl}
              onChange={(e) => setObsidianUrl(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
            <p className="text-[9px] text-gray-400 mt-1">
              Obsidian Local REST API 플러그인이 필요합니다
            </p>
          </div>
        )}
      </section>

      {/* 알림 설정 */}
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[12px] font-bold text-primary mb-3">🔔 알림 설정</h3>
        <div className="space-y-2.5">
          {[
            { key: "rankingChange" as const, label: "순위 변동 알림", desc: "키워드 순위가 3단계 이상 변동 시" },
            { key: "feedbackReady" as const, label: "피드백 준비 알림", desc: "AI 개선 제안이 생성되면" },
            { key: "weeklyReport" as const, label: "주간 리포트", desc: "매주 월요일 성과 요약" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-gray-700">{item.label}</p>
                <p className="text-[9px] text-gray-400">{item.desc}</p>
              </div>
              <button
                onClick={() =>
                  setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                }
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  notifications[item.key] ? "bg-accent" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                    notifications[item.key] ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 저장 */}
      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-xl text-sm font-bold text-white transition ${
          saved ? "bg-success" : "bg-accent hover:bg-primary"
        }`}
      >
        {saved ? "✅ 저장 완료!" : "💾 설정 저장"}
      </button>

      <p className="text-center text-[9px] text-gray-400">NaviWrite v1.0.0 · Phase 1</p>
    </div>
  );
}
