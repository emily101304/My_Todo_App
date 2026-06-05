# My Todo

나만의 할 일 관리 웹 앱입니다.

## 주요 기능

### 할 일 관리
- **Today** 탭: 오늘의 할 일 추가 / 수정 / 삭제 / 완료 처리
- **우선순위 설정**: P0(긴급) / P1(중요) / P2(일반) 분류 및 드래그앤드롭으로 우선순위 변경
- **내일로 미루기**: 체크박스 선택 후 내일 날짜로 이동
- **다른 날로 미루기**: 원하는 날짜를 직접 선택하여 이동

### 달력 (Calendar)
- 월별 달력 뷰, 날짜별 할 일 완료/전체 개수 표시
- 대한민국 공휴일 자동 빨간색 표시 (공휴일 이름 포함)
- 날짜 클릭 시 해당 날짜 할 일 모달로 조회 및 편집
- **오늘** 버튼으로 현재 월로 즉시 이동

### 주간 뷰 (Weekly)
- 이번 주 월~일 할 일 한눈에 보기
- 이전/다음 주 네비게이션
- **이번 주** 버튼으로 현재 주로 즉시 이동
- 날짜 호버 시 스크롤로 전체 할 일 확인

### 개인화 설정
- 배경화면 URL 입력 또는 파일 직접 업로드
- 배경 맞춤 옵션 (꽉 채우기 / 전체 보기)
- 배경 색상 커스텀 (컬러 피커 + 프리셋)
- 출근 / 퇴근 시간 설정

### Slack 리마인드 알림
- 퇴근 1시간 전 / 20분 전 미완료 할 일 자동 발송
- Slack Webhook URL 및 알림 메시지 커스텀 가능

### 인증
- 이메일 / 비밀번호 회원가입 및 로그인
- 비밀번호 재설정 (이메일 링크)

---

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Backend | Supabase (Auth, Database) |
| 배포 | Vercel |
| 알림 | Slack Incoming Webhook |
| 스케줄링 | cron-job.org |

---

## 로컬 실행 방법

### 1. 저장소 클론

```bash
git clone https://github.com/emily101304/My_Todo_App.git
cd My_Todo_App/my-todo-app
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경변수 설정

`.env.local` 파일 생성 후 아래 값 입력:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
CRON_SECRET=your-cron-secret
```

### 4. Supabase 테이블 생성

Supabase SQL Editor에서 아래 쿼리 실행:

```sql
-- todos 테이블
create table todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  completed boolean default false not null,
  date date not null,
  priority text not null default 'P2' check (priority in ('P0', 'P1', 'P2')),
  created_at timestamptz default now() not null
);

alter table todos enable row level security;
create policy "own todos" on todos
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_settings 테이블
create table user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  end_time text not null default '17:00',
  slack_webhook_url text,
  reminder_message text default '퇴근 전에 확인해봐요!',
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;
create policy "own settings" on user_settings
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 5. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인

---

## Slack 알림 설정 방법

1. [Slack API](https://api.slack.com/apps) 에서 Incoming Webhook 생성
2. 앱 설정 모달에서 Webhook URL, 퇴근 시간, 알림 메시지 입력 후 저장
3. [cron-job.org](https://cron-job.org) 에서 아래 설정으로 크론잡 생성:
   - URL: `https://your-domain.vercel.app/api/cron/slack-reminder`
   - 실행 주기: 15분마다
   - Header: `Authorization: Bearer your-cron-secret`

---

## 배포

Vercel에 배포 시 아래 환경변수 등록 필요:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
