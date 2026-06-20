# Todo Desktop Widget (macOS)

Obsidian 볼트의 `Todos/Inbox.md` 를 읽어 **항상 최상단 + 우측상단 고정 + 글래스**
플로팅 창으로 보여주는 작은 Electron 위젯. 체크박스로 완료하면 플러그인과
동일한 포맷으로 `Inbox.md` 와 오늘 Daily Note 에 기록되고, 그대로 동기화된다.

## 실행

```bash
cd desktop-widget
npm install      # 최초 1회 (electron 설치)
npm start
```

우측 상단에 작은 창이 뜬다. 헤더(상단 ✓ 영역)를 잡고 드래그하면 옮길 수 있고,
✕ 로 닫는다. 코딩/다른 앱 위에서도 항상 위에 떠 있다(전체화면 포함).

## 설정 — `config.json`

| 키 | 설명 |
|---|---|
| `vaultPath` | 볼트 절대 경로 |
| `inboxPath` | 볼트 기준 Inbox 경로 (기본 `Todos/Inbox.md`) |
| `dailyFolder` | Daily Note 폴더 (기본 `Daily`) |
| `completedHeading` | 완료 로그가 들어갈 제목 |
| `logCompletions` | 완료 시 Daily Note 기록 여부 |
| `window` | 창 크기/여백 (`width,height,marginTop,marginRight`) |

## 숨기기 / 다시 켜기

- **접기(`–`)**: 작은 알약으로 접힘 → 알약 클릭으로 펼침
- **숨기기(`✕`)**: 화면에서 사라짐(앱은 메뉴바에 살아있음)
  → 메뉴바 **`✓` 아이콘** 클릭 또는 **`⌘⌥T`** 로 복귀
- **종료**: 메뉴바 `✓` 우클릭 → 종료
- 단일 인스턴스라 `npm start` 를 다시 실행해도 새 창 대신 기존 창이 복귀한다.

## 로그인 시 자동 실행 (LaunchAgent)

`~/Library/LaunchAgents/com.hakju.todo-widget.plist` 로 등록되어 로그인 시
자동 실행된다.

```bash
# 켜기(등록)
launchctl load ~/Library/LaunchAgents/com.hakju.todo-widget.plist
# 끄기(해제)
launchctl unload ~/Library/LaunchAgents/com.hakju.todo-widget.plist
rm ~/Library/LaunchAgents/com.hakju.todo-widget.plist   # 완전 제거
# 지금 바로 다시 실행
launchctl kickstart -k gui/$(id -u)/com.hakju.todo-widget
```

## 한계

- 동기화는 폰/다른 기기의 Remotely Save 주기에 따름(즉시는 아님). 이 위젯은
  로컬 `Inbox.md` 변경을 1초 폴링으로 감지해 바로 갱신한다.
- macOS 전용 동작(vibrancy, 항상 최상단 레벨)을 가정한다.
