'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Dashboard from './Dashboard'
import TodayList from './TodayList'
import DayModal from './DayModal'
import WeeklyView from './WeeklyView'

const DEFAULT_SETTINGS = {
  backgroundUrl: 'https://upload.wikimedia.org/wikipedia/en/a/a8/Pingu_title_screen.jpg',
  backgroundSize: 'cover' as 'cover' | 'contain',
  backgroundColor: '#0a0a0a',
  startTime: '08:00',
  endTime: '17:00',
  slackWebhookUrl: '',
  reminderMessage: '퇴근 전에 확인해봐요!',
}

interface Settings {
  backgroundUrl: string
  backgroundSize: 'cover' | 'contain'
  backgroundColor: string
  startTime: string
  endTime: string
  slackWebhookUrl: string
  reminderMessage: string
}

type Priority = 'P0' | 'P1' | 'P2'

interface Todo {
  id: string
  title: string
  completed: boolean
  date: string
  priority: Priority
  created_at: string
}


function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function MainPage({ email, userId }: { email: string; userId: string }) {
  const router = useRouter()
  const supabase = createClient()

  // 설정
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [draft, setDraft] = useState<Settings>(DEFAULT_SETTINGS)
  const [previewError, setPreviewError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localBgImage, setLocalBgImage] = useState<string | null>(null)

  // Todo
  const [todos, setTodos] = useState<Todo[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const todayStr = getTodayStr()

  useEffect(() => {
    // localStorage 로드 (빠른 초기 렌더용)
    const saved = localStorage.getItem('todo-settings')
    if (saved) {
      try { setSettings(JSON.parse(saved)) } catch {}
    }
    const localImg = localStorage.getItem('todo-bg-image')
    if (localImg) setLocalBgImage(localImg)

    // Supabase에서 최신 설정 로드 (endTime, slackWebhookUrl)
    supabase
      .from('user_settings')
      .select('end_time, slack_webhook_url, reminder_message')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettings(prev => ({
            ...prev,
            endTime: data.end_time ?? prev.endTime,
            slackWebhookUrl: data.slack_webhook_url ?? '',
            reminderMessage: data.reminder_message ?? prev.reminderMessage,
          }))
        }
      })
  }, [])

  const fetchTodos = useCallback(async (month: Date) => {
    const year = month.getFullYear()
    const m = month.getMonth()
    const start = `${year}-${String(m+1).padStart(2,'0')}-01`
    const lastDay = new Date(year, m+1, 0).getDate()
    const end = `${year}-${String(m+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`

    const { data } = await supabase
      .from('todos')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('created_at', { ascending: true })

    setTodos(data || [])
  }, [supabase])

  useEffect(() => {
    fetchTodos(currentMonth)
  }, [currentMonth, fetchTodos])


  const todayTodos = todos.filter(t => t.date === todayStr)

  async function addTodo(title: string, priority: Priority = 'P2') {
    const { data } = await supabase
      .from('todos')
      .insert({ title, date: todayStr, completed: false, user_id: userId, priority })
      .select()
      .single()
    if (data) setTodos(prev => [...prev, data])
  }

  async function addTodoForDate(title: string, date: string) {
    const { data } = await supabase
      .from('todos')
      .insert({ title, date, completed: false, user_id: userId, priority: 'P2' })
      .select()
      .single()
    if (data) setTodos(prev => [...prev, data])
  }

  async function toggleTodo(id: string, completed: boolean) {
    await supabase.from('todos').update({ completed }).eq('id', id)
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t))
  }

  async function updateTodo(id: string, title: string) {
    await supabase.from('todos').update({ title }).eq('id', id)
    setTodos(prev => prev.map(t => t.id === id ? { ...t, title } : t))
  }

  async function updatePriority(id: string, priority: Priority) {
    await supabase.from('todos').update({ priority }).eq('id', id)
    setTodos(prev => prev.map(t => t.id === id ? { ...t, priority } : t))
  }

  async function postponeTodos(ids: string[], targetDate: string) {
    await supabase.from('todos').update({ date: targetDate }).in('id', ids)
    setTodos(prev => prev.map(t => ids.includes(t.id) ? { ...t, date: targetDate } : t))
  }

  async function deleteTodo(id: string) {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  // 설정 함수들
  function openModal() {
    setDraft(settings)
    setPreviewError(false)
    setIsModalOpen(true)
  }

  async function saveSettings() {
    if (previewError) return
    localStorage.setItem('todo-settings', JSON.stringify(draft))
    setSettings(draft)
    if (draft.backgroundUrl === '__local__') {
      const localImg = localStorage.getItem('todo-bg-image')
      if (localImg) setLocalBgImage(localImg)
    }

    // Supabase에 퇴근 시간 + Slack Webhook URL 저장
    await supabase.from('user_settings').upsert({
      user_id: userId,
      end_time: draft.endTime,
      slack_webhook_url: draft.slackWebhookUrl || null,
      reminder_message: draft.reminderMessage || '퇴근 전에 확인해봐요!',
      updated_at: new Date().toISOString(),
    })

    setIsModalOpen(false)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    setPreviewError(false)
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const MAX_WIDTH = 1920
      const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      URL.revokeObjectURL(objectUrl)
      if (dataUrl.length > 4 * 1024 * 1024) {
        alert('이미지가 너무 커요. 더 작은 이미지를 사용해줘.')
        setUploading(false)
        return
      }
      localStorage.setItem('todo-bg-image', dataUrl)
      setDraft(prev => ({ ...prev, backgroundUrl: '__local__' }))
      setUploading(false)
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); setUploading(false) }
    img.src = objectUrl
    e.target.value = ''
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const bgImage = settings.backgroundUrl === '__local__'
    ? localBgImage ? `url("${localBgImage}")` : undefined
    : settings.backgroundUrl ? `url("${settings.backgroundUrl}")` : undefined

  return (
    <div
      className="h-screen bg-center bg-no-repeat relative flex flex-col overflow-hidden"
      style={{ backgroundColor: settings.backgroundColor, backgroundImage: bgImage, backgroundSize: settings.backgroundSize }}
    >
      <div className="absolute inset-0 bg-black/40" />

      {/* 헤더 */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 flex-shrink-0">
        <h1 className="text-lg font-bold text-white drop-shadow">My Todo</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/60 hidden sm:block">{email}</span>
          <button onClick={openModal} className="px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-sm hover:bg-white/30 transition-colors border border-white/20">
            설정
          </button>
          <button onClick={signOut} className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white/60 text-sm hover:bg-white/20 transition-colors border border-white/10">
            로그아웃
          </button>
        </div>
      </header>

      {/* 3분할 패널 */}
      <main className="relative z-10 flex-1 flex gap-3 px-4 pb-4 min-h-0">

        {/* Calendar 패널 */}
        <section className="flex-1 flex flex-col bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b border-white/10">
            <h2 className="text-white font-semibold text-sm">Calendar</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <Dashboard
              todos={todos}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              onDayClick={setSelectedDate}
              selectedDate={selectedDate}
            />
          </div>
        </section>

        {/* Today 패널 */}
        <section className="flex-1 flex flex-col bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b border-white/10">
            <h2 className="text-white font-semibold text-sm">Today</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <TodayList
              todos={todayTodos}
              onAdd={addTodo}
              onToggle={toggleTodo}
              onUpdate={updateTodo}
              onPriorityChange={updatePriority}
              onPostpone={postponeTodos}
              onDelete={deleteTodo}
            />
          </div>
        </section>

        {/* Weekly 패널 */}
        <section className="flex-1 flex flex-col bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex-shrink-0 border-b border-white/10">
            <h2 className="text-white font-semibold text-sm">Weekly</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <WeeklyView
              todos={todos}
              onDayClick={setSelectedDate}
            />
          </div>
        </section>

      </main>

      {/* 날짜별 할 일 모달 */}
      {selectedDate && (
        <DayModal
          date={selectedDate}
          todos={todos.filter(t => t.date === selectedDate)}
          onClose={() => setSelectedDate(null)}
          onAdd={addTodoForDate}
          onToggle={toggleTodo}
          onUpdate={updateTodo}
          onDelete={deleteTodo}
        />
      )}

      {/* 설정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-gray-900 rounded-2xl border border-gray-700 p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold text-white mb-5">설정</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">배경화면</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={draft.backgroundUrl === '__local__' ? '' : draft.backgroundUrl}
                    onChange={(e) => { setDraft({ ...draft, backgroundUrl: e.target.value }); setPreviewError(false) }}
                    placeholder="https://... (이미지 URL)"
                    className="flex-1 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <label className={`flex items-center px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors whitespace-nowrap ${
                    uploading ? 'bg-gray-700 border-gray-600 text-gray-500' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}>
                    {uploading ? '처리 중...' : '파일 업로드'}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleFileUpload} />
                  </label>
                </div>
                {draft.backgroundUrl === '__local__' && <p className="text-xs text-blue-400 mb-2">내 파일 업로드 사용 중</p>}
                {draft.backgroundUrl === '__local__' && localBgImage ? (
                  <img src={localBgImage} alt="미리보기" className="h-20 w-full rounded-lg object-cover border border-gray-700" />
                ) : draft.backgroundUrl && draft.backgroundUrl !== '__local__' && (
                  previewError ? (
                    <div className="h-20 w-full rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center text-gray-500 text-xs">이미지를 불러올 수 없어요.</div>
                  ) : (
                    <img key={draft.backgroundUrl} src={draft.backgroundUrl} alt="미리보기" className="h-20 w-full rounded-lg object-cover border border-gray-700" onError={() => setPreviewError(true)} />
                  )
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">배경 색상</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={draft.backgroundColor} onChange={(e) => setDraft({ ...draft, backgroundColor: e.target.value })} className="w-10 h-10 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer p-0.5" />
                  <div className="flex gap-1.5">
                    {['#0a0a0a','#1e3a5f','#2d1b4e','#1a3a2a','#3a1a1a','#ffffff'].map(color => (
                      <button key={color} type="button" onClick={() => setDraft({ ...draft, backgroundColor: color })} className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${draft.backgroundColor === color ? 'border-white scale-110' : 'border-gray-600'}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{draft.backgroundColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">배경 맞춤</label>
                <div className="flex gap-2">
                  {(['cover','contain'] as const).map(size => (
                    <button key={size} type="button" onClick={() => setDraft({ ...draft, backgroundSize: size })} className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${draft.backgroundSize === size ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                      {size === 'cover' ? '꽉 채우기' : '전체 보기'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">출근 시간</label>
                  <input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">퇴근 시간</label>
                  <input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Slack Webhook URL
                  <span className="ml-2 text-xs text-gray-600">(퇴근 1시간 전 미완료 할 일 알림)</span>
                </label>
                <input
                  type="text"
                  value={draft.slackWebhookUrl}
                  onChange={(e) => setDraft({ ...draft, slackWebhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Slack 리마인드 메시지
                </label>
                <input
                  type="text"
                  value={draft.reminderMessage}
                  onChange={(e) => setDraft({ ...draft, reminderMessage: e.target.value })}
                  placeholder="퇴근 전에 확인해봐요!"
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <p className="mt-1.5 text-xs text-gray-600">
                  미완료 할 일 목록 위에 표시되는 메시지야.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors">취소</button>
              <button onClick={saveSettings} disabled={previewError} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
