/*** modules ***/
	var http     = require("http")
	var fs       = require("fs")
	module.exports = {}

/*** logs ***/
	/* logError */
		module.exports.logError = logError
		function logError(error) {
			console.log("\n*** ERROR @ " + new Date().toLocaleString() + " ***")
			console.log(" - " + error)
			console.dir(arguments)
		}

	/* logStatus */
		module.exports.logStatus = logStatus
		function logStatus(status) {
			console.log("\n--- STATUS @ " + new Date().toLocaleString() + " ---")
			console.log(" - " + status)
		}

/*** maps ***/
	/* getEnvironment */
		module.exports.getEnvironment = getEnvironment
		function getEnvironment(index) {
			try {
				// production
					if (process.env.DOMAIN !== undefined) {
						var environment = {
							port:   process.env.PORT,
							domain: process.env.DOMAIN,
						}
					}

				// development
					else {
						var environment = {
							port:   3000,
							domain: "localhost",
						}
					}

				return environment[index]
			}
			catch (error) {
				logError(error)
				return false
			}
		}

/*** tools ***/
	/* isBot */
		module.exports.isBot = isBot
		function isBot(agent) {
			try {
				switch (true) {
					case (typeof agent == "undefined" || !agent):
						return "no-agent"
					break
					
					case (agent.indexOf("Googlebot") !== -1):
						return "Googlebot"
					break
				
					case (agent.indexOf("Google Domains") !== -1):
						return "Google Domains"
					break
				
					case (agent.indexOf("Google Favicon") !== -1):
						return "Google Favicon"
					break
				
					case (agent.indexOf("https://developers.google.com/+/web/snippet/") !== -1):
						return "Google+ Snippet"
					break
				
					case (agent.indexOf("IDBot") !== -1):
						return "IDBot"
					break
				
					case (agent.indexOf("Baiduspider") !== -1):
						return "Baiduspider"
					break
				
					case (agent.indexOf("facebook") !== -1):
						return "Facebook"
					break

					case (agent.indexOf("bingbot") !== -1):
						return "BingBot"
					break

					case (agent.indexOf("YandexBot") !== -1):
						return "YandexBot"
					break

					default:
						return null
					break
				}
			}
			catch (error) {
				logError(error)
				return false
			}
		}

	/* renderHTML */
		module.exports.renderHTML = renderHTML
		function renderHTML(request, path, callback) {
			try {
				var html = {}
				fs.readFile(path, "utf8", function (error, file) {
					if (error) {
						logError(error)
						callback("")
					}
					else {
						// keep original document, split into array between node scripts
							html.original = file
							html.array = html.original.split(/<script\snode>|<\/script>node>/gi)

						// odd-numbered will have executable nodejs scripts
							for (html.count = 1; html.count < html.array.length; html.count += 2) {
								try {
									html.temp = eval(html.array[html.count])
								}
								catch (error) {
									html.temp = ""
									logError("<sn>" + Math.ceil(html.count / 2) + "</sn>\n" + error)
								}
								html.array[html.count] = html.temp
							}

						// recombine and send to client
							callback(html.array.join(""))
					}
				})
			}
			catch (error) {
				logError(error)
				callback("")
			}
		}

	/* generateRandom */
		module.exports.generateRandom = generateRandom
		function generateRandom(set, length) {
			try {
				// default set and length
					set = set || "0123456789abcdefghijklmnopqrstuvwxyz"
					length = length || 32
				
				// build output
					var output = ""
					for (var i = 0; i < length; i++) {
						output += (set[Math.floor(Math.random() * set.length)])
					}

				// first letter must be letter (for object parameters)
					if ((/[a-zA-Z]/).test(set)) {
						while (!(/[a-zA-Z]/).test(output[0])) {
							output = (set[Math.floor(Math.random() * set.length)]) + output.substring(1)
						}
					}

				return output
			}
			catch (error) {
				logError(error)
				return null
			}
		}

/*** game ***/
	/* submitClick */
		module.exports.submitClick = submitClick
		function submitClick(clicks, request, callback) {
			try {
				// get click info
					var click = {}
						click.x     = Number(request.post.x)
						click.y     = Number(request.post.y)
						click.color = request.color
						click.id    = generateRandom("", 8)
						click.time  = new Date().getTime()

				// add and sort
					clicks.push(click)
					clicks = clicks.sort(function (a, b) {
						return a.time - b.time
					})

				// limit to latest 100
					while (clicks.length > 100) {
						clicks.shift()
					}

				callback()
			}
			catch (error) {
				logError(error)
			}
		}
