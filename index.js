'use strict'

var path = require('path')
var fs = require('fs')
var preprocessLib = require('preprocess')
var glob = require('glob')


function Preprocess(config) {
    this.config = config
    this.localConfig = Object.create(this.config.plugins.preprocess) || {}
    
    if(this.localConfig.pattern)
        this.pattern = this.localConfig.pattern
    if(this.localConfig.extension)
        this.extension = this.localConfig.extension
}
Preprocess.prototype.brunchPlugin = true
Preprocess.prototype.type = 'javascript'
Preprocess.prototype.pattern = /\.(es6|jsx|js|html)$/

// Object.defineProperty(Preprocess.prototype, 'localConfig', {get: function() {
//     return this.config.plugins.preprocess || {}
// }})

function compileImpl(params, next) {
    try {
        next(undefined, doPreprocess(params.data, params.path, this.localConfig.context))
    }
    catch(err) {
        if(this.localConfig.stackTraces && err.stack)
            next('\n' + err.stack + '\n')
        else
            next('\n' + err + '\n')
    }
}

Preprocess.prototype.compile = function(params, next) {
    if(this.localConfig.precompile)
        this.localConfig.precompile(this.localConfig, function(err) {
            if(err)
                return next(err)
            compileImpl.call(this, params, next)
        }.bind(this))
    else
        compileImpl.call(this, params, next)
}

Preprocess.prototype.onCompile = function(generatedFiles) {
    if(!this.localConfig.postCompilePattern)
        return
    
    var publicFolder = this.config.paths.public
    
    var urls = glob.sync('**', {cwd: publicFolder})
    
    var files = []
    urls.forEach(function(url) {
        var file = urlToFile(url, publicFolder)
        if(this.localConfig.postCompilePattern.test(file))
            files.push(file)
    }.bind(this))
    
    files.forEach(function(file) {
        var content = fs.readFileSync(file)
        
        var output = doPreprocess(content, file, this.localConfig.context)
        
        fs.writeFileSync(file, output)
    }.bind(this))
}

function urlToFile(url, publicFolder) {
    return path.normalize(path.join(publicFolder, url))
}

function doPreprocess(source, sourcePath, context) {
    if(sourcePath.indexOf('node_modules') === 0)
        return source
    
    var type = path.extname(sourcePath).replace('.', '')
    if(type === 'es6' || type === 'tag')
        type = 'js'

    return preprocessLib.preprocess(source, context, {type: type})
}


module.exports = Preprocess
