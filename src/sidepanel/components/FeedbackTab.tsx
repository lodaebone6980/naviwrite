import { useState, useEffect } from "react";
import type { FeedbackType } from "../../lib/types";
import { getStatsFromServer, applyFeedbackOnServer, getServerUrl } from "../../lib/api";

interface FeedbackCard {
  id: string;
  postTitle: string;
  type: FeedbackType;
  typeLabel: string;
  triggerDay: number;
  description: string;
  before?: string;
  after?: string;
  applied: boolean;
}

const TYPE_CONFIG: Record<FeedbackType, { label: string; color: string; bg: string }> = {
  kw_density: { label: "KW 밀도", color: "text-primary", bg: "bg-light" },
  image: { label: "이미지 보강", color: "text-success", bg: "bg-green-50" },
  structure: { label: "구조 개선", color: "text-purple", bg: "bg-purple-50" },
  geo_aeo: { label: "GEO/AEO", color: "text-warning", bg: "bg-orange-50" },
  new_post: { label: "새 글 제안", color: "text-danger", bg: "bg-red-50" },
};

export default function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState<FeedbackCard[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "applied">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const serverUrl = await getServerUrl();

      // 포스트 목록 가져오기
      const postsRes = await fetch(`${serverUrl}/api/posts`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!postsRes.ok) {
        throw new Error("포스트 목록을 불러올 수 없습니다");
      }

      const postsData = await postsRes.json();
      const posts = Array.isArray(postsData) ? postsData : postsData?.data || [];

      // 각 포스트의 피드백 수집
      const allFeedbacks: FeedbackCard[] = [];

      for (const post of posts) {
        try {
          const postRes = await fetch(`${serverUrl}/api/posts/${post.id}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (postRes.ok) {
            const postDetail = await postRes.json();
            const postFeedbacks = postDetail?.feedbacks || postDetail?.data?.feedbacks || [];

            for (const fb of postFeedbacks) {
              const fbType = (fb.type || "structure") as FeedbackType;
              allFeedbacks.push({
                id: fb.id || String(allFeedbacks.length + 1),
                postTitle: post.title || post.keyword || "제목 없음",
                type: fbType,
                typeLabel: TYPE_CONFIG[fbType]?.label || fb.type,
                triggerDay: fb.triggerDay || fb.trigger_day || 0,
                description: fb.description || fb.title || "",
                before: fb.before,
                after: fb.after,
                applied: fb.applied || false,
              });
            }
          }
        } catch {
          // 개별 포스트 로드 실패는 무시
        }
      }

      setFeedbacks(allFeedbacks);
    } catch (err) {
      console.warn("피드백 로드 실패:", err);
      setError("서버에서 피드백 데이터를 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  };

  const filtered = feedbacks.filter((f) => {
    if (filter === "pending") return !f.applied;
    if (filter === "applied") return f.applied;
    return true;
  });

  const handleApply = async (id: string) => {
    try {
      await applyFeedbackOnServer(id);
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, applied: true } : f))
      );
    } catch (err) {
      console.warn("피드백 적용 실패:", err);
      // 로컬에서라도 적용 처리
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, applied: true } : f))
      );
    }
  };

  const pendingCount = feedbacks.filter((f) => !f.applied).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="inline-block w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-3" />
        <p className="text-[11px] text-gray-400">피드백 불러오는 중...</p>
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

      {/* 요약 */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-4 text-white">
        <h3 className="text-sm font-bold mb-1">AI 개선 제안</h3>
        <p className="text-[11px] opacity-80">
          {pendingCount > 0
            ? `${pendingCount}건의 개선 제안이 대기 중입니다`
            : feedbacks.length > 0
            ? "모든 개선 제안을 적용했습니다!"
            : "아직 피드백이 없습니다"}
        </p>
      </div>

      {/* 필터 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
        {(["all", "pending", "applied"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition ${
              filter === f ? "bg-white text-primary shadow-sm" : "text-gray-400"
            }`}
          >
            {f === "all" ? `전체 (${feedbacks.length})` : f === "pending" ? `대기 (${pendingCount})` : `적용됨 (${feedbacks.length - pendingCount})`}
          </button>
        ))}
      </div>

      {/* 피드백 카드 */}
      <div className="space-y-3">
        {filtered.map((fb) => {
          const config = TYPE_CONFIG[fb.type] || TYPE_CONFIG.structure;
          return (
            <div
              key={fb.id}
              className={`bg-white rounded-xl border p-4 transition ${
                fb.applied ? "border-gray-100 opacity-60" : "border-gray-200"
              }`}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-[10px] text-gray-400">
                  {fb.postTitle} · +{fb.triggerDay}일
                </span>
              </div>

              {/* 설명 */}
              <p className="text-[12px] text-gray-600 leading-relaxed mb-2">{fb.description}</p>

              {/* Before/After */}
              {(fb.before || fb.after) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {fb.before && (
                    <span className="text-[10px] bg-red-50 text-danger px-2 py-1 rounded line-through">
                      {fb.before}
                    </span>
                  )}
                  {fb.after && (
                    <span className="text-[10px] bg-green-50 text-success px-2 py-1 rounded font-semibold whitespace-pre-line">
                      {fb.after}
                    </span>
                  )}
                </div>
              )}

              {/* 액션 */}
              {!fb.applied ? (
                <button
                  onClick={() => handleApply(fb.id)}
                  className="px-4 py-1.5 bg-accent text-white rounded-lg text-[11px] font-bold hover:bg-primary transition"
                >
                  ✨ 원클릭 적용
                </button>
              ) : (
                <span className="text-[10px] text-success font-semibold">✅ 적용 완료</span>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm">표시할 피드백이 없습니다</p>
        </div>
      )}
    </div>
  );
}
