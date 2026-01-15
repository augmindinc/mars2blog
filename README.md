# Mars2Blog

Mars2Blog은 Next.js 15와 Firebase를 기반으로 구축된 현대적이고 강력한 **AI 기반 글로벌 블로그 플랫폼**입니다. 사용자 친화적인 인터페이스와 강력한 관리 기능을 제공하며, 검색 엔진 최적화(SEO) 및 글로벌 사용자를 위한 자동 번역 시스템에 최적화되어 있습니다.

## 🚀 주요 기능

### 1. AI 기반 다국어 자동화 (Global Expansion)
*   **One-Click 자동 번역**: **Gemini 2.5 Flash**를 활용하여 한글 원문을 영어(EN), 일본어(JA), 중국어(ZH)로 즉시 번역합니다.
*   **스마트 콘텐츠 동기화**: 원문(한글) 수정 시 카테고리, 게시 상태, 썸네일 등을 모든 언어 버전에 자동으로 동기화합니다.
*   **지능형 언어 스위처**: 사용자가 언어를 변경하면 현재 읽고 있는 글의 해당 언어 버전으로 즉시 이동하는 컨텍스트 매핑 기술이 적용되어 있습니다.

### 2. 글로벌 SEO 최적화 (Advanced SEO)
*   **자동 메타데이터 생성**: 각 언어의 특성에 맞는 SEO 제목, 설명, 그리고 URL 슬러그(Slug)를 AI가 자동으로 생성합니다.
*   **표준화 기술 적용**: 검색 엔진 최적화를 위한 `hreflang` 태그, `canonical` 태그, 그리고 언어별 구조화 데이터(JSON-LD)가 자동 삽입됩니다.
*   **구글 인덱싱 서버 연동**: 새 글 발행 시 Google Indexing API를 통해 전 세계 검색 엔진에 즉시 색인을 요청합니다.

### 3. 지능형 콘텐츠 관리 (Smart CMS)
*   **마크다운 에디터**: 실시간 미리보기를 지원하는 직관적인 에디터를 지원합니다.
*   **자동 리소스 관리**: 이미지 업로드 시 클라이언트 측 **자동 압축** 및 게시글 삭제 시 관련 이미지(썸네일, 본문 이미지)를 스토리지에서 자동으로 정리합니다.
*   **단축 URL 서비스**: SNS 공유에 최적화된 짧은 주소(`mars.it.kr/s/CODE`) 기능을 제공합니다.

### 4. 관리자 시스템 & 보안 (Enterprise-Grade)
*   **역할 기반 권한 관리(RBAC)**: Admin 및 Author 역할 구분을 통한 체계적인 권한 제어를 지원합니다.
*   **강력한 보안**: API 키의 환경 변수 관리 및 관리자 승인 프로세스를 통한 대시보드 접근 보안을 강화했습니다.
*   **실시간 모니터링**: 게시글 상태(발행, 예약, 초안) 확인 및 전체 사용자 관리가 가능한 전용 대시보드를 제공합니다.

### 5. 프리미엄 사용자 경험 (Premium UX)
*   **Rich Aesthetics**: 현대적이고 유려한 디자인 시스템과 다크 모드를 기본 지원합니다.
*   **Full Responsiveness**: 모바일, 태블릿, 데스크탑 등 모든 환경에서 완벽한 가독성을 제공합니다.
*   **성능 최적화**: Next.js 15의 최신 기능과 최적화된 데이터 페칭을 통해 초고속 로딩 성능을 자랑합니다.

## 🛠 기술 스택

*   **Framework**: Next.js 15 (App Router)
*   **AI Model**: Google Gemini 2.5 Flash
*   **Language**: TypeScript
*   **Database & Auth**: Firebase (Firestore, Auth, Storage)
*   **Styling**: Tailwind CSS, Shadcn UI
*   **Internationalization**: next-intl
*   **Data Fetching**: TanStack Query (React Query)

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
`.env.example` 파일을 참고하여 필요한 API 키들을 설정하세요.
```env
GEMINI_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
...
```

4. 개발 서버 실행:
```bash
npm run dev
```

---
© 2026 Mars2Blog 개발 팀. All rights reserved.
