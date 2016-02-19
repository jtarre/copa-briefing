var worker = require('node_helper');

var _ = require('lodash');
var streakapi = require('streakapi');
var streak = new streakapi.Streak(worker.config.streakApi);

var mandrill_client = new mandrill.Mandrill(worker.config.mandrillApi);

var stageEnum = {
	'5005': 'Phone Call',
	'5012': 'Meeting Scheduled',
	'5006': 'Onsite',
	'5014': 'Invited to Match'
};

var stageList = ['5005', '5012', '5006', '5014'];

console.log('Starting pipeline transformation...');

streak.Pipelines.getBoxes(worker.config.pipelineKey).then(function(boxes) {
	var boxesStagesNCities = _.map(boxes, function(box) {
		return {city: box.fields['1003'], stageKey: box.stageKey};
	});

	console.log('first transform box: ', boxesStagesNCities[0]);

	var filteredStagesNCities = _.filter(boxesStagesNCities, function(box) {
		return _.includes(stageList, box.stageKey);
	});

	console.log('filter transform: ', filteredStagesNCities[0]);

	var stageNamesNCities = _.map(filteredStagesNCities, function(box) {
		return {city: box.city, stageName: stageEnum[box.stageKey]};
	});

	console.log('stage name: ', stageNamesNCities[0]);

	var groupByStage = _.groupBy(stageNamesNCities, 'stageName');

	console.log('group by: ', groupByStage['Meeting Scheduled'][0]);

	var countByCity = _.map(groupByStage, function(box, stageName) {
		return {stageName: stageName, cityCount: _.countBy(box, 'city')};
	});

	console.log('count by: ', countByCity);
	// omg it worked

	// turn into html string
	var body = "Morning CoPa!<br><br>Here's a daily status report, " +  
				"pulled from the Master Pipeline, " + 
				"that shows how we're doing in each city.";
	_.forEach(countByCity, function(stage) {
		body += "<h3>" + stage.stageName  + "</h3><ul>";
		_.forEach(stage.cityCount, function(cityCount, city) {
			body += "<li><strong>" + city + "</strong>: " + cityCount + "</li>";
		});
		body += "</ul>";
	});
	console.log('html body: ', body);

	var message = {
    "html": body,
    //"text": "Example text content",
    "subject": "Daily CoPa Streak Briefing",
    "from_email": "copa-helper@ventureforamerica.org",
    "from_name": "CoPa",
    "to": [{
            "email": "jason@ventureforamerica.org",
            "name": "Jason",
            "type": "to"
        }]
    // "headers": {
    //     "Reply-To": "message.reply@example.com"
    // },
	};

	mandrill_client.messages.send({"message": message}, function(result) {
	    console.log(result);
	    /*
	    [{
	            "email": "recipient.email@example.com",
	            "status": "sent",
	            "reject_reason": "hard-bounce",
	            "_id": "abc123abc123abc123abc123abc123"
	        }]
	    */
	}, function(e) {
	    // Mandrill returns the error as an object with name and message keys
	    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
	    // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
	});

});