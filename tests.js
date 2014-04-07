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
        this.assert(report.hasOwnProperty("foo"));
        this.assertEquals(3, report["foo"].n);
    }
});

}) // end of module
