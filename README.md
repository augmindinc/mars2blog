# Mars2Blog

Mars2Blog은 Next.js 15와 Firebase를 기반으로 구축된 현대적이고 강력한 블로그 플랫폼입니다. 사용자 친화적인 인터페이스와 강력한 관리 기능을 제공하며, 검색 엔진 최적화(SEO) 및 성능에 최적화되어 있습니다.

## 🚀 주요 기능

### 1. 콘텐츠 관리 (CMS)
*   **마크다운 에디터**: 실시간 미리보기를 지원하는 직관적인 마크다운 에디터를 통해 글을 작성할 수 있습니다.
*   **이미지 최적화**: 이미지 업로드 시 클라이언트 측에서 자동으로 압축하여 업로드 및 로딩 속도를 개선합니다.
*   **자동 이미지 관리**: 게시글 삭제 시 본문에 포함된 마크다운 이미지와 썸네일까지 스토리지에서 자동으로 정리합니다.
*   **카테고리 시스템**: 기획, 쇼핑, 요리, 여행, 이슈 등 체계적인 카테고리 분류를 지원합니다.

### 2. 관리자 시스템 & 보안 (RBAC)
*   **역할 기반 권한 관리**: Admin 및 Author 역할을 구분하여 권한을 제어합니다.
*   **커스텀 승인 프로세스**: 회원가입 후 관리자의 승인을 거쳐야 대시보드 접근이 가능한 보안 시스템을 갖추고 있습니다.
*   **멤버 관리**: 관리자 전용 페이지에서 전체 사용자의 역할을 변경하거나 승인 상태를 관리할 수 있습니다.
*   **실시간 대시보드**: 게시글 상태(발행, 예약, 초안) 확인 및 빠른 검색/필터링 기능을 제공합니다.

### 3. SEO 및 마케팅
*   **AI 메타데이터 생성**: 제목과 본문을 기반으로 AI가 SEO 제목, 설명 및 이미지 Alt 텍스트를 자동 생성합니다.
*   **구글 인덱싱 API**: 새로운 글 발행 시 구글에 즉시 색인 생성을 요청합니다.
*   **단축 URL 서비스**: 공유가 용이한 짧은 주소(`mars.it.kr/s/CODE`) 기능을 제공합니다.
*   **다국어 지원 (i18n)**: 한국어와 영어를 모두 지원하여 글로벌 사용자에게 대응합니다.
*   **자동 사이트맵 & RSS**: 검색 엔진 크롤링을 위한 `sitemap.xml`을 자동으로 생성합니다.

### 4. 성능 및 경험
*   **다크 모드 지원**: 사용자 환경에 최적화된 다크 모드 테마를 기본 제공합니다.
*   **반응형 웹 디자인**: 데스크탑, 태블릿, 모바일까지 모든 기기에서 완벽한 레이아웃을 제공합니다.
*   **구글 애널리틱스 (GA4) 통합**: 방문자 데이터 분석을 위한 트래킹이 구현되어 있습니다.

## 🛠 기술 스택

*   **Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript
*   **Database & Auth**: Firebase (Firestore, Auth, Storage)
*   **Styling**: Tailwind CSS, Shadcn UI
*   **Internationalization**: next-intl
*   **Data Fetching**: TanStack Query (React Query)
*   **Editor**: Tiptap / Custom Markdown Editor

## 📦 시작하기

1. 저장소 클론:
```bash
git clone https://github.com/augmindinc/mars2blog.git
```

2. 의존성 설치:
```bash
npm install
```

3. 환경 변수 설정 (`.env.local`):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
...
```

4. 개발 서버 실행:
```bash
npm run dev
```

---
© 2026 Mars2Blog 개발 팀. All rights reserved.
