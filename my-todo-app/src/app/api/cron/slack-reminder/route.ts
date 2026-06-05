import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type AlertType = '1hour' | '20min' | null

function getAlertType(minutesUntilEnd: number, force: boolean): AlertType {
  if (force) return '1hour'
  if (minutesUntilEnd >= 55 && minutesUntilEnd <= 65) return '1hour'
  if (minutesUntilEnd >= 15 && minutesUntilEnd <= 25) return '20min'
  return null
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

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

    const alertType = getAlertType(minutesUntilEnd, force)
    if (!alertType) continue

    const { data: todos } = await supabase
      .from('todos')
      .select('title')
      .eq('user_id', setting.user_id)
      .eq('date', todayStr)
      .eq('completed', false)
      .order('created_at', { ascending: true })

    if (!todos?.length) continue

    const headerText = alertType === '1hour' ? '퇴근 1시간 전 알림 ⏰' : '퇴근 20분 전 알림 🚨'
    const bodyText = alertType === '1hour'
      ? `아직 완료되지 않은 할 일이 *${todos.length}개* 있어요. ${setting.reminder_message ?? '퇴근 전에 확인해봐요!'}`
      : `퇴근까지 *20분* 남았어요! 미완료 할 일이 *${todos.length}개* 있어요. ${setting.reminder_message ?? '마무리해봐요!'}`

    const payload = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: headerText },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: bodyText },
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
      alertType,
      sent: res.ok,
      todoCount: todos.length,
    })
  }

  return NextResponse.json({ date: todayStr, results })
}
