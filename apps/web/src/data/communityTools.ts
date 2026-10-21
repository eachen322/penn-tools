// Community tools shown on the PennTools dashboard.
//
// These are apps built by Penn students that live outside this repo, so they
// link out. Tools registered in the monorepo (tools/*) come from /api/tools and
// appear in the dashboard's "BETA LLM Tools" section instead.

export interface CommunityTool {
  id: string;
  title: string;
  description: string;
  category: string;
  builder: string;
  url: string;
  /** Extra search terms, such as the names of apps bundled under one link. */
  keywords?: string[];
}

/** Display order of categories on the dashboard. */
export const CATEGORY_ORDER = ["Academics", "Recruiting", "Productivity"];

export const communityTools: CommunityTool[] = [
  {
    id: "quakercal",
    title: "QuakerCal",
    description:
      "Turn your Wharton MBA Current Enrollment screenshots into a calendar file, with quarter dates, breaks and schedule-switch days handled for you.",
    category: "Academics",
    builder: "Jiaqi Song",
    url: "https://quakercal.vercel.app/",
    keywords: ["calendar", "schedule", "classes", "courses", "enrollment", "ics"],
  },
  {
    id: "mba-tech-internships",
    title: "MBA Tech Internships",
    description:
      "A curated list of Summer 2027 MBA internships in tech across product management, strategy, product marketing and finance.",
    category: "Recruiting",
    builder: "Trevor Dohm",
    url: "https://github.com/TrevorDohm/MBA-Tech-Internships-2027",
    keywords: ["jobs", "internship", "summer", "product", "pm", "strategy", "listings"],
  },
  {
    id: "pm-zero-to-one",
    title: "PM Zero to One",
    description:
      "Learn the craft of product management, from problem framing and discovery to metrics and GTM, with interview frameworks and worked examples.",
    category: "Recruiting",
    builder: "Vatsal Khemani",
    url: "https://pmzerotoone.netlify.app/",
    keywords: ["product management", "pm", "interview", "frameworks", "case", "learning"],
  },
  {
    id: "zitvar-apps",
    title: "Zitvar.ai Apps",
    description:
      "A collection of apps: Defluffer, ROIC Tree Generator, Amtraker, ThankYouGPT and 1000Words.",
    category: "Productivity",
    builder: "Itay Zitvar",
    url: "https://www.zitvar.ai/",
    keywords: [
      "defluffer", "linkedin", "roic", "finance", "valuation", "amtraker", "amtrak",
      "train", "fares", "thankyougpt", "thank you notes", "networking", "1000words",
      "language learning",
    ],
  },
  {
    id: "stactab",
    title: "StacTab",
    description:
      "A Chrome extension that groups tabs by domain, sleeps inactive tabs, removes duplicates and archives sessions to a searchable vault.",
    category: "Productivity",
    builder: "Manan",
    url: "https://chromewebstore.google.com/detail/stactab/hdfcdcoogjkdogmnhhopkekanpldoefh",
    keywords: ["chrome", "extension", "tabs", "browser", "focus"],
  },
];
