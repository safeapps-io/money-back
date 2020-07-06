'use strict'

const nanoid = require('nanoid').nanoid,
  _ = require('lodash'),
  argon2 = require('argon2'),
  faker = require('faker'),
  dateFns = require('date-fns'),
  { Crypto } = require('@peculiar/webcrypto'),
  cryptoOld = new Crypto(),
  { decode } = require('base64-arraybuffer')

function randomDateBetween(start, end) {
  return new Date(_.random(start.getTime(), end.getTime()))
}

const encrAlgo = 'AES-GCM',
  hash = (string) => cryptoOld.subtle.digest('SHA-512', Buffer.from(string)),
  encrypt = async (id, walletId, dataObj, key) => {
    const [hash1, hash2] = await Promise.all([hash(id), hash(walletId)])
    return cryptoOld.subtle.encrypt(
      {
        name: encrAlgo,
        iv: Buffer.concat([Buffer.from(hash1), Buffer.from(hash2)]),
      },
      key,
      Buffer.from(JSON.stringify(dataObj)),
    )
  }

const EntityTypes = {
  wallet: 'w',

  walletUser: 'wu',
  category: 'c',
  searchFilter: 'sf',

  balanceCorrectionTransaction: 'bct',
  balanceReferenceTransaction: 'brt',

  transaction: 't',
  ignoredTransaction: 'it',

  deleted: 'd',
}

const endDate = new Date(),
  startDate = dateFns.sub(endDate, { months: 12 })

// prettier-ignore
const tagsChoices = ['Отпуск', 'MetPet', 'Семья', 'CleverPay', 'Privacy'],
  mccChoices = ['0742', '0763', '0780', '1740', '1761', '1799', '3000', '3193', '3423', '3733', '5912', '7941', '9402']

const buildBase = () => {
    const created = randomDateBetween(
        startDate,
        dateFns.sub(endDate, { days: 1 }),
      ),
      updated = randomDateBetween(created, endDate)
    return {
      id: nanoid(),
      created,
      updated,
    }
  },
  buildBaseEntity = (walletId) => {
    const base = buildBase()
    return { ...base, walletId }
  }

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Account passwords: `qwerty123456`
     * Master passwords: `password-{username}`
     *
     * Exported secret key is below.
     */

    const encryptionKey = await cryptoOld.subtle.importKey(
        'raw',
        decode('0V3UEOpG7D1886MEW3FvgHk+qkhRR+ItHyAvvCcnF/w='),
        encrAlgo,
        false,
        ['encrypt'],
      ),
      pass = await argon2.hash('qwerty123456'),
      dkzlvData = {
        id: nanoid(),
        username: 'dkzlv',
        password: pass,
        b64salt: Buffer.from(
          decode(
            'dxuRJ+JV60+q7WFxFQxaU1QgFDosDoQLgdX2qyHI5Q4PFcM2+gj1iTgYfY2t4D7lujipeFCHZb5bE8qEegDZGQiY/2cnyGnaml8x6KUrCQqhOWsQx6eHPW5Q0KZzgsI7N6Cq0NGgnYz4ATxe1LBR/VjvBD/yAIsoQXAosUHJcQ5WKHc9C8+V3jhB64EUAAjnXtJr9f+b8G02Xoo0NKgXfKA8+Y2FiOCFhhZDMvyV0YA88Q91zuF6NqmEEzG9Ek/M8qsoK6CZ98KqkUBUpOReA5niuCMoiLOwx4anLU/tedqD5U645o6ILr3SPrutXQzLlmRZp2x5Hg/Vmw7HfgEkPQ==',
          ),
        ),
        b64EncryptedInvitePrivateKey: Buffer.from(
          decode(
            'eyJpdiI6IlpNRllnaU8zZVJNekQ4REtzSmpoUlM1cVdJdHdPRkwrcm9LS3RFdE9yM1ZCOHZDVFhJNGJBamp0MktqNkkzcS8wR1JKUWp0WFBqdTZ1WjRuYVd5cTRNMURVVGVtQUVHTHRqZndHOTJUUWpWVE1BN0JUckxnL2RzZXFpVW1ESWt5U0ZMSHZrRlo4ckVnZFprbmNsWkVwdXlPSVZleXlBTWdtRS9ST3kxZXBpWT0iLCJkYXRhIjoiZGJUSENHbUtNMng2WjFiWE1sOUtkc0NIUFRhZWZxbXFBa0NIaXRxNTBmYjlRSUZlNWVUcnNmMmEzMi9qWk52cFAxTm81aFdUOEZjdCtvMWhiRVJORGV0MVhidmdpTmdrU1k2L1RZS1drRU9kWUVBRFNXcE5uRmlnMHMvUjJkZmhNL3RDRzB1Y3BJMWJKR1NObGxzcU5tN2NUczZOTVpZbkRQc3R5aHFMVmQ1VURsYmRRajdyNFpENUxhUXRFYmN4WnNtTVZNeVNYWDFXYmpGeVJiU2NKaXR3QWhZYlJGajNJNGc0aEtNT3hqQURGQ3Vlek5rWkpKVitUeFUvbUpyYTkyeGVBVGJHZGFLSSt0bUpEcmVldjFGZGd4cUl1akx4dGlrOG9nWnJaNlNPNHZjLzZnWjVsWk1YbnpMUGJpNFVqbUNkb0FjZDdWcitYZXpuVGZjazdqWWxrdW9hQjgvM0xQQWI0WHVQTyt5cE0yYk1uNTJ6WGd5WmFYTytzSmxZYzcrcUhtOHVYaGdMclZLMUV5NndTblE3bkpINktBMUJtTzV5WWxuM2s3RWtiLzlhQlk4NFBnWmIwSEFrNUxUQlpMV2pSNWs2dFNrbTdFWlpxYmNHclFFQjNQYTZjRUJBL2QxSTlWWTVocElsdDdkR0E0a3M1dDdHTXlSNTNCbUU0NmphS2s4L3VYdDNLbFpYbFBhVzB6TnVVWTlIQ0M3dUpQRjdPZ3ZGbzRSaTlQbnNQb2plK0tSZGRKMFQ3K2tqK0hRMVZmV0ZKbkQzbklEUFVkdmNBbE5yQjZrSWdhblhISUlVT05qZTFTSUQ1ZUdYY1JzeVlJOEJ6TE9UZ0FIQnRGUlB5RU9ZNzEwZWJiSGkxbzgwWEtPY2JGenRnQ3pSYjRYSi9lVHIxSHpPRVp4aDYybHRmV093NlhnNWh4bDJod1RPMjBEQ21yVmp1R3F2TnlmalZ4VStGdHdUQ054ZTNPNDk5WFpxemRQSVFsS3N0ckNXV2xTVkt2NXZjNGZhQ3MrOGtYNjl0M09XdUEyZVh6OFRFZmFEOXZNaUZhdW03bHJJK2VCTFkwdFZVbitrYUJEaGRxbU5jWVhiYzJhR1dpUTBGTlZEVXVNMWg0dlJsTWJJY2tBdTRmQlNqTENpMnpJaW85L3lpVUw5MlQ5ZjRjWHJoSVNkQWp2eFVhdjBITEQ5V04wem9NbElDcTU0VnZmOTJuekJiUEhuZWk5WklRK0YwZ2V4UVNEVUZzd1FOWVMxU1VDek9RcW1RdDZPWTRBWjJxKzBGcVdsdWNRU2dDS2tQd2ozQUhWaFhzVmJ0S2d2SzRUa0svdXRJMStpRGJjYTRzQXNLTFR3dmI2c1dsTWxTaUxOSFA4dGo1eVBhaWJpc0x4dVBkZWZzd3dZNkdMRnlrbk1KUG9tbWlydlk5MC9aR0UxK1NzUkE0U0JGV0U3S0hHalNGaHNQbmNBR1BIc2pJZjFmbzJSblMvbWh4YmQydm9iOENDaytZS0RHa0dpK3ZnUWttUzUvSENQZlQwbWtuZVV3ZWtmaXYxWlBzYUhmTTJSVkFKcWR6WDBJb3BqOWhsc2I5Q2hHajk0NXY5S3k5OHhqZ3psMSswSnI1SlJ4dVRkc29lNWl1ZFlsUW1ObjVUdUY1VFE4SWVYVFRXdi9jZGZRTHlNaEtFVnp2VktwRW9OWVc4Z09IMEdSSy81d29FaTV2N0lPMnoxejRmS0JEWmxuTFB3NThibmx2ZEpUeW1BdC9NNnFlVXhyY05QZDBoMDBhd0Z0Qm9KYXVVTUs1bFROU3RHTWcvRExKRXc2QUVyaEFwT2x3Ync3czNxMFNJejRUYU1NN0tHSmw2MUtFKzVVK0lNSzJOa3lrWjIyNjNwZkhjVUVXZ2ppMDRodDZVM3E2NlFjenpIQWJ3SkZGL0tjRklpREs0RWpXVE9PVkZRczdpU01rOG9GTmNZR21aM3Faa0srV25TT0t0Ukg0ZURMUmZ4VTZjZFh6Z0lIbE13RzdDT2l0Z2R0OHN5NHoyVkN6Rnk5d2pvSU9FVnN6YmlNbmRsQTRXNUkrUTcwTmZMSHY0T0ZrdUwzZStnNEhQQ3VoSmxzQkFHbXg0Qml4dFE5R1F4MVNObGRzeVRqclFCNW9xWFpxSnI2TDEzdDg0aUFML1VkVlJERDBlTUMvZ0R2SC9GNE84PSJ9',
          ),
        ),
        b64InvitePublicKey: Buffer.from(
          decode(
            'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsllDjXdhxeRHhMMVkqYGKUImcb2Bt+bM/vLtDYgWwZVS7HWvAhBSiDP3uQnxa9XjOGlOn9a0iwD81eKX4sVkt4+xFBJtvGsNzDhz2yKoGKuBe9dumB7AK9uYvIi9HnLou6ViM9HT+jmKrswTwrHwUVrZVLH5+mufb5MGBRAVutVh7PfamKg975X2xzaX5JZOP0s+F31fDa79Oz84MbxBqjnMvEQn7TXvicHfshRMY+3DC5bEhX+nMKuYbhZQ4LMM6Ia7JtnGLfkHZ3iIccVcsRSk439vF+pUxg/Yvi/eRdLzZ51cxcgW7azWkaXelLdOemdyHXfbnhNhZVHoGKMkvQIDAQAB',
          ),
        ),
      },
      dkzlvChest = Buffer.from(
        decode(
          'eyJpdiI6IjFLc0Z6enNpdmY2MXVyckFSRXN1aitoNTUzQlZDMTFrVGg4YURKWEZwMm5jWVdscUZtYVF6amhBOU9zUVhpN216UG1WaGNkd2F0N3ZkMEQzdFpJbXhEb3R6RzE3WlZ4Y2VvR2x1NUJleWltZ3puT0tLdHRIRVBXeFlGamNmd0ZDWldVRzdwMnRxV1FJdGFkWnppNlI4cU8wQ3BBNk9SdEtKSUdhWXNuUm1Sbz0iLCJkYXRhIjoiOGdPa0lpRHZjNnVJMDQwNmFDWFFHL1FyN21aYUIwcEJpQkJBYkdYTmxOUlJMNzhvUzB5VzRvdk5mVHZQN2NvbiJ9',
        ),
      ),
      amaData = {
        id: nanoid(),
        username: 'ama',
        password: pass,
        inviterId: dkzlvData.id,
        b64salt: Buffer.from(
          decode(
            'pDC4j9ziloQwcuuQnTMPEZcPxvI32vH2AFWcAcjX3ALks48e80PmI+pS+ZhpwoweR0I2TAibyUAgI6lTDMv2OlR4ilNITbjv6WxlJVZKECjBIVd/8FZ4plugXH+bZFJu/WsRFQ/yn5NXFu4YpS8PIMxVVeKXAjhRIx80AymaCry56/nRjK7NlV2apPmpDr6FshYPp1jnDi4Ise9oThwBUmSmo8V7d1hMcRm3MRCZgTlCAltjlQho7Mnff36wPnDhfCmQ769xXeaQyjficqDxhrUjVa+FrM5jJ/cEmyIl+twE4fac7gtU7QELEm3nyhPqcJ3vKdkyrnjKMdME8CP06Q==',
          ),
        ),
        b64EncryptedInvitePrivateKey: Buffer.from(
          decode(
            'eyJpdiI6InkzS0hQMzZ4dkhiTGM2UWVXcHhvMG9sbzljOXhNcXNMd1Z6UnJCMW1nbDFVaUJoNzJkZDRIUGVZMnZ6Zzd4RGRLS1VOaGwvTmFpMTdaaUNJZ25RYzJnbitxUUdYQlkxYkdBZ0JhOElxc1lLWkUvSVAwZWZaYnY4bmZTV2ZCdUg5bWwyRExyZXdRd05Sc28yZXNvQ2NwZ1hrNFBxd3ZCU0wvcWgvRWJyOXV6TT0iLCJkYXRhIjoieHZyQmJnTEFnZjUxc0RtNVZQN1YxVUFISjc2VTF1VFdxY1U3a3NTNXR1MWYvQnJvaWlFclJKWWZmYThBZjRXNGU2S1ZadjhmaysxbUdZRDVsS042eTdSUG1ESHUvV2VZQ09vOHFEdzdUSTl0dnZubjhvTzl6UEFYZ0JBZHZQT2Z0QTZ2U282cFN6aGcvMUpaeHpDZzBWV3Jya0JVR2xUdDkvaWxtRnd1SW4vVHFLUlBMdDI1NDlVTTZFUjN5UlRNOWZBd0hWUXpGcnZ1eW8zVXNPZHZyRTJ1MWhxc3BoSVZuWUFQTWhxL2ZsVFF5Sld4a0ZDdVNzUU1qQzlkZFc0VE9NR1lnMDdpb1RFb1hZVU56Rko5WHNOMFlTR0xxY0dhUGgxbXpHVlZtNmNJdDZNRTNJNVBNaHd6c1VQTDUvUmQ3ODVCYnJsbW5KZ1dDczJOaytHanp6enpWYVJtNkdDTUpWd0FQbi81T3RIT1M2TGl2OC8wOUNwT1R1dGoxdWdPM0lJWSs2b0FBaHRmSkUvZ3BidUZLdFFIbUVyWTUvRjJBUVRlYnBkTzZJRTJicVJYTWpjeGR6bXg4WnZ3Qis2L0kwdE05cFE1TWJNTmNxaXZWenlCMFZNb3RENnVXT2xIR0NmS20vaGNkUENoZTNwSjdkMnIrRU9LSDNNUG14VlcvU2RzR0pyaklSQkJjQVNVUnA3S2F0bGs0U1llaXNhd3pielRXZHJta2p0VW1CREZ0U0dyanI4NTJEWXB6d0tIYWxDSUx3VUJPcUIxNnhKQVVQOWdKL3A4VitaZHkvbnI2OEV4TkhoTWJuT3dFSFk3Q0ZYemlZUlQrYUtTR2g1QWRIeHdBR2RiRFpXNm9reHl6T2xjbFhEbGNHZC90TDc3ajNoWEVrNklubG1weTgycG1MdnpVVEFSakFBRUc1N2k2MU1vaDN2TnQ4TzYzSXFoRUlpcE44SkhrS0pJS3lOMXJkazBMb3lFR1Mxeld4aHhJSWJtY04zZkFCekRSVU1UREZVZlZjSEFPNDRFdzR0eHkra0VsZEljWGhZeWtORllkUmRUcVFNZHZQRGtVS2JMV05rd3E1K0YzUjY1YWhKM2dtaVlTVjU3UXRnTEtXSlNraXZ2OWc4cnBOamFsUDZXTGdhN1lSSkNIYlhuakd4cGhIYnVsR3lycXFzZGpxek9JWm5HQVR3eVUxMTJVcmdHK1FYZ0hNd1hLaFBBL2pkWTc0dWdVeUxWSmpZdElFN2hHdjNST3RqWXBwdHBGL0Z6dlMvQnI3eUFQblNGZWhLS1dIWFpOenY2czJuNklYbFZ3OTV2SmdJdGZhSWtaem1Nd3Zpd0JUZUhjZnJyeFcxRGdna1YrMTNaVk1oWndKK25PalRhcGlCWXV4U2RWLzFTSmNqTUNmNzNBVHRZL2dhOE9aVDJXak5pS25vTXVyaXIrV2h0Vkl6TWI1U1VzQXMrcmZFZDVJdnVCNENmVXBycDA0cGNacDdHcDIwLzEvaWRtZ3h5OGw4L253UjdsWG9SQzRDSjhMQlFSQjlmRUwvRzFRNTFlK25Pb1BXRnMvN3NCRExpYWhXUW94R0NvM0lGTms2VHV5Y1llaXZKQzBtTm1iNFQwZDlIbUllckF4N2tObktzS3NmMDhQM2E0S1ZrRFM5SzBiWWwwL3NhaU1CNFBQUm1SVHB6N3p1aWFhWEVkMExqRmNBbGwyTEdHb1FWZXN3NHBuNzJUMDVheGlBcFhFNjAxRk1qT05OQ3NjQnBIZzdKZ1o4V1pqUXFBMWJ0WlJCOFNBWXN1Y011RkEvSkdXQjBXN3MwTmNQb3lVcm5aRWwxRnFWakpVZCtiSzJoSkNqWE9ONEdVR2lsRmJPOGhVUFZ1SGJEdUl1b2FEc0I4ajB5TUxneTFJbFIvQkNwQ29md2RzTFFrRk9iODRQWWprWk5zdnd2UEJYa2NUWTRZSjIvOVlNdThGZHhsZ29XUXpacjF2cVhUMi8rVERPWXZuNVhKbThGenpaYVk1ZE5YS2U5eDU4bUFuM2w4YWNYMk15QTgrQStYR3BKZzhUMGRnZG14U0pQZHQwdTBidnJkTWthenJKLy9KVm9NU1ZKU21lalNzS1JqZVFRaVF6QjJDeHJUZmFDbER2eE5RYjZWM0s1UGttSG83Ujc4MGJETUNydGV4V29tdk5hTkE9PSJ9',
          ),
        ),
        b64InvitePublicKey: Buffer.from(
          decode(
            'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApQYVBQuZC35rkQhJCJUtLTc3Jha956L9qh8OGQZ7cOsH4JD3sOExAqCEBhVzStcemghILGv+S78LtHJ8lJH2HVpx0CGymp/D3MFyC3yu1U75d6IBBaBMQtDcb3WhsgZaP/Y/afCcSlShbEiWIDwIp30AcmtXQm5bqMGW5jAybPhsp4A+2IrcHuy1PGpMLHjfldXfkbLApr3e4yf8bmYPnEJ8n01AHAb9afaDLu+4F4oLEMQwqh4PJEDeJl73lL9fhGmKY16vrpUZD+sTqXNEuqQ8nDiY2HSWV2WeaCFJ/YvZ/DGosIHKfRllWaVyI9Kad9gKV8CkX83pbQGMtqRNTQIDAQAB',
          ),
        ),
      },
      amaChest = Buffer.from(
        decode(
          'eyJpdiI6ImdFL0h4QTlaOXFMa0pUYlFCRTNBM1Q4VUE1VVFBLzdRQzVFdlJpQ01kYmhsSko2T3dydVA5aGd5VVF4VXh3VmVvQzNPT05EOTlZNUQvbmJiMElxdFZIanNDbDdGa1o5QzZ3V2xad09vSUhBZE13QVp6MGpxVUdGQm1YQktzWFMzOXE0TFB2K2tjOGEvNFltZmpaVnJuSHNDYVhzSVFOdW05UXcyekVPOWtHMD0iLCJkYXRhIjoiMXl2aDF3TXQ4c1lpaVFOeS94SEx3QkpiK1VPTmd0SXdKN2xkbk9JcXlwWWQzakdUc2NadWJOOWlRRGxobTYyRSJ9',
        ),
      ),
      users = [dkzlvData, amaData],
      userIdChoices = [dkzlvData.id, amaData.id]

    await queryInterface.bulkInsert(
      'Users',
      users.map((d) => ({
        ...buildBase(),
        ...d,
      })),
    )

    const wallets = _.range(5).map(buildBase),
      walletIdChoices = wallets.map((w) => w.id)

    await queryInterface.bulkInsert('Wallets', wallets)

    const walletAccesses = walletIdChoices.flatMap((walletId) =>
      users.map((user) => ({
        ...buildBase(),
        userId: user.id,
        walletId,
        chest: user.id === dkzlvData.id ? dkzlvChest : amaChest,
        accessLevel: user.id === dkzlvData.id ? 'owner' : 'usual',
      })),
    )

    await queryInterface.bulkInsert('WalletAccesses', walletAccesses)

    // Base entity with decr: `{}`.
    // Gonna transform it to `{ decr: undefined, encr: ArrayBuffer }` later.
    const entitiesDecr = []
    for (const walletId of walletIdChoices) {
      const categories = _.range(50).map(() => ({
          ...buildBaseEntity(walletId),
          decr: {
            type: EntityTypes.category,
            name: faker.commerce.department(),
            color: faker.internet.color(),
            isIncome: Math.random() < 0.1,
          },
        })),
        incomeCategoryId = categories
          .filter((cat) => cat.decr.isIncome)
          .map((cat) => cat.id),
        expenseCategoryId = categories
          .filter((cat) => !cat.decr.isIncome)
          .map((cat) => cat.id)

      const walletData = {
        ...buildBaseEntity(walletId),
        decr: {
          type: EntityTypes.wallet,
          name: faker.commerce.department(),
        },
      }

      const walletUsers = users.map((user) => ({
        ...buildBaseEntity(walletId),
        decr: {
          type: EntityTypes.walletUser,
          userId: user.id,
          name: user.username,
        },
      }))

      const firstSearchFilterId = nanoid(),
        searchFilters = [
          {
            ...buildBaseEntity(walletId),
            id: firstSearchFilterId,
            decr: {
              type: EntityTypes.searchFilter,
              name: 'Всё',
              parameters: JSON.stringify({
                datetime: {},
                category: {},
                tag: {},
              }),
              balanceType: 'independent',
              sharedBalanceSearchFilterId: null,
            },
          },
          {
            ...buildBaseEntity(walletId),
            decr: {
              type: EntityTypes.searchFilter,
              name: 'По месяцу, без 3 тегов',
              parameters: JSON.stringify({
                datetime: { type: 'calendar', period: 'month' },
                category: {},
                tag: { exclude: _.sampleSize(tagsChoices, 3) },
              }),
              balanceType: 'reference',
              sharedBalanceSearchFilterId: firstSearchFilterId,
            },
          },
        ]

      const correctionTeansactions = _.range(10).map(() => ({
          ...buildBaseEntity(walletId),
          decr: {
            type: EntityTypes.balanceCorrectionTransaction,
            isActiveReference: null,
            amount: _.random(-5000, 5000),
            searchFilterId: firstSearchFilterId,
          },
        })),
        referenceTransactions = _.range(3).map((i) => ({
          ...buildBaseEntity(walletId),
          decr: {
            type: EntityTypes.balanceReferenceTransaction,
            isActiveReference: i === 0,
            amount: _.random(500000, 1000000),
            searchFilterId: firstSearchFilterId,
          },
        }))

      const transactions = _.range(_.random(500, 600)).map(() => {
        const decr = {
          type: EntityTypes.transaction,
          isIncome: Math.random() < 0.05,
          userId: _.sample(userIdChoices),
          description:
            Math.random() < 0.1 ? faker.commerce.productName() : null,
          autocompleteData: {},
        }

        if (decr.isIncome) {
          decr.amount = _.random(20000, 100000)
          decr.categoryId = _.sample(incomeCategoryId)
        } else {
          decr.amount = _.random(50, 5000)
          decr.categoryId = _.sample(expenseCategoryId)
          if (Math.random() < 0.1) {
            decr.originalAmount = _.random(1, 100)
            let curr
            while (!curr || curr.split(' ').length === 2)
              curr = faker.finance.currencyCode()

            decr.currency = curr
          }
          if (Math.random() < 0.8) {
            decr.autocompleteData.mcc = _.sample(mccChoices)
            decr.autocompleteData.accNumber = _.random(2500, 9000).toString()
            decr.autocompleteData.merchant = faker.company.companyName()
          }
        }
        decr.isDraft = Math.random() < 0.01
        decr.tags =
          Math.random() < 0.2
            ? [Array(_.random(1, 2)).keys()].map(() => _.sample(tagsChoices))
            : []

        return { ...buildBaseEntity(walletId), decr }
      })

      entitiesDecr.push(
        walletData,
        ...categories,
        ...searchFilters,
        ...walletUsers,
        ...correctionTeansactions,
        ...referenceTransactions,
        ...transactions,
      )
    }

    const encrypted = await Promise.all(
        entitiesDecr.map((ent) =>
          encrypt(ent.id, ent.walletId, ent.decr, encryptionKey),
        ),
      ),
      toSave = entitiesDecr.map((ent, i) => ({
        ...ent,
        decr: undefined,
        encr: Buffer.from(encrypted[i]),
      }))

    toSave.forEach((e) => delete e.decr)
    return queryInterface.bulkInsert('Entities', toSave)
  },
}
