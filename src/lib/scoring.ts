// ═══════ SEO / GEO / AEO 채점 엔진 ═══════
import type { ScoreResult, ScoreDetail, ExtractedContent, Category } from "./types";
import { getPattern, getPlatformRules } from "./patterns";

/**
 * 콘텐츠를 SEO/GEO/AEO 기준으로 채점합니다.
 * 각 영역 100점 만점, total = (SEO*0.4 + GEO*0.3 + AEO*0.3)
 */
export function scoreContent(
  content: ExtractedContent,
  mainKeyword: string,
  category: Category
): ScoreResult {
  const details: ScoreDetail[] = [];
  const pattern = getPattern(category);
  const rules = getPlatformRules(content.platform);
  const text = content.text;

  // ═══════ SEO (100점) ═══════

  // 1. 제목에 메인KW 포함 (15점)
  const titleHasKW = content.title.includes(mainKeyword);
  details.push({
    category: "seo",
    item: "제목 키워드",
    score: titleHasKW ? 15 : 0,
    maxScore: 15,
    suggestion: titleHasKW ? undefined : `제목에 "${mainKeyword}" 키워드를 포함하세요`,
  });

  // 2. 제목 앞부분 KW (10점)
  const titleKWPos = content.title.indexOf(mainKeyword);
  const titleFrontKW = titleKWPos >= 0 && titleKWPos <= content.title.length * 0.4;
  details.push({
    category: "seo",
    item: "제목 앞부분 KW 배치",
    score: titleFrontKW ? 10 : titleHasKW ? 5 : 0,
    maxScore: 10,
    suggestion: titleFrontKW ? undefined : "메인 키워드를 제목 앞쪽 40%에 배치하세요",
  });

  // 3. 글자수 (15점)
  const [minChar, maxChar] = pattern.charCount;
  const charOK = content.charCount >= minChar && content.charCount <= maxChar * 1.2;
  const charPartial = content.charCount >= minChar * 0.7;
  details.push({
    category: "seo",
    item: "글자수",
    score: charOK ? 15 : charPartial ? 8 : 3,
    maxScore: 15,
    suggestion: charOK ? undefined : `${minChar}~${maxChar}자 범위를 권장합니다 (현재: ${content.charCount}자)`,
  });

  // 4. KW 반복 횟수 (20점)
  const kwRegex = new RegExp(mainKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const kwCount = (text.match(kwRegex) || []).length;
  const [minKW, maxKW] = pattern.kwRepeat;
  const kwOK = kwCount >= minKW && kwCount <= maxKW * 1.3;
  const kwPartial = kwCount >= Math.floor(minKW * 0.5);
  details.push({
    category: "seo",
    item: "KW 반복 횟수",
    score: kwOK ? 20 : kwPartial ? 12 : 4,
    maxScore: 20,
    suggestion: kwOK ? undefined : `메인KW "${mainKeyword}" 반복: ${kwCount}회 (권장: ${minKW}~${maxKW}회)`,
  });

  // 5. KW 밀도 (10점)
  const totalChars = text.replace(/\s/g, "").length || 1;
  const density = (kwCount * mainKeyword.length) / totalChars;
  const densityOK = density >= 0.015 && density <= 0.045;
  details.push({
    category: "seo",
    item: "KW 밀도",
    score: densityOK ? 10 : density >= 0.01 ? 6 : 2,
    maxScore: 10,
    suggestion: densityOK ? undefined : `KW밀도: ${(density * 100).toFixed(1)}% (권장: 1.5~4.5%)`,
  });

  // 6. 소제목 수 (10점)
  const subCount = content.subheadings.length;
  const [minSub, maxSub] = rules.subheadings;
  const subOK = subCount >= minSub && subCount <= maxSub + 2;
  details.push({
    category: "seo",
    item: "소제목 수",
    score: subOK ? 10 : subCount >= 1 ? 5 : 0,
    maxScore: 10,
    suggestion: subOK ? undefined : `소제목: ${subCount}개 (권장: ${minSub}~${maxSub}개)`,
  });

  // 7. 이미지 수 (10점)
  const [minImg, maxImg] = pattern.imageCount;
  const imgOK = content.imageCount >= minImg;
  details.push({
    category: "seo",
    item: "이미지 수",
    score: imgOK ? 10 : content.imageCount >= Math.floor(minImg * 0.5) ? 5 : 2,
    maxScore: 10,
    suggestion: imgOK ? undefined : `이미지: ${content.imageCount}장 (권장: ${minImg}~${maxImg}장)`,
  });

  // 8. 첫 문단 KW (10점)
  const firstPara = text.substring(0, 200);
  const firstParaKW = firstPara.toLowerCase().includes(mainKeyword.toLowerCase());
  details.push({
    category: "seo",
    item: "첫 문단 KW",
    score: firstParaKW ? 10 : 0,
    maxScore: 10,
    suggestion: firstParaKW ? undefined : "첫 문단(200자 이내)에 메인 키워드를 포함하세요",
  });

  const seo = details.filter((d) => d.category === "seo").reduce((s, d) => s + d.score, 0);

  // ═══════ GEO (100점) ═══════

  // 1. 정의문 존재 (25점)
  const hasDef = /[가-힣]+[은는이가]\s.+[이다입니다]/.test(text.substring(0, 500));
  details.push({
    category: "geo",
    item: "정의문",
    score: hasDef ? 25 : 0,
    maxScore: 25,
    suggestion: hasDef ? undefined : '본문 초반에 "[X]란 [Y]이다" 형식의 정의문을 추가하세요',
  });

  // 2. 구조화 데이터 (20점)
  const hasNumberedList = /[①②③④⑤\d]\.\s|[1-5]\)/m.test(text);
  const hasColonList = /:\s*[가-힣]/m.test(text);
  const structScore = (hasNumberedList ? 10 : 0) + (hasColonList ? 10 : 0);
  details.push({
    category: "geo",
    item: "구조화 데이터",
    score: structScore,
    maxScore: 20,
    suggestion: structScore < 20 ? "번호 리스트, 콜론 항목 나열 등 AI가 파싱하기 좋은 구조를 추가하세요" : undefined,
  });

  // 3. 출처/기원 명시 (20점)
  const hasSource = /출처|참고|연구|발표|보고서|통계|기관|공식/i.test(text);
  details.push({
    category: "geo",
    item: "출처/기원 명시",
    score: hasSource ? 20 : 0,
    maxScore: 20,
    suggestion: hasSource ? undefined : "통계, 연구결과, 공식발표 등에 출처를 명시하세요 (GEO 점수 +20)",
  });

  // 4. Q&A 패턴 (15점)
  const hasQA = /Q[:：]|A[:：]|질문|답변/.test(text);
  details.push({
    category: "geo",
    item: "Q&A 패턴",
    score: hasQA ? 15 : 0,
    maxScore: 15,
    suggestion: hasQA ? undefined : '"Q: ~ A: ~" 형식을 추가하면 AI 인용 확률이 높아집니다',
  });

  // 5. 요약 리캡 (20점)
  const hasRecap = /첫째|둘째|셋째|정리하면|요약하면|핵심은|정리:|결론/.test(text);
  details.push({
    category: "geo",
    item: "요약 리캡",
    score: hasRecap ? 20 : 0,
    maxScore: 20,
    suggestion: hasRecap ? undefined : '마무리에 "첫째/둘째/셋째" 또는 콜론 요약을 추가하세요',
  });

  const geo = details.filter((d) => d.category === "geo").reduce((s, d) => s + d.score, 0);

  // ═══════ AEO (100점) ═══════

  // 1. 핵심 요약문 50자 이내 (25점)
  const firstSentence = text.split(/[.!?。]/)[0] || "";
  const shortSummary = firstSentence.trim().length <= 50 && firstSentence.trim().length > 10;
  details.push({
    category: "aeo",
    item: "핵심 요약문 (≤50자)",
    score: shortSummary ? 25 : firstSentence.trim().length <= 80 ? 12 : 0,
    maxScore: 25,
    suggestion: shortSummary ? undefined : `첫 문장을 50자 이내 핵심 요약문으로 작성하세요 (현재: ${firstSentence.trim().length}자)`,
  });

  // 2. FAQ 존재 (25점)
  const hasFAQ = content.hasFAQ || /FAQ|자주\s*묻는|Q\d|Q\.|질문과\s*답/.test(text);
  details.push({
    category: "aeo",
    item: "FAQ 섹션",
    score: hasFAQ ? 25 : 0,
    maxScore: 25,
    suggestion: hasFAQ ? undefined : "글 하단에 3~5개 Q&A를 추가하세요 (스마트블록 대응)",
  });

  // 3. 단답형 문장 (20점)
  const sentences = text.split(/[.!?。]/).filter((s) => s.trim().length > 0);
  const shortSentences = sentences.filter((s) => s.trim().length <= 40).length;
  const shortRatio = sentences.length > 0 ? shortSentences / sentences.length : 0;
  details.push({
    category: "aeo",
    item: "단답형 문장 비율",
    score: shortRatio >= 0.3 ? 20 : shortRatio >= 0.15 ? 10 : 3,
    maxScore: 20,
    suggestion: shortRatio < 0.3 ? `40자 이내 간결 문장 비율: ${(shortRatio * 100).toFixed(0)}% (권장: 30%+)` : undefined,
  });

  // 4. 리스트 구조 (15점)
  const hasListStruct = /\d+가지|단계|방법|포인트|STEP/i.test(text);
  details.push({
    category: "aeo",
    item: "리스트 구조",
    score: hasListStruct ? 15 : 0,
    maxScore: 15,
    suggestion: hasListStruct ? undefined : '"3가지 방법", "5단계" 등 숫자 활용 구조를 사용하세요',
  });

  // 5. 마무리 정형문 (15점)
  const hasClosing = /알아보았습니다|살펴보았습니다|정리해\s*보았습니다|마치겠습니다/.test(text);
  details.push({
    category: "aeo",
    item: "마무리 정형문",
    score: hasClosing ? 15 : 0,
    maxScore: 15,
    suggestion: hasClosing ? undefined : '"이상으로 ~ 알아보았습니다" 형식의 마무리문을 추가하세요',
  });

  const aeo = details.filter((d) => d.category === "aeo").reduce((s, d) => s + d.score, 0);

  const total = Math.round(seo * 0.4 + geo * 0.3 + aeo * 0.3);

  return { seo, geo, aeo, total, details };
}

/**
 * 점수를 등급으로 변환
 */
export function getGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "S", color: "#2E8B57" };
  if (score >= 80) return { grade: "A", color: "#2E75B6" };
  if (score >= 70) return { grade: "B", color: "#D4790E" };
  if (score >= 60) return { grade: "C", color: "#CC0000" };
  return { grade: "D", color: "#888888" };
}
