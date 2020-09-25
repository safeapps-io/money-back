// (c) https://stackoverflow.com/a/57364353/3720087
export type Await<T> = T extends {
  then(onfulfilled?: (value: infer U) => unknown): unknown
}
  ? U
  : T