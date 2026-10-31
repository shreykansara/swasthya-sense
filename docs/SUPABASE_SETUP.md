# Supabase Setup & Hosting Guide

## 1. Local Development

Prerequisites:
- Docker Desktop running
- Supabase CLI (`npx supabase`)

Commands:
```bash
# Start local Supabase containers (Postgres, Auth, Storage, Studio)
npx supabase start

# View local service credentials and URLs
npx supabase status

# Apply database migrations
npx supabase db push

# Reset local database and seed
npx supabase db reset
```

Local URLs:
- **Supabase Studio:** http://localhost:54323 (or http://127.0.0.1:54323)
- **API Gateway:** http://localhost:54321
- **Database Connection:** `postgresql://postgres:postgres@localhost:54322/postgres`

---

## 2. Linking a Hosted Supabase Project

For production deployment (Render / Vercel), link to a hosted project on [supabase.com](https://supabase.com):

1. **Log in to Supabase CLI:**
   ```bash
   npx supabase login
   ```
   (Provide your Personal Access Token from supabase.com account settings).

2. **Link the local repository to your remote project:**
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```

3. **Push local migrations to the hosted database:**
   ```bash
   npx supabase db push
   ```

4. **Deploy storage buckets and policies:**
   Ensure the `reports` bucket exists on the hosted dashboard with matching RLS policies.

5. **Configure environment variables in Render / Vercel:**
   ```env
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_ANON_KEY=<your-hosted-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-hosted-service-role-key>
   SUPABASE_JWT_SECRET=<your-hosted-jwt-secret>
   ```
