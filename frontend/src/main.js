import "@app/css/main.css"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader"
import { upload } from "./upload"

const API_URL = import.meta.env.VITE_API_URL

handleRoutes()

async function handleRoutes() {

	const { pathname } = window.location

	if ( pathname === "/" ) {

		console.log( "HOME" )
	}
	else if ( pathname === "/upload" ) {

		upload()
	}
	else {

		const fileID = pathname.substr( 1 )
		const response = await fetch( API_URL + "/view/" + fileID )

		if ( response.ok ) {

			run( { arrayBuffer: await response.arrayBuffer() } )
		}
		else {

			console.log( "DEFUALT" )
		}

		console.log( fileID )
	}
}

async function run( { arrayBuffer } ) {

	const glbLoader = new GLTFLoader().setPath( API_URL + "/view/" )

	const canvas = document.getElementById( "gl" )

	const scene = new THREE.Scene()
	scene.background = new THREE.Color( 0x000066 )
	const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10_000 )
	camera.position.set( 50, 50, 50 )
	const renderer = new THREE.WebGLRenderer( { canvas, antialias: true, } )

	renderer.setPixelRatio( window.devicePixelRatio )
	renderer.setSize( window.innerWidth, window.innerHeight )

	const controls = new OrbitControls( camera, canvas )
	controls.minDistance = 10

	window.addEventListener( "resize", () => {

		camera.aspect = window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix()

		renderer.setSize( window.innerWidth, window.innerHeight )
	} )

	const textureLoader = new THREE.TextureLoader().setPath( "/assets" )

	const grassTexture = textureLoader.load( "/grass.jpg", t => t.colorSpace = THREE.SRGBColorSpace )

	const ground = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100 ), new THREE.MeshBasicMaterial( { map: grassTexture } ) )
	ground.rotateX( - Math.PI / 2 )
	scene.add( ground )

	// Lights

	const light1 = new THREE.DirectionalLight()
	light1.position.set( 2, 5, 3 )
	scene.add( light1 )

	const light2 = new THREE.AmbientLight()
	scene.add( light2 )

	render()

	function render() {

		renderer.render( scene, camera )

		requestAnimationFrame( render )
	}

	const geometry = new THREE.SphereGeometry()
	const material = new THREE.MeshStandardMaterial()
	const mesh = new THREE.Mesh( geometry, material )
	scene.add( mesh )

	await glbLoader.parse( arrayBuffer, "", glb => scene.add( glb.scene ) )
}