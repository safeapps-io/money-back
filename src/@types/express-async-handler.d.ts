import express = require('express')

declare module 'express-async-handler' {
  export default function ash<T extends express.RequestHandler>(handler: T): T
}
