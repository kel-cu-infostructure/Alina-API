const { default: axios } = require('axios');
const exp = require("express");
const web = exp();
var fs = require('fs')
var config
try {
  config = require('./config.json')
} catch (e) {
  config = process.env
}
const port = config.PORT | 8002
checkAndCreate();
function checkAndCreate(){
  if(!fs.existsSync("./cache")) fs.mkdirSync("./cache");
  if(!fs.existsSync("./cache/capes")) fs.mkdirSync("./cache/capes");
  if(!fs.existsSync("./cache/capesRender")) fs.mkdirSync("./cache/capesRender");
  if(!fs.existsSync("./cache/renders")) fs.mkdirSync("./cache/renders");
  if(!fs.existsSync("./cache/skins")) fs.mkdirSync("./cache/skins");
}
web.use(async function timeLog(req, res, next) {
  req.port = port == 80 ? `` : `:${port}`;
  var ip = req.ip;
  res.setHeader("Access-Control-Allow-Origin", '*')
  console.log(`Запрос от ${ip} \nПуть: ${req.url.split("?")[0]}\n`)
  next()
});
web.get('/', async (req, res) => {
  res.json({
    message: `Hello, world!`,
    code: 200
  })
});
web.use('/', exp.static('cache'))
web.use('/cache', exp.static('cache'))


var skins = require('./router/skins');
web.use('/skin', skins);

var capes = require('./router/capes');
web.use('/cape', capes);

web.use('/playerdata', async (req, res) => {
  if (!req.query.name) {
    res.status(400);
    res.json({
      error: {
        code: 400,
        codename: "Bad Request",
        message: "Name not found!"
      }
    })
    return;
  }
  var nickname = req.query.name;
  var data = {
    nickname: '',
    skin: '',
    cape: '',
    model: ''
  };
  try {
    const mainURL = await axios({ url: `https://api.mojang.com/users/profiles/minecraft/${nickname}` });
    const mainJSON = mainURL.data;
    if (mainJSON.id == null) {
      res.status(404);
      res.json({
        error: {
          code: 404,
          codename: "Not found",
          message: "This nickname does not have a license account linked to it!"
        }
      })
      return;
    };
    data.nickname = mainJSON.name;
    const UUID = mainJSON.id;
    data.UUID = UUID;
    const texturesURL = await axios({ url: `https://sessionserver.mojang.com/session/minecraft/profile/${UUID}` });
    const texturesJSON = texturesURL.data;
    var info = JSON.parse(atob(texturesJSON.properties[0].value))
    // console.log(info.textures.SKIN.metadata.model);
    data.skin = info.textures.SKIN.url
    if(info.textures.CAPE != undefined) data.cape = info.textures.CAPE.url;
    if (!info.textures.SKIN.metadata) data.model = "standart";
    else data.model = info.textures.SKIN.metadata.model;
  } catch (error) {
    res.status(500);
    res.json({
      error: {
        code: 500,
        codename: "Internal Server Error",
        message: error.message
      }
    })
    console.log(error)
    return;
  }
  res.json(data);
})

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
  console.log(`\n-=-=-=-=-=-\n\nAlina API\n\n-=-=-=-=-=-\nAPI Был успешно запущен!\nПорт: ${port}\n-=-=-=-=-=-\n`)
})
