// 페이지 간 업로드 파일을 메모리에 유지 (탭 세션 동안 유효)
let storedFiles: File[] = [];

export const imageStore = {
  set: (files: File[]) => {
    storedFiles = files;
  },
  get: (): File[] => storedFiles,
  clear: () => {
    storedFiles = [];
  },
};
