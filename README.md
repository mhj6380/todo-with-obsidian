# Todo with Obsidian

할 일을 만들고 완료를 체크하면, 그날의 Daily Note 에 날짜별로 자동 기록되는
Obsidian 플러그인. 맥북·아이폰은 Obsidian 동기화로 함께 연동된다.

설계 배경과 로드맵은 [DESIGN.md](./DESIGN.md) 참고.

## 개발 / 설치 (테스트 볼트)

```bash
npm install
npm run dev      # 워치 모드 (저장 시 main.js 재빌드)
# 또는
npm run build    # 타입체크 + 프로덕션 번들
```

플러그인을 테스트 볼트에 설치:

```
<볼트>/.obsidian/plugins/todo-with-obsidian/
  ├── main.js
  ├── manifest.json
  └── styles.css
```

이 폴더에 위 3개 파일을 복사(또는 심볼릭 링크)한 뒤, Obsidian 설정 →
커뮤니티 플러그인에서 "Todo with Obsidian" 활성화. 좌측 리본의 ✓ 아이콘으로 패널을 연다.

> 개발 편의를 위해 이 레포 폴더 자체를 볼트의 플러그인 폴더로 심링크해 두면
> `npm run dev` 의 재빌드가 바로 반영된다.

## 사용

- 사이드바 입력창에 할 일을 적고 Enter → `Todos/Inbox.md` 에 추가
- 체크박스 클릭 → 완료 처리 + 오늘 Daily Note 에 자동 기록
- 설정에서 파일 경로 / Daily 폴더 / 로그 제목 변경 가능

## 동기화

볼트를 iCloud Drive(무료) 또는 Obsidian Sync(유료)에 두면 맥↔아이폰이 함께 동기화된다.
플러그인은 평범한 .md 파일만 다루므로 별도 동기화 코드가 필요 없다.
