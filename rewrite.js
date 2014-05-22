var fs = require('fs'),
    lively = require('livelykernel'),
    esprima = require('esprima'),
    escodegen = require('escodegen'),
    traverse = require("ast-traverse");

global.legind = {
    _ops: 0,
    _enter: function() {},
    _exit: function() {}
}

lively.lively.whenLoaded(function() {
    lively.JSLoader.require('instrumentation').toRun(function() {
        setTimeout(go, 2000);
    });
});

var templates = [];

function wrapBody(fn) {
    var args = ["this"];
    for (var i = 0; i < fn.params.length; i++) {
        args.push(fn.params[i].name);
    }
    var id = templates.length;
    var ast = esprima.parse("{try { legind._enter(" + id + ",[" + args.join(",") + "]) }" +
                             "finally { legind._exit() }}");
    ast.body[0].body[0].block.body.push(fn.body);
    var name = fn.id ? fn.id.name : "anonymous";
    templates.push({name: name, args: args, pos: fn.range});
    return ast.body[0];
}

function wrapOp(node) {
    var ast = esprima.parse("legind._ops++");
    return {
        type: 'SequenceExpression',
        expressions: [ast.body[0].expression, node]
    }
}

function rewrite(src) {
    var ast = esprima.parse(src, {range: true});
    traverse(ast, {pre: function(node, par, prop, idx) {
        switch (node.type) {
            case "FunctionExpression":
            case "FunctionDeclaration":
                node.body = wrapBody(node);
                return;
            case "CallExpression":
            case "UnaryExpression":
            case "BinaryExpression":
            case "AssignmentExpression":
            case "UpdateExpression":
            case "LogicalExpression":
                if (typeof par[prop] === "undefined") {
                    console.log(prop);
                    return;
                }
                if (typeof idx === "number") {
                    par[prop][idx] = wrapOp(node);
                } else {
                    par[prop] = wrapOp(node);
                }
        }
    }});
    return "var legind = global.legind;\n" + escodegen.generate(ast);
}

function go() {
    var filename = process.argv[2];
    if (!/\.js$/.test(filename)) {
        console.error("expects .js file ending (" + filename + ")");
        return;
    }
    console.log("Loading file " + filename);
    var outfilename = filename.substring(0, filename.length - 3) + ".rewritten.js";
    fs.readFile(filename, function(err, data) {
        if (err) throw err;
        var profiler = new lively.legind.instrumentation.NodeJSProfiler();
        var src = data.toString();
        console.log("Rewriting file");
        var rewritten = rewrite(src);
        console.log("Writing file " + outfilename);
        fs.writeFile(outfilename, rewritten, function (err) {
            if (err) throw err;
            global.legind = lively.legind;
            profiler.rewriteAndProfile(templates);
            require(process.argv[3]);
        });
    });
}

