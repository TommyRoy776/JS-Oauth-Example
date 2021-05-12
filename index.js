const fs = require("fs");
const url = require("url");
const http = require("http");
const https = require("https");
const { YTAPI } = require("./API.json"); //You can choose to use mine or not :)
const crypto = require("crypto");
const querystring = require("querystring");
const {client_id,auth_uri,token_uri,client_secret,scope,redirect_uris} = require("./client_id.json"); //You can choose to use mine or not :)

const port = 3000;
const server = http.createServer();
server.listen(port);
server.on("request", request_handler);
let count = 0;
let results =""
const Myall_sessions = [];
function request_handler(req, res) {
    if (req.url === "/") {
        const form = fs.createReadStream("./index.html");
        res.writeHead(200, { "Content-Type": "text/html" })
        form.pipe(res); //transmit data to writable
    }else if (req.url.startsWith("/search")) {
        let { Channel } = url.parse(req.url, true).query;  //testing channel id: UChXKjLEzAB1K7EZQey7Fm1Q
        if(Channel === ""){
            not_found(res);
        }
        const state = crypto.randomBytes(20).toString("hex"); 
        Myall_sessions.push({Channel,state}); //save to array with a state 
        redirect_to_googley(state,res); //start oAuth2 process
        //get_channel_information(Channel, res);
    }else if(req.url.startsWith("/receive_code")){
        const {code, state,scope} = url.parse(req.url, true).query;
		let session = Myall_sessions.find(session => session.state === state);
        if(code === undefined || state === undefined || session === undefined){ //exception handler
			not_found(res);
			return;
		}
		const {Channel} = session;
		send_access_token_request(code,Channel, res);
    }else {
        not_found(res);
    }
}

function get_channel_information(channel, res,token) { //Start the process of YT API
    const channel_stat = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channel}&key=${YTAPI}`;
    const channel_snippet = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channel}&key=${YTAPI}`
    https.request(channel_snippet, { method: "GET" }, (stream) => getYT(stream,"snippet")).end( //request for snippet
           () =>{ 
              https.request(channel_stat, { method: "GET" }, (stream) => getYT(stream,"stat")).end() //after snippet request, request for statistics
           });

    function getYT(stream,type) {
        let channel_data = "";
        stream.on("data", (chunk) => {
            channel_data += chunk;
        })
        stream.on("end", () => {
            serve_results(channel_data, res,type,token)
        })
    }
}

function serve_results(channel_data, res,type,token) {
    let channel_obj = JSON.parse(channel_data);
    if(channel_obj.items === undefined){ //if the channel is invalid, return 404 page
        not_found(res);
    }
    if(type === "snippet"){ //parse snippet data 
        let snippet = channel_obj.items[0].snippet
        results += formatJob(snippet);
    }else{  //parse statistics data 
        let stat = channel_obj.items[0].statistics
        results += formatJob2(stat);
    }
    count++;
    if(count === 2){ //after both info got 
        results = `<h1>Youtube Channel Result:</h1>${results}`
     /*   res.writeHead(200, { "Content-Type": "text/html; charset=utf-8"  }); //avoid Mojibake, testing result in html
        res.end(results);    */  
        generateFile(results,token,res); //call function to write to google drive
        count = 0;   // reset counter
        results = ""; // reset temp
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

function generateFile(result,access_token,res){ //post to google drive
    const task_endpoint = "https://www.googleapis.com/upload/drive/v3/files?uploadType=media";
    const post_data = result;
    const options = {
		method: "POST",
		headers: {
			"Content-Type": "text/plain",
			Authorization: `Bearer ${access_token}`
		}
	}
    https.request(
		task_endpoint, 
		options, 
		(task_stream) => process_stream(task_stream, receive_task_response, res)
	).end(post_data);

}

function receive_task_response(body,res){ //get the return information of google drive and show the file page  
    const results = JSON.parse(body);
    console.log(results);
    res.writeHead(302, {Location: `https://drive.google.com/open?id=${results.id}`})
	   .end();
}

function process_stream (stream, callback , ...args){
	let body = "";
	stream.on("data", chunk => body += chunk);
	stream.on("end", () => callback(body, ...args));
}

function send_access_token_request(code, user_input, res){ //request for token so that file can be wriiten to google drive
    const grant_type = "authorization_code";
    const redirect_uri = redirect_uris
	const post_data = querystring.stringify({client_id, client_secret, code,redirect_uri,grant_type});
	let options = {
		method: "POST",
		headers:{
			"Content-Type":"application/x-www-form-urlencoded"
		}
	}
	https.request(
		token_uri, 
		options, 
		(token_stream) => process_stream(token_stream, receive_access_token, user_input, res)
	).end(post_data);
}

function receive_access_token(body,user_input,res){ //After token got, then request for channel information
    const token = JSON.parse(body);
    console.log(token)
    get_channel_information(user_input,res,token.access_token);
}

function redirect_to_googley(state,res){ //to grant permission to my client ID
     const response_type = "code";
     const redirect_uri = redirect_uris; //  /receive_code
     const access_type = "offline";
    let googleyUri = querystring.stringify({client_id, scope,response_type,access_type ,state,redirect_uri});
    res.writeHead(302, {Location: `${auth_uri}?${googleyUri}`})
    .end();
}

function not_found(res){
	res.writeHead(404, {"Content-Type": "text/html"});
	res.end(`<h1>404 not found &#128549</h1>`);
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
*　　　　　　　　　┃　　　┃ +          My last made me feel like I would never try again
*　　　　　　　　　┃　　　┃            But when I saw you, I felt something I never felt
*　　　　　　　　　┃　　　┃　　+
*　　　　　　　　　┃　 　　┗━━━┓ + +
*　　　　　　　　　┃ 　　　　　　　┣┓
*　　　　　　　　　┃ 　　　　　　　┏┛
*　　　　　　　　　┗┓┓┏━┳┓┏┛ + + + +
*　　　　　　　　　　┃┫┫　┃┫┫
*　　　　　　　　　　┗┻┛　┗┻┛+ + + +
*/