// Initializing config variables
import dotenv from 'dotenv'
dotenv.config()

// Initializing DB stuff
import sequelize from '@/models/setup'
sequelize.sync()
