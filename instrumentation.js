module('legind.instrumentation').requires('lively.ast.Rewriting').toRun(function() {

Object.subclass('legind.instrumentation.Profiler',
'initializing', {
    initialize: function() {
        this.timers = [];
    }
},
'profiling', {
    startTimer: function(id, args) {
        this.timers.push([Date.now(), id, args]);
    },
    stopTimer: function() {
        var last = this.timers.pop();
        var time = Date.now() - last[0];
        this.record(last[1], time, last[2]);
    },
    record: function(id, time, args) {
        args.push(time);
        this.report[id].inv.push(args);
    },
},
'reporting', {
    getReport: function() {
        return this.report;
    }
},
'running', {
    profile: function(cb) {
        legind.instrumentation.Profiler.current = this;
        cb();
        return this.getReport();
    },
    rewriteAndProfile: function(src) {
        var ast = lively.ast.Parser.parse(src, 'topLevel');
        if (!ast.isFunction) {
            ast = new lively.ast.Function([0,0], ast, []);
        }
        ast = new lively.ast.Call([0,0], ast, [])
        var rewriter = new legind.instrumentation.Rewriter();
        var rewritten = rewriter.visit(ast).asJS();
        this.report = rewriter.templates.map(function(e) { e.inv = []; return e; });
        return this.profile(eval.bind(null,rewritten));
    }
});

lively.ast.Rewriting.Transformation.subclass('legind.instrumentation.Rewriter',
'initialization', {
    initialize: function($super) {
        $super();
        this.templates = [];
    }
},
'generating', {
    addFunction: function(node) {
        this.templates.push({
            name: node.name(),
            pos: node.pos,
            args: node.args.map(function(arg) { return arg.name; })
        });
    },
    currentProfiler: function(pos) {
        var path = ["legind", "instrumentation", "Profiler", "current"];
        var result = new lively.ast.Variable(pos, path.shift());
        path.each(function(p) {
            result = new lively.ast.GetSlot(pos, new lively.ast.String(pos, p), result);
        });
        return result;
    },
    captureArgs: function(args) {
        var elements = [];
        args.each(function(arg) {
            elements.push(new lively.ast.Variable([0,0], arg.name));
        });
        return new lively.ast.ArrayLiteral([0,0], elements);
    },
    enterFunction: function(pos, args) {
        // legind.instrumentation.Profiler.current.startTimer(id, args);
        return new lively.ast.Send(pos,
            new lively.ast.String(pos,"startTimer"),
            this.currentProfiler(pos),
            [new lively.ast.Number(pos, this.templates.length-1), this.captureArgs(args)]);
    },
    exitFunction: function(pos) {
        // legind.instrumentation.Profiler.current.stopTimer();
        return new lively.ast.Send(pos,
            new lively.ast.String(pos,"stopTimer"),
            this.currentProfiler(pos),
            []);
    }
},
'visiting', {
    visitFunction: function(node) {
        this.addFunction(node);
        var enter = this.enterFunction(node.pos, node.args);
        var enterSeq = new lively.ast.Sequence(node.pos, [enter, this.visit(node.body)]);
        var error = new lively.ast.Variable(node.pos, "e");
        var noop = new lively.ast.Variable(node.pos, "undefined");
        var exit = this.exitFunction(node.pos);
        var body = new lively.ast.TryCatchFinally(node.pos, enterSeq, error, noop, exit);
        return new lively.ast.Function(body.pos,
                                       body,
                                       this.visitNodes(node.args));
    }
});

}) // end of module
