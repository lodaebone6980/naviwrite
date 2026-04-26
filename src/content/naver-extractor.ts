// ═══════ NaviWrite Content Script: 네이버 블로그/카페 콘텐츠 추출 ═══════

/**
 * 현재 페이버에서 콘텐츠를 추출합니다.
 * 네이버 블로그: iframe 기반 스마트에디터
 * 네이버 카페: iframe 기반 게시글
 */

interface ExtractedData {
  url: string;
  title: string;
  body: string;
  text: string;
  charCount: number;
  imageCount: number;
  subheadings: string[];
  links: string[];
  hasVideo: boolean;
  hasFAQ: boolean;
  platform: "blog" | "cafe";
}

// 메시지 수신
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_CONTENT") {
    try {
      const data = extractContent();
      sendResponse(data);
    } catch (err) {
      sendResponse({ error: (err as Error).message });
    }
  }
  return true;
});

function extractContent(): ExtractedData {
  const url = window.location.href;
  const isBlog = url.includes("blog.naver.com");
  const isCafe = url.includes("cafe.naver.com");
  const platform = isBlog ? "blog" : "cafe";

  // 네이버 블로그/카페는 iframe 안에 콘텐츠가 있음
  let contentDoc: Document = document;

  // iframe 접근 시도
  const mainFrame =
    document.getElementById("mainFrame") as HTMLIFrameElement | null ??
    document.querySelector('iframe[name="mainFrame"]') as HTMLIFrameElement | null;

  if (mainFrame?.contentDocument) {
    contentDoc = mainFrame.contentDocument;
  }

  // 블로그 본문 영역 찾기
  const postArea =
    contentDoc.querySelector(".se-main-container") ?? // 스마트에디터 ONE
    contentDoc.querySelector("#postViewArea") ?? // 구버전
    contentDoc.querySelector(".post-view") ?? // 모바일
    contentDoc.querySelector("#body") ?? // 카페
    contentDoc.querySelector(".article_viewer") ?? // 카페 신버전
    contentDoc.body;

  // 제목 추출
  const title =
    contentDoc.querySelector(".se-title-text")?.textContent?.trim() ??
    contentDoc.querySelector(".pcol1")?.textContent?.trim() ??
    contentDoc.querySelector(".tit_h3")?.textContent?.trim() ??
    contentDoc.querySelector("h3.title_text")?.textContent?.trim() ??
    contentDoc.querySelector(".article_header .title")?.textContent?.trim() ??
    document.title.replace(/ : 네이버 블로그| : 네이버 카페/g, "").trim();

  // 본문 HTML
  const body = postArea?.innerHTML ?? "";

  // 순수 텍스트
  const text = postArea?.textContent?.trim() ?? "";

  // 글자수 (공백 제외)
  const charCount = text.replace(/\s/g, "").length;

  // 이미지 수
  const images = postArea?.querySelectorAll("img") ?? [];
  const imageCount = Array.from(images).filter(
    (img) =>
      img.src &&
      !img.src.includes("static") &&
      !img.src.includes("icon") &&
      img.width > 100
  ).length;

  // 소제목 추출
  const subheadings: string[] = [];

  // 스마트에디터 ONE 소제목
  const seHeadings = postArea?.querySelectorAll(
    ".se-text-paragraph-align-center strong, .se-text-paragraph-align-left strong, h2, h3, h4"
  );
  if (seHeadings) {
    seHeadings.forEach((el) => {
      const txt = el.textContent?.trim();
      if (txt && txt.length > 3 && txt.length < 60) {
        subheadings.push(txt);
      }
    });
  }

  // 인용구 기반 소제목 (네이버 블로그 특유)
  const quotes = postArea?.querySelectorAll(".se-quote");
  if (quotes) {
    quotes.forEach((q) => {
      const txt = q.textContent?.trim();
      if (txt && txt.length > 3 && txt.length < 60) {
        subheadings.push(txt);
      }
    });
  }

  // 링크 추출
  const linkElements = postArea?.querySelectorAll("a[href]") ?? [];
  const links = Array.from(linkElements)
    .map((a) => (a as HTMLAnchorElement).href)
    .filter((href) => href.startsWith("http"));

  // 비디오 존재 여부
  const hasVideo =
    !!postArea?.querySelector("iframe[src*='youtube'], iframe[src*='tv.naver'], video, .se-video");

  // FAQ 존재 여부
  const hasFAQ = /FAQ|자주\s*묻는|Q[:：\.]|질문과\s*답/.test(text);

  return {
    url,
    title,
    body,
    text,
    charCount,
    imageCount,
    subheadings: [...new Set(subheadings)], // 중복 제거
    links: [...new Set(links)],
    hasVideo,
    hasFAQ,
    platform,
  };
}

// 페이지 내 현재 텍스트를 하이라이트하는 유틸 (추후 에디터 삽입용)
function highlightKeyword(keyword: string) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const regex = new RegExp(`(${keyword})`, "gi");

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (regex.test(node.textContent || "")) {
      const span = document.createElement("span");
      span.innerHTML = (node.textContent || "").replace(
        regex,
        '<mark style="background:#D5E8F0;padding:0 2px;border-radius:2px;">$1</mark>'
      );
      node.parentNode?.replaceChild(span, node);
    }
  }
}

export { extractContent, highlightKeyword };
