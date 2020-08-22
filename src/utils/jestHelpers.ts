export const clearMocks = (obj: Object) =>
  Object.values(obj).forEach((fn) => fn.mockClear())
