module('legind.ui').requires('legind.instrumentation','lively.morphic.Complete').requiresLib({url: Config.codeBase + 'legind/lib/jquery.jqplot.min.js',loadTest: function() { return !!jQuery.jqplot; }}).toRun(function() {
    
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
    createArgumentTab: function createArgumentTab(container, invocations, arg, idx) {
        var tab = container.addTabLabeled(arg);
        tab.setBorderWidth(2);
        tab.closeButton.remove();
        var pane = tab.getPane();
        pane.setBorderWidth(0);
        pane.setLayouter(new lively.morphic.Layout.VerticalScrollerLayout(pane));
        var chart = new legind.ui.JQPlot();
        (function () {
            chart.plot(invocations, idx);
        }).delay(0);
        pane.addMorph(chart);
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
        var str = "Total time = " + entry.total + "ms";
        var txt = new lively.morphic.Text(rect(0,0,100,100), str);
        txt.layout = {resizeWidth: true};
        txt.setFill(null);
        txt.setBorderWidth(0);
        pane.addMorph(txt);
        return tab;
    },
    showArgumentsTabs: function showArgumentsTabs(entry) {
        var container = new lively.morphic.TabContainer();
        container.layout = {resizeWidth: true, resizeHeight: true, adjustForNewBounds: true};
        var summary = this.createSummaryTab(container, entry);
        entry.args.each(this.createArgumentTab.bind(this, container, entry.inv));
        container.activateTab(summary);
        this.addMorph(container);
    },
    showEntry: function showEntry(entry) {
        if (this.currentEntry == entry) return;
        this.clearResults();
        this.currentEntry = entry;
        this.highlightSource(entry.pos);
        this.resultsText.textString = entry.name + " (" + entry.total + "ms)";
        this.showArgumentsTabs(entry);
        this.owner.applyLayout();
    },
    showFunctionMenu: function showFunctionMenu() {
        var that = this;
        var options = this.results.map(function(res) {
            var label = res.name + " (" + res.total + "ms)";
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
            textString: "function linear(n) {\n\
    var sum = 0;\n\
    for (var i = 1; i < n; i += 1) {\n\
        sum += Math.sqrt(i);\n\
    }\n\
    return sum;\n\
}\n\
\n\
function quadratic(n) {\n\
    var sum = 0;\n\
    for (var i = 1; i < n; i += 1) {\n\
        for (var j = 1; j < i; j += 1) {\n\
            sum += Math.sqrt(j);\n\
        }\n\
    }\n\
    return sum;\n\
}\n\
\n\
for (var i = 1; i < 120; i++) {\n\
    linear(1000 * i);\n\
}\n\
for (var i = 1; i < 120; i++) {\n\
    quadratic(10 * i);\n\
}",
            onKeyDown: function onKeyDown(evt) {
                var res = $super(evt);
                var range = this.getSelectionRange();
                var results = this.get("PResult");
                if (results) results.update(range[0])
                return res;
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
                _Extent: lively.pt(100.0,20.0),
                _Position: lively.pt(410.9,0.0),
                _StyleClassNames: ["Morph","Button"],
                className: "lively.morphic.Button",
                droppingEnabled: false,
                grabbingEnabled: false,
                isPressed: false,
                label: "Profile",
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
                    var pane = container.submorphs[1];
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
        $super(lively.pt(300,400));
        this.layout = {resizeWidth: true, resizeHeight: false};
        this.setFill(null);
        this.setBorderWidth(0);
    }
},
'rendering', {
    render: function(data) {
        var id = "shape" + (new UUID()).id.substr(0,8);
        this.renderContext().shapeNode.setAttribute('id', id);
        jQuery.jqplot(id, [data], {
            axesDefaults: {
                labelRenderer: jQuery.jqplot.CanvasAxisLabelRenderer,
                tickRenderer: jQuery.jqplot.CanvasAxisTickRenderer
            },
            series:[{showLine:false}],
            axes:{
                xaxis: { label: 'Input size', pad: 0 },
                yaxis: { label: 'Time in ms', pad: 0 }
            }
        });
    },
    plot: function(report, idx) {
        var data = [];
        report.each(function(entry) {
            data.push([entry.args[idx], entry.time]);
        });
        this.render(data);
    }
});

}) // end of module
