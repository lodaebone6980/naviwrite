import { useState, useEffect } from "react";
import { getDashboardFromServer, getAlertsFromServer, getServerUrl } from "../../lib/api";

interface RankItem {
  keyword: string;
  position: number;
  change: number;
  views: number;
}

interface DashboardStats {
  totalViews: number;
  viewsChange: number;
  topPosts: number;
  topPostsChange: number;
  avgRank: number;
  avgRankChange: number;
  pendingFeedback: number;
  rankings?: RankItem[];
  weeklyViews?: number[];
}

export default function TrackTab() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalViews: 0,
    viewsChange: 0,
    topPosts: 0,
    topPostsChange: 0,
    avgRank: 0,
    avgRankChange: 0,
    pendingFeedback: 0,
  });
  const [weeklyViews, setWeeklyViews] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [alerts, setAlerts] = useState<{ message: string; type: string }[]>([]);

  useEffect(() => {
    loadDashboard();
  }, [period]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await getDashboardFromServer(period)) as DashboardStats | { data: DashboardStats };
      const dashboard = (data && typeof data === "object" && "data" in data)
        ? (data as { data: DashboardStats }).data
        : data as DashboardStats;

      if (dashboard) {
        setStats({
          totalViews: dashboard.totalViews || 0,
          viewsChange: dashboard.viewsChange || 0,
          topPosts: dashboard.topPosts || 0,
          topPostsChange: dashboard.topPostsChange || 0,
          avgRank: dashboard.avgRank || 0,
          avgRankChange: dashboard.avgRankChange || 0,
          pendingFeedback: dashboard.pendingFeedback || 0,
        });
        setRankings(dashboard.rankings || []);
        setWeeklyViews(dashboard.weeklyViews || [0, 0, 0, 0, 0, 0, 0]);
      }
    } catch (err) {
      console.warn("대시보드 로드 실패:", err);
      setError("서버에서 데이터를 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const data = (await getAlertsFromServer()) as
        | { message: string; type: string }[]
        | { data: { message: string; type: string }[] };
      const alertsList = Array.isArray(data) ? data : (data as { data: { message: string; type: string }[] }).data || [];
      setAlerts(alertsList);
    } catch {
      // 알림 로드 실패는 무시
    }
  };

  const handleOpenDashboard = async () => {
    const serverUrl = await getServerUrl();
    window.open(serverUrl, "_blank");
  };

  const maxView = Math.max(...weeklyViews, 1);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="inline-block w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-3" />
        <p className="text-[11px] text-gray-400">데이터 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-[11px] text-danger font-medium">{error}</p>
        </div>
      )}

      {/* 알림 */}
      {alerts.length > 0 && (
        <div className="space-y-1">
          {alerts.slice(0, 3).map((alert, i) => (
            <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <p className="text-[11px] text-yellow-700">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* 기간 선택 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
        {(["day", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition ${
              period === p ? "bg-white text-primary shadow-sm" : "text-gray-400"
            }`}
          >
            {p === "day" ? "일간" : p === "week" ? "주간" : "월간"}
          </button>
        ))}
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          title="오늘 총 조회"
          value={stats.totalViews.toLocaleString()}
          change={stats.viewsChange}
          up={stats.viewsChange >= 0}
        />
        <StatCard
          title="상위노출 글"
          value={stats.topPosts.toString()}
          change={stats.topPostsChange}
          up={stats.topPostsChange >= 0}
          suffix="건"
        />
        <StatCard
          title="평균 순위"
          value={stats.avgRank.toString()}
          change={stats.avgRankChange}
          up={stats.avgRankChange >= 0}
        />
        <StatCard
          title="피드백 대기"
          value={stats.pendingFeedback.toString()}
          change={0}
          up={false}
          suffix="건"
          warning={stats.pendingFeedback > 0}
        />
      </div>

      {/* 키워드 순위 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[11px] font-bold text-gray-500 mb-3">키워드 순위 TOP 5</h3>
        {rankings.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[11px] text-gray-400">추적 중인 키워드가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-0">
            {rankings.slice(0, 5).map((item, i) => (
              <div key={item.keyword} className="flex items-center py-2 border-b border-gray-50 last:border-0">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center mr-2">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-gray-700 truncate">{item.keyword}</p>
                  <p className="text-[10px] text-gray-400">조회: {item.views.toLocaleString()}</p>
                </div>
                <div className="text-right ml-2">
                  <p className="text-[12px] font-bold text-primary">#{item.position}위</p>
                  <p className={`text-[10px] font-semibold ${item.change > 0 ? "text-success" : item.change < 0 ? "text-danger" : "text-gray-400"}`}>
                    {item.change > 0 ? `▲ ${item.change}` : item.change < 0 ? `▼ ${Math.abs(item.change)}` : "―"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 간이 그래프 (CSS) */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[11px] font-bold text-gray-500 mb-3">주간 조회수 추이</h3>
        <div className="flex items-end gap-1 h-20">
          {weeklyViews.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-accent/80 rounded-t-sm transition-all hover:bg-accent"
                style={{ height: `${maxView > 0 ? (v / maxView) * 100 : 0}%` }}
              />
              <span className="text-[8px] text-gray-400">
                {["월", "화", "수", "목", "금", "토", "일"][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 대시보드 링크 */}
      <button
        onClick={handleOpenDashboard}
        className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
      >
        🔍 상세 대시보드 열기 (웹 페이지)
      </button>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  up,
  suffix,
  warning,
}: {
  title: string;
  value: string;
  change: number;
  up: boolean;
  suffix?: string;
  warning?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{title}</p>
      <p className="text-xl font-extrabold text-primary mt-0.5">
        {value}
        {suffix && <span className="text-[10px] font-normal text-gray-400 ml-0.5">{suffix}</span>}
      </p>
      {warning ? (
        <p className="text-[10px] font-semibold text-warning">확인 필요</p>
      ) : (
        <p className={`text-[10px] font-semibold ${up ? "text-success" : "text-danger"}`}>
          {up ? "▲" : "▼"} {change > 0 ? change : Math.abs(change)}
          {change > 0 && typeof change === "number" && change < 10 ? "" : "%"}
        </p>
      )}
    </div>
  );
}
