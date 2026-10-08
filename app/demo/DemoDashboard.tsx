'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Lightbulb,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import type {
  DemoAnalyticsData,
  LikertQuestion,
  ParticipantGroup,
} from '@/lib/demo-analytics';

type AnalysisView = 'overview' | 'likert' | 'demographics';
type GroupDimension = 'roles' | 'projects';

const SCORE_COLORS: Record<number, string> = {
  1: '#fb7185',
  2: '#fb923c',
  3: '#fbbf24',
  4: '#60a5fa',
  5: '#34d399',
};

const LIKERT_SCORE_LABELS: Record<number, string> = {
  1: 'Rất thấp',
  2: 'Thấp',
  3: 'Trung bình',
  4: 'Tốt',
  5: 'Rất tốt',
};

function scoreSummary(question: LikertQuestion) {
  return `${question.average.toFixed(2)} / 5`;
}

function shortQuestion(question: LikertQuestion, maxLength = 54) {
  return question.label.length > maxLength
    ? `${question.label.slice(0, maxLength - 1)}…`
    : question.label;
}

function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#151b1b] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="rounded-xl bg-emerald-300/10 p-2 text-emerald-300">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </article>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string; payload?: Record<string, unknown> }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="max-w-sm rounded-xl border border-white/10 bg-[#101615] p-3 text-xs shadow-xl">
      <p className="mb-2 font-semibold text-white">
        {String(payload[0]?.payload?.fullLabel ?? label ?? '')}
      </p>
      <div className="space-y-1.5">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6 text-slate-300">
            <span>{item.name}</span>
            <span className="font-semibold text-white">
              {typeof item.value === 'number'
                ? item.name?.includes('·')
                  ? item.value.toFixed(1)
                  : item.value.toFixed(2)
                : item.value}
              {item.name?.includes('điểm') || item.name?.includes('Điểm') ? ' / 5' : ''}
              {item.name?.includes('·') ? '%' : ''}
            </span>
          </div>
        ))}
        {typeof payload[0]?.payload?.responses === 'number' && (
          <p className="pt-1 text-slate-500">
            {String(payload[0].payload.responses)} câu trả lời
          </p>
        )}
      </div>
    </div>
  );
}

function Finding({
  icon,
  label,
  title,
  children,
  tone = 'emerald',
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  children: React.ReactNode;
  tone?: 'emerald' | 'amber' | 'blue' | 'violet';
}) {
  const toneClass = {
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200',
    amber: 'border-amber-300/15 bg-amber-300/[0.06] text-amber-100',
    blue: 'border-sky-300/15 bg-sky-300/[0.06] text-sky-100',
    violet: 'border-violet-300/15 bg-violet-300/[0.06] text-violet-100',
  }[tone];

  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">
        {icon}
        {label}
      </div>
      <h3 className="text-sm font-semibold leading-5 text-white">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-300">{children}</p>
    </article>
  );
}

export default function DemoDashboard({
  data,
  errorMessage,
}: {
  data: DemoAnalyticsData | null;
  errorMessage?: string;
}) {
  const [activeView, setActiveView] = useState<AnalysisView>('overview');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [groupDimension, setGroupDimension] = useState<GroupDimension>('projects');

  const visibleQuestions = useMemo(() => {
    if (!data) return [];
    return selectedCategory === 'all'
      ? data.questions
      : data.questions.filter((question) => question.category === selectedCategory);
  }, [data, selectedCategory]);

  const selectedQuestion =
    visibleQuestions.find((question) => question.id === selectedQuestionId) ??
    visibleQuestions[0] ??
    data?.questions[0];
  const demographicQuestion =
    data?.questions.find((question) => question.id === selectedQuestionId) ?? data?.questions[0];

  const questionChartData = visibleQuestions.map((question) => ({
    id: question.id,
    question: shortQuestion(question, 34),
    fullLabel: question.label,
    average: Number(question.average.toFixed(2)),
    positivePercent: question.positivePercent,
    responses: question.responses,
    ...Object.fromEntries(
      question.distribution.map((item) => [
        `level${item.score}`,
        (item.count / question.responses) * 100,
      ])
    ),
  }));

  const categoryChartData = data?.categories.map((category) => {
    const items = data.questions.filter((question) => question.category === category.id);
    return {
      category: category.label,
      fullLabel: category.label,
      average: items.length ? items.reduce((sum, item) => sum + item.average, 0) / items.length : 0,
      questionCount: items.length,
    };
  }) ?? [];

  const demographicGroups: ParticipantGroup[] =
    data?.participantGroups[groupDimension] ?? [];
  const visibleDemographicGroups = demographicGroups.filter((group) => group.respondents >= 5);
  const demographicChartData = visibleDemographicGroups.map((group) => {
    const questionAverage = group.questionAverages.find(
      (item) => item.questionId === demographicQuestion?.id
    );
    return {
      group: group.label,
      fullLabel: group.label,
      average: Number((questionAverage?.average ?? group.average).toFixed(2)),
      respondents: group.respondents,
      responses: questionAverage?.responses ?? 0,
    };
  });

  const navigation: { id: AnalysisView; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'likert', label: 'Phân tích Likert' },
    { id: 'demographics', label: 'Theo nhóm tham gia' },
  ];

  if (errorMessage || !data) {
    return (
      <main className="min-h-screen bg-[#0d1212] px-4 py-12 text-white sm:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-300/20 bg-rose-300/5 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-rose-300" size={34} />
          <h1 className="text-2xl font-semibold">Không tải được dữ liệu demo</h1>
          <p className="mt-3 text-sm text-slate-300">
            {errorMessage ?? 'Không có dữ liệu phân tích để hiển thị.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d1212] px-4 py-7 text-white sm:px-7 lg:px-10">
      <div className="mx-auto max-w-375">
        <header className="mb-7 flex flex-col justify-between gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Survey intelligence · Demo
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Tác động sau tập huấn
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Phân tích thang Likert từ dữ liệu đã mapping · {data.respondents} phản hồi ·{' '}
              {data.questionCount} chỉ số đánh giá.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/3 px-3 py-2 text-xs text-slate-300">
            <Activity size={14} className="text-emerald-300" />
            Demo phân tích từ CSV
          </span>
        </header>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
          <section className="min-w-0 space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Người tham gia"
                value={data.respondents.toLocaleString('vi-VN')}
                note="Phản hồi hợp lệ trong file CSV"
                icon={<UsersRound size={18} />}
              />
              <StatCard
                label="Điểm Likert trung bình"
                value={`${data.overallAverage.toFixed(2)} / 5`}
                note="Trung bình trên toàn bộ câu hỏi đánh giá"
                icon={<BarChart3 size={18} />}
              />
              <StatCard
                label="Đánh giá tích cực"
                value={`${data.overallPositivePercent}%`}
                note="Tỷ trọng câu trả lời ở mức 4–5"
                icon={<ArrowUpRight size={18} />}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151b1b] p-4 sm:p-6">
              <nav className="mb-6 flex flex-wrap gap-2" aria-label="Chọn phân tích">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      activeView === item.id
                        ? 'bg-emerald-300 text-[#0b211b]'
                        : 'bg-white/4 text-slate-400 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              {activeView === 'overview' && (
                <div>
                  <div className="mb-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
                      Bức tranh chung
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">Điểm trung bình theo năng lực</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Di chuột lên cột để xem câu hỏi và số phản hồi.
                    </p>
                  </div>
                  <div className="h-97.5 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={categoryChartData}
                        margin={{ top: 12, right: 12, left: 0, bottom: 15 }}
                      >
                        <CartesianGrid stroke="#28302f" vertical={false} />
                        <XAxis
                          dataKey="category"
                          stroke="#77817f"
                          tick={{ fill: '#cbd5d3', fontSize: 11 }}
                          interval={0}
                          angle={-12}
                          textAnchor="end"
                          height={62}
                        />
                        <YAxis
                          domain={[1, 5]}
                          ticks={[1, 2, 3, 4, 5]}
                          stroke="#77817f"
                          tick={{ fill: '#9ba5a3', fontSize: 11 }}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="average" name="Điểm trung bình" radius={[7, 7, 0, 0]}>
                          {categoryChartData.map((item, index) => (
                            <Cell
                              key={item.category}
                              fill={['#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#fb923c'][index % 5]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {categoryChartData.map((category) => (
                      <button
                        key={category.category}
                        type="button"
                        onClick={() => {
                          const firstQuestion = data.questions.find(
                            (question) =>
                              question.categoryLabel === category.category
                          );
                          if (firstQuestion) {
                            setSelectedCategory(firstQuestion.category);
                            setSelectedQuestionId(firstQuestion.id);
                            setActiveView('likert');
                          }
                        }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/2.5 px-3 py-2.5 text-left transition hover:border-emerald-300/20 hover:bg-emerald-300/4"
                      >
                        <span className="truncate text-xs text-slate-300">{category.category}</span>
                        <span className="shrink-0 text-xs font-semibold text-emerald-200">
                          {category.average.toFixed(2)} / 5
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeView === 'likert' && (
                <div>
                  <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">
                        Phân tích theo câu hỏi
                      </p>
                      <h2 className="mt-1 text-lg font-semibold">Phân bố từng mức Likert</h2>
                    </div>
                    <label className="w-full md:max-w-xs">
                      <span className="mb-1.5 block text-[11px] text-slate-500">Nhóm nội dung</span>
                      <select
                        value={selectedCategory}
                        onChange={(event) => setSelectedCategory(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#202625] px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-300"
                      >
                        <option value="all">Tất cả câu hỏi Likert</option>
                        {data.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {data.categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(category.id);
                          const first = data.questions.find((question) => question.category === category.id);
                          if (first) setSelectedQuestionId(first.id);
                        }}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                          selectedCategory === category.id
                            ? 'bg-sky-300/15 text-sky-200'
                            : 'bg-white/4 text-slate-400 hover:text-white'
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                        selectedCategory === 'all'
                          ? 'bg-sky-300/15 text-sky-200'
                          : 'bg-white/4 text-slate-400 hover:text-white'
                      }`}
                    >
                      Tất cả
                    </button>
                  </div>
                  <div className="h-97.5 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={questionChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 16, left: 8, bottom: 5 }}
                        onClick={(state) => {
                          const activeIndex = state?.activeTooltipIndex;
                          if (typeof activeIndex !== 'number') return;
                          const clickedQuestion = visibleQuestions[activeIndex];
                          if (clickedQuestion) setSelectedQuestionId(clickedQuestion.id);
                        }}
                      >
                        <CartesianGrid stroke="#28302f" horizontal={false} />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                          stroke="#77817f"
                          tick={{ fill: '#9ba5a3', fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="question"
                          width={175}
                          stroke="#77817f"
                          tick={{ fill: '#cbd5d3', fontSize: 10 }}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: 11, color: '#aab4b2', paddingTop: 12 }}
                        />
                        {[1, 2, 3, 4, 5].map((score) => (
                          <Bar
                            key={score}
                            dataKey={`level${score}`}
                            name={`${score} · ${LIKERT_SCORE_LABELS[score]}`}
                            stackId="likert"
                            fill={SCORE_COLORS[score]}
                            cursor="pointer"
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {selectedQuestion && (
                    <div className="mt-5 rounded-xl border border-sky-300/10 bg-sky-300/4 p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-200">
                            Câu đang chọn · {selectedQuestion.categoryLabel}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-white">{selectedQuestion.label}</p>
                        </div>
                        <div className="shrink-0 sm:text-right">
                          <p className="text-xl font-semibold text-sky-200">
                            {scoreSummary(selectedQuestion)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {selectedQuestion.responses} phản hồi · {selectedQuestion.positivePercent}% tích cực
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-5 gap-2">
                        {selectedQuestion.distribution.map((item) => (
                          <div
                            key={item.score}
                            className="rounded-lg bg-black/20 p-2 text-center"
                            title={LIKERT_SCORE_LABELS[item.score]}
                          >
                            <p className="text-xs font-bold" style={{ color: SCORE_COLORS[item.score] }}>
                              {item.score} · {item.percent}%
                            </p>
                            <p className="mt-1 text-[10px] text-slate-500">{item.count} lượt</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeView === 'demographics' && (
                <div>
                  <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
                        So sánh theo nhóm
                      </p>
                      <h2 className="mt-1 text-lg font-semibold">Điểm Likert theo nhóm tham gia</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        File không có tuổi/giới tính; nhóm hóa theo lĩnh vực công tác và chương trình.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([
                        ['projects', 'Dự án'],
                        ['roles', 'Lĩnh vực công tác'],
                      ] as const).map(([dimension, label]) => (
                        <button
                          key={dimension}
                          type="button"
                          onClick={() => setGroupDimension(dimension)}
                          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                            groupDimension === dimension
                              ? 'bg-violet-300 text-[#21152e]'
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {visibleDemographicGroups.length > 0 ? (
                    <>
                      <label className="mb-4 block max-w-xl">
                        <span className="mb-1.5 block text-[11px] text-slate-500">
                          So sánh câu hỏi
                        </span>
                        <select
                          value={demographicQuestion?.id ?? ''}
                          onChange={(event) => setSelectedQuestionId(event.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#202625] px-3 py-2.5 text-xs text-white outline-none focus:border-violet-300"
                        >
                          {data.questions.map((question) => (
                            <option key={question.id} value={question.id}>
                              {question.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div
                        className="w-full"
                        style={{ height: Math.max(300, demographicChartData.length * 52) }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={demographicChartData}
                            layout="vertical"
                            margin={{ top: 8, right: 18, left: 8, bottom: 8 }}
                          >
                            <CartesianGrid stroke="#28302f" horizontal={false} />
                            <XAxis
                              type="number"
                              domain={[0, 5]}
                              ticks={[1, 2, 3, 4, 5]}
                              stroke="#77817f"
                              tick={{ fill: '#9ba5a3', fontSize: 11 }}
                            />
                            <YAxis
                              type="category"
                              dataKey="group"
                              width={180}
                              stroke="#77817f"
                              tick={{ fill: '#cbd5d3', fontSize: 10 }}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar
                              dataKey="average"
                              name="Điểm trung bình"
                              fill="#a78bfa"
                              radius={[0, 6, 6, 0]}
                              barSize={22}
                            >
                              {demographicChartData.map((item, index) => (
                                <Cell
                                  key={item.group}
                                  fill={['#a78bfa', '#60a5fa', '#34d399', '#fbbf24'][index % 4]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {visibleDemographicGroups.map((group) => {
                          const questionAverage = group.questionAverages.find(
                            (item) => item.questionId === demographicQuestion?.id
                          );
                          return (
                            <div
                              key={group.label}
                              className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/2.5 px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-slate-200">{group.label}</p>
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                  n={group.respondents} người · {group.positivePercent}% mức 4–5
                                </p>
                              </div>
                              <span className="shrink-0 text-xs font-semibold text-violet-200">
                                {questionAverage?.average.toFixed(2) ?? '—'} / 5
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {visibleDemographicGroups.length < demographicGroups.length && (
                        <p className="mt-3 text-[10px] leading-4 text-slate-500">
                          Đã ẩn {demographicGroups.length - visibleDemographicGroups.length} nhóm có
                          dưới 5 người để tránh kết luận từ cỡ mẫu quá nhỏ.
                        </p>
                      )}
                      {groupDimension === 'projects' && (
                        <p className="mt-3 text-[10px] leading-4 text-slate-500">
                          Một người có thể tham gia nhiều dự án, vì vậy số người giữa các nhóm dự án
                          không cộng thành tổng mẫu.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
                      Chưa có nhóm dữ liệu để so sánh.
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="px-1 text-[10px] leading-4 text-slate-600">
              Điểm trung bình và tỷ lệ tích cực được tính trực tiếp từ câu trả lời 1–5 trong
              Mapped_Likert_Responses.csv. Đây là phân tích mô tả, không suy luận quan hệ nhân quả.
            </p>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-6">
            <div className="overflow-hidden rounded-2xl border border-violet-300/15 bg-[#171523]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={17} className="text-violet-300" />
                  <h2 className="text-sm font-semibold">LLM Insight · Demo</h2>
                </div>
                <span className="rounded-full bg-violet-300/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-violet-200">
                  Data-grounded
                </span>
              </div>
              <div className="space-y-3 p-4">
                <Finding
                  icon={<ArrowUpRight size={13} />}
                  label="Key finding · Điểm mạnh"
                  title={`${data.insights.strongest.categoryLabel} đạt điểm cao nhất`}
                  tone="emerald"
                >
                  “{data.insights.strongest.label}” đạt{' '}
                  <strong>{data.insights.strongest.average.toFixed(2)}/5</strong>;{' '}
                  {data.insights.strongest.positivePercent}% phản hồi ở mức 4–5, trên{' '}
                  {data.insights.strongest.responses} câu trả lời.
                </Finding>

                <Finding
                  icon={<ArrowDownRight size={13} />}
                  label="Key finding · Khoảng cần hỗ trợ"
                  title={`${data.insights.improvement.categoryLabel} là điểm thấp tương đối`}
                  tone="amber"
                >
                  “{data.insights.improvement.label}” có điểm{' '}
                  <strong>{data.insights.improvement.average.toFixed(2)}/5</strong>, thấp hơn{' '}
                  {(data.insights.strongest.average - data.insights.improvement.average).toFixed(2)}{' '}
                  điểm so với chỉ số cao nhất. Nên ưu tiên theo dõi mức 1–3 ở nội dung này.
                </Finding>

                <Finding
                  icon={<Activity size={13} />}
                  label="Key finding · Mức sẵn sàng"
                  title={`Sẵn sàng thực hành đạt ${data.insights.readinessAverage.toFixed(2)}/5`}
                  tone="blue"
                >
                  So với điểm hài lòng và độ rõ ràng{' '}
                  ({data.insights.satisfactionAverage.toFixed(2)}/5), chỉ số sẵn sàng{' '}
                  {data.insights.readinessAverage < data.insights.satisfactionAverage
                    ? 'thấp hơn — trải nghiệm tích cực chưa đồng nghĩa mọi người đã tự tin áp dụng.'
                    : 'tương đương hoặc cao hơn — đây là tín hiệu thuận lợi cho việc áp dụng sau khóa học.'}
                </Finding>

                {(data.insights.projectLeader || data.insights.projectFocus) && (
                  <Finding
                    icon={<UsersRound size={13} />}
                    label="So sánh nhóm · Dự án"
                    title="Mức đánh giá có khác biệt giữa các nhóm dự án"
                    tone="violet"
                  >
                    {data.insights.projectLeader && (
                      <>
                        Nhóm {data.insights.projectLeader.label} có trung bình cao nhất (
                        {data.insights.projectLeader.average.toFixed(2)}/5, n=
                        {data.insights.projectLeader.respondents}).{' '}
                      </>
                    )}
                    {data.insights.projectFocus && (
                      <>
                        Nhóm {data.insights.projectFocus.label} thấp hơn tương đối (
                        {data.insights.projectFocus.average.toFixed(2)}/5, n=
                        {data.insights.projectFocus.respondents}).
                      </>
                    )}
                  </Finding>
                )}

                <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
                    <Lightbulb size={14} className="text-amber-300" />
                    Gợi ý hành động
                  </div>
                  <ul className="space-y-2 text-xs leading-5 text-slate-300">
                    <li className="flex gap-2">
                      <span className="text-emerald-300">01</span>
                      <span>
                        Bổ sung bài tập có hướng dẫn cho nội dung “
                        {shortQuestion(data.insights.improvement, 68)}”.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-300">02</span>
                      <span>
                        Thu thập phản hồi sau tập huấn để kiểm tra mức tự tin có chuyển thành áp dụng
                        thực tế hay không.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-300">03</span>
                      <span>
                        Rà soát chênh lệch theo nhóm dự án với cỡ mẫu nhỏ trước khi thiết kế hỗ trợ
                        riêng.
                      </span>
                    </li>
                  </ul>
                </div>

                <p className="px-1 text-[10px] leading-4 text-slate-500">
                  Nội dung insight được sinh theo quy tắc từ thống kê CSV trong bản demo này; chưa
                  gọi LLM bên ngoài và không đưa dữ liệu cá nhân lên trình duyệt.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
