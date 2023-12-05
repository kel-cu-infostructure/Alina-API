const { default: axios } = require('axios');
var atob = require("atob")
var express = require('express');
var router = express.Router();
var fs = require('fs');
var port = require(`../config.json`).PORT
var apiurl = require(`../config.json`).URL
__dirname = __dirname.replace(/\\/gi, '/').replace('/router', '');
var capesLoaderApi = require("../configs/capes.json");
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
    if (req.query.api) {
        try {
            var url = await axios({ url: `http://localhost:${port}/cape/data?name=${name}&uuid=${uuid}&api=${req.query.api}` });
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
    } else {
        get(0)
        async function get(id) {
            try {
                var info = await axios({ url: `http://localhost:${port}/cape/data?name=${name}&uuid=${uuid}&api=${id}` })
                var json = info.data;
                data = json;
                render(data, res)
            } catch (error) {
                var json = error.response.data;
                if (json.error) {
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
                if (json.error.code == 404) {
                    return get(id + 1)
                }
            }
        }
    }
    async function render(data, res) {
        try {
            const cape = `cache/capes/${data.nickname}-${data.api.id}.png`
            const image = await axios({ url: data.cape, responseType: `arraybuffer` })
            fs.writeFileSync(cape, image.data)
            data.file = {
                local: `${__dirname}/${cape}`,
                web: `${apiurl}/capes/${data.nickname}-${data.api.id}.png`
            }
            var fileCapeRender = `cache/capesRender/${data.nickname}-${data.api.id}.png`;
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
router.all("/data", async (req, res) => {
    if (!req.query.name && !req.query.uuid && !req.query.api) {
        res.status(400);
        res.json({
            error: {
                code: 400,
                codename: "Bad Request",
                message: "There are no parameters!"
            }
        })
        return;
    }
    if (!capesLoaderApi.api[req.query.api]) {
        res.status(400);
        res.json({
            error: {
                code: 400,
                codename: "Bad Request",
                message: "API not found!"
            }
        })
        return;
    }
    var name = req.query.name;
    var uuid = req.query.uuid;
    var API = capesLoaderApi.api[req.query.api];
    var data = {
        nickname: name,
        cape: '',
        api: API
    };
    if (API.type == 1) {
        // Mojang
        try {
            const url = await axios({ url: API.urls.getInfo + uuid });
            const json = url.data;
            var jsonData = JSON.parse(atob(json.properties[0].value))
            if (!jsonData.textures.CAPE) {
                res.status(404);
                res.json({
                    error: {
                        code: 404,
                        codename: "Not found",
                        message: "Cape not found!"
                    }
                })
                return;
            }
            data.cape = jsonData.textures.CAPE.url;
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
    } else if (API.type == 2) {
        try {
            // MinecraftCapes
            const info = await axios({ url: `https://minecraftcapes.net/profile/${uuid}` })
            if (info.status == 404) {
                res.status(404);
                res.json({
                    error: {
                        code: 404,
                        codename: "Not found",
                        message: "Cape not found!"
                    }
                })
                return;
            }
            const infoJSON = info.data;
            if (!infoJSON.textures.cape) {
                res.status(404);
                res.json({
                    error: {
                        code: 404,
                        codename: "Not found",
                        message: "Cape not found!"
                    }
                })
                return;
            }
            data.cape = `https://minecraftcapes.net/profile/${uuid}/cape`;
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
    } else if (API.type == 3) {
        // OptiFine
        try {
            const info = await axios({ url: `${API.urls.main}${name}.png` })
            if (info.status == 404 || info.data == `<html>\r\n<body>\r\nNot found\r\n</body>\r\n</html>`) {
                res.status(404);
                res.json({
                    error: {
                        code: 404,
                        codename: "Not found",
                        message: "Cape not found!"
                    }
                })
                return;
            }
            data.cape = `http://s.optifine.net/capes/${name}.png`;
        } catch (err) {
            if (!err.response) {
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
            } if (err.response.status == 404) {
                res.status(404);
                res.json({
                    error: {
                        code: 404,
                        codename: "Not found",
                        message: "Cape not found!"
                    }
                })
                return;
            }
        }
    }
    res.json(data)
})

module.exports = router;