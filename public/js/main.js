let states = ["AK","AL","AR","AS","AZ","CA","CO","CT","DC","DE","FL","GA","GU","HI","IA","ID","IL","IN","KS","KY","LA","MA","MD","ME","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VA","VI","VT","WA","WI","WV","WY"]
const regions = {'northwest':{'title':"Northwest", 'states':["WA","OR","ID"], isClimateRegion:true},
				 'northernRockies':{'title':"Northern Rockies and Plains", 'states':["MT","ND","SD","WY","NE"], isClimateRegion:true},
				 'upperMidwest':{'title':"Upper Midwest",'states':["MN","WI","MI","IA"], isClimateRegion:true},
				 'northeast':{'title':"Northeast",'states':["MD","PA","NY","DE","NJ","CT","RI","MA","VT","NH","ME"], isClimateRegion:true},
				 'west':{'title':"West",'states':["CA","NV"], isClimateRegion:true},
				 'southwest':{'title':"Southwest",'states':["UT","CO","NM","AZ"], isClimateRegion:true},
				 'south':{'title':"South",'states':["KS","OK","AR","LA","MS","TX"], isClimateRegion:true},
				 'ohioValley':{'title':"Ohio Valley",'states':["IL","IN","OH","WV","MO","KY","TN"], isClimateRegion:true},
				 'southeast':{'title':"Southeast",'states':["VA","NC","SC","GA","AL","FL"], isClimateRegion:true},
				 'upperStates':{'title':"Upper States",'states':["WA","OR","ID","MT","ND","SD","WY","NE","MN","WI","MI","IA","MD","PA","NY","DE","NJ","CT","RI","MA","VT","NH","ME","IL","IN","OH","WV"], isClimateRegion:false},
				 'lowerStates':{'title':"Lower States",'states':["CA","NV","UT","CO","NM","AZ","KS","OK","AR","LA","MS","TX","VA","NC","SC","GA","AL","FL","MO","KY","TN"], isClimateRegion:false}
				};
const margin = {top: 20, right: 15, bottom: 30, left: 35};
const height  = 350 - margin.top - margin.bottom;
//These three variables will be set dynamically on window resize
let width, xScale, yScale


//Meteorological Season 
const seasons = {
	"summer": {
		start: {month:6, day:1},
		middle: {month:7, day:15},
		end: {month:8, day:31},
		previous:"spring",
		next:"fall"
	},
	"fall": {
		start: {month:9, day:1},
		middle: {month:10, day:15},
		end: {month:11, day:30},
		previous:"summer",
		next:"winter"
	},
	"winter": {
		start: {month:12, day:1},
		middle: {month:1, day:15},
		end: {month:2, day:28},
		previous:"fall",
		next:"spring"
	},
	"spring": {
		start: {month:3, day:1},
		middle: {month:4, day:15},
		end: {month:5, day:31},
		previous:"winter",
		next:"summer"
	}
}

const defaults = {
	sliderRange:{'min': 1860,'max': 2010},
	initialYears:[1870, 1889, 1970, 1989]
}

//Get svg container
const svg = d3.select('svg#chart');

//Set ranges


//Set line path definition
const line = d3.line()
  .x(d => xScale(d.date))
  .y(d => yScale(d.avg))
  .curve(d3.curveMonotoneX);

let sliderTimeout = [null, null];

let isMonthly = true; //Must default to true, otherwise it won't initially load monthly values
let isCelsius = false;

let linesData = [[],[]] //Monthly Averages
let areasData = [[],[]] //Daily Averages

let loadingCount = 0;
let isBackButton = true;

function updateScales(){
	width   = $('svg#chart').width() - margin.left - margin.right;
	xScale = d3.scaleTime().range([0, width]);
	yScale = d3.scaleLinear().range([height, 0]);
}

function handleResize(){
	updateScales();
	updateAxis();
	renderLines(linesData, true);
	renderAreas();
}

function getSeasonChange(days, temp, season){
	const previousSeasonStart = seasons[seasons[season].previous].middle
	const nextSeasonEnd = seasons[seasons[season].next].middle
	const startIdx = getIdxFromDate(days, previousSeasonStart.month, previousSeasonStart.day)
	const endIdx = getIdxFromDate(days, nextSeasonEnd.month, nextSeasonEnd.day)
	const midPoint = getIdxFromDate(days, seasons.summer.middle.month, seasons.summer.middle.day)
	let maxIdx, maxTemp

	if(days.length) { maxIdx = startIdx; maxTemp = days[startIdx].avg }
	//Fall, winter
	if(endIdx < startIdx){
		for(let i=startIdx; i<days.length; i++){
			//Looking for colder temps...
			if(days[i].avg <= temp) return days[i]
			if(days[i].avg < maxTemp) { maxIdx = i; let maxTemp = days[i].avg }
		}
		//Couldn't find it at the tail end, so try the start of the year
		for(let i=0; i<endIdx; i++){
			if(days[i].avg <= temp) return days[i]
			if(days[i].avg < maxTemp) { maxIdx = i; let maxTemp = days[i].avg }
		}
		
	//Spring, Summer
	} else {
		for(let i=startIdx; i<endIdx; i++){
			//Looking for warmer temps...
			if(days[i].avg >= temp) return days[i]
			if(days[i].avg > maxTemp) {  maxIdx = i; let maxTemp = days[i].avg   }
		}
	}
	//We couldn't find a "season changing" day, so just pick the most extreme
	return days.length ? days[maxIdx] : {date:null}
}

function getSeasonX(d, i, season){
	const s = seasons[season]
	let xStart = 0

	if(d.length) {
		//Control range
		if(i === 0) {
			xStart = xScale(new Date(2000,s.start.month-1,s.start.day))
		} else {
			//Get the "control" date index
			const iStart = getIdxFromDate(areasData[0], s.start.month, s.start.day)
			//Get the "control" temperature
			const tStart = iStart > -1 ? areasData[0][iStart].avg : 0;
			xStart = xScale(getSeasonChange(d, tStart, season).date)
		}
	}

	return xStart
}

function getSeasonWidth(d, i, season){
	const s = seasons[season]
	let xStart = 0
	let xEnd = 0

	if(d.length){
		//Control range
		if(i === 0) {
			xStart = xScale(new Date(2000,s.start.month-1,s.start.day))
			xEnd = xScale(new Date(2000,s.end.month-1,s.end.day))
		} else {
			//Get the "control" date index 
			const iStart = getIdxFromDate(areasData[0], s.start.month, s.start.day)
			const iEnd = getIdxFromDate(areasData[0], s.end.month, s.end.day)
			//Get the "control" temperature
			const tStart = iStart > -1 ? areasData[0][iStart].avg : 0
			const tEnd = iEnd > -1 ? areasData[0][iEnd].avg : 0

			const seasonDateStart = getSeasonChange(d, tStart, season).date
			const seasonDateEnd = getSeasonChange(d, tEnd, season).date
			//Get the xScales based on the "control" temperature
			xStart = seasonDateStart ? xScale(seasonDateStart) : 0
			xEnd = seasonDateEnd ? xScale(seasonDateEnd) : 0
			if(xStart > xEnd) {
				if(i === 1 && season === "fall") updateAreaOffset(xEnd)
				xEnd = xScale(new Date(2000,11,31))+10
				if(i === 1 && season === "fall") updateClip(xStart, xEnd)
			} else {
				if(i === 1 && season === "fall") {
					updateAreaOffset(0)
					updateClip(xStart, xEnd+10)
				}
			}
		}
	}

	return xEnd - xStart
}

function updateClip(xStart, xEnd){
		//Update the clip offset for the end of the season
		const areaClip = svg.selectAll("#with-offset-clip-path > rect").data([(xEnd - xStart)-10])

        areaClip.enter()
			.append("rect")
			.merge(areaClip)
				.attr("y", height-10)
			  	.transition().duration(800)
			  		.attr("x", xStart)
		          	.attr("width", (d) => d)
}

function updateAreaOffset(width){
		const areaOffset = svg.selectAll(".area.offset").data([width])
		const areaClip = svg.selectAll("#offset-clip-path > rect").data([width])

        areaClip.enter()
			.append("rect")
			.merge(areaClip)
				.attr("y", height-10)
			  	.transition().duration(800)
		          	.attr("width", (d) => d)


    	//Add/Update the areas
        areaOffset.enter()
			.append("rect")
	        	.attr("y", height-10)
	          	.attr("width", (d) => (d+10))
			  	.attr("class", "area offset area-1")
		  	.merge(areaOffset)
			  	.transition().duration(800)
		          	.attr("width", (d) => d+10)
}

function getIdxFromDate(arr, month, day){
	return arr.reduce((a, d, i) => d.date.getMonth() === month-1 && d.date.getDate() === day ? i : a, -1)
}

function getLabelX(d, season){
	const x1 = getSeasonX(d[0],0,season)
	const x2 = getSeasonX(d[1],1,season)
	const xStart = Math.min(x1, x2)
	const xEnd = Math.max(x1+getSeasonWidth(d[0],0, season), x2+getSeasonWidth(d[1],1, season))
	return (xStart+xEnd)/2
}

function updateAxis(){
	let flatData = linesData.concat(areasData).reduce((acc, val) => acc.concat(val), []);

	//Set new domain for axis
	xScale.domain(d3.extent(flatData, function(d) { return d.date; }));
	yScale.domain([d3.min(flatData, function(d) { return d.avg; }) - 5, d3.max(flatData, function(d) { return d.avg; }) + 5]);

	//Create axis scale
	const yAxis = d3.axisLeft().scale(yScale);
	const xAxis = d3.axisBottom(xScale).tickPadding(5).tickSizeInner(10).tickFormat(d3.timeFormat("%b"));

	//If no axis exists, create one, otherwise update it
	if(svg.selectAll(".y.axis").empty()) {
		svg.append("g")
			.attr("class","y axis")
			.call(yAxis)
	} else {
		svg.selectAll(".y.axis")
			.attr("class","y axis")
			.transition().duration(1500)
			.call(yAxis)
	}

	if(svg.selectAll(".x.axis").empty()) {
		svg.append("g")
			.attr("transform", "translate(0," + height + ")")
			.attr("class","x axis")
			.call(xAxis)
	} else {
		svg.selectAll(".x.axis")
			.attr("class","x axis")
			.transition().duration(1500)
			.call(xAxis)
	}	
}

function getStatesParam(){
	let selectedStates = ""

	$('.state-btn.active').each((i, e) => {
		selectedStates += (i ? ',' : '') + e.value;
	})

	stLen = selectedStates.split(",").length;

	return stLen > 0 && stLen < states.length ? '&states=' + selectedStates : '';
}

function renderLines(data, animate) {
	//Select existing lines and bind to data
	const lineObjs = svg.selectAll(".line").data(data)

	//Add/Update the lines
	let merge = lineObjs.enter()
	.append("path")
	  .attr("class",  (d,i) => "line line-" + i)
	  .attr("d", line)
	.merge(lineObjs)

	if(animate) {
	  merge.transition().duration(500)
	  .attr("d", line)
	} else {
	  merge.attr("d", line)
	}
}

function renderAreas(){
	["fall", "spring"].forEach(season => {
	   	//Select existing areas and bind to data
		const areaJoin = svg.selectAll(".area." + season).data(areasData)

    	//Add/Update the areas
        areaJoin.enter()
        .append("rect")
        	.attr("y", height-10)
          	.attr("x", (d,i) => getSeasonX(d,i,season))
          	.attr("width", (d,i) => getSeasonWidth(d,i,season))
		  	.attr("class",  (d,i) => (i === 1 && season === "fall" ? "with-offset " : "") + "area " + season + " area-" + i)
		  .merge(areaJoin)
		  	.transition().duration(800)
		  	.attr("x", (d,i) => getSeasonX(d,i,season))
          	.attr("width", (d,i) => getSeasonWidth(d,i,season))	
	})

	//Add Labels
	const textJoin = svg.selectAll(".label").data(["fall", "spring"])

	textJoin.enter()
		.append("text")
		.attr("y", height+5)
		.attr("x", s => getLabelX(areasData,s))
		.attr("opacity", 0)
		.attr("class",s => "label " + s)
		.text(s => s.toUpperCase())
    .merge(textJoin)
    	.transition().duration(800)
    	.attr("x", s => getLabelX(areasData,s))
    	.transition()
		.duration(400)
		.attr("opacity", 1)
}

function toggleUnits(celsius){
	if(isCelsius != celsius){
		$(".units").text(celsius ? "Celsius" : "Fahrenheit");
		$(".units-btn").toggleClass("active");
		$(".temp-unit > span").text(celsius ? "C" : "F");
		isCelsius = celsius;
		linesData = linesData.map(d => d.map(m => {
			m.avg = !isCelsius ? (m.avg * 9 / 5 + 32) : ((m.avg - 32) * 5 / 9);
			return m
		}))
		areasData = areasData.map(d => d.map(m => {
			m.avg = !isCelsius ? (m.avg * 9 / 5 + 32) : ((m.avg - 32) * 5 / 9);
			return m
		}))
		updateAxis();
		renderLines(isMonthly ? linesData : areasData, true);
		updateTables();
		setHash();	
	}
}

function togglePeriod(monthly){
	if(isMonthly != monthly){
		$(".period").text(monthly ? "Monthly" : "Daily");
		$(".period-btn").toggleClass("active");
		isMonthly = monthly;
		renderLines(monthly ? linesData : areasData, false);
		updateTitle();
		setHash();		
	}
}

function getHash(){
	let params = location.hash.substring(1).split("&").reduce((obj, p) => {
		let pair = p.split("=")
		obj[pair[0]] = pair[1]
		return obj
	}, {})

	//First update the settings
	togglePeriod(!params.hasOwnProperty('isMonthly'))
	toggleUnits(!params.hasOwnProperty('isCelsius'))

	//Then update the states (if needed)
	if(params.states) {
		$('.state-btn.active').removeClass("active")
		params.states.split(",").forEach(st => {
			$("button[value='"+ st + "']").addClass("active")
		})
		handleStateButtonClick()
	}
	//Finally update the slider (Which will trigger a re-render of the data)
	updateSliderRange(params.years ? params.years.split(',') : undefined)

}

function setHash(years, states){
	const y = years || slider.noUiSlider.get()
	const st = states || getStatesParam()
	isBackButton = false;
	location.hash = 'years=' + y.join(',') + st + (isMonthly ? '' : '&isMonthly=false') + (isCelsius ? '' : '&isCelsius=false')
}

function getTemps(lineNo){
	const years = slider.noUiSlider.get()
	const yearStart = lineNo ? years[2] : years[0] 
	const yearEnd = lineNo ? years[3] : years[1]
	const statesParam = getStatesParam()

	setHash(years, statesParam)

	if(isMonthly  || linesData[lineNo].length === 0){
		loading(true);
		$.get('/get-monthly-temps?startYear=' + yearStart + '&endYear=' + yearEnd + statesParam, function(data){
			loading(false);
			//Convert dates to JavaScript Date object
			data = data.map(m => {
				m.date = new Date(m.date)
				if(!isCelsius) m.avg = m.avg * 9 / 5 + 32;
				return m
			})

			//Save most recent data
			linesData[lineNo] = data

			if(isMonthly){
				updateAxis();
				renderLines(linesData, true);			
			} 
		})		
	}

	loading(true);
	$.get('/get-daily-temps?startYear=' + yearStart + '&endYear=' + yearEnd + statesParam, function(data){
		loading(false);
		updateTitle();
		//Convert dates to JavaScript Date object
		//Turn each daily average in a 9-day average
		data = data.map((d,i) => {
			let sum = 1;
			for(let j=-4; j<5; j++){
				if(j !== 0 && typeof data[i+j] !== 'undefined') { d.avg += data[i+j].avg; sum++ }	
			}
			d.avg /= sum
			d.date = new Date(d.date)
			return d
		})
		if(!isCelsius) {
			data = data.map((d,i) => {
				d.avg = d.avg * 9 / 5 + 32;
				return d;
			})
		}

		//Save most recent data
		areasData[lineNo] = data

		updateAxis();

		renderAreas();

		if(!isMonthly) renderLines(areasData, true);
		updateTables();
	})
}

function loading(add){
	if(add){
		loadingCount++;
	} else {
		loadingCount--;
	}
	if(loadingCount === 0) {
		$('#loading-icon').hide();
	} else {
		$('#loading-icon').show();
	}
}

function updateAllTemps(){
	if(sliderTimeout[0]) clearTimeout(sliderTimeout[0]);
	if(sliderTimeout[1]) clearTimeout(sliderTimeout[1]);
	sliderTimeout[0] = setTimeout(() => getTemps(0), 100);
	sliderTimeout[1] = setTimeout(() => getTemps(1), 1000);
}

function updateSliderRange(newValues){
	let statesParam = getStatesParam()
	if(statesParam.length) statesParam = '?' + statesParam.substr(1)

	$.get('/get-range' + statesParam, function(data){
		slider.noUiSlider.updateOptions({range: data});
		if(newValues) slider.noUiSlider.set(newValues);
	});
}

function updateTables(){
	let s, iStart, tStart, e, iEnd, tEnd, diff

	Object.keys(seasons).forEach(season => {
		s = seasons[season]
		iStart = getIdxFromDate(areasData[0], s.start.month, s.start.day)
		tStart = iStart > -1 ? areasData[0][iStart].avg : -999;
		eStart = getSeasonChange(areasData[1], tStart, season).date

		$('.season-start .' + season + ' td:nth-child(2)').numerator({ toValue:tStart, rounding:1 })
		$('.season-start .' + season + ' td:nth-child(3) .month').numerator({ toValue:s.start.month})
		$('.season-start .' + season + ' td:nth-child(3) .day').numerator({ toValue:s.start.day})
		$('.season-start .' + season + ' td:nth-child(4) .month').numerator({ toValue:eStart ? (eStart.getMonth()+1) : 0})
		$('.season-start .' + season + ' td:nth-child(4) .day').numerator({ toValue:eStart ? eStart.getDate() : 0})

		e = seasons[s.next]
		iEnd = getIdxFromDate(areasData[0], e.start.month, e.start.day)
		tEnd = iEnd > -1 ? areasData[0][iEnd].avg : -999;
		eEnd = getSeasonChange(areasData[1], tEnd, season).date

		$('.season-end .' + season + ' td:nth-child(2)').numerator({ toValue:tEnd, rounding:1 })
		$('.season-end .' + season + ' td:nth-child(3) .month').numerator({ toValue:e.start.month})
		$('.season-end .' + season + ' td:nth-child(3) .day').numerator({ toValue:e.start.day})
		$('.season-end .' + season + ' td:nth-child(4) .month').numerator({ toValue:eEnd ? (eEnd.getMonth()+1) : 0})
		$('.season-end .' + season + ' td:nth-child(4) .day').numerator({ toValue:eEnd ? eEnd.getDate() : 0})


		diff = moment(eStart).diff(moment("2000-" + s.start.month + "-" + s.start.day), 'days');
		$('#' + season + '-shift').numerator({ toValue:diff}).toggleClass("positive", diff > 0).toggleClass("negative", diff < 0);
	});
}

function handleStateButtonClick(){
	let st = []
	$('.state-btn.active').each((i, e) => {
		st.push(e.value);
	})

	st.sort();

	if(st.length === states.length){
		$('#all-states').addClass('active');
	} else {
		$('#all-states').removeClass('active');
	}

	$('.region-btns').removeClass('active');
	let stString = JSON.stringify(st);
	Object.keys(regions).forEach((k) => {
		if(JSON.stringify(regions[k].states.sort()) === stString) $('button[value='+ k +']').addClass('active')
	})

	statesLayer.setStyle(styleFeatures);
}

function setGeoButtons(){
	//Set Region buttons
	$('#region-btns').html(Object.keys(regions).reduce((e,k) => regions[k].isClimateRegion ? e.append($('<button>').text(regions[k].title).val(k).addClass('region-btns full-width')) : e, $('<div>')))
	$('#state-btns').append(Object.keys(regions).reduce((e,k) => !regions[k].isClimateRegion ? e.append($('<button>').text(regions[k].title).val(k).addClass('region-btns full-width')) : e, $('<div>')))
	//Get States to set state buttons
	return new Promise((resolve, reject) => $.get('/get-states', function(data){
		states = data
		let stateNames = statesData.features.reduce((o,s) => {
			o[s.id] = s.properties.name
			return o
		}, {})
		$('#state-btns').append(states.reduce((e,s) => e.append($('<button>').attr('id', s+'-btn').text(s).attr("title", stateNames[s]).val(s).addClass('state-btn active')), $('<div>')))
		setButtonListeners();
		statesLayer.setStyle(styleFeatures);
		resolve();
	}))
}

function setButtonListeners(){
	$('.state-btn').click((e) => {
		let st = $(e.target);
		let currActive = $('.state-btn.active');
		const isActive = st.hasClass('active');
		currActive.removeClass("active");
		if(currActive.length === 1 && isActive) {
			$('.state-btn').toggleClass('active');
		} else if(currActive.length === 1)  {
			st.toggleClass('active');
		} else {
			st.addClass('active');
		}
	})

	$('#all-states').click(() => {
		$('.state-btn').addClass('active');
	})

	$('.region-btns').click((e) => {
		let rg = $(e.target).val();
		$('.state-btn').removeClass('active');
		
		regions[rg].states.forEach((st) => {
			$('button[value='+ st +']').addClass('active');
		})
		

	})

	$('.geo-section button').click(() => {
		handleStateButtonClick()
		updateSliderRange()
	})

	//Hover events
	$('.region-btns').hover((e) => {
		// $('#map').css('z-index', 3);
		let stList = regions[$(e.target).val()].states
		console.log(regions[$(e.target).val()].states)
		statesLayer.setStyle((feature) => hoverStyleFeatures(feature, stList));
		stList.forEach((st) => {
			$('button[value='+ st +']').addClass('hover');
		})

	}, (e) => {
		// $('#map').css('z-index', 1);
		statesLayer.setStyle(styleFeatures);
		$('.state-btn').removeClass('hover');
	})

	$('#all-states').hover((e) => {
		// $('#map').css('z-index', 3);
		statesLayer.setStyle((feature) => hoverStyleFeatures(feature, states));
		$('.state-btn').addClass('hover');
	}, (e) => {
		// $('#map').css('z-index', 1);
		statesLayer.setStyle(styleFeatures);
		$('.state-btn').removeClass('hover');
	})

	$('.state-btn').hover((e) => {
		// $('#map').css('z-index', 3);
		statesLayer.setStyle((feature) => hoverStyleFeatures(feature, [$(e.target).val()]));
	}, (e) => {
		// $('#map').css('z-index', 1);
		statesLayer.setStyle(styleFeatures);
	})
}

function updateTitle(){
	const years = slider.noUiSlider.get()
	let geo
	if($("#all-states").hasClass('active')) {
		geo = "the Continental US";
	} else if($('.region-btns.active').length) {
		geo = Object.keys(regions).reduce((g, k) => {
			if($("button[value='" + k + "']").hasClass('active')) g = "the " + regions[k].title
			return g
		}, "")
	} else {
		geo = statesData.features.reduce((g, s) => {
			if($("button[value='" + s.id + "']").hasClass('active')) g = s.properties.name
			return g
		}, "")
	}

	years.forEach((y,i) => $('#year-' + (i+1)).numerator({ toValue:y }));
	$('#title-period').text(isMonthly ? 'monthly' : 'daily');
	$('#chart-title .geo').text(geo);
}

function filterPips(value, type) {

    if (type === 0) return -1;
    const min = slider && slider.noUiSlider ? slider.noUiSlider.options.range.min : defaults.sliderRange.min;
    const max = slider && slider.noUiSlider ? slider.noUiSlider.options.range.max : defaults.sliderRange.max;
    if(min === value || max === value) return 1;

    return  value % 20 ? value % 10 ? -1 : 0 : 2;
}

function styleFeatures(feature){
	let styles = {	fillColor: "#fec164",
                weight: 2,
                opacity: 0.25,
                color: '#fec164',
                fillOpacity:0
    		}
	let myOpacity = 0;
	$('.state-btn.active').each((i, e) => {
		if(e.value === feature.id) styles.fillOpacity = 0.25;
	})

	return styles
}

function hoverStyleFeatures(feature, statesList){
	return	{	fillColor: "#f591b2",
                weight: 2,
                opacity: 0.25,
                color: '#f591b2',
                fillOpacity:statesList.indexOf(feature.id) > -1 ? 0.25 : 0
    		}
}

//Set Slider
noUiSlider.create(document.getElementById('slider'), {
    start: defaults.initialYears,
    margin: 2,
    connect: [false,true,false,true,false],
    tooltips:[true,true,true,true],
    step: 1,
    behaviour: 'drag',
    range: defaults.sliderRange,
    pips: {
        mode: 'positions',
        values: [0, 25, 50, 75, 100],
        density:4
        // filter:filterPips,
        // stepped:true
    },
    format: {
        to: value => value,
        from: value => Number(value)
    }
});

//Start map
let map = L.map('map', {
            	center: {
                	lat: 39.5,
                	lng: -98.35
            	},
            	zoom: 4,
            	zoomSnap:0.5,
            	zoomControl: false,
            	attributionControl:false,
            	dragging:false
        	});

let statesLayer = L.geoJSON(statesData.features, {
    style: styleFeatures
}).addTo(map);

map.fitBounds(statesLayer.getBounds(), {padding:[10,10]})

//Set scales for the first time
updateScales();

//Bind Event Listeners
$(window).resize(handleResize);

 //Set States buttons - Then get setting from url (if available)
setGeoButtons().then(getHash);

slider.noUiSlider.on('set', updateAllTemps);

slider.noUiSlider.on('end', function (values, handle) {
	const lineNo = handle < 2 ? 0 : 1

	//Clear previous call attempt so we don't have duplicates
	if(sliderTimeout[lineNo]) clearTimeout(sliderTimeout[lineNo]);
	sliderTimeout[lineNo] = setTimeout(() => getTemps(lineNo), 100)
});

//Make the back button work
if(window.history && window.history.pushState) $(window).on('popstate', getHash)

$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

$("#fahrenheit-btn").click(() => toggleUnits(false));
$("#celsius-btn").click(() => toggleUnits(true));
$("#monthly-btn").click(() => togglePeriod(true));
$("#daily-btn").click(() => togglePeriod(false));
