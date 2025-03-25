import express, { Request, Response } from 'express'
import cors from 'cors'
import "dotenv/config"
import compression from "compression"
import limiter from './middleware/rateLImitMiddleware'
import authRoutes from "./routes/AuthRoutes"
import userRoutes from "./routes/UserRoutes"

const app = express()

app.use(compression())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors())
app.use(limiter)


app.use('/auth', authRoutes)
app.use('/users', userRoutes)

//To use it only for a certain path (e.g., limit only calls to the /auth/* endpoints), 
// specify the url as the first parameter in app.use
// app.use('/auth', limiter)

app.get("/api/test", async(req: Request, res: Response) => {
    res.json({messsage: "hello and welcome back"})
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
    console.log("Server running on localhost:8000");
    
})