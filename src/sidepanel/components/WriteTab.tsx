import { useState } from "react";
import type { Category, Platform, ContentJob } from "../../lib/types";
import { getPattern, getPlatformRules } from "../../lib/patterns";
import { generateContent, analyzeContentOnServer, createContentJobOnServer } from "../../lib/api";

const CATEGORIES: Category[] = ["맛집", "여행", "IT/테크", "건강/의료", "재테크/금융", "육아/육품", "부동산", "정부정책"];
const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "blog", label: "네이버 블로그" },
  { id: "cafe", label: "네이버 카페" },
];

export default function WriteTab() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [keyword, setKeyword] = useState("");
  const [subKeywords, setSubKeywords] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [qrTargetUrl, setQrTargetUrl] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [toneOption, setToneOption] = useState("");
  const [category, setCategory] = useState<Category>("IT/테크");
  const [platform, setPlatform] = useState<Platform>("blog");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegisteringJob, setIsRegisteringJob] = useState(false);
  const [contentJob, setContentJob] = useState<ContentJob | null>(null);
  const [qrStatusMessage, setQrStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    title: string;
    content: string;
    scores: { seo: number; geo: number; aeo: number; total: number };
    charCount: number;
    kwCount: number;
  } | null>(null);

  const pattern = getPattern(category);
  const rules = getPlatformRules(platform);

  const buildQrBlock = (targetUrl: string) => `
<blockquote data-naviwrite="qr-cta">
  지금 바로 QR로 접속해 확인하세요.
</blockquote>
<p><a href="${targetUrl}" target="_blank" rel="noopener noreferrer">${targetUrl}</a></p>
<p>[네이버 QR 이미지 삽입 위치]</p>`;

  const injectQrBlock = (content: string, targetUrl: string) => {
    if (!targetUrl || content.includes("data-naviwrite=\"qr-cta\"")) return content;
    const qrBlock = buildQrBlock(targetUrl);
    const headingMatches = [...content.matchAll(/<h3[^>]*>/gi)];
    if (headingMatches.length >= 2 && headingMatches[1].index !== undefined) {
      return `${content.slice(0, headingMatches[1].index)}\n${qrBlock}\n${content.slice(headingMatches[1].index)}`;
    }
    return `${content}\n\n${qrBlock}`;
  };

  const createOrRegisterContentJob = async (payload?: {
    title?: string;
    content?: string;
    scores?: { seo: number; geo: number; aeo: number; total: number };
    charCount?: number;
    kwCount?: number;
  }) => {
    if (!keyword.trim()) throw new Error("타겟 키워드가 필요합니다");
    const targetUrl = (qrTargetUrl || ctaUrl).trim();

    const response = await createContentJobOnServer({
      keyword,
      category,
      platform,
      sourceUrl: inputMode === "url" ? sourceUrl : undefined,
      ctaUrl: ctaUrl || undefined,
      qrTargetUrl: targetUrl || undefined,
      campaignName: campaignName || undefined,
      tone: toneOption || undefined,
      title: payload?.title,
      content: payload?.content,
      plainText: payload?.content?.replace(/<[^>]+>/g, ""),
      scores: payload?.scores,
      charCount: payload?.charCount,
      kwCount: payload?.kwCount,
      imageCount: pattern.imageCount[0],
      generationStatus: payload?.title ? "본문 생성 완료" : "대기중",
      qrStatus: targetUrl ? "QR 생성 필요" : "대기중",
      editorStatus: "검수 필요",
      source: "extension_single",
    });

    setContentJob(response.job);
    if (response.sheetSync?.status) {
      setQrStatusMessage(`작업 저장 완료 · Sheets: ${response.sheetSync.status}`);
    } else {
      setQrStatusMessage("작업 저장 완료");
    }
    return response.job;
  };

  const handleRegisterJobOnly = async () => {
    setIsRegisteringJob(true);
    setError(null);
    try {
      await createOrRegisterContentJob();
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업 등록에 실패했습니다");
    } finally {
      setIsRegisteringJob(false);
    }
  };

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      // chrome.storage에서 설정 불러오기
      const settings = await new Promise<{
        apiKey?: string;
        aiProvider?: "claude" | "gpt";
        serverUrl?: string;
      }>((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage?.sync) {
          chrome.storage.sync.get("settings", (data) => {
            resolve(data?.settings || {});
          });
        } else {
          resolve({});
        }
      });

      const serverUrl = settings.serverUrl || "https://web-production-184ff.up.railway.app";
      const apiKey = settings.apiKey || "";
      const provider = settings.aiProvider || "claude";

      let genResult;

      if (serverUrl) {
        // 서버 경유 AI 분석 시도
        try {
          const sourceContent = inputMode === "url" ? sourceUrl : sourceText;
          const analyzed = (await analyzeContentOnServer(
            sourceContent,
            keyword,
            category,
            platform
          )) as {
            title?: string;
            content?: string;
            scores?: { seo: number; geo: number; aeo: number; total: number };
            charCount?: number;
            kwCount?: number;
          };

          if (analyzed && analyzed.title) {
            genResult = {
              title: analyzed.title,
              content: analyzed.content || "",
              scores: analyzed.scores || { seo: 0, geo: 0, aeo: 0, total: 0 },
              charCount: analyzed.charCount || 0,
              kwCount: analyzed.kwCount || 0,
            };
          }
        } catch {
          // 서버 분석 실패 시 직접 AI 호출로 폴백
          console.log("서버 분석 실패, 직접 AI 호출로 전환");
        }
      }

      // 서버 분석 결과가 없으면 직접 generateContent 호출
      if (!genResult) {
        const writeResult = await generateContent(
          {
            sourceUrl: inputMode === "url" ? sourceUrl : undefined,
            sourceText: inputMode === "text" ? sourceText : undefined,
            targetKeyword: keyword,
            category,
            platform,
            additionalKeywords: subKeywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean),
            tone: toneOption || undefined,
            ctaUrl: ctaUrl || undefined,
            qrTargetUrl: qrTargetUrl || ctaUrl || undefined,
            campaignName: campaignName || undefined,
          },
          apiKey,
          provider
        );

        genResult = {
          title: writeResult.title,
          content: writeResult.content,
          scores: {
            seo: writeResult.scores.seo,
            geo: writeResult.scores.geo,
            aeo: writeResult.scores.aeo,
            total: writeResult.scores.total,
          },
          charCount: writeResult.charCount,
          kwCount: writeResult.kwCount,
        };
      }

      const qrLinkForBody = (qrTargetUrl || ctaUrl).trim();
      if (qrLinkForBody) {
        genResult = {
          ...genResult,
          content: injectQrBlock(genResult.content, qrLinkForBody),
        };
      }

      setResult(genResult);

      // 생성된 글/QR 작업을 서버에 저장
      try {
        await createOrRegisterContentJob(genResult);
      } catch {
        console.warn("콘텐츠 작업 서버 저장 실패 (오프라인 모드)");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "글 생성에 실패했습니다");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenNaverQr = async () => {
    setError(null);
    setQrStatusMessage(null);
    try {
      const targetUrl = (qrTargetUrl || ctaUrl).trim();
      if (!targetUrl) {
        throw new Error("QR 연결 링크 또는 CTA 링크를 입력해 주세요");
      }

      const job = contentJob || (await createOrRegisterContentJob(result || undefined));
      const qrName =
        job.naver_qr_name ||
        `${keyword.trim().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${(campaignName || "기본").replace(/\s+/g, "_")}`;

      if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
        throw new Error("크롬 확장프로그램 환경에서만 네이버 QR 탭을 열 수 있습니다");
      }

      chrome.runtime.sendMessage(
        {
          type: "OPEN_NAVER_QR",
          payload: {
            jobId: job.id,
            qrName,
            targetUrl,
            keyword,
            campaignName,
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            setError(chrome.runtime.lastError.message || "네이버 QR 탭 열기에 실패했습니다");
            return;
          }
          if (response?.error) {
            setError(response.error);
            return;
          }
          setQrStatusMessage("네이버 QR 생성 탭을 열었습니다. 오른쪽 NaviWrite 패널에서 자동 입력을 진행하세요.");
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "네이버 QR 생성 준비에 실패했습니다");
    }
  };

  const handleCopyToClipboard = () => {
    if (!result) return;
    const html = `<h2>${result.title}</h2>\n${result.content}`;
    navigator.clipboard.writeText(html).then(() => {
      alert("클립보드에 복사되었습니다! 네이버 에디터에 붙여넣기 하세요.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/10 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-extrabold text-primary">글 생성 워크플로</p>
            <p className="text-[10px] text-gray-400">원문 분석부터 네이버 QR 저장까지 한 번에 관리합니다</p>
          </div>
          <span className="rounded-full bg-light px-2.5 py-1 text-[10px] font-bold text-primary">
            Railway 연결
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[
            ["1", "입력"],
            ["2", "생성"],
            ["3", "QR/Sheets"],
          ].map(([step, label]) => (
            <div key={step} className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-2">
              <div className="mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                {step}
              </div>
              <p className="text-[10px] font-bold text-gray-600">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 입력 모드 전환 */}
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode("url")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
            inputMode === "url"
              ? "bg-primary text-white border-primary"
              : "bg-white text-gray-500 border-gray-200 hover:border-accent"
          }`}
        >
          🔗 URL 입력
        </button>
        <button
          onClick={() => setInputMode("text")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
            inputMode === "text"
              ? "bg-primary text-white border-primary"
              : "bg-white text-gray-500 border-gray-200 hover:border-accent"
          }`}
        >
          📝 텍스트 붙여넣기
        </button>
      </div>

      {/* 원본 입력 */}
      {inputMode === "url" ? (
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">원본 URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://blog.naver.com/..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
      ) : (
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">원본 텍스트</label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="원본 콘텐츠를 붙여넣으세요..."
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white resize-none
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
      )}

      {/* 타겟 키워드 */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">타겟 키워드 *</label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="메인 키워드 입력"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>

      {/* 보조 키워드 */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">보조 키워드 (선택)</label>
        <input
          type="text"
          value={subKeywords}
          onChange={(e) => setSubKeywords(e.target.value)}
          placeholder="쉼표로 구분 (예: 결과유형, 성격테스트)"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>

      {/* CTA / QR 링크 */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-extrabold text-primary">링크와 QR 설정</p>
            <p className="text-[10px] text-gray-400">QR 연결 링크를 비우면 CTA 링크를 그대로 사용합니다</p>
          </div>
          <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">
            네이버 QR
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">CTA 링크</label>
          <input
            type="url"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="본문 버튼/문장으로 유도할 링크"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">QR 연결 링크</label>
          <input
            type="url"
            value={qrTargetUrl}
            onChange={(e) => setQrTargetUrl(e.target.value)}
            placeholder="비워두면 CTA 링크로 QR을 만듭니다"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
        </div>
      </div>

      {/* 캠페인 / 톤 */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">캠페인명</label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="예: sbti_테스트"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">어체/톤</label>
          <input
            type="text"
            value={toneOption}
            onChange={(e) => setToneOption(e.target.value)}
            placeholder="예: 경험담형, 담백한 톤"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white
              focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
      </div>

      {/* 카테고리 */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">카테고리</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition ${
                category === c
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-500 border-gray-200 hover:border-accent hover:text-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 플랫폼 */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">플랫폼</label>
        <div className="flex gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold border transition ${
                platform === p.id
                  ? "bg-accent text-white border-accent"
                  : "bg-white text-gray-500 border-gray-200 hover:border-accent"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 학습된 패턴 정보 */}
      <div className="bg-light/50 border border-light rounded-lg p-3">
        <p className="text-[11px] font-bold text-primary mb-1.5">
          📐 {category} 패턴 적용
        </p>
        <div className="text-[10px] text-gray-500 leading-relaxed space-y-0.5">
          <p>글자수: {pattern.charCount[0].toLocaleString()}~{pattern.charCount[1].toLocaleString()}자 · 이미지: {pattern.imageCount[0]}~{pattern.imageCount[1]}장</p>
          <p>KW반복: {pattern.kwRepeat[0]}~{pattern.kwRepeat[1]}회 · 소제목: {pattern.subheadingCount}개</p>
          <p>톤: {pattern.tone}</p>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-[11px] text-danger font-medium">{error}</p>
        </div>
      )}

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={!keyword.trim() || isGenerating}
        className={`w-full py-3 rounded-xl text-sm font-bold text-white transition
          ${isGenerating ? "bg-gray-400 cursor-wait" : "bg-accent hover:bg-primary pulse-glow"}
          disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            AI 최적화 글 생성 중...
          </span>
        ) : (
          "🚀 최적화 글 생성하기"
        )}
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-extrabold text-primary">저장 및 QR 작업</p>
          {contentJob && <span className="text-[10px] font-bold text-gray-400">작업 #{contentJob.id}</span>}
        </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleRegisterJobOnly}
          disabled={!keyword.trim() || isRegisteringJob}
          className="py-2.5 bg-primary text-white border border-primary rounded-lg text-xs font-bold hover:bg-accent transition disabled:opacity-50"
        >
          {isRegisteringJob ? "등록 중..." : "DB/Sheets 작업 등록"}
        </button>
        <button
          onClick={handleOpenNaverQr}
          disabled={!keyword.trim() || !(qrTargetUrl || ctaUrl)}
          className="py-2.5 bg-success text-white rounded-lg text-xs font-bold hover:bg-primary transition disabled:opacity-50"
        >
          네이버 QR 만들기
        </button>
      </div>
      </div>

      {(contentJob || qrStatusMessage) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-[11px] text-success font-semibold">
            {qrStatusMessage || "작업이 저장되었습니다"}
          </p>
          {contentJob && (
            <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">
              <p>작업 #{contentJob.id} · QR: {contentJob.qr_status} · Sheets: {contentJob.sheet_sync_status}</p>
              {contentJob.naver_qr_name && <p>QR 이름: {contentJob.naver_qr_name}</p>}
            </div>
          )}
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="animate-slideUp space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-primary mb-3">📝 생성 결과</h3>

            {/* 점수 바 */}
            {(["seo", "geo", "aeo"] as const).map((key) => (
              <div key={key} className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold w-8 uppercase">{key}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      key === "seo" ? "bg-accent" : key === "geo" ? "bg-success" : "bg-purple"
                    }`}
                    style={{ width: `${result.scores[key]}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold w-7 text-right">{result.scores[key]}</span>
              </div>
            ))}

            <div className="flex justify-between text-[10px] text-gray-400 mt-1 mb-3">
              <span>종합: {result.scores.total}점</span>
              <span>{result.charCount.toLocaleString()}자 · KW {result.kwCount}회</span>
            </div>

            {/* 제목 미리보기 */}
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-[10px] text-gray-400 mb-1">제목</p>
              <p className="text-sm font-bold text-gray-800">{result.title}</p>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={handleCopyToClipboard}
                className="flex-1 py-2.5 bg-accent text-white rounded-lg text-xs font-bold hover:bg-primary transition"
              >
                📋 클립보드 복사
              </button>
              <button className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition">
                ✏️ 수정하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
