module('legind.instrumentation').requires('lively.ast.Rewriting','lively.ast.Interpreter').toRun(function() {

lively.ast.InterpreterVisitor.subclass('legind.instrumentation.ExtractVars',
'initializing', {
    initialize: function($super) {
        this.vars = [];
        this.timeout = 10000;
        $super();
    }
}, 'visiting', {
    visit: function($super, node) {
        if (this.timeout-- === 0) throw new Exception("timeout");
        return $super(node);
    },
    visitVariable: function($super, node) {
        var result = $super(node);
        this.vars.push({name: node.name, pos: node.pos[0], val: result});
        return result;
    },
    visitSet: function($super, node) {
        if (node.left.isVariable) {
            var oldR = this.currentFrame.lookup(node.left.name);
        }
        var result = $super(node);
        if (!node.left.isVariable) return result;
        this.vars.push({name: node.left.name, pos: node.pos[0], val: oldR});
        this.vars.push({name: node.left.name, pos: node.pos[0], val: result, mod: true});
        return result;
    },
    visitModifyingSet: function($super, node) {
        var result = $super(node);
        if (!node.left.isVariable) return result;
        this.vars.push({name: node.left.name, pos: node.left.pos[0], val: result, mod: true});
        return result
    },
    visitPostOp: function($super, node) {
        var result = $super(node);
        if (!node.expr.isVariable) return result;
        var newR = this.currentFrame.lookup(node.expr.name);
        this.vars.push({name: node.expr.name, pos: node.expr.pos[0], val: newR, mod: true});
        return result;
    },
    visitPreOp: function($super, node) {
        var result = $super(node);
        if (!node.expr.isVariable) return result;
        this.vars.push({name: node.expr.name, pos: node.expr.pos[0], val: result, mod: true});
        return result;
    },
    visitVarDeclaration: function($super, node) {
        var result = $super(node);
        this.vars.push({name: node.name, pos: node.pos[0]+1, val: result});
        return result;
    }
}, 'analyzing', {
    extract: function(src) {
        try {
            var ast = lively.ast.Parser.parse(src);
            this.run(ast);
            this.vars = this.sort(this.vars);
            return this.vars;
        } catch (e) {
            return undefined;
        }
    },
    sort: function(arr) {
        if (arr.length <= 1) return arr;
        if (arr.length === 2) {
            if (arr[0].pos <= arr[1].pos) {
                return [arr[0],arr[1]];
            } else {
                return [arr[1],arr[0]];
            }
        }
        var m = 0|(arr.length / 2);
        var left = this.sort(arr.slice(0,m));
        var right = this.sort(arr.slice(m,arr.length));
        var i = 0; var j = 0;
        var out = [];
        while (i < left.length && j < right.length) {
            if (left[i].pos <= right[j].pos) {
                out.push(left[i++]);
            } else {
                out.push(right[j++]);
            }
        }
        while (i < left.length) {
            out.push(left[i++]);
        }
        while (j < right.length) {
            out.push(right[j++]);
        }
        return out;
    }
});

Object.subclass('legind.instrumentation.CModel',
'initializing', {
    initialize: function(argIdx) {
        this.argIdx = argIdx;
        this.n = 0;
        this.m = 0;
        this.meanX = 0;
        this.meanY = 0;
        this.varX = 0;
        this.covarXY = 0;
        this.loss = 0;
    }
},
'analysis', {
    alpha: function() {
        return this.meanY - this.meanX * this.beta();
    },
    beta: function() {
        return this.covarXY / this.varX;
    },
    predict: function(arg) {
        return 0|(this.alpha() + this.beta() * this.kernel(arg));
    },
    predictArgs: function(args) {
        return this.predict(args[this.argIdx]);
    },
    train: function(args, y) {
        if (this.argIdx >= args.length) return;
        var x = this.kernel(args[this.argIdx]);
        this.n++;
        var meanX1 = this.meanX + (x - this.meanX) / this.n;
        var meanY1 = this.meanY + (y - this.meanY) / this.n;
        this.varX = this.varX + (x - this.meanX) * (x - meanX1);
        this.covarXY = this.covarXY + (x - this.meanX) * (y - meanY1);
        this.meanX = meanX1;
        this.meanY = meanY1;
    },
    test: function(args, y) {
        if (this.argIdx >= args.length) return;
        this.m++;
        var pred = this.predictArgs(args);
        this.loss += (y - pred) * (y - pred);
    },
    rms: function() {
        return Math.sqrt(this.loss / this.m);
    }
},
'interface', {
    r2: function() {
        if (this.closs <= this.loss) return 0;
        return (100 - 100 * (this.loss / this.closs)).toFixed(2);
    },
    describe: function() {
        return this.name() + ":  " + this.r2() + "% (" + this.rms().toFixed(2) + ")\n";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CConstant',
'analysis', {
    train: function(args, y) {
        if (this.argIdx >= args.length) return;
        this.n++;
        this.meanY = this.meanY + (y - this.meanY) / this.n;
    },
    predict: function(arg) {
        return 0|this.meanY;
    },
},
'interface', {
    name: function() {
        return "O(1)";
    },
    r2: function() {
        return this.loss === 0 ? 100 : 0;
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CLinear',
'analysis', {
    kernel: function(x) {
        return x;
    }
},
'interface', {
    name: function() {
        return "O(n)";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CQuadratic',
'analysis', {
    kernel: function(x) {
        return x * x;
    }
},
'interface', {
    name: function() {
        return "O(n²)";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CCubic',
'analysis', {
    kernel: function(x) {
        return x * x * x;
    }
},
'interface', {
    name: function() {
        return "O(n³)";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CLogarithmic',
'analysis', {
    log2: Math.log(2),
    kernel: function(x) {
        return Math.log(x+1) / this.log2;
    }
},
'interface', {
    name: function() {
        return "O(log n)";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CLinearithmic',
'analysis', {
    log2: Math.log(2),
    kernel: function(x) {
        return x * (Math.log(x+1) / this.log2);
    }
},
'interface', {
    name: function() {
        return "O(n log n)";
    }
});

legind.instrumentation.CModel.subclass('legind.instrumentation.CExponential',
'analysis', {
    kernel: function(x) {
        return Math.pow(2,x);
    }
},
'interface', {
    name: function() {
        return "O(2ⁿ)";
    }
});

Object.subclass('legind.instrumentation.Profiler',
'initializing', {
    initialize: function() {
        this.stack = [];
        this.testing = false;
    }
},
'profiling', {
    isEntering: false,
    enter: function(id, args) {
        if (this.isEntering) return;
        this.isEntering = true;
        var nargs = args.length;
        var fargs = new Array(nargs);
        for (var i = 0; i < nargs; i++) {
            var a =  args[i];
            var t = typeof a;
            if (t === "number") {
                fargs[i] = a >= 0 ? a : 0;
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
        this.stack.push([this.current(), id, fargs]);
        this.isEntering = false;
    },
    exit: function() {
        if (this.isEntering) return;
        var last = this.stack.pop();
        var y = this.current() - last[0];
        this.record(last[1], y, last[2]);
    },
    record: function(id, y, args) {
        var report = this.report[id];
        report.total += y;
        var nmodels = report.cmodels.length;
        if (!!this.testing) {
            for (var i = 0; i < nmodels; i++) {
                report.cmodels[i].test(args, y);
            }
        } else {
            for (var i = 0; i < nmodels; i++) {
                report.cmodels[i].train(args, y);
            }
            if (report.inv.length <= 120) {
                report.inv.push({args: args, y: y});
            }
        }
    },
},
'reporting', {
    getReport: function() {
        this.report.each(function(fn) {
            fn.args.each(function(arg, idx) {
                var closs = 0;
                fn.cmodels.each(function(cmodel) {
                    if (cmodel.argIdx === idx && cmodel instanceof legind.instrumentation.CConstant) {
                        closs = cmodel.loss;
                    }
                });
                fn.cmodels.each(function(cmodel) {
                    if (cmodel.argIdx === idx) {
                        cmodel.closs = closs;
                    }
                });
                fn.cmodels.sort(function(a,b) {
                    return a.loss - b.loss;
                });
            });
        });
        return window.rreport = this.report;
    }
},
'running', {
    profile: function(cb) {
        legind.instrumentation.Profiler.current = this;
        cb();
    },
    rewrite: function(src) {
        var ast = lively.ast.Parser.parse(src, 'topLevel');
        if (!ast.isFunction) {
            ast = new lively.ast.Function([0,0], ast, []);
        }
        ast = new lively.ast.Call([0,0], ast, [])
        var prewriter = new legind.instrumentation.ProfilingTransformation();
        return [prewriter.visit(ast),prewriter.templates];
    },
    modelsForIdx: function(idx) {
        return [
            new legind.instrumentation.CConstant(idx),
            new legind.instrumentation.CLinear(idx),
            new legind.instrumentation.CQuadratic(idx),
            new legind.instrumentation.CCubic(idx),
            new legind.instrumentation.CLogarithmic(idx),
            new legind.instrumentation.CLinearithmic(idx),
            new legind.instrumentation.CExponential(idx)
        ];
    },
    rewriteAndProfile: function(src) {
        var res = this.rewrite(src),
            rewritten = res[0],
            templates = res[1];
        this.report = templates.map(function(e) {
            return Object.extend({
                inv: [],
                total: 0,
                cmodels: e.args.map(function(arg, idx) {
                    return this.modelsForIdx(idx);
                }, this).flatten()
            }, e);
        }, this);
        var cb = eval.bind(null,rewritten);
        this.profile(cb);
        this.testing = true;
        this.profile(cb);
        return this.getReport();
    }
});

legind.instrumentation.Profiler.subclass('legind.instrumentation.InstructionProfiler',
'profiling', {
    current: function(id, args) {
        return legind._calls + legind._ops;
    }
},
'running', {
    profile: function($super, cb) {
        legind._calls = 0;
        legind._ops = 0;
        return $super(cb);
    },
    rewrite: function($super, src) {
        var res = $super(src),
            rewritten = res[0],
            templates = res[1];
        var irewriter = new legind.instrumentation.InstructionTransformation();
        return [irewriter.rewrite(rewritten),templates];
    }
});

legind.instrumentation.Profiler.subclass('legind.instrumentation.TimeProfiler',
'profiling', {
    current: function() {
        return Date.now();
    },
    record: function($super, id, time, args) {
        if (time >= 3) {
            $super(id, time, args);
        }
    }
},
'running', {
    rewrite: function($super, src) {
        var res = $super(src),
            rewritten = res[0],
            templates = res[1];
        return [rewritten.asJS(),templates];
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
        var name = node.name();
        if (name === undefined && node._parent.isSet) {
            var left = node._parent.left;
            if (left.isVariable) name = left.name;
            if (left.isGetSlot) name = left.slotName;
        } else if (name === undefined && node._parent.isVarDeclaration) {
            name = node._parent.name;
        }
        this.templates.push({
            name: name,
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
        // legind.instrumentation.Profiler.current.enter(id, args);
        return new lively.ast.Send(pos,
            new lively.ast.String(pos,"enter"),
            this.currentProfiler(pos),
            [new lively.ast.Number(pos, this.templates.length-1), this.captureArgs(args)]);
    },
    exitFunction: function(pos) {
        // legind.instrumentation.Profiler.current.exit();
        return new lively.ast.Send(pos,
            new lively.ast.String(pos,"exit"),
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

lively.ast.Rewriting.Transformation.subclass('legind.instrumentation.InstructionTransformation',
'rewriting', {
    rewrite: function(ast) {
        return this.visit(ast).asJS()
            .replace(/__#CALL\)\(/g, "legind._calls++,")
            .replace(/__#OP\)\(/g, "legind._ops++,");
    }
},
'visiting', {
    visitNew: function($super, node) {
        return new lively.ast.Call(node.pos, new lively.ast.Variable(node.pos,"__#CALL"), [$super(node)]);
    },
    visitCall: function($super, node) {
        if (node._parent && node._parent.isNew) return $super(node)
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
