import { join } from 'path'

const pathJoin = (...paths: string[]) => join(process.cwd(), 'src', ...paths)

export default pathJoin
