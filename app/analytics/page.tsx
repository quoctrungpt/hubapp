'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  UsersRound,
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

type SurveyRow = Record<string, unknown>;

type AnswerCount = {
  answer: string;
  count: number;
  fullAnswer: string;
};

type QuestionSummary = {
  key: string;
  label: string;
  total: number;
  answered: number;
  skipped: number;
  completionRate: number;
  answers: AnswerCount[];
};

type LikertAnswer = {
  label: string;
  score: number;
  count: number;
  variants: string[];
};

type LikertSummary = {
  key: string;
  label: string;
  answered: number;
  average: number;
  distribution: { score: number; label: string; count: number; percent: number }[];
  answers: LikertAnswer[];
};

type LikertQuestionGroup = {
  id: string;
  label: string;
  questions: LikertSummary[];
};

type DemographicSummary = {
  key: string;
  label: string;
  groups: { name: string; count: number; average: number | null }[];
};

const CHART_COLORS = ['#34d399', '#60a5fa', '#fbbf24', '#f87171', '#c084fc', '#2dd4bf'];
const LIKERT_LABELS: Record<number, string> = {
  1: 'Rất tiêu cực',
  2: 'Tiêu cực',
  3: 'Trung lập',
  4: 'Tích cực',
  5: 'Rất tích cực',
};
const QUESTION_STOP_WORDS = new Set([
  'anh', 'chi', 'ban', 'vui', 'hay', 'muc', 'do', 'danh', 'gia', 've', 'cua', 'minh',
  'toi', 'la', 'co', 'the', 'sau', 'truoc', 'khoa', 'hoc', 'so', 'voi', 'va', 'cau',
  'hoi', 'xin', 'cho', 'biet', 'rat', 'mot', 'nhung', 'cac', 'duoc', 'khi', 'tham',
  'please', 'would', 'could', 'your', 'you', 'the', 'and', 'how', 'what', 'which',
  'are', 'was', 'were', 'have', 'has', 'from', 'with', 'about', 'rate', 'rating', 'level',
]);
const LIKERT_COLORS: Record<number, string> = {
  1: '#f87171',
  2: '#fb923c',
  3: '#fbbf24',
  4: '#60a5fa',
  5: '#34d399',
};
const EXCLUDED_COLUMN_NAMES = [
  /^id$/i,
  /(^|_)(created|updated|deleted)_at$/i,
  /timestamp/i,
  /email|e-mail|phone|mobile|số điện thoại|điện thoại/i,
  /full.?name|họ và tên|họ tên|tên người/i,
  /^(uuid|user_?id|respondent_?id)$/i,
];

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAnswerText(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const answer = value.replace(/\s+/g, ' ').trim();
    return answer || null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function isQuestionColumn(key: string): boolean {
  return !EXCLUDED_COLUMN_NAMES.some((pattern) => pattern.test(key));
}

function isDemographicColumn(key: string): boolean {
  const normalizedKey = normalizeText(key);
  return /\b(age|tuoi|nam sinh|birth year|gender|sex|gioi tinh|location|province|city|region|dia chi|tinh thanh|khu vuc|vung mien|education|hoc van|trinh do|occupation|job|nghe nghiep|chuc vu|organization|don vi|dan toc|ethnicity|marital|hon nhan|cohort|nhom tuoi)\b/.test(
    normalizedKey
  );
}

function normalizeDemographicAnswer(key: string, answer: string): string {
  const normalizedKey = normalizeText(key);
  const normalizedAnswer = normalizeText(answer);

  if (/\b(nam sinh|birth year)\b/.test(normalizedKey)) {
    const year = Number(normalizedAnswer);
    if (Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear()) {
      const decade = Math.floor(year / 10) * 10;
      return year < 1980 ? 'Sinh trước 1980' : `Sinh ${decade}–${decade + 9}`;
    }
  }

  if (/\b(age|tuoi)\b/.test(normalizedKey)) {
    const numericValue = Number(normalizedAnswer);
    if (Number.isFinite(numericValue) && numericValue >= 10 && numericValue <= 100) {
      if (numericValue < 18) return 'Dưới 18 tuổi';
      if (numericValue < 25) return '18–24 tuổi';
      if (numericValue < 35) return '25–34 tuổi';
      if (numericValue < 45) return '35–44 tuổi';
      if (numericValue < 55) return '45–54 tuổi';
      return '55 tuổi trở lên';
    }
  }

  if (/\b(gender|sex|gioi tinh)\b/.test(normalizedKey)) {
    if (/\b(nam|male|man)\b/.test(normalizedAnswer)) return 'Nam';
    if (/\b(nu|female|woman)\b/.test(normalizedAnswer)) return 'Nữ';
  }

  return answer;
}

function scoreLikertAnswer(value: unknown): number | null {
  const answer = getAnswerText(value);
  if (!answer) return null;

  const numeric = Number(answer.replace(',', '.'));
  if (Number.isFinite(numeric) && /^(?:[1-5]|[1-5]\.0)$/.test(answer.replace(',', '.'))) {
    return Math.round(numeric);
  }

  const normalized = normalizeText(answer);
  if (normalized === 'kho') return 2;
  if (
    /\b(hoan toan khong|rat khong|cuc ky khong|khong dong y|rat kho|rat khong hai long|rat khong tu tin|chua san sang|not at all|strongly disagree|very dissatisfied|very difficult|very unlikely)\b/.test(
      normalized
    )
  ) {
    return 1;
  }
  if (
    /\b(khong hai long|khong tu tin|khong san sang|chua san sang|chua chac chan|khong chac chan|chua hieu ro|khong dong tinh|khong dong y|khong hieu|khong de|kho khan|khong phu hop|dissatisfied|disagree|difficult|unlikely|poor|unsure)\b/.test(
      normalized
    )
  ) {
    return 2;
  }
  if (/\b(trung lap|binh thuong|tam duoc|khong y kien|khong co y kien|neutral|neither|average)\b/.test(normalized)) {
    return 3;
  }
  if (
    /\b(rat hai long|rat tu tin|rat san sang|rat dong y|rat de|rat huu ich|strongly agree|very satisfied|very confident|very easy|very useful|excellent)\b/.test(
      normalized
    )
  ) {
    return 5;
  }
  if (
    /\b(hai long|tu tin|san sang|chac chan|dong tinh|dong y|de hieu|de dang|de|phu hop|tot|satisfied|agree|confident|easy|useful|good|likely)\b/.test(
      normalized
    )
  ) {
    return 4;
  }

  return null;
}

function analyzeLikert(rows: SurveyRow[]): LikertSummary[] {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
    .filter((key) => isQuestionColumn(key) && !isDemographicColumn(key));

  return keys
    .map((key) => {
      const counts = new Map<number, { count: number; variants: Set<string> }>();
      let scoreTotal = 0;
      let answered = 0;

      for (const row of rows) {
        const value = getAnswerText(row[key]);
        const score = scoreLikertAnswer(value);
        if (value === null || score === null) continue;

        answered += 1;
        scoreTotal += score;
        const existing = counts.get(score) ?? { count: 0, variants: new Set<string>() };
        existing.count += 1;
        existing.variants.add(value);
        counts.set(score, existing);
      }

      const answers = Array.from(counts, ([score, result]) => ({
        label: LIKERT_LABELS[score],
        score,
        count: result.count,
        variants: [...result.variants].sort((a, b) => a.localeCompare(b, 'vi')),
      })).sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, 'vi'));

      if (answered === 0) return null;

      const distribution = [1, 2, 3, 4, 5].map((score) => {
        const count = counts.get(score)?.count ?? 0;
        return {
          score,
          label: LIKERT_LABELS[score],
          count,
          percent: Math.round((count / answered) * 100),
        };
      });

      return {
        key,
        label: getQuestionLabel(key),
        answered,
        average: scoreTotal / answered,
        distribution,
        answers,
      };
    })
    .filter((question): question is LikertSummary => question !== null)
    .sort((a, b) => a.key.localeCompare(b.key, 'vi', { numeric: true }));
}

function analyzeDemographics(
  rows: SurveyRow[],
  likertQuestions: LikertSummary[],
  selectedLikertQuestions: LikertSummary[]
): DemographicSummary[] {
  const likertKeys = new Set(likertQuestions.map((question) => question.key));
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter(
    (key) =>
      isQuestionColumn(key) &&
      !likertKeys.has(key) &&
      (isDemographicColumn(key) || isLowCardinalityGroup(rows, key))
  );

  return keys
    .map((key) => {
      const counts = new Map<string, { count: number; scoreTotal: number; scoreCount: number }>();

      for (const row of rows) {
        const rawGroup = getAnswerText(row[key]);
        if (!rawGroup) continue;
        const group = normalizeDemographicAnswer(key, rawGroup);
        const current = counts.get(group) ?? { count: 0, scoreTotal: 0, scoreCount: 0 };
        current.count += 1;
        const scores = selectedLikertQuestions
          .map((question) => scoreLikertAnswer(row[question.key]))
          .filter((score): score is number => score !== null);
        if (scores.length > 0) {
          current.scoreTotal += scores.reduce((sum, score) => sum + score, 0) / scores.length;
          current.scoreCount += 1;
        }
        counts.set(group, current);
      }

      const groups = Array.from(counts, ([name, group]) => ({
        name,
        count: group.count,
        average: group.scoreCount > 0 ? group.scoreTotal / group.scoreCount : null,
      }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'))
        .slice(0, 10);

      return { key, label: getQuestionLabel(key), groups };
    })
    .filter((dimension) => dimension.groups.length > 0)
}

function isLowCardinalityGroup(rows: SurveyRow[], key: string): boolean {
  const normalizedKey = normalizeText(key);
  if (/\b(email|phone|mobile|full name|ho ten|dien thoai|ma so|uuid|user id)\b/.test(normalizedKey)) {
    return false;
  }

  const answers = rows
    .map((row) => getAnswerText(row[key]))
    .filter((answer): answer is string => answer !== null);
  if (answers.length < 3) return false;

  const uniqueAnswers = new Set(answers.map((answer) => normalizeText(answer)));
  const maxCategories = Math.min(12, Math.max(3, Math.ceil(Math.sqrt(answers.length) + 2)));
  const averageLength =
    answers.reduce((sum, answer) => sum + answer.length, 0) / answers.length;

  return (
    uniqueAnswers.size >= 2 &&
    uniqueAnswers.size <= maxCategories &&
    uniqueAnswers.size / answers.length <= 0.4 &&
    averageLength <= 48
  );
}

function getQuestionLabel(key: string): string {
  return key
    .replace(/^\s*(câu|cau|question|q)\s*\d+\s*[:.)-]?\s*/i, '')
    .replace(/[_]+/g, ' ')
    .trim() || key;
}

function getQuestionTokens(label: string): Set<string> {
  return new Set(
    normalizeText(label)
      .replace(/^\s*(cau|question|q)\s*\d+\s*/, '')
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1 && !QUESTION_STOP_WORDS.has(token))
  );
}

function questionSimilarity(left: string, right: string): number {
  const leftTokens = getQuestionTokens(left);
  const rightTokens = getQuestionTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  const shared = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const smallerSetRatio = shared / Math.min(leftTokens.size, rightTokens.size);
  const jaccard = shared / union;

  return shared >= 2 && (jaccard >= 0.28 || smallerSetRatio >= 0.65) ? jaccard : 0;
}

function groupSimilarLikertQuestions(questions: LikertSummary[]): LikertQuestionGroup[] {
  const groups: LikertQuestionGroup[] = [];

  for (const question of questions) {
    let bestGroup: LikertQuestionGroup | null = null;
    let bestSimilarity = 0;

    for (const group of groups) {
      const similarity = Math.max(
        ...group.questions.map((member) => questionSimilarity(question.label, member.label))
      );
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestGroup = group;
      }
    }

    if (bestGroup && bestSimilarity > 0) {
      bestGroup.questions.push(question);
      bestGroup.label = getShortLabel(bestGroup.questions[0].label, 100);
    } else {
      groups.push({
        id: question.key,
        label: getShortLabel(question.label, 100),
        questions: [question],
      });
    }
  }

  return groups;
}

function getShortLabel(value: string, maxLength = 56): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function analyzeRows(rows: SurveyRow[]): QuestionSummary[] {
  if (rows.length === 0) return [];

  const questionKeys = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row).filter(isQuestionColumn)))
  );

  return questionKeys
    .map((key) => {
      const counts = new Map<string, number>();
      let answered = 0;

      for (const row of rows) {
        const answer = getAnswerText(row[key]);
        if (!answer) continue;

        answered += 1;
        counts.set(answer, (counts.get(answer) ?? 0) + 1);
      }

      const sortedAnswers = Array.from(counts, ([answer, count]) => ({ answer, count }))
        .sort((a, b) => b.count - a.count || a.answer.localeCompare(b.answer, 'vi'));
      const visibleAnswers = sortedAnswers.slice(0, 7).map(({ answer, count }) => ({
        answer: getShortLabel(answer, 48),
        count,
        fullAnswer: answer,
      }));
      const otherCount = sortedAnswers.slice(7).reduce((sum, item) => sum + item.count, 0);

      if (otherCount > 0) {
        visibleAnswers.push({
          answer: 'Các câu trả lời khác',
          count: otherCount,
          fullAnswer: `${sortedAnswers.length - 7} lựa chọn khác`,
        });
      }

      return {
        key,
        label: getQuestionLabel(key),
        total: rows.length,
        answered,
        skipped: rows.length - answered,
        completionRate: Math.round((answered / rows.length) * 100),
        answers: visibleAnswers,
      };
    })
    .filter((question) => question.answered > 0)
    .sort((a, b) => a.key.localeCompare(b.key, 'vi', { numeric: true }));
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141414] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-neutral-400">{label}</p>
        <span className="rounded-xl bg-emerald-400/10 p-2 text-emerald-300">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedQuestionKey, setSelectedQuestionKey] = useState('');
  const [selectedLikertKey, setSelectedLikertKey] = useState('');
  const [selectedLikertGroupId, setSelectedLikertGroupId] = useState('');
  const [selectedDimensionKey, setSelectedDimensionKey] = useState('');
  const [activeView, setActiveView] = useState<'overview' | 'demographics' | 'likert'>('overview');

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setLoadError(null);

      if (!isSupabaseConfigured) {
        setLoadError(
          'Chưa cấu hình Supabase. Hãy kiểm tra NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY trong .env.local.'
        );
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await getSupabaseClient().from('test_db_1').select('*');

        if (error) {
          console.error('Lỗi tải dữ liệu khảo sát từ Supabase:', error);
          if (!cancelled) {
            setLoadError(
              'Không thể tải dữ liệu khảo sát. Hãy kiểm tra bảng test_db_1, quyền truy cập (RLS) và kết nối Supabase.'
            );
          }
          return;
        }

        if (!cancelled) setRows((data ?? []) as SurveyRow[]);
      } catch (error) {
        console.error('Lỗi tải dữ liệu khảo sát:', error);
        if (!cancelled) setLoadError('Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử tải lại.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const questions = useMemo(() => analyzeRows(rows), [rows]);
  const likertQuestions = useMemo(() => analyzeLikert(rows), [rows]);
  const likertGroups = useMemo(() => groupSimilarLikertQuestions(likertQuestions), [likertQuestions]);
  const selectedLikertQuestion =
    likertQuestions.find((question) => question.key === selectedLikertKey) ?? likertQuestions[0];
  const selectedLikertGroup =
    likertGroups.find((group) => group.id === selectedLikertGroupId) ?? likertGroups[0];
  const demographicDimensions = useMemo(
    () => analyzeDemographics(rows, likertQuestions, selectedLikertGroup?.questions ?? []),
    [rows, likertQuestions, selectedLikertGroup]
  );
  const selectedDimension =
    demographicDimensions.find((dimension) => dimension.key === selectedDimensionKey) ??
    demographicDimensions[0];
  const selectedQuestion =
    questions.find((question) => question.key === selectedQuestionKey) ?? questions[0];
  const overviewData = questions
    .map((question) => ({
      question: getShortLabel(question.label, 38),
      fullQuestion: question.label,
      completionRate: question.completionRate,
      answered: question.answered,
      skipped: question.skipped,
      total: question.total,
    }))
    .sort((a, b) => a.completionRate - b.completionRate)
    .slice(0, 12);

  const averageCompletion = questions.length
    ? Math.round(
        questions.reduce((sum, question) => sum + question.completionRate, 0) / questions.length
      )
    : 0;
  const selectedTopAnswer = selectedQuestion?.answers[0];
  const lowestCompletionQuestion = questions.reduce<QuestionSummary | null>(
    (lowest, question) =>
      !lowest || question.completionRate < lowest.completionRate ? question : lowest,
    null
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
              HubApp · Dashboard
            </p>
            <h1 className="text-3xl font-bold sm:text-4xl">Phân tích khảo sát</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Tổng quan phản hồi và phân bố câu trả lời theo từng câu hỏi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-[#171717] px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Tải lại dữ liệu
          </button>
        </header>

        {loadError ? (
          <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/5 px-6 text-center">
            <AlertCircle className="mb-3 text-amber-300" size={32} />
            <h2 className="text-lg font-semibold">Chưa thể hiển thị phân tích</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">{loadError}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="mt-5 rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-black transition hover:bg-amber-200"
            >
              Thử lại
            </button>
          </section>
        ) : isLoading ? (
          <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#141414] text-neutral-400">
            <Loader2 className="mb-3 animate-spin text-emerald-300" size={32} />
            <p>Đang tải dữ liệu khảo sát…</p>
          </section>
        ) : rows.length === 0 ? (
          <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#141414] px-6 text-center">
            <ClipboardList className="mb-3 text-neutral-500" size={34} />
            <h2 className="text-lg font-semibold">Chưa có phản hồi khảo sát</h2>
            <p className="mt-2 text-sm text-neutral-400">
              Bảng test_db_1 đã kết nối nhưng chưa có dòng dữ liệu để phân tích.
            </p>
          </section>
        ) : questions.length === 0 ? (
          <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#141414] px-6 text-center">
            <AlertCircle className="mb-3 text-amber-300" size={32} />
            <h2 className="text-lg font-semibold">Không tìm thấy cột câu trả lời</h2>
            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              Dữ liệu có {rows.length} phản hồi nhưng không có cột nào chứa câu trả lời. Hãy kiểm tra
              cấu trúc bảng test_db_1.
            </p>
          </section>
        ) : (
          <>
            <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-4" aria-label="Phân tích khảo sát">
              {[
                { id: 'overview', label: 'Tổng quan' },
                { id: 'demographics', label: 'Nhân khẩu học' },
                { id: 'likert', label: 'Thang Likert & đánh giá' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveView(tab.id as typeof activeView)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    activeView === tab.id
                      ? 'bg-emerald-400 text-[#06251c]'
                      : 'bg-[#171717] text-neutral-300 hover:bg-[#222]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {activeView === 'overview' && (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Số phản hồi"
                value={rows.length.toLocaleString('vi-VN')}
                detail="Tổng số dòng đọc được từ bảng khảo sát"
                icon={<UsersRound size={19} />}
              />
              <MetricCard
                label="Câu hỏi có dữ liệu"
                value={questions.length.toLocaleString('vi-VN')}
                detail="Các cột có ít nhất một câu trả lời"
                icon={<ClipboardList size={19} />}
              />
              <MetricCard
                label="Tỷ lệ hoàn thành trung bình"
                value={`${averageCompletion}%`}
                detail="Tỷ lệ câu trả lời có dữ liệu trên toàn bộ câu hỏi"
                icon={<CheckCircle2 size={19} />}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
              <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-bold">Mức độ hoàn thành theo câu hỏi</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Tỷ lệ đã trả lời trên tổng số {rows.length.toLocaleString('vi-VN')} phản hồi
                    {questions.length > 12 ? ' · hiển thị 12 câu hỏi thấp nhất' : ''}
                  </p>
                </div>
                <div style={{ height: Math.max(300, overviewData.length * 48) }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={overviewData}
                      layout="vertical"
                      margin={{ top: 4, right: 18, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid stroke="#292929" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(value: number) => `${value}%`}
                        stroke="#737373"
                        tick={{ fill: '#a3a3a3', fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="question"
                        width={150}
                        stroke="#737373"
                        tick={{ fill: '#d4d4d4', fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ fill: '#ffffff0a' }}
                        contentStyle={{
                          background: '#171717',
                          border: '1px solid #333',
                          borderRadius: 12,
                          color: '#fff',
                        }}
                        formatter={(_value, _name, item) => {
                          const payload = item.payload as (typeof overviewData)[number];
                          return [
                            `${payload.completionRate}% · ${payload.answered}/${payload.total} đã trả lời · ${payload.skipped} bỏ trống`,
                            payload.fullQuestion,
                          ];
                        }}
                      />
                      <Bar
                        dataKey="completionRate"
                        name="Tỷ lệ trả lời"
                        fill="#34d399"
                        radius={[0, 6, 6, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-emerald-400/15 bg-linear-to-br from-emerald-400/10 to-[#141414] p-5 sm:p-6">
                  <h2 className="text-lg font-bold">Điểm cần chú ý</h2>
                  {lowestCompletionQuestion ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                        Câu có tỷ lệ phản hồi thấp nhất
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-100">
                        {lowestCompletionQuestion.label}
                      </p>
                      <p className="mt-3 text-2xl font-bold text-emerald-300">
                        {lowestCompletionQuestion.completionRate}%
                      </p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {lowestCompletionQuestion.answered} câu trả lời ·{' '}
                        {lowestCompletionQuestion.skipped} lượt bỏ trống
                      </p>
                    </div>
                  ) : null}
                </div>
                {selectedQuestion && selectedTopAnswer ? (
                  <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Lựa chọn phổ biến nhất
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">
                      {selectedQuestion.label}
                    </p>
                    <p className="mt-4 wrap-break-word text-lg font-bold text-white">
                      {selectedTopAnswer.fullAnswer}
                    </p>
                    <p className="mt-2 text-sm text-emerald-300">
                      {selectedTopAnswer.count} lượt chọn (
                      {Math.round((selectedTopAnswer.count / selectedQuestion.answered) * 100)}%)
                    </p>
                  </div>
                ) : null}
              </aside>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Phân bố câu trả lời</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Chọn câu hỏi để xem số lượt và tỷ lệ của từng phương án.
                  </p>
                </div>
                <label className="w-full sm:max-w-xl">
                  <span className="mb-2 block text-xs font-medium text-neutral-400">Câu hỏi</span>
                  <select
                    value={selectedQuestion?.key ?? ''}
                    onChange={(event) => setSelectedQuestionKey(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#202020] px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-300"
                  >
                    {questions.map((question) => (
                      <option key={question.key} value={question.key}>
                        {question.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedQuestion ? (
                <div className="mt-6">
                  <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <span className="text-neutral-300">
                      Đã trả lời: <strong className="text-white">{selectedQuestion.answered}</strong>
                    </span>
                    <span className="text-neutral-300">
                      Bỏ trống: <strong className="text-white">{selectedQuestion.skipped}</strong>
                    </span>
                    <span className="text-neutral-300">
                      Tỷ lệ trả lời:{' '}
                      <strong className="text-emerald-300">{selectedQuestion.completionRate}%</strong>
                    </span>
                  </div>
                  <div
                    style={{ height: Math.max(280, selectedQuestion.answers.length * 54) }}
                    className="w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={selectedQuestion.answers}
                        layout="vertical"
                        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                      >
                        <CartesianGrid stroke="#292929" horizontal={false} />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          stroke="#737373"
                          tick={{ fill: '#a3a3a3', fontSize: 12 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="answer"
                          width={180}
                          stroke="#737373"
                          tick={{ fill: '#d4d4d4', fontSize: 11 }}
                        />
                        <Tooltip
                          cursor={{ fill: '#ffffff0a' }}
                          contentStyle={{
                            background: '#171717',
                            border: '1px solid #333',
                            borderRadius: 12,
                            color: '#fff',
                          }}
                          formatter={(value, _name, item) => {
                            const payload = item.payload as AnswerCount;
                            const percentage = Math.round(
                              ((Number(value) || 0) / selectedQuestion.answered) * 100
                            );
                            return [`${value} lượt (${percentage}%)`, payload.fullAnswer];
                          }}
                        />
                        <Bar dataKey="count" name="Số lượt" radius={[0, 6, 6, 0]} barSize={24}>
                          {selectedQuestion.answers.map((answer, index) => (
                            <Cell
                              key={`${answer.fullAnswer}-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {selectedQuestion.answers.length >= 8 ? (
                    <p className="mt-3 text-xs text-neutral-500">
                      Biểu đồ hiển thị tối đa 7 lựa chọn phổ biến nhất; các lựa chọn còn lại được gộp
                      vào “Các câu trả lời khác”.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
              </>
            )}

            {activeView === 'demographics' && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Phân tích theo nhóm nhân khẩu học</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    So sánh số lượng người tham gia và điểm Likert trung bình giữa các nhóm.
                  </p>
                </div>
                {demographicDimensions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#141414] p-8 text-center">
                    <UsersRound className="mx-auto mb-3 text-neutral-500" size={32} />
                    <h3 className="font-semibold">Chưa nhận diện được cột nhân khẩu học</h3>
                    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                      Dashboard tự nhận diện theo tên cột nhân khẩu học hoặc các cột phân loại có ít
                      nhóm giá trị. Hãy kiểm tra tiêu đề và dữ liệu trong bảng test_db_1; cột email,
                      số điện thoại và câu trả lời Likert sẽ không được dùng làm nhóm.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <label>
                        <span className="mb-2 block text-xs font-medium text-neutral-400">
                          Chọn nhóm nhân khẩu học
                        </span>
                        <select
                          value={selectedDimension?.key ?? ''}
                          onChange={(event) => setSelectedDimensionKey(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#202020] px-3 py-3 text-sm text-white outline-none focus:border-emerald-300"
                        >
                          {demographicDimensions.map((dimension) => (
                            <option key={dimension.key} value={dimension.key}>
                              {dimension.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="mb-2 block text-xs font-medium text-neutral-400">
                          Nhóm câu hỏi tương tự dùng để so sánh
                        </span>
                        <select
                          value={selectedLikertGroup?.id ?? ''}
                          onChange={(event) => setSelectedLikertGroupId(event.target.value)}
                          disabled={likertGroups.length === 0}
                          className="w-full rounded-xl border border-white/10 bg-[#202020] px-3 py-3 text-sm text-white outline-none focus:border-emerald-300 disabled:opacity-50"
                        >
                          {likertGroups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.label}
                              {group.questions.length > 1 ? ` (${group.questions.length} câu)` : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {selectedLikertGroup ? (
                      <p className="rounded-xl border border-white/5 bg-white/3 px-4 py-3 text-xs leading-5 text-neutral-400">
                        Tự ghép {selectedLikertGroup.questions.length} câu có từ khóa nội dung chung.
                        Mỗi người được tính điểm trung bình từ các câu trong nhóm mà họ đã trả lời.
                        {selectedLikertGroup.questions.length > 1 ? (
                          <span className="mt-1 block text-neutral-300">
                            {selectedLikertGroup.questions.map((question) => question.label).join(' · ')}
                          </span>
                        ) : null}
                      </p>
                    ) : null}

                    {selectedDimension ? (
                      <>
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
                          <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
                            <h3 className="font-bold">
                              {selectedDimension.label}: quy mô nhóm và điểm trung bình
                            </h3>
                            <p className="mt-1 text-xs text-neutral-500">
                              Điểm Likert trên thang 1–5, gộp theo câu hỏi tương tự; nhóm thiếu câu
                              trả lời được hiển thị là N/A.
                            </p>
                            <div
                              style={{ height: Math.max(300, selectedDimension.groups.length * 54) }}
                              className="mt-4 w-full"
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                  data={selectedDimension.groups}
                                  layout="vertical"
                                  margin={{ top: 4, right: 25, left: 8, bottom: 4 }}
                                >
                                  <CartesianGrid stroke="#292929" horizontal={false} />
                                  <XAxis
                                    xAxisId="count"
                                    type="number"
                                    allowDecimals={false}
                                    stroke="#737373"
                                    tick={{ fill: '#a3a3a3', fontSize: 11 }}
                                  />
                                  <XAxis
                                    xAxisId="score"
                                    type="number"
                                    domain={[1, 5]}
                                    orientation="top"
                                    hide
                                  />
                                  <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={150}
                                    stroke="#737373"
                                    tick={{ fill: '#d4d4d4', fontSize: 11 }}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      background: '#171717',
                                      border: '1px solid #333',
                                      borderRadius: 12,
                                      color: '#fff',
                                    }}
                                    formatter={(value, name) => [
                                      name === 'Điểm trung bình'
                                        ? Number(value).toFixed(2)
                                        : value,
                                      name,
                                    ]}
                                  />
                                  <Bar
                                    xAxisId="count"
                                    dataKey="count"
                                    name="Số người"
                                    fill="#60a5fa"
                                    radius={[0, 5, 5, 0]}
                                    barSize={20}
                                  />
                                  <Line
                                    xAxisId="score"
                                    dataKey="average"
                                    name="Điểm trung bình"
                                    stroke="#34d399"
                                    strokeWidth={2}
                                    connectNulls={false}
                                    dot={{ r: 4, fill: '#34d399' }}
                                  />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
                            <h3 className="font-bold">Chi tiết từng nhóm</h3>
                            <div className="mt-4 space-y-3">
                              {selectedDimension.groups.map((group) => (
                                <div
                                  key={group.name}
                                  className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 last:border-0"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{group.name}</p>
                                    <p className="text-xs text-neutral-500">
                                      {group.count} người (
                                      {Math.round((group.count / rows.length) * 100)}%)
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-sm font-bold text-emerald-300">
                                    {group.average === null ? 'N/A' : `${group.average.toFixed(2)} / 5`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-xs leading-5 text-neutral-500">
                          Đây là mô tả dữ liệu khảo sát, không khẳng định nhóm nhân khẩu học gây ra
                          khác biệt. Các nhóm nhỏ hoặc thiếu phản hồi có thể làm điểm trung bình biến
                          động mạnh.
                        </p>
                      </>
                    ) : null}
                  </>
                )}
              </section>
            )}

            {activeView === 'likert' && (
              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold">Thang Likert & đánh giá</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Quy đổi mức độ phản hồi sang thang 1–5 và xem phân bố điểm của từng câu hỏi.
                  </p>
                </div>
                {likertQuestions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#141414] p-8 text-center">
                    <BarChart3 className="mx-auto mb-3 text-neutral-500" size={32} />
                    <h3 className="font-semibold">Chưa nhận diện được câu hỏi Likert</h3>
                    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
                      Hiện hỗ trợ thang số 1–5 và các lựa chọn phổ biến như rất không đồng ý → rất
                      đồng ý, không hài lòng → rất hài lòng, không tự tin → rất tự tin. Kiểm tra
                      nhãn câu trả lời nếu dữ liệu dùng thang khác.
                    </p>
                  </div>
                ) : selectedLikertQuestion ? (
                  <>
                    <label className="block max-w-3xl">
                      <span className="mb-2 block text-xs font-medium text-neutral-400">
                        Câu hỏi Likert
                      </span>
                      <select
                        value={selectedLikertQuestion.key}
                        onChange={(event) => setSelectedLikertKey(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#202020] px-3 py-3 text-sm text-white outline-none focus:border-emerald-300"
                      >
                        {likertQuestions.map((question) => (
                          <option key={question.key} value={question.key}>
                            {question.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <MetricCard
                        label="Điểm trung bình"
                        value={`${selectedLikertQuestion.average.toFixed(2)} / 5`}
                        detail={`Từ ${selectedLikertQuestion.answered} câu trả lời hợp lệ`}
                        icon={<BarChart3 size={19} />}
                      />
                      <MetricCard
                        label="Đánh giá tổng quan"
                        value={
                          selectedLikertQuestion.average >= 4.2
                            ? 'Rất tích cực'
                            : selectedLikertQuestion.average >= 3.4
                              ? 'Tích cực'
                              : selectedLikertQuestion.average >= 2.6
                                ? 'Trung lập'
                                : selectedLikertQuestion.average >= 1.8
                                  ? 'Cần cải thiện'
                                  : 'Tiêu cực'
                        }
                        detail="Diễn giải dựa trên điểm trung bình"
                        icon={<CheckCircle2 size={19} />}
                      />
                      <MetricCard
                        label="Tích cực (4–5)"
                        value={`${Math.round(
                          (selectedLikertQuestion.distribution
                            .filter((item) => item.score >= 4)
                            .reduce((sum, item) => sum + item.count, 0) /
                            selectedLikertQuestion.answered) *
                            100
                        )}%`}
                        detail="Tỷ trọng lựa chọn tích cực"
                        icon={<CheckCircle2 size={19} />}
                      />
                      <MetricCard
                        label="Tiêu cực (1–2)"
                        value={`${Math.round(
                          (selectedLikertQuestion.distribution
                            .filter((item) => item.score <= 2)
                            .reduce((sum, item) => sum + item.count, 0) /
                            selectedLikertQuestion.answered) *
                            100
                        )}%`}
                        detail="Tỷ trọng cần theo dõi"
                        icon={<AlertCircle size={19} />}
                      />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.8fr)]">
                      <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
                        <h3 className="font-bold">Phân bố mức điểm</h3>
                        <p className="mt-1 text-sm text-neutral-400">
                          Tỷ lệ phản hồi theo mức từ 1 (tiêu cực) đến 5 (tích cực).
                        </p>
                        <div className="mt-4 h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={selectedLikertQuestion.distribution}
                              margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
                            >
                              <CartesianGrid stroke="#292929" vertical={false} />
                              <XAxis
                                dataKey="score"
                                stroke="#737373"
                                tick={{ fill: '#d4d4d4', fontSize: 12 }}
                                tickFormatter={(value) => `${value} · ${LIKERT_LABELS[Number(value)]}`}
                              />
                              <YAxis
                                allowDecimals={false}
                                stroke="#737373"
                                tick={{ fill: '#a3a3a3', fontSize: 12 }}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: '#171717',
                                  border: '1px solid #333',
                                  borderRadius: 12,
                                  color: '#fff',
                                }}
                                formatter={(value, _name, item) => {
                                  const payload = item.payload as LikertSummary['distribution'][number];
                                  return [`${value} lượt (${payload.percent}%)`, payload.label];
                                }}
                              />
                              <Bar dataKey="count" name="Số câu trả lời" radius={[6, 6, 0, 0]}>
                                {selectedLikertQuestion.distribution.map((item) => (
                                  <Cell key={item.score} fill={LIKERT_COLORS[item.score]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
                        <h3 className="font-bold">Diễn giải kết quả</h3>
                        <p className="mt-3 text-3xl font-bold text-emerald-300">
                          {selectedLikertQuestion.average.toFixed(2)} / 5
                        </p>
                        <p className="mt-3 text-sm leading-6 text-neutral-300">
                          {selectedLikertQuestion.average >= 4.2
                            ? 'Phản hồi nhìn chung rất tích cực. Nên duy trì điểm mạnh hiện tại và xem xét các góp ý còn lại.'
                            : selectedLikertQuestion.average >= 3.4
                              ? 'Đa số phản hồi có xu hướng tích cực. Có thể xem xét các nhóm điểm thấp để xác định phần cần cải thiện.'
                              : selectedLikertQuestion.average >= 2.6
                                ? 'Đánh giá ở mức trung lập. Nên xem xét phân bố từng mức và phản hồi mở để tìm nguyên nhân.'
                                : 'Điểm trung bình thấp cho thấy cần ưu tiên rà soát trải nghiệm hoặc nội dung liên quan câu hỏi này.'}
                        </p>
                        <div className="mt-6 space-y-3">
                          {selectedLikertQuestion.distribution.map((item) => (
                            <div key={item.score}>
                              <div className="mb-1 flex justify-between text-xs">
                                <span className="text-neutral-300">
                                  {item.score}. {item.label}
                                </span>
                                <span className="text-neutral-400">
                                  {item.count} ({item.percent}%)
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${item.percent}%`,
                                    backgroundColor: LIKERT_COLORS[item.score],
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-5 text-xs leading-5 text-neutral-500">
                          Điểm số được suy ra từ nhãn câu trả lời theo thứ tự mức độ. Đây là chỉ số
                          mô tả quy ước, không thay thế phân tích định tính.
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-6 xl:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
                        <h3 className="font-bold">Chuẩn hóa câu trả lời</h3>
                        <p className="mt-1 text-sm text-neutral-400">
                          Các cách trả lời khác nhau được gộp vào cùng mức điểm để so sánh.
                        </p>
                        <div className="mt-4 space-y-3">
                          {selectedLikertQuestion.answers.map((answer) => (
                            <div
                              key={answer.score}
                              className="rounded-xl border border-white/5 bg-white/3 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold">
                                  <span style={{ color: LIKERT_COLORS[answer.score] }}>
                                    Mức {answer.score}
                                  </span>{' '}
                                  · {answer.label}
                                </span>
                                <span className="shrink-0 text-xs text-neutral-400">
                                  {answer.count} lượt
                                </span>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-neutral-400">
                                {answer.variants.join(' · ')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-6">
                        <h3 className="font-bold">Tự động ghép câu hỏi tương tự</h3>
                        <p className="mt-1 text-sm text-neutral-400">
                          Ghép dựa trên từ khóa nội dung chung trong tiêu đề câu hỏi.
                        </p>
                        <div className="mt-4 max-h-105 space-y-3 overflow-y-auto pr-1">
                          {likertGroups.map((group) => (
                            <div
                              key={group.id}
                              className="rounded-xl border border-white/5 bg-white/3 p-3"
                            >
                              <p className="text-sm font-semibold text-emerald-200">
                                {group.questions.length} câu · {group.label}
                              </p>
                              <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-5 text-neutral-400">
                                {group.questions.map((question) => (
                                  <li key={question.key}>{question.label}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs leading-5 text-neutral-500">
                      Mapping tự động dựa trên từ khóa và các nhãn Likert phổ biến; hãy rà lại các
                      nhóm câu hỏi và cách quy đổi trước khi dùng cho báo cáo chính thức.
                    </p>
                  </>
                ) : null}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
