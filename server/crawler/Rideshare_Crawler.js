//Arun Gireesan 2017
//ECE 651

var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var async = require('asyncawait/async');
var await = require('asyncawait/await');


var Datastore = require('nedb');
var link_array = [];
var return_array = [];
var MAX_PAGES_TO_VISIT = 10;
var MAX_SEARCH_WORDS = 2;
var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit = [];
var url;
var baseUrl;
var START_URL;
var num = 2;


var word_num = 0;
var initialized = false;
var db = new Datastore({ filename: 'frequent.db', autoload: true});
var found = false;
var kijiji;
var craigslist;

var SEARCH_WORD = [] ;

var options;

//hello();

//async function hello()


//{

/*option = {
                                       'start_city': "waterloo",
                                       'end_city': "toronto",
                                      'kijiji': true ,
                                       'craigslist': false
                                  };;


var damn = await crawler(option);


console.log (damn);

}*/


module.exports =  async function crawler(option_input)


//async function crawler (option_input)
{



options = option_input;

var origin = options.start_city;
var destination = options.end_city;
kijiji = options.kijiji;
craigslist = options.craigslist; 
SEARCH_WORD = [origin+" to "+destination,"rideshare "+origin+" to "+destination] ;



if (craigslist == false)

{

 //START_URL = "https://www.kijiji.ca/b-travel-vacations/kitchener-waterloo/c302l1700212";

START_URL = "https://www.kijiji.ca/b-ontario/"+origin+"-to-"+destination+"/k0l9004?dc=true"

pagesToVisit.push(START_URL);
console.log("RideShare Kijiji Cawler");

url = new URL(START_URL);
 baseUrl = url.protocol + "//" + url.hostname;

initialized = true;

return_array = await crawl(options);

}

else if (kijiji == false)

{

START_URL = "https://toronto.craigslist.ca/search/rid?query="+origin+"+to+"+destination;

pagesToVisit.push(START_URL);
console.log("RideShare Craigslist Cawler");

 url = new URL(START_URL);
 baseUrl = url.protocol + "//" + url.hostname;

initialized = true;

return_array = await crawl(options);



}

return link_array;

}






async function crawl(option_input)

{


if(found)
  {
    console.log("Success!");
   // console.log(link_array);
    return link_array;
  }

if(numPagesVisited >= MAX_PAGES_TO_VISIT)
  {
    console.log("Visited max number of pages");
    link_array.push(START_URL);
    // console.log(link_array);

    return link_array;
  }


  var nextPage = pagesToVisit.pop();

 return_array =  await visitpage(nextPage,crawl);
 return return_array;

  pagesVisited[nextPage] = true;
  numPagesVisited++;
  

 }



 function visitpage(url,callback) {

return new Promise(function (resolve, reject) {

  // Add page and increment num visited
  pagesVisited[url] = true;
  numPagesVisited++;

  // Request carry out:
  console.log("Visiting page " + url);
  request(url, function(error, response, body)

  {

    if (!error && response.statusCode == 200) {
     // Retrieve status code: HTTP OK is 200
    // console.log("Status code: " + response.statusCode);
     // Document Body is parsed here

     var $ = cheerio.load(body);
     var isWordFound = searchForWord($, SEARCH_WORD[word_num]);

     if(isWordFound)
     {
      // console.log('Word ' + SEARCH_WORD[word_num] + ' found at page ' + url);

       var city_info = {

        name: SEARCH_WORD[0] +" "+ SEARCH_WORD[1],
        link: url
       };

        db.insert(city_info, function(err,doc) {


     //  console.log('Inserted', city_info.name);


        });
          
          //link_array.push(city_info.name); 
          link_array.push(city_info.link);

          var relativeLinks = $("a[href^='/']");
         // console.log("Found " + relativeLinks.length + " relative links on page");

         if (kijiji == true) var slice_links = relativeLinks.slice(45,50);
        else if (craigslist == true) var slice_links = relativeLinks.slice(10,15);


         slice_links.each(function()
          {

          
         link_array.push(baseUrl + $(this).attr('href'));

       
          });

          found = true;

         callback(options);

     }

     else
     {
      link_array.push(START_URL);

       var relativeLinks = $("a[href^='/']");
     //console.log("Found " + relativeLinks.length + " relative links on page");

     relativeLinks.each(function()
     {
         pagesToVisit.push(baseUrl + $(this).attr('href'));
     });

       // Callback is crawl()
      callback(options);
      //crawl(options);
     }
resolve(body);
      } else {
        reject(error);
      }  });


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
     //console.log("Found " + relativeLinks.length + " relative links on page");

     relativeLinks.each(function()
     {
         pagesToVisit.push(baseUrl + $(this).attr('href'));
     });


}




