/// <reference path="jquery-1.11.1.min.js" />
/// <reference path="underscore.js" />
/// <reference path="date.js" />

if (typeof jQuery === 'undefined') { throw new Error('Bootstrap\'s JavaScript requires jQuery') }

// Definition of jChaart. The body of the functions and objects are going to be injected later.
var jChaart = {
	GraphStyles : {},
	aggregate : function(params) {},
	build : function(params) {}		
};

+function($) { 

	var GraphStyles = {
		colors: [
			"rgb(50, 200, 50)",
			"rgb(200, 50, 50)",
			"rgb(50, 50, 200)",
			"rgb(200, 50, 200)",
			"rgb(200, 200, 50)",
			"rgb(50, 200, 200)",
			"rgb(200, 200, 200)"
		],
		colorNames: {
			'blue': "rgb(50, 50, 200)",
			'green': "rgb(50, 200, 50)",
			'red': "rgb(200, 50, 50)",
			'yellow': "rgb(200, 200, 50)",
			'black': "rgb(50, 50, 50)",
			'lightblue': "rgb(150, 150, 200)",
			'lightgreen': "rgb(150, 200, 150)",
			'lightred': "rgb(200, 150, 150)",
			'lightyellow': "rgb(200, 200, 100)",
			'lightblack': "rgb(100, 100, 100)",
			'brown': "rgb(100, 50, 50)",
			'lightbrown': "rgb(150, 50, 50)"
		},
		pieChart : {
			series: {
				pie: {
					show: true,
					radius: 1,
					tilt: 0.5,
					label: {
						show: true,
						radius: 1,
						formatter: labelFormatter,
						background: {
							opacity: 0.6
						}
					},
					//combine: {
					//    color: '#999',
					//    threshold: 0.1
					//}
				}
			},
			legend: {
				show: false
			}
		},


		lineChart_filled: {
			series: {
				shadowSize: 4	// Drawing is faster without shadows                    
			},
			lines: { show: true, fill: true, lineWidth: 3 },
			grid: {
				hoverable: true,
				clickable: true
			},
			yaxis: {
				min: 0
			},
			xaxis: {
				mode: "categories",
				font: { size: 8, color: '#333' },
				rotateTicks: 90,
				rotateTicksFont: "6pt sans-serif"
			},
			legend: {
				show: true,
				position: "nw",
				font: { size: 8, color: '#333' }
			}
		},

		lineChart_nofill: {
			series: {
				shadowSize: 4	// Drawing is faster without shadows                    
			},
			lines: { show: true, fill: false, lineWidth: 3 },
			grid: {
				hoverable: true,
				clickable: true
			},
			yaxis: {
				min: 0
				
			},
			xaxis: {
				mode: "categories",
				font: { size: 8, color: '#333' },
				rotateTicks: 90
			},
			legend: {
				show: true,
				position: "nw"
			}
		},

		barChart: {
			series: {
				shadowSize: 2	// Drawing is faster without shadows                    
			},
			bars: { show: true, barWidth: 0.7, lineWidth: 2	, opacity: 1.0 },
			grid: {
				hoverable: true,
				clickable: true
			},
			yaxis: {
				min: 0
			},
			xaxis: {
				mode: "categories",
				font: { size: 8, color: '#333' }
			},
			legend: {
				show: false
				//position: "nw"
			}
		},
		
	};

	function labelFormatter(label, series) {
		return "<div style='font-size:8pt; text-align:center; padding:2px; color:black; overflow: hidden'>" + label + "<br/>" + series.data[0][1] + "</div>";
	}

	function aggregate(params) {
		var options = {
			labelIndex: 1, 
			valueIndex: 2,
			colorIndex: 3,
			linebreak: '\n',
			delimiter: '|',
			aggregator: function (colName, value, dataset, columns) {
				value = parseInt(value);
				if (isNaN(value))
					value = 0;

				if (dataset.data.length > 0) {
					dataset.data[0][1] += value;
				} else {
					dataset.data.push([colName, value]);
				}
			},
			data: [],
			datasets: {},
			filter: function(columns) { return true; }
		};
		$.extend(options, params);
		var dataset = {};
		colorIndex = 0;
		for (fi in options.data) {
			var text = options.data[fi];
			
			var lines = text.split(options.linebreak);

			for (var li in lines) {
				var line = $.trim(lines[li]);
				if (line.trim().length == 0)
					continue;

				var columns = line.split(options.delimiter);
				if (!options.filter(columns))
					continue;

				var colName = columns[options.labelIndex];
				var value = columns[options.valueIndex];
				var color = columns[options.colorIndex];

				var dataset = _.find(options.datasets, function (item) { return item.label == colName; });
				if (dataset) {

				} else {
					var newset = {
						label: colName,
						data: [],
						color: GraphStyles.colorNames[color.toLowerCase()] || color || GraphStyles.colors[colorIndex++],
						bars: {
							fill: true,
							lineWidth: 1,
							fillColor: GraphStyles.colorNames[color.toLowerCase()] || color || GraphStyles.colors[colorIndex++]
						},
					};
					options.datasets.push(newset);
					dataset = newset;
				}

				options.aggregator(colName, value, dataset, columns);
			}
		}
		params.datasets = options.datasets;
	}


	function makeGraphsFromFiles(params) {
		loadFiles(params, function(options){
			processFiles(options);
			makeGraphFromDataset(options);
			if (params.onComplete)
				params.onComplete();
		});        
	}

	function aggregateFromFiles(params) {
		loadFiles(params, function (options) {
			aggregate(options);
			makeGraphFromDataset(options);
		});
	}

	function loadFiles(params, completed) {

		var defaults = {
			id: 'body',
			urls:[], 
		};
		var options = $.extend(defaults, params);

		// current date time stamp after each url to bypass cache
		var promises = []; 
		$.each([].concat(options.urls), function (index, url) {
			if (url.indexOf('?') > 0) url += "&";
			else url += "?";
			url += (new Date().getTime());
			
			promises.push($.ajax({
				url: url,
				dataType: 'text'
			}));
		})    
		
		$.when.apply($, promises).then(function () {
			var jqxhrs = _.isObject(arguments[0]) ? arguments : [arguments[2]];
			var texts = [];
			var lastModified = Date.parse("1/1/1900");

			$.each(jqxhrs, function (key, jqXHR) {
				content = _.isArray(jqXHR) ? jqXHR[0] : jqXHR.responseText;
				if (jqXHR.getResponseHeader) {
					var newLastModified = Date.parse(jqXHR.getResponseHeader('Last-Modified'));
					if (newLastModified && lastModified.getTime() < newLastModified.getTime())
						lastModified = newLastModified;
				}
				texts.push(content);
			});

			if (lastModified.getTime() > 0) {
				var dateText = lastModified.toString("dd MMM HH:mm");
				var parent = $(params.id).parents('.panel').find('.panel-heading')
				parent.find('.panel-time').remove();
				$("<span class='panel-time'>" + dateText + "</span>")
					.appendTo(parent)
					.hover(function (e) {
						var x = e.pageX - this.offsetLeft;
						var y = e.pageY - this.offsetTop;

						$("#tooltip").html(lastModified.toString())
							.css({ top: y, left: x + 100 })
							.fadeIn(200);
					});
			}
			options.data = texts;
			options.datasets = [];
			completed(options);
		});
	}

	function makeGraphFromDataset(params) {
		var defaults = {
			datasets: [],
			id: '#Graph',
			style: GraphStyles.lineChart_nofill,
			ymax: -1
		};
		var options = _.extend(defaults, params)

		style = _.clone(options.style);

		if (_.isUndefined(style.xaxis))
			style.xaxis = {};
		style.xaxis.ticks = getTicks(options.datasets);
		if (options.ymax > 0)
			style.yaxis.max = options.ymax;
		else if(style.yaxis)
			style.yaxis.max = null;

		$.plot(options.id, options.datasets, style);
		$(options.id).bind("plothover", function (event, pos, item) {
			if (item) {
					var tick = item.series.xaxis.ticks[item.datapoint[0]]
					|| item.series.xaxis.rotatedTicks[item.datapoint[0]];
				var x = tick.label,
					y = item.datapoint[1];

				$("#tooltip").html(item.series.label + " = (" + x + ", " + y + ")")
					.css({ top: item.pageY + 5, left: item.pageX + 5 })
					.fadeIn(200);
			} else {
				$("#tooltip").hide();
			}

		});
	}

	function getTicks(datasets) {
		var ticks = [];
		$.each(datasets, function (key, set) {
			for (var i = 0; i < set.data.length; i++) {
				var data = set.data[i];

				var xaxis = data[0];

				if (_.find(ticks, function (tick) { return tick[1] == xaxis; })) {
					
				} else {
					ticks.push([ticks.length, xaxis]);
				}
			}
		});
		//ticks = _.sortBy(ticks, function (item) { return item[1] });
		for (var i = 0; i < ticks.length; i++)
			ticks[i][0] = i;

		return ticks;
	}


	function processFiles(params) {
		var defaults = {
			data: [], 
			seriesNames: [],
			getXAxis: function (columns, labelIndex) { return columns[labelIndex]; },
			getYAxis: function(columns, valueIndex) { return columns[valueIndex]; },
			getSeriesName: function (fileIndex, columns) { return  options.seriesNames[fileIndex] || columns[options.labelIndex]; },
			getColor: function (fileIndex, columns, color) { return color; },
			filter: function(columns) { return true; },
			onNewDataset: function(set) { },
			xaxisIndex: 0,
			labelIndex: 1,
			valueIndex: 2,
			colorIndex: 3,
			color: null,
			datasets: [], 
			linebreak: '\n', 
			delimiter: '|',
			maxlines: 1000,
			maxXAxis: 24
		};
		var options = _.extend(defaults, params)

		var allxAxis = [];
		var autoColorIndex = 0;
		for (fi in options.data) {
			var text = options.data[fi];
			
			var lines = text.split(options.linebreak);
			var items = [];
			for (index in _.last(lines, options.maxlines)) {
				var line = lines[index];
				var columns = line.split(options.delimiter);
				if (columns.length <= options.valueIndex)
					continue;
				if (!options.filter(columns))
					continue;

				var xaxis = options.getXAxis(columns, options.xaxisIndex);
				var yaxis = options.getYAxis(columns, options.valueIndex);
				if (isNaN(yaxis))
					yaxis = 0;

				var color;
				if (options.color)
					color = options.color; 
				else
					color = options.colorIndex < columns.length ? $.trim(columns[options.colorIndex]) : null;
					
				// keep a track of all unique x-axis values found in the data
				if (!_.contains(allxAxis, xaxis)) {
					//if (allxAxis.length > options.maxXAxis)
					//    break;
					allxAxis.push(xaxis);
				}

				var seriesName = options.getSeriesName(fi, columns);

				var series = _.find(options.datasets, function (item) { return item.label == seriesName; });
				if (_.isUndefined(series)) {
					var revisedColor = options.getColor(fi, columns, color || GraphStyles.colors[autoColorIndex++]) || GraphStyles.colors[autoColorIndex++];
					series = {
						label: seriesName,
						data: [],
						color: revisedColor ? (GraphStyles.colorNames[revisedColor.toLowerCase()] || revisedColor.toLowerCase()) : null,
					};
					options.datasets.push(series);
					options.onNewDataset(series, fi, columns);
				}

				// Ensure there's only one value per xaxis
				var existing = _.find(series.data, function (i) { return i[0] == xaxis; });
				if (existing) {
					if (existing[1] < yaxis)
						existing[1] = yaxis; // overwrite existing value for the same axis if it is greater
				} else {
					series.data.push([xaxis, yaxis]);
				}
			}
		}

		// We will keep only last 20 xaxis
		allxAxis = _.sortBy(allxAxis, function (item) { return item; });
		allxAxis = _.last(allxAxis, options.maxXAxis);

		// if any series has xaxis outside the allxaxis last 20
		// items, do not keep them. 
		$.each(options.datasets, function (key, set) {
			var newdata = [];
			_.each(set.data, function (item) {
				if (_.contains(allxAxis, item[0])) {
					newdata.push(item);
				}
			});
			
			set.data = _.sortBy(newdata, function (item) { return item[0]; });
		});

		// Find missing axis values from each label and put NaN for them.
		// otherwise the line chart gets botched.
		$.each(options.datasets, function (label, set) {
			var axisCounter = 0;
			$.each(allxAxis, function (index, axis) {
				if (_.find(set.data, function (item) { return item[0] == axis })) {

				}
				else {
					if (_.find(set.data, function (item) { return item[0] > axis; })) {
						set.data.push([axis, 0]);
					}
				} 
			});

			set.data = _.sortBy(set.data, function (item) { return item[0]; });
		});

		params.datasets = options.datasets;
	}

	$(document).ready(function () {
		$("<div id='tooltip'></div>").css({
			position: "absolute",
			display: "none",
			border: "1px solid #fdd",
			padding: "2px",
			"background-color": "#fee",
			opacity: 0.80
		}).appendTo("body");

	});

	
	jChaart.GraphStyles = GraphStyles;
	jChaart.aggregate = aggregateFromFiles;
	jChaart.build = makeGraphsFromFiles;
	
}(jQuery);

