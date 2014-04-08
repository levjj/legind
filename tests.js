module('legind.tests').requires('legind.instrumentation','lively.TestFramework').toRun(function() {

TestCase.subclass('legind.tests.ProfilingTests',
'running', {
    setUp: function() {
        this.profiler = new legind.instrumentation.Profiler();
    }
},
'testing', {
    testHello: function() {
        var src = function() {
            function hello(n) {
                for (var i = 1; i < n; i += i * 1.01) {}
            }
            hello(10);
            hello(100);
            hello(1000);
        }
        var report = this.profiler.rewriteAndProfile("(" + src + ")()");
        this.assertEquals(3, report.length, "more than two reports");
        this.assertEquals("hello", report[2].name);
        this.assertMatches(["n"], report[2].args);
        this.assertEquals(3, report[2].inv.length, "expect three invocations");
        this.assertEquals(10, report[2].inv[0][0]);
        this.assertEquals(100, report[2].inv[1][0]);
        this.assertEquals(1000, report[2].inv[2][0]);
    }
});

}) // end of module
