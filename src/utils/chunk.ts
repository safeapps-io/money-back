export default function chunk<T>(arr: T[], chunk: number): Array<T[]> {
  const R = []
  for (var i = 0; i < arr.length; i += chunk) R.push(arr.slice(i, i + chunk))
  return R
}
