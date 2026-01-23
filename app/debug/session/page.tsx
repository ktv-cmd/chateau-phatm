import { cookies } from 'next/headers'

export default async function DebugSessionPage() {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()

  return (
    <main className="page py-10">
      <div className="page-content">
        <h1 className="text-2xl font-bold">Session Cookies</h1>
        <p className="mt-2 text-sm text-gray-600">Count: {allCookies.length}</p>
        <pre className="mt-4 whitespace-pre-wrap break-all rounded border border-gray-200 bg-white p-4 text-sm">
          {JSON.stringify(allCookies, null, 2)}
        </pre>
      </div>
    </main>
  )
}
