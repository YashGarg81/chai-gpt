# UI Layout Audit — ChaiGPT

## Root Cause Analysis

1. **Narrow Conversation Container (`max-w-3xl` / `768px`)**
   - `features/conversation/components/chat-messages.tsx`: `ConversationContent` used `mx-auto w-full max-w-3xl py-6 md:py-8`, constraining the message stream to `768px`.
   - `features/conversation/components/chat-composer.tsx`: `<form>` used `mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4 sm:pb-4 md:px-6`, also constraining the composer to `768px`.
   - On `1650px`–`1920px` desktop viewports, `768px` leaves excessive unused horizontal whitespace on both sides, making the conversation column appear disproportionately small.

2. **Sidebar & Shell Proportions**
   - `features/conversation/components/chat-shell.tsx`: `SidebarProvider` + `AppSidebar` + `SidebarInset className="min-h-svh overflow-hidden"`.
   - Default sidebar width (`16rem` / `256px`) provides a balanced navigation rail on desktop while collapsing cleanly on mobile/tablet.

3. **Typography & Spacing Consistency**
   - `app/globals.css`: Uses Tailwind v4 + `streamdown/styles.css` with standard `16px` root font size.
   - Standardizing horizontal padding to `px-5 md:px-8` (`20px` mobile/tablet, `32px` desktop) across both `ConversationContent` and `ChatComposer` ensures aligned edges and comfortable breathing room at all breakpoints.

## Target Design
- **Desktop max-width:** `max-w-[880px]` for both `ConversationContent` and `ChatComposer`.
- **Horizontal padding:** `px-5 md:px-8` (`20px` -> `32px`).
- **Composer bottom padding:** `pb-4` (`16px`) for consistent clearance.
