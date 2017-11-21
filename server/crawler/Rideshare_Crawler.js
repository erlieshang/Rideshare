//Arun Gireesan 2017
//ECE 651

var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var Datastore = require('nedb');

var db = new Datastore({ filename: 'frequent.db', autoload: true});


module.exports = function crawler(options) {


var origin = options.start_city;
var destination = options.end_city;
var kijiji = options.kijiji;
var craigslist = options.craigslist; 

var link_array = [];




//var craigslist url

//var SEARCH_WORD = "ride share";
var MAX_PAGES_TO_VISIT = 10;
var MAX_SEARCH_WORDS = 2;


var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit = [];
var url = new URL(START_URL);
var baseUrl = url.protocol + "//" + url.hostname;


var SEARCH_WORD = [origin,destination];
var word_num = 0;





if (craigslist == false)

{

var START_URL = "https://www.kijiji.ca/b-travel-vacations/kitchener-waterloo/c302l1700212";

pagesToVisit.push(START_URL);
console.log("RideShare Kijiji Cawler");

crawl();

}

else if (kijiji == false)

{

var START_URL = "https://toronto.craigslist.ca/search/rid"

pagesToVisit.push(START_URL);
console.log("RideShare craigslist Cawler");

crawl();

}





function crawl()
{
  if(numPagesVisited >= MAX_PAGES_TO_VISIT)
  {
    console.log("Visited max number of pages");
    return;
  }

  var nextPage = pagesToVisit.pop();

  if (nextPage in pagesVisited)
  {
    // Crawl again if page already visited
    crawl();
  }

  else
  {
    // Visit the new page
    visitPage(nextPage, crawl);
  }
}


function visitPage(url, callback)
{
  // Add page and increment num visited
  pagesVisited[url] = true;
  numPagesVisited++;

  // Request carry out:
  console.log("Visiting page " + url);
  request(url, function(error, response, body)

  {
     // Retrieve status code: HTTP OK is 200
     console.log("Status code: " + response.statusCode);
     if(response.statusCode !== 200)

     {
       callback();
       return;
     }

     // Document Body is parsed here

     var $ = cheerio.load(body);
     var isWordFound = searchForWord($, SEARCH_WORD[word_num]);

     if(isWordFound)
     {
       console.log('Word ' + SEARCH_WORD[word_num] + ' found at page ' + url);

       var city_info = {

        name: SEARCH_WORD[0] +" "+ SEARCH_WORD[1],
        link: url
       };


      db.insert(city_info, function(err,doc) {


       console.log('Inserted', city_info.name);


        });

          
          link_array.push(city_info.name); 
          link_array.push(city_info.link);

         // console.log(link_array);

       //Increase array pointer to next word

       word_num++;

       if (word_num < MAX_SEARCH_WORDS)

        {
          //clear pagesVisited and push start url into array

          pagesVisited ={};
          pagesToVisit.push(START_URL);
          callback();
        }

     }
     else
     {
       collectInternalLinks($);
       // Callback is crawl()
       callback();
     }

  });
}

function searchForWord($, word)

{
  var bodyText = $('html > body').text().toLowerCase();
  return(bodyText.indexOf(word.toLowerCase()) !== -1);
}

function collectInternalLinks($)

{

  var relativeLinks = $("a[href^='/']");
     console.log("Found " + relativeLinks.length + " relative links on page");

     relativeLinks.each(function()
     {
         pagesToVisit.push(baseUrl + $(this).attr('href'));
     });


}

  return link_array;
};
