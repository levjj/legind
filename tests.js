module('legind.tests').requires('legind.instrumentation','lively.TestFramework').toRun(function() {

TestCase.subclass('legind.tests.CTests',
'running', {
    setUp: function() {
        this.constant = new legind.instrumentation.CConstant(0);
        this.linear = new legind.instrumentation.CLinear(0);
        this.quadratic = new legind.instrumentation.CQuadratic(0);
    }
},
'testing', {
    testConstant: function() {
        this.linear.fit([1], 1);
        this.linear.fit([2], 1);
        this.assertEquals(1, this.linear.alpha());
        this.assertEquals(0, this.linear.beta());
        this.assertEquals(1, this.linear.predict([3]));
        this.assertEquals(1, this.linear.predict([4]));
        this.assertEquals(0, this.linear.loss);
    },
    testSimpleLinear: function() {
        this.linear.fit([1], 1);
        this.linear.fit([2], 2);
        this.assertEquals(0, this.linear.alpha());
        this.assertEquals(1, this.linear.beta());
        this.assertEquals(3, this.linear.predict([3]));
        this.assertEquals(4, this.linear.predict([4]));
        this.assertEquals(0, this.linear.loss);
    },
    testLinear1: function() {
        this.linear.fit([1], 2);
        //this.assertEquals(0, this.linear.beta(), 'bb');
        //this.assertEquals(2, this.linear.alpha(),'a');
        //this.assertEquals(2, this.linear.predict([4]),'p');
        this.assertEquals(0, this.linear.loss, 'll');
        this.linear.fit([2], 4);
        this.assertEquals(2, this.linear.beta(),'b');
        this.assertEquals(0, this.linear.alpha(), 'aa');
        this.assertEquals(8, this.linear.predict([4]));
        this.assertEquals(0, this.linear.loss,'l');
        this.linear.fit([3], 3);
        this.assertEquals(0.5, this.linear.beta());
        this.assertEquals(2, this.linear.alpha());
        this.assertEquals(4, this.linear.predict([4]));
        this.assertEquals(3, this.linear.loss);
        this.linear.fit([6], 5);
        this.assertEquals(0.5, this.linear.beta(), 'dd');
        this.assertEquals(2, this.linear.alpha());
        this.assertEquals(5, this.linear.predict([7]));
        this.assertEquals(3, this.linear.loss);
        this.linear.fit([8], 0);
        this.assertEquals(9, this.linear.loss);
    },
    testSimpleQuadratic: function() {
        this.quadratic.fit([1], 1);
        this.quadratic.fit([2], 4);
        this.quadratic.fit([3], 9);
        this.assertEquals(0, this.quadratic.alpha(), 'gt1');
        this.assertEquals(1, this.quadratic.beta(), 'gt2');
        this.assertEquals(16, this.quadratic.predict([4]), 'gt3');
        this.assertEquals(25, this.quadratic.predict([5]), 'gt4');
    },
    testLinearCompare: function() {
        for (var i = 1; i < 20; i++) {
            this.linear.fit([i], i);
            this.quadratic.fit([i], i);
        }
        this.assert(this.linear.loss < this.quadratic.loss);
    },
    testQuadraticCompare: function() {
        for (var i = 1; i < 20; i++) {
            this.linear.fit([i], i*i);
            this.quadratic.fit([i], i*i);
        }
        this.assert(this.quadratic.loss < this.linear.loss);
    },
    testConstant: function() {
        for (var i = 1; i < 5; i++) {
            this.constant.fit([1], 1);
            this.linear.fit([1], 1);
            this.quadratic.fit([1], 1);
            this.assertEquals(0, this.constant.loss);
            this.assertEquals(0, this.linear.loss);
            this.assertEquals(0, this.quadratic.loss);
        }
    }
});

TestCase.subclass('legind.tests.ProfilingTests',
'running', {
    setUp: function() {
        this.profiler = new legind.instrumentation.Profiler(true);
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

}) // end of module
