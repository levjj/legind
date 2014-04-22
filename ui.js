module('legind.ui').requires('legind.instrumentation','lively.morphic.Complete').requiresLib({url: Config.codeBase + 'legind/lib/jquery.jqplot.min.js',loadTest: function() { return !!jQuery.jqplot; }}).toRun(function() {

Object.subclass('legind.ui.ExampleSources', {
    simple: function() {
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

        for (var i = 1; i < 120; i++) {
            linear(1000 * i);
        }
        for (var i = 1; i < 120; i++) {
            quadratic(10 * i);
        }
    },
    quicksort: function() {
        function quicksort(arr) {
            if (arr.length == 0) return arr;
            var pivot = arr.pop();
            var left = [];
            var right = [];
            for (var i = 0; i < arr.length; i++) {
                if (arr[i] < pivot) {
                    left.push(arr[i]);
                } else {
                    right.push(arr[i]);
                }
            }
            var left = quicksort(left);
            var right = quicksort(right);
            return left.concat([pivot]).concat(right);
        }
        var n = 5000;
        for (var i = 0; i < n; i += 40) {
            var arr = [];
            for (var j = 0; j < i; j++) {
                arr.push(n.randomSmallerInteger());
            }
            quicksort(arr);
        }
    },
    richards: function() {
        var url = new URL(URL.codeBase + "legind/octane/richards.js")
        // make a simple synchronous request and print the content:
        var d = "function Benchmark() {};\nfunction BenchmarkSuite() {};\n\n";
        d += url.asWebResource().get().content;
        return d + "\n\nrunRichards();"
    },
    examples: function(txt) {
        function src(fn) {
            var src = fn.toString();
            src = src.substring(14, src.length - 5);
            src = src.split("\n").map(function(s) { return s.substring(8, s.length)}).join('\n');
            return src;
        }
        var self = this;
        var simpleExamples = ['simple', 'quicksort'].map(function(ex) {
            return [ex, function() { txt.textString = src(self[ex]); }];
        })
        var remoteExamples = ['richards'].map(function(ex) {
            return [ex, function() { txt.textString = self[ex](); }];
        })
        return simpleExamples.concat(remoteExamples);
    }
});

lively.BuildSpec('legind.ui.ProfileResult', {
    _Extent: lively.pt(510.9,565.0),
    _Position: lively.pt(535.9,10.0),
    __layered_droppingEnabled__: true,
    className: "lively.morphic.Morph",
    doNotSerialize: ["results"],
    droppingEnabled: true,
    layout: {
        borderSize: 0,
        resizeHeight: true,
        resizeWidth: true,
        spacing: 15,
        type: "lively.morphic.Layout.VerticalLayout"
    },
    name: "PResult",
    resultsText: {
        isMorphRef: true,
        path: "submorphs.0"
    },
    sourceModule: "lively.morphic.Core",
    submorphs: [{
        _Extent: lively.pt(510.9,32.5),
        _Fill: Color.rgb(255,255,255),
        _FontFamily: "monospace",
        _FontSize: 14,
        _HandStyle: "default",
        _InputAllowed: false,
        _MaxTextWidth: 120.695652,
        _MinTextWidth: 120.695652,
        _Padding: lively.rect(5,5,0,0),
        allowInput: false,
        className: "lively.morphic.Text",
        doNotSerialize: ["parseErrors"],
        droppingEnabled: false,
        emphasis: [[0,0,{
            fontWeight: "normal",
            italics: "normal"
        }]],
        fixedHeight: true,
        fixedWidth: true,
        grabbingEnabled: false,
        layout: {
            resizeHeight: false,
            resizeWidth: true
        },
        name: "PResultsText",
        sourceModule: "lively.morphic.TextCore",
        syntaxHighlightingWhileTyping: false,
        onMouseUp: function onMouseUp(evt) {
            if (evt.isLeftMouseButtonDown) {
                this.owner.showFunctionMenu();
            } else {
                $super(evt);
            }
        }
    }],
    clearResults: function clearResults() {
        this.currentEntry = null;
        this.resultsText.textString = "";
        while (1 < this.submorphs.length) {
            this.submorphs[1].remove();
        }
        if (this.results) {
            this.resultsText.textString = "Select function";
        }
    },
    createChart: function(pane, entry, idx) {
        var chart = new legind.ui.JQPlot();
        (function () {
            chart.plot(entry, idx, []);
        }).delay(0);
        pane.addMorph(chart);
    },
    createCModelButtons: function(pane, entry, idx) {
        var innerPane = new lively.morphic.Morph();
        innerPane.layout = {resizeWidth: true, resizeHeight: false};
        innerPane.setBorderWidth(0);
        innerPane.disableGrabbing();
        innerPane.setFill(null);
        innerPane.setLayouter(new lively.morphic.Layout.HorizontalLayout(innerPane));
        pane.addMorph(innerPane);
        entry.cmodels.select(function(cmodel) {
            return cmodel.argIdx === idx;
        }).reverse().each(function(cmodel) {
            var txt = new lively.morphic.Text(rect(0,0,65,25), cmodel.name());
            txt.applyStyle({allowInput: false});
            txt.setPadding(rect(5,5,0,0));
            txt.setFill(Color.web.gray.lighter(2));
            txt.setBorderWidth(0);
            txt.setBorderRadius(5);
            txt.setFontSize(11);
            txt.setFixedWidth(true);
            txt.setFixedHeight(true);
            txt.cmodel = cmodel;
            txt.addScript(function onMouseDown(evt) {
                if (!evt.isLeftMouseButtonDown) return $super(evt);
                if (this.activated) {
                    this.activated = false;
                    this.owner.owner.submorphs[0].removeModel(this.cmodel);
                } else {
                    this.activated = true;
                    this.owner.owner.submorphs[0].addModel(this.cmodel);
                }
                this.setFill((this.activated ? Color.blue : Color.web.gray).lighter(2));
            });
            innerPane.addMorph(txt)
        });
    },
    createArgumentTab: function createArgumentTab(container, entry, arg, idx) {
        var tab = container.addTabLabeled(arg);
        tab.setBorderWidth(2);
        tab.closeButton.remove();
        var pane = tab.getPane();
        pane.setBorderWidth(0);
        pane.setLayouter(new lively.morphic.Layout.VerticalScrollerLayout(pane));
        this.createChart(pane, entry, idx);
        this.createCModelButtons(pane, entry, idx);
    },
    onstore: function onstore() {
        this.results = null;
    },
    setResults: function setResults(results) {
        this.results = results;
        this.clearResults();
    },
    highlightSource: function highlightSource(pos) {
        var highlight = {backgroundColor: Color.web.salmon.lighter(2)};
        this.get("PSource").emphasizeAll({backgroundColor: null});
        this.get("PSource").emphasize(highlight, pos[0], pos[1]);
    },
    createSummaryTab: function createSummaryTab(container, entry) {
        var tab = container.addTabLabeled("Summary");
        tab.setBorderWidth(2);
        tab.closeButton.remove();
        var pane = tab.getPane();
        pane.setBorderWidth(0);
        pane.setLayouter(new lively.morphic.Layout.VerticalScrollerLayout(pane));
        var txt = new lively.morphic.Text(rect(0,0,100,100), "");
        txt.setFontSize(12);
        txt.layout = {resizeWidth: true};
        txt.setFill(null);
        txt.setBorderWidth(0);
        entry.args.each(function(arg,idx) {
            txt.appendRichText("\n" + arg + ":\n", {fontSize: 12,fontWeight: "bold"});
            entry.cmodels.select(function(cmodel) {
                return cmodel.argIdx === idx;
            }).each(function(cmodel) {
                txt.appendRichText(cmodel.describe(), {fontSize: 10});
            });
        });
        pane.addMorph(txt);
        return tab;
    },
    showArgumentsTabs: function showArgumentsTabs(entry) {
        var container = new lively.morphic.TabContainer();
        container.layout = {resizeWidth: true, resizeHeight: true, adjustForNewBounds: true};
        var summary = this.createSummaryTab(container, entry);
        entry.args.each(this.createArgumentTab.bind(this, container, entry));
        container.activateTab(summary);
        this.addMorph(container);
    },
    showEntry: function showEntry(entry) {
        if (this.currentEntry == entry) return;
        this.clearResults();
        this.currentEntry = entry;
        this.highlightSource(entry.pos);
        this.resultsText.textString = entry.name + " (" + entry.total + ")";
        this.showArgumentsTabs(entry);
        this.owner.applyLayout();
    },
    showFunctionMenu: function showFunctionMenu() {
        var that = this;
        var options = this.results.map(function(res) {
            var label = res.name + " (" + res.total + ")";
            var callback = function() { that.update(res.pos[1] - 1); };
            return [label, callback];
        });
        options.shift(); // remove first (wrapper) entry
        lively.morphic.Menu.openAtHand("Functions", options);
    },
    update: function update(pos) {
        if (!this.results) return this.clearResults();
        for (var j = this.results.length - 1; j != -1; j--) {
            var entry = this.results[j];
            if (entry.pos[0] < pos) {
                if (pos < entry.pos[1]) {
                    this.showEntry(entry);
                } else {
                    this.clearResults();
                }
                return;
            }
        }
        this.clearResults()
    }
});
    
lively.BuildSpec('legind.ui.Profiler', {
    _BorderColor: Color.rgb(95,95,95),
    _Extent: lively.pt(960,600.0),
    _Fill: Color.rgb(204,204,204),
    className: "lively.morphic.Morph",
    droppingEnabled: true,
    layout: {
        borderSize: 10,
        resizeHeight: true,
        resizeWidth: true,
        spacing: 15,
        type: "lively.morphic.Layout.HorizontalLayout"
    },
    name: "Profiler",
    sourceModule: "lively.morphic.Core",
    submorphs: [{
        _Extent: lively.pt(510.9,565.0),
        _Position: lively.pt(10.0,10.0),
        className: "lively.morphic.Morph",
        layout: {
            borderSize: 0,
            resizeHeight: true,
            resizeWidth: true,
            spacing: 5,
            type: "lively.morphic.Layout.VerticalLayout"
        },
        name: "PInterface",
        sourceModule: "lively.morphic.Core",
        submorphs: [{
            _BorderWidth: 1,
            _Extent: lively.pt(510.9,539.8),
            _Fill: Color.rgb(255,255,255),
            _FontFamily: "monospace",
            _Padding: lively.rect(5,5,0,0),
            _ClipMode: "auto",
            className: "lively.morphic.Text",
            doNotSerialize: ["parseErrors"],
            droppingEnabled: false,
            emphasis: [],
            fixedHeight: true,
            fixedWidth: true,
            grabbingEnabled: false,
            layout: {
                resizeHeight: true,
                resizeWidth: true
            },
            name: "PSource",
            sourceModule: "lively.morphic.TextCore",
            syntaxHighlightingWhileTyping: true,
            textString: "",
            onKeyDown: function onKeyDown(evt) {
                var res = $super(evt);
                var range = this.getSelectionRange();
                var results = this.get("PResult");
                if (results) results.update(range[0])
                return res;
            },
            morphMenuItems: function() {
                var ex = new legind.ui.ExampleSources();
                return ex.examples(this);
            },
            connectionRebuilder: function connectionRebuilder() {
                lively.bindings.connect(this, "textString", this, "highlightSyntaxDebounced", {});
            }
        },{
            _Extent: lively.pt(510.9,20.0),
            _Position: lively.pt(0.0,545.0),
            className: "lively.morphic.Morph",
            layout: {
                borderSize: 0,
                resizeWidth: true,
                spacing: 15,
                type: "lively.morphic.Layout.HorizontalLayout"
            },
            name: "Rectangle",
            sourceModule: "lively.morphic.Core",
            submorphs: [{
                _Extent: lively.pt(395.9,20.0),
                className: "lively.morphic.Morph",
                layout: {
                    resizeHeight: true,
                    resizeWidth: true
                },
                sourceModule: "lively.morphic.Core"
            },{
                _BorderColor: Color.rgb(189,190,192),
                _BorderRadius: 5,
                _BorderWidth: 1,
                _Extent: lively.pt(120.0,20.0),
                _Position: lively.pt(310.9,0.0),
                _StyleClassNames: ["Morph","Button"],
                className: "lively.morphic.Button",
                droppingEnabled: false,
                grabbingEnabled: false,
                isPressed: false,
                label: "Profile (time)",
                name: "PButton",
                sourceModule: "lively.morphic.Widgets",
                toggle: false,
                value: false,
                connectionRebuilder: function connectionRebuilder() {
                    lively.bindings.connect(this, "fire", this, "doAction", {});
                },
                doAction: function doAction() {
                    var profiler = new legind.instrumentation.Profiler();
                    var src = this.get("PSource").textString;
                    var results = profiler.rewriteAndProfile(src);
                    var resultsPane = lively.BuildSpec('legind.ui.ProfileResult').createMorph();
                    resultsPane.setResults(results);
                    var container = this.get("Profiler").submorphs[1];
                    var tab = container.addTabLabeled("Profiling Results");
                    tab.setBorderWidth(0);
                    tab.setExtent(tab.getExtent().withX(145));
                    container.activateTab(tab);
                    var pane = tab.getPane();
                    pane.setBorderWidth(0);
                    pane.setClipMode({x:"hidden",y:"auto"});
                    pane.setLayouter(new lively.morphic.Layout.VerticalScrollerLayout(pane));
                    pane.addMorph(resultsPane);
                }
            },{
                _BorderColor: Color.rgb(189,190,192),
                _BorderRadius: 5,
                _BorderWidth: 1,
                _Extent: lively.pt(120.0,20.0),
                _Position: lively.pt(410.9,0.0),
                _StyleClassNames: ["Morph","Button"],
                className: "lively.morphic.Button",
                droppingEnabled: false,
                grabbingEnabled: false,
                isPressed: false,
                label: "Profile (instr)",
                name: "PButton2",
                sourceModule: "lively.morphic.Widgets",
                toggle: false,
                value: false,
                connectionRebuilder: function connectionRebuilder() {
                    lively.bindings.connect(this, "fire", this, "doAction", {});
                },
                doAction: function doAction() {
                    var profiler = new legind.instrumentation.Profiler(true);
                    var src = this.get("PSource").textString;
                    var results = profiler.rewriteAndProfile(src);
                    var resultsPane = lively.BuildSpec('legind.ui.ProfileResult').createMorph();
                    resultsPane.setResults(results);
                    var container = this.get("Profiler").submorphs[1];
                    var tab = container.addTabLabeled("Profiling Results");
                    tab.setBorderWidth(0);
                    tab.setExtent(tab.getExtent().withX(145));
                    container.activateTab(tab);
                    var pane = tab.getPane();
                    pane.setBorderWidth(0);
                    pane.setClipMode({x:"hidden",y:"auto"});
                    pane.setLayouter(new lively.morphic.Layout.VerticalScrollerLayout(pane));
                    pane.addMorph(resultsPane);
                }
            }]
        }]
    },{
        _BorderColor: Color.rgb(204,204,204),
        _BorderWidth: 1,
        _Extent: lively.pt(462.5,580.0),
        _Position: lively.pt(487.5,10.0),
        className: "lively.morphic.TabContainer",
        layout: {
            resizeHeight: true,
            resizeWidth: true,
            adjustForNewBounds: true
        },
        sourceModule: "lively.morphic.TabMorphs",
        submorphs: [{
            _BorderColor: Color.rgb(204,204,204),
            _BorderWidth: 0,
            _Extent: lively.pt(462.5,30.0),
            _Fill: Color.rgb(204,204,204),
            className: "lively.morphic.TabBar",
            draggingEnabled: false,
            droppingEnabled: true,
            grabbingEnabled: false,
            layout: {
                adjustForNewBounds: true,
                resizeWidth: true
            },
            sourceModule: "lively.morphic.TabMorphs"
        }],
        tabBar: {
            isMorphRef: true,
            path: "submorphs.1.submorphs.0"
        },
        tabBarStrategy: "lively.morphic.TabStrategyTop",
        tabPaneExtent: lively.pt(462.5,550)
    }]
});

lively.morphic.HtmlWrapperMorph.subclass('legind.ui.JQPlot',
'initializing', {
    initialize: function($super) {
        $super(lively.pt(300,360));
        this.layout = {resizeWidth: true, resizeHeight: false};
        this.setFill(null);
        this.setBorderWidth(0);
        this.sid = "shape" + (new UUID()).id.substr(0,8);
        this.cmodels = [];
    }
},
'rendering', {
    prepareData: function() {
        var data = [this.data];
        var series = [{showLine:false, showMarker: true}];
        this.cmodels.each(function(model) {
            var modelData = [];
            for (var i = 0; i < this.maxX; i += this.maxX / 30) {
                var y = model._predict(i);
                if (y >= 0 && y < this.maxY) modelData.push([i, y]);
            }
            data.push(modelData);
            series.push({showLine:true, showMarker: false});
        }, this);
        return [data, series];
    },
    render: function() {
        var shape = jQuery(this.renderContext().shapeNode);
        shape.empty().attr('id', this.sid);
        var data = this.prepareData();
        jQuery.jqplot(this.sid, data[0], {
            axesDefaults: {
                labelRenderer: jQuery.jqplot.CanvasAxisLabelRenderer,
                tickRenderer: jQuery.jqplot.CanvasAxisTickRenderer
            },
            series: data[1],
            axes:{
                xaxis: { label: 'Input size', pad: 0 },
                yaxis: { pad: 0 }
            }
        });
    },
    plot: function(entry, idx) {
        this.data = [];
        this.maxX = 0;
        this.maxY = 0;
        for (var i = 0; i < entry.inv.length; i++) {
            var e = entry.inv[i];
            var x = e.args[idx];
            var y = e.time;
            if (x > this.maxX) this.maxX = x;
            if (y > this.maxY) this.maxY = y;
            this.data.push([x, y]);
        }
        this.render();
    },
    addModel: function(cmodel) {
        this.cmodels.push(cmodel);
        this.render();
    },
    removeModel: function(cmodel) {
        this.cmodels.remove(cmodel);
        this.render();
    }
});

lively.BuildSpec('legind.ui.ValueFlow', {
    _BorderColor: Color.rgb(95,94,95),
    _BorderWidth: 1,
    _Extent: lively.pt(949.4,538.0),
    _Fill: Color.rgb(209,209,210),
    _Position: lively.pt(36.0,70.0),
    __layered_droppingEnabled__: true,
    className: "lively.morphic.Box",
    droppingEnabled: true,
    layout: {
        borderSize: 10,
        extentWithoutPlaceholder: lively.pt(499.7,100.0),
        resizeHeight: true,
        resizeWidth: true,
        spacing: 15,
        type: "lively.morphic.Layout.HorizontalLayout"
    },
    name: "DataFlowDemo",
    sourceModule: "lively.morphic.Core",
    submorphs: [{
        _Extent: lively.pt(457.2,518.0),
        _Fill: Color.rgb(255,255,255),
        _FontFamily: "Droid Sans Mono",
        _FontSize: 14,
        _MaxTextWidth: 120.695652,
        _MinTextWidth: 120.695652,
        _Padding: lively.rect(5,5,0,0),
        _Position: lively.pt(10.0,10.0),
        _ClipMode: "auto",
        className: "lively.morphic.Text",
        droppingEnabled: false,
        emphasis: [[0,10,{
            fontWeight: "normal",
            italics: "normal"
        }]],
        fixedHeight: true,
        fixedWidth: true,
        grabbingEnabled: false,
        layout: {
            resizeHeight: true,
            resizeWidth: true
        },
        name: "LSource",
        sourceModule: "lively.morphic.TextCore",
        textString: "var a = 2;",
        onKeyUp: function onKeyUp() {
        this.owner.updateExample(this.textString);
    }
    },{
        _Extent: lively.pt(457.2,518.0),
        _Fill: Color.rgb(255,255,255),
        _FontFamily: "Droid Sans Mono",
        _FontSize: 14,
        _MaxTextWidth: 120.695652,
        _MinTextWidth: 120.695652,
        _Padding: lively.rect(5,5,0,0),
        _Position: lively.pt(482.2,10.0),
        _ClipMode: "auto",
        className: "lively.morphic.Text",
        droppingEnabled: false,
        textString: "var a = 2;",
        fixedHeight: true,
        fixedWidth: true,
        grabbingEnabled: false,
        layout: {
            resizeHeight: true,
            resizeWidth: true
        },
        name: "LFlow",
        sourceModule: "lively.morphic.TextCore"
    }],
    doNotSerialize: ['vars','tm'],
    vars: null,
    updateExample: function updateExample() {
        clearTimeout(this.tm);
        this.tm = setTimeout(this.updateExampleDebounced.bind(this), 100);
    },
    updateExampleDebounced: function updateExample() {
        var src = this.submorphs[0].textString;
        var extractor = new legind.instrumentation.ExtractVars();
        this.vars = extractor.extract(src);
        if (this.vars) {
            this.setBorderColor(Color.green);
        } else {
            this.setBorderColor(Color.red);
            return;
        }
        var flow = this.get("LFlow");
        flow.textString = "";
        var cur = 0;
        for (var i = 0; i < src.length;) {
            if (this.vars[cur] && i === this.vars[cur].pos) {
                flow.appendRichText(this.vars[cur].name, {fontSize: 14, color: Color.red});
                var str = this.vars[cur++].val;
                while (this.vars[cur] && i === this.vars[cur].pos) {
                    str += (this.vars[cur].mod ? "→" : ",") + this.vars[cur].val;
                    cur++;
                }
                flow.appendRichText("(" + str + ") ", {fontSize: 10, color: Color.blue});
                i += this.vars[cur - 1].name.length;
            } else {
                flow.appendRichText(src[i], {fontSize: 14, color: Color.black});
                i++;
            }
        }
    }
});

}) // end of module
