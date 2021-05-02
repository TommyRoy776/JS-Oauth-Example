const fs = require("fs");
const url = require("url");
const http = require("http");
const https = require("https");
const { YTAPI } = require("./API.json");

const port = 3000;
const server = http.createServer();
server.listen(port);
server.on("request", request_handler);
let count = 0;
let results =""

function request_handler(req, res) {
    if (req.url === "/") {
        const form = fs.createReadStream("./index.html");
        res.writeHead(200, { "Content-Type": "text/html" })
        form.pipe(res); //transmit data to writable
    } else if (req.url.startsWith("/search")) {
        let { Channel } = url.parse(req.url, true).query;  //testing channel id: UChXKjLEzAB1K7EZQey7Fm1Q
        get_channel_information(Channel, res);
    } else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(`<h1>404 not found &#128549</h1>`)
    }
}

function get_channel_information(channel, res) {
    const channel_stat = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channel}&key=${YTAPI}`;
    const channel_snippet = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channel}&key=${YTAPI}`
    https.request(channel_snippet, { method: "GET" }, (stream) => getYT(stream,"snippet")).end(
           () =>{ 
              https.request(channel_stat, { method: "GET" }, (stream) => getYT(stream,"stat")).end()
           });

    function getYT(stream,type) {
        let channel_data = "";
        stream.on("data", (chunk) => {
            channel_data += chunk;
        })
        stream.on("end", () => {
            serve_results(channel_data, res,type)
        })
    }
}

function serve_results(channel_data, res,type) {
    let channel_obj = JSON.parse(channel_data);
    if(type === "snippet"){
        let snippet = channel_obj.items[0].snippet
        results += formatJob(snippet);
    }else{
        let stat = channel_obj.items[0].statistics
        results += formatJob2(stat);
    }
    count++;
    if(count === 2){
        results = `<h1>Youtube Channel Result:</h1>${results}`
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8"  }); //avoid Mojibake
        res.end(results);
        count = 0;   // reset temp 
        results = "";
    }

    function formatJob(snippet) {
        return `<h2>Channel:${snippet.title}</h2>
           <ul>
            <li>Description: ${snippet.description}</li>
            <li>publishedAt: ${snippet.publishedAt}</li>
          </ul> 
          <img src=${snippet.thumbnails.medium.url} alt="thumbnail">`;
    }
    function formatJob2(stat) {
        return `<h2>Statistics:</h2>
           <ul>
            <li>viewCount: ${stat.viewCount}</li>
            <li>subscriberCount: ${stat.subscriberCount}</li>
            <li>videoCount:${stat.videoCount}</li>
          </ul>`;
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