import express, { Request, Response } from 'express'
import cors from 'cors'
import "dotenv/config"
import compression from "compression"

const app = express()

app.use(compression())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors())

app.get("/api/test", async(req: Request, res: Response) => {
    res.json({messsage: "hello and welcome back"})
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
    console.log("Server running on localhost:8000");
    
})