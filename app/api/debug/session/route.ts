import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()

  return NextResponse.json({
    count: allCookies.length,
    cookies: allCookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
    })),
  })
}
