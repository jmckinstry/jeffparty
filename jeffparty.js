var https = require('https')
var fs = require('fs')
var ws = require('ws')

var names = []
var lobbies = []
var blacklist = {}

const server = https.createServer({
	cert: fs.readFileSync('/full_path_to/cert.pem'),
	key: fs.readFileSync('/full_path_to/privkey.pem')
})
const wss = new ws.WebSocketServer({server})

function f_is_admin(client, message) {
	if (client.jeff && client.jeff.address == '192.168.1.201') {
		return true
	}
	return false
}
function f_ding_blacklist(client, message) {
	var count = (blacklist[client.jeff.address] || 0) + 1
	blacklist[client.jeff.address] = count
	client.close()
	
	console.error('User ' + (client && client.jeff && client.jeff.name) + ' got dinged: ' + (message && message.type) + ' (' + count + ')')
	//console.error(new Error().stack)
}

function f_make_message(type, data) {
	return JSON.stringify({
		"type":type,
		"data":data
	})
}
function f_make_message_error(data) {
	return f_make_message('error', data)
}
var ERROR_BLACKLISTED = f_make_message_error("You have been blacklisted. Don't try to play with the API please.")
var ERROR_AUTHENTICATION_REQUIRED = f_make_message_error("That function requires authentication, but you are not signed in.")
function f_send(w, d) {
	console.log("-->" + (w.jeff && w.jeff.name) + " received " + d)
	w.send(d)
}
function f_send_lobby(w, d) {
	console.log("-->Lobby '" + w.jeff.lobby + "' received " + d)
	lobbies[w.jeff.lobby].forEach(client => {
		client.send(d)
	})
}
function f_send_lobby_excluding(w, d) {
	console.log("-->Lobby '" + w.jeff.lobby + "' exc. " + w.jeff.name + " received " + d)
	lobbies[w.jeff.lobby].forEach(client => {
		if (w !== client) {
			client.send(d)
		}
	})
}
function f_send_all(w, d) {
	console.log("-->All received " + d)
	wss.clients.forEach(function each(client) {
		client.send(d)
	})
}

wss.on('connection', function connection(w,request) {
	jeff = {
		"name": null,
		"lobby": null,
		"address": request.headers['x-forwarded-for']
	}
	w.jeff = jeff
	
	if (blacklist[jeff.address] > 3) {
		console.log(jeff.address + " is blacklisted. Forcing disconnect.")
		f_send(w, ERROR_BLACKLISTED)
		w.close()
		return
	}
	
	w.on('message', function message(data) {
		var require_connected = false
		
		try {
			// Check for invalid characters in parameter or value, and if found, reject it entirely
			data = data.toString('utf-8')
			if (data.match(/[^0-9a-zA-Z\.\-\_\(\)\,\*\ \\\"\/\:\[\{\]\}]/g)) {
				f_send(w, f_make_message_error("Your message contained illegal characters. Don't poison your inputs please."))
				f_ding_blacklist(w,d)
				return
			}
		
			var d = JSON.parse(data)
			console.log(d)
			
			// Unauthenticated messages
			switch (d.type) {
				case 'ping':
					f_send(w, data)
					break
					
				case 'connect':
					if (d.data.name in names) {
						f_send(w, f_make_message('login_failed', "That name is already in use."))
						w.close()
					} else if (d.data.name == "") {
						f_send(w, f_make_message('login_failed', "A username is required."))
						w.close
					} else {
						names.push(d.data.name)
						jeff.name = d.data.name
						jeff.lobby = d.data.lobby
						
						if (lobbies.indexOf(jeff.lobby) == -1) {
							lobbies[jeff.lobby] = []
						}
						lobbies[jeff.lobby].push(w)
						
						console.log('New connection:')
						console.log(jeff)
						
						f_send(w, f_make_message('connected'))
						f_send_lobby(w, f_make_message('joined', {"name":jeff.name}))
					}
					break
				
				case 'disconnect':
					if (jeff) {
						f_send_lobby(w, f_make_message('left', {"name":jeff.name}))
						
						// Remove their name from claimed names list
						names.splice(names.indexOf(jeff.name), 1)
						
						// Remove them from the lobby
						lobbies[jeff.lobby].splice(lobbies[jeff.lobby].indexOf(w),1)
						if (lobbies[jeff.lobby].length == 0) {
							delete lobbies[jeff.lobby]
						}
						jeff = null
					}
					w.close()
					return
					break
					
				default:
					require_connected = true
					break
			}
			
			// If the message was handled, we're done here
			if (!require_connected) {
				return
			}
			
			// Everything else requires authentication
			if (require_connected && !jeff.name) {
				f_send(w, ERROR_AUTHENTICATION_REQUIRED)
				return
			}
			
			if (d.type.substring(0,5) == "admin" && !f_is_admin(w,d)) {
				f_ding_blacklist(w,d)
				return
			}
			
			switch (d.type) {
				case 'get_players':
					break
					
				case 'admin_send_all':
					var message_type = d.data.message_type
					delete d.data.message_type
					f_send_all(w, f_make_message(message_type, d.data))
					break
				
				case 'admin_shutdown':
					f_send_all(w, f_make_message('exit', d.data.message))
					wss.close()
					break
				
				case 'admin_get_lobbies':
					f_send(w, f_make_message('generic', lobbies))
					break
				
				case 'admin_get_blacklist':
					f_send(w, f_make_message('generic', blacklist))
					break
					
				default:
					f_send(w, f_make_message_error('Message type of ' + d.type + ' is not supported yet.'))
					f_ding_blacklist(w,d)
			}
		} catch (e) {
			console.error('Error handling message ' + data + ': ' + e)
			console.error(e.stack)
		}
	})
})
	
wss.on('close', function message() {
	f_send_all(null, f_make_message('exit'))
})

server.listen(10444)
console.log('Listening on 10444...')
