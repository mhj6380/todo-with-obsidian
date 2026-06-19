# Todo with Obsidian — 설계 문서

맥북 · 아이폰 · 갤럭시탭(안드로이드)을 Obsidian 으로 연동하는 개인용 Todo 시스템.
할 일을 만들고 완료를 체크하면 그날의 Daily Note 에 날짜별로 자동 기록된다.

대상 기기: macOS · iOS · Android (Obsidian 이 세 OS 모두 지원, 플러그인은
`isDesktopOnly: false` 로 모바일 공통 동작).

## 핵심 결정

| 선택 | 결정 | 이유 |
|---|---|---|
| 앱 형태 | **Obsidian 플러그인 (TypeScript)** | Obsidian 자체가 맥/아이폰/안드로이드 네이티브 앱. 동기화·파일접근을 직접 풀 필요 없음. 개발자의 JS/TS 역량 활용. |
| 데이터 | **볼트 안의 마크다운 파일** | 단일 진실 소스. 평범한 .md 라서 동기화가 그대로 전파됨. |
| 포맷 | **Obsidian Tasks 이모지 포맷** (`➕ 📅 ✅`) | 바퀴 재발명 회피, Tasks/Dataview 와 호환. |
| 동기화 | **Obsidian Sync(유료) 권장 / 무료는 Remotely Save 플러그인** | iOS+Android 동시 지원이 필수 → iCloud 는 안드로이드 불가로 탈락. |

### 동기화 옵션 (맥 + 아이폰 + 갤럭시탭 3개 OS 모두 지원 필요)

| 방식 | macOS | iOS | Android | 비용 | 비고 |
|---|:--:|:--:|:--:|---|---|
| **Obsidian Sync** | ✅ | ✅ | ✅ | 유료(~$4/월) | 가장 쉬움, 플러그인·설정까지 동기화 |
| **Remotely Save** + 클라우드(Dropbox/OneDrive/S3/WebDAV) | ✅ | ✅ | ✅ | 무료~저렴 | 주기/수동 동기화, 충돌 파일 주의 |
| iCloud Drive | ✅ | ✅ | ❌ | 무료 | 안드로이드 불가 → **탈락** |
| Syncthing | ✅ | △ | ✅ | 무료 | iOS 까다로움 → 비추천 |

## 아키텍처

```
Obsidian Vault (단일 진실 소스)
  Todos/Inbox.md        ← 활성 할 일
  Daily/YYYY-MM-DD.md   ← 날짜별 완료/생성 기록
        ▲ 읽기/쓰기            ▲ 동기화 (iCloud / Obsidian Sync)
   내 플러그인 (TS)        맥북 ↔ 아이폰
```

## 데이터 모델

활성 할 일 — `Todos/Inbox.md`:
```markdown
## 장보기                          ← 카테고리 = ## 헤딩 섹션
- [ ] 우유 사기 ➕ 2026-06-19 📅 2026-06-20
    저지방으로 2팩.               ← 상세내용 = 들여쓰기 블록(여러 줄)
    쿠폰 있음.
```
- **카테고리**: 직전 `## 헤딩` 텍스트(없으면 미분류). `#` 한 개는 파일 제목.
- **상세내용**: 할 일 줄 바로 아래 연속된 들여쓰기(탭/공백2+) 줄들.
- 파싱/직렬화는 `TaskParser.parseDocument` / `serializeBlock`, 파일 조작은
  `VaultStore`(블록 인식 add/toggle/update/delete). 위젯(iOS/맥)은 아직 할 일
  줄만 읽음 → 카테고리/상세 미반영(추후).

완료 체크 시 두 가지가 동시에 발생:
1. 원래 줄이 `- [x] 우유 사기 … ✅ 2026-06-19` 로 변경
2. 오늘 Daily Note(`Daily/2026-06-19.md`)의 "완료" 섹션에 로그 추가

```markdown
## ✅ 완료한 일
- [x] 우유 사기 (14:32) ✅ 2026-06-19
```

## 모듈 구조

```
src/
  main.ts                  진입점: 명령어/리본/뷰 등록, 생성·토글 오케스트레이션
  settings.ts              설정 + 설정 탭
  model/
    Task.ts                Task 타입 + 이모지 상수
    TaskParser.ts          마크다운 ↔ Task (파싱/직렬화)
  services/
    DateService.ts         YYYY-MM-DD / HH:mm 포매팅
    VaultStore.ts          Inbox 읽기/추가/완료토글
    DailyLogger.ts         ★ 완료/생성을 Daily Note 에 기록
  views/
    TodoView.ts            사이드바 UI (추가 입력 + 목록 + 토글)
```

## 단계별 로드맵

- [x] **Phase 0 — 스캐폴드**: 플러그인 골격, 빌드 파이프라인, 사이드바 뷰.
- [x] **Phase 1 — MVP**: Inbox 추가 / 목록 / 완료 토글.
- [x] **Phase 2 — 날짜별 기록 ★**: 완료 시 Daily Note 자동 로그.
- [x] **Phase 3 — 실용화**: 마감일 입력 UI, 필터(전체/오늘/지연/완료), 빠른추가 모달, 단축키 바인딩용 명령어. (남음: **아이폰 실테스트**)
- [ ] **Phase 4 — 다듬기**: Dataview 리뷰 대시보드, 반복 할 일, 정렬/그룹.
- [ ] **Phase 5 (선택) — 네이티브 보조**: Obsidian 밖에서 추가하는 맥 메뉴바 퀵애드(같은 볼트에 쓰기; iCloud Drive 볼트 전제).

## 트레이드오프 (의식적으로 수용)

- 앱이 Obsidian "안"에 산다 → 독에 별도 Todo 아이콘은 없음. 무료 동기화·완벽한
  연동의 대가. 독립 아이콘이 필요하면 Phase 5.
- 모바일 플러그인 설치는 한 단계 더 수동적 (개발 중엔 BRAT 권장).
