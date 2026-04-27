// ═══════ NaviWrite Background Service Worker ═══════

const DEFAULT_SERVER_URL = "https://web-production-184ff.up.railway.app";

// 확장프로그램 아이콘 클릭 → 사이드패널 열기
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// 설치 시 초기화
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // 기본 설정 저장
    chrome.storage.sync.set({
      settings: {
        apiKey: "",
        aiProvider: "claude",
        serverUrl: DEFAULT_SERVER_URL,
        obsidianEnabled: false,
        obsidianApiUrl: "http://localhost:27123",
        naverBlogId: "",
        notifications: {
          rankingChange: true,
          feedbackReady: true,
          weeklyReport: false,
        },
      },
      patternDB: {},
      references: [],
      trackedPosts: [],
    });
    console.log("[NaviWrite] 확장프로그램 설치 완료");
  }
});

// 메시지 라우팅
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "EXTRACT_CONTENT":
      // 현재 탭에서 콘텐츠 추출 요청
      handleExtractContent(sendResponse);
      return true; // 비동기 응답

    case "GET_SETTINGS":
      chrome.storage.sync.get("settings", (data) => {
        sendResponse(data.settings || {});
      });
      return true;

    case "SAVE_SETTINGS":
      chrome.storage.sync.set({ settings: message.payload }, () => {
        sendResponse({ success: true });
      });
      return true;

    case "COPY_TO_CLIPBOARD":
      // 클립보드 복사는 sidepanel에서 직접 처리
      sendResponse({ success: true });
      break;

    case "SAVE_REFERENCE":
      handleSaveReference(message.payload, sendResponse);
      return true;

    case "GET_REFERENCES":
      chrome.storage.local.get("references", (data) => {
        sendResponse(data.references || []);
      });
      return true;

    case "SAVE_TRACKED_POST":
      handleSaveTrackedPost(message.payload, sendResponse);
      return true;

    case "GET_TRACKED_POSTS":
      chrome.storage.local.get("trackedPosts", (data) => {
        sendResponse(data.trackedPosts || []);
      });
      return true;
  }
});

// ─── 콘텐츠 추출 핸들러 ───
async function handleExtractContent(sendResponse: (response: unknown) => void) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      sendResponse({ error: "활성 탭을 찾을 수 없습니다" });
      return;
    }

    // Content Script에 추출 요청
    const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_CONTENT" });
    sendResponse(response);
  } catch (err) {
    sendResponse({ error: (err as Error).message });
  }
}

// ─── 레퍼런스 저장 ───
async function handleSaveReference(reference: unknown, sendResponse: (response: unknown) => void) {
  try {
    const data = await chrome.storage.local.get("references");
    const refs = data.references || [];
    refs.push(reference);
    await chrome.storage.local.set({ references: refs });
    sendResponse({ success: true, count: refs.length });
  } catch (err) {
    sendResponse({ error: (err as Error).message });
  }
}

// ─── 추적 포스트 저장 ───
async function handleSaveTrackedPost(post: unknown, sendResponse: (response: unknown) => void) {
  try {
    const data = await chrome.storage.local.get("trackedPosts");
    const posts = data.trackedPosts || [];
    posts.push(post);
    await chrome.storage.local.set({ trackedPosts: posts });
    sendResponse({ success: true, count: posts.length });
  } catch (err) {
    sendResponse({ error: (err as Error).message });
  }
}

// ─── 서버 URL 가져오기 헬퍼 ───
async function getServerUrlFromStorage(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("settings", (data) => {
      resolve(data?.settings?.serverUrl || DEFAULT_SERVER_URL);
    });
  });
}

// ─── 알람 (자동 주기 분선 트리거) ───
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "check-rankings") {
    console.log("[NaviWrite] 순위 체크 알람 트리거");
    try {
      const serverUrl = await getServerUrlFromStorage();
      const res = await fetch(`${serverUrl}/api/track/check-rankings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const result = await res.json();
        console.log("[NaviWrite] 순위 체크 완료:", result);
        if (result?.alerts && result.alerts.length > 0) {
          chrome.storage.sync.get("settings", (data) => {
            const settings = data?.settings;
            if (settings?.notifications?.rankingChange) {
              for (const alert of result.alerts) {
                chrome.notifications.create({
                  type: "basic",
                  iconUrl: "icons/icon128.png",
                  title: "NaviWrite 순위 변동",
                  message: alert.message || "키워드 순위가 변동되었습니다",
                });
              }
            }
          });
        }
      } else {
        console.warn("[NaviWrite] 순위 체크 서버 오류:", res.status);
      }
    } catch (err) {
      console.warn("[NaviWrite] 순위 체크 실패:", (err as Error).message);
    }
  }
});

// 설치 시 알람 등록
chrome.runtime.onInstalled.addListener(() => {
  // 매 6시간마다 순위 체크 (Service Worker 제한 고려)
  chrome.alarms.create("check-rankings", {
    periodInMinutes: 360, // <시간
  });
});

export {};
