module('legind.instrumentation').requires('lively.ast.Rewriting').toRun(function() {

Object.subclass('legind.instrumentation.Profiler',
'initializing', {
    initialize: function() {
        this.timers = [];
        this.report = {};
    }
},
'profiling', {
    startTimer: function(id) {
        this.timers.push([Date.now(), id]);
    },
    stopTimer: function(/* args */) {
        var last = this.timers.pop();
        var id = last[1];
        var time = Date.now() - last[0];
        this.record(id, time, arguments[0]);
    },
    record: function(id, time, arg0) {
        var rec = {n: arg0, time: time};
        if (this.report.hasOwnProperty(id)) {
            this.report[id].push(rec);
        } else {
            this.report[id] = [rec];
        }
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
        try {
            cb();
        } finally {
            return this.getReport();
        }
    },
    rewriteAndProfile: function(src) {
        var ast = lively.ast.Parser.parse(src, 'topLevel');
        if (!ast.isFunction) {
            ast = new lively.ast.Function([0,0], ast, []);
        }
        ast = new lively.ast.Call([0,0], ast, [])
        var rewriter = new legind.instrumentation.Rewriter();
        var rewritten = rewriter.visit(ast).asJS();
        return this.profile(eval.bind(null,rewritten));
    }
});

lively.ast.Rewriting.Transformation.subclass('legind.instrumentation.Rewriter',
'generating', {
    fid: function(pos) {
        return pos[0] + "-" + pos[1];
    },
    currentProfiler: function(pos) {
        var path = ["legind", "instrumentation", "Profiler", "current"];
        var result = new lively.ast.Variable(pos, path.shift());
        path.each(function(p) {
            result = new lively.ast.GetSlot(pos, new lively.ast.String(pos, p), result);
        });
        return result;
    },
    enterFunction: function(pos, args) {
        // legind.instrumentation.Profiler.current.startTimer("foo");
        return new lively.ast.Send(pos,
            new lively.ast.String(pos,"startTimer"),
            this.currentProfiler(pos),
            [new lively.ast.String(pos, this.fid(pos))]);
    },
    exitFunction: function(pos, args) {
        // legind.instrumentation.Profiler.current.stopTimer();
        return new lively.ast.Send(pos,
            new lively.ast.String(pos,"stopTimer"),
            this.currentProfiler(pos),
            args);
    }
},
'visiting', {
    visitFunction: function(node) {
        var enter = this.enterFunction(node.pos, node.args);
        var enterSeq = new lively.ast.Sequence(node.pos, [enter, this.visit(node.body)]);
        var error = new lively.ast.Variable(node.pos, "e");
        var noop = new lively.ast.Variable(node.pos, "undefined");
        var exit = this.exitFunction(node.pos, node.args);
        var body = new lively.ast.TryCatchFinally(node.pos, enterSeq, error, noop, exit);
        return new lively.ast.Function(body.pos,
                                       body,
                                       this.visitNodes(node.args));
    }
});

}) // end of module
