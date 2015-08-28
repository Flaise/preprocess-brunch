'use strict'

var path = require('path')
var fs = require('fs')
var preprocessLib = require('preprocess')
var glob = require('glob')


function Preprocess(config) {
    var preprocessConfig = config.plugins.preprocess || {}
    
    this.context = preprocessConfig.context || {}
    this.postCompilePattern = preprocessConfig.postCompilePattern
    this.stackTraces = preprocessConfig.stackTraces || false
    this.config = config
}
Preprocess.prototype.brunchPlugin = true
Preprocess.prototype.type = 'javascript'
Preprocess.prototype.pattern = /\.(es6|jsx|js|html)$/

Preprocess.prototype.compile = function(params, next) {
    try {
        next(undefined, doPreprocess(params.data, params.path, this.context))
    }
    catch(err) {
        if(this.stackTraces && err.stack)
            next('\n' + err.stack + '\n')
        else
            next('\n' + err + '\n')
    }
}

Preprocess.prototype.onCompile = function(generatedFiles) {
    if(!this.postCompilePattern)
        return
    
    var publicFolder = this.config.paths.public
    
    var urls = glob.sync('**', {cwd: publicFolder})
    
    var files = []
    urls.forEach(function(url) {
        var file = urlToFile(url, publicFolder)
        if(this.postCompilePattern.test(file))
            files.push(file)
    }.bind(this))
    
    
    files.forEach(function(file) {
        var content = fs.readFileSync(file)
        
        var output = doPreprocess(content, file, this.context)
        
        fs.writeFileSync(file, output)
    }.bind(this))
}

function urlToFile(url, publicFolder) {
    return path.normalize(path.join(publicFolder, url))
}

function doPreprocess(source, sourcePath, context) {
    if(sourcePath.indexOf('node_modules') === 0)
        return source
    
    var type = path.extname(sourcePath)
    if(type === '.es6')
        type = '.js'
    type = type.replace('.', '')

    return preprocessLib.preprocess(source, context, {type: type})
}



module.exports = Preprocess
