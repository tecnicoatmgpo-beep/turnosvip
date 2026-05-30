import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Retrieve auth user session
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const pathParts = path.split('/').filter(Boolean) // e.g. ['bellavista', 'dashboard', 'agenda']

  // 1. Protect global superadmin paths (/admin/*)
  if (path.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error || !profile || profile.role !== 'superadmin') {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }
  }

  // 2. Protect tenant dashboard paths (/[tenantSlug]/dashboard/*)
  if (pathParts.length >= 2 && pathParts[1] === 'dashboard') {
    const tenantSlug = pathParts[0]

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Fetch user details
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }

    // Superadmin is allowed to access any tenant dashboard for support oversight
    if (profile.role !== 'superadmin') {
      // Resolve tenant UUID by slug
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id, status, current_period_end, trial_ends_at')
        .eq('slug', tenantSlug)
        .single()

      if (tenantError || !tenant) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'tenant_inactive')
        return NextResponse.redirect(url)
      }

      // Expiration check: suspension happens on expiration day at 00:00 hs
      const expirationStr = tenant.status === 'trial' ? tenant.trial_ends_at : tenant.current_period_end
      let isExpired = false
      if (expirationStr) {
        const expDate = new Date(expirationStr)
        expDate.setHours(0, 0, 0, 0)
        const now = new Date()
        isExpired = now.getTime() >= expDate.getTime()
      }

      if (tenant.status === 'suspended' || isExpired) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', isExpired ? 'subscription_expired' : 'tenant_inactive')
        return NextResponse.redirect(url)
      }

      // Check user association and roles
      if (profile.tenant_id !== tenant.id || (profile.role !== 'tenant_admin' && profile.role !== 'staff')) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(url)
      }
    }
  }

  // 3. Prevent logged-in users from hitting /login
  if (path === '/login' && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (profile) {
      if (profile.role === 'superadmin') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      } else if ((profile.role === 'tenant_admin' || profile.role === 'staff') && profile.tenant_id) {
        // Resolve tenant slug
        const { data: tenant } = await supabase
          .from('tenants')
          .select('slug')
          .eq('id', profile.tenant_id)
          .single()

        if (tenant) {
          const url = request.nextUrl.clone()
          url.pathname = `/${tenant.slug}/dashboard`
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return response
}
