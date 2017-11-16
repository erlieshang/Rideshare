//Arun Gireesan 2017
//ECE 651

var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var Datastore = require('nedb');
var db = new Datastore({ filename: 'frequent.db', autoload: true});

module.exports = function crawler(options) {


    var common_search = 'toronto';


    db.insert(common_search, function (err, doc) {


        console.log('Inserted', common_search, 'Id No:', doc._id);


    });


    var START_URL = "https://www.kijiji.ca/b-travel-vacations/kitchener-waterloo/c302l1700212";
    var FB_URL = "https://www.facebook.com/groups/225049564330328/"
//var craigslist url

//var SEARCH_WORD = "ride share";
    var MAX_PAGES_TO_VISIT = 10;
    var MAX_SEARCH_WORDS = 5;


    var pagesVisited = {};
    var numPagesVisited = 0;
    var pagesToVisit = [];
    var url = new URL(START_URL);
    var baseUrl = url.protocol + "//" + url.hostname;


    var SEARCH_WORD = ["share", "ride", "taxi", "airport", "driver"];
    var word_num = 0;


    pagesToVisit.push(START_URL);
    console.log("RideShare Kijiji Cawler 1.5");


    crawl();


    function crawl() {
        if (numPagesVisited >= MAX_PAGES_TO_VISIT) {
            console.log("Visited max number of pages");
            return;
        }

        var nextPage = pagesToVisit.pop();

        if (nextPage in pagesVisited) {
            // Crawl again if page already visited
            crawl();
        }

        else {
            // Visit the new page
            visitPage(nextPage, crawl);
        }
    }


    function visitPage(url, callback) {
        // Add page and increment num visited
        pagesVisited[url] = true;
        numPagesVisited++;

        // Request carry out:
        console.log("Visiting page " + url);
        request(url, function (error, response, body) {
            // Retrieve status code: HTTP OK is 200
            console.log("Status code: " + response.statusCode);
            if (response.statusCode !== 200) {
                callback();
                return;
            }

            // Document Body is parsed here

            var $ = cheerio.load(body);
            var isWordFound = searchForWord($, SEARCH_WORD[word_num]);

            if (isWordFound) {
                console.log('Word ' + SEARCH_WORD[word_num] + ' found at page ' + url);

                //Increase array pointer to next word

                word_num++;

                if (word_num < MAX_SEARCH_WORDS) {
                    //clear pagesVisited and push start url into array

                    pagesVisited = {};
                    pagesToVisit.push(START_URL);
                    callback();
                }

            }
            else {
                collectInternalLinks($);
                // Callback is crawl()
                callback();
            }

        });
    }

    function searchForWord($, word) {
        var bodyText = $('html > body').text().toLowerCase();
        return (bodyText.indexOf(word.toLowerCase()) !== -1);
    }

    function collectInternalLinks($) {

        var relativeLinks = $("a[href^='/']");
        console.log("Found " + relativeLinks.length + " relative links on page");

        relativeLinks.each(function () {
            pagesToVisit.push(baseUrl + $(this).attr('href'));
        });

        //var absoluteLinks = $("a[href^='http']");
//  absoluteLinks.each(function()
        //{
        //allAbsoluteLinks.push($(this).attr('href'));
//  });
    }


//fb_/craigslist crawl

    function fb_crawl() {
        if (numPagesVisited >= MAX_PAGES_TO_VISIT) {
            console.log("Visited max number of pages");
            return;
        }

        var nextPage = pagesToVisit.pop();

        if (nextPage in pagesVisited) {
            // Crawl again if page already visited
            fb_crawl();
        }

        else {
            // Visit the new page
            visitPage(nextPage, crawl);
        }
    }


    function fb_visitPage(url, callback) {
        // Add page and increment num visited
        pagesVisited[url] = true;
        numPagesVisited++;

        // Request carry out:
        console.log("Visiting page " + url);
        request(url, function (error, response, body) {
            // Retrieve status code: HTTP OK is 200
            console.log("Status code: " + response.statusCode);
            if (response.statusCode !== 200) {
                callback();
                return;
            }

            // Document Body is parsed here

            var $ = cheerio.load(body);
            var isWordFound = searchForWord($, SEARCH_WORD[word_num]);

            if (isWordFound) {
                console.log('Word ' + SEARCH_WORD[word_num] + ' found at page ' + url);

                //Increase array pointer to next word

                word_num++;

                if (word_num < MAX_SEARCH_WORDS) {
                    //clear pagesVisited and push start url into array

                    pagesVisited = {};
                    pagesToVisit.push(START_URL);
                    callback();
                }

            }
            else {
                collectInternalLinks($);
                // Callback is crawl()
                callback();
            }

        });
    }

    return link_array;
};
