module('legind.instrumentation').requires('lively.ast.Rewriting').toRun(function() {

Object.subclass('legind.instrumentation.CModel',
'initializing', {
    initialize: function(argIdx) {
        this.argIdx = argIdx;
        this.n = 0;
        this.meanX = 0;
        this.meanY = 0;
        this.varX = 0;
        this.covarXY = 0;
        this.loss = 0;
    }
},
'analysis', {
    fit: function(args, time) {
        var x = this.kernel(args[this.argIdx]);
        var y = time;
        if (this.varX > 0) {
            var beta = this.covarXY / this.varX;
            var pred = 0|(this.meanY - beta* this.meanX + beta* x);
            this.loss += (this.n - 2) * Math.abs(y - pred);
        }
        this.n++;
        var meanX1 = this.meanX + (x - this.meanX) / this.n;
        var meanY1 = this.meanY + (y - this.meanY) / this.n;
        this.varX = this.varX + (x - this.meanX) * (x - meanX1);
        this.covarXY = this.covarXY + (x - this.meanX) * (y - meanY1);
        this.meanX = meanX1;
        this.meanY = meanY1;
    },
    alpha: function() {
        return this.meanY - this.meanX * this.beta();
    },
    beta: function() {
        return this.covarXY / this.varX;
    },
    _predict: function(arg) {
        return 0|(this.alpha() + this.beta() * this.kernel(arg));
    },
    predict: function(args) {
        return this._predict(args[this.argIdx]);
    }
},
'interface', {
    describe: function() {
        var log = this.loss / this.n;
        return this.name() + ":  " + (0|log) + "\n";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CLinear',
'analysis', {
    kernel: function(x) {
        return x;
    }
}, 'interface', {
    name: function() {
        return "O(n)";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CQuadratic',
'analysis', {
    kernel: function(x) {
        return x * x;
    }
}, 'interface', {
    name: function() {
        return "O(n²)";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CCubic',
'analysis', {
    kernel: function(x) {
        return x * x * x;
    }
}, 'interface', {
    name: function() {
        return "O(n³)";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CLogarithmic',
'analysis', {
    kernel: function(x) {
        return Math.log(x);
    }
}, 'interface', {
    name: function() {
        return "O(log n)";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CLinearithmic',
'analysis', {
    kernel: function(x) {
        return x * Math.log(x);
    }
}, 'interface', {
    name: function() {
        return "O(n log n)";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CExponential',
'analysis', {
    kernel: function(x) {
        return Math.pow(2,x);
    }
}, 'interface', {
    name: function() {
        return "O(2ⁿ)";
    }
});

Object.subclass('legind.instrumentation.Profiler',
'initializing', {
    initialize: function() {
        this.timers = [];
    }
},
'profiling', {
    startTimer: function(id, args) {
        var nargs = args.length;
        var fargs = new Array(nargs);
        for (var i = 0; i < nargs; i++) {
            var a =  args[i];
            var t = typeof a;
            if (t === "number") {
                fargs[i] = a;
            } else if (t === "string") {
                fargs[i] = a.length;
            } else if (args instanceof Array) {
                fargs[i] = a.length;
            } else {
                fargs[i] = 1;
            }
        }
        this.timers.push([Date.now(), id, fargs]);
    },
    stopTimer: function() {
        var last = this.timers.pop();
        var time = Date.now() - last[0];
        if (time > 10) {
            this.record(last[1], time, last[2]);
        }
    },
    record: function(id, time, args) {
        var report = this.report[id];
        report.total += time;
        var nmodels = report.cmodels.length;
        for (var i = 0; i < nmodels; i++) {
            report.cmodels[i].fit(args, time);
        }
        if (report.inv.length <= 120) {
            report.inv.push({args: args, time: time});
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
        this.report = rewriter.templates.map(function(e) {
            return Object.extend({
                inv: [],
                total: 0,
                cmodels: e.args.map(function(arg, idx) {
                    return [
                        new legind.instrumentation.CLinear(idx),
                        new legind.instrumentation.CQuadratic(idx),
                        new legind.instrumentation.CCubic(idx),
                        new legind.instrumentation.CLogarithmic(idx),
                        new legind.instrumentation.CLinearithmic(idx),
                        new legind.instrumentation.CExponential(idx)
                    ];
                }).flatten()
            }, e);
        });
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
