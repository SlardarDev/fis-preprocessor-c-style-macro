var fs = require('fs');
fs.readFile('./origin.js', 'utf8', function(err, data) {

	var preprocessor = require('../index.js');

	c = preprocessor(data, 
		{
			id: './origin.js', 
			rExt: '.js'
		}, 
		{
			file: {
				include: /.js$/i
			}
		}
	);
	fs.writeFile('./result.js', c);
});

