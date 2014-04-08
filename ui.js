module('legind.ui').requires('legind.instrumentation','lively.morphic.Complete').requiresLib({url: Config.codeBase + 'legind/lib/jquery.jqplot.min.js',loadTest: function() { return !!jQuery.jqplot; }}).toRun(function() {

lively.morphic.HtmlWrapperMorph.subclass('legind.ui.JQPlot',
'initializing', {
    initialize: function($super) {
        $super(lively.pt(300,200));
        this.layout = {resizeWidth: true, resizeHeight: true};
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
            data.push([entry[idx], entry[entry.length - 1]]);
        });
        this.render(data);
    }
});

}) // end of module
