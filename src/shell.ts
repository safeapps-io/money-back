// Initializing config variables
import dotenv from 'dotenv'
dotenv.config()

// Initializing DB stuff
import { sync } from '@/models'
sync()
