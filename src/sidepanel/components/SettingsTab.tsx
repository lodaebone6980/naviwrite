import { useState } from "react";

export default function SettingsTab() {
  const [apiKey, setApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState<"claude" | "gpt">("claude");
  const [obsidianEnabled, setObsidianEnabled] = useState(false);
  const [obsidianUrl, setObsidianUrl] = useState("http://localhost:27123");
  const [blogId, setBlogId] = useState("");
  const [notifications, setNotifications] = useState({
    rankingChange: true,
    feedbackReady: true,
    weeklyReport: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // TODO: chrome.storage.sync에 저장
    const settings = {
      apiKey,
      aiProvider,
      obsidianEnabled,
      obsidianApiUrl: obsidianUrl,
      naverBlogId: blogId,
      notifications,
    };
    console.log("Settings saved:", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
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
            순위 추적 및 회수 수집에 사용됩니다
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
