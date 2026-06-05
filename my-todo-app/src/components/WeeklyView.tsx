'use client'

import { isHoliday, getHolidayName } from '@/lib/holidays'

interface Todo {
  id: string
  title: string
  completed: boolean
  date: string
}

interface WeeklyViewProps {
  todos: Todo[]
  onDayClick: (date: string) => void
}

function getWeekDays() {
  const today = new Date()
  const day = today.getDay() // 0=일
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((day + 6) % 7)) // 월요일 기준

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    return { dateStr, date: d }
  })
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export default function WeeklyView({ todos, onDayClick }: WeeklyViewProps) {
  const weekDays = getWeekDays()

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  const todosByDate: Record<string, Todo[]> = {}
  todos.forEach(todo => {
    if (!todosByDate[todo.date]) todosByDate[todo.date] = []
    todosByDate[todo.date].push(todo)
  })

  return (
    <div className="flex flex-col gap-2">
      {weekDays.map(({ dateStr, date }, i) => {
        const dayTodos = todosByDate[dateStr] || []
        const done = dayTodos.filter(t => t.completed).length
        const isToday = dateStr === todayStr
        const isHol = isHoliday(dateStr)
        const holidayName = getHolidayName(dateStr)
        const isSunday = i === 6
        const isRed = isSunday || isHol

        return (
          <div
            key={dateStr}
            onClick={() => onDayClick(dateStr)}
            title={holidayName ?? undefined}
            className={`rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
              isToday
                ? 'bg-blue-600/30 border border-blue-500/50'
                : isHol
                ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/15'
                : 'bg-white/5 hover:bg-white/10 border border-white/10'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${
                  i === 5 ? 'text-blue-400' : isRed ? 'text-red-400' : 'text-white/50'
                }`}>
                  {DAY_LABELS[i]}
                </span>
                <span className={`text-sm font-bold ${
                  isToday ? 'text-white' : isRed ? 'text-red-300' : 'text-white/80'
                }`}>
                  {date.getMonth() + 1}/{date.getDate()}
                </span>
                {isToday && <span className="text-xs text-blue-300">오늘</span>}
                {holidayName && <span className="text-xs text-red-400/80 truncate max-w-[60px]">{holidayName}</span>}
              </div>
              {dayTodos.length > 0 && (
                <span className="text-xs text-white/40">{done}/{dayTodos.length}</span>
              )}
            </div>

            {dayTodos.length === 0 ? (
              <p className="text-xs text-white/20 pl-0.5">할 일 없음</p>
            ) : (
              <ul
                className="space-y-0.5 overflow-y-auto transition-all duration-200"
                style={{ maxHeight: dayTodos.length > 3 ? undefined : undefined }}
                onMouseEnter={e => { if (dayTodos.length > 3) (e.currentTarget as HTMLElement).style.maxHeight = '120px' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.maxHeight = '54px' }}
                ref={el => { if (el && dayTodos.length > 3) el.style.maxHeight = '54px' }}
              >
                {dayTodos.map(todo => (
                  <li key={todo.id} className={`text-xs truncate ${
                    todo.completed ? 'line-through text-white/25' : 'text-white/70'
                  }`}>
                    {todo.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
