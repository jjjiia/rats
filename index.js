
var config = {
	zoom: .95,
	timeline: {
		timer: null,
		width: 1100,
		barWidth: 6,
		xScale: d3.scale.linear().domain([1880,2014]).range([20, 950])
	}
}





var global = {
	data: null,
	nycPaths: null,
	worldPaths: null,
	usMapWidth:650,
	usMapHeight:650
	
}

//put currentSelection in to global
var currentSelection = {
	zipcode: null,
	jurisdiction: null
}

var utils = {
	range: function(start, end) {
		var data = []

		for (var i = start; i < end; i++) {
			data.push(i)
		}

		return data
	}
}

var table = {
	group: function(rows, fields) {
		var view = {}
		var pointer = null
		for(var i in rows) {
			var row = rows[i]
			pointer = view
			for(var j = 0; j < fields.length; j++) {
				var field = fields[j]
				if(!pointer[row[field]]) {
					if(j == fields.length - 1) {
						pointer[row[field]] = []
					} else {
						pointer[row[field]] = {}
					}
				}
				pointer = pointer[row[field]]
			}
			pointer.push(row)
		}
		return view
	},

	maxCount: function(view) {
		var largestName = null
		var largestCount = null
		for(var i in view) {
			var list = view[i]
			if(!largestName) {
				largestName = i
				largestCount = list.length
			} else {
				if(list.length > largestCount) {
					largestName = i
					largestCount = list.length
				}
			}
		}
		return {
			name: largestName,
			count: largestCount
		}
	},
	filter: function(view, callback) {
		var data = []
		for(var i in view) {
			var list = view[i]
			if(callback(list, i)) {
				data = data.concat(list)
			}
		}
		return data
	}
}


function renderMap(data, selector,width,height) {
	var projection = d3.geo.mercator()
					.center([-74.25,40.9])
					.translate([0, 0])
					.scale(65000);
	var path = d3.geo.path().projection(projection);
	
	var svg = d3.select(selector).append("svg")
		.attr('height', global.usMapWidth)
		.attr('width',global.usMapHeight);
	var map = svg.selectAll(".map")
		.data(data.features)
		.enter().append("path")
		.attr("d", path)
		.attr("class", "map-item")
		.attr("cursor", "pointer")
		.attr("stroke-opacity", 1)
				.attr("stroke", "#000")
				.attr("fill-opacity", 1)
				.attr("fill", "#000")
				.on("click", function(d) {
				});
				
	
	return map
}

function initNycMap(paths, data) {
	var map = renderMap(paths, "#svg-nyc-map", global.usMapWidth,global.usMapHeight)
	renderNycMap(data)
}

function renderNycMap(data) {
	var map = d3.select("#svg-nyc-map").selectAll(".map-item")
	var format = d3.time.format("%x");
	var ratsByDate = table.group(data, ["Date"])
	var projection = d3.geo.mercator()
					.center([-74.25,40.9])
					.translate([0, 0])
					.scale(65000);
	
	d3.select("#svg-nyc-map svg").selectAll("circle")
	.data(data)
	.enter()
	.append("circle")
	.attr("cx", function(d){
		var projectedX = projection([parseFloat(d.Longitude),parseFloat(d.Latitude)])[0];
		return projectedX
	})
	.attr("cy",function(d){
		var projectedY = projection([parseFloat(d.Longitude),parseFloat(d.Latitude)])[1];
		return projectedY
	})
	.attr("r",.2)
	.attr("fill", "#fff")

	return map
}

//determine daterange for map selection
function dateRangeForSelection(selectedData){
	var selectedDataByTime = table.group(selectedData, ["birthyear"])
	
	var toSort = []
	for(var items in selectedDataByTime){
		toSort.push([items])
	}
	var output = toSort.sort(function(a, b) {return a[0] - b[0]})
	return [parseInt(output[0]), parseInt(output[output.length-1])]
}

//reset all button
d3.select("#resetAll")
.on("click", function(){
	resetAll()})

function resetAll(){
	currentSelection.jurisdiction = null;
	currentSelection.zipcode = null;
	updateSliderRange(1880, 2014);
	updateMaps();
}

// TODO: Rename these functions so they are in some sort of "timeline" namespace

function leftHandlePosition() {
	return parseFloat(d3.select("#svg-timeline").select(".handle-left").attr("x"))
}

function rightHandlePosition() {
	return parseFloat(d3.select("#svg-timeline").select(".handle-right").attr("x"))
}

function updateSliderRange(startYear, endYear) {
	var xScale = config.timeline.xScale

	var startX = xScale(startYear)
	var endX = xScale(endYear)

	var slider = d3.select("#svg-timeline .slider")
	slider.attr("width", endX - startX)
	slider.attr("x", startX)

	updateHandleLocations()
}

function updateSliderLocation() {
	var startX = leftHandlePosition()
	var endX = rightHandlePosition()

	var slider = d3.select("#svg-timeline .slider")
	slider.attr("width", endX - startX)
	slider.attr("x", startX)
}

function updateHandleLocations() {
	var leftHandle = d3.select("#svg-timeline .handle-left")
	var rightHandle = d3.select("#svg-timeline .handle-right")

	var slider = d3.select("#svg-timeline .slider")
	var startX = parseFloat(slider.attr("x")) - config.timeline.barWidth
	var endX = parseFloat(slider.attr("x")) + parseFloat(slider.attr("width"))

	leftHandle.attr("x", startX)
	rightHandle.attr("x", endX)
}

function updateMaps() {
	d3.selectAll(".d3-tip-nyc").remove()
	d3.selectAll(".d3-tip-world").remove()
	d3.selectAll(".d3-tip").remove()

	d3.selectAll(".slider").attr("opacity", .1)
	d3.selectAll(".handle-left").attr("opacity", .3)
	d3.selectAll(".handle-right").attr("opacity", .3)

	var xScale = config.timeline.xScale

	var startYear = Math.floor(xScale.invert(leftHandlePosition()))
	var endYear = Math.floor(xScale.invert(rightHandlePosition()))
	
	var slider = d3.select("#svg-timeline .slider")
	slider.property("timeline-year-start", startYear)
	slider.property("timeline-year-end", endYear)

	var data = global.data
	
	if(currentSelection.zipcode != null){
		data = table.filter(table.group(data, ["zipcode"]), function(list, zipcode) {
			return (zipcode == currentSelection.zipcode)
		})
	}
	
	if(currentSelection.jurisdiction != null){
		data = table.filter(table.group(data, ["jurisdiction"]), function(list, jurisdiction) {
			return (jurisdiction == currentSelection.jurisdiction)
		})
	}
	
	
	var filteredData = table.filter(table.group(data, ["birthyear"]), function(list, year) {
		year = parseFloat(year)
		return (year >= startYear && year <= endYear)
	})
	
	if(currentSelection.zipcode != null){
		
	} else if (currentSelection.jurisdiction != null){
	}else{
		renderNycMap(filteredData)
		
	}
	
	formatCompanyList(filteredData)
	
	d3.select("#currentSelection").html(formatDisplayText(filteredData))
	
	d3.select("#companyList").html(formatCompanyList(filteredData))
	
	d3.select("#seeCompanyList").html("... See Companies")
	
	d3.select("#svg-timeline .selected-year").classed("selected-year", false)
	renderTimeline(data)
	d3.select("#specialCountries").html(formatSpecialCountries(filteredData))
}


function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}


function initTimeline(data) {
	
	var height = 100
	var width = 950
	var marginH = 20
	var marginW = 4
	
	var timeline = d3.select("#svg-timeline").append("svg");

	// Render the Axes for the timeline

	var xScale = config.timeline.xScale
	var yScale = d3.scale.log().domain([1, width+20]).range([height-marginH,marginW]);

	var xAxis = d3.svg.axis().scale(xScale).tickSize(1).ticks(16).tickFormat(d3.format("d"))
	var yAxis = d3.svg.axis().scale(yScale).tickSize(1).orient("right").tickFormat(d3.format("d")).tickValues([1, 10, 100,1000]);

	timeline.append("g")
		.attr("transform", "translate(0," + (height-marginH) + ")")
		.call(xAxis);

	timeline.append("g")
		.attr("transform", "translate(" + (width) + ",0)")
		.call(yAxis);

	// Add the sliders

	var barwidth = config.timeline.barWidth

	var slider = timeline.append("rect")
		.attr("class", "slider")
		.attr("x", 20)
		.attr("y", 0)
		.attr("width", width-20)
		.attr("height", height-marginH)
		.attr("fill", "#E1883B")
		.attr("opacity", 0.15)
		.call(d3.behavior.drag()
			.on("dragstart", function() {
				d3.event.sourceEvent.stopPropagation();
				d3.select(this).property("drag-offset-x", d3.event.sourceEvent.x - this.getBoundingClientRect().left)
			})
			.on("drag", function(d, e) {
				timelineControlStop()

				var x = d3.event.x - d3.select(this).property("drag-offset-x")
				var w = parseFloat(d3.select(this).attr("width"))

				if(x <= 20) {
					x = 20
				}

				if((x + w) >= width) {
					x = width - w
				}

				d3.select(this).attr("x", x)
				updateHandleLocations()
				updateMaps()
			})
		)

	var leftHandle = timeline.append("rect")
		.attr("class", "handle-left")
		.attr("x", 20)
		.attr("y", 0)
		.attr("width", barwidth)
		.attr("height", height-marginH)
		.attr("fill", "#E1883B")
		.attr("opacity", 0.3)
		.call(d3.behavior.drag()
			.on("dragstart", function() {
				d3.event.sourceEvent.stopPropagation();
			})
			.on("drag", function() {
				timelineControlStop()

				var x = d3.event.x - (d3.select(this).attr("width") / 2)
				
				if(x <= 20) {
					x = 20
				}

				if(x >= rightHandlePosition()) {
					x = rightHandlePosition()
				}
				

				d3.select(this).attr("x", x)
				updateSliderLocation()
				updateMaps()
			})
		)

	var rightHandle = timeline.append("rect")
		.attr("class", "handle-right")
		.attr("x", width)
		.attr("y", 0)
		.attr("width", barwidth)
		.attr("height", height-marginH)
		.attr("fill", "#E1883B")
		.attr("opacity", 0.3)
		.call(d3.behavior.drag()
			.on("dragstart", function() {
				d3.event.sourceEvent.stopPropagation();
			})
			.on("drag", function() {
				timelineControlStop()

				var x = d3.event.x - (d3.select(this).attr("width") / 2)

				if(x <= leftHandlePosition()) {
					x = leftHandlePosition()
				}
				if(x >= width) {
					x = width
				}
				d3.select(this).attr("x", x)
				updateSliderLocation()
				updateMaps()
			})
		)
	renderTimeline(data)
}

function renderTimeline(data) {
	var height = 100
	var width = 950
	var yScaleFlipped = d3.scale.linear().domain([1,100]).range([4, height-20]);

	// Render the actual bars
	var incidentsByDate = table.group(data, ["Date"])
	console.log(incidentsByDate)
	var timeline = d3.select("#svg-timeline").selectAll(".timeline-item")
	var format = d3.time.format("%x");
	var dateScale = d3.time.scale().domain([format.parse("1/1/2010"),format.parse("1/1/2013")]).range([0,width])
	
	// Add all of the histogram vertical bars
	timeline.selectAll("rect")
		.data(data)
		.enter()
		.append("rect")
		.attr("class", "timeline-item")
	    .attr("x", function(d) {
			console.log(d)
			return dateScale(format.parse(d.Date))
		})
	
	
	timeline
	.attr("x", 20)
	    .attr("y", function(d) {
			var a = incidentsByDate[d]
			console.log(a)
			if(!a) {
				return 0
			} else {
				return height - 20 - yScaleFlipped(a.length)
			}
		})
		.attr("width", 5)
		.attr("fill", function(d) {
			var startYear = d3.select("#svg-timeline .slider").property("timeline-year-start")
			var endYear = d3.select("#svg-timeline .slider").property("timeline-year-end")
			if(d <= startYear || d >= endYear) {
				return "#AAA"
			} else {
				return "#eee"
			}
		})
		.attr("height", function(d) {
			var a = companiesByYear[d]
			if(!a) {
				return 0;
			} else {
				return yScaleFlipped(a.length)
			}
		})
		.on("click", function(d) {
			d3.select("#svg-timeline .selected-year").classed("selected-year", false)
			d3.select(this).classed("selected-year", true)
			
			if(d+10 > 2013){
				var yearsafter = 2014-d
				var yearsbefore = 20-yearsafter
				updateSliderRange(d-yearsbefore,d+yearsafter);
			}else{
				updateSliderRange(d-9,d+10);				
			}
			updateSliderLocation();
			updateMaps();			
		})
}

function timelineControlStop() {
	$("#timeline-controls .play").show()
	$("#timeline-controls .stop").hide()

	clearInterval(config.timeline.timer)
}

function dataDidLoad(error, nycPaths, data) {
	global.nycPaths = nycPaths
	global.data = data	
	var nycMap = initNycMap(nycPaths, data)
	var timeline = initTimeline(data)
	d3.selectAll(".slider").attr("opacity", 0)
	d3.selectAll(".handle-left").attr("opacity", 0)
	d3.selectAll(".handle-right").attr("opacity", 0)
	d3.select("#svg-timeline").selectAll(".timeline-item").attr("fill", "#aaa")
	
	$("#timeline-controls .play").click(function() {
		$("#timeline-controls .play").hide()
		$("#timeline-controls .stop").show()

//		var direction = 1
		var sliderRange = 20
		var year = Math.floor(config.timeline.xScale.invert(leftHandlePosition()))
		config.timeline.timer = setInterval(function() {
			updateSliderRange(year, year + sliderRange)
			updateMaps()
			if(year+sliderRange >= 2014){
				timelineControlStop()
			}
			year = year + 1
		}, 100)
	})

	$("#timeline-controls .stop").click(timelineControlStop)
}

$(function() {
	// Window has loaded

	queue()
		.defer(d3.json, cityGeojson)
		.defer(d3.csv, csv)
		.await(dataDidLoad);
})



//ESSAY BOX DO NOT CHANGE
var essayBoxShown = false;
 $('#showMore').click(function(e){
     e.preventDefault();
     essayBoxShown = !essayBoxShown;
     if (essayBoxShown) {
         $('#essayBox').css('display', 'block');
         $('#essayBox').animate({'opacity':1.0}, 500);
         $(this).text(' ... view map ');
     } else {
         closeEssayBox();
         $(this).text(' ... more ');
     }
   })
   $('#essayBox-close').click(function(){
//	   console.log("close")
     closeEssayBox();
     $('#showMore').text(' ... more ');
   });


  function closeEssayBox(){
   $('#essayBox').animate({'opacity':0.0}, 500, function () {
     $('#essayBox').css('display', 'none');
   })
   essayBoxShown = false;
 }

 //ESSAY box 2
 var essayBoxShown2 = false;
  $('#seeCompanyList').click(function(e){
      e.preventDefault();
      essayBoxShown2 = !essayBoxShown2;
      if (essayBoxShown2) {
          $('#essayBox2').css('display', 'block');
          $('#essayBox2').animate({'opacity':1.0}, 500);
          $(this).text('... Hide Companies ');
      } else {
          closeEssayBox2();
          $(this).text('... See Companies ');
      }
    })
    $('#essayBox-close2').click(function(){
 //	   console.log("close")
      closeEssayBox2();
      $('#seeCompanyList').text('... See Companies ');
    });


   function closeEssayBox2(){
    $('#essayBox2').animate({'opacity':0.0}, 500, function () {
      $('#essayBox2').css('display', 'none');
    })
    essayBoxShown2 = false;
  }	