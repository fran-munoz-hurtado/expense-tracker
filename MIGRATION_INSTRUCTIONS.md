# 🚀 Migration to Supabase Auth - Complete Guide

## ⚠️ **CRITICAL WARNING**
This migration will **DELETE ALL EXISTING DATA** in your database. Make sure to:
1. **Backup any important data** before proceeding
2. **Test in a development environment** first
3. **Ensure you have Supabase project access**

---

## 📋 **Pre-Migration Checklist**

### ✅ **Step 1: Verify Supabase Setup**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project
3. Verify you can access the **SQL Editor**
4. Ensure your `.env.local` has correct credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### ✅ **Step 2: Backup Current Data (Optional)**
If you have important data, export it first:
```sql
-- Run these in SQL Editor to backup your data
SELECT * FROM users;
SELECT * FROM recurrent_expenses;
SELECT * FROM non_recurrent_expenses;
SELECT * FROM transactions;
-- Save the results somewhere safe
```

---

## 🗄️ **Database Migration Process**

### **Step 1: Run the Migration Script**
1. Open your **Supabase SQL Editor**
2. Copy the entire contents of `migrate-to-supabase-auth.sql`
3. Paste it into the SQL Editor
4. **Click "Run"** to execute the migration

### **Step 2: Verify Migration Success**
After running the script, verify the tables were created:
```sql
-- Check that all tables exist with correct structure
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'recurrent_expenses', 'non_recurrent_expenses', 'transactions', 'user_categories', 'transaction_attachments')
ORDER BY table_name, ordinal_position;
```

You should see:
- ✅ `users.id` as `uuid`
- ✅ All `user_id` columns as `uuid`
- ✅ Proper foreign key relationships
- ✅ RLS policies enabled

---

## 🔐 **Authentication System Changes**

### **What Changed:**
- **OLD**: Custom user table with BIGINT ID and password_hash
- **NEW**: Direct integration with `auth.users` using UUID

### **New User Flow:**
1. User registers via Supabase Auth (`supabase.auth.signUp`)
2. Trigger automatically creates profile in `users` table
3. Default categories automatically created
4. All data linked via UUID from `auth.users.id`

### **Benefits:**
- 🔒 **Secure**: No password handling in your app
- 🎯 **Automatic**: User profiles created automatically
- 📧 **Features**: Email confirmation, password reset, etc.
- 🛡️ **RLS**: Row-level security with `auth.uid()`

---

## 📱 **Application Code Changes**

### **Types Updated:**
All TypeScript types now use `string` (UUID) instead of `number` for user_id:
```typescript
// OLD
user_id: number

// NEW  
user_id: string // UUID
```

### **Queries Updated:**
The helper functions now expect UUID strings:
```typescript
// OLD
createOptimizedQuery('transactions', 123)

// NEW
createOptimizedQuery('transactions', 'auth-uuid-string')
```

---

## 🧪 **Testing the Migration**

### **Step 1: Test Registration**
1. Go to your app: `http://localhost:3000`
2. Toggle to **"✨ Supabase Auth"**
3. Register a new user
4. Verify:
   - User appears in `auth.users`
   - Profile created in `users` table
   - 7 default categories created

### **Step 2: Test Login**
1. Login with the registered user
2. Verify app loads normally
3. Check that data is isolated per user

### **Step 3: Test Data Creation**
1. Create some expenses
2. Verify they appear with correct UUID user_id
3. Test category management

---

## 🚨 **Troubleshooting**

### **Error: "relation does not exist"**
- The migration script didn't run completely
- Re-run the entire `migrate-to-supabase-auth.sql` script

### **Error: "auth.uid() is null"**
- User not properly authenticated
- Check that Supabase Auth is working
- Verify RLS policies are correct

### **Error: "cannot insert duplicate key"**
- Trying to create duplicate categories
- Check the `handle_new_user()` function

### **Error: "invalid input syntax for type uuid"**
- Code still trying to use BIGINT user_id
- Check that all queries use UUID strings

---

## 📊 **New Database Schema Overview**

### **Enhanced Users Table:**
```sql
users (
  id UUID → auth.users(id)
  first_name TEXT
  last_name TEXT  
  status: 'active' | 'inactive' | 'banned'
  role: 'user' | 'admin'
  subscription_tier: 'free' | 'trial' | 'pro' | 'enterprise'
  is_on_trial BOOLEAN
  trial_started_at TIMESTAMP
  trial_expires_at TIMESTAMP
)
```

### **All Related Tables:**
- `recurrent_expenses.user_id` → UUID
- `non_recurrent_expenses.user_id` → UUID  
- `transactions.user_id` → UUID
- `transaction_attachments.user_id` → UUID
- `user_categories.user_id` → UUID (NEW TABLE)

---

## ✅ **Post-Migration Checklist**

- [ ] Migration script executed successfully
- [ ] All tables exist with UUID user_id
- [ ] RLS policies active
- [ ] Test user registration works
- [ ] Test user login works
- [ ] App loads without errors
- [ ] Data creation/editing works
- [ ] Category management works
- [ ] No console errors

---

## 🎯 **Next Steps After Migration**

1. **Remove Legacy Code**: Clean up old authentication code
2. **Enable Email Confirmation**: Configure in Supabase Auth settings
3. **Add Password Reset**: Use Supabase Auth password reset
4. **Configure Social Logins**: Add Google, GitHub, etc.
5. **Set Up Subscription Logic**: Use the new subscription_tier fields

---

## 🆘 **Need Help?**

If you encounter issues:
1. Check the Supabase logs in your dashboard
2. Verify your environment variables
3. Make sure you're using the latest Supabase client
4. Check browser console for detailed errors

**Your database is now fully compatible with Supabase Auth and ready for production! 🎉** 