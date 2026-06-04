'use client'

import { useState, useRef, useEffect } from 'react'

interface Todo {
  id: string
  title: string
  completed: boolean
  date: string
}

interface DayModalProps {
  date: string
  todos: Todo[]
  onClose: () => void
  onAdd: (title: string, date: string) => Promise<void>
  onToggle: (id: string, completed: boolean) => Promise<void>
  onUpdate: (id: string, title: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  return `${year}년 ${month}월 ${day}일 (${dayNames[date.getDay()]})`
}

export default function DayModal({ date, todos, onClose, onAdd, onToggle, onUpdate, onDelete }: DayModalProps) {
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  const sorted = [...todos].sort((a, b) => {
    if (a.completed === b.completed) return 0
    return a.completed ? 1 : -1
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setAdding(true)
    await onAdd(input.trim(), date)
    setInput('')
    setAdding(false)
  }

  function startEdit(todo: Todo) {
    if (todo.completed) return
    setEditingId(todo.id)
    setEditingText(todo.title)
  }

  async function commitEdit(id: string) {
    const trimmed = editingText.trim()
    if (trimmed && trimmed !== todos.find(t => t.id === id)?.title) {
      await onUpdate(id, trimmed)
    }
    setEditingId(null)
  }

  function handleEditKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') commitEdit(id)
    if (e.key === 'Escape') setEditingId(null)
  }

  const done = todos.filter(t => t.completed).length
  const isToday = date === (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-white font-semibold text-sm">{formatDateLabel(date)}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isToday && <span className="text-blue-400 mr-1">오늘</span>}
              {todos.length > 0 ? `${done}/${todos.length} 완료` : '할 일 없음'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 할 일 목록 */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {sorted.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">이 날 할 일이 없어.</p>
          ) : (
            <ul className="space-y-2">
              {sorted.map(todo => (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 group"
                >
                  <button
                    onClick={() => onToggle(todo.id, !todo.completed)}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      todo.completed ? 'bg-blue-500 border-blue-500' : 'border-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {todo.completed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {editingId === todo.id ? (
                    <input
                      ref={editInputRef}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => commitEdit(todo.id)}
                      onKeyDown={(e) => handleEditKeyDown(e, todo.id)}
                      className="flex-1 bg-transparent text-white text-sm focus:outline-none border-b border-gray-500 pb-0.5"
                    />
                  ) : (
                    <span
                      onClick={() => startEdit(todo)}
                      className={`flex-1 text-sm ${
                        todo.completed ? 'line-through text-gray-600 cursor-default' : 'text-gray-200 cursor-text hover:text-white'
                      }`}
                    >
                      {todo.title}
                    </span>
                  )}

                  <button
                    onClick={() => onDelete(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all text-lg leading-none flex-shrink-0"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 추가 폼 */}
        <form onSubmit={handleAdd} className="flex gap-2 px-5 py-4 border-t border-gray-700 flex-shrink-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="할 일 추가..."
            disabled={adding}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            type="submit"
            disabled={adding || !input.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            추가
          </button>
        </form>
      </div>
    </div>
  )
}
