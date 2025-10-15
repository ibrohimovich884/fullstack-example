import "@app/css/main.css"

window.onload = () => {

	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
	const API_URL = import.meta.env.VITE_API_URL

	google.accounts.id.initialize( {
		client_id: GOOGLE_CLIENT_ID,
		callback: handleCredentialResponse,
		auto_select: false,
	} )

	google.accounts.id.renderButton(
		document.getElementById( "g_id_signin" ),
		{
			theme: "outline",
			size: "large",
		}
	)

	async function handleCredentialResponse( { credential: token } ) {

		const response = await fetch( API_URL + "/auth/google", {
			method: "POST",
			credentials: "include", // omit
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify( { token } ),
		} )

		if ( response.ok ) {

			console.log( await response.json() )
		}
	}

	const button = document.querySelector( "button" )

	const input = document.querySelector( "input" )
	input.addEventListener( "change", async e => {

		const file = e.target.files[ 0 ]

		const formData = new FormData()
		formData.append( "file", file, file.name )

		const response = await fetch( API_URL + "/upload", {
			method: "POST",
			credentials: "include",
			// headers: {
			// 	"Content-Type": "multipart/form-data",
			// },
			body: formData,
		} )

		console.log( response )
	} )

	button.onclick = () => {

		input.click()

		// fetch( API_URL + "/some-data", {
		// 	credentials: "include",
		// } )
		// .then( response => response.json() )
		// .then( json => console.log( json ) )
	}
}
