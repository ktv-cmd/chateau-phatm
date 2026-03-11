import { AdminLiveBar } from '@/components/AdminLiveBar'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminLiveBar />
      {children}
    </>
  )
}
