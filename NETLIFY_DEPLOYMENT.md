# 🚀 Netlify Deployment Guide

## Overview
This guide will help you deploy your expense tracker app to Netlify successfully.

## Prerequisites
- ✅ Your code is pushed to GitHub
- ✅ You have a Supabase project set up
- ✅ You have your environment variables ready

## Step 1: Set Up Netlify

### Option A: Deploy via Netlify UI (Recommended)

1. **Go to [netlify.com](https://netlify.com)** and sign up/login
2. **Click "New site from Git"**
3. **Choose GitHub** and authorize Netlify
4. **Select your repository**: `fran-munoz-hurtado/expense-tracker`
5. **Configure build settings**:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: `18`

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
```

## Step 2: Configure Environment Variables

**This is the most important step!** The blank screen is usually caused by missing environment variables.

1. **In your Netlify dashboard**, go to **Site settings** → **Environment variables**
2. **Add these variables**:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Get your Supabase values**:
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to **Settings** → **API**
   - Copy the **Project URL** and **anon public** key

## Step 3: Deploy

1. **Trigger a new deployment**:
   - If using UI: Click "Deploy site"
   - If using CLI: `netlify deploy --prod`

2. **Wait for build to complete** (usually 2-5 minutes)

## Step 4: Troubleshooting Blank Screen

### Common Issues and Solutions:

#### 1. **Environment Variables Missing**
- **Symptom**: Blank white screen, console errors about Supabase
- **Solution**: Double-check environment variables in Netlify dashboard

#### 2. **Build Errors**
- **Symptom**: Build fails in Netlify
- **Solution**: Check build logs for specific errors

#### 3. **CORS Issues**
- **Symptom**: Network errors in browser console
- **Solution**: Add your Netlify domain to Supabase allowed origins

### Add Your Domain to Supabase:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. In **Additional allowed origins**, add:
   ```
   https://your-site-name.netlify.app
   https://your-custom-domain.com
   ```

## Step 5: Verify Deployment

1. **Check your site URL** (provided by Netlify)
2. **Open browser developer tools** (F12)
3. **Check Console tab** for any errors
4. **Check Network tab** for failed requests

## Step 6: Custom Domain (Optional)

1. **In Netlify dashboard**, go to **Domain settings**
2. **Add custom domain** if you have one
3. **Update Supabase allowed origins** with your custom domain

## Troubleshooting Commands

```bash
# Test build locally
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Lint your code
npm run lint
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | ✅ |

## Support

If you're still seeing a blank screen:

1. **Check Netlify build logs** for errors
2. **Check browser console** for JavaScript errors
3. **Verify environment variables** are set correctly
4. **Ensure Supabase project** is active and accessible

## Next Steps

After successful deployment:
- Set up automatic deployments from GitHub
- Configure custom domain
- Set up monitoring and analytics
- Test all features thoroughly 