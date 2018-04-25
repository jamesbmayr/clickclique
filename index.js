/*** modules ***/
	var http = require("http")
	var fs   = require("fs")
	var qs   = require("querystring")
	var ws   = require("websocket").server
	var main = require("./main/logic")

/*** server ***/
	var port = main.getEnvironment("port")
	var server = http.createServer(handleRequest)
		server.listen(port, function (error) {
			if (error) {
				main.logError(error)
			}
			else {
				main.logStatus("listening on port " + port)
			}
		})

/*** socket ***/
	var socket = new ws({
		httpServer: server,
		autoAcceptConnections: false
	})
		socket.on("request", handleSocket)

/*** database ***/
	var db   = {
		connections: {},
		clicks:      []
	}

/*** handleRequest ***/
	function handleRequest(request, response) {
		// collect data
			var data = ""
			request.on("data", function (chunk) { data += chunk })
			request.on("end", parseRequest)

		/* parseRequest */
			function parseRequest() {
				try {
					// get request info
						request.get    = qs.parse(request.url.split("?")[1]) || {}
						request.path   = request.url.split("?")[0].split("/") || []
						request.url    = request.url.split("?")[0] || "/"
						request.ip     = request.headers["x-forwarded-for"] || request.connection.remoteAddress || request.socket.remoteAddress || request.connection.socket.remoteAddress

					// log it
						if (request.url !== "/favicon.ico") {
							main.logStatus("new" + " @ " + request.ip + "\n[" + request.method + "] " + request.path.join("/") + "\n" + JSON.stringify(request.method == "GET" ? request.get : ""))
						}

					// where next ?
						main.determineSession(request, routeRequest)
						
				}
				catch (error) {
					_403("unable to parse request")
				}
			}

		/* routeRequest */
			function routeRequest() {
				try {
					// get
						if (request.method == "GET") {
							switch (true) {
								// logo
									case (/\/favicon[.]ico$/).test(request.url):
									case (/\/icon[.]png$/).test(request.url):
									case (/\/logo[.]png$/).test(request.url):
									case (/\/apple\-touch\-icon[.]png$/).test(request.url):
									case (/\/apple\-touch\-icon\-precomposed[.]png$/).test(request.url):
									case (/\/banner[.]png$/).test(request.url):
										try {
											response.writeHead(200, {"Content-Type": "image/png"})
											fs.readFile("./main/logo.png", function (error, file) {
												if (error) {
													_403(error)
												}
												else {
													response.end(file, "binary")
												}
											})
										}
										catch (error) {_403(error)}
									break

								// stylesheet
									case (/\/stylesheet[.]css$/).test(request.url):
										try {
											response.writeHead(200, {"Content-Type": "text/css"})
											fs.readFile("./main/stylesheet.css", "utf8", function (error, data) {
												if (error) {
													_403(error)
												}
												else {
													response.end(data)
												}
											})
										}
										catch (error) {_403(error)}
									break

								// script
									case (/\/script[.]js$/).test(request.url):
										try {
											response.writeHead(200, {"Content-Type": "text/javascript"})
											fs.readFile("./main/script.js", "utf8", function (error, data) {
												if (error) {
													_403(error)
												}
												else {
													response.end("window.onload = function() { \n" + data + "\n}")
												}
											})
										}
										catch (error) {_403(error)}
									break

								// main
									case (/^\/$/).test(request.url):
										try {
											response.writeHead(200, {"Content-Type": "text/html; charset=utf-8"})
											main.renderHTML(request, "./main/index.html", function (html) {
												response.end(html)
											})
										}
										catch (error) {_403(error)}
									break

								// others
									default:
										_302()
									break
							}
						}

					// post
						else {
							_403()
						}
				}
				catch (error) {
					_403("unable to route request")
				}
			}

		/* _302 */
			function _302(data) {
				main.logStatus("redirecting to /")
				response.writeHead(302, { Location: data || "../../../../" })
				response.end()
			}

		/* _403 */
			function _403(data) {
				main.logError(data)
				response.writeHead(403, { "Content-Type": "text/json" })
				response.end( JSON.stringify({success: false, error: data}) )
			}
	}

/*** handleSocket ***/
	function handleSocket(request) {
		// collect data
			if ((request.origin.replace("https://","").replace("http://","") !== main.getEnvironment("domain")) && (request.origin !== "http://" + main.getEnvironment("domain") + ":" + main.getEnvironment("port"))) {
				// bad connection
					request.reject()
					main.logStatus("[REJECTED]: " + request.origin + " @ " + (request.socket._peername.address || "?"))
			}
			else if (!request.connection) {
				// new connection
					request.connection = request.accept(null, request.origin)
					parseSocket()
			}
			else {
				// existing connection
					parseSocket()
			}

		/* parseSocket */
			function parseSocket() {
				try {
					// get request info
						request.headers = {}
						request.headers["user-agent"] = request.httpRequest.headers['user-agent']
						request.headers["accept-language"] = request.httpRequest.headers['accept-language']
						request.ip      = request.connection.remoteAddress || request.socket._peername.address

					// get session and wait for messages
						main.determineSession(request, routeSocket)
				}
				catch (error) {
					_400("unable to parse socket")
				}
			}

		/* routeSocket */
			function routeSocket() {
				try {
					// on connect
						var colors = Object.keys(db.connections)
						do {
							request.color = main.generateRandom("0123456789abcdef", 7).slice(1)
						}
						while (colors.includes(request.color))

						main.logStatus(request.color + " @ " + request.ip + "\n[WEBSOCKET]")
						db.connections[request.color] = request.connection
						request.connection.sendUTF(JSON.stringify({color: request.color, clicks: db.clicks}))

					// on close
						request.connection.on("close", function (reasonCode, description) {
							main.logStatus(request.color + " @ " + request.ip + "\n[CLOSED]")
							delete db.connections[request.color]
						})
					
					// on message
						request.connection.on("message", function (message) {
							// get post data
								request.post = JSON.parse(message.utf8Data) || null
								main.logMessage(request.color + " @ " + request.ip + "\n[WEBSOCKET]\n" + JSON.stringify(request.post))
							
							// update data
								if (request.post && request.post.x !== undefined && request.post.y !== undefined) {
									main.submitClick(db.clicks, request, function () {
										for (var c in db.connections) {
											try {
												db.connections[c].sendUTF(JSON.stringify({clicks: db.clicks}))
											}
											catch (error) { main.logError(error) }
										}
									})
								}
						})
				}
				catch (error) {
					_400("unable to route socket")
				}
			}

		/* _400 */
			function _400(data) {
				main.logError(data)
				request.connection.sendUTF(JSON.stringify({success: false, message: (data || "unknown websocket error")}))
			}
	}
