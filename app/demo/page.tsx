import DemoDashboard from './DemoDashboard';
import { DemoAnalyticsData, getDemoAnalyticsData } from '@/lib/demo-analytics';

export default async function DemoPage() {
  let data: DemoAnalyticsData | null = null;
  let errorMessage: string | undefined;

  try {
    data = await getDemoAnalyticsData();
  } catch (error) {
    console.error('Không thể dựng dashboard demo Likert:', error);
    errorMessage =
      error instanceof Error ? error.message : 'Đã xảy ra lỗi khi đọc dữ liệu phân tích.';
  }

  return <DemoDashboard data={data} errorMessage={errorMessage} />;
}
