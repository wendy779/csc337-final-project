/**
 * Author: Aerror Li, Lingxiao Meng
 * Class: CSC337 
 * Purpose: the whole server.js.
 */
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser'); //npm install cookie-parser
const crypto = require('crypto');

// const host = '198.199.85.146';
// const port = 80;

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); 


var router = express.Router();
 
var fs = require('fs');
var multer  = require('multer');
 

// Use hard disk storage mode to set the path and filename of the received file
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // path to save the output after receiving the file (if it does not exist, you need to create it)
        cb(null, 'upload/');   
    },
    filename: function (req, file, cb) {
        // Set the save file name to timestamp + original file name
        cb(null, Date.now() + "-" + file.originalname); 
    }
});
 

// Create folder This code is used so that we can find out if the folder exists on the disk, and if not, it can be created automatically, instead of creating it manually in advance. If we don't use this code, we will need to create the current folder manually before we can use it again
var createFolder = function(folder){
    try{
        // Test the user permissions of the file or directory specified by path, which we use to check if the file exists
        // If the file path does not exist, an error "no such file or directory" will be thrown.
        fs.accessSync(folder);
    }catch(e){
        // Folder does not exist, create the file directory synchronized.
        fs.mkdirSync(folder);
    } 
};
 
var uploadFolder = './upload/';
createFolder(uploadFolder);
 
// Create the multer object
var upload = multer({ storage: storage });
 
const db = mongoose.connection;
const mongoDBURL = 'mongodb://localhost:27017/job'; // the name of the collection is "job"
const iterations = 1000;

var sessionKeys = {};
var nameList = [];

var Schema = mongoose.Schema;
var UserSchema = new Schema({
    username: String,
    // password: String,  //todo: change, use salt&hash instead
    salt: String,
    hash: String,
    email: String,
});
var ResumeSchema = new Schema({
    username: String,
    gender: String,
    name: String,
    phoneNum: String,
	birthday:String,
	avatar:String,
    education: String,
    area: String,
    desc: String,
});
var JobSchema = new Schema({
    jobTitle: String,
    compName: String,
    jobArea: String,
    resumeList: Array,
});
var User = mongoose.model('User', UserSchema);
var Resume = mongoose.model('Resume', ResumeSchema);
var Job = mongoose.model('Job', JobSchema);
 
mongoose.connect(mongoDBURL, { useNewUrlParser: true });
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

function authenticate(req, res, next) {
    console.log(req.cookies);
    console.log(sessionKeys);
    if (Object.keys(req.cookies).length > 0) {
      let u = req.cookies.login.username;
      let key = req.cookies.login.key;
      if ( Object.keys(sessionKeys[u]).length > 0 && sessionKeys[u][0] == key) {
        next();
      } else {
        res.send('NOT ALLOWED');
      }
    } else {
      res.send('NOT ALLOWED');
    }
}

function updateSessions() {
    //console.log('session update function');
    let now = Date.now();
    for (e in sessionKeys) {
      if (sessionKeys[e][1] < (now - 20000)) {
        delete sessionKeys[e];
      }
    }
}
setInterval(updateSessions, 2000); //change later

app.use(cookieParser());
app.use('/upload', express.static('upload'));
app.use('/', express.static('public_html'));
app.use('/user.html', authenticate); // not sure
app.use('/addJob.html', (req, res) => {
    let jobObj = req.body;
    console.log(jobObj);
    var j = mongoose.model('Job', JobSchema);
    j.find({jobTitle: jobObj.jTitle, compName: jobObj.compName}).exec(function(error, results){
        if(results.length == 0){ // if doesn't exist
            var job = new Job(jobObj);
            job.save(function(err) {if(err) console.log('fail to add');});
            // console.log("finish adding the job");
            // res.send('finish adding');
        }
    })
 });
 //  get job information by company name
app.get('/job/search/:companyName', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    let keyword = new RegExp(decodeURIComponent(req.params.companyName));
    Job.find({compName: keyword}).exec(function(error, results){
        res.send(JSON.stringify(results));
    })
});
//  search jobs by job title
app.post('/job/searchByTitle/', (req, res) => {
    //res.setHeader('Content-Type', 'text/plain');
	 let jobObj = req.body;
    let keyword = new RegExp(decodeURIComponent(jobObj.jobTitle));
	console.log(jobObj)
	console.log(keyword)
    Job.find({jobTitle: keyword}).exec(function(error, results){
        res.send(JSON.stringify(results));
    })
});
// apply job under the job informations
app.post('/job/apply', (req, res) => {
    let jobObj = req.body;
    console.log(jobObj);
    req.params.username = nameList[0];
    console.log(req.params.username);
    if(req.params.username == undefined){
        res.send("no");
    }else{
        res.send("yes");
    }
    // var compName = req.params.comp;
    // console.log(compName);
    // var jobPos = req.params.pos;
    // console.log(compName);
    
    // var j = mongoose.model('Job', JobSchema);
    // var r = mongoose.model('Resume', ResumeSchema);
    // j.find({compName: comp}).exec(function(error, results){
    //     if(results.length == 0){
    //         console.log("the user doesn't exist");
    //     }else{
    //         var resume = new Resume();
    //         let job = results[0];
    //         job.resumeList.push(resume);
    //         job.save();
    //         console.log("finish adding the resume into the job list");
    //     }
    // })
});
// <<<<<<< FelicityMeng-patch-1
// app.get('/login/login/:username/:password', (req, res) => {
// =======
// if has an account, login
app.get('/login/logIn/:username/:password', (req, res) => {
    let u = req.params.username;
    User.find({username: u}).exec(function(error, results){
        if(results.length == 1){ // there's no more than one account
            let p = req.params.password;
            var salt = results[0].salt;
            crypto.pbkdf2(p, salt, iterations, 64, 'sha512', (err, hash) => {
                if (err) throw err;
                let hashStr = hash.toString('base64');
                
                if(results[0].hash == hashStr){
                    let sessionkey = Math.floor(Math.random() * 1000);
                    sessionKeys[u] = [sessionkey, Date.now()];
// <<<<<<< FelicityMeng-patch-1
//                     res.cookie("username", `${u}`, {maxAge: 1000*60*60*60});
// =======
                    nameList.push(u);
                    res.cookie("login", {username: u, key: sessionkey}, {maxAge: 20000});
                    res.send("succeed");
                }else{
                    res.send("fail");
                }
            });
        }else{
            res.send("fail");
        }
    });
});
// <<<<<<< FelicityMeng-patch-1
// app.post('/login/create/:username/:password/:email', (req, res) => {
//     let u = req.params.username;
//     let e = req.params.email;
// =======
// create the account [DONE, success to create the account]
app.post('/login/create/', (req, res) => {
    // console.log(req.body);
    let u = req.body.username;
    let e = req.body.email;
    User.find({username: u}).exec(function(error, results){
        if(results.length == 0){ // if the username doesn't exist
            let p = req.body.password;
            // console.log(p);
            var salt = crypto.randomBytes(64).toString('base64');
            crypto.pbkdf2(p, salt, iterations, 64, 'sha512', (err, hash) => {
                if (err) throw err;
                let hashStr = hash.toString('base64');
// <<<<<<< FelicityMeng-patch-1
//                 console.log(hashStr);
// =======
                // console.log(hashStr);
                // console.log(u);
                var user = new User({'username': u, 'salt': salt, 'hash': hashStr, 'email': e});
                user.save(function (err) {if (err) console.log('an error occurred'); });
                res.send('account created');
            });
        }else{
            res.send('username already taken');
        }
    });
});
// <<<<<<< FelicityMeng-patch-1
// =======
//todo: continue here
// create the resume

// app.post('/home/create/', (req, res) => {
//     req.params.username = nameList[0];
//     console.log(req.params.username);
//     if(req.params.username == undefined){
//         res.send("Please log in");
//     }else{
//         // console.log('here');
//         // console.log(req.body);
//         let resumeObj = req.body;
//         req.body.username = req.params.username;
//         // console.log(req.body);
//         // console.log(resumeObj);
//         var r = mongoose.model('Resume', ResumeSchema);

//         // use name & username to check whether already existed
//         r.find({name: resumeObj.name, username: req.params.username}).exec(function(error, results){
//             if(results.length == 0){ // if the resume doesnt exist
//                 var resume = new Resume(resumeObj);
//                 resume.save(function(err) {if(err) console.log('fail to add');});
//                 console.log('finish to add the resume into database');
//             }else{
//                 // console.log('you already have the resume');
//                 res.send("exist");
//             }
//         });
//     }
// });
app.post('/home/createResume', upload.single('file'), function(req, res, next) {
    var file = req.file;
	let jobObj = req.body;
	let username = req.cookies['username'];

	if(nameList[0] == undefined){
		res.send('login first');
		return;
	}
	if(jobObj.name == ''){
        res.send('no name');
        return;
    }

    if(file == undefined){
        res.send('no photo');
        return;
    }
	var r = mongoose.model('Resume', ResumeSchema);
    r.find({username:username}).exec(function(error, results){
        if(results.length == 0){ // there's no more than one account
		 
			 var newResume = new Resume({
				 'username': username, 
				 'gender': jobObj.gender, 
				 'name': jobObj.name, 
				 'phoneNum': jobObj.pNum, 
				 'birthday': jobObj.birthday, 
				 'education': jobObj.Bkg, 
				 'avatar': file.path, 
				 'area': jobObj.area, 
				 'desc': jobObj.desc, 
			 });
             newResume.save(function (err) {if (err) console.log('an error occurred'); });
			 res.send("insertok");
	   }else{
		   console.log("update");
		   Resume.updateOne({
			'username': username
		  }, {
			 'name': jobObj.name, 
				 'gender': jobObj.gender, 
				 'phoneNum': jobObj.pNum, 
				 'birthday': jobObj.birthday, 
				 'education': jobObj.Bkg, 
				 'avatar': file.path, 
				 'area': jobObj.area, 
				 'desc': jobObj.desc, 
		  }, (err) => {
			if (err) {
				res.send("updatefail");
			  console.log('update fail!')
			} else {
			  res.send("updateok");
			  
			}
		  });
		  
        }
    });
	
	console.log(jobObj);
    console.log('filetype：%s', file.mimetype);
    console.log('filename：%s', file.originalname);
    console.log('filesize：%s', file.size);
    console.log('filepath：%s', file.path);
   
    
});


// view the resume
// app.get('/home/view', (req,res) => {
//     // check whether the user login or not
//     req.params.username = nameList[0];
//     console.log(req.params.username);
//     if(req.params.username == undefined){ // if the user doesn't login
//         res.send("Please log in");
//     }else{
//         // find the username and return the data about that username
//         Resume.find({username: req.params.username}).exec(function(error, results){
//             res.send(JSON.stringify(results));
//         });
//     }
// });
app.post('/home/getResume/', (req, res) => {
    //res.setHeader('Content-Type', 'text/plain');
	let username = req.cookies['username'];
	console.log(username);
	if(!username){
		res.send( 'login first!');
		return;
	} 
    Resume.findOne({'username': username}).exec(function(error, results){
        res.send(JSON.stringify(results));
    })
	
});

// ----below url could check/add the data----
// to add the job into the database
app.post('/add/job', (req, res) => {
    //todo: continue here (addJob.html, addJob.js)
    let jobObj = req.body;
	console.log(jobObj);
    var j = mongoose.model('Job', JobSchema);
    j.find({jobTitle: jobObj.jTitle, compName: jobObj.compName, jobArea: jobObj.jobArea}).exec(function(error, results){
        if(results.length == 0){ // if doesn't exist
            var job = new Job(jobObj);
            job.save(function(err) {if(err) console.log('fail to add');});
            // console.log("finish adding the job");
            res.send('finish adding');
        }
    })
});
// to list all the users in the database
app.get('/get/users', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    var u = mongoose.model('User', UserSchema);
    u.find({}).exec(function(error, results){
        res.send(JSON.stringify(results, null, 4));
    });
});
// to list all the jobs in the database
app.get('/get/jobs', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    var j = mongoose.model('Job', JobSchema);
    j.find({}).exec(function(error, results){
        res.send(JSON.stringify(results, null, 4));
    });
});
// to list all the resume in the database
app.get('/get/resume', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    var r = mongoose.model('Resume', ResumeSchema);
    r.find({}).exec(function(error, results){
        res.send(JSON.stringify(results, null, 4));
    });
});


const port = 3000;
app.listen(port, function(){
    console.log('server running');
});