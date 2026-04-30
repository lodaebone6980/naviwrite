// ═══════ NaviWrite Content Script: 네이버 QR 생성 보조 ═══════

interface PendingNaverQr {
  jobId?: number;
  qrName?: string;
  targetUrl: string;
  keyword?: string;
  campaignName?: string;
  openedAt?: string;
}

const PANEL_ID = "naviwrite-qr-helper";

chrome.storage.local.get("pendingNaverQr", (data) => {
  const pending = data.pendingNaverQr as PendingNaverQr | undefined;
  if (!pending?.targetUrl || !location.hostname.includes("qr.naver.com")) return;
  renderPanel(pending);
});

function renderPanel(pending: PendingNaverQr) {
  if (document.getElementById(PANEL_ID)) return;

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = `
    position: fixed;
    right: 18px;
    top: 18px;
    z-index: 2147483647;
    width: 340px;
    padding: 16px;
    border: 1px solid #d9e2ec;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 12px 36px rgba(15, 23, 42, 0.18);
    color: #1f2937;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif;
  `;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;">
      <strong style="font-size:15px;color:#1B3A5C;">NaviWrite 네이버 QR</strong>
      <button id="naviwrite-qr-close" style="border:0;background:#f3f4f6;border-radius:8px;padding:4px 8px;cursor:pointer;">닫기</button>
    </div>
    <div style="font-size:12px;line-height:1.55;color:#4b5563;margin-bottom:12px;">
      <div><b>QR 이름</b>: ${escapeHtml(pending.qrName || "")}</div>
      <div style="word-break:break-all;"><b>연결 링크</b>: ${escapeHtml(pending.targetUrl)}</div>
    </div>
    <div id="naviwrite-qr-status" style="font-size:12px;color:#6b7280;margin-bottom:12px;">
      코드 생성 화면에서 자동 입력을 시도할 수 있습니다.
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <button id="naviwrite-qr-create" style="${buttonStyle("#1B3A5C")}">코드 생성 찾기</button>
      <button id="naviwrite-qr-fill" style="${buttonStyle("#2E75B6")}">자동 입력</button>
      <button id="naviwrite-qr-copy" style="${buttonStyle("#64748b")}">링크 복사</button>
      <button id="naviwrite-qr-save" style="${buttonStyle("#2E8B57")}">완료 저장</button>
    </div>
    <p style="font-size:11px;line-height:1.45;color:#9ca3af;margin-top:10px;">
      네이버 로그인은 사용자가 직접 진행합니다. 비밀번호는 저장하지 않습니다.
    </p>
  `;

  document.documentElement.appendChild(panel);

  qs<HTMLButtonElement>("#naviwrite-qr-close")?.addEventListener("click", () => panel.remove());
  qs<HTMLButtonElement>("#naviwrite-qr-create")?.addEventListener("click", () => {
    clickByText(["코드 생성", "QR코드 만들기", "만들기"]);
  });
  qs<HTMLButtonElement>("#naviwrite-qr-fill")?.addEventListener("click", () => autoFillNaverQr(pending));
  qs<HTMLButtonElement>("#naviwrite-qr-copy")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(pending.targetUrl);
    setStatus("연결 링크를 클립보드에 복사했습니다.");
  });
  qs<HTMLButtonElement>("#naviwrite-qr-save")?.addEventListener("click", () => saveQrResult(pending));
}

function autoFillNaverQr(pending: PendingNaverQr) {
  clickByText(["URL 링크", "URL", "링크로 이동", "웹사이트"]);

  const nameFilled = fillFirstMatchingInput(
    ["제목", "코드명", "코드 이름", "이름", "title", "name"],
    pending.qrName || pending.keyword || "NaviWrite QR"
  );
  const urlFilled = fillFirstMatchingInput(
    ["URL", "주소", "링크", "url", "link"],
    pending.targetUrl,
    true
  );

  setStatus(
    `자동 입력 시도 완료: QR 이름 ${nameFilled ? "성공" : "확인 필요"}, 연결 링크 ${urlFilled ? "성공" : "확인 필요"}`
  );
}

function fillFirstMatchingInput(candidates: string[], value: string, preferUrl = false): boolean {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
  ).filter(isVisibleInput);

  const urlInput = preferUrl
    ? inputs.find((input) => input instanceof HTMLInputElement && input.type === "url")
    : null;
  if (urlInput) {
    setNativeValue(urlInput, value);
    return true;
  }

  const matched = inputs.find((input) => {
    const haystack = [
      input.getAttribute("placeholder"),
      input.getAttribute("aria-label"),
      input.getAttribute("name"),
      input.getAttribute("id"),
      input.closest("label")?.textContent,
      findLabelForInput(input),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return candidates.some((word) => haystack.includes(word.toLowerCase()));
  });

  if (matched) {
    setNativeValue(matched, value);
    return true;
  }

  const fallback = inputs.find((input) => {
    if (!(input instanceof HTMLInputElement)) return true;
    return ["text", "search", "url", ""].includes(input.type);
  });
  if (fallback) {
    setNativeValue(fallback, value);
    return true;
  }

  return false;
}

function saveQrResult(pending: PendingNaverQr) {
  const imageUrl = findQrImageUrl();
  const manageUrl = location.href;

  if (!pending.jobId) {
    setStatus("작업 ID가 없어 서버 저장은 건너뛰었습니다. QR 이미지는 수동으로 저장해 주세요.");
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: "UPDATE_CONTENT_JOB_QR",
      payload: {
        jobId: pending.jobId,
        naverQrImageUrl: imageUrl,
        naverQrManageUrl: manageUrl,
      },
    },
    (response) => {
      if (chrome.runtime.lastError) {
        setStatus(`저장 실패: ${chrome.runtime.lastError.message}`);
        return;
      }
      if (response?.error) {
        setStatus(`저장 실패: ${response.error}`);
        return;
      }
      setStatus("QR 정보가 DB와 Google Sheets 동기화 대상으로 저장되었습니다.");
    }
  );
}

function findQrImageUrl(): string | null {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
  const qrImage = images.find((img) => {
    const src = img.src || "";
    const alt = img.alt || "";
    const text = `${src} ${alt}`.toLowerCase();
    return img.width >= 80 && img.height >= 80 && (text.includes("qr") || text.includes("code"));
  });
  if (qrImage?.src) return qrImage.src;

  const canvas = Array.from(document.querySelectorAll<HTMLCanvasElement>("canvas"))
    .find((item) => item.width >= 80 && item.height >= 80);
  if (canvas) {
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }

  return null;
}

function clickByText(texts: string[]): boolean {
  const targets = Array.from(document.querySelectorAll<HTMLElement>("a, button, [role='button'], label, span, div"))
    .filter(isVisibleElement);

  const target = targets.find((el) => {
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    return texts.some((needle) => text.includes(needle));
  });

  if (!target) {
    setStatus(`${texts.join(" / ")} 버튼을 찾지 못했습니다. 화면에서 직접 선택해 주세요.`);
    return false;
  }

  target.click();
  setStatus(`${(target.textContent || "대상").trim()} 항목을 선택했습니다.`);
  return true;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function findLabelForInput(input: HTMLInputElement | HTMLTextAreaElement): string {
  const id = input.getAttribute("id");
  if (!id) return "";
  return document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent || "";
}

function isVisibleInput(input: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (input.disabled || input.readOnly) return false;
  return isVisibleElement(input);
}

function isVisibleElement(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function qs<T extends HTMLElement>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

function setStatus(message: string) {
  const status = qs<HTMLDivElement>("#naviwrite-qr-status");
  if (status) status.textContent = message;
}

function buttonStyle(background: string) {
  return [
    "border:0",
    "border-radius:9px",
    "padding:9px 8px",
    `background:${background}`,
    "color:white",
    "font-size:12px",
    "font-weight:700",
    "cursor:pointer",
  ].join(";");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export {};
