import { useState, useEffect } from "react";
import type { Platform, PublishingAccount } from "../../lib/types";

export default function SettingsTab() {
  const [apiKey, setApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState<"claude" | "gpt">("claude");
  const [serverUrl, setServerUrl] = useState("https://web-production-184ff.up.railway.app");
  const [runnerUrl, setRunnerUrl] = useState("http://127.0.0.1:39271");
  const [obsidianEnabled, setObsidianEnabled] = useState(false);
  const [obsidianUrl, setObsidianUrl] = useState("http://localhost:27123");
  const [blogId, setBlogId] = useState("");
  const [naverAccounts, setNaverAccounts] = useState<PublishingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [newAccountLabel, setNewAccountLabel] = useState("");
  const [newAccountNaverId, setNewAccountNaverId] = useState("");
  const [newAccountPlatform, setNewAccountPlatform] = useState<Platform>("blog");
  const [newAccountTargetUrl, setNewAccountTargetUrl] = useState("");
  const [notifications, setNotifications] = useState({
    rankingChange: true,
    feedbackReady: true,
    weeklyReport: false,
  });
  const [saved, setSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [runnerStatus, setRunnerStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  // 마운트 시 저장된 설정 불러오기
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.get("settings", (data) => {
        const s = data?.settings;
        if (s) {
          if (s.apiKey) setApiKey(s.apiKey);
          if (s.aiProvider) setAiProvider(s.aiProvider);
          if (s.serverUrl) setServerUrl(s.serverUrl);
          if (s.runnerUrl) setRunnerUrl(s.runnerUrl);
          if (s.obsidianEnabled !== undefined) setObsidianEnabled(s.obsidianEnabled);
          if (s.obsidianApiUrl) setObsidianUrl(s.obsidianApiUrl);
          if (s.naverBlogId) setBlogId(s.naverBlogId);
          if (Array.isArray(s.naverAccounts)) setNaverAccounts(s.naverAccounts);
          if (s.selectedAccountId) setSelectedAccountId(s.selectedAccountId);
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
      runnerUrl,
      obsidianEnabled,
      obsidianApiUrl: obsidianUrl,
      naverBlogId: blogId,
      naverAccounts,
      selectedAccountId,
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

  const handleTestRunner = async () => {
    setRunnerStatus("testing");
    try {
      const res = await fetch(`${runnerUrl.replace(/\/$/, "")}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      setRunnerStatus(res.ok ? "ok" : "fail");
    } catch {
      setRunnerStatus("fail");
    }
    setTimeout(() => setRunnerStatus("idle"), 3000);
  };

  const handleAddAccount = () => {
    const label = newAccountLabel.trim() || newAccountNaverId.trim();
    if (!label) return;

    const account: PublishingAccount = {
      id: `${newAccountPlatform}_${Date.now()}`,
      label,
      platform: newAccountPlatform,
      naverId: newAccountNaverId.trim() || undefined,
      targetUrl: newAccountTargetUrl.trim() || undefined,
      status: "unchecked",
    };

    setNaverAccounts((prev) => [...prev, account]);
    if (!selectedAccountId) setSelectedAccountId(account.id);
    setNewAccountLabel("");
    setNewAccountNaverId("");
    setNewAccountTargetUrl("");
  };

  const handleRemoveAccount = (id: string) => {
    setNaverAccounts((prev) => prev.filter((account) => account.id !== id));
    if (selectedAccountId === id) setSelectedAccountId("");
  };

  const handleMarkAccountChecked = (id: string) => {
    setNaverAccounts((prev) =>
      prev.map((account) =>
        account.id === id
          ? { ...account, status: "checked", lastCheckedAt: new Date().toISOString() }
          : account
      )
    );
    setSelectedAccountId(id);
  };

  const handleOpenLoginCheck = (account: PublishingAccount) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      window.open(account.targetUrl || "https://nid.naver.com/nidlogin.login", "_blank");
      return;
    }

    chrome.runtime.sendMessage({
      type: "OPEN_NAVER_LOGIN_CHECK",
      payload: {
        platform: account.platform,
        targetUrl: account.targetUrl,
      },
    });
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

      {/* Local Runner */}
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[12px] font-bold text-primary mb-3">🖥️ Local Runner</h3>

        <div className="mb-3">
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Runner URL</label>
          <input
            type="url"
            value={runnerUrl}
            onChange={(e) => setRunnerUrl(e.target.value)}
            placeholder="http://127.0.0.1:39271"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <p className="text-[9px] text-gray-400 mt-1">
            계정별 브라우저 프로필, 로그인 세션, 로컬 암호화 자격증명을 PC 안에서만 관리합니다
          </p>
        </div>

        <button
          onClick={handleTestRunner}
          disabled={runnerStatus === "testing"}
          className={`w-full py-2 rounded-lg text-[11px] font-bold transition ${
            runnerStatus === "ok"
              ? "bg-success text-white"
              : runnerStatus === "fail"
              ? "bg-danger text-white"
              : runnerStatus === "testing"
              ? "bg-gray-300 text-gray-500 cursor-wait"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {runnerStatus === "testing" ? "Runner 확인 중..." : runnerStatus === "ok" ? "Runner 연결 성공!" : runnerStatus === "fail" ? "Runner 연결 실패" : "Runner 연결 테스트"}
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
        <h3 className="text-[12px] font-bold text-primary mb-3">🅽 네이버 계정/채널 확인</h3>
        <div className="mb-4">
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

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 mb-3">
          <p className="text-[11px] font-bold text-primary mb-2">발행 계정 추가</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {(["blog", "cafe"] as Platform[]).map((platform) => (
              <button
                key={platform}
                onClick={() => setNewAccountPlatform(platform)}
                className={`py-2 rounded-lg text-[11px] font-bold border transition ${
                  newAccountPlatform === platform
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-500 border-gray-200"
                }`}
              >
                {platform === "blog" ? "블로그" : "카페"}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={newAccountLabel}
            onChange={(e) => setNewAccountLabel(e.target.value)}
            placeholder="표시명 예: IT 블로그 본계정"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white mb-2
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <input
            type="text"
            value={newAccountNaverId}
            onChange={(e) => setNewAccountNaverId(e.target.value)}
            placeholder="네이버 ID 또는 운영자 메모"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white mb-2
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <input
            type="url"
            value={newAccountTargetUrl}
            onChange={(e) => setNewAccountTargetUrl(e.target.value)}
            placeholder={newAccountPlatform === "blog" ? "블로그 URL 예: https://blog.naver.com/..." : "카페 URL 예: https://cafe.naver.com/..."}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white mb-2
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <button
            type="button"
            onClick={handleAddAccount}
            disabled={!newAccountLabel.trim() && !newAccountNaverId.trim()}
            className="w-full py-2 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-accent transition disabled:opacity-50"
          >
            계정 목록에 추가
          </button>
        </div>

        <div className="space-y-2">
          {naverAccounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-white p-3 text-[10px] text-gray-400 leading-relaxed">
              아직 등록된 발행 계정이 없습니다. 글 생성 전 사용할 블로그/카페 계정을 추가하고 로그인 체크를 완료해 주세요.
            </div>
          ) : (
            naverAccounts.map((account) => (
              <div
                key={account.id}
                className={`rounded-lg border p-3 ${
                  selectedAccountId === account.id ? "border-accent bg-light/40" : "border-gray-100 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountId(account.id)}
                    className="text-left"
                  >
                    <p className="text-[12px] font-bold text-gray-800">{account.label}</p>
                    <p className="text-[10px] text-gray-400">
                      {account.platform === "blog" ? "네이버 블로그" : "네이버 카페"}
                      {account.naverId ? ` · ${account.naverId}` : ""}
                    </p>
                  </button>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                    account.status === "checked"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}>
                    {account.status === "checked" ? "로그인 체크 완료" : "체크 필요"}
                  </span>
                </div>
                {account.targetUrl && (
                  <p className="truncate text-[9px] text-gray-400 mb-2">{account.targetUrl}</p>
                )}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenLoginCheck(account)}
                    className="py-1.5 rounded-lg bg-gray-100 text-[10px] font-bold text-gray-600 hover:bg-gray-200"
                  >
                    로그인 열기
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkAccountChecked(account.id)}
                    className="py-1.5 rounded-lg bg-success text-[10px] font-bold text-white"
                  >
                    체크 완료
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAccount(account.id)}
                    className="py-1.5 rounded-lg bg-red-50 text-[10px] font-bold text-danger"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-[9px] text-gray-400 mt-3 leading-relaxed">
          비밀번호는 저장하지 않습니다. 로그인 탭에서 직접 로그인한 뒤 체크 완료를 눌러 발행 계정으로 선택하세요.
        </p>
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
