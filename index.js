const exp = require("express");
const web = exp();
var config
try {
  config = require('./config.json')
} catch (e) {
  config = process.env
}
const port = config.PORT | 8002

web.use(async function timeLog(req, res, next) {
  req.port = port == 80 ? `` : `:${port}`;
  var ip = req.ip;
  res.setHeader("Access-Control-Allow-Origin", '*')
  console.log(`---\nЗапрос от ${ip} \nURL: ${req.protocol}://${req.hostname}${req.port}${req.url}`)
  next()
});
web.get('/', async (req, res) => {
  res.redirect("https://kelcuprum.ru/tutorials/alina-api")
});
web.use('/', exp.static('cache'))
web.use('/cache', exp.static('cache'))


var skins = require('./router/skins');
web.use('/skin', skins);

var capes = require('./router/capes');
web.use('/cape', capes);

web.get('/ping', (req, res) => {
  res.json({
    message: "Pong!",
    time: new Date().getTime()
  })
})

web.use(async function (req, res, next) {
  res.status(404);
  res.json({
    error: {
      code: 404,
      codename: "Not found",
      message: "Method not found"
    }
  })
  return;
});
// Запуск прослушивание
const http = require('http'); // Используется HTTP протокол
const server = http.createServer({}, web);
server.listen(port, async () => {
  console.log(`API Был успешно запущен!`)
})
