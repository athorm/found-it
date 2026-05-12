# FoundIt System Architecture
## Comprehensive Technical Reference

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### 1.1 High-Level Architecture
```
┌──────────────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js 16 App Router)                │
│  React 19 | Tailwind CSS 4 | Framer Motion | Lucide Icons       │
│                                                                  │
│  Pages:  /login  /pending-verification  /Home  /items            │
│          /post   /chat                  /Profile  /admin         │
│                                                                  │
│  Hooks:  useAuthGuard  useAdminGuard                             │
│  Components: NavBar  ItemDetailModal  ItemPostModal              │
│               NotificationDropdown                               │
│              AdminUsersSection                                    │
└───────────────────────┬──────────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────────┐
          │             │                 │
   ┌──────▼──────┐ ┌───▼─────────┐ ┌─────▼──────────┐
   │  Supabase   │ │  API Routes │ │  Supabase      │
   │  Auth       │ │  /api/...   │ │  Realtime      │
   │  (JWT)      │ │  (Server)   │ │  (WebSocket)   │
   └──────┬──────┘ └───┬─────────┘ └─────┬──────────┘
          │            │                  │
   ┌──────▼────────────▼──────────────────▼──────────┐
   │              SUPABASE BACKEND                    │
   │  PostgreSQL 17 | Row-Level Security | Triggers   │
   │  Storage Buckets: items, avatars, verifications  │
   └──────────────────────────────────────────────────┘
```

### 1.2 Tech Stack
| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend Framework | Next.js | 16.2.4 | App Router, SSR, API Routes |
| UI Library | React | 19.2.4 | Component rendering, hooks |
| Styling | Tailwind CSS | 4.x | Utility-first responsive CSS |
| Animations | Framer Motion | 12.38.0 | Transitions, glassmorphism |
| Icons | Lucide React | 1.14.0 | SVG icon library |
| Image Cropping | react-easy-crop | 5.5.7 | Client-side crop before upload |
| BaaS | Supabase | 2.105.1 | Auth, DB, Storage, Realtime |
| SSR Auth | @supabase/ssr | 0.10.2 | Server-side session handling |
| Email Validation & Notifications | Nodemailer | 8.0.7 | MX record verification, ban/unban & moderation alerts |
| Database | PostgreSQL 17 | via Supabase | Relational data, RLS, triggers |

### 1.3 Design Language
- **Theme**: iOS-inspired dark glassmorphism
- **Colors**: Dark charcoal base (#141414), subtle warm radial gradient, orange accent palette (#F97316 → #FB923C)
- **Global Background**: A single fixed `<div>` in `layout.js` renders the gradient behind all pages — eliminates per-page background duplication and prevents visible tiling/seams when scrolling on mobile.
- **Corners**: Rounded (2xl–3xl / 1rem–1.5rem)
- **Glass**: `bg-black/40 backdrop-blur-2xl border border-orange-500/20`
- **Typography**: System font stack (SF Pro / Inter via Tailwind default)

---

## 2. SOFTWARE DESIGN PRINCIPLES

### 2.1 Modularization
The codebase is organized into purpose-driven directories:

| Directory | Responsibility |
|---|---|
| `app/` | Page routes and layouts (Next.js App Router convention) |
| `app/api/` | Server-side API route handlers (admin ops, chat creation) |
| `components/` | Reusable UI components shared across pages |
| `hooks/` | Custom React hooks for cross-cutting concerns (auth, admin) |
| `lib/` | Supabase client initialization and configuration |
| `utils/` | Pure helper functions (image cropping, formatting) |
| `public/` | Static assets (logo, favicon) |

### 2.2 High Cohesion
Each module performs a single, well-defined function:
- `useAuthGuard.js` — ONLY checks auth session + verification status
- `useAdminGuard.js` — ONLY extends auth guard with admin role check
- `NavBar.js` — ONLY renders navigation + unread message badge + notification bell badge
- `ItemDetailModal.js` — ONLY displays item details + owner actions
- `ItemPostModal.js` — ONLY handles image source selection (camera/gallery)
- `AdminUsersSection.js` — ONLY manages user verification in the admin panel

### 2.3 Low Coupling
- Pages access the database exclusively through `lib/supabase.js` (client) or `lib/supabaseAdmin.js` (server) — never direct SQL from components
- Admin-privileged operations route through `/api/admin/` endpoints, keeping the service-role key server-side
- Components communicate via props and callbacks, not shared global mutable state
- The `useAuthGuard` → `useAdminGuard` chain uses composition, not inheritance
+
+### 2.4 Data Management (CRUD Operations)
+The system's data lifecycle is governed by the CRUD paradigm, ensuring that every entity (Items, Profiles, Chats, Messages, Reports) is managed through standardized operations:
+
+| Entity | Create | Read | Update | Delete |
+|---|---|---|---|---|
+| **Items** | `/post` page | `/items` grid | Resolution Toggle | `deleteItem()` |
+| **Profiles** | `/login` (Sign Up) | `/Profile` page | Avatar/Password | `deleteAccount()` |
+| **Chats** | `/api/chats` | Chat List | Resolution Flags | `deleteChat()` |
+| **Messages** | `sendMessage()` | Realtime Hook | `markAsRead()` | Cascade Deletion |
+| **Reports** | `/api/report-user` | Admin Dashboard | Status Update | Admin Delete |
+
---

## 3. PAGE-BY-PAGE ARCHITECTURE

### 3.1 Login Page — `/app/login/page.js`

**What it does:** Handles both Sign Up and Sign In for all users. This is the entry point for unauthenticated visitors.

**Sign Up Flow:**
1. User provides full name, student number (0000-0000 format), email, and password
2. User uploads a verification document (COR or Student ID) — JPEG, PNG, or PDF up to 5 MB
3. The email is validated via the `/api/validate-email` endpoint (MX record check)
4. `supabase.auth.signUp()` creates the auth.users record
5. A PostgreSQL trigger (`handle_new_user`) auto-creates a `profiles` row
6. The verification document is uploaded to Supabase Storage via `/api/upload-verification`
7. The profile's `verification_status` is set to `'pending'`
8. User is redirected — `useAuthGuard` will send them to `/pending-verification`

**Sign In Flow:**
1. User enters student number OR email + password
2. If student number is provided, the system looks up the corresponding email from `profiles`
3. `supabase.auth.signInWithPassword()` authenticates the user
4. On success, redirected to `/Home` (if verified) or `/pending-verification` (if not)

**Design:** Tabbed form (Sign In / Sign Up) with glassmorphic card, orange gradient submit button, FoundIt logo at top.

---

### 3.2 Pending Verification Page — `/app/pending-verification/page.js`

**What it does:** A holding page for users whose `verification_status` is not `'approved'`. Users cannot access any other page until an admin approves their identity document.

**Two states displayed:**
- **Pending** (yellow): "Your verification is under review" — user waits
- **Rejected** (red): Shows the rejection reason from the admin + allows document re-upload

**Re-upload flow:** User selects a new file → uploads via `/api/upload-verification` → status resets to `'pending'`

**Design:** Centered card with status icon (Clock or XCircle), status badge, and action buttons (Refresh / Log Out). Dark gradient background.

---

### 3.3 Home Page — `/app/Home/page.js`

**What it does:** The landing hub for verified users. Provides quick access to search, category browsing, and a recently reported items feed.

**Key sections:**
1. **Header**: FoundIt logo + greeting ("Welcome back") + subtitle
2. **Search Bar**: Real-time search input that navigates to `/items?search={query}` on submit
3. **Category Chips**: Horizontally scrollable, draggable chip row (Electronics, Keys, Bags, Documents, Clothing, Accessories, Others). Clicking navigates to `/items?itemCategory={type}`
4. **Recently Reported Feed**: Horizontal scroll of the 6 most recently approved items (fetched with `moderation_status = 'approved'`, ordered by `created_at DESC`). Each card shows the item image, title (with marquee animation for long text), and category badge
5. **Info Modal**: An (i) button opens a modal explaining how the system works for new users

**Protected by:** `useAuthGuard` — redirects to `/login` if no session, or `/pending-verification` if unverified

**Design:** Full-height dark background with glassmorphic elements, orange accents, Framer Motion entrance animations.

---

### 3.4 Items Page — `/app/items/page.js`

**What it does:** The main browse/discovery interface. Displays all approved (moderated) found and lost items with powerful filtering and dual view modes.

**Features:**
- **Header**: Compact topbar with FoundIt `logo2.svg` (neon glow effect) on the left and a single animated view-mode toggle on the right.
- **View Toggle**: A single square button swaps between Grid and List icons with a Framer Motion rotate/scale animation (`AnimatePresence mode="wait"`). Preference saved to `localStorage`.
- **Tabs**: "Found" and "Lost" toggle between `category = 'Found'` and `category = 'Lost'`
- **Cursor-Based Pagination**: Items load in batches of 12. An `IntersectionObserver` on a sentinel element triggers the next page fetch using the `created_at` cursor. Tab/filter changes reset pagination.
- **Filters** (applied simultaneously):
  - Item Category: Electronics, Keys, Bags, Documents, Clothing, Accessories, Others
  - Location: Shed, Activity Center, ER Bldg, ENB Bldg, Volleyball Court, Basketball Court, Admin Bldg, Quadrangle
  - Status: Unclaimed / Claimed (maps to Active / Resolved in DB)
  - Date Range: Custom date range picker component
- **Search**: Text search on title, description, and item category
- **My Posts**: Toggle to show only items posted by the current user (bypasses pagination)
- **Item Click**: Opens `ItemDetailModal` with full details
- **Bottom Padding**: `pb-40` on main ensures the last item card is not occluded by the fixed NavBar

**Data query:** Fetches from `items` table with cursor-based pagination (`created_at` cursor, `PAGE_SIZE = 12`), filtered by the active tab's category, with optional filters applied client-side via `applyFilters()`.

**Design:** Filter chips with horizontal drag-scroll, grid cards with glassmorphic backgrounds, orange category badges, location tags, marquee animation for long titles.

---

### 3.5 Post Page — `/app/post/page.js`

**What it does:** Multi-step form for reporting a found or lost item.

**Flow:**
1. User arrives with a pre-selected image (passed via `ItemPostModal` from any page's "+" button)
2. Image is displayed with a crop tool (`react-easy-crop`) — user can adjust the crop area
3. User fills in: Title, Description, Category (Found/Lost dropdown), Item Category (type), Location Tag (campus area dropdown)
4. On submit:
   - Image is cropped on the client side using canvas
   - Cropped image is uploaded to Supabase Storage bucket `items`
   - A new row is inserted into `items` with `moderation_status = 'pending'` and `status = 'Active'`
   - A success toast appears and user is redirected to `/items`

**The post does NOT appear publicly until an admin approves it** from the Admin Dashboard.

**Design:** Full-screen form with image preview at top, glassmorphic form fields, orange gradient submit button.

---

### 3.6 Chat Page — `/app/chat/chat.js`

**What it does:** Real-time private messaging between item posters and interested users. Manages both the conversation list and individual chat threads.

**Dual-view architecture:**
- **Conversation List**: Shows all chats where the user is either `finder_id` or `claimer_id`. Each row shows the other user's avatar, name, item title, and last message preview (with "You:" prefix for own messages)
- **Active Chat**: Full message thread with real-time delivery

**Real-time implementation:**
- Uses Supabase Realtime `postgres_changes` channel on the `messages` table
- Messages from the sender appear immediately (optimistic rendering with deduplication by `nonce`)
- Messages from the other party appear via the realtime subscription
- Chat status changes (resolution confirmations) also trigger UI updates

**Features:**
- **Image Sharing:** Users can upload images via camera/gallery to Supabase Storage, displayed seamlessly in the chat.
- **Profanity Filter:** Client-side filtering blocks inappropriate messages based on a JSON word list before they are sent.
- **AI Text Moderation:** Server-side toxicity screening via `martin-ha/toxic-comment-model` (English) through the Hugging Face Router API (`router.huggingface.co`). Messages flagged above the confidence threshold are retroactively deleted and the user is warned. An emergency keyword blocklist provides instant blocking for obvious threats in both English and Tagalog.
- **AI Image Moderation:** Before any image is sent in chat, it is screened by the `Falconsai/nsfw_image_detection` model. Inappropriate images are blocked with a styled warning modal before they are uploaded.

**Resolution flow:**
- Either user can tap "Mark as Resolved" (or "Mark as Found" for lost items)
- This updates `finder_confirmed_resolved` or `claimer_confirmed_resolved` in the `chats` table
- A PostgreSQL trigger (`trg_auto_resolve_item`) fires on each update — when BOTH flags are true, it automatically sets `items.status = 'Resolved'` and `chats.status = 'resolved'`
- A confirmation banner appears and messaging is disabled

**Chat deletion:** The item poster (finder) can delete a conversation, which cascades to delete all messages in that chat.

**Design:** iOS-style message bubbles (orange for self, dark for other), glassmorphic conversation list cards, resolution confirmation bar at top of chat.

---

### 3.7 Profile Page — `/app/Profile/page.js`

**What it does:** Displays the user's identity and provides account management actions.

**Displayed info:** Full name, student number, email, avatar photo

**Actions available:**
- **Upload Avatar**: Select image → upload to Supabase Storage bucket `avatars` → update `profiles.avatar_url`
- **Change Password**: Opens a modal with two password inputs (New + Confirm). Both fields have an **Eye/EyeOff visibility toggle** button inside them. Validates minimum 6 characters and matching passwords before calling `supabase.auth.updateUser()`. Visibility state resets when modal closes.
- **Delete Account**: Calls `/api/account` with DELETE method — removes auth.users entry (cascades to profile)
- **Log Out**: `supabase.auth.signOut()` → redirect to `/login`
- **Admin Dashboard** (admin users only): Button visible when `profiles.role === 'admin'`, links to `/admin`

**Loading state:** Uses `min-h-[100dvh]` so the spinner is perfectly centered in the viewport regardless of mobile browser chrome.

**Design:** Centered profile card with large avatar, glassmorphic info fields, action buttons with red delete styling.

---

### 3.8 Admin Dashboard — `/app/admin/page.js`

**What it does:** Desktop-optimized moderation panel for admin users. Provides full control over item moderation and user account management.

**Protected by:** `useAdminGuard` — checks both authentication AND admin role via `/api/admin/verify`. Non-admins are redirected to `/Home`.

**Two sections (tabbed):**

#### Posts Management
- **Stat Cards**: Live counts of Pending, Approved, Rejected, and Total items
- **Filters**: Category (Found/Lost), Resolution Status, Item Category, Location, Date Range, Search
- **Item Grid**: All items (including pending/rejected) displayed as cards with status badges
- **Per-item actions**: Approve, Reject (with reason modal), Delete
- **Batch actions**: Select multiple → Approve All, Reject All, Delete All
- **Re-approval**: Previously rejected items can be re-approved; approved items can be revoked

#### Users Management (`AdminUsersSection.js`)
- **User List**: All registered users with their verification status
- **Actions**: Approve verification, Reject verification (with reason), Ban/Unban users, Delete user account
- **Verification doc preview**: Admin can view the uploaded COR/Student ID before deciding
- **Search**: Filter users by name or student number

#### User Reports Management
- **Reports Dashboard**: Review user reports with tabs for For Review, Dismissed, and Valid.
- **Actions**: Dismiss reports, mark as valid, or mark as valid + ban user.
- **Chat Context**: Detail modal shows the reporter, the reason, and the full chat context with sender profile labels to determine fault.

**All admin mutations** go through server-side API routes (`/api/admin/`) that use the `SUPABASE_SERVICE_ROLE_KEY` — the anon key's RLS policies prevent these operations from the client.

**Moderation Workflow Enhancements:**
- **Premade Reason Chips**: Admin modals (Reject, Ban, Unban) now feature clickable chips for common violations, ensuring consistency and speed.
- **Context-Aware Batch Actions**: The batch action bar dynamically filters available actions (Approve/Reject/Unban) based on the active moderation tab.
- **Automated Email Notifications**: Critical moderation actions (Ban, Unban, Verification Approval/Rejection) trigger automated emails to users explaining the decision and providing relevant reasons.

#### AI Moderation Logs
- **AI Logs Dashboard**: Dedicated tab displaying all AI-flagged content with user info, content type, model used, and action taken.
- **Batch Review Actions**: Select multiple AI logs and batch Confirm (content is harmful), Dismiss (false positive), or Delete. Confirm/Dismiss buttons are context-aware — only visible on Flagged, Unreviewed, and All tabs.
- **Single-Entry Review**: Each flagged card also has inline Confirm/Dismiss buttons for quick individual review.

**Design:** Desktop-optimized grid layout with sidebar filters, stat dashboard at top, glassmorphic cards throughout.

---

## 4. REUSABLE COMPONENTS

### 4.1 NavBar — `/components/NavBar.js`
**Purpose:** Bottom navigation bar visible on all authenticated pages (mobile-first).

**Five navigation items in the bar:**
| Icon | Label | Route | Notes |
|---|---|---|---|
| Search | Explore | /Home | |
| Tag | Items | /items | |
| Plus | Post | — | Opens `ItemPostModal`, doesn't navigate |
| MessageCircle | Chat | /chat | Shows unread message badge (red dot) |
| User | Profile | /Profile | |

**Notification Bell (FAB):** The Bell icon is a separate floating action button positioned at `fixed bottom-[112px] right-10` — above the NavBar. This keeps the NavBar symmetric (5 items) while giving notifications a prominent, always-accessible position. Shows unread count badge.

**Plus button border:** Uses `border-[#431407]` for a rich, dark burnt-orange border that provides high contrast while staying within the orange color palette.

**Unread message badge:** Queries `messages` table for `is_read = false AND receiver_id = current_user` — displays count on Chat icon.

**Notification badge:** Queries `notifications` table for `is_read = false AND user_id = current_user`. Uses Supabase Realtime (`postgres_changes` INSERT) to increment the badge count instantly when a new notification is created.

**Admin button:** On desktop viewports (≥1024px), admin users see an "Admin View" button floating above the NavBar's left side.

**Design:** Fixed bottom bar with glassmorphism (`bg-black/50 backdrop-blur-2xl`), orange accent for active state, elevated "+" button in the center.

### 4.1.1 NotificationDropdown — `/components/NotificationDropdown.js`
**Purpose:** Glassmorphic dropdown panel that renders above the NavBar when the Bell FAB is tapped.

**Features:**
- Lists the 20 most recent notifications for the current user (ordered by `created_at DESC`)
- Unread items have an orange left border + dot indicator
- Click notification → marks as read + navigates to related item
- "Mark all as read" button clears all unread badges
- Auto-closes on outside click
- Relative time formatting ("Just now", "5m ago", "2h ago", "3d ago")
- **Swipe right to delete**: Drag a notification right >80px to delete it instantly
- **Long-press multi-select** (500ms hold): Enters selection mode where notifications get checkboxes. Header swaps to show selected count + batch Delete button. A "Select all / Deselect all" bar slides in. Select mode exits cleanly on cancel or after batch delete.
- **Animated reflow**: Deleted items animate out with `height: 0` via `AnimatePresence` + `motion.div layout` — remaining notifications smoothly slide up to fill the gap
- Hint bar at bottom: *"Long press to select • Swipe right to delete"*

**Notification types:** `item_approved`, `item_rejected`, `item_resolved` — each with a distinct icon (CheckCircle, XCircle, Package).

### 4.2 ItemDetailModal — `/components/ItemDetailModal.js`
**Purpose:** Full-screen overlay showing complete item details when any item card is tapped.

**Displays:** Item image (with lightbox zoom on tap), title, description, location tag, status badge, category badge, poster's avatar + name + email, and post date.

**Actions:**
- **"Contact Owner"** — creates or retrieves a chat via `/api/chats` and navigates to the conversation
- **"Mark as Claimed/Unclaimed" (owner only)** — toggles `items.status` between `Active` and `Resolved`. **Disabled (grayed out + cursor-not-allowed) when `moderation_status !== 'approved'`** — pending and rejected posts cannot have their status changed.
- **"Delete" (owner only)** — deletes the item + cascading chats/messages
- Self-messaging is prevented (button hidden for own items)
- Items that are `Resolved` show a locked banner instead of the contact button

**Loading state:** Shows a skeleton loader while fetching the poster's profile data to prevent stale data from previous items.

> The same `moderation_status` guard also applies to the standalone item detail page at `/app/items/[id]/page.js`.

### 4.3 ItemPostModal — `/components/ItemPostModal.js`
**Purpose:** Popup that appears when the "+" button is tapped. Offers two image source options.

**Options:**
- 📷 Camera — triggers `<input capture="environment">` for mobile camera
- 🖼️ Gallery — triggers standard file picker

**After selection:** The file is passed to the parent via `onFileSelect(file)`, which navigates to `/post` with the image data.

### 4.4 AdminUsersSection — `/components/AdminUsersSection.js`
**Purpose:** The "Users" tab content within the Admin Dashboard.

**Displays:** All profiles with their verification status (pending/approved/rejected), verification document preview link, and action buttons.

**Actions:** Approve, Reject (with reason input), Delete Account — all via server-side admin API routes.

---

## 5. HOOKS

### 5.1 useAuthGuard — `/hooks/useAuthGuard.js`
**Purpose:** Protects all authenticated routes. Used by every page except `/login` and `/pending-verification`.

**Logic:**
1. Checks `supabase.auth.getSession()` — if no session → redirect to `/login`
2. Fetches `profiles.verification_status` — if not `'approved'` → redirect to `/pending-verification`
3. Listens for `onAuthStateChange` — reacts to logout in other tabs
4. Returns `{ user, authLoading }`

### 5.2 useAdminGuard — `/hooks/useAdminGuard.js`
**Purpose:** Extends `useAuthGuard` with admin role verification. Used only by `/admin`.

**Logic:**
1. Calls `useAuthGuard()` internally — gets auth + verification check for free
2. Calls `/api/admin/verify` — server-side check that `profiles.role === 'admin'`
3. If not admin → redirect to `/Home`
4. Returns `{ user, isAdmin, guardLoading }`

**Composition pattern:** `useAdminGuard` composes `useAuthGuard` rather than duplicating its logic — a clear example of low coupling and code reuse.

---

## 6. API ROUTES

### 6.1 POST /api/chats — Chat Creation [CREATE/READ]
**File:** `app/api/chats/route.js`
**Purpose:** Creates a new chat or returns an existing one for a given item + user pair.
...
### 6.2 GET /api/admin/verify — Admin Role Check [READ]
**File:** `app/api/admin/verify/route.js`
...
### 6.3 GET|PATCH|DELETE /api/admin/items — Item Moderation [READ/UPDATE/DELETE]
**File:** `app/api/admin/items/route.js`
**Purpose:** Full CRUD for admin item moderation.
...
### 6.4 GET|PATCH|DELETE /api/admin/users — User Management [READ/UPDATE/DELETE]
**File:** `app/api/admin/users/route.js`
...
### 6.5 POST /api/admin/ban-user — User Suspension [UPDATE]
**File:** `app/api/admin/ban-user/route.js`
...
### 6.6 GET|PATCH|DELETE /api/admin/reports — Report Management [READ/UPDATE/DELETE]
**File:** `app/api/admin/reports/route.js`
...
### 6.7 POST /api/report-user — User Reporting [CREATE]
**File:** `app/api/report-user/route.js`
...
### 6.8 POST /api/upload-verification — Document Upload [CREATE/UPDATE]
**File:** `app/api/upload-verification/route.js`
...
### 6.9 POST /api/validate-email — Email MX Validation [READ]
**File:** `app/api/validate-email/route.js`
...
### 6.10 DELETE /api/account — Account Self-Deletion [DELETE]
**File:** `app/api/account/route.js`

---

## 7. DATABASE SCHEMA

### 7.1 profiles
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  student_number TEXT UNIQUE,
  email TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  verification_status TEXT DEFAULT 'pending',
  verification_doc_url TEXT,
  verification_rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 items
```sql
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  category TEXT,
  item_category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  location_tag TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'Active',
  moderation_status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 chats
```sql
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id),
  finder_id UUID REFERENCES profiles(id),
  claimer_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'open',
  finder_confirmed_resolved BOOLEAN DEFAULT FALSE,
  claimer_confirmed_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.4 messages
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  item_id UUID,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.6 notifications
```
id              UUID PK (gen_random_uuid)
user_id         UUID FK → profiles.id (NOT NULL, CASCADE)
type            TEXT NOT NULL   -- 'item_approved' | 'item_rejected' | 'item_resolved'
title           TEXT NOT NULL   -- e.g. "Post Approved ✅"
body            TEXT NOT NULL   -- e.g. "Your item 'Blue Wallet' has been approved"
related_item_id UUID FK → items.id (SET NULL)
is_read         BOOLEAN (false)
created_at      TIMESTAMPTZ (now())
```
**Indexes:** `idx_notifications_user_id` (user_id), `idx_notifications_unread` (user_id, is_read) partial WHERE is_read = FALSE.
**Realtime:** Added to `supabase_realtime` publication for instant badge updates.

### 7.7 Database Triggers
```sql
-- Auto-create profile on new auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, student_number, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'student_number',
          NEW.email);
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Auto-resolve item when both chat parties confirm
CREATE OR REPLACE FUNCTION public.auto_resolve_item_on_chat_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.finder_confirmed_resolved = TRUE
     AND NEW.claimer_confirmed_resolved = TRUE THEN
    UPDATE public.items SET status = 'Resolved'
    WHERE id = NEW.item_id;
    NEW.status := 'resolved';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Auto-notify item owner when both parties confirm resolution
CREATE OR REPLACE FUNCTION public.notify_on_item_resolved()
RETURNS TRIGGER AS $$
DECLARE v_item RECORD;
BEGIN
  IF NEW.finder_confirmed_resolved = TRUE
     AND NEW.claimer_confirmed_resolved = TRUE
     AND (OLD.finder_confirmed_resolved = FALSE OR OLD.claimer_confirmed_resolved = FALSE)
  THEN
    SELECT id, title, user_id INTO v_item FROM public.items WHERE id = NEW.item_id;
    IF v_item.id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, related_item_id)
      VALUES (v_item.user_id, 'item_resolved', 'Item Retrieved ✅',
              'Your item "' || COALESCE(v_item.title, 'Untitled') || '" has been successfully retrieved!',
              v_item.id);
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

---

## 8. SECURITY

### 8.1 Row-Level Security (RLS)
All tables have RLS enabled. Key policies:
- **profiles**: All authenticated users can read. Only the profile owner can update.
- **items**: All authenticated users can read approved items. Only the owner can update/delete.
- **chats**: Only participants (finder_id or claimer_id) can read their chats.
- **messages**: Only the sender or receiver can read messages.
- **notifications**: Users can SELECT and UPDATE only their own notifications. No client-side INSERT — only the server (service role) can create notifications.

### 8.2 Server-Side Admin Operations
Admin mutations (user deletion, role verification) use the `SUPABASE_SERVICE_ROLE_KEY` — this key bypasses RLS and is NEVER exposed to the client. It is only used in `/api/admin/` route handlers.

### 8.3 Environment Variables
```env
# Client-safe (NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_SUPABASE_URL=https://xtqwneuwytxrlepuiyjj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-only (no NEXT_PUBLIC_ prefix)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 9. DIRECTORY STRUCTURE
```
found-it/
├── app/
│   ├── layout.js                       # Root layout — global fixed background, font loading
│   ├── globals.css                     # Global styles, scrollbar, marquee animation
│   ├── page.js                         # Root redirect → /login
│   ├── login/page.js                   # Auth (Sign In / Sign Up) with password toggle
│   ├── pending-verification/page.js    # Verification gate
│   ├── banned/page.js                  # Banned user landing page
│   ├── Home/page.js                    # Landing hub — greeting, search, categories, recent feed
│   ├── items/page.js                   # Browse & filter items — infinite scroll, animated view toggle
│   ├── post/page.js                    # Post new item — image crop, form
│   ├── chat/chat.js                    # Real-time messaging — image sharing, profanity filter
│   ├── Profile/page.js                 # User profile — avatar, password, delete account
│   ├── admin/page.js                   # Admin dashboard — posts, users, reports
│   └── api/
│       ├── account/route.js            # Account self-deletion
│       ├── chats/route.js              # Chat creation / retrieval
│       ├── report-user/route.js        # User reporting from chat
│       ├── upload-verification/route.js # COR/Student ID upload
│       ├── validate-email/route.js     # Email MX record validation
│       └── admin/
│           ├── verify/route.js         # Admin role check
│           ├── items/route.js          # Item moderation (GET/PATCH/DELETE)
│           ├── users/route.js          # User management (GET/PATCH/DELETE)
│           ├── ban-user/route.js       # Ban/Unban with email notification
│           ├── reports/route.js        # Report management (GET/PATCH/DELETE)
│           └── ai-logs/route.js       # AI moderation logs (GET/PATCH/DELETE)
├── components/
│   ├── NavBar.js                       # Bottom nav + notification bell FAB
│   ├── NotificationDropdown.js         # In-app notification center dropdown
│   ├── ItemDetailModal.js              # Item detail overlay
│   ├── ItemPostModal.js                # Image source picker (camera/gallery)
│   ├── AdminUsersSection.js            # Admin user management tab
│   ├── CustomDateRangePicker.js        # Reusable date range picker
│   ├── MarqueeTitle.js                 # Auto-scrolling text for long titles
│   ├── ClientShell.js                  # Client-side provider wrapper
│   └── SupabaseErrorBoundary.js        # Error boundary for Supabase errors
├── hooks/
│   ├── useAuthGuard.js                 # Route protection (auth + verification + ban)
│   └── useAdminGuard.js                # Admin route protection
├── lib/
│   ├── supabase.js                     # Client-side Supabase instance
│   ├── supabaseAdmin.js                # Server-side Supabase (service role)
│   ├── mailer.js                       # Nodemailer email functions (ban/unban/verification)
│   └── ai.js                           # HuggingFace AI moderation (image NSFW + text toxicity)
├── utils/
│   ├── cropImage.js                    # Canvas-based image crop utility
│   └── profanityFilter.js             # Client-side profanity checking
└── public/
    ├── logo2.svg                       # FoundIt logo (SVG, neon glow)
    ├── profanity-list.json             # Curated blocked word list
    └── favicon.ico
```

---

## 10. KNOWN LIMITATIONS & FUTURE ROADMAP

### Current Limitations
1. Single Campus Only — designed specifically for one LSPU campus without multi-campus support.
2. **Async Text Moderation Delay** — AI text moderation runs asynchronously *after* the message is sent. There is a 1–3 second window where a flagged message may be visible to the recipient before being retroactively deleted. The local profanity filter covers most obvious cases instantly.
3. **Tagalog AI Model Unavailable** — The Tagalog hate speech model (`ggpt1006/tl-hatespeech-detection`) is no longer supported on the new HuggingFace Router API (`router.huggingface.co`). Tagalog profanity is handled by the local word list and emergency keyword blocklist instead.
4. **HuggingFace Free Tier** — AI models run on HuggingFace's free inference tier, which may experience cold start delays (10–20 seconds) after periods of inactivity.

### Successfully Implemented Enhancements (Priority 3.5 & Below)
- **AI-Powered Content Moderation** *(Updated)*: Integrates HuggingFace's Router API (`router.huggingface.co/hf-inference`) with two AI models: `Falconsai/nsfw_image_detection` for NSFW image screening and `martin-ha/toxic-comment-model` for English toxicity detection. An emergency keyword blocklist provides instant blocking of obvious threats in both English and Tagalog. Features a fail-open architecture with retry logic for model cold starts. Moderation spans post uploads, avatar updates, verification documents, and real-time chat messages/images.
- **Admin AI Logs Dashboard** *(Updated)*: Admins have a dedicated "AI Logs" section with filter tabs (Flagged, Unreviewed, Confirmed, Dismissed, All). Supports batch Confirm, Dismiss, and Delete actions. Cards display user info, content type, model used, and admin review status.
- **Inappropriate Image Warning Modal** *(NEW)*: When AI detects an inappropriate image in chat, a styled red-themed modal with a ShieldAlert icon is shown instead of a browser alert, matching the profanity warning design.
- **In-App Notification Center**: Bell icon in NavBar with real-time badge powered by Supabase Realtime `postgres_changes`. Notifications are created when admin approves/rejects posts and when items are resolved. Uses a dedicated `notifications` table with RLS and a PostgreSQL trigger (`trg_notify_item_resolved`).
- **Cursor-Based Pagination** *(NEW)*: Items page loads in batches of 12 using `created_at` cursor. `IntersectionObserver` triggers infinite scroll. Tab/filter changes reset pagination. "My Posts" mode bypasses pagination.
- **User Reporting & Ban System**: Admins can review reports with full chat context and issue bans with premade reasons.
- **Automated Moderation Emails**: Branded Nodemailer emails sent for account verification and ban/unban events.
- **In-Chat Image Sharing**: Users can upload and share photos within private chats.
- **Profanity Filter**: Real-time blocking of inappropriate messages using a local JSON word list.
- **Dynamic Home Greetings**: Context-aware greetings based on the time of day.
- **Admin Mobile Optimization**: Responsive adjustments allowing admins to manage the platform from mobile devices.
- **Context-Aware Admin Modals**: Batch action bars dynamically update available options based on the active moderation tab.

---

## End of Architecture Document
