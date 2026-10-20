// Sample data for the Playground demos. Made up for the demo; not real Penn
// resources or courses.

export interface SampleResource {
  title: string;
  description: string;
}

export const SAMPLE_RESOURCES: SampleResource[] = [
  { title: "Career coaching office hours", description: "One-on-one sessions on resumes, recruiting timelines and interview prep." },
  { title: "Alumni mentorship program", description: "Matches students with alumni mentors in their target industry." },
  { title: "Quantitative methods tutoring", description: "Weekly help with statistics, finance math and spreadsheet modeling." },
  { title: "Student wellness counseling", description: "Confidential counseling for stress, burnout and personal concerns." },
  { title: "Student investment club", description: "Pitches stocks, manages a paper portfolio and hosts investor talks." },
  { title: "Startup incubator", description: "Workspace, small grants and founder workshops for student ventures." },
  { title: "Library research help", description: "Librarians help find company data, industry reports and academic papers." },
  { title: "Public speaking workshop", description: "Practice presentations and get feedback on delivery and slides." },
];

export const SAMPLE_SYLLABUS = `Negotiations (sample syllabus), Fall 2026

Week 1 (Sep 1): Course overview. Read: "Getting to Yes", chapters 1-3.
Week 3 (Sep 15): Planning document for the first role-play, due before class.
Week 5 (Sep 29): Case write-up 1, 2 pages, due Oct 2.
Week 8 (Oct 20): Midterm exam, in class.
Week 10: Read the "Multi-party negotiation" course pack article.
Week 12 (Nov 17): Team negotiation project report due.
Final exam: Dec 10.`;
