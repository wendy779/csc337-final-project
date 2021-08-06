const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const cookieParser = require('cookie-parser'); //npm install cookie-parser
const crypto = require('crypto');


var router = express.Router();
 
var fs = require('fs');
var multer  = require('multer');
 

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
       
        cb(null, 'upload/');   
    },
    filename: function (req, file, cb) {
        
        cb(null, Date.now() + "-" + file.originalname); 
    }
});
 

var createFolder = function(folder){
    try{
        
        fs.accessSync(folder);
    }catch(e){
      
        fs.mkdirSync(folder);
    } 
};
 
var uploadFolder = './upload/';
createFolder(uploadFolder);
 

var upload = multer({ storage: storage });
 


const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); 
const db = mongoose.connection;
const mongoDBURL = 'mongodb://localhost:27017/job'; // the name of the collection is "job"
const iterations = 1000;

var sessionKeys = {};

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
app.get('/job/search/:companyName', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    let keyword = new RegExp(decodeURIComponent(req.params.companyName));
    Job.find({compName: keyword}).exec(function(error, results){
        res.send(JSON.stringify(results));
    })
});
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
/* POST upload listing. */
app.post('/home/createResume', upload.single('file'), function(req, res, next) {
    var file = req.file;
	let jobObj = req.body;
	let username = req.cookies['username'];
	console.log(username);
	if(!username){
		res.send( 'login first!');
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
			  console.log('updatefail')
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
app.post('/job/apply/:comp/:uname', (req, res) => {
    let jobObj = req.body;
    var j = mongoose.model('Job', JobSchema);
    var r = mongoose.model('Resume', ResumeSchema);
    j.find({compName: comp}).exec(function(error, results){
        if(results.length == 0){
            console.log("the user doesn't exist");
        }else{
            var resume = new Resume();
            let job = results[0];
            job.resumeList.push(resume);
            job.save();
            console.log("finish adding the resume into the job list");
        }
    })
});
app.get('/login/login/:username/:password', (req, res) => {
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
                    res.cookie("username", `${u}`, {maxAge: 1000*60*60*60});
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
app.post('/login/create/:username/:password/:email', (req, res) => {
    let u = req.params.username;
    let e = req.params.email;
    User.find({username: u}).exec(function(error, results){
        if(results.length == 0){ // if the username doesn't exist
            let p = req.params.password;
            var salt = crypto.randomBytes(64).toString('base64');
            crypto.pbkdf2(p, salt, iterations, 64, 'sha512', (err, hash) => {
                if (err) throw err;
                let hashStr = hash.toString('base64');
                console.log(hashStr);
                var user = new User({'username': u, 'salt': salt, 'hash': hashStr, 'email': e});
                user.save(function (err) {if (err) console.log('an error occurred'); });
                res.send('account created');
            });
        }else{
            res.send('username already taken');
        }
    });
});
app.post('/add/job', (req, res) => {
    //todo: continue here (addJob.html, addJob.js)
    let jobObj = req.body;
	
    var j = mongoose.model('Job', JobSchema);
    j.find({jobTitle: jobObj.jTitle, compName: jobObj.compName, jobArea: jobObj.jobArea}).exec(function(error, results){
        if(results.length == 0){ // if doesn't exist
            var job = new Job(jobObj);
            job.save(function(err) {if(err) console.log('fail to add');});
            console.log("finish adding the job");
        }
    })
});
//todo: continue here
app.post('/home/create', (req, res) => {
    let resumeObj = req.body;
    var r = mongoose.model('Resume', ResumeSchema);
    r.find({username:resumeObj.username, name:resumeObj.name, phoneNum:resumeObj.pNum,  })
});
app.get('/home/view', (req,res) => {

});


const port = 3000;
app.listen(port, function(){
    console.log('server running');
});