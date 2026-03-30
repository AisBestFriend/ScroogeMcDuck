# ScroogeMcDuck 💰

개인 재무 추적 앱 — 월별 가계부 + 자산 스냅샷 + 차트

## 기술 스택

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (인증 + 데이터베이스)
- **NextAuth.js v4** (이메일/비밀번호 + Google OAuth)
- **Recharts** (차트)
- **React Hook Form** + **Zod**

## 기능

| 페이지 | 설명 |
|--------|------|
| `/login` | 이메일/비밀번호, Google OAuth 로그인 |
| `/register` | 신규 계정 생성 |
| `/dashboard` | 연간 수입/지출/저축 요약 카드 + 차트 |
| `/monthly` | 월별 가계부 입력 및 수정 |
| `/assets` | 인물별 월별 자산 스냅샷 |

## 시작하기

### 1. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local`에 아래 값들을 채워넣으세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32 으로 생성>

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Supabase 설정

1. [Supabase](https://app.supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/20240101000000_init.sql` 실행
3. Authentication → Providers에서 Google OAuth 활성화
4. Google Cloud Console에서 OAuth 클라이언트 생성, 리디렉션 URI 설정:
   - `http://localhost:3000/api/auth/callback/google` (개발)
   - `https://yourdomain.com/api/auth/callback/google` (프로덕션)

### 3. 의존성 설치 및 개발 서버 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)을 브라우저에서 열면 `/login`으로 리디렉션됩니다.

## 데이터베이스 스키마

### `monthly` — 월별 가계부

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `changyoung_income` | bigint | 창영 수입 |
| `yeonju_income` | bigint | 연주 수입 |
| `extra_income` | bigint | 기타 수입 |
| `total_income` | bigint | 총 수입 |
| `changyoung_expense` | bigint | 창영 지출 |
| `yeonju_expense` | bigint | 연주 지출 |
| `bucheonpay` | bigint | 부천페이 |
| `common_expense` | bigint | 공통 지출 |
| `gift_condolence` | bigint | 경조사비 |
| `total_expense` | bigint | 총 지출 |
| `savings` | bigint | 저축 |

### `assets` — 자산 스냅샷

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `person` | text | 인물 (changyoung / yeonju) |
| `cash` | bigint | 현금 |
| `investment` | bigint | 투자 (주식/펀드) |
| `realized_profit` | bigint | 실현 수익 |
| `dividend` | bigint | 배당금 |
| `savings_deposit` | bigint | 예적금 |
| `bonds` | bigint | 채권 |
| `crypto_gold` | bigint | 코인/금 |
| `house_deposit` | bigint | 전세 보증금 |
| `pension` | bigint | 연금 |
| `apt_payment` | bigint | 아파트 납입금 |
| `total` | bigint | 총 자산 |

## 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── monthly/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── assets/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── monthly/route.ts
│   │   └── assets/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/           # shadcn/ui 컴포넌트
│   ├── layout/       # Sidebar, Header, MobileNav
│   ├── charts/       # Recharts 래퍼
│   ├── monthly/      # 가계부 폼
│   └── assets/       # 자산 폼
├── lib/
│   ├── auth.ts       # NextAuth 설정
│   ├── supabase.ts   # Supabase 클라이언트
│   ├── queries.ts    # DB 쿼리 함수
│   └── utils.ts      # 유틸리티 함수
├── hooks/
│   └── use-toast.ts
└── types/
    └── index.ts
```

## 배포 (Vercel)

```bash
vercel --prod
```

Vercel 환경 변수에 `.env.local`과 동일한 값 설정 후, `NEXTAUTH_URL`을 프로덕션 URL로 변경하세요.
