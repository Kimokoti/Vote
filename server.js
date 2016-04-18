var express=require('express'),
	app=express(),
  fs=require('fs'),
	redis=require('redis'),
	//http=require('http').Server(app),
  https=require('https').Server({
      key: fs.readFileSync(__dirname+'/public/key.pem'),
      cert: fs.readFileSync(__dirname+'/public/cert.pem')
    },app),
	//io=require('socket.io')(http),
  io=require('socket.io')(https),
	session=require('express-session'),
	redisStore=require('connect-redis')(session),
	bodyParser=require('body-parser'),
	cookieParser=require('cookie-parser'),
	client=redis.createClient(), //Create Redis client
	router=express.Router(),
	async=require('async'),
  logger=require('morgan'),
  path=require('path'),
  bcrypt=require('bcrypt'),
  multer=require('multer'),
  mime=require('mime'),
	mysql=require('mysql');


//Set Redis Clients To Use DB3(index 2)
  var voteClient=redis.createClient(),
      pub=redis.createClient(),
      sub=redis.createClient();
  async.series([
  function(callback){
    voteClient.select(2,function(err,reply){
      if(!err){
        console.log('DB3 Selected for voteClient');
        callback(null,1);
      }else{
        console.log("Error Selecting DB3 for varClient");
        callback(null,"Error Selecting DB3 for varClient");
      }
    });
  },function(callback){
    pub.select(2,function(err,reply){
      if(!err){
        console.log('DB3 Selected for pub');
        callback(null,2);
      }else{
         console.log("Error Selecting DB3 for pub");
         callback(null,"Error Selecting DB3 for pub");
      }   
    });
  },function(callback){
    sub.select(2,function(err,reply){
      if(!err){
        console.log('DB3 Selected for sub');
        callback(null,3);
      }else{
        console.log("Error Selecting DB3 for sub");
        callback(null,"Error Selecting DB3 for sub");
      }    
    });
  },function(callback){
    sub.subscribe('info',function(err,reply){
      if(!err){
        console.log('Sub subscribed to Channel Info');
        callback(null,4);
      }else{
        console.log("Error Subscribing sub to channel Info");
        callback(null,"Error Subscribing sub to channel Info");
      }   
    });
  }
  ],function(error,result){
    console.log(result);
  });


//Configure Multer for Profile Pic Upload
  var storage=multer.diskStorage({
      destination:'./public/photos/',
      filename:function(req,file,cb){
        cb(null,file.fieldname+'-'+Date.now()+'.'+mime.extension(file.mimetype));
      }
  });
  var limit={files:1,fileSize:5*1024*1024};
  //var upload = multer({ dest: './uploads/'});

  var upload = multer({
      storage:storage,
      limits:limit
    });


  var sizeOf    =   require( 'image-size' );
  require( 'string.prototype.startswith' );


//Generate password salt
var salt=bcrypt.genSaltSync(10);


app.set('views',__dirname+'/views');
app.set('view engine','ejs');

app.use(express.static(path.join(__dirname,'public')));
app.use(logger('dev'));
app.use(cookieParser('%gLf7;8.9+-nDK'));
app.use(session({
    secret: 'U86.ju;k9YJ8*', 
    store: new redisStore({ host: 'localhost', port: 6379, client: client }),
    saveUninitialized: false, // don't create session until something stored,
    resave: false // don't save session if unmodified
  }
));
//Listen for connections on port 8080
/*
http.listen(8080,function(){
	console.log('Voting Server Running on Port *8080');
});
*/

https.listen(8080,function(){
  console.log('Secure https Voting Server Running on Port *8080');
});

var db=require('./routes/db.js');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser('*123HATR$#gs./')); //secret codes for hashing cookie values


router.post( '/upload', upload.single('file'), function( req, res, next ) {
  if(req.session.key){
    if(req.session.key['user_type']=="voter"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="user"){
      if ( !req.file.mimetype.startsWith( 'image/' ) ) {
    return res.status( 422 ).json( {
      error : 'The uploaded file must be an image'
    } );
  }

  var dimensions = sizeOf( req.file.path );

  if ( ( dimensions.width < 320 ) || ( dimensions.height < 240 ) ) {
    return res.status( 422 ).json( {
      error : 'The image must be at least 640 x 480px'
    } );
  }

  //console.log("User Agent:"+req.headers['user-agent']);
  //console.log("Host:"+req.headers.host);
  //console.log("Referer:"+req.headers.referer);
  //console.log(req.originalUrl);

  //console.log(req.url);
  db.uploadProfile(req,req.body.table,req.body.user_id,"photos/"+req.file.filename,function(res){
    if(res=="UPDATE OK"){
      console.log("Photo Upload Successful");
      
    }else if(res==false){
      console.log("Upload Failed");
    }
  });
  return res.status( 200 ).send( req.file );
    }
  }else if(!req.session.key){
    res.redirect('/');
  }
});


router.post('/login',function(req,res){
if(req.body.choice=="id_number"){
  var pattern=/^\d{8}$/;
            if(pattern.test(req.body.address)==false){
                res.json({"error":true,"message":"Invalid ID Number"});
            }else{
               db.handleLogin(req,"login",req.body.choice,function(loginDetails){
                  if(loginDetails==null){
                       res.json({"error":true,"message":"Database Error Occurred"});
                   }else{
                      if(loginDetails==false){
                         res.json({"error":true,"message":"Wrong Login Details or You are not Registered"});
                      }else{ //Users will always be officer/admin since only them are registered using ID Number
                                        if(bcrypt.compareSync(req.body.password,loginDetails['password'])){
                                            db.retrieveDetails(req,"user",loginDetails["ID_Number"],loginDetails["email"],function(userDetails){
                                              if(userDetails==null){
                                                  res.json({"error":true,"message":"Database Error Occurred"});
                                               }else{
                                                  if(userDetails==false){
                                                     res.json({"error":true,"message":"Missing Details Contact System Admin"});
                                                  }else{ //If theres a result

                                                    //Dummy testing data
                                                        console.log(userDetails['user_type']);
                                                        console.log(userDetails['ID_Number']);
                                                        req.session.key=userDetails;
                                                        res.json({"error":false,"page":"users","message":userDetails['ID_Number']+'->'+userDetails['position']+"kim"});                                  
                                                  }
                                               }
                                            });
                                        }else{
                                          res.json({"error":true,"message":"Wrong Login Details"});
                                        }
                      } 
                   }
                });
            }
}else if(req.body.choice=='email'){
 var pattern=/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if(pattern.test(req.body.address)==false){
                res.json({"error":true,"message":"Invalid Email Address"});
            }else{
               db.handleLogin(req,"login",req.body.choice,function(loginDetails){
                  if(loginDetails==null){
                       res.json({"error":true,"message":"Database Error Occurred"});
                   }else{
                      if(loginDetails==false){
                         res.json({"error":true,"message":"Wrong Login Details or You are not Registered"});
                      }else{ //If theres a result
                        if(bcrypt.compareSync(req.body.password,loginDetails['password'])){
                                            //Users can either be voters or officer/admin since both parties are registered using emails
                                      if(loginDetails['user_type']=='voter'){
                                          db.retrieveDetails(req,"voter",loginDetails["Reg_ID"],loginDetails["email"],function(userDetails){
                                            if(userDetails==null){
                                                res.json({"error":true,"message":"Database Error Occurred"});
                                             }else{
                                                if(userDetails==false){
                                                   res.json({"error":true,"message":"Missing Details Contact System Admin"});
                                                }else{ 
                                                  //Dummy testing data
                                                      console.log(userDetails['user_type']);
                                                      console.log(userDetails['reg_ID']);
                                                      req.session.key=userDetails;                              
                                                      res.json({"error":false,"page":"voters","message":userDetails['reg_ID']+'->'+userDetails['gender']});                                   
                                                }
                                             }
                                          });
                                      }else if(loginDetails['user_type']=='admin' || loginDetails['user_type']=='officer'){
                                          db.retrieveDetails(req,"user",loginDetails["ID_Number"],loginDetails["email"],function(userDetails){
                                            if(userDetails==null){
                                                res.json({"error":true,"message":"Database Error Occurred"});
                                             }else{
                                                if(userDetails==false){
                                                   res.json({"error":true,"message":"Missing Details Contact System Admin"});
                                                }else{ //If theres a result

                                                  //Dummy testing data                                 
                                                        console.log(userDetails['user_type']);
                                                        console.log(userDetails['ID_Number']);
                                                        req.session.key=userDetails;
                                                        res.json({"error":false,"page":"users","message":userDetails['ID_Number']+'->'+userDetails['position']+"kim"});     
                                                }
                                             }
                                          });
                                      }
                              }else{
                                   res.json({"error":true,"message":"Wrong Login Details"});
                              }
                      }
                   }
                });
            }
}else if(req.body.choice=='reg_number'){
  var pattern=/^[a-zA-Z]{3}-\d{3}-\d{3}\/(201[0-7])$/;
  if(pattern.test(req.body.address)==false){
                res.json({"error":true,"message":"Invalid Registration Number"});
            }else{
               db.handleLogin(req,"login",req.body.choice,function(loginDetails){
                  if(loginDetails==null){
                       res.json({"error":true,"message":"Database Error Occurred"});
                   }else{
                      if(loginDetails==false){
                         res.json({"error":true,"message":"Wrong Login Details or You are not Registered"});
                      }else{ //User here will always be a voter since he is using a registration number

                         if(bcrypt.compareSync(req.body.password,loginDetails['password'])){
                            db.retrieveDetails(req,"voter",loginDetails["Reg_ID"],loginDetails["email"],function(userDetails){
                              if(userDetails==null){
                                  res.json({"error":true,"message":"Database Error Occurred"});
                               }else{
                                  if(userDetails==false){
                                     res.json({"error":true,"message":"Missing Details Contact System Admin"});
                                  }else{ //If theres a result

                                  
                                        //Set session
                                        req.session.key=userDetails;
                                        res.json({"error":false,"page":"voters","message":userDetails['reg_ID']+'->'+userDetails['gender'],"details":userDetails});                                   
                                  }
                               }
                            });
                          }else{
                                   res.json({"error":true,"message":"Wrong Login Details"});
                          }                   
                        }
                   }
                });
            }
      }
});

//Android Router to check vote status
router.post("/checkVoteStatus",function(req,res){
  db.checkVoteStatus(req,function(response){
    if(response){
      res.json({voted:true,"data":response});  
    }else{
      res.json({voted:false,"data":"No Data"});
    }
  });
});

router.get("/u",function(req,res){
  var votersC,usersC,candidatesC;
  if(req.session.key){
    if(req.session.key['user_type']=="voter"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="user"){
      //Asynchronous Execution of database Functions
      async.series([
          function(callback){
            db.displayResults(req,"voters",function(resVoters){
              votersC=resVoters.length;
              callback(null,votersC);
            });
          },
          function(callback){
            db.displayResults(req,"users",function(resUsers){
              usersC=resUsers.length;
              callback(null,usersC);
            });  
          },
          function(callback){
            db.displayResults(req,"candidates",function(resCand){
              candidatesC=resCand.length;
              callback(null,candidatesC);
            });
          }
        ],function(error,results){
          //console.log(results);
          res.render("users/index",{title:"Voter Homepage","information":req.session.key,userCount:usersC,voterCount:votersC,candCount:candidatesC});
      });      
    }
  }else if(!req.session.key){
    res.redirect('/');
  }
});

router.get("/v",function(req,res){
  if(req.session.key){
    if(req.session.key['user_type']=="user"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="voter"){
      //console.log(req.session.key);
      res.render("voters/index",{title:"Voter Homepage","information":req.session.key});
    }
  }else if(!req.session.key){
    res.redirect('/');
  }
});

router.get('/vote',function(req,res){
   if(req.session.key){
    if(req.session.key['user_type']=="user"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="voter"){
      db.getVotingDetails(req,"candidates",function(response){
            if(response==null){
                    res.json({"error":true,"message":"Database Error Occurred"});
              }else{                   
                   //Check if Voter has Voted
                    db.getVotingDetails(req,"votesDetails",function(responseB){
                      if(responseB){
                        res.redirect("/choices");
                      }else{
                         //Get Candidates from database and Render them
                        res.render("voters/vote",{title:"Voting Page","information":req.session.key,"candidates":response});
                      }
                    })
              }
        });
    }
  }else if(!req.session.key){
    res.redirect('/');
  }
});

//Android Vote Page
router.get('/androidVote',function(req,res){
      db.getVotingDetailsAndroid(req,"candidates",function(response){
            if(response==null){
                    res.json({"error":true,"message":"Database Error Occurred"});
              }else{       

                  db.retrieveDetails(req,"voter",req.query.regID,req.query.email,function(voterDetails){
                    console.log("Rendering AndoidVote");
                    //res.render("voters/vote",{title:"Voting Page","information":voterDetails,"candidates":response});
                    res.render("voters/androidVote",{title:"Voting Page","information":voterDetails,"candidates":response});
                  });
              }
        });
});

router.get('/vr',function(req,res){
  if(req.session.key){
    if(req.session.key['user_type']=="user"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="voter"){
      res.render("voters/view_results",{title:"View current Results","information":req.session.key});
    }
  }else if(!req.session.key){
    res.redirect('/');
  }
});

router.get('/choices',function(req,res){
  if(req.session.key){
    if(req.session.key['user_type']=="user"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="voter"){
      db.getVotingDetails(req,"votesDetails",function(response){
            if(response==null){
                    res.json({"error":true,"message":"Database Error Occurred"});
              }else{
                var msg="";
                  if(response==false){
                      msg="<div class='alert alert-danger'>You have not Voted Yet</div>";  
                      res.render("voters/my_choices",{title:"My Choices",choices:'',"information":req.session.key,"msg":msg});
                  }else{  
                      msg="<div class='alert alert-success'>You have Already Voted</div>";  
                      res.render("voters/my_choices",{title:"My Choices","information":req.session.key,choices:response,"msg":msg});
                   }
              }
        });
    }
  }else if(!req.session.key){
    res.redirect('/');
  }
});

//Android /choices router

router.post('/choicesAndroid',function(req,res){
      db.getVotingDetailsAndroid(req,"votesDetails",function(response){
            if(response==null){
                    res.json({"error":true,status:false,"message":"Database Error Occurred"});
              }else{
                  if(response==false){
                      res.json({"error":false,status:false,"message":"You have Not Voted Yet"});
                  }else{  
                      res.json({"error":false,status:true,"choicesData":response});
                   }
              }
        });
});


router.get('/news',function(req,res){
  res.render("news",{title:"News Feed"});
})

router.get("/logout",function(req,res){
  if(!req.session.key){
    res.redirect('/');
  }else{
    req.session.destroy(function(){
     res.redirect('/');
  });
  }
});

//Logout Android
router.get("/logoutAndroid",function(req,res){
  if(!req.session.key){
    res.json({"error":"ERROR"});
  }else{
    req.session.destroy(function(){
     res.json({"error":"FALSE"});
  });
  }
});


//Users Routes
//--------------------------
//Registration routes
  router.route("/ru")
      .get(function(req,res){
      if(req.session.key){
        if(req.session.key['user_type']=="voter"){
           res.redirect('/');
        }else if(req.session.key['user_type']=="user"){
            var votersC,usersC,candidatesC;
                //Asynchronous Execution of database Functions
            async.series([
                function(callback){
                  db.displayResults(req,"voters",function(resVoters){
                    votersC=resVoters.length;
                    callback(null,votersC);
                  });
                },
                function(callback){
                  db.displayResults(req,"users",function(resUsers){
                    usersC=resUsers.length;
                    callback(null,usersC);
                  });  
                },
                function(callback){
                  db.displayResults(req,"candidates",function(resCand){
                    candidatesC=resCand.length;
                    callback(null,candidatesC);
                  });
                }
              ],function(error,results){
                //console.log(results);
                res.render("users/registerUser",{title:"Register Users","information":req.session.key,userCount:usersC,voterCount:votersC,candCount:candidatesC});
            }); 
        }
      }else if(!req.session.key){
        res.redirect('/');
      }
    })
      .post(function(req,res){
        var errors=[];
        //console.log("Register User POST request");
        //RegExp for form inputs
        var patternEmail=/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var patternId=/^\d{8}$/;
        var patternUserName=/^[a-zA-Z]{1,20}\s[a-zA-Z]{1,20}$/;

//Validate Email Address
        if(req.body.emailAdd.trim()=='' || req.body.emailAdd.trim().length==0){
          errors.push("Email Address is Required\n");
        }else if(req.body.emailAdd.trim().length>0){
          if(patternEmail.test(req.body.emailAdd)==false){
              errors.push("Invalid Email Address\n");
              console.log('Invalid email');
              console.log(req.body.emailAdd);
          }  
        }
        
//Validate Id Number        
        if(req.body.idNumber.trim()=='' || req.body.idNumber.trim().length==0){
          errors.push("Id Number is Required\n");
        }else if(req.body.idNumber.trim().length>0){
          if(patternId.test(req.body.idNumber)==false){
            errors.push("Id Number must be an 8 digit Number\n");
            console.log('Invalid Id');
            console.log(req.body.idNumber);
          }
        }

//Validate Username
        if(req.body.username.trim()=='' || req.body.username.trim().length==0){
          errors.push("Username is Required\n");
        }else if(req.body.username.trim().length>0){
          if(patternUserName.test(req.body.username)==false){
              errors.push("Provide first and last name separated by a space\n");
              console.log('Invalid Username');
              console.log(req.body.username);
          }
        }

 //Validate Password       
        if(req.body.password.trim().length<8){
          console.log(req.body.password.trim().length);
           console.log("Password:"+req.body.password.trim());
          errors.push("Password Should be atleast 8 characters\n");
        }else if(req.body.password.trim().length>8 && req.body.password.trim()!=req.body.conf_pass.trim()){
          errors.push("Password Should match Confirm Password\n");
        }

//Validate gender
        if(!req.body.gender){
          console.log("Error Gender");
          errors.push("Please Select a Gender\n");
        } 

//Validate  position
      if(req.body.position.trim()==''){
        errors.push("Please Select a Position\n");
      }     

        if(errors.length>0){
          console.log("Validation Errors");
          res.json({"errorValid":true,message:errors});
        }else{
          //DB transactions
          var hash=bcrypt.hashSync(req.body.password,salt);
          db.handleRegistration(req,req.body.userType,hash,function(result){
            if(result==null){
              console.log("Database error");
              res.json({"errorDB":true,message:"A database Error Occurred"});
            }else if(result=="OK"){
              console.log("Succesful Reg");
              res.json({"errorDB":false,message:"Successful Registration"});
            }else if(result=="Email Exists"){
              console.log("Email Exist");
              res.json({"errorDB":true,message:"The Email Address Already Exists"})
            }else if(result=="ID Exists"){
              console.log("ID Exist");
              res.json({"errorDB":true,message:"The ID Number Already Exists"})
            }else if(result=="Reg Exists"){
              console.log("Reg Exist");
              res.json({"errorDB":true,message:"The Registration Number Already Exists"})
            }
          });
        }
      });

//Voter Registration Routes
router.route("/rv")
.get(function(req,res){
  if(req.session.key){
    if(req.session.key['user_type']=="voter"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="user"){

      var votersC,usersC,candidatesC;
                //Asynchronous Execution of database Functions
            async.series([
                function(callback){
                  db.displayResults(req,"voters",function(resVoters){
                    votersC=resVoters.length;
                    callback(null,votersC);
                  });
                },
                function(callback){
                  db.displayResults(req,"users",function(resUsers){
                    usersC=resUsers.length;
                    callback(null,usersC);
                  });  
                },
                function(callback){
                  db.displayResults(req,"candidates",function(resCand){
                    candidatesC=resCand.length;
                    callback(null,candidatesC);
                  });
                }
              ],function(error,results){
                //console.log(results);
                res.render("users/registerVoters",{title:"Register Voters","information":req.session.key,userCount:usersC,voterCount:votersC,candCount:candidatesC});
            }); 
      
    }
  }else if(!req.session.key){
    res.redirect('/');
  }
})
.post(function(req,res){
        var errors=[];
        //console.log("Register Voter POST request");
 //RegExp for form inputs
        var patternEmail=/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var patternReg=/^[a-zA-Z]{3}-\d{3}-\d{3}\/(201[0-7])$/;
        var patternVoterName=/^[a-zA-Z]{1,20}\s[a-zA-Z]{1,20}$/;

//Validate Email Address
        if(req.body.emailAdd.trim()=='' || req.body.emailAdd.trim().length==0){
          errors.push("Email Address is Required\n");
        }else if(req.body.emailAdd.trim().length>0){
          if(patternEmail.test(req.body.emailAdd)==false){
              errors.push("Invalid Email Address\n");
              //Dummy Tests
              console.log('Invalid email');
              console.log(req.body.emailAdd);
          }  
        }
        
//Validate Registration Number       
        if(req.body.regNumber.trim()=='' || req.body.regNumber.trim().length==0){
          errors.push("Registration Number is Required\n");
        }else if(req.body.regNumber.trim().length>0){
          if(patternReg.test(req.body.regNumber)==false){
            errors.push("Invalid Registration Number\n");
            //Dummy Tests
            console.log('Invalid Reg Num');
            console.log(req.body.regNumber);
          }
        }

//Validate Votername
        if(req.body.voterName.trim()=='' || req.body.voterName.trim().length==0){
          errors.push("Votername is Required\n");
        }else if(req.body.voterName.trim().length>0){
          if(patternVoterName.test(req.body.voterName)==false){
              errors.push("Provide first and last name separated by a space\n");
              //Dummy Tests
              console.log('Invalid Voter name');
              console.log(req.body.voterName);
          }
        }

 //Validate Password       
        if(req.body.password.trim().length<8){
          //console.log(req.body.password.trim().length);
          //console.log("Password:"+req.body.password.trim());
          errors.push("Password Should be atleast 8 characters\n");
        }else if(req.body.password.trim().length>8 && req.body.password.trim()!=req.body.conf_pass.trim()){
          errors.push("Password Should match Confirm Password\n");
        }

//Validate gender
        if(!req.body.gender){
          console.log("Error Gender");
          errors.push("Please Select a Gender\n");
        }    

//Validate Residence
        if(!req.body.residence){
          console.log("Error Residence");
          errors.push("Please Select a place of Residence\n");
        }     

        if(errors.length>0){
          console.log("Validation Errors");
          res.json({"errorValid":true,message:errors});
        }else{
          //DB transactions
          var hash=bcrypt.hashSync(req.body.password,salt);
          db.handleRegistration(req,req.body.userType,hash,function(result){
            if(result==null){
              console.log("Database error");
              res.json({"errorDB":true,message:"A database Error Occurred"});
            }else if(result=="OK"){
              console.log("Succesful Reg");
              res.json({"errorDB":false,message:"Successful Registration"});
            }else if(result=="Email Exists"){
              console.log("Email Exist");
              res.json({"errorDB":true,message:"The Email Address Already Exists"})
            }else if(result=="ID Exists"){
              console.log("ID Exist");
              res.json({"errorDB":true,message:"The ID Number Already Exists"})
            }else if(result=="Reg Exists"){
              console.log("Reg Exist");
              res.json({"errorDB":true,message:"The Registration Number Already Exists"})
            }
          });
        }
      });

//Candidate Registration Routers
router.route("/rc")
.get(function(req,res){
  if(req.session.key){
    if(req.session.key['user_type']=="voter"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="user"){
            var votersC,usersC,candidatesC;
                //Asynchronous Execution of database Functions
            async.series([
                function(callback){
                  db.displayResults(req,"voters",function(resVoters){
                    votersC=resVoters.length;
                    callback(null,votersC);
                  });
                },
                function(callback){
                  db.displayResults(req,"users",function(resUsers){
                    usersC=resUsers.length;
                    callback(null,usersC);
                  });  
                },
                function(callback){
                  db.displayResults(req,"candidates",function(resCand){
                    candidatesC=resCand.length;
                    callback(null,candidatesC);
                  });
                }
              ],function(error,results){
                //console.log(results);
                res.render("users/registerCandidates",{title:"Register Candidates","information":req.session.key,userCount:usersC,voterCount:votersC,candCount:candidatesC});
            }); 
    }
  }else if(!req.session.key){
    res.redirect('/');
  }
})
.post(function(req,res){
  //RegExp for form inputs
        var errors=[];
        var patternEmail=/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var patternReg=/^[a-zA-Z]{3}-\d{3}-\d{3}\/(201[0-7])$/;
        var patternCandName=/^[a-zA-Z]{1,20}\s[a-zA-Z]{1,20}$/;

//Validate Email Address
        if(req.body.emailAdd.trim()=='' || req.body.emailAdd.trim().length==0){
          errors.push("Email Address is Required\n");
        }else if(req.body.emailAdd.trim().length>0){
          if(patternEmail.test(req.body.emailAdd.trim())==false){
              errors.push("Invalid Email Address\n");
              //Dummy Tests
              console.log('Invalid email');
              console.log(req.body.emailAdd);
          }  
        }
        
//Validate Registration Number       
        if(req.body.regNumber.trim()=='' || req.body.regNumber.trim().length==0){
          errors.push("Registration Number is Required\n");
        }else if(req.body.regNumber.trim().length>0){
          if(patternReg.test(req.body.regNumber.trim())==false){
            errors.push("Invalid Registration Number\n");
            //Dummy Tests
            console.log('Invalid Reg Num');
            console.log(req.body.regNumber);
          }
        }

//Validate Candidate Name
        if(req.body.candName.trim()=='' || req.body.candName.trim().length==0){
            errors.push("Candidate Name is Required\n");
        }else if(req.body.candName.trim().length>0){
          if(patternCandName.test(req.body.candName.trim())==false){
              errors.push("Provide first and last name separated by a space\n");
              //Dummy Tests
              console.log('Invalid Candidate name');
              console.log(req.body.candName);
          }
        }

//Validate gender
        if(!req.body.gender){
          console.log("Error Gender");
          errors.push("Please Select a Gender\n");
        }    

//Validate  position
      if(req.body.position.trim()==''){
        errors.push("Please Select a Vying Post\n");
      }    

        if(errors.length>0){
          console.log("Validation Errors");
          res.json({"errorValid":true,message:errors});
        }else{
          //DB transactions
          db.handleCandidateRegistration(req,function(result){
            if(result==null){
              console.log("Database error");
              res.json({"errorDB":true,message:"A database Error Occurred"});
            }else if(result=="OK"){
              console.log("Succesful Reg");
              res.json({"errorDB":false,message:"Successful Registration"});
            }else if(result=="Email Exists"){
              console.log("Email Exist");
              res.json({"errorDB":true,message:"The Email Address Already Exists"})
            }else if(result=="Not Voter"){
              console.log("Not Voter");
              res.json({"errorDB":true,message:"You must be a voter to be a Candidate"})
            }else if(result=="Reg Exists"){
              console.log("Reg Exist");
              res.json({"errorDB":true,message:"The Registration Number Already Exists"})
            }else if(result=="E-I Conflict"){
               console.log("Email ID Conflict");
              res.json({"errorDB":true,message:"The Email and Registration Number Conflict"})
            }
          });
        }
});

//Display Routes
router.get("/ds",function(req,res){
  if(req.session.key){
    if(req.session.key['user_type']=="voter"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="user"){
                                        var votersC,usersC,candidatesC;
                                        var maleCandCount=0
                                            ,femCandCount=0
                                            ,maleVoterCount=0
                                            ,femVoterCount=0
                                            ,rres=0,rnon_res=0,vres=0,vnon_res=0;
                                            //Asynchronous Execution of database Functions
                                        async.series([
                                            function(callback){
                                              db.displayResults(req,"voters",function(resVoters){                                                   
                                                votersC=resVoters.length;                                                
                                                for(var c=0;c<votersC;c++){
                                                  if(resVoters[c]['gender']=='Male'){
                                                      maleVoterCount++;                                                    
                                                  }
                                                } 

                                                for(var c=0;c<votersC;c++){
                                                  if(resVoters[c]['gender']=='Female'){
                                                    femVoterCount++;
                                                  }
                                                }       

                                                 for(var c=0;c<votersC;c++){
                                                  if(resVoters[c]['residence']=='Outside'){
                                                    rnon_res++;
                                                  }else  if(resVoters[c]['residence']=='Inside'){
                                                    rres++;
                                                  }
                                                } 

                                                callback(null,votersC);
                                              });
                                            },
                                            function(callback){
                                              db.displayResults(req,"users",function(resUsers){
                                                usersC=resUsers.length;
                                                callback(null,usersC);
                                              });  
                                            },
                                            function(callback){
                                              db.displayResults(req,"candidates",function(resCand){                                                                                                
                                                candidatesC=resCand.length;

                                                for(var c=0;c<candidatesC;c++){
                                                  if(resCand[c]['gender']=='Male'){
                                                      maleCandCount++;
                                                  }
                                                }

                                                for(var c=0;c<candidatesC;c++){
                                                  if(resCand[c]['gender']=='Female'){
                                                      femCandCount++;
                                                  }
                                                }

                                                callback(null,candidatesC);
                                              });
                                            }
                                          ],function(error,results){     
                                            async.series([
                                                function(callback){
                                                  db.getVotingStats(req,function(resultB){
                                                    callback(null,resultB);
                                                  });
                                                }
                                              ],function(errors,resultsB){
                                                if(!errors){
                                                  //console.log("server vote stats");
                                                  //console.log(resultsB[0]);
                                                  for(var x=0;x<resultsB[0].length;x++){                                                    
                                                    //console.log(resultsB[0][x]['email']);
                                                    if(resultsB[0][x]['residence']=='Outside'){
                                                      vres++;
                                                    }else if(resultsB[0][x]['residence']=="Inside"){
                                                      vnon_res++;
                                                    }
                                                  }
                                                  res.render("users/dispVoterStats",{title:"Voter Stats","information":req.session.key,"rres":rres,"rnon_res":rnon_res,"vres":vres,"vnon_res":vnon_res,userCount:usersC,voterCount:votersC,candCount:candidatesC,mCC:maleCandCount,fCC:femCandCount,mVC:maleVoterCount,fVC:femVoterCount});
                                                }
                                              });                                                                                         
                                        });       
    }
  }else if(!req.session.key){
    res.redirect('/');
  }
});

router.get("/du",function(req,res){
  if(req.session.key){
    if(req.session.key['user_type']=="voter"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="user"){
      db.displayResults(req,"users",function(results){
                              if(results==null){
                                  res.json({"error":true,"message":"Database Error Occurred"});
                               }else{
                                  if(results==false){
                                     res.json({"error":true,"message":"No Users Registered Yet"});
                                  }else{ //If theres a result
                                    
                                      //set default variables
                                        var totalUsers= Object.keys(results).length,
                                        pageSize = 6,
                                        pageCount = Math.ceil(totalUsers/pageSize),
                                        currentPage = 1,
                                        users= [],
                                        usersArray = [], 
                                        usersList = {};

                                        //generate list of users
                                        for (var i = 0; i < totalUsers; i++) {

                                          users.push({user_id: results[i].user_id,photo:results[i].photo,ID_Number:results[i].ID_Number,username:results[i].username,gender:results[i].gender,email:results[i].email,position
                                            :results[i].position,user_status:results[i].user_status});
                                          if(results[i].photo==false){
                                               console.log(results[i].photo);
                                          }
                                        }

                                        //split list into groups
                                        while (users.length > 0) {
                                            usersArray.push(users.splice(0, pageSize));
                                        }

                                        //set current page if specifed as get variable 
                                        if (typeof req.query.page !== 'undefined') {
                                          currentPage = +req.query.page;
                                        }

                                        //show list of students from group
                                        usersList = usersArray[+currentPage - 1];
                                       
                                        var votersC,usersC,candidatesC;
                                            //Asynchronous Execution of database Functions
                                        async.series([
                                            function(callback){
                                              db.displayResults(req,"voters",function(resVoters){
                                                votersC=resVoters.length;
                                                callback(null,votersC);
                                              });
                                            },
                                            function(callback){
                                              db.displayResults(req,"users",function(resUsers){
                                                usersC=resUsers.length;
                                                callback(null,usersC);
                                              });  
                                            },
                                            function(callback){
                                              db.displayResults(req,"candidates",function(resCand){
                                                candidatesC=resCand.length;
                                                callback(null,candidatesC);
                                              });
                                            }
                                          ],function(error,results){
                                            //console.log(results);
                                                res.render('users/dispUsers', {
                                                  users: usersList,
                                                  pageSize: pageSize,
                                                  totalUsers: totalUsers,
                                                  pageCount: pageCount,
                                                  currentPage: currentPage,
                                                  title:"Show Users",
                                                  information:req.session.key,
                                                  userCount:usersC,voterCount:votersC,candCount:candidatesC
                                              });
                                        });                                                     
                                  }
                               }
                             });
    }
  }else if(!req.session.key){
    res.redirect('/');
  }
});

router.get("/dv",function(req,res){

if(req.session.key){
    if(req.session.key['user_type']=="voter"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="user"){
      db.displayResults(req,"voters",function(results){
                              if(results==null){
                                  res.json({"error":true,"message":"Database Error Occurred"});
                               }else{
                                  if(results==false){
                                     res.json({"error":true,"message":"No voters Registered Yet"});
                                     //res.render('users/noVoters', {"error":true,"message":"No voters Registered Yet"});
                                  }else{ //If theres a result
                                    
                                      //set default variables
                                        var totalVoters= Object.keys(results).length,
                                        pageSize = 8,
                                        pageCount = Math.ceil(totalVoters/pageSize),
                                        currentPage = 1,
                                        voters= [],
                                        votersArray = [], 
                                        votersList = {};

                                        //generate list of voters
                                        for (var i = 0; i < totalVoters; i++) {
                                          voters.push({voter_id: results[i].voter_id,reg_ID:results[i].reg_ID,votername:results[i].votername,gender:results[i].gender,vote_status:results[i].vote_status,
                                            voter_status:results[i].voter_status});
                                        }

                                        //split list into groups
                                        while (voters.length > 0) {
                                            votersArray.push(voters.splice(0, pageSize));
                                        }

                                        //set current page if specifed as get variable 
                                        if (typeof req.query.page !== 'undefined') {
                                          currentPage = +req.query.page;
                                        }

                                        //show list of students from group
                                        votersList = votersArray[+currentPage - 1];
                                       
                                        var votersC,usersC,candidatesC;
                                            //Asynchronous Execution of database Functions to avoid callback hell
                                        async.series([
                                            function(callback){
                                              db.displayResults(req,"voters",function(resVoters){
                                                votersC=resVoters.length;
                                                callback(null,votersC);
                                              });
                                            },
                                            function(callback){
                                              db.displayResults(req,"users",function(resUsers){
                                                usersC=resUsers.length;
                                                callback(null,usersC);
                                              });  
                                            },
                                            function(callback){
                                              db.displayResults(req,"candidates",function(resCand){
                                                candidatesC=resCand.length;
                                                callback(null,candidatesC);
                                              });
                                            }
                                          ],function(error,results){
                                            //console.log(results);
                                               res.render('users/dispVoters', {
                                                  voters: votersList,
                                                  pageSize: pageSize,
                                                  totalVoters: totalVoters,
                                                  pageCount: pageCount,
                                                  currentPage: currentPage,
                                                  title:"Show Voters",
                                                  information:req.session.key,
                                                  userCount:usersC,voterCount:votersC,candCount:candidatesC
                                              });
                                        });       
                                  }
                               }
                             });
    }
  }else if(!req.session.key){
    res.redirect('/');
  }

});


//Todo after populating table
router.get("/dc",function(req,res){
  if(req.session.key){
    if(req.session.key['user_type']=="voter"){
       res.redirect('/');
    }else if(req.session.key['user_type']=="user"){
      db.displayResults(req,"candidates",function(results){
                              if(results==null){
                                  res.json({"error":true,"message":"Database Error Occurred"});
                               }else{
                                  if(results==false){
                                     res.json({"error":true,"message":"No Users Registered Yet"});
                                  }else{ //If theres a result
                                    //Dummy testing data

                                      //set default variables
                                        var totalCandidates= Object.keys(results).length,
                                        pageSize = 6,
                                        pageCount = Math.ceil(totalCandidates/pageSize),
                                        currentPage = 1,
                                        candidates = [],
                                        candidatesArray = [], 
                                        candidatesList = {};

                                        //generate list of candidates
                                        for (var i = 0; i < totalCandidates; i++) {
                                          candidates.push({cand_id: results[i].cand_id,photo:results[i].photo,reg_ID:results[i].reg_ID,cand_name:results[i].cand_name,gender:results[i].gender,email:results[i].email,post
                                            :results[i].post,cand_status:results[i].cand_status});
                                        }

                                        //split list into groups
                                        while (candidates.length > 0) {
                                            candidatesArray.push(candidates.splice(0, pageSize));
                                        }

                                        //set current page if specifed as get variable 
                                        if (typeof req.query.page !== 'undefined') {
                                          currentPage = +req.query.page;
                                        }

                                        //show list of students from group
                                        candidatesList = candidatesArray[+currentPage - 1];
                                       

                                        var votersC,usersC,candidatesC;
                                            //Asynchronous Execution of database Functions
                                        async.series([
                                            function(callback){
                                              db.displayResults(req,"voters",function(resVoters){
                                                votersC=resVoters.length;
                                                callback(null,votersC);
                                              });
                                            },
                                            function(callback){
                                              db.displayResults(req,"users",function(resUsers){
                                                usersC=resUsers.length;
                                                callback(null,usersC);
                                              });  
                                            },
                                            function(callback){
                                              db.displayResults(req,"candidates",function(resCand){
                                                candidatesC=resCand.length;
                                                callback(null,candidatesC);
                                              });
                                            }
                                          ],function(error,results){
                                            //console.log(results);
                                               res.render('users/dispCandidates', {
                                                  candidates: candidatesList,
                                                  pageSize: pageSize,
                                                  totalCandidates: totalCandidates,
                                                  pageCount: pageCount,
                                                  currentPage: currentPage,
                                                  title:"Show Candidates",
                                                  information:req.session.key,
                                                  userCount:usersC,voterCount:votersC,candCount:candidatesC
                                              });
                                        });                                              
                                  }
                               }
                             });
    }
  }else if(!req.session.key){
    res.redirect('/');
  }

});

  
var counter={};
var temp={};

var choiceA,choiceB,choiceC,choiceD;
function assign(data,socket,callback){
  //Check If key Exists in json data coming in
  choiceA=data['A'];
  choiceB=data['B'];
  choiceC=data['C'];
  choiceD=data['D'];
  async.series([
    function(callback){
      voteClient.rpush(data['A'],socket.id,function(err,reply){
      counter[data['A']]=reply;
      //console.log("Assigning A");
      //console.log(counter[data['A']]);
      callback(null,counter);   
    });
    },function(callback){
      if(data['B']!=''){

      }
      voteClient.rpush(data['B'],socket.id,function(err,reply){
      counter[data['B']]=reply;
      //console.log("Assigning B");
      //console.log(counter[data['B']]);
      callback(null,counter);   
    });
    },function(callback){
      voteClient.rpush(data['C'],socket.id,function(err,reply){
      counter[data['C']]=reply;
      //console.log("Assigning C");
      //console.log(counter[data['C']]);  
      callback(null,counter);
    });
    },function(callback){
      voteClient.rpush(data['D'],socket.id,function(err,reply){
      counter[data['D']]=reply;
      //console.log("Assigning C");
      //console.log(counter[data['C']]);  
      callback(null,counter);
    });
    }
    ],function(err,res){
      //console.log("Results");
      //console.log(res);
      callback(counter);
    });
}

function fetchResults(callback){
  async.series([
    //Vote count for first post //Accommodation
    function(callback){
      voteClient.llen('paa',function(err,reply){
        if(!err){
          temp['paa']=reply;
          callback(null,reply);
        }else{
          //Find Code Line Number
          console.log("Error Line")
        }
      });
    },function(callback){
      voteClient.llen('pab',function(err,reply){
        if(!err){
          temp['pab']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
      voteClient.llen('pac',function(err,reply){
        if(!err){
          temp['pac']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
      voteClient.llen('pad',function(err,reply){
        if(!err){
          temp['pad']=reply;
          callback(null,reply);
        }
      });
    },
    //Vote cont for Second Post //Finance
    function(callback){
      voteClient.llen('pba',function(err,reply){
        if(!err){
          temp['pba']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
      voteClient.llen('pbb',function(err,reply){
        if(!err){
          temp['pbb']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
      voteClient.llen('pbc',function(err,reply){
        if(!err){
          temp['pbc']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
      voteClient.llen('pbd',function(err,reply){
        if(!err){
          temp['pbd']=reply;
          callback(null,reply);
        }
      });
    },
    //Vote Count for Third Post //President
    function(callback){
      voteClient.llen('pca',function(err,reply){
        if(!err){
          temp['pca']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
      voteClient.llen('pcb',function(err,reply){
        if(!err){
          temp['pcb']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
      voteClient.llen('pcc',function(err,reply){
        if(!err){
          temp['pcc']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
      voteClient.llen('pcd',function(err,reply){
        if(!err){
          temp['pcd']=reply;
          callback(null,reply);
        }
      });
    },
    //Vote Count for Fourth Post //Sports and Gender
    function(callback){
      voteClient.llen('pda',function(err,reply){
        if(!err){
          temp['pda']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
      voteClient.llen('pdb',function(err,reply){
        if(!err){
          temp['pdb']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
      voteClient.llen('pdc',function(err,reply){
        if(!err){
          temp['pdc']=reply;
          callback(null,reply);
        }
      });
    },function(callback){
        voteClient.llen('pdd',function(err,reply){
          if(!err){
            temp['pdd']=reply;
            callback(null,reply);
          }
      });
    }
    ],function(err,res){
      callback(temp);
    });
}

router.get('/',function(req,res){
  if(!req.session.key){
    fetchResults(function(initialRes){
      db.getVotingDetails(req,"candidates",function(response){
            if(response==null){
                    res.json({"error":true,"message":"Database Error Occurred"});
              }else{    
              
              //console.log(initialRes);          
                    res.render('index',{title:'E-Voting System',candidates:response,initial:initialRes,'button_sign':"<button class='btn login' data-toggle='modal' id='sign-in' data-target='#squarespaceModal' >Sign In</button>","profile":''});
              }
      });
    });
  }else if(req.session.key){
    if(req.session.key['user_type']=="user"){
      fetchResults(function(initialRes){
         db.getVotingDetails(req,"candidates",function(response){
            if(response==null){
                    res.json({"error":true,"message":"Database Error Occurred"});
              }else{                   
                    //console.log(response);
                    res.render('index',{title:'E-Voting System',candidates:response,initial:initialRes,'button_sign':"<a href='/logout' class='btn logout' id='sign-out'>Sign Out</a>","profile":"<a href='/u' class='btn profile' id='profile'>My Profile</a>"});
              }
      });
    });
    }else if(req.session.key['user_type']=="voter"){
      fetchResults(function(initialRes){
        db.getVotingDetails(req,"candidates",function(response){
            if(response==null){
                    res.json({"error":true,"message":"Database Error Occurred"});
              }else{                   
                    res.render('index',{title:'E-Voting System',candidates:response,initial:initialRes,'button_sign':"<a href='/logout' class='btn logout' id='sign-out'>Sign Out</a>","profile":"<a href='/v' class='btn profile' id='profile'>My Profile</a>"});
              }
      });
    });
    }
  }
});


//Android Route for Public Results Page
router.get('/androidPublic',function(req,res){
  if(!req.session.key){
    fetchResults(function(initialRes){
      db.getVotingDetails(req,"candidates",function(response){
            if(response==null){
                    res.json({"error":true,"message":"Database Error Occurred"});
              }else{                   
                    res.render('index',{title:'E-Voting System',candidates:response,initial:initialRes,'button_sign':"","profile":''});
              }
      });
    });
  }else if(req.session.key){
    if(req.session.key['user_type']=="user"){
      fetchResults(function(initialRes){
         db.getVotingDetails(req,"candidates",function(response){
            if(response==null){
                    res.json({"error":true,"message":"Database Error Occurred"});
              }else{                   
                    res.render('index',{title:'E-Voting System',candidates:response,initial:initialRes,'button_sign':"<a href='/logout' class='btn logout' id='sign-out'>Sign Out</a>","profile":"<a href='/u' class='btn profile' id='profile'>My Profile</a>"});
              }
      });
    });
    }else if(req.session.key['user_type']=="voter"){
      fetchResults(function(initialRes){
        db.getVotingDetails(req,"candidates",function(response){
            if(response==null){
                    res.json({"error":true,"message":"Database Error Occurred"});
              }else{                   
                    res.render('index',{title:'E-Voting System',candidates:response,initial:initialRes,'button_sign':"<a href='/logout' class='btn logout' id='sign-out'>Sign Out</a>","profile":"<a href='/v' class='btn profile' id='profile'>My Profile</a>"});
              }
      });
    });
    }
  }
});


var socketIds=[];
io.sockets.on('connection',function(socket){
  socketIds.push(socket.id);  
  console.log('Client Connected: '+socketIds.length+ " Users Connected"); 
  socket.on('vote',function(data){
  //console.log(data);     
    async.series([
      function(callback){
        db.castVote(data,function(res){
          if(res==null){
            console.log('Null Result server');
            socket.emit('error',{'msg':'A Database Error Occurred. Click OK to forward to System Admin. Click CANCEL to try Again','msg_type':'database'});
            callback(true);
          }else if(res==false){
            console.log('False Result Server');
            socket.emit('error',{'msg':'A System Error Occurred. Click OK to forward to System Admin. Click CANCEL to try Again','msg_type':'system'});
            callback(true);
          }else if(res=="OK"){
            //console.log('Vote Successful server ln 1495');
            callback(null,"OK");
          }
        });
      },
      function(callback){
        assign(data,socket,function(counterr){
          callback(null,counterr);
        });
      }
      ],function(err,fc){
        if(typeof(fc)==='boolean' && fc=='true'){
          console.log('An Error Occurred Voting for '+data.email);
        }else{    
          socket.broadcast.emit('feedback',{'votes':counter});
          socket.emit('feedback',{'msg':"Done Voting"});
        }
      });
  });

  socket.on('disconnect',function(){
    socketIds.splice(socketIds.indexOf(socket.id),1);
    console.log("Client Disconnected: "+socketIds.length+" online");
    //console.log(socketIds);
  });

  socket.on('error_msg',function(incoming){
    socket.broadcast.emit('error_info',{'error_info':incoming});
  });

  //Android App Events 
  //Login
  socket.on("login",function(data){
    //console.log(data.username+":"+data.password);
    socket.emit("login",{msg:"Successful Login",name:data.username});e
  })

});

app.use('/',router);

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send("Page Not Found");
});