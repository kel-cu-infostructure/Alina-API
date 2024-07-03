const { default: axios } = require('axios');
var atob = require("atob")
var express = require('express');
var router = express.Router();
var fs = require('fs');
var port = require(`../config.json`).PORT
var apiurl = require(`../config.json`).URL
__dirname = __dirname.replace(/\\/gi, '/').replace('/router', '');
var canvas = require("canvas");

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
    //
    var sendFileRender = false;
    if (req.query.sendfile != null) {
        if (req.query.sendfile == 'true') sendFileRender = true;
        else sendFileRender = false;
    }
    //
    var name = req.query.name;
    var uuid = "";
    try {
        const info = await axios({ url: `${capesLoaderApi.mojangAPI}${name}` });
        const jsonInfo = info.data;
        if (jsonInfo.id == null) {
            res.status(400);
            res.json({
                error: {
                    code: 400,
                    codename: "Bad Request",
                    message: "No licensed account was found under this nickname! If this is an error, try again later..."
                }
            })
            return;
        }
        uuid = jsonInfo.id;
        name = jsonInfo.name;
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
    //
    var data = {};
    try {
        var url = await axios({ url: `http://localhost:${port}/playerdata?name=${name}` });
        var info = url.data;
        if (info.error) {
            res.json(info);
            return
        }
        data = info;
        render(data, res)
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
    }
    async function render(data, res) {
        try {
            const cape = `cache/capes/${data.nickname}.png`
            const image = await axios({ url: data.cape, responseType: `arraybuffer` })
            fs.writeFileSync(cape, image.data)
            data.file = {
                local: `${__dirname}/${cape}`,
                web: `${apiurl}/capes/${data.nickname}.png`
            }
            var fileCapeRender = `cache/capesRender/${data.nickname}.png`;
            var img = canvas.createCanvas();
            var context = img.getContext("2d");
            // 10 = Ширина
            // 16 = Высота

            // Максимум
            // Ширина = 64
            // Высота = 32

            // Увеличение
            var size = 32;
            var sizeDraw = 32;
            canvas.loadImage(cape).then(image => {
                if (image.width > 64 || image.height > 32) {
                    if (image.width == 128) {
                        sizeDraw = (size / 2)
                    } else if (image.width == 2048) {
                        sizeDraw = (size / 32);
                    }
                    else {
                        res.status(400);
                        res.json({
                            error: {
                                code: 400,
                                codename: "Bad Request",
                                message: "The API does not support non-standard cape resolutions!"
                            }
                        })
                        return;
                    }
                }
                img.width = 10 * size;
                img.height = 16 * size;
                context.patternQuality = "fast";
                context.drawImage(image, (size - (size * 2)), (size - (size * 2)), image.width * sizeDraw, image.height * sizeDraw)
                fs.writeFileSync(fileCapeRender, img.toBuffer())
                data.render = {
                    local: `${__dirname}/${fileCapeRender}`,
                    web: `${apiurl}/${fileCapeRender}`
                }
                if (sendFileRender) res.sendFile(data.render.local);
                else res.json(data);
            }).catch(error => {
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
            })
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

module.exports = router;