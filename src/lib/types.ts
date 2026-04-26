// ═══════ NaviWrite Core Types ═══════

export type Platform = "blog" | "cafe";

export type Category =
  | "맛집"
  | "여행"
  | "IT/테크"
  | "건강/의료"
  | "재테크/금융"
  | "유아/육품"
  | "부동산"
  | "정부정책";

export interface CategoryPattern {
  category: Category;
  charCount: [number, number]; // min, max
  imageCount: [number, number];
  kwRepeat: [number, number];
  subheadingCount: number;
  tone: string;
  specialElements: string[];
  structure: StructureTemplate;
}

export interface StructureTemplate {
  intro: string;
  body: string;
  conclusion: string;
  sections: string[];
}

export interface PlatformRules {
  platform: Platform;
  charCount: [number, number];
  titleLength: [number, number];
  kwRepeat: [number, number];
  imageCount: [number, number];
  subheadings: [number, number];
  internalLinks: [number, number];
}

// ─── SEO/GEO/AEO Scoring ───

export interface ScoreResult {
  seo: number;
  geo: number;
  aeo: number;
  total: number;
  details: ScoreDetail[];
}

export interface ScoreDetail {
  category: "seo" | "geo" | "aeo";
  item: string;
  score: number;
  maxScore: number;
  suggestion?: string;
}

// ─── Content Analysis ───

export interface ExtractedContent {
  url: string;
  title: string;
  body: string;
  text: string; // plain text
  charCount: number;
  imageCount: number;
  subheadings: string[];
  links: string[];
  hasVideo: boolean;
  hasFAQ: boolean;
  platform: Platform;
}

export interface AnalysisResult {
  content: ExtractedContent;
  mainKeyword: string;
  kwCount: number;
  kwDensity: number;
  compoundKeywords: { keyword: string; count: number }[];
  scores: ScoreResult;
  patterns: DetectedPattern;
}

export interface DetectedPattern {
  tone: string;
  firstPerson: boolean;
  avgSentenceLength: number;
  structureType: string;
  hasDefinition: boolean;
  hasComparison: boolean;
  hasNumberedList: boolean;
  hasCTA: boolean;
}

// ─── Writing Request ───

export interface WriteRequest {
  sourceUrl?: string;
  sourceText?: string;
  targetKeyword: string;
  category: Category;
  platform: Platform;
  additionalKeywords?: string[];
  tone?: string;
}

export interface WriteResult {
  title: string;
  content: string; // HTML formatted
  plainText: string;
  scores: ScoreResult;
  charCount: number;
  kwCount: number;
  imageSlots: number; // recommended image positions
  suggestions: string[];
}

// ─── Reference Learning ───

export interface Reference {
  id: string;
  url: string;
  category: Category;
  analysis: AnalysisResult;
  addedAt: string;
}

export interface PatternDB {
  category: Category;
  totalReferences: number;
  avgCharCount: number;
  avgKwRepeat: number;
  avgImageCount: number;
  avgScore: ScoreResult;
  bestPatterns: DetectedPattern[];
  updatedAt: string;
}

// ─── Tracking ───

export interface TrackedPost {
  id: string;
  url: string;
  title: string;
  keyword: string;
  category: Category;
  platform: Platform;
  publishedAt: string;
  scores: ScoreResult;
  rankings: RankingRecord[];
  views: ViewRecord[];
  feedbacks: FeedbackItem[];
}

export interface RankingRecord {
  date: string;
  position: number;
  keyword: string;
}

export interface ViewRecord {
  date: string;
  views: number;
  likes: number;
  comments: number;
}

// ─── Feedback ───

export type FeedbackType = "kw_density" | "image" | "structure" | "geo_aeo" | "new_post";

export interface FeedbackItem {
  id: string;
  postId: string;
  type: FeedbackType;
  triggerDay: number; // +1, +3, +7, +30
  title: string;
  description: string;
  before?: string;
  after?: string;
  applied: boolean;
  createdAt: string;
}

// ─── Settings ───

export interface UserSettings {
  apiKey: string;
  aiProvider: "claude" | "gpt";
  obsidianEnabled: boolean;
  obsidianApiUrl?: string;
  naverBlogId?: string;
  notifications: {
    rankingChange: boolean;
    feedbackReady: boolean;
    weeklyReport: boolean;
  };
}

// ─── Messages (Chrome Extension) ───

export type MessageType =
  | "EXTRACT_CONTENT"
  | "EXTRACT_RESULT"
  | "OPEN_SIDEPANEL"
  | "COPY_TO_CLIPBOARD"
  | "GET_SETTINGS"
  | "SAVE_SETTINGS";

export interface ChromeMessage {
  type: MessageType;
  payload?: unknown;
}
