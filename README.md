# ResumeIQ

Upload a CV and get:

- **Interview questions** a recruiter could ask about the skills and projects on it (with what the interviewer is testing and how to answer)
- **A language check**: wrong or badly written keywords, unprofessional words, grammar, weak phrases, formatting, missing details, each with a suggested fix
- **A score** (overall, ATS, clarity, professionalism, impact)
- **Company prep**: pick a company (and optionally a role and a pasted job description). The app looks the company up on the web, then writes practice questions from the company, the job description and the skills and projects on your CV. It also gives a **CV match score out of 100** for that job, the skills that match and the ones missing, likely interview rounds, a prep plan, and the sources used.

Stack: HTML, CSS and vanilla JS frontend, Node.js, Express and MongoDB (Mongoose) backend.

## Quick start

```bash
npm install
cp .env.example .env     # a ready-made .env is already included in the zip
# fill in the values below, then:
npm run dev              # or: npm start
```

Open http://localhost:5000

## Where to put your keys (`.env`)

| Variable | Required | What it is |
|---|---|---|
| `MONGO_URI` | yes | Your MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | yes | Any long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `AI_PROVIDER` | yes | `anthropic` (default), `gemini` or `openai` |
| **`ANTHROPIC_API_KEY`** | if provider is anthropic | **Put your AI API key here.** Get one at console.anthropic.com |
| `GEMINI_API_KEY` | if provider is gemini | Key from Google AI Studio |
| `OPENAI_API_KEY` | if provider is openai | Key from platform.openai.com |
| `*_MODEL` | no | Model name for each provider. Change it if a model is retired |
| `GOOGLE_CLIENT_ID` | for Google login | See "Google sign-in" below |
| `SMTP_*`, `MAIL_FROM` | for reset emails | Any SMTP account (Gmail app password, Brevo, Resend SMTP...) |
| `APP_URL` | in production | Your public URL, used in reset-password links |

Only `MONGO_URI`, `JWT_SECRET` and one AI key are needed to run the core product.

### Google sign-in

1. Go to Google Cloud Console, APIs and Services, Credentials.
2. Create an **OAuth client ID** of type **Web application**.
3. Add `http://localhost:5000` (and your real domain later) under **Authorized JavaScript origins**.
4. Copy the Client ID into `GOOGLE_CLIENT_ID`. No client secret is needed.

### Password reset email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. Without SMTP, in development the reset link is printed in the server console and shown on the "Check your inbox" screen, so you can still test the flow.

## How the "one CV per user" rule works

- Each user has **one** document in the `resumes` collection (unique index on `user`).
- On upload the server extracts the text, normalises it and computes a SHA-256 hash.
  - **Same hash as the saved CV** → the saved result is returned. No AI call, no database write.
  - **Different hash** → the CV is analysed and the user's single document is **overwritten**.
- The file itself is never stored (memory upload, parsed, discarded). Only the analysis JSON and the hash are saved, so the database stays small.
- In the dashboard, **My CV → Try another CV** reveals the upload box.

## Folder structure

```
resumeiq/
├─ .env / .env.example
├─ package.json
├─ server/
│  ├─ server.js              start: validate env, connect DB, listen
│  ├─ app.js                 express app, security headers, routes, pages
│  ├─ config/                env.js (all settings), db.js
│  ├─ models/                User.js, Resume.js
│  ├─ controllers/           auth.controller.js, resume.controller.js
│  ├─ routes/                auth.routes.js, resume.routes.js
│  ├─ middleware/            auth (JWT), upload (multer), rateLimit, errorHandler
│  ├─ services/              ai.service.js, parser.service.js, mail.service.js
│  └─ utils/                 AppError, validate
└─ client/
   ├─ pages/                 index, login, register, forgot-password, reset-password, dashboard (.html)
   └─ assets/
      ├─ css/                base, landing, auth, dashboard
      ├─ js/                 core (api, toasts, page transitions), landing, auth, dashboard
      └─ img/                favicon.svg
```

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | no | Create account |
| POST | `/api/auth/login` | no | Log in |
| POST | `/api/auth/google` | no | Log in with a Google credential |
| POST | `/api/auth/forgot-password` | no | Send reset link |
| POST | `/api/auth/reset-password/:token` | no | Set new password |
| POST | `/api/auth/logout` | no | Clear session cookie |
| GET | `/api/auth/me` | yes | Current user |
| GET | `/api/resume` | yes | Saved CV and analysis (or `null`) |
| GET | `/api/prep` | yes | List saved company practice sets (max 5) |
| POST | `/api/prep` | yes | Create one: `{ company, role?, jobDescription? }` |
| GET | `/api/prep/:id` | yes | One practice set with questions and match score |
| DELETE | `/api/prep/:id` | yes | Delete a practice set |
| POST | `/api/resume/upload` | yes | Upload `resume` (PDF, DOCX, TXT; 5 MB) |
| DELETE | `/api/resume` | yes | Delete the saved CV |

## Company prep notes

- **Web research:** works with `AI_PROVIDER=gemini` (Google Search) and `anthropic` (web search tool, if your account has it enabled). With `openai`, or if search fails, the set is still created from the job description and general patterns, and is clearly labelled as less certain.
- **Two searches per set:** one for company facts, one for interview questions that real candidates posted (GeeksforGeeks, AmbitionBox, Glassdoor, LeetCode Discuss, Reddit, Medium and similar). They run in parallel.
- **Every question is labelled.**
  - **Reported by candidates**: the question matches a candidate's post, and the card links to that page. The server accepts this label only if the link is a page the search engine actually returned, the question text matches that report, and the report is not reused. The AI never writes the link.
  - **Predicted**: everything else, built from your CV, the job description and company research. Nobody has confirmed the company asks it.
- **Real pages, always:** the practice set also shows a "Read real interview experiences" panel. It lists the pages the interview search actually found, plus search links (Google, GeeksforGeeks, AmbitionBox, Glassdoor, LeetCode Discuss, Reddit) that work even when no question could be tied to a page. With Gemini, a question is linked only where Google itself attributes that line to a page.
- **Free real-page search with Tavily (recommended):** add `TAVILY_API_KEY` to `.env` (free key, 1,000 searches a month, no card, from https://app.tavily.com). The app then finds real interview pages and company facts through Tavily and uses the AI only to write questions, so Gemini's search quota is not needed and this works with any AI provider. A question is marked "Reported by candidates" only when most of its key words appear in the text of a page Tavily returned, and the link is that page. If Tavily is not set or fails, the app falls back to the AI's own web search. Each set uses 2 Tavily searches.
- **Limits:** a small company may have no public reports, so all questions will be "Predicted". Some sites (Glassdoor often) block automated reading. Reported questions are one person's account and may be old. With Gemini the link goes through Google's own redirect and is checked at site level, not page level. Sets made before this feature show every question as "Predicted"; delete and recreate them to search for reports.
- **Cost:** each new set makes two web-search calls instead of one.
- **Gemini models and free limits:** use the model ID in `GEMINI_MODEL` (for example `gemini-3.5-flash-lite`), not the display name. Free keys allow only about 20 requests a day on `gemini-3.8-flash` and far more on Flash-Lite models; check Rate Limit in Google AI Studio. Each set needs about 3 requests. You can set `GEMINI_SEARCH_MODEL` to use a different model just for web search.
- The green tag "Company facts from web research" only describes the company summary. It says nothing about whether a question was asked. Interview rounds and questions are never a promise of what will be asked.
- Sets belong to the saved CV, so uploading a different CV clears them. At most 5 are kept, and each user can create 10 per hour.

## If you see "The AI service returned an error"

The server terminal prints the exact reason on a line starting with `[ai:gemini]` (or `[ai:anthropic]`). In development the reason is also shown in the error message. Temporary overload errors (503) are retried automatically. Common causes:

- Wrong or expired key → "key was rejected". Create a new key.
- Free-tier limit reached → wait a minute or use a different key/provider.
- Model name retired → set `GEMINI_MODEL` to a current Flash model. If the name is not found, the app automatically tries `gemini-flash-latest`.

## Security notes

- Passwords hashed with bcrypt (cost 12). JWT is stored in an `httpOnly` cookie (`secure` in production).
- Reset tokens are random, stored only as a SHA-256 hash, valid for 15 minutes, single use.
- Helmet security headers with a Content Security Policy, rate limits on auth routes and on uploads (12 per hour per user, to protect your AI credits).
- The CV text is sent to the AI as untrusted data, and all AI output is validated and HTML-escaped before display.

## Deploying

Set `NODE_ENV=production`, `APP_URL` to your https URL, and add the same env vars on your host (Render, Railway, a VPS). If you use MongoDB Atlas, allow your server's IP in Network Access.

## Notes

- Scanned or image-only PDFs have no text to read. Export a text-based PDF or DOCX.
- AI feedback is a guide, not a guarantee.
