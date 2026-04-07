import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_SESSION_COOKIE, verifyAdminSession, validateAdminPayload } from '@/lib/admin-auth'

export default async function AdminProtectedLayout({ children }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  const payload = verifyAdminSession(token)

  if (!payload) {
    redirect('/admin/login')
  }

  const valid = await validateAdminPayload(payload)
  if (!valid) {
    redirect('/admin/login')
  }

  return children
}
