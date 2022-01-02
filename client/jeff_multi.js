var multiplayer_connection

function f_multi_set_enabled(enabled) {
		element_button_connect.disabled = enabled
		element_button_disconnect.disabled = !enabled
		element_list_chat.disabled = !enabled
		
		element_text_multiplayer_name.disabled = enabled
		element_text_multiplayer_lobby.disabled = enabled
}
function f_multi_message(msg, s = {max:20, type:'normal'}) {
	var default_settings = {
		max:20,
		type:'normal'
	}
	var settings = {
		...default_settings,
		...s
	}
	while (element_list_chat.children && element_list_chat.children.length >= settings.max) {
		element_list_chat.removeChild(element_list_chat.firstChild)
	}
	
	new_line = document.createElement("li")
	switch (settings.type) {
		case 'error':
			new_line.style.color = 'red'
			new_line.innerText = msg
			break
			
		case 'summary':
			new_line.innerHTML = msg
			break
			
		default:
			new_line.innerText = msg
			break
	}
	element_list_chat.appendChild(new_line)
}
function f_make_message(type, data) {
	d = {}
	d.type = type
	d.data = data
	return JSON.stringify(d)
}
function f_sanitize_chat(msg) {
	return msg.replace(/[^0-9a-zA-Z\.\-\_\(\)\,\*\ \\\"\/\:\[\{\]\}\%\$]/g, '*')
}
function f_websocket_send(type, data) {
	if (!(multiplayer_connection && multiplayer_connection.readyState == WebSocket.OPEN)) {
		console.log("Tried to send a message but the connection wasn't open. Is normal if multiplayer's not connected")
		return
	}
	
	console.log("Sending message " + type + "...")
	multiplayer_connection.send(
		f_make_message(type, data)
	)
}
var pingID
function f_websocket_handle_open(event) {
	multiplayer_connection.onmessage = 	f_websocket_handle_message
	multiplayer_connection.onclose = 	f_websocket_handle_close
	
	data = {
		name:f_sanitize_chat(element_text_multiplayer_name.value),
		lobby:f_sanitize_chat(element_text_multiplayer_lobby.value)
	}

	f_websocket_send('connect', data)
	pingID = setInterval(f_websocket_send_ping, 45000)
}
function f_websocket_send_ping() {
	f_websocket_send('ping')
}
function f_websocket_submit_answer(answer) {
	f_websocket_send('answer', answer)
}
function f_websocket_handle_error(event) {
	f_multi_message("WebSocket error: The multiplayer server probably isn't running.", {type: "error"})
	// TODO: This is a terrible hack. Change it so that when the page loads, a timer tries to connect to the WS server every x seconds, enabling multiplayer UI when it is up
	if (multiplayer_connection) {
		multiplayer_connection.close()
		multiplayer_connection = null
	}
	f_multi_set_enabled(false)
	
	console.log(event)
}
function f_websocket_handle_message(event) {	
	//var msg = JSON.parse(event.data).toString('utf-8')
	console.log("Processing incoming message...")
	var msg = JSON.parse(event.data)
	//console.log(event.data)
	console.log(msg)
	
	switch(msg.type) {
		case 'generic':
			f_multi_message(msg.data)
			break
		
		case 'login_failed':
		case 'error':
			f_multi_message(msg.data, {type:'error'})
			multiplayer_connection && multiplayer_connection.close()
			break
			
		case 'connected':
			f_multi_set_enabled(true)
			f_multi_message("Welcome to the " + (element_text_multiplayer_lobby.value || "Default") + " lobby!", {max:1})
			break
		
		case 'joined':
			f_multi_message(msg.data.name + " joined the lobby.")
			break
			
		case 'left':
			f_multi_message(msg.data.name + " left the lobby.")
			break
			
		case 'answer':
			f_multi_message(msg.data.name
				+ (msg.data.guessed ? " guessed" : " answered")
				+ (msg.data.right ? " correctly" : " wrong")
				+ " for $" + msg.data.amount
			)
			break
		
		case 'summary':
			function f_get_html_answers_data(type, data) {
				return "<tr><td>" + type + ":</td><td>"
					+ data.correct + "/" + data.given
					+ "</td><td>" + data.percent
					+ "</td><td>" + data.total + "</td></tr>"
			}
			f_multi_message(msg.data.name + "'s totals:<table border='1px solid black'>"
				+ (msg.data.answers.given ? f_get_html_answers_data("Official", msg.data.answers) : "")
				+ (msg.data.guesses.given-msg.data.answers.given ? f_get_html_answers_data("With Guesses", msg.data.guesses) : ""),
				{type:'summary'}
			)
			break
			
		case 'chat':
			f_multi_message(msg.data.name + " says: " + f_sanitize_chat(msg.data.message))
			break
		
		case 'exit':
			f_multi_message(d.data.message || "Server has shut down.", {type:'error'})
			multiplayer_connection && multiplayer_connection.close()
			break
			
		case 'ping':
			console.log('keepalive ping on websocket')
			break
		
		default:
			console.error("Received message without a known type: " + message, {type:'error'})
			console.error(event)
	}
}
function f_websocket_handle_close(event) {
	multiplayer_connection = null
	f_multi_set_enabled(false)
	clearInterval(pingID)
	
	f_multi_message(d.data.message || "Server connection lost.", {type:'error'})
}
function f_button_multiplayer_connect() {
	element_button_connect.disabled = true
	
	try {
		multiplayer_connection = new WebSocket("wss://www.asier.us/jeffparty")
		
		if (multiplayer_connection) {
			multiplayer_connection.onopen = 	f_websocket_handle_open
			multiplayer_connection.onerror = 	f_websocket_handle_error
		}
	}
	catch (e) {
		if (multiplayer_connection) {
			multiplayer_connection.close()
		}
		f_multi_message("Failed to connect to server: " + e, {max:1, type:'error'})
		multiplayer_connection = null
		console.error(e)
		f_multi_set_enabled(false)
	}
}
function f_button_multiplayer_disconnect() {
	if (multiplayer_connection) {
		f_websocket_send('disconnect')
		multiplayer_connection.close()
	}
}
