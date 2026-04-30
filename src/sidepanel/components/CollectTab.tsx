import { useCallback, useEffect, useState } from "react";
import type { CollectionSourceLink } from "../../lib/types";
import {
  claimCollectionLinkOnServer,
  getCollectionLinksOnServer,
  markCollectionLinkStatusOnServer,
  saveCollectionAnalysisOnServer,
} from "../../lib/api";

type CollectLog = {
  id: string;
  message: string;
  type: "info" | "ok" | "error";
};

function waitForTabComplete(tabId: number, timeoutMs = 20000): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        window.setTimeout(done, 1200);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    window.setTimeout(done, timeoutMs);
  });
}

function extractTabContent(tabId: number): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "EXTRACT_CONTENT" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response);
    });
  });
}

async function openAndExtract(url: string): Promise<any> {
  const tab = await chrome.tabs.create({ url, active: false });
  if (!tab.id) throw new Error("수집 탭을 열 수 없습니다");
  try {
    await waitForTabComplete(tab.id);
    return await extractTabContent(tab.id);
  } finally {
    chrome.tabs.remove(tab.id);
  }
}

export default function CollectTab() {
  const [queue, setQueue] = useState<CollectionSourceLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<CollectLog[]>([]);
  const [limit, setLimit] = useState(10);

  const pushLog = (message: string, type: CollectLog["type"] = "info") => {
    setLogs((prev) => [{ id: `${Date.now()}_${Math.random()}`, message, type }, ...prev].slice(0, 30));
  };

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = await getCollectionLinksOnServer("대기중", 50);
      setQueue(rows);
      pushLog(`대기 링크 ${rows.length}개를 불러왔습니다`, "ok");
    } catch (err) {
      pushLog(err instanceof Error ? err.message : "수집 큐를 불러오지 못했습니다", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const processOne = async (link: CollectionSourceLink) => {
    let claimed: CollectionSourceLink | null = null;
    try {
      claimed = await claimCollectionLinkOnServer(link.id);
      pushLog(`#${link.id} 수집 시작: ${link.url}`);
      const extracted = await openAndExtract(claimed.url);
      await saveCollectionAnalysisOnServer(claimed.id, extracted);
      pushLog(`#${link.id} 수집 완료 · ${extracted.title || "제목 없음"}`, "ok");
      setQueue((prev) => prev.filter((item) => item.id !== link.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "수집 실패";
      pushLog(`#${link.id} 오류: ${message}`, "error");
      if (claimed || link.id) {
        await markCollectionLinkStatusOnServer((claimed || link).id, "오류", message).catch(() => undefined);
      }
    }
  };

  const processSelected = async () => {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      pushLog("크롬 확장프로그램 환경에서만 수집할 수 있습니다", "error");
      return;
    }

    setIsRunning(true);
    const work = queue.slice(0, limit);
    for (const link of work) {
      await processOne(link);
    }
    setIsRunning(false);
    await loadQueue();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-primary">대량 수집 큐</p>
            <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
              대시보드의 수집 링크 메뉴에서 등록한 URL을 실제 브라우저 세션으로 열고 본문, 이미지 수, 키워드 후보, 글 구조를 저장합니다.
            </p>
          </div>
          <span className="rounded-full bg-light px-2.5 py-1 text-[10px] font-bold text-primary">
            {queue.length}개 대기
          </span>
        </div>

        <div className="grid grid-cols-[1fr_92px] gap-2">
          <button
            type="button"
            onClick={loadQueue}
            disabled={isLoading || isRunning}
            className="rounded-lg border border-gray-200 bg-white py-2 text-xs font-bold text-gray-600 transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {isLoading ? "불러오는 중..." : "큐 새로고침"}
          </button>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(event) => setLimit(Math.max(1, Math.min(50, Number(event.target.value) || 1)))}
            className="rounded-lg border border-gray-200 px-2 text-center text-xs font-bold text-gray-600 outline-none focus:border-accent"
          />
        </div>

        <button
          type="button"
          onClick={processSelected}
          disabled={isRunning || queue.length === 0}
          className="mt-2 w-full rounded-xl bg-accent py-3 text-sm font-extrabold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? "수집 진행 중..." : `대기 링크 ${Math.min(limit, queue.length)}개 수집 시작`}
        </button>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-3">
        <p className="mb-2 text-xs font-extrabold text-primary">대기 링크</p>
        <div className="space-y-2">
          {queue.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-[11px] text-gray-400">
              대기 중인 수집 링크가 없습니다.
            </div>
          ) : (
            queue.slice(0, 12).map((link) => (
              <div key={link.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-primary">
                    #{link.id} {link.platform_guess || "web"}
                  </span>
                  <button
                    type="button"
                    onClick={() => processOne(link)}
                    disabled={isRunning}
                    className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-white disabled:opacity-50"
                  >
                    1개 수집
                  </button>
                </div>
                <p className="mt-1 truncate text-[10px] text-gray-500">{link.url}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-3">
        <p className="mb-2 text-xs font-extrabold text-primary">수집 로그</p>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-gray-400">아직 로그가 없습니다.</p>
          ) : logs.map((log) => (
            <div
              key={log.id}
              className={`rounded-lg px-2.5 py-2 text-[10px] leading-relaxed ${
                log.type === "ok"
                  ? "bg-green-50 text-success"
                  : log.type === "error"
                    ? "bg-red-50 text-danger"
                    : "bg-gray-50 text-gray-500"
              }`}
            >
              {log.message}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
