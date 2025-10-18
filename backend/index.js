import path from "node:path"
import { fileURLToPath } from "node:url"
import express from "express"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import cors from "cors"
import rateLimit from "express-rate-limit"
import morgan from "morgan"
import jwt from "jsonwebtoken"
import multer from "multer"
import { customAlphabet } from "nanoid"
import { query } from "./db.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log(await query(`select * from assets`))

const PORT = process.env.PORT || 3_000
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const JWT_SECRET = process.env.JWT_SECRET

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz", 16)

const assets = new Map()

const app = express()

/*
	Parses incoming JSON payloads from HTTP requests (e.g., POST/PUT data)
	and makes them available in req.body as JavaScript objects.
*/
app.use(express.json())

/*
	Parses cookies attached to the client request,
	making them available in req.cookies for further processing.
*/
app.use(cookieParser())

/*
	Adds various security-related HTTP headers to responses,
	protecting the app from common web vulnerabilities (e.g., XSS, clickjacking).
*/
app.use(helmet())

/*
	Enables Cross-Origin Resource Sharing (CORS) with credentials support,
	allowing the server to accept requests from different origins
	and include cookies/auth headers in both requests and responses.
*/
app.use(cors({
	credentials: true,
	origin: "http://localhost:3001",
}))

/*
	Rate limiting middleware to prevent abuse and brute-force attacks.
	Limits each IP to 100 requests per 15-minute window.
*/
app.use(rateLimit({
	windowMs: 15 * 60 * 1_000, // 15 minutes
	max: 100, // Max 100 requests per IP
	message: "Too many requests, please try again later."
}))

/*
	HTTP request logger middleware with a custom format,
	logging method, URL, status code, response time, client IP, and user agent
*/
app.use(morgan(":method :url :status :response-time ms [:remote-addr :user-agent]"))

/*
	File uploading middleware
*/

const storage = multer.diskStorage({
	destination: (req, file, cb) => {

		cb(null, "assets/")
	},
	filename: (req, file, cb) => {

		const id = nanoid()

		const filename = id + path.extname(file.originalname)

		assets.set(id, {
			path: filename,
		})

		cb(null, filename)
	},
})

const upload = multer({ storage })

/*
	Protect routes
*/

function privateRoute(req, res, next) {

	if (!req.cookies || !req.cookies.session_id) {

		return res.status(401).send({ error: "Unauthorized" })
	}

	try {

		jwt.verify(req.cookies.session_id, JWT_SECRET)

		next()
	}
	catch (error) {

		return res.status(401).send({ error: "Unauthorized" })
	}
}

// ---ROUTES---

app.get("/view/:fileID", (req, res) => {

	const { fileID } = req.params

	if (assets.has(fileID)) {

		const file = assets.get(fileID)

		const filePath = path.join(__dirname, "assets", file.path)

		return res.sendFile(filePath, err => {

			if (err) {

				res.status(500).send("Error sending file")
			}
		})
	}

	res.status(404).end()
})

// Yangi route: barcha yuklangan 3D fayllarni ko‘rsatish
app.get("/view-all", (req, res) => {
	const all = Array.from(assets.entries()).map(([id, { path }]) => ({
		id,
		url: `/view/${id}`
	}))
	res.send(all)
})


app.post("/upload", [upload.single("file"), privateRoute], (req, res) => {
	if (!req.file) {
		return res.status(400).send({ message: "No file uploaded!" })
	}

	const file = req.file
	const fileID = path.basename(file.filename, path.extname(file.filename))

	assets.set(fileID, { path: file.filename })

	res.status(201).send({
		message: "ok",
		id: fileID,
		url: `/view/${fileID}`
	})
})


app.get("/health", (req, res) => res.send({
	status: "ok",
	timestamp: new Date().toISOString(),
}))

app.get("/some-data", privateRoute, async (req, res) => {

	res.send({ some: "Data" })
})

// Sign-in with Google
app.post("/auth/google", async (req, res) => {

	if (!req.body || !req.body.token) {

		res.status(400).end()

		return
	}

	const { token } = req.body

	const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)

	if (!response.ok) {

		res.status(401).end()

		return
	}

	const payload = await response.json()

	if (payload.aud !== GOOGLE_CLIENT_ID) {

		res.status(401).end()

		return
	}

	const JWT_TOKEN = jwt.sign({
		email: payload.email,
	}, JWT_SECRET, {
		expiresIn: "7d",
	})

	res.cookie("session_id", JWT_TOKEN, {
		maxAge: 1_000 * 60 * 60 * 24 * 7,
		secure: false,
		httpOnly: true,
	})

	res.status(201).send({
		name: payload.name,
		email: payload.email,
		profile_picture: payload.picture,
	})
})

// Run the server
app.listen(PORT, "0.0.0.0", () => console.info(`Server ready at: ${PORT}`))