var express = require('express');
var session = require('express-session');
var router = express.Router();
var glob = require('glob');
var path = require('path');
var once = require('once');
var extend = require('extend');
var fs = require('fs');
var yaml = require('js-yaml');
var url = require('url');

// Initialise express-session so we can do some fake sign stuff
router.use(session({
  saveUninitialized: false,
  resave: false,
  secret: 'doesnt-matter-because-its-a-prototype'
}));

/**
 * Expose variables to all routes
 */
router.use(function (req, res, next) {
  res.locals.price_text = '£3 inc VAT';

  // Pass the entire session through to the frontend
  res.locals.session = req.session;

  res.locals.data = {};

  res.locals.path = '/' + req.path.split('/')[1];

  // get
  for(var item in req.query) {
    if(req.query.hasOwnProperty(item)) {
      res.locals.data[item] = req.query[item];
    }
  }

  // post
  for(var item in req.body) {
    if(req.body.hasOwnProperty(item)) {
      res.locals.data[item] = req.body[item];
    }
  }

  if(typeof res.locals.data.title_number !== 'undefined') {

    require(path.join(__dirname, 'views', req.path.split('/')[1], 'data'))(res.locals.data.title_number, function(titles) {
      res.locals.title = titles.shift();

      // console.log('---');
      // console.log(yaml.safeDump(res.locals.title));
      // console.log('---');

      next();

    });
  } else {
    next();
  }

});

/**
 * Main index page route
 */
router.get('/', function (req, res) {
  var prototypes = [];

  glob(path.join(__dirname, 'views/**/prototype.yaml'), function(err, files) {
    files.forEach(function(filename) {

      var prototype = yaml.safeLoad(fs.readFileSync(filename, 'utf8'));

      prototype.version =  path.dirname(path.relative(path.join(__dirname, 'views/'), filename));

      prototypes.push(prototype);
    });

    // Sort by date
    prototypes = prototypes.sort(function(a, b) {
      if (a.date > b.date) {
        return -1;
      }

      if (a.date < b.date) {
        return 1;
      }

      return 0;
    });

    res.render('index', {
      prototypes: prototypes
    });
  });
});

/**
 * Database debug route
 */
router.get('/database', function (req, res) {
  var titles = require('../data/titles');

  var files = glob.sync(path.join(__dirname, 'views/**/prototype.yaml'));
  var prototypes = [];

  files.forEach(function(filename) {
    var prototype = yaml.safeLoad(fs.readFileSync(filename, 'utf8'));
    prototype.version =  path.dirname(path.relative(path.join(__dirname, 'views/'), filename));
    prototypes.push(prototype);
  });

  // Sort by date
  prototypes = prototypes.sort(function(a, b) {
    if (a.date > b.date) {
      return -1;
    }

    if (a.date < b.date) {
      return 1;
    }

    return 0;
  });

  var data = {
    titles: titles,
    prototypeVersion: prototypes[0].version,
    examples: []
  };

  var examples = [

    {
      description: 'Freehold title with one proprietor',
      test: function(title) {
        return title.tenure === 'Freehold' && title.proprietors.length === 1 && !title.is_caution_title;
      },
      match: false
    },

    {
      description: 'Freehold title with multiple proprietors',
      test: function(title) {
        return title.tenure === 'Freehold' && title.proprietors.length === 3 && !title.is_caution_title;
      },
      match: false
    },

    {
      description: 'Freehold title with company proprietor',
      test: function(title) {
        return title.tenure === 'Freehold' && (typeof title.proprietors[0].co_reg_no !== 'undefined') && !title.is_caution_title;
      },
      match: false
    },

    {
      description: 'Freehold title with non UK company proprietor',
      test: function(title) {
        return title.tenure === 'Freehold' && title.proprietors[0].company_location && !title.is_caution_title;
      },
      match: false
    },

    {
      description: 'Freehold title where proprietor has multiple addresses',
      test: function(title) {
        return title.tenure === 'Freehold' && title.proprietors[0].addresses.length > 1 && !title.is_caution_title;
      },
      match: false
    },

    {
      description: 'Leasehold title with one leaseholder',
      test: function(title) {
        return title.tenure === 'Leasehold' && title.proprietors.length === 1 && !title.is_caution_title;
      },
      match: false
    },

    {
      description: 'Leasehold title with an A1 note',
      test: function(title) {
        return title.tenure === 'Leasehold' && title.property_notes.length > 0 && !title.is_caution_title;
      },
      match: false
    },

    {
      description: 'Leasehold caution title',
      test: function(title) {
        return title.tenure === 'Leasehold' && title.is_caution_title;
      },
      match: false
    },

    {
      description: 'Freehold caution title',
      test: function(title) {
        return title.tenure === 'Freehold' && title.is_caution_title;
      },
      match: false
    },

    {
      description: 'Freehold title with no lender',
      test: function(title) {
        return title.tenure === 'Freehold' && title.lenders.length === 0;
      },
      match: false
    },

    {
      description: 'No data',
      test: function(title) {
        return typeof title.data === 'undefined';
      },
      match: false
    },

    // Freehold title with no map
    // Freehold title with map

  ];

  // Search for titles which match specific critera and pass them to the template
  // This is to help user researchers with testing specific things
  titles.forEach(function(title) {

    examples.forEach(function(example) {
      if(!example.match && example.test(title)) {
        var exampleTitle = extend(true, {}, title);
        exampleTitle.description = example.description;
        example.match = exampleTitle;
      }
    });

  });

  examples.forEach(function(example) {

    if(example.match) {
      data.examples.push(example.match);
    } else {
      console.log('No match found for example:', example.description);
    }

  });

  res.render('titles', data);
});

// Mount version specific routes
glob(path.join(__dirname, 'views/**/routes.js'), function(err, files) {
  if(err) {
    throw err;
  }

  files.forEach(function(file) {
    var prototypeVersion = path.dirname(path.relative(path.join(__dirname, 'views/'), file));

    // Mount all routes exposed onto a path reflecting the prototype version
    router.use('/' + prototypeVersion, require(file));

  });
});

module.exports = router;
