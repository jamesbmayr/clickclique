/*** socket ***/
	// on load
		var socket = null
		if (window.human) {
			createSocket()
		}

	/* createSocket */
		function createSocket() {
			try {
				socket = new WebSocket(location.href.replace("http","ws"))

				// open
					socket.onopen = function() {
						socket.send(null)
					}

				// error
					socket.onerror = function(error) {
						console.log(error)
					}

				// close
					socket.onclose = function() {
						socket = null
					}

				// message
					socket.onmessage = function(message) {
						try {
							var post = JSON.parse(message.data)
							if (post && (typeof post == "object")) {
								receivePost(post)
							}
						} catch (error) {}
					}
			} catch (error) {}
		}

	/* receivePost */
		function receivePost(data) {
			// color
				if (data.color !== undefined) {
					color = "#" + data.color
				}

			// clicks
				if (data.clicks !== undefined) {
					if (!data.color) {
						// figure out which clicks are new
							var oldIds = clicks.map(function(click) {
								return click.id 
							})

							var newClicks = data.clicks.filter(function (click) {
								return !oldIds.includes(click.id)
							})

						// flash new clicks
							for (var c in newClicks) {
								flashClick(newClicks[c])
							}
					}

					// update clicks and paint chart
						clicks = data.clicks
						paintChart()
				}
		}

/*** click ***/
	/* submitClick */
		window.clicks = []
		document.addEventListener("click", submitClick)
		function submitClick(event) {
			var x = ((event.clientX !== undefined) ? event.clientX : event.targetTouches[0].clientX)
			var y = ((event.clientY !== undefined) ? event.clientY : event.targetTouches[0].clientY)

			if (socket) {
				socket.send(JSON.stringify({x: x, y: y}))
			}
		}

/*** paint ***/
	// on load
		var color = "transparent"
		var clicks = []

	/* flashClick */
		function flashClick(click) {
			// create flash element
				var flash = document.createElement("span")
					flash.className  = "flash"
					flash.style.background = "#" + click.color
					flash.style.left = click.x + "px"
					flash.style.top  = click.y + "px"
				document.body.appendChild(flash)

			// remove in 2/10s
				setTimeout(function() {
					flash.remove()
				}, 200)
		}

	/* paintChart */
		function paintChart() {
			// sum up count per color
				var colors = {}
				for (var c in clicks) {
					if (colors[clicks[c].color]) {
						colors[clicks[c].color] += 1
					}
					else {
						colors[clicks[c].color] = 1
					}
				}

			// empty chart
				var chart = document.getElementById("chart")
					chart.innerHTML = ""

			// append wedges
				for (var c in colors) {
					var wedge = document.createElement("span")
						wedge.className = "wedge"
						wedge.style.background = "#" + c
						wedge.innerHTML = colors[c]
						wedge.style.width = colors[c] + "%"
					chart.appendChild(wedge)
				}	
		}
