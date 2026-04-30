import { useState, useEffect } from "react";
import type { Category } from "../../lib/types";
import { CATEGORY_PATTERNS } from "../../lib/patterns";
import {
  getReferencesFromServer,
  getPatternStatsFromServer,
  saveReferenceToServer,
  analyzeContentOnServer,
} from "../../lib/api";

interface ReferenceItem {
  id: string;
  url: string;
  category: Category;
  title: string;
  score: number;
  addedAt: string;
}

interface CategoryCount {
  category: Category;
  count: number;
}

const ALL_CATEGORIES: Category[] = [
  "IT/테크", "정부정책", "맛집", "여행", "건강/의료", "재테크/금융", "육아/육품", "부동산",
];

export default function LearnTab() {
  const [newUrl, setNewUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [refs, setRefs] = useState<ReferenceItem[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>(
    ALL_CATEGORIES.map((c) => ({ category: c, count: 0 }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 마운트 시 서버에서 데이터 불러오기
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 레퍼런스 목록 불러오기
      const refsData = (await getReferencesFromServer()) as ReferenceItem[] | { data: ReferenceItem[] };
      const refsList = Array.isArray(refsData) ? refsData : (refsData as { data: ReferenceItem[] }).data || [];
      setRefs(refsList);

      // 패턴 통계 불러오기
      const statsData = (await getPatternStatsFromServer()) as
        | CategoryCount[]
        | { data: CategoryCount[] }
        | Record<string, number>;

      if (Array.isArray(statsData)) {
        // 배열 형태
        const merged = ALL_CATEGORIES.map((cat) => {
          const found = statsData.find((s) => s.category === cat);
          return { category: cat, count: found?.count || 0 };
        });
        setCategoryCounts(merged);
      } else if (statsData && typeof statsData === "object" && "data" in statsData) {
        const arr = (statsData as { data: CategoryCount[] }).data || [];
        const merged = ALL_CATEGORIES.map((cat) => {
          const found = arr.find((s) => s.category === cat);
          return { category: cat, count: found?.count || 0 };
        });
        setCategoryCounts(merged);
      } else if (statsData && typeof statsData === "object") {
        // Record<category, count> 형태
        const obj = statsData as Record<string, number>;
        const merged = ALL_CATEGORIES.map((cat) => ({
          category: cat,
          count: obj[cat] || 0,
        }));
        setCategoryCounts(merged);
      }
    } catch (err) {
      console.warn("서버 데이터 로드 실패:", err);
      setError("서버에서 데이터를 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReference = async () => {
    if (!newUrl.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      // 레퍼런스 저장
      await saveReferenceToServer({
        url: newUrl,
        category: selectedCategory || "IT/테크",
        addedAt: new Date().toISOString(),
      });

      // 콘텐츠 분석
      try {
        await analyzeContentOnServer(
          newUrl,
          "",
          selectedCategory || "IT/테크",
          "blog"
        );
      } catch {
        console.warn("콘텐츠 분석 실패 (레퍼런스는 저장됨)");
      }

      setNewUrl("");
      // 데이터 새로고침
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "레퍼런스 추가에 실패했습니다");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const maxCount = Math.max(...categoryCounts.map((c) => c.count), 1);

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

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">총 레퍼런스</p>
          <p className="text-2xl font-extrabold text-primary mt-0.5">{refs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">학습 카테고리</p>
          <p className="text-2xl font-extrabold text-primary mt-0.5">
            {categoryCounts.filter((c) => c.count > 0).length}
          </p>
        </div>
      </div>

      {/* 카테고리별 학습량 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[11px] font-bold text-gray-500 mb-3">카테고리별 학습량</h3>
        <div className="space-y-2">
          {categoryCounts.map((item) => (
            <button
              key={item.category}
              onClick={() => setSelectedCategory(item.category === selectedCategory ? null : item.category)}
              className="w-full group"
            >
              <div className="flex justify-between items-center mb-0.5">
                <span className={`text-[11px] font-medium ${item.category === selectedCategory ? "text-primary font-bold" : "text-gray-600"}`}>
                  {item.category}
                </span>
                <span className="text-[11px] font-bold text-gray-400">{item.count}건</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 선택된 카테고리 패턴 보기 */}
      {selectedCategory && (
        <div className="animate-slideUp bg-light/40 rounded-xl border border-light p-4">
          <h3 className="text-[12px] font-bold text-primary mb-2">📐 {selectedCategory} 학습된 패턴</h3>
          {(() => {
            const p = CATEGORY_PATTERNS.find((cp) => cp.category === selectedCategory);
            if (!p) return null;
            return (
              <div className="text-[11px] text-gray-600 space-y-1 leading-relaxed">
                <p>글자수: {p.charCount[0]}~{p.charCount[1]}자</p>
                <p>이미지: {p.imageCount[0]}~{p.imageCount[1]}장</p>
                <p>KW반복: {p.kwRepeat[0]}~{p.kwRepeat[1]}회</p>
                <p>소제목: {p.subheadingCount}개</p>
                <p>톤: {p.tone}</p>
                <p>특수요소: {p.specialElements.join(", ")}</p>
                <div className="mt-2 pt-2 border-t border-light">
                  <p className="font-semibold mb-1">글 구조:</p>
                  <p>인트로: {p.structure.intro}</p>
                  <p>본문: {p.structure.body}</p>
                  <p>마무리: {p.structure.conclusion}</p>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 최근 레퍼런스 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[11px] font-bold text-gray-500 mb-2">최근 분석 레퍼런스</h3>
        {refs.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[11px] text-gray-400">등록된 레퍼런스가 없습니다</p>
            <p className="text-[10px] text-gray-300 mt-1">아래에서 URL을 추가해보세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {refs.map((ref) => (
              <div key={ref.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white
                  ${ref.score >= 85 ? "bg-success" : ref.score >= 70 ? "bg-accent" : "bg-warning"}`}>
                  {ref.score}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-700 truncate">{ref.title}</p>
                  <p className="text-[9px] text-gray-400">{ref.category} · {ref.addedAt?.slice(0, 10)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* URL 추가 */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">새 레퍼런스 URL 추가</label>
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="상위노출 블로그 URL 입력..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>

      <button
        onClick={handleAddReference}
        disabled={!newUrl.trim() || isAnalyzing}
        className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold hover:bg-primary transition
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            분석 중...
          </span>
        ) : (
          "+ 레퍼런스 분석 & 학습"
        )}
      </button>
    </div>
  );
}
