

var globalProjection = d3.geo.mercator()
				.center([-88.08,41.99])
				.translate([0, 0])
				.scale(60000);

var global = {
	data: null,
	nycPaths: null,
	worldPaths: null,
	temperature:null,
	usMapWidth:580,
	usMapHeight:580,
	dataLength:null,
	dateIdmax: 2759,
	dateIdmin: 1456,
	maxPerDay:514,
	minPerDay:1
}

var config = {
	zoom: .95,
	timeline: {
		timer: null,
		width: 800,
		barWidth: 6,
		xScale: d3.scale.linear().domain([global.dateIdmin,global.dateIdmax]).range([20, 800])
	}
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
	var projection = globalProjection
	
	var path = d3.geo.path().projection(projection);
	
	var tip = d3.tip()
	.attr("class", "map-tip")
	.offset([100,0])
	
	
	
	var svg = d3.select(selector).append("svg")
		.attr('height', global.usMapWidth)
		.attr('width',global.usMapHeight);
		
	var map = svg.selectAll(".map")
		.data(data.features)
		.enter()	
	svg.call(tip);

	map.append("path")
	.attr("d", path)
	.attr("class", "map-item")
	.attr("cursor", "pointer")
	.attr("stroke-opacity", 1)
	.attr("stroke", "#000")
	.attr("fill-opacity", .2)
	.attr("fill", "green")
	.on("mouseover", function(d) {
		tip.html("Ward "+d.properties.WARD)
		tip.show()
	})
	.on("mouseout", function(d) {
		tip.hide()
	});
	
		
	return map
}

function initNycMap(paths, data) {
	var map = renderMap(paths, "#svg-nyc-map", global.usMapWidth,global.usMapHeight)
	renderNycMap(data)
}



function renderNycMap(data) {
	var map = d3.select("#svg-nyc-map").selectAll(".map-item")
	var projection = globalProjection
	
	d3.select("#svg-nyc-map svg").selectAll("circle").remove()	
	
	var w = 1000;
	var h = 1000;
	var circle = d3.select("#svg-nyc-map svg").selectAll("circle")
	.data(data)
	.enter()
				
	
	
	for(var j = 0; j < 2; j++){
		circle.append("circle")
		.attr("cx", function(d){
			var projectedX = projection([parseFloat(d.Longitude),parseFloat(d.Latitude)])[0];			
			return projectedX+(Math.random()-.5)*j
		})
		.attr("cy",function(d){
			var projectedY = projection([parseFloat(d.Longitude),parseFloat(d.Latitude)])[1];
			return projectedY+(Math.random()-.5)*j
		})
		.attr("r",function(d,i){return 1})
		.attr("fill", function(d){
			if(d.Longitude == 0 || d.Latitude==0){
				return "none"
			}else{
				return "white"			
			}
		})
		.attr("opacity", 0.05)
	}
	
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
	updateSliderRange(global.dateIdmin, global.dateIdmax);
	var numberofDays = global.dateIdmax-global.dateIdmin
	d3.selectAll("#svg-timeline .slider").attr("opacity", 0)
	updateMaps();
	d3.select("#boroughPercent").html("Total: " + global.data.length + "<br/> Average: "+parseInt(global.data.length/numberofDays) + " per day")
}


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
	var startX = parseFloat(slider.attr("x"))
	var endX = parseFloat(slider.attr("x")) + parseFloat(slider.attr("width"))
	leftHandle.attr("x", startX)
	rightHandle.attr("x", endX)
}

function objectSize(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function statsByBorough(data){
	var groupedData = table.group(data,["borough"])
	var datesInRange = objectSize(table.group(data, ["Date"]))
	var totalDatesInRange = objectSize(table.group(global.data, ["Date"]))
	
	//console.log(groupedData)
	var sum = data.length
	var overallPerDay = Math.round(global.data.length/totalDatesInRange* 100) / 100
	var detailedText = []
	var population = {
		"42":74781,
		"2":59303,
		"32":54407,
		"44":53584,
		"43":50616,
		"46":48143,
		"48":48038,
		"41":47532,
		"47":47347,
		"36":47258,
		"1":46552,
		"45":45726,
		"38":45558,
		"13":44943,
		"11":43328,
		"39":43277,
		"25":43267,
		"23":43249,
		"50":43220,
		"40":43125,
		"49":42026,
		"31":41159,
		"27":40851,
		"18":40309,
		"12":40119,
		"33":39985,
		"19":39737,
		"14":39526,
		"35":39424,
		"4":39331,
		"30":39098,
		"6":38160,
		"21":38151,
		"26":37551,
		"29":37011,
		"5":36909,
		"8":36685,
		"10":36246,
		"37":36124,
		"34":35112,
		"7":34921,
		"28":33999,
		"22":33918,
		"20":33693,
		"24":33544,
		"17":32577,
		"15":32365,
		"9":31087,
		"3":30662,
		"16":30434,
		"total":2073968
	} 
	for(var item in groupedData){

		var currentBorough = toTitleCase(item);
		var currentLength = groupedData[item].length;
		var currentPercent = parseFloat(currentLength/sum *100)
		var currentPerDay = parseFloat(sum/datesInRange)
		var currentPopulation = population[currentBorough]
		var currentPopPercent = parseFloat(currentPopulation/population["total"]*100)
		if(currentPercent-1 > currentPopPercent || currentPopPercent-1> currentPercent && Math.floor(currentPercent) !=0){
			detailedText.push([currentBorough, Math.round(currentPercent* 100) / 100, Math.round(currentPopPercent* 100) / 100])
		}
		detailedText = detailedText.sort(
		  function(a,b) {
		   return b[1]-a[1] || a[0].localeCompare(b[0]);
		  }
		);
	}

	d3.select("#boroughPercent").html("<span style=\"color:green\"><strong>Overall Average: </strong>"+overallPerDay+"</span><br/>Current Average: "+Math.round(currentPerDay* 100) / 100)
	
	
	d3.select("#averageGraph svg").remove()
	var averageGraph = d3.select("#averageGraph").append("svg").append("g")
	
	var max = global.maxPerDay
	var min = global.minPerDay
	var xScale = d3.scale.linear().domain([min,max]).range([0,150])
	var barwidth = 2

	
	averageGraph.append("rect")
	.attr("x", 0 )
	.attr("y", 0)
	.attr("width", 150)
	.attr("height", 10)
	.attr("fill", "green")
	.attr("opacity", .2)
	
	
	averageGraph.append("rect")
	.attr("x",xScale(max))
	.attr("y",0)
	.attr("width", barwidth)
	.attr("height", 10)
	.attr("fill", "green")
	
	averageGraph.append("text")
	.attr("x",xScale(max) - 8)
	.attr("y", 25)
	.text(max)
	.attr("fill", "green")
	
	averageGraph.append("text")
	.attr("x",xScale(max) - 8)
	.attr("y", 35)
	.text("max")
	.attr("fill", "green")
	
	averageGraph.append("rect")
	.attr("x",xScale(min))
	.attr("y",0)
	.attr("width", barwidth)
	.attr("height", 10)
	.attr("fill", "green")
	
	averageGraph.append("text")
	.attr("x",xScale(min))
	.attr("y", 25)
	.text(min)
	.attr("fill", "green")
	averageGraph.append("text")
	.attr("x",xScale(2))
	.attr("y", 35)
	.text("min")
	.attr("fill", "green")
	
	averageGraph.append("rect")
	.attr("x",xScale(overallPerDay) )
	.attr("y", 0)
	.attr("width", barwidth)
	.attr("height", 10)
	.attr("fill", "green")
	
	averageGraph.append("text")
	.attr("x",xScale(overallPerDay) - 8)
	.attr("y", 25)
	.text(overallPerDay)
	.attr("fill", "green")
	averageGraph.append("text")
	.attr("x",xScale(overallPerDay)+4)
	.attr("y", 35)
	.text("average")
	.attr("fill", "green")
	
	averageGraph.append("rect")
	.attr("x",xScale(currentPerDay) )
	.attr("y", 0)
	.attr("width", barwidth)
	.attr("height", 10)
	.attr("stroke", "white")
	.attr("fill", "none")
	
	return(detailedText)
}

function boroughBarGraph(data){
	var wScale = d3.scale.linear().domain([0,20]).range([0,100])
	var barWidth = 10
	var baroffset = 80
	d3.select("#boroughBarGraph svg").remove()
	var boroughGraph = d3.select("#boroughBarGraph").append("svg").append("g").selectAll("rect")
	.data(data)
	.enter()
	
	boroughGraph.append("rect")
	.attr("x", baroffset)
	.attr("y", function(d,i){return i*barWidth*2.5})
	.attr("height", barWidth-4)
	.attr("width", function(d){return wScale(d[1])})
	.attr("fill", "#fff")
	
	boroughGraph.append("text")
	.attr("x", function(d){return wScale(d[1])+baroffset+10})
	.attr("y",function(d,i){return i*barWidth*2.5+6})
	.text(function(d){return d[1]+"%"})
	.attr("fill", "#fff")
	.attr("font-size", 9)
	
	
	boroughGraph.append("rect")
	.attr("x", baroffset)
	.attr("y", function(d,i){return i*barWidth*2.5+barWidth})
	.attr("height", barWidth-4)
	.attr("width", function(d){return wScale(d[2])})
	.attr("fill", "green")
	.attr("opacity", .5)
	
	boroughGraph.append("text")
	.attr("x", function(d){return wScale(d[2])+baroffset+2})
	.attr("y",function(d,i){return i*barWidth*2.5+barWidth*2-4})
	.text(function(d){return d[2]+"%"})
	.attr("fill", "green")
	.attr("font-size", 9)
	
	boroughGraph.append("text")
	.attr("x", 0)
	.attr("y",function(d,i){return (i+1)*barWidth*2.5-15})
	.text(function(d){
			return "Ward "+d[0]			
	})
	.attr("fill", "#fff")
	//.attr("text-anchor", "end")
	
}


function statsByType(data){
	var groupedData = table.group(data,["complaintType"])
}

function statsByZip(data){
	var groupedData = table.group(data,["zipcode"])
	var zipcodes = []
	for (var zip in groupedData){
		var currentZip = zip
		var currentLength = groupedData[zip].length;
		zipcodes.push([currentZip, currentLength])
	}
	
	zipcodes.sort(
	  function(a,b) {
	   return b[1]-a[1] || a[0].localeCompare(b[0]);
	  }
	);
}

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
function updateMaps() {

	var xScale = config.timeline.xScale

	var startYear = Math.floor(xScale.invert(leftHandlePosition()))
	var endYear = Math.floor(xScale.invert(rightHandlePosition()))
	
	var slider = d3.select("#svg-timeline .slider")
	slider.property("timeline-year-start", startYear)
	slider.property("timeline-year-end", endYear)

	var data = global.data
	var groupedData = table.group(data, ["DateId"])
	var filteredData = table.filter(groupedData, function(list, year) {
		year = parseFloat(year)
		return (year >= startYear && year <= endYear)
	})

	//console.log(filteredData.length)
	d3.select("#svg-nyc-map svg").selectAll("circle").remove()
	renderNycMap(filteredData)
	statsByBorough(filteredData)
	statsByZip(filteredData)
	
	//renderTimeline(data)
	d3.select("#svg-timeline .selected-year").classed("selected-year", false)
	var datalength = filteredData.length
	
	
	var startDate = filteredData[0].Date
	var endDate = filteredData[datalength-1].Date
	
	var startDate = startDate.split("/")
	var endDate = endDate.split("/")
	for(var i in startDate){
		if(startDate[i].length == 1){
			startDate[i] = "0"+startDate[i]
		}
	}
	for(var i in endDate){
		if(endDate[i].length == 1){
			endDate[i] = "0"+endDate[i]
		}
	}
	var startDate = startDate[2]+"."+startDate[0]+"."+startDate[1]
	var endDate = endDate[2]+"."+endDate[0]+"."+endDate[1]
	d3.select("#startYear").html(startDate)
	d3.select("#endYear").html("- "+endDate)
}

function initTimeline(data) {
	var height = 100
	var width = 800
	var marginH = 20
	var marginW = 4
	var timeline = d3.select("#svg-timeline").append("svg").append("g");
	var format = d3.time.format("%m/%d/%Y");
	// Render the Axes for the timeline
	var xScale = config.timeline.xScale
	// Add the sliders
	var barwidth = config.timeline.barWidth
	var slider = timeline.append("rect")
		.attr("class", "slider")
		.attr("x", 20)
		.attr("y", 0)
		.attr("width", width-20)
		.attr("height", height)
		.attr("fill", "#fff")
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
				d3.select("#svg-nyc-map svg").selectAll("circle").attr("opacity", .2)
				
			})
		)
	var leftHandle = timeline.append("rect")
		.attr("class", "handle-left")
		.attr("x", 22)
		.attr("y", 0)

	var rightHandle = timeline.append("rect")
		.attr("class", "handle-right")
		.attr("x", width)
		.attr("y", 0)
}

function drawIncidentsTimeline(data){
	var groupedData = table.group(data, ["DateId"])
	//console.log(groupedData)
}

function drawTemperatureTimeline(data){
	var height = 100
	var width = 800
	var marginH = 20
	var marginW = 4	
	//console.log(findMinMax(global.temperature))
	var yScaleTemperature = d3.scale.linear().domain([1,100]).range([height, height/2+10]);
	var yScaleIncidents = d3.scale.linear().domain([1,global.maxPerDay]).range([height/2, 4]);
	
	var xScale = config.timeline.xScale
	
	var xAxis = d3.svg.axis().scale(xScale).tickSize(1).ticks(16).tickFormat(d3.format("d"))
	//.tickValues(function(d,i){return i})

	//var yAxis = d3.svg.axis().scale(yScale).tickSize(1).orient("right").tickFormat(d3.format("d")).tickValues([0,100]);
	var temperatureGraph = d3.select("#svg-timeline g")
	
	var temperatureline = d3.svg.line()
	    .x(function(d,i) { return xScale(d["dateId"]);})
	    .y(function(d) { return yScaleTemperature(d["Max TemperatureF"]);})
	    .interpolate("basis");
		
	var incidentsline = d3.svg.line()
	    .x(function(d,i) { return xScale(d["dateId"]);})
	    .y(function(d) { return yScaleIncidents(d["Incident Reports"]);})
	    .interpolate("basis");

	var tip = d3.tip()
	.attr("class", "timeline-tip")
	
	temperatureGraph.call(tip);

	temperatureGraph
	.append("path")
	.attr("d", temperatureline(data))
	.attr("stroke", "#ddd")
	.attr("fill", "none")
	.attr("stroke-width", 1)
	.on("mouseover", function(){
		var currentX = d3.event.x
		var currentY = d3.event.y
		var dateId = String(Math.floor(xScale.invert(currentX)))
		var date =  data[dateId-global.dateIdmin]["Date"]
		var maxTemperature = data[dateId-global.dateIdmin]["Max TemperatureF"]
		var minTemperature = data[dateId-global.dateIdmin]["Min TemperatureF"]
		var incidents = data[dateId-global.dateIdmin]["Incident Reports"]
		
		tip.html(date + "<br/>"+minTemperature+"&deg - "+maxTemperature+"&deg<br/> "+ incidents+" Complaints")
		.offset([0,currentX-400])
		tip.show()
	})
	.on("mouseout", function(){
		tip.hide()
	})
	
	temperatureGraph
	.append("path")
	.attr("d", incidentsline(data))
	.attr("stroke", "green")
	.attr("fill", "none")
	.attr("stroke-width", 1)
	.on("mouseover", function(){
		var currentX = d3.event.x
		var currentY = d3.event.y
		var dateId = String(Math.floor(xScale.invert(currentX)))
		var date =  data[dateId-global.dateIdmin]["Date"]
		var maxTemperature = data[dateId-global.dateIdmin]["Max TemperatureF"]
		var minTemperature = data[dateId-global.dateIdmin]["Min TemperatureF"]
		var incidents = data[dateId-global.dateIdmin]["Incident Reports"]
		
		tip.html(date + "<br/>"+minTemperature+"&deg - "+maxTemperature+"&deg<br/> "+ incidents+" Complaints")
		.offset([0,currentX-400])
		tip.show()
	})
	.on("mouseout", function(){
		tip.hide()
	})
	var minMax = findMinMax(data)
	d3.select("#incidentsRange").html(minMax[1]+" - "+ minMax[0])
	d3.select("#temperatureRange").html(minMax[3] + "&deg"+" - "+ minMax[2] + "&deg F")
}

function findMinMax(data){
	var temperatures = []
	var reports = []
	
	for(var row in data){
		var currentReports = data[row]["Incident Reports"]
		var currentTemperature = data[row]["Max TemperatureF"]
		if(currentReports != 0){
			reports.push(currentReports)
		}
		if(currentTemperature != 0){
		temperatures.push(currentTemperature)
		}
	}
	var minReports = Math.min.apply(null,reports)
	var minTemperature = Math.min.apply(null,temperatures)
	var maxReports =  Math.max.apply(null,reports)
	var maxTemperature = Math.max.apply(null,temperatures)

	 return [maxReports,minReports, maxTemperature, minTemperature]
}

function timelineControlStop() {
	$("#timeline-controls .play").show()
	$("#timeline-controls .stop").hide()
	clearInterval(config.timeline.timer)
}

function dataDidLoad(error, nycPaths, data, temperature) {
	//findMinMax(data)
	
	global.nycPaths = nycPaths
	global.data = data	
	global.temperature = temperature
	var nycMap = initNycMap(nycPaths, data)
	var timeline = initTimeline(data)
	var temperature = drawTemperatureTimeline(temperature)
	global.dataLength =data.length
	d3.selectAll("#svg-timeline .slider").attr("opacity", 0)

//		var direction = 1
	statsByBorough(data)
	statsByZip(data)
	boroughBarGraph(statsByBorough(data))
	d3.select("#startYear").html("2010.01.01")
	d3.select("#endYear").html("- 2013.08.01")
	
	$("#timeline-controls .play").click(function() {
		$("#timeline-controls .play").hide()
		$("#timeline-controls .stop").show()
//		var direction = 1
		var sliderRange = 7
		var year = Math.floor(config.timeline.xScale.invert(leftHandlePosition()))
		if(year<0){
			year = 0
		}
		config.timeline.timer = setInterval(function() {
			updateSliderRange(year, year + sliderRange)
			updateMaps()
			d3.select("#svg-nyc-map svg").selectAll("circle").attr("opacity", .3)
			d3.selectAll(".slider").attr("opacity", .1)
			
			if(year+sliderRange >=global.dateIdmax){
				timelineControlStop()
			}
			year = year + 2
		}, 1)
	})
	$("#timeline-controls .stop").click(timelineControlStop)
	d3.select("#ratsloader").remove()
}

$(function() {
	// Window has loaded	
	queue()
		.defer(d3.json, cityGeojson)
		.defer(d3.csv, csv)
		.defer(d3.csv, temperature)
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
  $('#boroughBarGraph svg').click(function(e){
      e.preventDefault();
      essayBoxShown2 = !essayBoxShown2;
      if (essayBoxShown2) {
          $('#essayBox2').css('display', 'block');
          $('#essayBox2').animate({'opacity':1.0}, 500);
          $(this).text('... Less ');
      } else {
          closeEssayBox2();
          $(this).text('... See Companies ');
      }
    })
    $('#essayBox-close2').click(function(){
 //	   console.log("close")
      closeEssayBox2();
      $('#boroughBarGraph svg').text('... More ');
    });


   function closeEssayBox2(){
    $('#essayBox2').animate({'opacity':0.0}, 500, function () {
      $('#essayBox2').css('display', 'none');
    })
    essayBoxShown2 = false;
  }	