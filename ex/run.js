var lib = require('./lib.rewritten');

function runTests() {
    for (var i = 1; i < 120; i++) {
        lib.linear(1000 * i);
        lib.quadratic(10 * i);
        var f = new lib.Foo();
        for (var j = 1; j < 100; j++) {
            f.push();
            f.work();
        }
    }

}

global.legind._profile(function() {
    runTests();
});
