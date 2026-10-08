import aggregates from './demo-analytics-aggregates.json';

export type LikertQuestion = {
  id: string;
  label: string;
  category: string;
  categoryLabel: string;
  responses: number;
  average: number;
  distribution: { score: number; count: number; percent: number }[];
  positivePercent: number;
};

export type ParticipantGroup = {
  label: string;
  respondents: number;
  average: number;
  positivePercent: number;
  questionAverages: { questionId: string; average: number; responses: number }[];
};

export type DemoAnalyticsData = {
  respondents: number;
  questionCount: number;
  overallAverage: number;
  overallPositivePercent: number;
  questions: LikertQuestion[];
  categories: { id: string; label: string }[];
  participantGroups: {
    roles: ParticipantGroup[];
    projects: ParticipantGroup[];
  };
  insights: {
    strongest: LikertQuestion;
    improvement: LikertQuestion;
    readinessAverage: number;
    satisfactionAverage: number;
    roleLeader: ParticipantGroup | null;
    roleFocus: ParticipantGroup | null;
    projectLeader: ParticipantGroup | null;
    projectFocus: ParticipantGroup | null;
  };
};

export async function getDemoAnalyticsData(): Promise<DemoAnalyticsData> {
  return aggregates;
}
