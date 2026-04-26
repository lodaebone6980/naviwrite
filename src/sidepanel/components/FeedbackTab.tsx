import { useState } from "react";
import type { FeedbackType } from "../../lib/types";

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

const DEMO_FEEDBACKS: FeedbackCard[] = [
  {
    id: "1",
    postTitle: "sbti 테스트",
    type: "kw_density",
    typeLabel: "KW 밀도",
    triggerDay: 7,
    description: '키워드 밀도가 2.1%로 경쟁글 평균(3.5%)보다 낮습니다. 소제목 2개에 키워드를 추가하세요.',
    before: "테스트 결과 알아보기",
    after: "sbti 테스트 결과 유형 알아보기",
    applied: false,
  },
  {
    id: "2",
    postTitle: "sbti 테스트",
    type: "image",
    typeLabel: "이미지 보강",
    triggerDay: 7,
    description: "현재 5장 → 경쟁글 평균 7.5장. 섹션 3, 4에 스크린샷 이미지를 추가하메 SEO 점수 +8 예상.",
    applied: false,
  },
  {
    id: "3",
    postTitle: "고유가 피해지원금",
    type: "geo_aeo",
    typeLabel: "GEO 보강",
    triggerDay: 3,
    description: "FAQ 섹션이 없습니다. 상위 경쟁글 3개 모두 FAQ를 포함 중. AI 검색 인용 확쮔 증가.",
    after: "Q: 고유가 피해지원금 신청 기간은?\nA: 2026년 5월 1일~6월 30일",
    applied: false,
  },
  {
    id: "4",
    postTitle: "네이버 블로그 최적화",
    type: "structure",
    typeLabel: "구조 개선",
    triggerDay: 30,
    description: "체류시간이 경쟁글 대비 40% 낮습니다. 하위목록과 비디오를 추가하여 D.I.A 점수를 개선하세요.",
    applied: true,
  },
];

export default function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState(DEMO_FEEDBACKS);
  const [filter, setFilter] = useState<"all" | "pending" | "applied">("all");

  const filtered = feedbacks.filter((f) => {
    if (filter === "pending") return !f.applied;
    if (filter === "applied") return f.applied;
    return true;
  });

  const handleApply = (id: string) => {
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, applied: true } : f))
    );
  };

  const pendingCount = feedbacks.filter((f) => !f.applied).length;

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-4 text-white">
        <h3 className="text-sm font-bold mb-1">AI 개선 제안</h3>
        <p className="text-[11px] opacity-80">
          {pendingCount > 0
            ? `${pendingCount}건의 개선 제안이 대기 중입니다`
            : "모든 개선 제안을 적용했습니다!"}
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
          const config = TYPE_CONFIG[fb.type];
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

              {/* 설��� */}
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
