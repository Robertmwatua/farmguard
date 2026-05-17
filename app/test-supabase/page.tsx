import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">Supabase SSR Test</h1>
      <ul className="list-disc pl-5">
        {todos?.map((todo) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
        {(!todos || todos.length === 0) && <p>No todos found. Check your database!</p>}
      </ul>
    </div>
  )
}
