const { default: axios } = require('axios');
var atob = require("atob")
var express = require('express');
var router = express.Router();
var fs = require('fs')
__dirname = __dirname.replace(/\\/gi, '/').replace('/router', '')
var port = require(`../config.json`).PORT
var apiurl = require(`../config.json`).URL
var skinsLoaderApi = require(`../configs/skins.json`);
const { createCanvas, loadImage } = require('canvas');

router.all(`/render`, async(req, res) => {
  if(!req.query.name){
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
  var sendFileRender = false;
  if(req.query.sendfile != null){
    if(req.query.sendfile == 'true') sendFileRender = true;
    else sendFileRender = false;
  }
  var name = req.query.name;
  var data = {};
  if(req.query.api){
    try{
      var url = await axios({ url: `http://localhost:${port}/skin/data?name=${name}&api=${req.query.api}` });
      var info = url.data;
      if(info.error){
        res.json(info);
        return
      }
      data = info;
      var head = false;
      if(req.query.head != null){
        
        if(req.query.head == 'true') head = true;
      }
      console.log(req.query)
      render(data, head, res)
    } catch(error){
      var json = error.response.data;
      res.json(json)
    }
  } else {
    get(0)
  async function get(id) {
    try{
      var info = await axios({ url: `http://localhost:${port}/skin/data?name=${name}&api=${id}` })
      var json = info.data;
      data = json;
      var head = false;
      if(req.query.head != null){
        if(req.query.head == 'true') head = true;
      }
      render(data, head, res)
    } catch(error){
      var json = error.response.data;
      if (json.error) 
      {
        if (json.error.code == 400) {
          res.status(404);
          res.json({
            error: {
              code: 404,
              codename: "Not found",
              message: "Player not found!"
            }
          })
          return;
        } else {
          return get(id + 1)
        }
      } 
      if (json.error.code == 404) 
      {
        return get(id + 1)
      }
    }
  }
  }
  async function render(data, head, res){
    try {
      const skin = `cache/skins/${data.nickname}-${data.api.id}.png`
      const image = await axios({ url: data.skin, responseType: `arraybuffer` })
      fs.writeFileSync(skin, image.data)
      data.file = {
        local: `${__dirname}/${skin}`,
        web: `${apiurl}/skins/${data.nickname}-${data.api.id}.png`
      }
      var isSlim = false;
      if (data.model == "slim" || (req.query.slim == 'true')) isSlim = true;
      const newrender = require("../lib/MinecraftSkin");
      const skinrender = new newrender(fs.readFileSync(data.file.local), isSlim, 512)
      if(head == true){
        fs.writeFileSync(`cache/renders/${data.nickname}-${data.api.id}-head.png`, skinrender.getHead());
        data.render = {
          local: `${__dirname.replace("/router", "")}/cache/renders/${data.nickname}-${data.api.id}-head.png`,
          web: `${apiurl}/renders/${data.nickname}-${data.api.id}-head.png`
        }
      } else {
        fs.writeFileSync(`cache/renders/${data.nickname}-${data.api.id}-body.png`, skinrender.getRender());
        data.render = {
          local: `${__dirname.replace("/router", "")}/cache/renders/${data.nickname}-${data.api.id}-body.png`,
          web: `${apiurl}/renders/${data.nickname}-${data.api.id}-body.png`
        }
      }
      if(sendFileRender) res.sendFile(data.render.local);
      else res.json(data);
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
  }
})
router.all('/data', async(req, res) => {
  if(!req.query.api || !skinsLoaderApi[req.query.api]){
    res.status(400);
    res.json({
      error: {
        code: 400,
        codename: "Bad Request",
        message: "API not found!"
      }
    })
    return;
  } else if(!req.query.name){
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
  var api = skinsLoaderApi[req.query.api];
  var data = {
    nickname: '',
    skin: '',
    model: '',
    api: api
  };
  
  if(api.type == 0) // Mojang
  {
    try {
      const mainURL = await axios({ url: api.apiRoot.replace("%PLAYER%", nickname) });
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
      const texturesURL = await axios({ url: api.sessionRoot.replace("%UUID%", UUID) });
      const texturesJSON = texturesURL.data;
      var info = JSON.parse(atob(texturesJSON.properties[0].value))
      // console.log(info.textures.SKIN.metadata.model);
      data.skin = info.textures.SKIN.url
      if(!info.textures.SKIN.metadata) data.model="standart";
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
  } else if(api.type == 1) // ElyBy
  {
    try {
      const url = await axios({ url: api.root.replace("%PLAYER%", nickname) });
      const json = url.data
      if (json.SKIN == null){
        res.status(404);
        res.json({
          error: {
            code: 404,
            codename: "Not found",
            message: "Player not found!"
          }
        })
        return;
      };
      data.nickname = nickname;
      data.skin = json.SKIN.url;
      if (!json.SKIN.metadata) {
        data.model = `standart`
      } else {
        data.model = json.SKIN.metadata.model;
      }
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
  } else if(api.type == 2) // CustomSkinAPI
  {
    try {
      const url = await axios({ url: api.root.replace("%PLAYER%", nickname) });
      const json = url.data
      if (json.errno == 404){
        res.status(404);
        res.json({
          error: {
            code: 404,
            codename: "Not found",
            message: "Player not found!"
          }
        })
        return;
      };
      if (!json.model_preference) {
        json.model_preference = [
          "default"
        ]
      }
      data.nickname=nickname;
      data.skin = `${api.root.replace(`%PLAYER%.json`, `textures/`)}${json.skins[json.model_preference[0]]}`

      if (!json.skins[json.model_preference[0]].metadata) {
        data.model = `old`
      } else {
        data.model = json.skins[json.model_preference[0]].metadata.model;
      }
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
  } else if(api.type == 3) // GlitchlessGames
  {
    try {
      const url = await axios({ url: api.root.replace("%PLAYER%", nickname) });
      const json = url.data
      if (json.error == "ERR_PROFILE_NOT_FOUND"){
        res.status(404);
        res.json({
          error: {
            code: 404,
            codename: "Not found",
            message: "Player not found!"
          }
        })
        return;
      };
      data.nickname = nickname;
      data.skin = json.textures.SKIN.url;
      data.model = "standart";
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
  } else if(api.type == 4) // RevolutionWorlds API
  {
    try {
      const url = await axios({ url: api.root.replace("%PLAYER%", nickname) });
      const json = url.data
      if(json["error-code"] && json["error-code"] == 1){
        res.status(404);
        res.json({
          error: {
            code: 404,
            codename: "Not found",
            message: "Player not found!"
          }
        })
        return;
      };
      
      data.nickname = json.name;
      data.skin = json.skin["skin-url"];
      const texturesJSON = json.skin.profile.value;
      var info = JSON.parse(atob(texturesJSON));
      if(info.textures.SKIN.metadata != null) data.model = info.textures.SKIN.metadata.model;
      else data.model = "standart";
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
  } 
  res.json(data);
})
router.all(`/render/avatar`, async(req, res) => {
  if(!req.query.name){
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
  var sendFileRender = false;
  if(req.query.sendfile != null){
    if(req.query.sendfile == 'true') sendFileRender = true;
    else sendFileRender = false;
  }
  var renderTwoLayer = true;
  if(req.query.two != null){
    if(req.query.two == 'true') renderTwoLayer = true;
    else renderTwoLayer = false;
  }
  var name = req.query.name;
  var data = {};
  if(req.query.api){
    try{
      var url = await axios({ url: `http://localhost:${port}/skin/data?name=${name}&api=${req.query.api}` });
      var info = url.data;
      if(info.error){
        res.json(info);
        return
      }
      data = info;
      var head = false;
      if(req.query.head != null){
        
        if(req.query.head == 'true') head = true;
      }
      console.log(req.query)
      render(data, head, res)
    } catch(error){
      var json = error.response.data;
      res.json(json)
    }
  } else {
    get(0)
  async function get(id) {
    try{
      var info = await axios({ url: `http://localhost:${port}/skin/data?name=${name}&api=${id}` })
      var json = info.data;
      data = json;
      var head = false;
      if(req.query.head != null){
        if(req.query.head == 'true') head = true;
      }
      render(data, head, res)
    } catch(error){
      var json = error.response.data;
      if (json.error) 
      {
        if (json.error.code == 400) {
          res.status(404);
          res.json({
            error: {
              code: 404,
              codename: "Not found",
              message: "Player not found!"
            }
          })
          return;
        } else {
          return get(id + 1)
        }
      } 
      if (json.error.code == 404) 
      {
        return get(id + 1)
      }
    }
  }
  }
  var size = 64;
  var sizeDraw = 64;
  async function render(data, head, res){
    const skin = `cache/skins/${data.nickname}-${data.api.id}.png`
      const image = await axios({ url: data.skin, responseType: `arraybuffer` })
      fs.writeFileSync(skin, image.data)
      data.file = {
        local: `${__dirname}/${skin}`,
        web: `${apiurl}/skins/${data.nickname}-${data.api.id}.png`
      }
      data.render = {
        local: `${__dirname}/cache/renders/${data.nickname}-${data.api.id}-avatar.png`,
        web: `${apiurl}/renders/${data.nickname}-${data.api.id}-avatar.png`
      }


    const canvas = createCanvas()
    const ctx = canvas.getContext('2d')
    loadImage(skin).then((image) => {
      canvas.width = 8 * size;
      canvas.height = 8 * size;
      sizeDraw = (size / 2);
      ctx.patternQuality = "fast";
      ctx.drawImage(image, (size - (size * 9)), (size - (size * 9)), image.width * (size), image.height * (size))
      if(renderTwoLayer) ctx.drawImage(image, ((size - (size * 9))*5), (size - (size * 9)), image.width * size, image.height * size)
      fs.writeFileSync(data.render.local, canvas.toBuffer())
      // res.send('<img src="' + canvas.toDataURL() + '" />')
      // console.log('<img src="' + canvas.toDataURL() + '" />')
      if(sendFileRender) res.sendFile(data.render.local);
      else res.json(data);
    })
  }
})
module.exports = router;
