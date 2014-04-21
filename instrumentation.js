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
        if (this.argIdx >= args.length) return;
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
        var ploss = 0|(100 - 100 * this.loss / this.tloss);
        return this.name() + ":  " + ploss + "% (" + this.loss + ")\n";
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
    initialize: function(instructions) {
        this.timers = [];
        if (instructions) {
            this.instructions = true;
        } else {
            this.time = true;
        }
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
            } else if (a instanceof Array) {
                fargs[i] = a.length;
            } else if (a) {
                fargs[i] = 1;
            } else {
                fargs[i] = 0;
            }
        }
        var y = this.instructions ? (legind._calls + legind._ops) : Date.now();
        this.timers.push([y, id, fargs]);
    },
    stopTimer: function() {
        var last = this.timers.pop();
        if (this.time) {
            var y = Date.now() - last[0];
            if (y < 3) return;
        } else {
            var y = legind._calls + legind._ops - last[0];
        }
        this.record(last[1], y, last[2]);
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
        this.report.each(function(fn) {
            fn.args.each(function(arg, idx) {
                var tloss = 0;
                fn.cmodels.each(function(cmodel) {
                    if (cmodel.argIdx === idx) {
                        cmodel.loss = 0|(cmodel.loss / cmodel.n);
                        tloss += cmodel.loss;
                    }
                });
                fn.cmodels.each(function(cmodel) {
                    if (cmodel.argIdx === idx) {
                        cmodel.tloss = tloss;
                    }
                });
            });
        });
        return this.report;
    }
},
'running', {
    profile: function(cb) {
        legind.instrumentation.Profiler.current = this;
        if (this.instructions) {
            legind._calls = 0;
            legind._ops = 0;
        }
        cb();
        return this.getReport();
    },
    rewriteAndProfile: function(src) {
        var ast = lively.ast.Parser.parse(src, 'topLevel');
        if (!ast.isFunction) {
            ast = new lively.ast.Function([0,0], ast, []);
        }
        ast = new lively.ast.Call([0,0], ast, [])
        var prewriter = new legind.instrumentation.ProfilingTransformation();
        var rewrittenAST = prewriter.visit(ast);
        if (this.instructions) {
            var irewriter = new legind.instrumentation.InstructionCountingTransformation();
            var rewritten = irewriter.rewrite(rewrittenAST);
        } else {
            var rewritten = rewrittenAST.asJS();
        }
        console.log(rewritten);
        this.report = prewriter.templates.map(function(e) {
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

lively.ast.Rewriting.Transformation.subclass('legind.instrumentation.ProfilingTransformation',
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

lively.ast.Rewriting.Transformation.subclass('legind.instrumentation.InstructionCountingTransformation',
'rewriting', {
    rewrite: function(ast) {
        return this.visit(ast).asJS()
            .replace("__#CALL)(", "legind._calls++,", "g")
            .replace("__#OP)(", "legind._ops++,", "g");
    }
},
'visiting', {
    visitCall: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#CALL"), [$super(node)]);
    },
    visitSend: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#CALL"), [$super(node)]);
    },
    visitBinaryOp: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#OP"), [$super(node)]);
    },
    visitUnaryOp: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#OP"), [$super(node)]);
    },
    visitSet: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#OP"), [$super(node)]);
    },
    visitModifyingSet: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#OP"), [$super(node)]);
    },
    visitObjPropertySet: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#OP"), [$super(node)]);
    },
    visitObjPropertySet: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#OP"), [$super(node)]);
    },
    visitPreOp: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#OP"), [$super(node)]);
    },
    visitPostOp: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#OP"), [$super(node)]);
    }
});

}) // end of module
