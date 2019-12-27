import sequelize from '@/models'
import wrappedApp from './wrappedApp'
import { SuperTest, Test } from 'supertest'

/**
 * A patched version of Jest's `it` method. It doest two things:
 * 1. creates a transaction for the test and rolls it back after execution (for now there's no other
 *    appropriate solution for this problem: https://github.com/sequelize/sequelize/issues/11408)
 * 2. provides the test case with Supertest's client to the app
 *
 * @param title Test name
 * @param fn Async function with test case
 */
const itPatched = (title: string, fn: (app: SuperTest<Test>) => Promise<any>) =>
  // @ts-ignore
  global.it(title, async () => {
    const app = await wrappedApp
    return new Promise((resolve, reject) => {
      sequelize
        .transaction(t =>
          fn(app)
            .then(() => {
              resolve()
            })
            .catch((err: any) => {
              reject(err)
            })
            .finally(() => {
              throw 'Rollback'
            }),
        )
        .catch(err => {
          if (err === 'Rollback') return
          reject(err)
          console.log('Error in test:')
          console.log(err)
        })
    })
  })

export default itPatched
