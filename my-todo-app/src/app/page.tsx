import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MainPage from '@/components/MainPage'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <MainPage email={user.email ?? ''} userId={user.id} />
}
