var express = require('express');
var router = express.Router();
var bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({extended: false});
var iconv = require('iconv-lite');
var mysql = require('mysql');
const request = require('request');
var parseString = require('xml2js').parseString;



var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '0153',
  database : 'otus'
});

connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
});


function change_symbol(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
 


router.get('/', function(req, res, next) {
	connection.query("select * from rss_link", (err, results)=> {  
		if (err) {console.log(err);}
  		res.render('index', { title: 'Сохранения `RSS` рассылок', rss_list: results });
   });
});


//http://rss.dw.com/xml/rss-ru-all

router.post("/save_rss", urlencodedParser, (request_rss, response)=> {

	request({ uri: request_rss.body.rss_name, encoding: null}, (error, response_rss, body)=> {
  	  console.error('error:', error); 
      
      //var str_win =  iconv.decode(Buffer.from(body), 'win1251');
      var str_win =  iconv.decode(Buffer.from(body), 'utf8');
           
  	  parseString(str_win, function (err, result) {
  	      connection.query("Insert rss_link VALUES (0,'"+change_symbol(request_rss.body.rss_name)+"', '"+result.rss.channel[0].title+"', "+result.rss.channel[0].item.length+", NOW())", (err, results)=> {  
                    if (err) {console.log(err);}
                    console.log('rss_link обновлён');

                    var item_data=result.rss.channel[0].item;
                    var convert_data=[];

                    for (var i=0; i<item_data.length; i++) {
                    	convert_data[i]={};
                    	Object.keys(item_data[i]).forEach(function(key, index) { 
                    		convert_data[i][key]=change_symbol(item_data[i][key].toString());
  					          });
                    }

                    connection.query("Insert rss_data VALUES (0,"+results.insertId+",'"+JSON.stringify(convert_data)+"')", (err, results)=> {
                     		 if (err) {console.log(err);}
                    		 console.log('rss_data обновлён');
                    		 connection.query("select * from rss_link", (err, results)=> {  
  								         if (err) {console.log(err);}
  								         response.send(results);
  						           });
                    });  

          });
	    	//response.send(JSON.stringify(result.rss.channel[0]));
		  });

	 });
});


router.post("/load_rss", urlencodedParser, (request_rss, response)=> {
	connection.query("select * from rss_data where id_rss="+request_rss.body.id_rss, (err, results)=> {
		 response.send(results[0].data);
	});
});

module.exports = router;
