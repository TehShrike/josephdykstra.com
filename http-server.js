//Config
var DIR = './web/'

//Include
var http = require('http')
var St = require('st')
var url = require('url')
var noddityConfig = require('./noddity-config.json')

//Static File Servers
var defaultStatic = St({
	path: DIR,
	passthrough: true,
	index: 'index.html',
	//cache: false,
	gzip: true
})

//Noddity
var viewModel = (function () {
	var Level = require('level-mem')
	var Retrieval = require('noddity-fs-retrieval')
	var Butler = require('noddity-butler')
	var Renderer = require('noddity-renderer')
	var ViewModel = require('noddity-view-model')
	var renderData = require('./renderData.json')
	var renderTemplate = require('fs').readFileSync(DIR + 'index.html', {encoding:'utf8'})

	var db = new Level('./database')
	var retrieve = new Retrieval(noddityConfig.root)
	var butler = new Butler(retrieve, db, noddityConfig.butler)
	var renderer = new Renderer(butler, String)
	return new ViewModel(butler, renderer, renderTemplate, renderData)
})()

function renderPage(path, res, onFail) {
	viewModel(path, function (err, html) {
		if (!err) {
			res.writeHead(200)
			res.end(html, 'utf8')
		} else {
			onFail && onFail()
		}
	})
}

function errorResponse(errorString) {
	if (!errorString) errorString = 'An unknown error occurred.'
	return function failure(err) {
		res.writeHead(500)
		res.end(err ? err.message : errorString, 'utf8')
	}
}

//Routing
function route(req, res) {
	var path = url.parse(req.url).pathname.slice(1) || 'index'
	renderPage(path, res, function fail1() {
		defaultStatic(req, res, function fail2 () {
			renderPage('404', res, errorResponse('failed to generate page'))
		})
	})
}

//Server
var server = http.createServer(route)
server.listen(80)
server.on('error', function (err) {
	(err.code == 'EADDRINUSE') ?
		console.log('A server is already running on '+PORT+'.') :
		console.error('HTTP Server error:', err)
})