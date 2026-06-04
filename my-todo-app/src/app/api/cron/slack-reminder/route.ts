import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// 서비스 롤 키 사용 (RLS 우회, 서버 전용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  // 인증 확인 (외부 크론 서비스 또는 Vercel Cron 모두 지원)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

  // 한국 시간 기준 현재 시각
  const now = new Date()
  const koOffset = 9 * 60 * 60 * 1000
  const koNow = new Date(now.getTime() + koOffset)

  const currentHour = koNow.getUTCHours()
  const currentMinute = koNow.getUTCMinutes()
  const currentTotalMinutes = currentHour * 60 + currentMinute

  const todayStr = [
    koNow.getUTCFullYear(),
    String(koNow.getUTCMonth() + 1).padStart(2, '0'),
    String(koNow.getUTCDate()).padStart(2, '0'),
  ].join('-')

  // Slack Webhook URL이 등록된 사용자 전체 조회
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('user_id, end_time, slack_webhook_url, reminder_message')
    .not('slack_webhook_url', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!settings?.length) {
    return NextResponse.json({ message: 'No users with Slack configured' })
  }

  const results = []

  for (const setting of settings) {
    const [endHour, endMinute] = (setting.end_time as string).split(':').map(Number)
    const endTotalMinutes = endHour * 60 + endMinute
    const minutesUntilEnd = endTotalMinutes - currentTotalMinutes

    // 퇴근 55~65분 전 구간에만 발송 (force=true면 시간 조건 무시)
    if (!force && (minutesUntilEnd < 55 || minutesUntilEnd > 65)) continue

    // 오늘 미완료 할 일 조회
    const { data: todos } = await supabase
      .from('todos')
      .select('title')
      .eq('user_id', setting.user_id)
      .eq('date', todayStr)
      .eq('completed', false)
      .order('created_at', { ascending: true })

    if (!todos?.length) continue

    // Slack 메시지 발송
    const payload = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '퇴근 1시간 전 알림',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `아직 완료되지 않은 할 일이 *${todos.length}개* 있어요. ${setting.reminder_message ?? '퇴근 전에 확인해봐요!'}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: todos.map(t => `• ${t.title}`).join('\n'),
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `퇴근 예정: *${setting.end_time}* | 오늘 ${todayStr}`,
            },
          ],
        },
      ],
    }

    const res = await fetch(setting.slack_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    results.push({
      userId: setting.user_id,
      sent: res.ok,
      todoCount: todos.length,
    })
  }

  return NextResponse.json({ date: todayStr, results })
}
