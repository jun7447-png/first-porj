# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
npx tsc --noEmit # TypeScript type check (always run before committing)
```

Deploy to Vercel:
```bash
npx vercel --prod --yes
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENAI_API_KEY=
RESEND_API_KEY=
OPENROUTER_API_KEY=
```

## Architecture

**SnapPage** — AI-powered product image generation service. Users upload a product photo, select a tool, and the app generates a styled marketing image using OpenAI `gpt-image-2` via `images/edits`.

### Image Generation Flow

```
Client (tools/[type]/page.tsx)
  → POST /api/generate/start   (returns { jobId } immediately)
      → Supabase image_jobs: status = "pending"
      → waitUntil(processJob) runs in background
          → generateWithOpenAI() in lib/image-generator.ts
          → Supabase image_jobs: status = "done" | "error"
  → Client polls GET /api/job/[jobId] every 3s
  → On done: display image + saveImageHistory()
```

The synchronous `/api/generate` route exists for simpler callers (same model, same multipart encoding).

### Korean Text / ByteString Encoding

**Critical pattern** — Node.js undici validates FormData string values as ByteString (Latin-1 only), which breaks Korean characters. Two layers of protection:

1. **Client → Server**: Prompts are `TextEncoder` → `btoa()` base64-encoded and sent as `prompt_b64` FormData field. Server decodes via `Uint8Array.from(atob(b64), c => c.charCodeAt(0))`.

2. **Server → OpenAI**: The multipart body for `images/edits` is constructed manually as `Buffer` (not via FormData) and wrapped in `Blob`. This bypasses undici's ByteString validation for the prompt field.

Never use `JSON.stringify(korean_string)` as a plain string body in `fetch()` on the server — wrap in `new Blob([JSON.stringify(obj)], { type: "application/json" })`.

### Tools System

Five tools defined in `lib/tools-config.ts`, each mapping to a prompt file:

| Type | Tool | Prompt File | Special Behaviour |
|------|------|-------------|-------------------|
| 1 | 배경지우기 | prompt/prompt1.txt | Standard |
| 2 | 컨셉배경사진만들기 | prompt/prompt2.txt | Standard |
| 3 | 확대(클로즈업)강조만들기 | prompt/prompt3.txt | Standard |
| 4 | 타이포그라피제품강조 | prompt/prompt4.txt | Hides prompt; shows 30 preset phrases; user picks one phrase |
| 5 | 제품 홍보 포스터 생성 | prompt/prompt5.txt | Structured fields (title, features, hook, comment); ChatGPT auto-generates via `/api/generate-copy` |

In `app/tools/[type]/page.tsx`, check `isT4 = type === "4"` and `isT5 = type === "5"` for per-tool UI branching.

For type 4, the final prompt sent to the API is a hardcoded base + user-selected phrase (does **not** use the `prompt` state variable — avoids leaking the 30-item list):
```ts
const T4_BASE = "타이포그래피가 이미지 상하좌우 정중앙에 배치...\n" +
  `타이포그래피 문구는 아래 1개의 문구로만 적용: "${t4Phrase}"...`;
```

### Supabase Schema

```
auth.users              (managed by Supabase Auth)
user_profiles           id (FK), email, total_generated, created_at
                        → auto-created by on_auth_user_created trigger
user_prompts            id, user_id, template_index (0-4), prompt_text
                        → saves user-edited prompts; loaded on next visit
image_jobs              id, status, image_url, error_text, created_at
                        → tracks async generation jobs
image_history           id, user_id, tool_type, tool_name, image_url, prompt_summary
                        → permanent generation history per user
```

Storage bucket: `generated-images` (public read). Images saved as `{userId}/{timestamp}.png`.

### Authentication

`lib/supabase.ts` creates a single Supabase client using the publishable key (safe for browser). All auth is email/password via `supabase.auth`. Email verification uses `/auth/callback` page which calls `supabase.auth.setSession()` from the hash params.

The generate pages (`/generate`, `/tools/*`) redirect unauthenticated users to `/`.

### Prompt Template Variables

`lib/image-generator.ts::resolvePromptVariables()` replaces these before sending to OpenAI:
- `[LANGUAGE]` → `Korean`
- `[OBJECT_CATEGORY]` → `product`
- `[OBJECT_VIEW]` → `best view for the product`
- `[OBJECT_STATE]` → `most useful state`
- `[INFOGRAPHIC_GOAL]` → `HOW_TO_USE`
- `[{argument ...}]` → removed

### Error Handling

All image generation failures display a single message defined in `lib/image-generator.ts`:
```ts
export const IMAGE_MODEL_ERROR =
  "현재 Chatgpt 이미지 생성 모델이 원활하지 않습니다.잠시 후 다시 시도해 주세요!";
```

No fallback models. If `gpt-image-2` fails, show this message and stop.

### Client-side Image History

`app/tools/[type]/page.tsx` maintains `imageHistory: string[]` in component state (session-only, cleared on file re-upload). When "다시생성" is clicked, the current `resultImage` is prepended to `imageHistory` before being replaced. This is separate from the Supabase `image_history` table.

Lightbox uses a single `lightboxImage: string | null` state shared between current result and all history items.

## 한국어로 답하기

- 응답은 항상 한국어로.
- 코드 바꾸기 전에 무엇을 바꿀지 한국어로 먼저 한 줄 설명한 다음에 손대.
- 파일 지우는 명령은 실행 전에 한 번 물어봐.
- 어려운 용어 쓰지 말고 초보자한테 말하듯이 설명해줘.
- 결과만 보여주지 말고 다음에 뭘 해야 하는지도 알려줘.