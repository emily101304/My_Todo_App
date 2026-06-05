'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('가입 확인 이메일을 발송했어요. 이메일을 확인해주세요.')
      }
    }

    setLoading(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setMessage('비밀번호 재설정 링크를 이메일로 발송했어요. 메일함을 확인해줘.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">My Todo</h1>
          <p className="mt-2 text-gray-400 text-sm">
            {mode === 'login' ? '계정에 로그인하세요' : mode === 'signup' ? '새 계정을 만드세요' : '비밀번호 재설정'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-xl">
          {/* 모드 탭 */}
          {mode !== 'forgot' && (
            <div className="flex rounded-lg bg-gray-800 p-1 mb-6">
              <button
                onClick={() => { setMode('login'); setError(''); setMessage('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === 'login' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
                }`}
              >
                로그인
              </button>
              <button
                onClick={() => { setMode('signup'); setError(''); setMessage('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === 'signup' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
                }`}
              >
                회원가입
              </button>
            </div>
          )}

          {/* 비밀번호 찾기 */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-gray-400">
                가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내줄게.
              </p>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}
              {message && <p className="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">{message}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {loading ? '발송 중...' : '재설정 링크 보내기'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setMessage('') }}
                className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                로그인으로 돌아가기
              </button>
            </form>
          )}

          {/* 이메일/비밀번호 폼 */}
          {mode !== 'forgot' && (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>
              )}
              {message && (
                <p className="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">{message}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
              </button>

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setMessage('') }}
                  className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors text-center"
                >
                  비밀번호를 잊으셨나요?
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
