import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getOwnerStats } from '@/lib/db/owner'
import { OwnerDashboard } from '@/components/OwnerDashboard'

export default async function OwnerPage() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/owner/page.tsx:8',message:'OwnerPage called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const user = await getCurrentUser()
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/owner/page.tsx:10',message:'getCurrentUser result in OwnerPage',data:{hasUser:!!user,userId:user?.id||null,userEmail:user?.email||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  if (!user) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/160a94b3-1cf1-4047-acd7-ddbf3ee386d7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/owner/page.tsx:11',message:'Redirecting to login - no user',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    redirect('/login')
  }
  if (!isAdmin(user.email)) {
    redirect('/products')
  }

  const serverSupabase = await supabaseServerClient()
  const stats = await getOwnerStats(serverSupabase)

  return <OwnerDashboard stats={stats} />
}
