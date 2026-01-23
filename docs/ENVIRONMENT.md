# Required Netlify Environment Variables

Add these variables in Netlify: Site settings → Build & deploy → Environment.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Notes:
- Values should match your local `.env.local`.
- Do not commit actual secrets to GitHub.
