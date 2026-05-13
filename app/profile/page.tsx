import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser, getCustomerProfile } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { ProfileForm } from '@/components/ProfileForm'

export const metadata: Metadata = {
  title: 'My Profile | Chateau Drug & Homecare',
}

interface ProfilePageProps {
  searchParams: { welcome?: string }
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirectedFrom=/profile')
  }

  if (isAdmin(user)) {
    redirect('/owner')
  }

  const profile = await getCustomerProfile(user.id)

  return <ProfileForm profile={profile} showWelcome={!!searchParams.welcome} />
}
