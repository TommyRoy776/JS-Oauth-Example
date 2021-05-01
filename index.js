const fs = require("fs");
const url = require("url");
const http = require("http");
const https = require("https");
const {YTAPI} = require("./API.json");

const port = 3000;
const server = http.createServer();
server.listen(port);
server.on("request", request_handler);

function request_handler(req,res){
    if(req.url === "/"){
        const form = fs.createReadStream("./index.html");
		res.writeHead(200, {"Content-Type": "text/html"}) 
		form.pipe(res); //transmit data to writable
    }else if(req.url.startsWith("/search")){
        let {channel} = url.parse(req.url,true).query;
		get_channel_information(channel, res);
    }else{
        res.writeHead(404,{"Content-Type":"text/html"});
        res.end(`<h1>404 not found &#128549</h1>`)
    }
}

function get_channel_information(channel, res){
      const channel_stat = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channel}&key=${YTAPI}`;
      const channel_snippet = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channel}&key=${YTAPI}`
      https.request(channel_snippet,{method:"GET"},getYT).end();
      function getYT(stream){
          let channel_data = "";
          stream.on("data",(chunk) => {
              channel_data+=chunk;
          })
          stream.on("end",() =>{
             serve_results(channel_data,res)
          } )
      }
}

function serve_results(channel_data, res){
    let channel_obj = JSON.parse(channel_data);
    results = `<h1>GitHub Jobs Results:</h1>`
	res.writeHead(200, {"Content-Type": "text/html"});
	res.end(results);
    function formatJob({title, description, url}){
		return `<h2><a href="${url}">${title}</a></h2>${description}`;
	}
}




/*
*　　　　　　　　┏┓　　　┏┓+ +
*　　　　　　　┏┛┻━━━┛┻┓ + +
*　　　　　　　┃　　　　　　　┃ 　
*　　　　　　　┃　　　━　　　┃ ++ + + +
*　　　　　　 ████━████ ┃+
*　　　　　　　┃　　　　　　　┃ +
*　　　　　　　┃　　　┻　　　┃
*　　　　　　　┃　　　　　　　┃ + +
*　　　　　　　┗━┓　　　┏━┛
*　　　　　　　　　┃　　　┃　　　　　　　　　　　
*　　　　　　　　　┃　　　┃ + + + +
*　　　　　　　　　┃　　　┃　　　　Code is far away from bug with the animal protecting　　　　　　　
*　　　　　　　　　┃　　　┃ + 　　　
*　　　　　　　　　┃　　　┃
*　　　　　　　　　┃　　　┃　　+　　　　　　　　　
*　　　　　　　　　┃　 　　┗━━━┓ + +
*　　　　　　　　　┃ 　　　　　　　┣┓
*　　　　　　　　　┃ 　　　　　　　┏┛
*　　　　　　　　　┗┓┓┏━┳┓┏┛ + + + +
*　　　　　　　　　　┃┫┫　┃┫┫
*　　　　　　　　　　┗┻┛　┗┻┛+ + + +
*/