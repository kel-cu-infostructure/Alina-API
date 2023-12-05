const { exec } = require(`shelljs`);
const { default: axios } = require('axios');
var express = require('express');
const path = require('path')
var router = express.Router();
var fs = require('fs')
var port = require(`../config.json`).PORT
__dirname = __dirname.replace(/\\/gi, '/').replace('/router', '');

module.exports = router;