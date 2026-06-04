'use client'

import { isHoliday, getHolidayName } from '@/lib/holidays'

interface Todo {
  id: string
  date: string
  completed: boolean
}

interface DashboardProps {
  todos: Todo[]
  currentMonth: Date
  onMonthChange: (date: Date) => void
  onDayClick: (date: string) => void
  selectedDate: string | null
}

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const DAY_NAMES = ['일','월','화','수','목','금','토']

export default function Dashboard({ todos, currentMonth, onMonthChange, onDayClick, selectedDate }: DashboardProps) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  const countByDate: Record<string, { total: number; done: number }> = {}
  todos.forEach(todo => {
    if (!countByDate[todo.date]) countByDate[todo.date] = { total: 0, done: 0 }
    countByDate[todo.date].total++
    if (todo.completed) countByDate[todo.date].done++
  })

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function prevMonth() { onMonthChange(new Date(year, month - 1, 1)) }
  function nextMonth() { onMonthChange(new Date(year, month + 1, 1)) }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          ‹
        </button>
        <span className="text-white font-semibold text-lg">
          {year}년 {MONTH_NAMES[month]}
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-white/40'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />

          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const counts = countByDate[dateStr]
          const isToday = dateStr === todayStr
          const dayOfWeek = i % 7
          const isHol = isHoliday(dateStr)
          const holidayName = getHolidayName(dateStr)
          const isRed = dayOfWeek === 0 || isHol

          return (
            <div
              key={i}
              onClick={() => onDayClick(dateStr)}
              title={holidayName ?? undefined}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                selectedDate === dateStr ? 'ring-2 ring-white/60' : ''
              } ${
                isToday
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : isHol
                  ? 'bg-red-500/10 hover:bg-red-500/20'
                  : 'bg-white/5 hover:bg-white/15'
              }`}
            >
              <span className={`text-sm font-medium ${
                isToday
                  ? 'text-white'
                  : isRed
                  ? 'text-red-400'
                  : dayOfWeek === 6
                  ? 'text-blue-300'
                  : 'text-white/80'
              }`}>
                {day}
              </span>
              {counts && (
                <span className={`text-xs mt-0.5 font-medium ${
                  isToday ? 'text-blue-200' : 'text-white/50'
                }`}>
                  {counts.done}/{counts.total}
                </span>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
