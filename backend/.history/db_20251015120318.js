import { Pool } from "pg"

const pool = new Pool({
	user: process.env.PG_USER,
	host: process.env.PG_HOST,
	database: process.env.PG_DATABASE,
	password: process.env.PG_PASSWORD,
	port: process.env.PG_PORT,
	max: 20,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 2_000,
})

export async function query(sql, ...data) {
	let client

	try {
		client = await pool.connect()
		const result = await client.query(sql, data)
		return result.rows
	} catch (err) {
		console.error("Database query error:", err.message)
		throw err
	} finally {
		if (client) client.release() // faqat client mavjud bo‘lsa, release qilinadi
	}
}
