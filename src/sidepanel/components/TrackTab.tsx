import { useState } from "react";

interface RankItem {
  keyword: string;
  position: number;
  change: number; // + up, - down
  views: number;
}

// 데모 데이터
const DEMO_RANKINGS: RankItem[] = [
  { keyword: "sbti 테스트", position: 2, change: 3, views: 423 },
  { keyword: "sbti 결과 유형", position: 3, change: 1, views: 287 },
  { keyword: "고유가 피해지원금", position: 5, change: -2, views: 891 },
  { keyword: "네이버 블로그 최적화", position: 7, change: 2, views: 156 },
  { keyword: "블로그 SEO 방법", position: 12, change: -1, views: 98 },
];

const DEMO_STATS = {
  totalViews: 1247,
  viewsChange: 12.3,
  topPosts: 8,
  topPostsChange: 2,
  avgRank: 4.2,
  avgRankChange: 1.3,
  pendingFeedback: 3,
};

export default function TrackTab() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  return (
    <div className="space-y-4">
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
          title="오늘 촜 조회"
          value={DEMO_STATS.totalViews.toLocaleString()}
          change={DEMO_STATS.viewsChange}
          up={true}
        />
        <StatCard
          title="상위노출 글"
          value={DEMO_STATS.topPosts.toString()}
          change={DEMO_STATS.topPostsChange}
          up={true}
          suffix="건"
        />
        <StatCard
          title="평균 순위"
          value={DEMO_STATS.avgRank.toString()}
          change={DEMO_STATS.avgRankChange}
          up={true}
        />
        <StatCard
          title="피드백 대기"
          value={DEMO_STATS.pendingFeedback.toString()}
          change={0}
          up={false}
          suffix="건"
          warning={true}
        />
      </div>

      {/* 키워드 순위 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[11px] font-bold text-gray-500 mb-3">키워드 순위 TOP 5</h3>
        <div className="space-y-0">
          {DEMO_RANKINGS.map((item, i) => (
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
      </div>

      {/* 간이 그래프 (CSS) */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[11px] font-bold text-gray-500 mb-3">주간 조회수 추이</h3>
        <div className="flex items-end gap-1 h-20">
          {[180, 220, 195, 280, 310, 245, 340].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-accent/80 rounded-t-sm transition-all hover:bg-accent"
                style={{ height: `${(v / 340) * 100}%` }}
              />
              <span className="text-[8px] text-gray-400">
                {["월", "화", "수", "목", "금", "토", "일"][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 상세 대시보드 링크 */}
      <button className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition">
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
