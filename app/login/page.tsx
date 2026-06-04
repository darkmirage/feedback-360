'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const handleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-xs space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">360 Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access your reviews
          </p>
        </div>
        <Button onClick={handleLogin} className="w-full" size="lg">
          Continue with Google
        </Button>
      </div>
    </div>
  )
}
