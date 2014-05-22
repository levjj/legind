function linear(n) {
    var sum = 0;
    for (var i = 1; i < n; i += 1) {
        sum += Math.sqrt(i);
    }
    return sum;
}

function quadratic(n) {
    var sum = 0;
    for (var i = 1; i < n; i += 1) {
        for (var j = 1; j < i; j += 1) {
            sum += Math.sqrt(j);
        }
    }
    return sum;
}

function Foo() {
    this.length = 0;
}

Foo.prototype.push = function() {
    this.length++;
}

Foo.prototype.work = function() {
    for (var i = 0; i < this.length; i++) {
        Math.pow(Math.sqrt(i), Math.sqrt(i));
    }
}

module.exports = {linear: linear, quadratic: quadratic, Foo: Foo};
