/**
 * 하나의 할 일을 표현한다.
 * 저장 포맷은 Obsidian "Tasks" 플러그인의 이모지 메타데이터와 호환된다:
 *   - [ ] 설명 ➕ 2026-06-19 📅 2026-06-20
 *   - [x] 설명 ➕ 2026-06-19 ✅ 2026-06-19
 */
export interface Task {
  /** 설명 텍스트 (이모지 메타데이터 제외) */
  description: string;
  completed: boolean;
  /** ➕ 생성일 (YYYY-MM-DD) */
  createdDate?: string;
  /** 📅 마감일 (YYYY-MM-DD) */
  dueDate?: string;
  /** ✅ 완료일 (YYYY-MM-DD) */
  completedDate?: string;

  /** 카테고리 (직전 `## 헤딩` 텍스트). 헤딩 없으면 undefined = 미분류 */
  category?: string;
  /** 상세내용 (할 일 줄 아래 들여쓰기 블록). 여러 줄 가능, 없으면 undefined */
  detail?: string;

  /** 이 할 일이 들어있는 파일 경로 */
  filePath: string;
  /** 파일 내 0-기반 줄 번호 (할 일 줄의 시작) */
  lineNumber: number;
  /** 원본 마크다운 줄 (상세 제외, 할 일 줄만) */
  raw: string;
}

/** 메타데이터 이모지 */
export const EMOJI = {
  created: "➕",
  due: "📅",
  done: "✅",
} as const;
