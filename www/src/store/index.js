import axios from 'axios'
import vue from 'vue'
import vuex from 'vuex'
import router from '../router'

var production = !window.location.host.includes('localhost');
var baseUrl = production ? '//tattoo-me.herokuapp.com/' : '//localhost:3000/';

let api = axios.create({
	baseURL: baseUrl + 'api/',
	timeout: 40000,
	withCredentials: true
})

let auth = axios.create({
	baseURL: baseUrl,
	timeout: 4000,
	withCredentials: true
})

vue.use(vuex)

var store = new vuex.Store({
	state: {
		activeCards: [],
		mobileView: [],
		results: [],
		favorites: [],
		userInfo: {},
		gallery: [],
		queue: [],
		confirm: [],
		sortType: true,
		activeCardsPage: 0,
		resultsPage: 0,
		searchTags: ''
	},

	mutations: {
		zoomIn(state, card) {
			state.mobileView = card
		},
		confirm(state, card) {
			state.confirm = card
		},

		setResults(state, payload) {
			if (payload.append)
				state.activeCards = state.activeCards.concat(payload.tattoos);
			else
				state.activeCards = payload.tattoos;
			state.activeCardsPage = payload.page;
		},
		setSearchResults(state, payload) {
			if (payload.append)
				state.results = state.results.concat(payload.tattoos);
			else
				state.results = payload.tattoos;
			state.resultsPage = payload.page
			state.searchTags = payload.tags
		},

		setFavs(state, res) {
			var favorites = res.data.data

			for (var i = 0; i < favorites.length; i++) {
				var favorite = favorites[i];
				favorite.favorite = true
			}

			state.favorites = favorites
		},

		setInfo(state, obj) {
			state.userInfo = obj
		},

		setGallery(state, obj) {
			state.gallery = obj
		},

		addToQueue(state, obj) {
			console.log('pre', state.queue)
			state.queue.push(obj.url)
			console.log('post', state.queue)
		},

		sort(state) {
			this.state.sortType = !this.state.sortType
		},

		handleError(state, err) {
			state.error = err
		}

	},
	actions: {
		sort({ commit, dispatch }) {
			commit('sort')
		},
		addToQueue({ commit, dispatch }, obj) {
			commit('addToQueue', obj)
		},
		removeFromQueue({ commit, dispatch }, obj) {

		},
		removeTattoo({ commit, dispatch }, id) {
			api.delete('tattoos/' + id)
				.then(res => {
					dispatch('getArtistGallery')
					dispatch('getTattoos')
				})
				.catch(err => {
					commit('handleError', err)
				})
		},
		getArtistGallery({ commit, dispatch }) {
			// console.log('right place')
			api('my-designs')
				.then(res => {
					commit('setGallery', res.data.data)
				})
				.catch(() => console.log('error'))
		},
		zoomIn({ commit, dispatch }, card) {
			commit('zoomIn', card)
		},
		confirm({ commit, dispatch }, card) {
			commit('confirm', card)
		},

		search({ commit, dispatch }, { tags, append = true, page = 0, cb }) {
			// console.log(query)
			var search = tags.toLowerCase().trim().replace(/\s+/g, ',');
			let limit = 10;
			api(`tattoos/search/tags/?tags=${search}&limit=${limit}&offset=${page * limit}`)
				.then(res => {
					// console.log(res)
					commit('setSearchResults', { tattoos: res.data.data, append, page, tags: tags })
					if (cb)
						cb()
				})
				.catch(() => console.log('error'))
		},

		login({ commit, dispatch }, obj) {
			auth.post("login", obj)
				.then((res) => {
					// console.log(res)
					// res = JSON.parse(res);
					if (res.data.message == "Invalid Email or Password") {
						return console.log(res.data.message)
					} else {
						commit('setInfo', res.data.data)
						// console.log(res)
						// dispatch('changeLog')
						router.push('home')
						return console.log(res.data.message)
					}

				})
				.catch(() => console.log('error'))
		},
		register({ commit, dispatch }, obj) {
			auth.post("register", obj)
				.then((res) => {
					if (res.data.message) {
						commit('setInfo', res.data.data)
						console.log('account created')
						router.push('home')
					} else if (res.error) {
						alert("Invalid Email or password");
					}
				})
				.catch(() => console.log('error'))
		},
		logout({ commit, dispatch }) {
			auth.delete('logout')
				.then((res) => {
					console.log(res.data.message)
					// dispatch('changeLog')
					dispatch('getAuth')

				})
				.catch(() => console.log('error'))
		},
		getAuth({ commit, dispatch }) {
			auth('authenticate')
				.then(res => {
					if (!res.data.data) {
						return router.push('/')
					}
					commit('setInfo', res.data.data)
					router.push('home')
				})
				.catch(err => {
					console.log(err)
					router.push('/')
				})
		},
		//when writing your auth routes (login, logout, register) be sure to use auth instead of api for the posts

		sendDesign({ commit, dispatch }, payload) {
			let tags = payload[0].tags.match(/\S+/) || [] // grabs words from string, or returns empty array if only whitespace
			payload[0].tags = [];
			api.post('tattoo/upload', payload[0])
				.then(res => {
					console.log('uploaded i think', res)
					let tattooId = res.data.data._id
					tags.forEach(function (tag) {
						api.post('tags', { name: tag })
							.then(res => {
								api.put('tattoos/' + tattooId + '/update', { tag: res.data.data._id })
									.then(res => {
										console.log('Tagged tattoo:', res.data.data)
									})
									.catch(err => {
										commit('handleError', err)
									})
							})
							.catch(err => {
								commit('handleError', err)
							})
					}, this);
				})
				.catch(err => {
					commit('handleError', err)
				})
		},

		like({ commit, dispatch }, obj) {
			api.put(`tattoos/${obj.id}/like`)
				.then(res => {
					dispatch('getFavs')
					dispatch('getTattoos')
					dispatch('getArtistGallery')
					dispatch('search', obj.query)
				})
				.catch(err => {
					commit('handleError', err)
				})
		},

		getTattoos({ commit, dispatch }, { append = true, page = 0, cb }) {
			let limit = 20;
			api('tattoos?limit=' + limit + '&offset=' + page * limit)
				.then(res => {
					commit('setResults', { tattoos: res.data.data, append, page })
					if (cb)
						cb();
				})
				.catch(err => {
					commit('handleError', err)
				})
		},
		getFavs({ commit, dispatch }) {
			api('favorites')
				.then(res => {
					commit('setFavs', res)
				})
		},
		addFav({ commit, dispatch }, tattoo) {
			var obj = {
				favorite: tattoo._id
			}
			api.put('favorites', obj)
				.then(res => {
					dispatch('getFavs')
					dispatch('getTattoos')
				})
				.catch(err => {
					commit('handleError', err)
				})
		},

		deleteFav({ commit, dispatch }, tattoo) {
			var obj = {
				favorite: tattoo._id
			}
			api.put(`favorites/${obj.favorite}`)
				.then(res => {
					dispatch('getFavs')
					dispatch('getTattoos')
					return router.push('/favorites')
				})
				.catch(err => {
					commit('handleError', err)
				})
		},

		// getSharedBoards({ commit, dispatch }) {
		//   api('sharedBoards')
		//     .then(res => {
		//       //console.log(res)
		//       commit('setBoards', res.data.data)
		//     })
		//     .catch(err => {
		//       commit('handleError', err)
		//     })
		// },

		//         getLists({ commit, dispatch }, id) {
		//             api('/boards/' + id + '/lists')
		//                 .then(res => {
		//                     //console.log('List response', res)
		//                     commit('setLists', res.data.data)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         getTasks({ commit, dispatch }, task) {
		//             api('/boards/' + task.boardId + '/lists/' + task.listId + "/tasks")
		//                 .then(res => {
		//                     var payload = { "listId": task.listId, "tasks": res.data.data }
		//                     commit('setTasks', payload)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         getComments({ commit, dispatch }, comment) {
		//             api('/boards/' + comment.boardId + '/lists/' + comment.listId + "/tasks/" + comment.taskId + "/comments")
		//                 .then(res => {
		//                     var payload = { "taskId": comment.taskId, "comments": res.data.data }
		//                     commit('setComments', payload)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         getBoard({ commit, dispatch }, id) {
		//             api('boards/' + id)
		//                 .then(res => {
		//                     commit('setActiveBoard', res.data.data)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         createBoard({ commit, dispatch }, board) {
		//             api.post('boards/', board)
		//                 .then(res => {
		//                     dispatch('getBoards')
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         createList({ commit, dispatch }, list) {
		//             api.post('lists', list)
		//                 .then(res => {
		//                     dispatch('getLists', list.boardId)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         createTask({ commit, dispatch }, task) {
		//             api.post('tasks', task)
		//                 .then(res => {
		//                     dispatch('getTasks', task)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         createComment({ commit, dispatch }, comment) {
		//             api.post('comments', comment)
		//                 .then(res => {
		//                     dispatch('getComments', comment)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         removeBoard({ commit, dispatch }, board) {
		//             api.delete('boards/' + board._id)
		//                 .then(res => {
		//                     dispatch('getBoards')
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         removeList({ commit, dispatch }, list) {
		//             api.delete('lists/' + list._id)
		//                 .then(res => {
		//                     dispatch('getLists', list.boardId)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         removeTask({ commit, dispatch }, task) {
		//             api.delete('tasks/' + task._id)
		//                 .then(res => {
		//                     dispatch('getTasks', task)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         removeComment({ commit, dispatch }, comment) {
		//             api.delete('comments/' + comment._id)
		//                 .then(res => {
		//                     dispatch('getComments', comment)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         register({ commit, dispatch }, accountUser) {
		//             //console.log("user: ", accountUser.email, accountUser.name, accountUser.password)
		//             // commit('checkForegisterrUser', accountUser)
		//             auth.post('register', accountUser)
		//                 .then(res => {
		//                     commit('setBoards', res.data.data)

		//                     if (!res.data.data) {
		//                         router.push('/app');
		//                     }

		//                     commit('setUser', res.data.data)
		//                     router.push('/app');

		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         login({ commit, dispatch }, accountUser) {
		//             // commit('checkForegisterrUser', accountUser)
		//             auth.post('login', accountUser)
		//                 .then(res => {
		//                     commit('setUser', res.data.data)
		//                     dispatch('getBoards')
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		//         logout({ commit, dispatch }, accountUser) {
		//             // commit('checkForegisterrUser', accountUser)

		//             auth.delete('logout', accountUser)
		//                 .then(res => {
		//                     commit('setUser', {})
		//                     commit('setActiveBoard', {})
		//                     router.push('/')
		//                     window.location.reload()
		//                 })
		//                 .catch(err => {
		//                     //console.log('error: ', err)
		//                     commit('handleError', err)
		//                 })
		//         },

		//         authenticate({ commit, dispatch }) {
		//             // commit('checkForegisterrUser', accountUser)
		//             auth.get('authenticate')
		//                 .then(res => {
		//                     if (!res.data.data) {

		//                         router.push('/app');
		//                     }
		//                     router.push('/'); //boards
		//                     //console.log('res.data' + res.data)
		//                     commit('setUser', res.data.data)
		//                 })
		//                 .catch(err => {
		//                     console.log('err ' + err)
		//                     // commit('setUser', 'Nobody')
		//                     dispatch('getBoards')
		//                     commit('handleError', err)
		//                 })
		//         },

		//         updateTaskParent({ commit, dispatch }, data) {
		//             var update = { listId: data.listId }
		//             //console.log(update);
		//             api.put('tasks/' + data.taskId + '/', update)
		//                 .then(res => {
		//                     console.log('made it this far')
		//                     dispatch('getTasks', task)
		//                 })
		//                 .catch(err => {
		//                     commit('handleError', err)
		//                 })
		//         },

		handleError({ commit, dispatch }, err) {
			commit('handleError', err)
		}
	}

})


export default store