# FoundIt System Architecture
## Senior System Developer Analysis

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### 1.1 High-Level Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 16)                        │
│  App Router | React 19 | Tailwind CSS | Framer Motion           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ├─── Authentication Layer
                       │    └─ Supabase Auth
                       │
                       ├─── API Layer (Route Handlers)
                       │    └─ /api/chats/route.js
                       │
                       └─── Data Layer
                            ├─ Supabase Client (@supabase/ssr)
                            └─ Supabase Admin (Server-side)
                            
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Supabase/PostgreSQL)                 │
│  Authentication | Database | Real-time Subscriptions | Storage  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Tech Stack Specifications
| Layer                  | Technology      | Version    | Purpose                           |
| ---------------------- | --------------- | ---------- | --------------------------------- |
| **Frontend Framework** | Next.js         | 16.2.4     | App Router, SSR/SSG, API Routes   |
| **UI Library**         | React           | 19.2.4     | Component rendering, hooks        |
| **Styling**            | Tailwind CSS    | 4          | Utility-first CSS                 |
| **Animations**         | Framer Motion   | 12.38.0    | Smooth transitions, glassmorphism |
| **Icons**              | Lucide React    | 1.14.0     | Consistent icon library           |
| **Image Crop**         | react-easy-crop | 5.5.7      | Image editing before upload       |
| **Database**           | PostgreSQL      | (Supabase) | Relational data storage           |
| **BaaS**               | Supabase        | 2.105.1    | Auth, DB, Storage, Real-time      |
| **SSR Support**        | @supabase/ssr   | 0.10.2     | Server-side auth handling         |

---

## 2. COMPONENT ANALYSIS & FUNCTIONALITY

### 2.1 Page Routes & Components

#### **A. Authentication & Onboarding**
**File:** `/app/login/page.js`
```
Responsibility: User authentication and account management
├─ Sign Up Flow
│  ├─ Accepts: Full Name, Student Number (0000-0000), Email, Password
│  ├─ Creates: auth.users entry in Supabase Auth
│  ├─ Auto-authenticates user after signup
│  └─ Redirects to /Home on success
│
├─ Sign In Flow
│  ├─ Accepts: Student Number OR Email, Password
│  ├─ Resolves: Student Number → Email lookup from profiles table
│  ├─ Authenticates: Via supabase.auth.signInWithPassword()
│  └─ Redirects to /Home on success
│
└─ Error Handling: Displays user-friendly error messages
```

#### **B. Home/Explore Page**
**File:** `/app/Home/page.js`
```
Responsibility: Landing page for authenticated users
├─ Features
│  ├─ Hero Title: "FoundIt"
│  ├─ Search Bar (placeholder for future search integration)
│  ├─ Item Post Modal Trigger
│  └─ Navigation Bar (bottom fixed)
│
└─ Purpose: Central hub for navigation
```

#### **C. Items Management Page**
**File:** `/app/items/page.js` + `/app/items/[id]/page.js`
```
Responsibility: Browse, filter, and view found/lost items
├─ Views
│  ├─ Grid View: Card-based item layout
│  ├─ List View: Compact item listings
│  └─ Toggle UI State
│
├─ Tabs
│  ├─ "Found" Items: Category filter
│  └─ "Lost" Items: Category filter
│
├─ Filters (Applied Simultaneously)
│  ├─ Location Filter: [All, Shed, Activity Center, ER Bldg, ENB Bldg, etc.]
│  ├─ Status Filter: [All, Unclaimed, Claimed]
│  └─ Search Query: Title/description text search
│
├─ Features
│  ├─ My Posts Toggle: View user's own items only
│  ├─ Item Click → Detail Modal
│  ├─ Real-time status updates
│  └─ Item deletion (owner only)
│
└─ Database Queries
   ├─ Fetch items by category
   ├─ Filter by location_tag
   ├─ Filter by status (Active/Resolved mapping)
   └─ Apply text search on title
```

#### **D. Item Posting Page**
**File:** `/app/post/page.js`
```
Responsibility: Create and post found/lost items
├─ Steps
│  ├─ 1. Image Selection (Camera/Gallery via ItemPostModal)
│  ├─ 2. Image Cropping (react-easy-crop integration)
│  ├─ 3. Form Entry: Title, Description, Category, Location
│  └─ 4. Submit & Upload (Supabase Storage + DB)
│
├─ Image Processing
│  ├─ Capture: Camera or gallery file selection
│  ├─ Crop: Custom cropper component
│  ├─ Upload: To Supabase storage bucket 'items'
│  ├─ Public URL: Generated for display
│  └─ Database Store: image_url in items table
│
├─ Form Inputs
│  ├─ Title (text): Item name/description
│  ├─ Description (textarea): Details about item
│  ├─ Category (dropdown): "Found" or "Lost"
│  ├─ Location Tag (dropdown): Campus location
│  └─ Specific Location (optional text): Custom details
│
├─ Validation
│  ├─ Required fields check
│  ├─ Image selection mandatory
│  └─ Character limits
│
└─ On Success
   ├─ Insert row into items table
   ├─ Set status = 'Active' (default)
   ├─ Set user_id = current auth user
   └─ Redirect to /items
```

#### **E. Chat/Messaging Page**
**File:** `/app/chat/chat.js`
```
Responsibility: Real-time chat between item finder and claimer
├─ Dual Views
│  ├─ List View: All conversations
│  └─ Chat View: Active conversation messages
│
├─ Conversation List
│  ├─ Shows: Avatar, User Name, Item Title, Last Message
│  ├─ Sorts: By timestamp (newest first)
│  ├─ Displays: "You: ..." prefix for own messages
│  └─ Click → Opens chat view
│
├─ Real-time Subscriptions
│  ├─ Listen for new messages (postgres_changes)
│  ├─ Listen for chat status updates
│  └─ Auto-refresh conversation list
│
├─ Message Sending
│  ├─ Input: Text message
│  ├─ Insert: messages table row
│  ├─ Fields: sender_id, receiver_id, chat_id, item_id, content
│  ├─ Validation: Non-empty message check
│  └─ UI Update: Auto-append to messages list
│
├─ Data Fetching
│  ├─ Chats table: finder_id OR claimer_id = current user
│  ├─ Messages: From chats.messages relationship
│  ├─ Items: Batch fetch for item titles
│  └─ Profiles: Batch fetch for user details (avatar_url, full_name)
│
└─ Database Schema Reference
   └─ chats(id, item_id, finder_id, claimer_id, created_at)
      messages(id, chat_id, sender_id, receiver_id, item_id, content, created_at)
```

#### **F. Profile Page**
**File:** `/app/Profile/page.js`
```
Responsibility: User profile management
├─ Display Fields
│  ├─ Full Name (from profiles.full_name)
│  ├─ Student Number (from profiles.student_number, format: 0000-0000)
│  ├─ Email (from profiles.email)
│  └─ Avatar (from profiles.avatar_url)
│
├─ Avatar Upload
│  ├─ Input: Image file (camera/gallery)
│  ├─ Storage: Supabase 'avatars' bucket
│  ├─ Naming: ${user.id}-${random}.${ext}
│  ├─ Update: profiles.avatar_url with public URL
│  └─ Display: Refresh UI with new avatar
│
├─ Actions
│  ├─ Logout: supabase.auth.signOut() → redirect to /login
│  ├─ Delete Account: Admin API call to remove auth user
│  └─ Delete Conversations: User can delete own chats
│
└─ Purpose: User identity & account management
```

### 2.2 Reusable Components

#### **NavBar Component**
**File:** `/components/NavBar.js`
```
Responsibility: Bottom navigation bar (mobile-first design)
├─ Structure
│  ├─ Fixed Position: bottom-6 left-6 right-6
│  ├─ Glassmorphism: bg-black/50 backdrop-blur-2xl
│  ├─ Border: orange-500/20 theme
│  └─ Z-Index: 50 (above most content)
│
├─ Navigation Icons (5 main routes)
│  ├─ 🔍 Explore (Search) → /Home
│  ├─ 🏷️ Items (Tag) → /items
│  ├─ ➕ Post (Plus) → /post [CENTER BUTTON, elevated]
│  ├─ 💬 Chat (Message) → /chat
│  └─ 👤 Profile (User) → /Profile
│
├─ Features
│  ├─ Active State: Highlighted with orange-400
│  ├─ Hover States: Visual feedback
│  ├─ Plus Button: Special styling (elevated, larger)
│  ├─ Props: activePage, onPlusClick callback
│  └─ Responsive: Scales with screen size
│
└─ Design Pattern: iOS-like bottom tab bar
```

#### **ItemDetailModal Component**
**File:** `/components/ItemDetailModal.js`
```
Responsibility: Full-screen modal for item details and contact
├─ Modal Content
│  ├─ Item Image: Full preview
│  ├─ Title & Description: Item details
│  ├─ Location Tag: Where item was found/lost
│  ├─ Status: Claimed/Unclaimed
│  ├─ Poster Info: Avatar, name, email
│  └─ Timestamps: When posted
│
├─ Actions
│  ├─ Contact Owner Button
│  │  ├─ Check if user is authenticated
│  │  ├─ Prevent self-messaging
│  │  ├─ Query existing chat (avoid duplicates)
│  │  ├─ Create new chat if none exists
│  │  └─ Navigate to /chat?id={chatId}
│  │
│  └─ Owner-Only Actions
│     ├─ Edit Status (unclaimed → claimed)
│     ├─ Delete Item
│     └─ Visibility: Conditional rendering
│
├─ Data Fetching
│  ├─ Poster profile (full_name, email, avatar_url)
│  ├─ Current user context
│  └─ Item ownership check
│
└─ Animations: Framer Motion fade-in on open
```

#### **ItemPostModal Component**
**File:** `/components/ItemPostModal.js`
```
Responsibility: Quick modal for image selection before posting
├─ Presentation
│  ├─ Glassmorphic card: bg-black/70 border-orange-500/30
│  ├─ Modal overlay: Fixed inset-0 z-50
│  └─ Close button (X icon)
│
├─ Options (2 Buttons)
│  ├─ 📷 Camera: Captures from device camera (capture="environment")
│  ├─ 🖼️ Gallery: Selects from device storage
│  └─ Both: accept="image/*"
│
├─ File Handling
│  ├─ Input: <input type="file"> (hidden)
│  ├─ Validation: Single file, image format
│  ├─ Callback: onFileSelect(file)
│  └─ Navigation: Close modal + pass to parent
│
└─ UI Pattern: Modal overlay with dual-button choice
```

---

## 3. DATA FLOW & STATE MANAGEMENT

### 3.1 Authentication Flow
```
1. User visits /login
2. Enters credentials (Sign Up OR Sign In)
3. supabase.auth.signUp() / signInWithPassword()
4. Auth.users entry created/verified
5. Session stored in browser
6. Redirect to /Home (protected route)
7. User ID available globally via supabase.auth.getUser()
```

### 3.2 Item Post Flow
```
1. Click "+" button → ItemPostModal appears
2. Select Camera/Gallery → File input triggered
3. File selected → Preview URL generated
4. Navigate to /post?preview={url}
5. User fills form (title, desc, category, location)
6. Image cropped (optional)
7. Submit → Upload to Supabase storage + insert DB row
8. Redirect to /items
```

### 3.3 Chat Creation Flow
```
1. User views item detail modal
2. Click "Contact Owner"
3. Backend (/api/chats/route.js):
   ├─ Verify authentication token
   ├─ Get item → extract finder_id
   ├─ Check for existing chat (prevent duplicates)
   ├─ If exists → Return existing chat.id
   └─ If not → Create new chat row
4. Navigate to /chat?id={chatId}
5. Real-time subscription started
```

### 3.4 Real-time Updates
```
Supabase Channels:
├─ "global-updates" → Listen to messages & chats tables
├─ "room-{chatId}" → Listen to specific chat's new messages
├─ postgres_changes → Automatic DB sync
└─ Auto-refresh UI when data changes
```

---

## 4. DATABASE SCHEMA REFERENCE

### 4.1 Profiles Table
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  student_number TEXT UNIQUE,  -- Format: 0000-0000
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Items Table
```sql
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  category TEXT,           -- "Found" or "Lost"
  title TEXT NOT NULL,
  description TEXT,
  location_tag TEXT,       -- e.g., "Shed", "Activity Center", "ER Bldg"
  image_url TEXT,          -- Supabase storage URL
  status TEXT DEFAULT 'Active',  -- "Active" or "Resolved"
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Chats Table
```sql
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id),
  finder_id UUID REFERENCES profiles(id),  -- Item poster
  claimer_id UUID REFERENCES profiles(id), -- Interested user
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'open'  -- "open", "resolved", etc.
);
```

### 4.4 Messages Table
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id),
  sender_id UUID REFERENCES profiles(id),
  receiver_id UUID REFERENCES profiles(id),
  item_id UUID,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. CONFIGURATION & ENVIRONMENT SETUP

### 5.1 Required Environment Variables
```env
# Public (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-side only
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 5.2 Supabase Client Initialization
**Client-side:** Uses `@supabase/ssr` for proper session handling in SSR apps
**Server-side:** Uses `@supabase/supabase-js` with service role key for admin operations

---

## 6. API ROUTES

### 6.1 POST /api/chats
**Purpose:** Create chat or retrieve existing for item contact
```
Request Body:
{
  "itemId": "uuid"
}

Headers:
{
  "Authorization": "Bearer {access_token}"
}

Response Success (201):
{
  "chatId": "uuid"
}

Error Cases:
- 401: Missing or invalid token
- 400: Missing itemId OR cannot message own item
- 404: Item not found
- 500: Database error
```

**Logic:**
1. Verify user authentication
2. Fetch item → extract poster ID
3. Check existing chat (prevent duplicates)
4. Create new chat if needed
5. Return chat ID

---

## 7. SECURITY CONSIDERATIONS

### 7.1 Row Level Security (RLS) Policies
```sql
-- Profiles: Users can see all profiles
-- Items: Everyone can read; only owner can update/delete
-- Chats: Only finder_id or claimer_id can access
-- Messages: Only sender/receiver or chat participants
```

### 7.2 Authentication Flow
- ✅ JWT tokens from Supabase Auth
- ✅ Server-side verification in API routes
- ✅ No direct SQL exposure to client
- ✅ Image uploads scoped to user ID

### 7.3 Best Practices Applied
- ✅ Service role key kept server-side only
- ✅ Environment variables not exposed to frontend
- ✅ User ownership validation before updates
- ✅ Type checking with Supabase client

---

## 8. DEPLOYMENT CONSIDERATIONS

### 8.1 Build Process
```bash
npm run build  # Next.js compilation
npm run dev   # Development server (port 3000)
npm run start # Production server
```

### 8.2 Vercel Deployment
- Automatic environment variable injection
- API routes become serverless functions
- Static pages cached at edge
- Real-time subscriptions preserved

### 8.3 Performance Optimizations
- ✅ Image optimization (Next.js Image component candidate)
- ✅ Lazy loading for item grid
- ✅ Real-time subscriptions prevent polling
- ✅ Component code splitting (Framer Motion animations)

---

## 9. KNOWN LIMITATIONS & FUTURE IMPROVEMENTS

### Current Limitations
1. No pagination on large item lists (could impact performance)
2. No offline-first capability
3. Image compression not implemented
4. No notification system
5. Chat list doesn't show unread count

### Recommended Enhancements
1. **Pagination**: Implement cursor-based pagination for items
2. **Search**: Full-text search on PostgreSQL (using `@@` operator)
3. **Notifications**: Supabase Edge Functions + Browser Push API
4. **Image Optimization**: compress before upload, use Next.js Image component
5. **Caching**: Redis cache layer for frequently accessed items
6. **Typing Indicators**: Real-time presence in chat
7. **File Type Validation**: Server-side MIME type checking

---

## End of Architecture Document
