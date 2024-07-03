const { default: axios } = require('axios');
var atob = require("atob")
var express = require('express');
var router = express.Router();
var fs = require('fs')
__dirname = __dirname.replace(/\\/gi, '/').replace('/router', '')
var port = require(`../config.json`).PORT
var apiurl = require(`../config.json`).URL
const { createCanvas, loadImage } = require('canvas');

router.all(`/render`, async (req, res) => {
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
  var sendFileRender = false;
  if (req.query.sendfile != null) {
    if (req.query.sendfile == 'true') sendFileRender = true;
    else sendFileRender = false;
  }
  var name = req.query.name;
  var data = {};
  try {
    var url = await axios({ url: `http://localhost:${port}/playerdata?name=${name}` });
    var info = url.data;
    if (info.error) {
      res.json(info);
      return
    }
    data = info;
    var head = false;
    if (req.query.head != null) {

      if (req.query.head == 'true') head = true;
    }
    console.log(req.query)
    render(data, head, res)
  } catch (error) {
    var json = error.response.data;
    res.json(json)
  }

  async function render(data, head, res) {
    try {
      const skin = `cache/skins/${data.nickname}.png`
      const image = await axios({ url: data.skin, responseType: `arraybuffer` })
      fs.writeFileSync(skin, image.data)
      data.file = {
        local: `${__dirname}/${skin}`,
        web: `${apiurl}/skins/${data.nickname}.png`
      }
      var isSlim = false;
      if (data.model == "slim" || (req.query.slim == 'true')) isSlim = true;
      const newrender = require("../lib/MinecraftSkin");
      const skinrender = new newrender(fs.readFileSync(data.file.local), isSlim, 512)
      if (head == true) {
        fs.writeFileSync(`cache/renders/${data.nickname}-head.png`, skinrender.getHead());
        data.render = {
          local: `${__dirname.replace("/router", "")}/cache/renders/${data.nickname}-head.png`,
          web: `${apiurl}/renders/${data.nickname}-head.png`
        }
      } else {
        fs.writeFileSync(`cache/renders/${data.nickname}-body.png`, skinrender.getRender());
        data.render = {
          local: `${__dirname.replace("/router", "")}/cache/renders/${data.nickname}-body.png`,
          web: `${apiurl}/renders/${data.nickname}-body.png`
        }
      }
      if (sendFileRender) res.sendFile(data.render.local);
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
router.all(`/render/avatar`, async (req, res) => {
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
  var sendFileRender = false;
  if (req.query.sendfile != null) {
    if (req.query.sendfile == 'true') sendFileRender = true;
    else sendFileRender = false;
  }
  var renderTwoLayer = true;
  if (req.query.two != null) {
    if (req.query.two == 'true') renderTwoLayer = true;
    else renderTwoLayer = false;
  }
  var name = req.query.name;
  var data = {};
  try {
    var url = await axios({ url: `http://localhost:${port}/playerdata?name=${name}` });
    var info = url.data;
    if (info.error) {
      res.json(info);
      return
    }
    data = info;
    var head = false;
    if (req.query.head != null) {

      if (req.query.head == 'true') head = true;
    }
    console.log(req.query)
    render(data, head, res)
  } catch (error) {
    var json = error.response.data;
    res.json(json)
  }
  var size = 64;
  var sizeDraw = 64;
  async function render(data, head, res) {
    const skin = `cache/skins/${data.nickname}.png`
    const image = await axios({ url: data.skin, responseType: `arraybuffer` })
    fs.writeFileSync(skin, image.data)
    data.file = {
      local: `${__dirname}/${skin}`,
      web: `${apiurl}/skins/${data.nickname}.png`
    }
    data.render = {
      local: `${__dirname}/cache/renders/${data.nickname}-avatar.png`,
      web: `${apiurl}/renders/${data.nickname}-avatar.png`
    }


    const canvas = createCanvas()
    const ctx = canvas.getContext('2d')
    loadImage(skin).then((image) => {
      canvas.width = 8 * size;
      canvas.height = 8 * size;
      sizeDraw = (size / 2);
      ctx.patternQuality = "fast";
      ctx.drawImage(image, (size - (size * 9)), (size - (size * 9)), image.width * (size), image.height * (size))
      if (renderTwoLayer) ctx.drawImage(image, ((size - (size * 9)) * 5), (size - (size * 9)), image.width * size, image.height * size)
      fs.writeFileSync(data.render.local, canvas.toBuffer())
      // res.send('<img src="' + canvas.toDataURL() + '" />')
      // console.log('<img src="' + canvas.toDataURL() + '" />')
      if (sendFileRender) res.sendFile(data.render.local);
      else res.json(data);
    })
  }
})
module.exports = router;
