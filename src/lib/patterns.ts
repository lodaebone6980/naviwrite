// ═══════ 카테고리별 패턴 DB ═══════
import type { Category, CategoryPattern, PlatformRules } from "./types";

// ─── 플랫폼별 기본 규칙 ───
export const PLATFORM_RULES: Record<string, PlatformRules> = {
  blog: {
    platform: "blog",
    charCount: [1500, 4000],
    titleLength: [25, 40],
    kwRepeat: [5, 19],
    imageCount: [8, 15],
    subheadings: [3, 5],
    internalLinks: [2, 3],
  },
  cafe: {
    platform: "cafe",
    charCount: [800, 2000],
    titleLength: [20, 35],
    kwRepeat: [3, 8],
    imageCount: [5, 10],
    subheadings: [2, 4],
    internalLinks: [1, 2],
  },
};

// ─── 카테고리별 최적화 패턴 (실제 블로그 분석 결과 반영) ───
export const CATEGORY_PATTERNS: CategoryPattern[] = [
  {
    category: "맛집",
    charCount: [2000, 3000],
    imageCount: [15, 25],
    kwRepeat: [6, 8],
    subheadingCount: 4,
    tone: "친근한 후기체",
    specialElements: ["메뉴사진", "가격표", "위치지도", "영업시간"],
    structure: {
      intro: "방문 계기 + 기대감 (2~3문단)",
      body: "메뉴별 사진+리뷰 (4~5섹션)",
      conclusion: "총평 + 추천 포인트 + 재방문 의사",
      sections: ["매장 분위기", "메뉴 소개", "맛 평가", "가격/양", "총평"],
    },
  },
  {
    category: "여행",
    charCount: [3000, 4000],
    imageCount: [15, 20],
    kwRepeat: [5, 7],
    subheadingCount: 5,
    tone: "경험담 서술체",
    specialElements: ["일정표", "경비", "교통편", "숙소정보"],
    structure: {
      intro: "여행 동기 + 간략 일정 소개",
      body: "일정별/장소별 상세 후기 (5~6섹션)",
      conclusion: "여행 총평 + 꿀팁 정리 + 추천 코스",
      sections: ["일정 개요", "Day 1", "Day 2", "맛집/카페", "총 경비", "꿀팁"],
    },
  },
  {
    // ✅ 실제 분석 반영 (scho990 + blogbaksa)
    category: "IT/테크",
    charCount: [2000, 2500],
    imageCount: [6, 8],
    kwRepeat: [12, 19],
    subheadingCount: 5,
    tone: "전문적 설명체 + 개인경험 프레이밍",
    specialElements: ["스크린샷", "절차도", "커버카드이미지", "CTA링크", "동영상"],
    structure: {
      intro: "개인 경험 프레이밍 → 호기심 → 글 구성 안내 (3문단, 50자 이내 핵심 요약문)",
      body: "[인용구제목+이미지+본문] x 5섹션. 번호 뺑지+볼드제목+부제+그린배너 이미지카드",
      conclusion: "첫째/둘째/셋째 요약 리캡 + 추천 문구 + '알아보았습니다' 정형 마무리문",
      sections: ["인트로+CTA+동영상", "섹션1", "섹션2", "섹션3", "섹션4", "섹션5", "마무리"],
    },
  },
  {
    category: "건강/의료",
    charCount: [2000, 3000],
    imageCount: [8, 10],
    kwRepeat: [5, 6],
    subheadingCount: 4,
    tone: "신뢰감 정보체",
    specialElements: ["출처 명시 필수", "주의사항", "의학용어 설명"],
    structure: {
      intro: "증상/질환 정의 + 중요성 강조",
      body: "원인 → 증상 → 진단 → 치료/예방 (4섹션)",
      conclusion: "핵심 요약 + 전문의 상담 권유",
      sections: ["정의", "원인", "증상", "치료/예방", "주의사항"],
    },
  },
  {
    category: "재테크/금융",
    charCount: [2500, 3500],
    imageCount: [8, 12],
    kwRepeat: [5, 7],
    subheadingCount: 5,
    tone: "분석적 설명체",
    specialElements: ["차트/테이블", "수익률 비교", "리스크 안내"],
    structure: {
      intro: "시장 상황 + 투자 관심 포인트",
      body: "상품/전략 비교 분석 (4~5섹션)",
      conclusion: "핵심 정리 + 유의사항 + 추가 정보 안내",
      sections: ["개요", "비교 분석", "장단점", "실전 팁", "유의사항"],
    },
  },
  {
    category: "육아/육품",
    charCount: [1500, 2500],
    imageCount: [10, 15],
    kwRepeat: [4, 6],
    subheadingCount: 4,
    tone: "공감형 후기체",
    specialElements: ["제품사진 필수", "사용후기", "비교표"],
    structure: {
      intro: "구매 계기 + 고민 포인트",
      body: "제품 상세 + 사용 후기 (3~4섹션)",
      conclusion: "추천/비추천 정리 + 구매 링크",
      sections: ["구매 이유", "제품 스펙", "사용 후기", "장단점", "추천"],
    },
  },
  {
    category: "부동산",
    charCount: [2000, 3000],
    imageCount: [10, 15],
    kwRepeat: [5, 7],
    subheadingCount: 5,
    tone: "전문적 분석체",
    specialElements: ["평면도", "분양가", "시세표", "입지분석"],
    structure: {
      intro: "단지/지역 개요 + 관심 포인트",
      body: "입지 → 평면 → 시세 → 전망 (4~5섹션)",
      conclusion: "투자 포인트 정리 + 유의사항",
      sections: ["단지 개요", "입지 분석", "평면/구조", "시세/전망", "총평"],
    },
  },
  {
    // ✅ 실제 분석 반영 (고유가 피해지원금 블로그)
    category: "정부정책",
    charCount: [1200, 2000],
    imageCount: [6, 10],
    kwRepeat: [6, 8],
    subheadingCount: 5,
    tone: "절차 안내체 (1인칭 최소화, '주/이에요' 구어체)",
    specialElements: ["신청방법", "조건표", "기간/일정", "콜론 항목 나열"],
    structure: {
      intro: "정책 명칭 정의 + 핵심 요약 (50자 이내)",
      body: "4단 구조: 대상 → 금액기준 → 지급일정 → 신청방법. 수치 데이터 콜론 형식",
      conclusion: "5항목 콜론 요약 (대상/금액/기간/방법/주의) + '확인만 해도 받을 수 있다' 행동유도",
      sections: ["정책 개요", "지원 대상", "지원 금액/기준", "지급 일정", "신청 방법", "마무리 요약"],
    },
  },
];

// ─── 카테고리 찾기 ───
export function getPattern(category: Category): CategoryPattern {
  return CATEGORY_PATTERNS.find((p) => p.category === category) ?? CATEGORY_PATTERNS[0];
}

export function getPlatformRules(platform: string): PlatformRules {
  return PLATFORM_RULES[platform] ?? PLATFORM_RULES.blog;
}
