import { supabaseClient } from './db/supabaseClient'

// Client-side sign out function
export async function signOut() {
  await supabaseClient.auth.signOut()
  window.location.href = '/login'
}
