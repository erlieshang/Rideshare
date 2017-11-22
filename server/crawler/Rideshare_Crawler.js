//Arun Gireesan 2017
//ECE 651

var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');


var Datastore = require('nedb');
var link_array = [];
var MAX_PAGES_TO_VISIT = 10;
var MAX_SEARCH_WORDS = 2;
var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit = [];
var START_URL = "https://toronto.craigslist.ca/search/rid";

var url = new URL(START_URL);
var baseUrl = url.protocol + "//" + url.hostname;
var word_num = 0;
var initialized = false;
var db = new Datastore({ filename: 'frequent.db', autoload: true});
var found = false;

var SEARCH_WORD = [];

var options;

module.exports = function crawler(option_input) {

//function crawler(options) 

options = option_input;

var origin = options.start_city;
var destination = options.end_city;
var kijiji = options.kijiji;
var craigslist = options.craigslist; 
SEARCH_WORD = [origin,destination];

if (initialized == false)

{


if (craigslist == false)

{

var START_URL = "https://www.kijiji.ca/b-travel-vacations/kitchener-waterloo/c302l1700212";

pagesToVisit.push(START_URL);
console.log("RideShare Kijiji Cawler");

initialized = true;

crawler(options);

}

else if (kijiji == false)

{

var START_URL = "https://toronto.craigslist.ca/search/rid";

pagesToVisit.push(START_URL);
console.log("RideShare craigslist Cawler");

initialized = true;

crawler(options);

}


}

else

{


if(found)
  {
    console.log("Success!");
    console.log(link_array);

    return link_array;
  }

if(numPagesVisited >= MAX_PAGES_TO_VISIT)
  {
    console.log("Visited max number of pages");
    return;
  }

  var nextPage = pagesToVisit.pop();


  if (nextPage in pagesVisited)
  {
    // Crawl again if page already visited
    crawler(options);
  }

  else
  {
    // Visit the new page
    visitPage(nextPage, crawler);
  }

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
       callback(options);
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


          
      if (word_num>0)

       {

        db.insert(city_info, function(err,doc) {


       console.log('Inserted', city_info.name);


        });
          
          link_array.push(city_info.name); 
          link_array.push(city_info.link);
          found = true;
          callback(options);

       }


         // console.log(link_array);

       //Increase array pointer to next word

       word_num++;

       if (word_num < MAX_SEARCH_WORDS)

        {
          //clear pagesVisited and push start url into array

          pagesVisited ={};
          pagesToVisit.push(START_URL);
          callback(options);
        }

     }
     else
     {
       collectInternalLinks($);
       // Callback is crawler()
       callback(options);
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


