import { useState } from "react";
import type { Category } from "../../lib/types";
import { CATEGORY_PATTERNS } from "../../lib/patterns";

interface ReferenceItem {
  id: string;
  url: string;
  category: Category;
  title: string;
  score: number;
  addedAt: string;
}

// 데모 데이터
const DEMO_REFS: ReferenceItem[] = [
  { id: "1", url: "https://blog.naver.com/scho990/...", category: "IT/테크", title: "sbti 테스트 링크 결과 유형", score: 74, addedAt: "2026-04-25" },
  { id: "2", url: "https://blog.naver.com/blogbaksa/...", category: "IT/테크", title: "sbti 테스트 결과유형 알아보기", score: 90, addedAt: "2026-04-25" },
  { id: "3", url: "https://blog.naver.com/example/...", category: "정부정책", title: "고유가 피해지원금 총정리", score: 80, addedAt: "2026-04-26" },
];

const CATEGORY_COUNTS: { category: Category; count: number }[] = [
  { category: "IT/테크", count: 2 },
  { category: "정부정책", count: 1 },
  { category: "맛집", count: 0 },
  { category: "여행", count: 0 },
  { category: "건강/의료", count: 0 },
  { category: "재테크/금융", count: 0 },
  { category: "육아/육품", count: 0 },
  { category: "부동산", count: 0 },
];

export default function LearnTab() {
  const [newUrl, setNewUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const handleAddReference = () => {
    if (!newUrl.trim()) return;
    setIsAnalyzing(true);
    // TODO: 실제 분석 로직 연동
    setTimeout(() => {
      setIsAnalyzing(false);
      setNewUrl("");
      alert("레퍼런스 분석이 완료되었습니다!");
    }, 2000);
  };

  const maxCount = Math.max(...CATEGORY_COUNTS.map((c) => c.count), 1);

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">총 레퍼런스</p>
          <p className="text-2xl font-extrabold text-primary mt-0.5">{DEMO_REFS.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">학습 카테고리</p>
          <p className="text-2xl font-extrabold text-primary mt-0.5">
            {CATEGORY_COUNTS.filter((c) => c.count > 0).length}
          </p>
        </div>
      </div>

      {/* 카테고리별 학습량 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="text-[11px] font-bold text-gray-500 mb-3">카테고리별 학습량</h3>
        <div className="space-y-2">
          {CATEGORY_COUNTS.map((item) => (
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
        <div className="space-y-2">
          {DEMO_REFS.map((ref) => (
            <div key={ref.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white
                ${ref.score >= 85 ? "bg-success" : ref.score >= 70 ? "bg-accent" : "bg-warning"}`}>
                {ref.score}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-700 truncate">{ref.title}</p>
                <p className="text-[9px] text-gray-400">{ref.category} · {ref.addedAt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* URL 추가 */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">새 레퍼런스 URL 추가</label>
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="상위��출 블로그 URL 입력..."
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
