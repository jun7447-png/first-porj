export interface ToolConfig {
  type: string;
  name: string;
  shortName: string;
  description: string;
  promptIndex: number;
  emoji: string;
}

export const TOOLS: ToolConfig[] = [
  {
    type: "1",
    name: "배경지우기",
    shortName: "배경지우기",
    description: "제품 배경을 깨끗하게 제거합니다",
    promptIndex: 0,
    emoji: "🪄",
  },
  {
    type: "2",
    name: "컨셉배경사진만들기",
    shortName: "컨셉배경",
    description: "세련된 컨셉 배경으로 제품을 연출합니다",
    promptIndex: 1,
    emoji: "🏛️",
  },
  {
    type: "3",
    name: "확대(클로즈업)강조만들기",
    shortName: "클로즈업",
    description: "제품 특징을 강조한 확대 컷을 만듭니다",
    promptIndex: 2,
    emoji: "🔍",
  },
  {
    type: "4",
    name: "타이포그라피제품강조",
    shortName: "타이포그라피",
    description: "임팩트 있는 타이포그라피로 제품을 강조합니다",
    promptIndex: 3,
    emoji: "✍️",
  },
  {
    type: "5",
    name: "제품이용설명서",
    shortName: "이용설명서",
    description: "제품 사용법 인포그래픽을 생성합니다",
    promptIndex: 4,
    emoji: "📋",
  },
];

export function getToolByType(type: string): ToolConfig | undefined {
  return TOOLS.find((t) => t.type === type);
}
