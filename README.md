## What's in there

- express + TypeScript
- Eslint + Prettier + VSCode integration
- VSCode integration for debugging
- absolute imports using `import { app } from '@/index'`
- integration with Sequelize and some basic models, migrations and seeds
- custom shell command (`yarn shell`) that has dotenv and sequelize models initialized
- simple pm2 integration to run a cluster
- custom error handling that supports Promise rejection (ergo async functions)
- integration with Jest and Supertest with automatic transaction rollback after each executed test and separate seeded db
- basic logging support with pino

## How to use

```
npx degit dkzlv/ts-express-back app-name
cd app-name
yarn install && yarn dev
```

## What to do next

1. uncomment the line with `.vscode` folder in `.gitignore` if you think this should not reside in VSC. You should definitely uncomment the line for `.env` file
2. rename app, author and other stuff in `package.json`
3. update `SECRET` variable in `.env` file
4. ...
5. profit!

## TODO

- [ ] sign-in/sign-up boilerplate code: storing emails, users, tokens
- [ ] simple tasks engine. Storing stuff in Redis
- [ ] caching mechanizm? Also Redis
