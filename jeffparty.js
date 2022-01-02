var https = require('https')
var fs = require('fs')
var ws = require('ws')

var names = {}
var lobbies = []
var blacklist = {}

const server = https.createServer({
	cert: fs.readFileSync('../certs/cert.pem'),
	key: fs.readFileSync('../certs/privkey.pem')
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

function f_handle_disconnect(w) {
	if (w.jeff && w.jeff.name) {
		if (w.jeff.lobby) {
			f_send_lobby(w, f_make_message('left', {"name":w.jeff.name}))
		}
		
		// Remove their name from claimed names list
		names[w.jeff.lobby].splice(names[w.jeff.lobby].indexOf(w.jeff.name), 1)
		if (!names[w.jeff.lobby].length) {
			delete names[w.jeff.lobby]
		}
		
		// Remove them from the lobby
		lobbies[w.jeff.lobby].splice(lobbies[w.jeff.lobby].indexOf(w),1)
		if (lobbies[w.jeff.lobby].length == 0) {
			delete lobbies[w.jeff.lobby]
		}
		w.jeff = null
		w.close()
	}
}

wss.on('connection', function connection(w,request) {
	w.jeff = {
		"name": null,
		"lobby": null,
		"address": request.headers['x-forwarded-for']
	}
	
	if (blacklist[w.jeff.address] > 3) {
		console.log(w.jeff.address + " is blacklisted. Forcing disconnect.")
		f_send(w, ERROR_BLACKLISTED)
		w.close()
		return
	}
	
	w.on('message', function message(data) {
		var require_connected = false
		
		try {
			// Check for invalid characters in parameter or value, and if found, reject it entirely
			data = data.toString('utf-8')
			if (data.match(/[^0-9a-zA-Z\.\-\_\(\)\,\*\ \\\"\/\:\[\{\]\}\%\$]/g)) {
				f_send(w, f_make_message_error("Your message contained illegal characters. Don't poison your inputs please."))
				f_ding_blacklist(w,d)
				return
			}
		
			var d = JSON.parse(data)
			//console.log(d)
			
			// Unauthenticated messages
			switch (d.type) {
				case 'ping':
					f_send(w, data)
					break
					
				case 'connect':
					if (!names[d.data.lobby]) {
						names[d.data.lobby] = []
					}
					if (names[d.data.lobby].includes(d.data.name)) {
						f_send(w, f_make_message('login_failed', "That name is already in use."))
						w.close()
					} else if (d.data.name == "") {
						f_send(w, f_make_message('login_failed', "A username is required."))
						w.close
					} else {
						names[d.data.lobby].push(d.data.name)
						w.jeff.name = d.data.name
						w.jeff.lobby = d.data.lobby
						
						if (!lobbies[w.jeff.lobby]) {
							lobbies[w.jeff.lobby] = []
						}
						lobbies[w.jeff.lobby].push(w)
						
						console.log('New connection:')
						console.log(w.jeff)
						
						f_send(w, f_make_message('connected'))
						f_send_lobby(w, f_make_message('joined', {"name":w.jeff.name}))
					}
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
			if (require_connected && !w.jeff.name) {
				f_send(w, ERROR_AUTHENTICATION_REQUIRED)
				return
			}
			
			if (d.type.substring(0,5) == "admin" && !f_is_admin(w,d)) {
				f_ding_blacklist(w,d)
				return
			}
			
			switch (d.type) {
				case 'disconnect':
					f_handle_disconnect(w)
					break
					
				case 'get_players':
					f_send(w, f_make_message('generic', names[w.jeff.lobby]))
					break
				
				case 'answer':
					f_send_lobby(w, f_make_message('answer', d.data))
					break
				
				case 'summary':
					f_send_lobby(w, f_make_message('summary', d.data))
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
				
				case 'admin_get_connections':
					var res = []
					lobbies[w.jeff.lobby].forEach(wx => {
						res.push(wx.jeff)
					})
					f_send(w, f_make_message('generic', res))
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
					break
			}
		} catch (e) {
			console.error('Error handling message ' + data + ': ' + e)
			console.error(e.stack)
		}
	})
	
	w.on('close', function(w) {
		f_handle_disconnect(w)
	})
})
	
wss.on('close', function message() {
	f_send_all(null, f_make_message('exit'))
})

server.listen(10444)
console.log('Listening on 10444...')
