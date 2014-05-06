module('legind.tests').requires('legind.instrumentation','lively.TestFramework').toRun(function() {

TestCase.subclass('legind.tests.CTests',
'running', {
    setUp: function() {
        this.constant = new legind.instrumentation.CConstant(0);
        this.linear = new legind.instrumentation.CLinear(0);
        this.quadratic = new legind.instrumentation.CQuadratic(0);
        this.logarithmic = new legind.instrumentation.CLogarithmic(0);
        this.linearithmic = new legind.instrumentation.CLinearithmic(0);
    }
},
'testing', {
    testSimpleLinear: function() {
        this.linear.train([1], 1);
        this.linear.train([2], 2);
        this.assertEquals(0, this.linear.alpha());
        this.assertEquals(1, this.linear.beta());
        this.assertEquals(3, this.linear.predict([3]));
        this.assertEquals(4, this.linear.predict([4]));
    },
    testLinear1: function() {
        this.linear.train([1], 2);
        //this.assertEquals(0, this.linear.beta(), 'bb');
        //this.assertEquals(2, this.linear.alpha(),'a');
        //this.assertEquals(2, this.linear.predict([4]),'p');
        this.linear.train([2], 4);
        this.assertEquals(2, this.linear.beta(),'b');
        this.assertEquals(0, this.linear.alpha(), 'aa');
        this.assertEquals(8, this.linear.predict([4]));
        this.linear.train([3], 3);
        this.assertEquals(0.5, this.linear.beta());
        this.assertEquals(2, this.linear.alpha());
        this.assertEquals(4, this.linear.predict([4]));
        this.linear.train([6], 5);
        this.assertEquals(0.5, this.linear.beta(), 'dd');
        this.assertEquals(2, this.linear.alpha());
        this.assertEquals(5, this.linear.predict([7]));
    },
    testSimpleQuadratic: function() {
        this.quadratic.train([1], 1);
        this.quadratic.train([2], 4);
        this.quadratic.train([3], 9);
        this.assertEquals(0, this.quadratic.alpha(), 'gt1');
        this.assertEquals(1, this.quadratic.beta(), 'gt2');
        this.assertEquals(16, this.quadratic.predict([4]), 'gt3');
        this.assertEquals(25, this.quadratic.predict([5]), 'gt4');
    },
    testLinearCompare: function() {
        for (var i = 1; i < 20; i++) {
            this.linear.train([i], i);
            this.quadratic.train([i], i);
        }
        for (var i = 1; i < 20; i++) {
            this.linear.test([i], i);
            this.quadratic.test([i], i);
        }
        this.assertEquals(0, this.linear.loss);
        this.assert(this.linear.loss < this.quadratic.loss);
    },
    testQuadraticCompare: function() {
        for (var i = 1; i < 20; i++) {
            this.linear.train([i], i*i);
            this.quadratic.train([i], i*i);
        }
        for (var i = 1; i < 20; i++) {
            this.linear.test([i], i*i);
            this.quadratic.test([i], i*i);
        }
        this.assertEquals(0, this.quadratic.loss);
        this.assert(this.quadratic.loss < this.linear.loss);
    },
    testConstant: function() {
        for (var i = 1; i < 5; i++) {
            this.constant.train([i], 1);
            this.linear.train([i], 1);
            this.quadratic.train([i], 1);
        }
        for (var i = 1; i < 5; i++) {
            this.constant.test([i], 1);
            this.linear.test([i], 1);
            this.quadratic.test([i], 1);
        }
        this.assertEquals(0, this.constant.loss);
        this.assertEquals(0, this.linear.loss);
        this.assertEquals(0, this.quadratic.loss);
    },
    testLogarithmic: function() {
        for (var i = 1; i < 10; i++) {
            this.linear.train([1 << i], i);
            this.logarithmic.train([1 << i], i);
        }
        for (var i = 1; i < 10; i++) {
            this.linear.test([1 << i], i);
            this.logarithmic.test([1 << i], i);
        }
        this.assertEquals(0, this.logarithmic.loss);
        this.assert(this.linear.loss > this.logarithmic.loss);
    },
    testLinearithmic: function() {
        for (var i = 1; i < 10; i++) {
            this.linear.train([1 << i], i * (1 << i));
            this.linearithmic.train([1 << i], i * (1 << i));
        }
        this.assertEquals(0, this.linearithmic.alpha());
        this.assertEquals(1, this.linearithmic.beta());
        for (var i = 1; i < 10; i++) {
            this.linear.test([1 << i], i * (1 << i));
            this.linearithmic.test([1 << i], i * (1 << i));
        }
        this.assertEquals(0, this.linearithmic.loss);
        this.assert(this.linear.loss > this.linearithmic.loss);
    }
});

TestCase.subclass('legind.tests.ProfilingTests',
'running', {
    setUp: function() {
        this.profiler = new legind.instrumentation.InstructionProfiler();
    }
},
'testing', {
    testHello: function() {
        var src = function() {
            function hello(n) {
                var sum = 0;
                for (var i = 1; i < n; i += 1) {
                    sum += Math.sqrt(i);
                }
                return sum;
            }
            hello(6000);
            hello(12000);
            hello(18000);
        }
        var report = this.profiler.rewriteAndProfile("(" + src + ")()");
        this.assertEquals(3, report.length, "more than two reports");
        this.assertEquals("hello", report[2].name);
        this.assertMatches(["n"], report[2].args);
        this.assertEquals(3, report[2].inv.length, "expect three invocations");
        this.assertEquals(6000, report[2].inv[0].args[0]);
        this.assertEquals(12000, report[2].inv[1].args[0]);
        this.assertEquals(18000, report[2].inv[2].args[0]);
    },
    testLinear: function() {
        var src = function() {
            function lin(n) {
                var sum = 0;
                for (var i = 1; i < n; i += 1) {
                    sum += Math.sqrt(i);
                }
                return sum;
            }
            for (var j = 4; j < 24; j++) {
                lin(j * 10000);
            }
        }
        var report = this.profiler.rewriteAndProfile("(" + src + ")()");
        this.assertEquals(3, report.length, "more than two reports");
        this.assertEquals("lin", report[2].name, 'name does not match');
        this.assertEquals(20, report[2].inv.length, "expect twenty invocations");
        this.assert(report[2].cmodels, 'no complexity models');
        var lin = report[2].cmodels[1];
        this.assert(lin instanceof legind.instrumentation.CLinear, 'no linear model');
        var qua = report[2].cmodels[2];
        this.assert(qua instanceof legind.instrumentation.CQuadratic, 'no quadratic model');
        this.assert(lin.loss < qua.loss, 'linear model fits better');
        this.assertEquals(0, lin.loss);
    },
    testQuadratic: function() {
        var src = function() {
            function lin(n) {
                var sum = 0;
                for (var i = 1; i < n; i += 1) {
                    for (var z = 1; z < i; z += 1) {
                        sum += Math.sqrt(z);
                    }
                }
                return sum;
            }
            for (var j = 4; j < 24; j++) {
                lin(j * 20);
            }
        }
        var report = this.profiler.rewriteAndProfile("(" + src + ")()");
        this.assertEquals(3, report.length, "more than two reports");
        this.assertEquals("lin", report[2].name, 'name does not match');
        this.assertEquals(20, report[2].inv.length, "expect twenty invocations");
        this.assert(report[2].cmodels, 'no complexity models');
        var lin = report[2].cmodels[1];
        this.assert(lin instanceof legind.instrumentation.CLinear, 'no linear model');
        var qua = report[2].cmodels[2];
        this.assert(qua instanceof legind.instrumentation.CQuadratic, 'no quadratic model');
        this.assert(lin.loss > qua.loss, 'quadratic model fits better');
    }
});

TestCase.subclass('legind.tests.VariableFlowTest',
'running', {
    setUp: function() {
        this.extractor = new legind.instrumentation.ExtractVars();
    }
},
'testing', {
    testIf: function() {
        var src = (function() {
            var i = 1;
            if (i < 2) {
                var j = 2;
            }
        }).toString();
        src = src.substring(14,src.length - 10);
        this.assertMatches([{name: "i", pos: 16, val: 1},
                            {name: "i", pos: 39, val: 1},
                            {name: "j", pos: 68, val: 2}
                            ],this.extractor.extract(src));
    },
    testWhile: function() {
        var src = (function() {
            var i = 1;
            while (i < 2) {
                i = 2;
            }
        }).toString();
        src = src.substring(14,src.length - 10);
        this.assertMatches([{name: "i", pos: 16, val: 1},
                            {name: "i", pos: 42, val: 1},
                            {name: "i", pos: 42, val: 2},
                            {name: "i", pos: 67, val: 1},
                            {name: "i", pos: 67, val: 2, mod: true}
                            ], this.extractor.extract(src));
    },
    testFor: function() {
        var src = (function() {
            var sum = 0;
            for (var i = 1; i < 3; i++) {
                sum += i;
            }
        }).toString();
        src = src.substring(14,src.length - 10);
        this.assertMatches([{name: "sum", pos: 16, val: 0},
                            {name: "i", pos: 46, val: 1},
                            {name: "i", pos: 53, val: 1},
                            {name: "i", pos: 53, val: 2},
                            {name: "i", pos: 53, val: 3},
                            {name: "i", pos: 60, val: 1},
                            {name: "i", pos: 60, val: 2, mod: true},
                            {name: "i", pos: 60, val: 2},
                            {name: "i", pos: 60, val: 3, mod: true},
                            {name: "sum", pos: 83, val: 0},
                            {name: "sum", pos: 83, val: 1, mod: true},
                            {name: "sum", pos: 83, val: 1},
                            {name: "sum", pos: 83, val: 3, mod: true},
                            {name: "i", pos: 90, val: 1},
                            {name: "i", pos: 90, val: 2}
                            ], this.extractor.extract(src));
    }
});

}) // end of module
