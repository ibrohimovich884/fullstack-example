import "@app/css/main.css"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader"

const API_URL = import.meta.env.VITE_API_URL

handleRoutes()
run()


async function handleRoutes() {
	const { pathname } = window.location
	const fileID = pathname.substr(1)

	if (fileID) {
		// View mode
		const response = await fetch(API_URL + "/view/" + fileID)
		if (response.ok) {
			console.log(response);

			run({ arrayBuffer: await response.arrayBuffer() })
		} else {
			console.log("Not found")
		}
	} else {
		// Upload mode
		const formData = new FormData()
		formData.append("file", yourFileInput.files[0]) // file inputdan ol

		const response = await fetch(API_URL + "/upload", {
			method: "POST",
			credentials: "include", // cookie yuborish uchun
			body: formData
		})

		if (response.ok) {
			const data = await response.json()
			console.log("Upload success:", data)
			// QR yoki link chiqarish uchun shu URL dan foydalanasan:
			console.log("Your model link:", API_URL + data.url)

			// Hozircha esa shu faylni darhol ochamiz:
			const viewRes = await fetch(API_URL + data.url)
			if (viewRes.ok) {
				run({ arrayBuffer: await viewRes.arrayBuffer() })
			}
		} else {
			console.error("Upload error:", response.statusText)
		}
	}
}

async function run({ arrayBuffer }) {

	const glbLoader = new GLTFLoader().setPath(API_URL + "/view/")

	const canvas = document.getElementById("gl")

	const scene = new THREE.Scene()
	scene.background = new THREE.Color(0x000066)
	const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10_000)
	camera.position.set(50, 50, 50)
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, })

	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(500, 400)

	const controls = new OrbitControls(camera, canvas)
	controls.minDistance = 10

	window.addEventListener("resize", () => {

		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()

		renderer.setSize(window.innerWidth, window.innerHeight)
	})

	const textureLoader = new THREE.TextureLoader().setPath("/assets")

	const grassTexture = textureLoader.load("/grass.jpg", t => t.colorSpace = THREE.SRGBColorSpace)

	const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ map: grassTexture }))
	ground.rotateX(- Math.PI / 2)
	scene.add(ground)

	// Lights

	const light1 = new THREE.DirectionalLight()
	light1.position.set(2, 5, 3)
	scene.add(light1)

	const light2 = new THREE.AmbientLight()
	scene.add(light2)

	render()

	function render() {

		renderer.render(scene, camera)

		requestAnimationFrame(render)
	}

	const geometry = new THREE.SphereGeometry()
	const material = new THREE.MeshStandardMaterial()
	const mesh = new THREE.Mesh(geometry, material)
	scene.add(mesh)

	await glbLoader.parse(arrayBuffer, "", glb => scene.add(glb.scene))
}

window.onload = async () => {
	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
	const API_URL = import.meta.env.VITE_API_URL

	google.accounts.id.initialize({
		client_id: GOOGLE_CLIENT_ID,
		callback: handleCredentialResponse,
		auto_select: false,
	})

	google.accounts.id.renderButton(
		document.getElementById("g_id_signin"),
		{ theme: "outline", size: "large" }
	)

	async function handleCredentialResponse({ credential: token }) {
		const response = await fetch(API_URL + "/auth/google", {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token }),
		})
		if (response.ok) console.log(await response.json())
	}

	// ⬇️ Bu yerga qo‘shamiz:
	await handleRoutes()
}
run({ arrayBuffer: null })

async function runAllModels() {
	const response = await fetch(API_URL + "/view-all")
	const models = await response.json()

	const canvas = document.getElementById("gl")
	const scene = new THREE.Scene()
	scene.background = new THREE.Color(0x101820)
	const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
	camera.position.set(0, 50, 100)

	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(window.innerWidth, window.innerHeight)

	const controls = new OrbitControls(camera, canvas)
	const light = new THREE.AmbientLight(0xffffff, 1)
	scene.add(light)

	const loader = new GLTFLoader()

	let xOffset = 0

	for (const model of models) {
		try {
			const res = await fetch(API_URL + model.url)
			const arrayBuffer = await res.arrayBuffer()
			loader.parse(arrayBuffer, "", (gltf) => {
				gltf.scene.position.x = xOffset
				scene.add(gltf.scene)
				xOffset += 20 // keyingi model yoniga chiqsin
			})
		} catch (err) {
			console.error("Error loading model:", model.id, err)
		}
	}

	function animate() {
		requestAnimationFrame(animate)
		renderer.render(scene, camera)
	}
	animate()
}

runAllModels()
