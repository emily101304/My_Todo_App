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
  weekStart: Date
  onPrevWeek: () => void
  onNextWeek: () => void
  onDayClick: (date: string) => void
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function WeeklyView({ todos, weekStart, onPrevWeek, onNextWeek, onDayClick }: WeeklyViewProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return { dateStr: toDateStr(d), date: d }
  })

  const today = new Date()
  const todayStr = toDateStr(today)

  const todosByDate: Record<string, Todo[]> = {}
  todos.forEach(todo => {
    if (!todosByDate[todo.date]) todosByDate[todo.date] = []
    todosByDate[todo.date].push(todo)
  })

  const weekLabel = (() => {
    const start = weekDays[0].date
    const end = weekDays[6].date
    if (start.getMonth() === end.getMonth()) {
      return `${start.getMonth()+1}월 ${start.getDate()}일 - ${end.getDate()}일`
    }
    return `${start.getMonth()+1}/${start.getDate()} - ${end.getMonth()+1}/${end.getDate()}`
  })()

  return (
    <div className="flex flex-col gap-2">
      {/* 주간 네비게이션 */}
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={onPrevWeek}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-lg"
        >
          ‹
        </button>
        <span className="text-xs text-white/50">{weekLabel}</span>
        <button
          onClick={onNextWeek}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-lg"
        >
          ›
        </button>
      </div>

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
