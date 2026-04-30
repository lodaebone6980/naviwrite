// ═══════ AI API 연동 (서버 경유) ═══════
import type { Category, WriteRequest, WriteResult, ScoreResult, ContentJobResponse } from "./types";
import { getPattern } from "./patterns";
import { scoreContent } from "./scoring";

const DEFAULT_SERVER_URL = "https://web-production-184ff.up.railway.app";

/**
 * chrome.storage.sync에서 서버 URL을 가져옵니다
 */
export async function getServerUrl(): Promise<string> {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.get("settings", (data) => {
        resolve(data?.settings?.serverUrl || DEFAULT_SERVER_URL);
      });
    } else {
      resolve(DEFAULT_SERVER_URL);
    }
  });
}

/**
 * 서버에 POST 요청을 보내는 범용 헬퍼
 */
export async function fetchFromServer(path: string, body: unknown): Promise<unknown> {
  const serverUrl = await getServerUrl();
  const res = await fetch(`${serverUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Server error (${res.status}): ${err}`);
  }
  return res.json();
}

/**
 * 서버에 GET 요청을 보내는 범용 헬퍼
 */
async function getFromServer(path: string): Promise<unknown> {
  const serverUrl = await getServerUrl();
  const res = await fetch(`${serverUrl}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Server error (${res.status}): ${err}`);
  }
  return res.json();
}

// ─── 서버 API 헬퍼 함수들 ───

/** 포스트를 서버에 저장 */
export async function savePostToServer(post: unknown): Promise<unknown> {
  return fetchFromServer("/api/posts", post);
}

/** 글/QR 작업을 서버에 등록 */
export async function createContentJobOnServer(job: unknown): Promise<ContentJobResponse> {
  return fetchFromServer("/api/content-jobs", job) as Promise<ContentJobResponse>;
}

/** 글/QR 작업을 서버에서 업데이트 */
export async function updateContentJobOnServer(id: number | string, job: unknown): Promise<ContentJobResponse> {
  const serverUrl = await getServerUrl();
  const res = await fetch(`${serverUrl}/api/content-jobs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Server error (${res.status}): ${err}`);
  }
  return res.json();
}

/** 네이버 QR 정보를 서버에 저장 */
export async function saveNaverQrToServer(id: number | string, qr: unknown): Promise<ContentJobResponse> {
  return fetchFromServer(`/api/content-jobs/${id}/qr`, qr) as Promise<ContentJobResponse>;
}

/** Google Sheets 작업 큐 가져오기 */
export async function pullGoogleSheetJobsOnServer(): Promise<unknown> {
  return fetchFromServer("/api/content-jobs/sheets/pull", {});
}

/** 통계 조회 */
export async function getStatsFromServer(): Promise<unknown> {
  return getFromServer("/api/stats");
}

/** 대시보드 데이터 조회 */
export async function getDashboardFromServer(period: string): Promise<unknown> {
  return getFromServer(`/api/track/dashboard?period=${period}`);
}

/** 레퍼런스 목록 조회 */
export async function getReferencesFromServer(category?: string, keyword?: string): Promise<unknown> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (keyword) params.set("keyword", keyword);
  const qs = params.toString();
  return getFromServer(`/api/pattern/references${qs ? `?${qs}` : ""}`);
}

/** 레퍼런스 저장 */
export async function saveReferenceToServer(ref: unknown): Promise<unknown> {
  return fetchFromServer("/api/pattern/references", ref);
}

/** 특정 포스트의 피드백 조회 */
export async function getFeedbacksFromServer(postId: string): Promise<unknown> {
  return getFromServer(`/api/posts/${postId}`);
}

/** 피드백 저장 */
export async function saveFeedbackToServer(fb: unknown): Promise<unknown> {
  return fetchFromServer("/api/pattern/feedbacks", fb);
}

/** 피드백 적용 */
export async function applyFeedbackOnServer(id: string): Promise<unknown> {
  const serverUrl = await getServerUrl();
  const res = await fetch(`${serverUrl}/api/pattern/feedbacks/${id}/apply`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Server error (${res.status}): ${err}`);
  }
  return res.json();
}

/** AI 콘텐츠 분석 */
export async function analyzeContentOnServer(
  content: string,
  keyword: string,
  category: string,
  platform: string
): Promise<unknown> {
  return fetchFromServer("/api/ai/analyze", { content, keyword, category, platform });
}

/** 패턴 통계 조회 */
export async function getPatternStatsFromServer(): Promise<unknown> {
  return getFromServer("/api/pattern/stats");
}

/** 알림 조회 */
export async function getAlertsFromServer(): Promise<unknown> {
  return getFromServer("/api/track/alerts");
}

// ═══════ AI를 통한 글 생성 (서버 경유) ═══════

/**
 * AI를 통해 SEO/GEO/AEO 최적화된 글을 생성합니다
 */
export async function generateContent(
  request: WriteRequest,
  apiKey: string,
  provider: "claude" | "gpt" = "claude"
): Promise<WriteResult> {
  const pattern = getPattern(request.category);

  const systemPrompt = buildSystemPrompt(request, pattern);
  const userPrompt = buildUserPrompt(request);

  let resultText: string;

  if (provider === "claude") {
    resultText = await callClaude(apiKey, systemPrompt, userPrompt);
  } else {
    resultText = await callGPT(apiKey, systemPrompt, userPrompt);
  }

  // 결과 파싱
  const parsed = parseAIResponse(resultText);

  // 점수 계산
  const scores = scoreContent(
    {
      url: request.sourceUrl || "",
      title: parsed.title,
      body: parsed.content,
      text: parsed.plainText,
      charCount: parsed.plainText.replace(/\s/g, "").length,
      imageCount: (parsed.content.match(/\[이미지\s*\d*\]/g) || []).length,
      subheadings: parsed.content.match(/<h[23][^>]*>.*?<\/h[23]>/gi)?.map((h) => h.replace(/<[^>]+>/g, "")) || [],
      links: [],
      hasVideo: false,
      hasFAQ: /FAQ|자주\s*묻는|Q[:.]/.test(parsed.content),
      platform: request.platform,
    },
    request.targetKeyword,
    request.category
  );

  return {
    title: parsed.title,
    content: parsed.content,
    plainText: parsed.plainText,
    scores,
    charCount: parsed.plainText.replace(/\s/g, "").length,
    kwCount: (parsed.plainText.match(new RegExp(request.targetKeyword, "gi")) || []).length,
    imageSlots: pattern.imageCount[0],
    suggestions: scores.details.filter((d) => d.suggestion).map((d) => d.suggestion!),
  };
}

// ─── 시스템 프롬프트 빌드 ───
function buildSystemPrompt(req: WriteRequest, pattern: ReturnType<typeof getPattern>): string {
  return `당신은 네이버 블로그/카페 SEO 최적화 전문 작가입니다.

## 역할
원본 콘텐츠를 분석하여 SEO/GEO/AEO에 최적화된 새로운 글을 작성합니다.
절대 원본을 복사하지 않고, 핵심 정보만 추출하여 완전히 새로운 글로 재각색합니다.

## 카테고리: ${req.category}
- 글자수: ${pattern.charCount[0]}~${pattern.charCount[1]}자
- 키워드 반복: ${pattern.kwRepeat[0]}~${pattern.kwRepeat[1]}회
- 소제목: ${pattern.subheadingCount}개
- 이미지 슬롯: ${pattern.imageCount[0]}~${pattern.imageCount[1]}개 ([이미지 N] 표시)
- 톤: ${pattern.tone}
- 특수요소: ${pattern.specialElements.join(", ")}

## 글 구조
- 인트로: ${pattern.structure.intro}
- 본문: ${pattern.structure.body}
- 마무리: ${pattern.structure.conclusion}
- 섹션 순서: ${pattern.structure.sections.join(" → ")}

## SEO 규칙
- 제목: 메인KW "${req.targetKeyword}"를 앞부분에 배치, 25~40자
- 첫 문단에 메인KW 1회 필수
- 소제목에 메인KW 포함
- 마지막 문단에 메인KW 1회 필수
- KW 밀도 2~4%

## GEO 규칙 (AI 검색 대응)
- 본문 초반에 "[X]란 [Y]이다" 정의문 삽입
- 번호 리스트, 콜론 항목 나열 등 구조화 데이터
- 출처/기관 명시
- Q&A 패턴 포함
- 마무리에 "첫째/둘째/셋째" 또는 핵심 콜론 요약

## AEO 규칙 (스마트블록/AI 요약 대응)
- 첫 문장: 50자 이내 핵심 요약문
- 글 하단 FAQ 3~5개
- 40자 이내 간결 문장 30% 이상
- "3가지 방법", "5단계" 등 숫자 구조
- "~ 알아보았습니다" 정형 마무리문

## 플랫폼: 네이버 ${req.platform === "blog" ? "블로그" : "카페"}

## 출력 형식
반드시 다음 형식으로 출력하세요:

[제목]
(제목 텍스트)

[본문]
(HTML 형식의 본문. 소제목은 <h3>, 이미지 위치는 [이미지 N], 강조는 <strong>)

[FAQ]
Q: (질문1)
A: (답변1)
Q: (질문2)
A: (답변2)
Q: (질문3)
A: (답변3)`;
}

function buildUserPrompt(req: WriteRequest): string {
  const parts: string[] = [];

  if (req.sourceUrl) {
    parts.push(`원본 URL: ${req.sourceUrl}`);
  }
  if (req.sourceText) {
    parts.push(`원본 텍스트:\n${req.sourceText.substring(0, 3000)}`);
  }

  parts.push(`메인 키워드: ${req.targetKeyword}`);
  parts.push(`카테고리: ${req.category}`);
  parts.push(`플랫폼: 네이버 ${req.platform === "blog" ? "블로그" : "카페"}`);

  if (req.additionalKeywords?.length) {
    parts.push(`보조 키워드: ${req.additionalKeywords.join(", ")}`);
  }

  parts.push(
    "\n위 정보를 바탕으로 SEO/GEO/AEO 최적화된 새로운 글을 작성해주세요. 원본을 복사하지 말고 핵심 정보만 추출하여 완전히 새로운 글로 재각색하세요."
  );

  return parts.join("\n");
}

// ─── Claude API 호출 (서버 경유) ───
async function callClaude(_apiKey: string, system: string, user: string): Promise<string> {
  const serverUrl = await getServerUrl();
  const res = await fetch(`${serverUrl}/api/ai/claude`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system,
      messages: [{ role: "user", content: user }],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || data.text || data.result || "";
}

// ─── GPT API 호출 (서버 경유) ───
async function callGPT(_apiKey: string, system: string, user: string): Promise<string> {
  const serverUrl = await getServerUrl();
  const res = await fetch(`${serverUrl}/api/ai/gpt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GPT API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || data.text || data.result || "";
}

// ─── AI 응답 파싱 ───
function parseAIResponse(text: string): { title: string; content: string; plainText: string } {
  let title = "";
  let content = "";

  // [제목] 파싱
  const titleMatch = text.match(/\[제목\]\s*\n(.+)/);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // [본문] 파싱
  const bodyMatch = text.match(/\[본문\]\s*\n([\s\S]*?)(?=\[FAQ\]|$)/);
  if (bodyMatch) {
    content = bodyMatch[1].trim();
  }

  // [FAQ] 파싱 → 본문에 추가
  const faqMatch = text.match(/\[FAQ\]\s*\n([\s\S]*?)$/);
  if (faqMatch) {
    const faqHTML = faqMatch[1]
      .trim()
      .split("\n")
      .map((line) => {
        if (line.startsWith("Q:")) return `<p><strong>${line}</strong></p>`;
        if (line.startsWith("A:")) return `<p>${line}</p>`;
        return "";
      })
      .join("\n");
    content += `\n\n<h3>자주 묻는 질문 (FAQ)</h3>\n${faqHTML}`;
  }

  // 파싱 실패 시 전체 텍스트 사용
  if (!title && !content) {
    const lines = text.split("\n").filter((l) => l.trim());
    title = lines[0] || "제목 없음";
    content = lines.slice(1).join("\n");
  }

  const plainText = content.replace(/<[^>]+>/g, "").replace(/\[이미지\s*\d*\]/g, "");

  return { title, content, plainText };
}

/**
 * 원본 URL에서 텍스트를 추출합니다 (서버사이드 필요, 여기선 Content Script 결과 사용)
 */
export async function extractFromUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        reject(new Error("활성 탭을 찾을 수 없습니다"));
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: "EXTRACT_CONTENT" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response?.text || "");
      });
    });
  });
}
