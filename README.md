# 🎯 BudgetBuddy User Guide: Complete Tutorial

Welcome to **BudgetBuddy**! This comprehensive guide will walk you through every feature of the application, from initial setup to advanced expense management.

---

## 📥 Table of Contents

1. [Getting Started](#getting-started)
2. [Installation & Setup](#installation--setup)
3. [First-Time Login](#first-time-login)
4. [Main Features](#main-features)
5. [Dashboard Overview](#dashboard-overview)
6. [Personal Expense Tracking](#personal-expense-tracking)
7. [Group Expense Management](#group-expense-management)
8. [AI Features & Receipt Scanning](#ai-features--receipt-scanning)
9. [Budget Management](#budget-management)
10. [Reports & Export](#reports--export)
11. [Profile & Settings](#profile--settings)
12. [Troubleshooting](#troubleshooting)
13. [API Rate Limits](#api-rate-limits-important)

---

## Getting Started

### What is BudgetBuddy?

BudgetBuddy is a smart expense tracker designed specifically for Vietnamese university students. It helps you:

- **Track personal spending** in Vietnamese Dong (VND)
- **Split bills fairly** with roommates and friends
- **Get AI-powered insights** about your spending habits
- **Scan receipts** with automatic data extraction
- **Manage budgets** with alerts and forecasts
- **Work completely offline** — no internet connection required

### System Requirements

- **Browser:** Chrome/Edge (v90+), Safari (v15+), Firefox (v88+)
- **Device:** Smartphone, tablet, or desktop
- **Storage:** ~50 MB available space (for PWA installation)
- **Internet:** Optional (for cloud sync) — app works offline

---

## Installation & Setup

### Option 1: Web Browser (Easiest)

1. Open your browser and navigate to: **https://budgetbuddy-omega-dun.vercel.app**
2. You're ready to go! No installation needed.
3. (Optional) To install as an app:
   - **iPhone/iPad:** Tap the Share icon → "Add to Home Screen"
   - **Android:** Tap the menu (three dots) → "Install app"
   - **Desktop:** Click the "Install" button in the browser bar

### Option 2: Local Development (For Developers)

```bash
# Clone the repository
git clone https://github.com/ZaruITITIU21299/budgetbuddy.git
cd budgetbuddy

# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:5173 in your browser
```

---

## First-Time Login

### Create Your Account

**Note:** Demo accounts are not available in production. You'll need to create a real account to use BudgetBuddy.

1. On the login screen, click **"Sign Up"**
2. Enter:
   - Your email (any email works for local mode; must be a real email for Supabase)
   - Password (minimum 6 characters)
3. Click **"Sign Up"**
4. You'll be logged in to a fresh, empty account

### Note on Storage Mode

When you log in, you'll see a badge in the top-right corner:

- **"Local"** badge = Your data is stored in your browser (localStorage). Works offline, syncs across tabs only.
- **"Supabase"** badge = Your data is synced to the cloud. Requires environment setup by the developer.

For this guide, we assume **Local mode**.

---

## Dashboard Overview

When you first log in, you'll see the **Dashboard** — your financial snapshot.

### Key Elements

```
┌─────────────────────────────────────────────┐
│           BUDGETBUDDY DASHBOARD             │
├─────────────────────────────────────────────┤
│  📊 This Month's Spending: 5.250.000 ₫      │
│                                             │
│  💰 Income: 8.000.000 ₫                     │
│  📈 Remaining: 2.750.000 ₫                  │
├─────────────────────────────────────────────┤
│  🏆 Top Categories                          │
│  • Food & Drink    2.150.000 ₫  (41%)       │
│  • Transport       900.000 ₫    (17%)       │
│  • Entertainment   800.000 ₫    (15%)       │
├─────────────────────────────────────────────┤
│  📉 Spending Forecast                       │
│  May (to date): 5.2M ₫  →  May (predicted): 6.8M ₫
│  Trend: ↑ +15% compared to April            │
├─────────────────────────────────────────────┤
│  🤖 AI Insights (Updated Weekly)            │
│  • You spent 500k more on food this week.   │
│    Consider cooking at home 3 days next week│
└─────────────────────────────────────────────┘
```

### Widgets Explanation

| Widget | Purpose |
|--------|---------|
| **Monthly Spending** | Total spent this calendar month |
| **Income** | Total monthly income (set in Profile) |
| **Remaining** | Income minus spending |
| **Top Categories** | Your highest-spending categories with % breakdown |
| **Spending Forecast** | Predicted end-of-month total based on current trend |
| **AI Insights** | Personalized recommendations based on your spending |

---

## Personal Expense Tracking

The **Expenses** view is where you log and manage individual spending.

### Adding an Expense (3 Methods)

#### Method 1: Manual Entry

1. Click the **+ Add Expense** button
2. Fill in:
   - **Amount:** Type the VND amount (e.g., `150000` or `150.000`)
   - **Category:** Select from Food & Drink, Transport, Housing, Education, etc.
   - **Date:** When you spent the money (defaults to today)
   - **Note:** Optional description (e.g., "Lunch with Linh")
   - **Receipt:** Optionally attach a photo (will extract data via AI)
3. Click **Save Expense**

**Example:**
```
Amount:     125.000 ₫
Category:   Food & Drink
Date:       2026-05-23
Note:       Phở at Phở King
Receipt:    (optional photo)
```

#### Method 2: Receipt Scanning (AI-Powered)

1. Click **📸 Scan Receipt** in the Expenses view
2. Upload a photo of your receipt (JPG/PNG, < 5 MB)
3. Wait 2--3 seconds for AI to analyze the image
4. **AI will extract:**
   - Merchant name (e.g., "Highlands Coffee")
   - Purchase date
   - Total amount
   - Line items (optional)
   - Category hint
5. **Review and edit** the extracted data if needed
6. Click **Confirm** to save the expense

**⚠️ Receipt Quality Matters:**
- Clean, flat receipts work best
- Avoid shadows and reflections
- If receipt is blurry, the AI may struggle — be ready to manually correct

#### Method 3: Duplicate Previous Expense

If you have a recurring expense, you can duplicate the last one:

1. Find the expense in the list
2. Click the **⋯** menu → **Duplicate**
3. Edit the date (and amount if needed)
4. Click **Save**

---

### Viewing & Filtering Expenses

#### View Options

- **List View:** See all expenses chronologically
- **Category View:** See totals grouped by category (click category to see items)
- **Calendar View:** Click a date to see that day's expenses

#### Filters

1. **Date Range:** Click the date picker to choose start and end dates
2. **Category:** Click a category name to filter by it
3. **Search:** Type a merchant name or note in the search box

#### Expense Details

Click any expense to see:
- Full details (amount, date, category, note)
- Attached receipt image (if any)
- Action buttons: **Edit**, **Delete**, **Duplicate**, **Create Bill**

---

### Editing & Deleting Expenses

**To Edit:**
1. Click the expense
2. Click **Edit**
3. Modify any field
4. Click **Save Changes**

**To Delete:**
1. Click the expense
2. Click **Delete**
3. Confirm (you'll see a warning)

---

## Group Expense Management

**Groups** are for shared expenses (roommates, group dinners, trip costs, etc.).

### Creating a Group

1. Go to the **Groups** view
2. Click **+ New Group**
3. Enter:
   - **Group Name:** e.g., "Apartment 302 Roommates"
   - **Description:** e.g., "Shared utilities & groceries"
   - **Members:** Start with yourself; add others later
4. Click **Create Group**

**Quick tip:** You don't need all members' accounts — you can invite them via a shareable link (see below).

### Inviting Members

1. Open the group
2. Click **📋 Members** tab
3. Click **+ Invite Member**
4. Choose:
   - **Invite Existing User:** If they have a BudgetBuddy account, search by email
   - **Generate Invite Link:** Share a magic link (works offline; they'll auto-join)
5. Share the link via WhatsApp, Messenger, email, etc.

**Invite Link Workflow:**
- Sender: Generates link (e.g., `budgetbuddy.app/join/abc123xyz`)
- Receiver: Opens link → clicks **Join Group**
- Automatic: Receiver is added to the group (even if offline; syncs when online)

### Recording Group Expenses

1. In the group, click **+ Add Group Expense**
2. Enter:
   - **Amount:** Total spent (e.g., 900.000 ₫ for a shared dinner)
   - **Category:** What type of expense
   - **Paid By:** Who paid the amount (usually you)
   - **Split Type:** How to divide the cost
3. Select split type:

#### Split Types

| Type | Example |
|------|---------|
| **Equal** | 900k ÷ 3 people = 300k each |
| **Percentage** | Alice 50%, Bob 30%, Linh 20% |
| **Exact Amount** | Alice 400k, Bob 300k, Linh 200k |
| **Shares** | Alice 2 shares, Bob 1 share, Linh 1 share (useful for varying consumption) |

**Example: Restaurant Bill**
- Total: 900.000 ₫
- Paid by: You
- Split: Equal (3 members)
- **Result:** Alice owes you 300k, Bob owes you 300k, Linh owes you 300k

4. Click **Save Group Expense**

---

### Viewing Group Balances

1. Open the group
2. Click **💳 Balances** tab

You'll see:

```
Group Balances (Who Owes Whom?)
─────────────────────────────
✅ Alice owes You        300.000 ₫
❌ You owe Bob          150.000 ₫
✅ Linh owes You        250.000 ₫

NET SUMMARY:
─────────────
💰 You have +400.000 ₫ to collect
📊 Total unsettled: 700.000 ₫
```

---

### Settling Up

When someone pays their debt:

1. Open the group → **Balances** tab
2. Find the debt (e.g., "Alice owes You 300k")
3. Click **✓ Mark as Settled** when they transfer the money
4. Confirm the settlement

**🤝 Smart Settlement Suggestions:**

If many debts exist, BudgetBuddy's **debt-simplification algorithm** suggests the minimum number of 
transactions needed to clear all debts.

For example:
```
Before:
- Alice owes You    300k
- You owe Bob       150k
- Bob owes Linh     100k

After (Simplified):
- Alice owes You    300k
- You pay Bob       150k    → NET: Alice pays You, You pay Bob, Net effect: 2 transactions instead of 3
```

---

## AI Features & Receipt Scanning

### Receipt Scanning in Detail

The receipt scanner uses **Google Gemini AI** to extract structured data from images.

**What it can extract:**
- Merchant name (e.g., "Highlands Coffee")
- Purchase date (e.g., "2026-05-23")
- Total amount in VND
- Individual item prices (optional)
- Category hint (AI guesses the category)

**How to use:**
1. Click **📸 Scan Receipt** in the Expenses view
2. Take a photo of the receipt (or upload from phone)
3. Wait for AI to process (2--3 seconds)
4. Review and correct any errors
5. Click **Confirm** to save

**⚠️ Important: AI Rate Limits (See Below)**

---

### Expense Categorization

When you add an expense or scan a receipt, BudgetBuddy automatically suggests a category:

**Available Categories:**
- 🍔 Food & Drink (phở, coffee, groceries)
- 🚐 Transport (Grab, bus, parking)
- 🏠 Housing (rent, utilities, internet)
- 📚 Education (tuition, books, courses)
- ⚕️ Health (medicine, gym, clinic)
- 🎮 Entertainment (movies, games, books)
- 🛍️ Shopping (clothes, electronics)
- 💆 Personal Care (haircut, skincare)
- ✈️ Travel (flights, hotels, tours)
- 💾 Savings (transfers to savings account)
- ➕ Other (miscellaneous)

**AI Confidence:**
- **High (✅):** AI is very confident (80%+)
- **Medium (⚠️):** AI is uncertain (50--80%)
- **Low (❌):** AI is guessing (<50%)

You can **always override** the AI's suggestion by manually selecting a category.

---

### AI Insights (Weekly)

Once a week, BudgetBuddy generates personalized insights:

1. Go to **Dashboard** → scroll down to **AI Insights**
2. You'll see 2--3 recommendations, such as:
   - **Spending Pattern:** "You spent 500k on food this week vs 300k last week — trending up!"
   - **Saving Tip:** "Consider cooking at home 3 days next week. Even 1 meal saved = 80k/month!"
   - **Budget Forecast:** "At current pace, you'll spend 6.8M this month (up from 5.2M last month)"

These insights are generated from **your real spending data** and personalized to your behavior.

---

## Budget Management

### Setting Category Budgets

1. Go to **Profile** → **Budget Limits**
2. Click **+ Set Budget for [Category]**
3. Enter:
   - **Monthly Limit:** e.g., 2.000.000 ₫ for Food & Drink
   - **Alert Level:** When to warn you (usually 80% of limit)
4. Click **Save**

**Example Budget Setup:**
```
Food & Drink:    2.000.000 ₫/month
Transport:         500.000 ₫/month
Entertainment:     300.000 ₫/month
Shopping:          400.000 ₫/month
```

### Budget Alerts

When adding an expense that **exceeds the category limit**, you'll see:

```
⚠️ WARNING: Food & Drink budget exceeded!
Current spending: 1.950.000 ₫
Budget limit:     2.000.000 ₫
This expense:       150.000 ₫
→ TOTAL:          2.100.000 ₫ (+100.000 over)

You still want to add it? [Cancel] [Add Anyway]
```

---

### Viewing Budget Progress

1. Go to **Expenses** → click **📊 Budget View**
2. See a visual bar for each category:

```
🍔 Food & Drink
████████░░  80% (1.600.000 / 2.000.000 ₫)  [Green = OK]

🚐 Transport
██████████  100% (500.000 / 500.000 ₫)  [Yellow = At Limit]

🎮 Entertainment
████████████ 120% (360.000 / 300.000 ₫)  [Red = Over Budget]
```

**Colors:**
- 🟢 **Green:** Safe (< 80%)
- 🟡 **Yellow:** Caution (80--100%)
- 🔴 **Red:** Over budget (> 100%)

---

## Reports & Export

### Monthly Reports

1. Go to **Reports** view
2. Select **Month:** (e.g., May 2026)
3. You'll see:
   - **Total Spending:** 5.250.000 ₫
   - **Category Breakdown:** Pie chart + table
   - **Daily Trend:** Line chart showing spending over the month
   - **Budget vs. Actual:** Bar chart for each category

### Exporting Data

1. In the **Expenses** or **Reports** view, click **📥 Export**
2. Choose format:
   - **CSV:** Open in Excel, Google Sheets, etc.
   - **PDF:** Print or email to someone
3. Choose scope:
   - **Personal Only:** Your expenses
   - **Group [Name]:** Specific group expenses
   - **All Expenses:** Everything
4. Choose date range (optional filter)
5. Click **Export**

**CSV Format:**
```
Date,Category,Amount,Note,Merchant,Type
2026-05-23,Food & Drink,125000,Phở,Phở King,Personal
2026-05-23,Transport,45000,Grab home,,Personal
2026-05-20,Food & Drink,300000,Group dinner,Nhà Hàng XYZ,Group
```

**PDF Format:**
- Pretty formatted tables with charts
- Good for sharing or printing
- Includes monthly summary + category breakdown

---

## Profile & Settings

### Managing Your Profile

1. Click the **👤 Profile** icon (top-right)
2. Edit:
   - **Name:** Your display name
   - **Email:** Contact info
   - **Monthly Income:** Expected monthly income (used for forecasts)
   - **Avatar:** Upload a profile photo
   - **Currency:** Vietnamese Dong (default) or other

### AI Metrics (For Evaluation)

1. Go to **Profile** → **AI Metrics**
2. You'll see evaluation scores:
   - **Categorization Accuracy:** Precision, Recall, F1-score per category
   - **Forecast Accuracy:** MAE (Mean Absolute Error) & MAPE for budget predictions
   - **Receipt Parsing:** Success rate for merchant, date, total extraction
   - **User Feedback:** Corrections you've made (used to retrain metrics)

This view is mainly for thesis evaluation but helps you understand AI confidence.

### Changing Password

1. **Profile** → **Security**
2. Enter current password
3. Enter new password (6+ chars)
4. Click **Update Password**

### Logging Out

1. **Profile** → **Logout**
2. You'll be redirected to login screen
3. Your data is **saved locally** — you can log back in anytime

---

## Troubleshooting

### "My expenses disappeared!"

**Likely cause:** You're using a different browser or incognito mode.

**Solution:**
- BudgetBuddy stores data **locally in your browser**
- Chrome, Safari, Firefox, and Edge all have separate local storage
- If you used Firefox but now use Chrome, data isn't visible
- **Always use the same browser** for consistency

### "Receipt scan failed or returned garbage"

**Likely cause:** Blurry image, shadowed receipt, or poor lighting.

**Solution:**
- Take a **clear, flat photo** of the receipt under good lighting
- Avoid shadows and reflections
- Make sure **all text is readable** to you
- If still failing, manually enter the amount and merchant

### "I accidentally deleted an expense"

**Unfortunately:** BudgetBuddy doesn't have an undo feature yet.

**Workaround:**
- Manually re-add the expense
- Use the **Duplicate** feature to speed it up

### "Group expense isn't syncing to my roommate"

**Likely cause:** One person is offline or using a different storage mode.

**Solution:**
- Make sure everyone is using the same **Storage Mode** (Local or Supabase)
- If someone is offline, their device will sync when they go back online
- Refresh the page (Ctrl+R) to force a sync

### "AI is categorizing wrong"

**This is normal!** AI is ~80% accurate on average.

**What you can do:**
- **Correct it:** Click the expense → edit → change category
- **Help train it:** Go to Profile → AI Metrics → provide feedback
- **Disable AI:** Use mock mode (default) for deterministic categorization

### "Offline mode isn't working"

**Likely cause:** Service Worker not installed.

**Solution:**
1. First time: Refresh the page (Ctrl+R)
2. Install the PWA:
   - **Phone:** Tap "Add to Home Screen" or "Install App"
   - **Desktop:** Click the browser's "Install" button
3. Once installed, app works offline (no internet needed)

---

## 🚨 API Rate Limits (IMPORTANT!)

**BudgetBuddy uses Google Gemini API for AI features. Free tier has limits:**

### Gemini API Rate Limits

| Metric | Limit |
|--------|-------|
| **Requests per Minute (RPM)** | 5 |
| **Requests per Day (RPD)** | 20 |

**What counts as a request:**
- Receipt scanning (1 request = 1 image)
- Expense categorization (1 request = AI suggests category)
- Insight generation (1 request = weekly insights)

### ⚠️ DO NOT:

```
❌ Don't upload 100 receipts in 10 minutes (violates 5 RPM limit)
❌ Don't use BudgetBuddy as a "spam scanner" (will hit 20 RPD limit quickly)
❌ Don't share the API key with friends (it's your personal quota)
❌ Don't refresh the receipt scan 10 times in a row (wastes RPD limit)
```

### ✅ DO:

```
✅ Space out receipt uploads (max 5 per minute)
✅ Use the mock AI mode during demos (no API consumption)
✅ Be deliberate when scanning (scan once, review carefully)
✅ If you hit the limit, wait until the next day to continue
```

### What Happens If You Hit the Limit?

```
Error: "Rate limit exceeded. Come back tomorrow!"
```

**Solution:**
- Stop using AI features for the rest of the day
- Try again the next day (quotas reset at midnight UTC)
- Use the deterministic **mock mode** (default) instead

---

## 📱 Mobile Tips

### Responsive Design

BudgetBuddy works great on phones! Layout adapts automatically:

- **Landscape Mode:** Shows sidebar on desktop, bottom nav on mobile
- **Small Screens (< 768px):** Bottom navigation bar
- **Large Screens (> 768px):** Left sidebar

### PWA Installation (Mobile)

**iPhone:**
1. Open Safari → BudgetBuddy URL
2. Tap Share → Add to Home Screen
3. App appears on home screen

**Android:**
1. Open Chrome → BudgetBuddy URL
2. Tap menu (⋮) → Install app
3. App appears on home screen

### Offline Sync on Mobile

Once installed as PWA:
- Works completely offline
- Syncs when WiFi/data returns
- No internet required for basic features

---

## 🔒 Privacy & Security

### Where is My Data Stored?

- **Local Mode (default):** Stored in your browser's localStorage
  - Only you can access it (even BudgetBuddy can't see it)
  - Lost if you clear browser data
  - **Recommended:** Export regularly as backup

- **Supabase Mode:** Stored on Supabase cloud servers
  - Only you can access it (row-level security)
  - Accessible across devices
  - Cloud backup included

### What About Passwords?

- Passwords are **hashed** (not stored as plain text)
- Local mode uses SHA-256 hashing (for development/demo purposes)
- **Supabase mode:** Uses bcrypt + secure protocols

### What About Gemini API?

- Your API key should **NEVER be shared**
- Keep `.env.local` out of version control
- In production, use a **backend proxy** to hide the key

---

## 🚀 Advanced Tips

### Keyboard Shortcuts

- **E** → Go to Expenses
- **G** → Go to Groups
- **R** → Go to Reports
- **/** → Focus search
- **Esc** → Close modals

### Batch Operations

**Export multiple months:**
1. Go to Reports
2. Change date range
3. Export → Choose date range
4. Combine CSV files in Excel

**Recategorize multiple expenses:**
1. Edit one expense → change category
2. Duplicate (Ctrl+D)
3. Repeat 10x
4. Bulk update later

### Custom Categories

For now, categories are fixed. To suggest new categories:
- Fork the GitHub repo
- Modify `src/constants/categories.ts`
- Submit a pull request

---

## 📞 Support & Feedback

### Report a Bug

1. Go to: https://github.com/ZaruITITIU21299/budgetbuddy/issues
2. Click **New Issue**
3. Describe the problem (include screenshots)
4. Submit

### Request a Feature

Same as bug reports, but:
- Title: "Feature Request: [feature name]"
- Describe use case and expected behavior

### Contact the Developer

- **Email:** budgetbuddy.support@hcmiu.edu.vn (if available)
- **GitHub:** Open a discussion
- **Supervisor:** MSc. Lê Thành Sơn (for academic feedback)

---

## 📚 Additional Resources

### Links

- **Live App:** https://budgetbuddy-omega-dun.vercel.app
- **GitHub Repository:** https://github.com/ZaruITITIU21299/budgetbuddy.git
- **Thesis Report:** See `thesis_report.pdf` for technical details

### Further Reading

- [React Documentation](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Gemini API Docs](https://ai.google.dev)
- [PWA Guidelines](https://web.dev/progressive-web-apps/)

---

## ✅ Checklist: Getting Started

Here's a quick checklist to get you fully set up:

- [ ] Open BudgetBuddy at https://budgetbuddy-omega-dun.vercel.app
- [ ] Create your account and log in
- [ ] Explore the Dashboard
- [ ] Add 3 personal expenses manually
- [ ] Set a budget limit for Food & Drink
- [ ] Try scanning a receipt
- [ ] Create a test group with a friend
- [ ] Add a group expense and split it
- [ ] View your AI insights
- [ ] Export a report as CSV/PDF
- [ ] Install as PWA (optional)

---

## 🎉 You're All Set!

Congratulations! You now know how to use BudgetBuddy. Start tracking your expenses, save money, and 
share the app with your roommates!

**Happy budgeting! 💰**

---

## 📝 Document Version

- **Version:** 1.0
- **Last Updated:** May 23, 2026
- **For BudgetBuddy:** v0.0.1 (Pre-Thesis Release)
- **Author:** Nguyễn Thành Tài · ITITIU21299

---

**Questions?** Check the troubleshooting section or open an issue on GitHub.
