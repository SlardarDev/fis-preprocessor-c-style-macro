var fs = require('fs');
var fis = require('fis');
fis.project.setProjectRoot('.');
fs.readFile('./origin.js', 'utf8', function(err, data) {

	var preprocessor = require('../index.js');

	c = preprocessor(data,
        fis.file.wrap('./origin.js'),
		{
			file: {
				include: /.js$/i
			}
		}
	);
	fs.writeFile('./result.js', c);
});

