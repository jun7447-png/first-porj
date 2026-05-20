export interface TemplateInfo {
  id: number;
  name: string;
  description: string;
}

export const TEMPLATE_LIST: TemplateInfo[] = [
  { id: 0, name: "상품 인포그래픽", description: "사용법·부품명 등 실용 정보가 담긴 인포그래픽" },
  { id: 1, name: "클로즈업 샷", description: "제품 특징을 강조한 확대 클로즈업 컷" },
  { id: 2, name: "모던 라이프스타일", description: "세련된 건축 공간에 배치된 라이프스타일 컷" },
  { id: 3, name: "타이포그라피 포커스", description: "\"올해의 인기 Pick\" 카피가 강조된 제품 이미지" },
  { id: 4, name: "상세페이지 트렌드", description: "최신 트렌드 반영 상세페이지용 랜덤 컷" },
];
