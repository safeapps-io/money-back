/**
 * Returns a Promise, that resolves after `ms` number of milliseconds
 * @param {Number} ms Number of milliseconds
 */
const delay = (ms: number) =>
  new Promise(resolve => {
    setTimeout(function() {
      resolve()
    }, ms)
  })

export default delay
