export interface CrawlResult {
  url: string;
  domain: string;
  isSSR: boolean;
  htmlContentLength: number;
  hasJsFramework: string | null;
  title: string | null;
  description: string | null;
  ogImage: string | null;
  ogTitle: string | null;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  sitemapUrls: number;
  canonicalUrl: string | null;
  hasJsonLd: boolean;
  jsonLdTypes: string[];
  indexablePages: string[];
  responseTimeMs: number;
  contentType: string;
  isHttps: boolean;
  hasViewportMeta: boolean;
  platform: string | null;
  platformEvidence: string[];
  hasAgentJson: boolean;
  hasLlmsTxt: boolean;
  internalLinks: string[];
  externalLinks: string[];
  headings: { level: number; text: string }[];
  images: { src: string; alt: string | null }[];
  imagesWithoutAlt: number;
}

export interface ScoreCard {
  category: string;
  grade: string;
  score: number;
  findings: string[];
}

export interface SWOT {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface AuditNarrative {
  headline: string;
  whatsWorking: string;
  whatsBroken: string;
  biggestOpportunity: string;
}

export interface QuestionnaireAnswers {
  goodMonth: string;
  customerChannels: string[];
  desiredFeeling: string;
  hiddenStory: string;
  ambitionLevel: "fix" | "level-up" | "blow-minds";
}

export interface SiteAudit {
  id: string;
  domain: string;
  crawl: CrawlResult;
  scores: ScoreCard[];
  swot: SWOT;
  narrative: AuditNarrative;
  questionnaire: QuestionnaireAnswers | null;
  createdAt: string;
}
