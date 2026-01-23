# Simplified Authentication System

## Overview
The authentication system has been simplified to remove role-based access control. Instead, we now use a **hardcoded admin email** check.

## Changes Made

### 1. SQL Schema (`supabase/schema-simple.sql`)
- **Removed** `role` column from `public.users` table
- **Removed** `is_owner()` function (replaced with `is_admin()`)
- **Added** `is_admin()` function that checks if email === 'admin@chateau-demo.com'
- All RLS policies now use `is_admin()` instead of `is_owner()`

### 2. Code Changes
- **Updated** `lib/roles.ts`:
  - Replaced `isOwnerRole(role)` with `isAdmin(email)`
  - Admin check is now: `email.toLowerCase() === 'admin@chateau-demo.com'`

- **Updated** `lib/types.ts`:
  - Made `role` optional in `User` interface (for backward compatibility)

- **Updated** all pages and API routes:
  - Replaced `isOwnerRole(user.role)` with `isAdmin(user.email)`
  - Removed role-based logic from login flow

### 3. Admin Email
The hardcoded admin email is: **`admin@chateau-demo.com`**

## Migration Steps

1. **Run the new SQL schema:**
   ```sql
   -- Run supabase/schema-simple.sql in your Supabase SQL editor
   ```

2. **The code is already updated** - no additional changes needed

3. **Test the login:**
   - Login with `admin@chateau-demo.com` → Should redirect to `/owner`
   - Login with any other email → Should redirect to `/products`

## What Was Removed

- ❌ `role` column from `public.users` table
- ❌ `is_owner()` SQL function
- ❌ Role-based RLS policies
- ❌ Role update logic in login flow
- ❌ `isOwnerRole()` function (replaced with `isAdmin()`)

## What Remains

- ✅ Simple email-based admin check
- ✅ All existing functionality (products, orders, cart, etc.)
- ✅ RLS policies (now using `is_admin()` instead of `is_owner()`)

## Benefits

1. **Simpler**: No role management needed
2. **Clearer**: Admin is determined by email only
3. **Less code**: Removed role-related logic throughout the app
4. **Easier to maintain**: One hardcoded email instead of role system
