import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'

async function submitRefillRequest(formData: FormData) {
  'use server'
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirectedFrom=/refill')
  }

  const rawRefillNumber = String(formData.get('refillNumber') || '').trim()
  if (!/^\d{6,8}$/.test(rawRefillNumber)) {
    redirect('/refill?status=invalid')
  }

  const serverSupabase = await supabaseServerClient()
  const { error } = await serverSupabase.from('refill_requests').insert({
    user_id: user.id,
    refill_number: rawRefillNumber
  })

  if (error) {
    redirect('/refill?status=error')
  }

  redirect('/refill?status=success')
}

export default async function RefillPage({
  searchParams
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirectedFrom=/refill')
  }

  if (isAdmin(user.email)) {
    redirect('/owner/refills')
  }

  const status = typeof searchParams?.status === 'string' ? searchParams.status : undefined

  return (
    <div className="page">
      <section className="page-content pt-10 pb-6">
        <div className="max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Refill a medication
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Enter the 6–8 digit refill number from your prescription label.
          </p>
        </div>
      </section>

      <section className="page-content pb-8">
        <div className="card p-4 sm:p-6 max-w-lg">
          {status !== 'success' ? (
            <>
              <form action={submitRefillRequest} className="flex flex-col sm:flex-row gap-3">
                <label htmlFor="refill-number" className="sr-only">
                  Refill number
                </label>
                <input
                  id="refill-number"
                  name="refillNumber"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6,8}"
                  minLength={6}
                  maxLength={8}
                  required
                  className="input sm:max-w-xs"
                  placeholder="Enter refill number"
                  aria-describedby="refill-helper"
                />
                <button type="submit" className="btn-primary px-6">
                  Request refill
                </button>
              </form>
              <p id="refill-helper" className="mt-2 text-xs text-gray-500">
                Example: 123456
              </p>
            </>
          ) : null}

          {status === 'success' && (
            <p className="text-sm text-green-600 font-medium">
              Refill request sent to the pharmacy.
            </p>
          )}
          {status === 'invalid' && (
            <p className="mt-3 text-sm text-red-600">
              Please enter a valid 6–8 digit refill number.
            </p>
          )}
          {status === 'error' && (
            <p className="mt-3 text-sm text-red-600">
              We could not submit your request. Please try again.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
