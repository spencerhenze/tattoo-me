<template>
	<div>
		<video autoplay id="videoElement" style="display: none"></video>
		<div id="controls">
			<!-- <button type="button" @click="captureImage">Capture Image</button> -->
			<!-- <button type="button" @click="changeCamera">Change Camera</button> -->
			<!-- <i id="" @click="changeCamera" class="md-size-4x material-icons">autorenew</i> -->
			<!-- <md-icon @click="changeCamera" class="md-size-4x">autorenew</md-icon> -->
			<md-button @click="changeCamera" class="md-fab md-clean">
				<md-icon>autorenew</md-icon>
			</md-button>
		</div>

		<div id="stage">
			<canvas id="canvas"></canvas>
		</div>

		<img crossorigin="*" id="overlay" style="display: none" :src="activeTattoo" alt="">
		<img id="imgtag" style="display: none" src="" alt="capture" />
	</div>
</template>
<script>
	import VueFrame from 'vue-frame'
	import Hammerjs from 'hammerjs'
	import FileSaverjs from 'file-saver'
	export default {
		name: 'camera',
		data() {
			return {
				tattoos: [],
				activeTattoo: '',
				hammertime: '',
				localStream: '',
				run: true,
				video: '',
				pinch: '',
				dragging: false,
				timeout: true,
				pinch: false,
				x: '',
				y: '',
				sizeX: '',
				sizeY: '',
				canvas: '',
				context: '',
				canvasWidth: '',
				canvasHeight: '',
				imgtag: '',
				aspectRatio: null,
				paused: false,
				camera: 'rear',
				videoHeight: null,
				videoWidth: null,
			}
		},
		watch: {
			getTattoos: () => {
				debugger
				if (this.tattoos[0] != '') {
					console.log(this.tattoos)
					this.activeTattoo = this.tattoos[0]
				}
			}
		},
		methods: {
			update() {
				if (this.run) {
					let canvasChanged = false;
					if (this.canvasWidth != window.innerWidth || this.canvasHeight != window.innerHeight - 320) {
						canvasChanged = true;
						this.setCanvasDimensions();
					}
					if (!this.aspectRatio && this.video.videoWidth) {
						this.aspectRatio = this.video.videoWidth / this.video.videoHeight
					}

					if (canvasChanged || (!this.videoHeight && this.aspectRatio)) {
						this.setVideoDimensions();
					}

					this.context.drawImage(this.video, (this.canvasWidth - this.videoWidth) / 2, (this.canvasHeight - this.videoHeight) / 2, this.videoWidth || this.canvasWidth, this.videoHeight || this.canvasHeight)
					requestAnimationFrame(this.update)
				}
			},
			setCanvasDimensions() {
				this.canvasWidth = window.innerWidth;
				this.canvasHeight = window.innerHeight - 320;
				this.canvas.setAttribute('width', this.canvasWidth)
				this.canvas.setAttribute('height', this.canvasHeight)
			},
			setVideoDimensions() {
				let canvasRatio = this.canvasWidth / this.canvasHeight;
				if (canvasRatio < this.aspectRatio) {
					this.videoWidth = this.canvasWidth;
					this.videoHeight = this.videoWidth / this.aspectRatio
				} else {
					this.videoHeight = this.canvasHeight;
					this.videoWidth = this.videoHeight * this.aspectRatio
				}
			},
			insertImage() {
				if (this.run) {
					var overlay = document.getElementById('overlay')
					this.context.drawImage(overlay, this.x, this.y, this.sizeX, this.sizeY)
					requestAnimationFrame(this.insertImage)
				}
			},
			captureImage() {
				var _this = this
				var uri = this.canvas.toDataURL("image/png")
				this.imgtag.src = uri
				this.run = false
				this.localStream.getVideoTracks()[0].stop()
				var button = document.createElement("button")
				button.innerHTML = "Save Image to Device"
				button.id = 'save-button'
				button.addEventListener('click', function () {
					if (_this.signedIn()) {
						_this.canvas.toBlob((blob) => {
							FileSaverjs.saveAs(blob, "test capture.png")
						})
						document.getElementById('save-button').remove()
						_this.showLive()
					}
				})
				var addTo = document.getElementById('controls')
				addTo.appendChild(button)
			},
			showLive() {
				this.run = true
				navigator.getUserMedia({ video: true }, this.handleVideo, this.videoError)

				var button = document.getElementById('save-button')
				if (button) {
					document.getElementById('save-button').remove()
				}
			},
			changeCamera() {
				this.localStream.getVideoTracks()[0].stop();
				this.localStream = null;
				this.video.src = '';

				if (this.camera == 'front') {
					navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } } }).then(this.handleVideo).catch(this.videoError)
					this.camera = 'rear'
				}
				else {
					this.camera = 'front'
					navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(this.handleVideo).catch(this.videoError)
				}
			},
			handleVideo(stream) {
				this.localStream = stream
				this.video.src = window.URL.createObjectURL(stream);
				this.update()
				this.insertImage()
			},
			videoError(e) {
				console.log('no rear camera dumby')
			}
		},
		computed: {
			getTattoos() {
				return this.$store.state.queue[0]
			},
			getTattoos() {
				return this.$store.state.queue
			}
		},
		mounted() {
			var _this = this
			this.hammertime = new Hammer((document.getElementById('canvas')));
			this.pinch = new Hammer.Pinch()
			this.hammertime.get('pinch').set({ enable: true });
			this.video = document.querySelector("#videoElement");
			this.tattoos = this.$store.state.queue
			this.activeTattoo = this.$store.state.queue[0]

			// navigator.getUserMedia = navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

			// if (navigator.getUserMedia) {
			navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } }).then(this.handleVideo).catch(this.videoError);
			// }

			this.imgtag = document.getElementById('imgtag')

			this.canvas = document.getElementById('canvas')
			this.context = this.canvas.getContext("2d")
			this.setCanvasDimensions();
			this.x = this.canvasWidth * .45
			this.y = this.canvasHeight * .45
			this.sizeX = this.canvasWidth * .1
			this.sizeY = this.canvasHeight * .1

			this.hammertime.on('pinchout', (ev) => {
				_this.sizeX += 8
				_this.sizeY += 4
				_this.x -= 4
				_this.y -= 2
			})

			this.hammertime.on('pinchin', (ev) => {
				_this.sizeX -= 8
				_this.sizeY -= 4
				_this.x += 4
				_this.y += 2
			})

			this.hammertime.on('swiperight', (ev) => {
				var index = _this.tattoos.indexOf(_this.activeTattoo)
				var nextIndex = index + 1
				if (_this.tattoos[nextIndex] != null) {
					_this.activeTattoo = _this.tattoos[nextIndex]
				}
			})

			this.hammertime.on('swipeleft', (ev) => {
				var index = _this.tattoos.indexOf(_this.activeTattoo)
				var previousIndex = index - 1
				if (_this.tattoos[previousIndex] != null) {
					_this.activeTattoo = _this.tattoos[previousIndex]
				}
			})

			this.hammertime.on('tap', (ev) => {
				this.paused = !this.paused
				if (this.paused) {
					this.captureImage()
				}
				else {
					this.run = true
					navigator.getUserMedia({ video: true }, _this.handleVideo, _this.videoError)
					var button = document.getElementById('save-button')
					if (button) {
						document.getElementById('save-button').remove()
					}
				}
			})

			// this.canvas.addEventListener('click', () => {
			// 	this.paused = !this.paused
			// 	if (this.paused) {
			// 		this.captureImage()
			// 	}
			// 	else {
			// 		this.run = true
			// 		navigator.getUserMedia({ video: true }, this.handleVideo, this.videoError)
			// 		var button = document.getElementById('save-button')
			// 		if (button) {
			// 			document.getElementById('save-button').remove()
			// 		}
			// 	}
			// })
		},
		destroyed() {
			this.localStream.getVideoTracks()[0].stop();
			this.run = false;
		},
		components: {
			VueFrame,
			FileSaverjs
		}
	}

</script>

<style scoped>
	.camera {
		overflow: hidden;
		margin: 0px;
	}

	iframe {
		height: 80vh;
		width: 100vw;
	}

	.vFrame {
		display: none;
	}

	#controls {
		position: absolute
	}
</style>