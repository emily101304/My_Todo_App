'use client'

import { useState, useRef, useEffect } from 'react'

type Priority = 'P0' | 'P1' | 'P2'

interface Todo {
  id: string
  title: string
  completed: boolean
  date: string
  priority: Priority
}

interface TodayListProps {
  todos: Todo[]
  onAdd: (title: string, priority: Priority) => Promise<void>
  onToggle: (id: string, completed: boolean) => Promise<void>
  onUpdate: (id: string, title: string) => Promise<void>
  onPriorityChange: (id: string, priority: Priority) => Promise<void>
  onPostpone: (ids: string[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; badge: string; border: string }> = {
  P0: {
    label: 'P0',
    color: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/40',
    border: 'border-red-500/30',
  },
  P1: {
    label: 'P1',
    color: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    border: 'border-yellow-500/20',
  },
  P2: {
    label: 'P2',
    color: 'text-white/40',
    badge: 'bg-white/10 text-white/40 border-white/20',
    border: 'border-white/10',
  },
}

const PRIORITIES: Priority[] = ['P0', 'P1', 'P2']

export default function TodayList({ todos, onAdd, onToggle, onUpdate, onPriorityChange, onPostpone, onDelete }: TodayListProps) {
  const [input, setInput] = useState('')
  const [priority, setPriority] = useState<Priority>('P2')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverPriority, setDragOverPriority] = useState<Priority | null>(null)
  const [postponeMode, setPostponeMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setAdding(true)
    await onAdd(input.trim(), priority)
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

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function enterPostponeMode() {
    setPostponeMode(true)
    setSelectedIds(new Set())
    setEditingId(null)
  }

  function cancelPostpone() {
    setPostponeMode(false)
    setSelectedIds(new Set())
  }

  async function confirmPostpone() {
    if (selectedIds.size === 0) return
    await onPostpone([...selectedIds])
    setPostponeMode(false)
    setSelectedIds(new Set())
  }

  const done = todos.filter(t => t.completed).length

  // 우선순위별 그룹화 (미완료 → P0/P1/P2 순, 완료는 최하단)
  const incomplete = todos.filter(t => !t.completed)
  const completed = todos.filter(t => t.completed)

  const grouped = PRIORITIES.map(p => ({
    priority: p,
    items: incomplete.filter(t => t.priority === p),
  })).filter(g => g.items.length > 0)

  const hasTodos = todos.length > 0

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold">오늘 할 일</h2>
        <div className="flex items-center gap-2">
          {hasTodos && (
            <span className="text-xs text-white/40">{done}/{todos.length} 완료</span>
          )}
          {postponeMode ? (
            <>
              <button
                onClick={confirmPostpone}
                disabled={selectedIds.size === 0}
                className="px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
              >
                내일로 미루기 {selectedIds.size > 0 && `(${selectedIds.size})`}
              </button>
              <button
                onClick={cancelPostpone}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 text-xs transition-colors"
              >
                취소
              </button>
            </>
          ) : (
            incomplete.length > 0 && (
              <button
                onClick={enterPostponeMode}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 hover:text-white text-xs transition-colors"
              >
                내일로 미루기
              </button>
            )
          )}
        </div>
      </div>

      {/* 추가 폼 */}
      <form onSubmit={handleAdd} className="mb-4 space-y-2">
        {/* 우선순위 선택 */}
        <div className="flex gap-1.5">
          {PRIORITIES.map(p => {
            const cfg = PRIORITY_CONFIG[p]
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  priority === p
                    ? cfg.badge + ' scale-105'
                    : 'bg-white/5 text-white/30 border-white/10 hover:text-white/50'
                }`}
              >
                {p}
              </button>
            )
          })}
          <span className="text-xs text-white/20 self-center ml-1">
            {priority === 'P0' ? '긴급' : priority === 'P1' ? '중요' : '일반'}
          </span>
        </div>

        {/* 입력창 */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="할 일 추가..."
            disabled={adding}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            type="submit"
            disabled={adding || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            추가
          </button>
        </div>
      </form>

      {/* 할 일 목록 */}
      {!hasTodos ? (
        <div className="text-center py-12 text-white/30 text-sm">
          오늘 할 일을 등록해보자!
        </div>
      ) : (
        <div className="space-y-4">
          {/* 우선순위별 그룹 */}
          {grouped.map(({ priority: p, items }) => {
            const cfg = PRIORITY_CONFIG[p]
            const isOver = dragOverPriority === p

            return (
              <div
                key={p}
                onDragOver={(e) => { e.preventDefault(); setDragOverPriority(p) }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverPriority(null)
                  }
                }}
                onDrop={() => {
                  if (draggedId) {
                    const dragged = todos.find(t => t.id === draggedId)
                    if (dragged && dragged.priority !== p) onPriorityChange(draggedId, p)
                  }
                  setDraggedId(null)
                  setDragOverPriority(null)
                }}
                className={`rounded-xl transition-colors ${isOver ? 'bg-white/5 ring-1 ring-white/20' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1.5 px-1 pt-1">
                  <span className={`text-xs font-bold ${cfg.color}`}>{p}</span>
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/20">{items.length}</span>
                </div>
                <ul className="space-y-1.5 pb-1">
                  {items.map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      isDragging={draggedId === todo.id}
                      postponeMode={postponeMode}
                      isSelected={selectedIds.has(todo.id)}
                      onSelect={() => toggleSelect(todo.id)}
                      editingId={editingId}
                      editingText={editingText}
                      editInputRef={editInputRef}
                      onStartEdit={startEdit}
                      onCommitEdit={commitEdit}
                      onEditKeyDown={handleEditKeyDown}
                      onEditTextChange={setEditingText}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onDragStart={() => setDraggedId(todo.id)}
                      onDragEnd={() => { setDraggedId(null); setDragOverPriority(null) }}
                    />
                  ))}
                  {isOver && draggedId && todos.find(t => t.id === draggedId)?.priority !== p && (
                    <li className={`h-10 rounded-xl border-2 border-dashed ${cfg.border} opacity-50`} />
                  )}
                </ul>
              </div>
            )
          })}

          {/* 완료된 항목 */}
          {completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-white/20">완료</span>
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/20">{completed.length}</span>
              </div>
              <ul className="space-y-1.5">
                {completed.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    isDragging={false}
                    postponeMode={false}
                    isSelected={false}
                    onSelect={() => {}}
                    editingId={editingId}
                    editingText={editingText}
                    editInputRef={editInputRef}
                    onStartEdit={startEdit}
                    onCommitEdit={commitEdit}
                    onEditKeyDown={handleEditKeyDown}
                    onEditTextChange={setEditingText}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onDragStart={() => {}}
                    onDragEnd={() => {}}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {hasTodos && (
        <p className="text-xs text-white/20 text-center mt-4">
          텍스트 클릭 시 수정 — Enter 저장, Esc 취소
        </p>
      )}
    </div>
  )
}

interface TodoItemProps {
  todo: Todo
  isDragging: boolean
  postponeMode: boolean
  isSelected: boolean
  onSelect: () => void
  editingId: string | null
  editingText: string
  editInputRef: React.RefObject<HTMLInputElement | null>
  onStartEdit: (todo: Todo) => void
  onCommitEdit: (id: string) => void
  onEditKeyDown: (e: React.KeyboardEvent, id: string) => void
  onEditTextChange: (v: string) => void
  onToggle: (id: string, completed: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onDragStart: () => void
  onDragEnd: () => void
}

function TodoItem({
  todo, isDragging, postponeMode, isSelected, onSelect,
  editingId, editingText, editInputRef,
  onStartEdit, onCommitEdit, onEditKeyDown, onEditTextChange,
  onToggle, onDelete, onDragStart, onDragEnd,
}: TodoItemProps) {
  const cfg = PRIORITY_CONFIG[todo.priority]

  return (
    <li
      draggable={!todo.completed && !postponeMode}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl backdrop-blur-sm border group transition-all ${
        todo.completed ? 'bg-white/5 border-white/5 opacity-60' : cfg.border
      } ${isSelected ? 'bg-orange-500/20 border-orange-500/40' : 'bg-white/10'} ${
        isDragging ? 'opacity-40 cursor-grabbing' : postponeMode && !todo.completed ? 'cursor-pointer' : 'cursor-grab'
      }`}
      onClick={postponeMode && !todo.completed ? onSelect : undefined}
    >
      {/* 미루기 선택 체크박스 */}
      {postponeMode && !todo.completed && (
        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          isSelected ? 'bg-orange-500 border-orange-500' : 'border-white/30'
        }`}>
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      {/* 우선순위 뱃지 */}
      <span className={`text-xs font-bold w-6 text-center flex-shrink-0 ${
        todo.completed ? 'text-white/20' : cfg.color
      }`}>
        {todo.priority}
      </span>

      {/* 체크박스 */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(todo.id, !todo.completed) }}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          todo.completed ? 'bg-blue-500 border-blue-500' : 'border-white/40 hover:border-white/70'
        }`}
      >
        {todo.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* 텍스트 or 편집 */}
      {editingId === todo.id ? (
        <input
          ref={editInputRef}
          value={editingText}
          onChange={(e) => onEditTextChange(e.target.value)}
          onBlur={() => onCommitEdit(todo.id)}
          onKeyDown={(e) => onEditKeyDown(e, todo.id)}
          className="flex-1 bg-transparent text-white text-sm focus:outline-none border-b border-white/40 pb-0.5"
        />
      ) : (
        <span
          onClick={() => onStartEdit(todo)}
          className={`flex-1 text-sm select-none ${
            todo.completed ? 'line-through text-white/30 cursor-default' : 'text-white cursor-text hover:text-white/80'
          }`}
        >
          {todo.title}
        </span>
      )}

      {/* 삭제 */}
      {!postponeMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(todo.id) }}
          className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all text-lg leading-none flex-shrink-0"
        >
          ×
        </button>
      )}
    </li>
  )
}
