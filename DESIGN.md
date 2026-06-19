# Todo with Obsidian — 설계 문서

맥북 · 아이폰 · Obsidian 을 연동하는 개인용 Todo 시스템. 할 일을 만들고 완료를
체크하면 그날의 Daily Note 에 날짜별로 자동 기록된다.

## 핵심 결정

| 선택 | 결정 | 이유 |
|---|---|---|
| 앱 형태 | **Obsidian 플러그인 (TypeScript)** | Obsidian 자체가 맥/아이폰 네이티브 앱. 동기화·파일접근을 직접 풀 필요 없음. 개발자의 JS/TS 역량 활용. |
| 데이터 | **볼트 안의 마크다운 파일** | 단일 진실 소스. 평범한 .md 라서 동기화가 그대로 전파됨. |
| 포맷 | **Obsidian Tasks 이모지 포맷** (`➕ 📅 ✅`) | 바퀴 재발명 회피, Tasks/Dataview 와 호환. |
| 동기화 | **iCloud Drive(무료)로 시작 → 불안정하면 Obsidian Sync(유료)** | 플러그인 방식은 외부 앱 파일접근이 불필요해 포맷 잠금 무관. |

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
- [ ] 우유 사기 ➕ 2026-06-19 📅 2026-06-20
```

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
- [ ] **Phase 3 — 실용화**: 마감일 입력 UI, 필터(오늘/지연), 단축키, 빠른추가 모달, **아이폰 실테스트**.
- [ ] **Phase 4 — 다듬기**: Dataview 리뷰 대시보드, 반복 할 일, 정렬/그룹.
- [ ] **Phase 5 (선택) — 네이티브 보조**: Obsidian 밖에서 추가하는 맥 메뉴바 퀵애드(같은 볼트에 쓰기; iCloud Drive 볼트 전제).

## 트레이드오프 (의식적으로 수용)

- 앱이 Obsidian "안"에 산다 → 독에 별도 Todo 아이콘은 없음. 무료 동기화·완벽한
  연동의 대가. 독립 아이콘이 필요하면 Phase 5.
- 모바일 플러그인 설치는 한 단계 더 수동적 (개발 중엔 BRAT 권장).
