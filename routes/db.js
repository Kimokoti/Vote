var mysql=require('mysql');
var async=require('async');
var pool=mysql.createPool({
  connectionLimit:100,
  host:'localhost',
  user:'root',
  password:'hawkbajir',
  database:'voting'
});

var time=new Date();
//TODO: Change handleLogin and retrieveDetails to use Transaction
//Asynchronous Login using async.waterfall
exports.handleLogin=function(req,type,choice,callback){
  async.waterfall([
    function(callback){
      pool.getConnection(function(err,connection){
        if(err){
          //Stop on error
          //Send database connection error page 
          callback(true); //Stop async code execution and go to the last function
        }else{
          callback(null,connection);
        }
      });
    },function(connection,callback){
      var SQLquery;
      switch(type){
        case "login":
          if(choice=="reg_number"){
            SQLquery = "SELECT * FROM login WHERE Reg_ID=?";
          }else if(choice=="id_number"){
            SQLquery = "SELECT * FROM login WHERE ID_Number=?";
          }else if(choice=="email"){
            SQLquery = "SELECT * FROM login WHERE email=?";
          }    
          break;
        default:
          break;
      }
      callback(null,connection,SQLquery);
    },function(connection,SQLquery,callback){
      connection.query(SQLquery,[req.body.address],function(err,rows){
        connection.release();
        if(!err){
          if(type==="login"){
            //callback with result on successful fetch
            callback(rows.length===0 ? false: rows[0]);
          }else{
            callback(false);
          }
        }else{
          callback(true);
        }
      });
    }],
    function(result){
      //Called after every async task is executed
      if(typeof(result) === "boolean" && result === true) {
        callback(null);
      } else {
        //console.log("Retrieving login Successful");
        //console.log(result);
        callback(result);
      }
    });
}

//Asynchronous retrieval of details async.waterfall
exports.retrieveDetails=function(req,userType,id,email,callback){
  async.waterfall([
    function(callback){
      pool.getConnection(function(err,connection){
        if(err){
          callback(true); //Stop async code execution and go to the last function
        }else{
          callback(null,connection);
        }
      });
    },function(connection,callback){
      var SQLquery;
      switch(userType){
        case "user":
            SQLquery = "SELECT * FROM users WHERE ID_Number=? AND email=?";   
            break;
          case "voter":
            SQLquery = "SELECT * FROM voters WHERE reg_ID=? AND email=?";  
            break;
          default:
            break;
      }
      callback(null,connection,SQLquery);
    },function(connection,SQLquery,callback){
      connection.query(SQLquery,[id,email],function(err,rows){
        connection.release();
        if(!err){
          if(userType==="user" || userType==="voter"){
            callback(rows.length===0 ? false: rows[0]);
          }else{
            callback(false);
          }
        }else{
          callback(true);
        }
      });
    }],
    function(result){
      if(typeof(result) === "boolean" && result === true) {
        console.log("Null");
        callback(null);
      } else {
        callback(result);
      }
    });
}

//Retrieve Voter details Android
exports.retrieveDetailsAndroid=function(req,userType,id,email,callback){
  async.waterfall([
    function(callback){
      pool.getConnection(function(err,connection){
        if(err){
          callback(true); //Stop async code execution and go to the last function
        }else{
          callback(null,connection);
        }
      });
    },function(connection,callback){
      var SQLquery;
      switch(userType){
        case "user":
            SQLquery = "SELECT * FROM users WHERE ID_Number=? AND email=?";   
            break;
          case "voter":
            SQLquery = "SELECT * FROM voters WHERE reg_ID=? AND email=?";  
            break;
          default:
            break;
      }
      callback(null,connection,SQLquery);
    },function(connection,SQLquery,callback){
      connection.query(SQLquery,[req.query.regID,req.query.email],function(err,rows){
        connection.release();
        if(!err){
          if(userType==="user" || userType==="voter"){
            callback(rows.length===0 ? false: rows[0]);
          }else{
            callback(false);
          }
        }else{
          callback(true);
        }
      });
    }],
    function(result){
      if(typeof(result) === "boolean" && result === true) {
        console.log("Null");
        callback(null);
      } else {
        //console.log("Result or False");
        //console.log(result);
        callback(result);
      }
    });
}

//Display Users, Voters or Candidates
exports.displayResults=function(req,dispCat,callback){
  async.waterfall([
    function(callback){
      pool.getConnection(function(err,connection){
        if(err){
          //Stop on error
          //Send database connection error page 
          callback(true); //Stop async code execution and go to the last function
        }else{
          callback(null,connection);
        }
      });
    },function(connection,callback){
      var SQLquery;
      switch(dispCat){
        case "voters":
            SQLquery = "SELECT * FROM voters";
          break;
        case "users":
            SQLquery = "SELECT * FROM users";
          break;
        case "candidates":
            SQLquery = "SELECT * FROM candidates ORDER BY post";
          break;    
        default:
          break;
      }
      callback(null,connection,SQLquery);
    },function(connection,SQLquery,callback){
      connection.query(SQLquery,function(err,rows){
        connection.release();
        if(!err){
          if(dispCat==="voters" || dispCat==="users" || dispCat=="candidates"){
            //callback with result on successful fetch
            callback(rows.length===0 ? false: rows);
          }else{
            callback(false);
          }
        }else{
          callback(true);
        }
      });
    }],
    function(result){
      //Called after every async task is executed
      if(typeof(result) === "boolean" && result === true) {
        callback(null);
      } else {
        callback(result);
      }
    });
}

//Get Voting Statistics
exports.getVotingStats=function(req,callback){
  async.waterfall([
    function(callback){
      pool.getConnection(function(err,connection){
        if(err){
          //Stop on error
          //Send database connection error page 
          callback(true); //Stop async code execution and go to the last function
        }else{
          callback(null,connection);
        }
      });
    },function(connection,callback){
      var SQLquery= "SELECT * FROM voting";         
      callback(null,connection,SQLquery);
    },function(connection,SQLquery,callback){
      connection.query(SQLquery,function(err,rows){
        connection.release();
        if(!err){
            callback(rows.length===0 ? false: rows);
        }else{
            callback(true);
        }
      });
    }],
    function(result){
      //Called after every async task is executed
      if(typeof(result) === "boolean" && result === true) {
        callback(null);
      } else {
        //console.log(result);
        callback(result);
      }
    });
}

//Register Users, Voters
exports.handleRegistration=function(req,userType,passwordEnc,callback){
  async.waterfall([
    function(callback){
      pool.getConnection(function(err,connection){
        if(err){
          //Stop on error
          //Send database connection error page 
          callback(true); //Stop async code execution and go to the last function
        }else{
          callback(null,connection);
        }
      });
    },function(connection,callback){

        var SQLquery;
        var SQLqueryLogin;
        var argsArray=[];
        var argsArrayLogin=[];
      switch(userType){
        case "user":
            SQLqueryCheck="SELECT * FROM login WHERE ID_Number="+connection.escape(req.body.idNumber)+"OR email="+connection.escape(req.body.emailAdd);

            SQLquery = "INSERT INTO users(username,email,position,gender,ID_Number,reg_by,reg_on) VALUES(?,?,?,?,?,?,?)";
            argsArray=[req.body.username,req.body.emailAdd,req.body.position,req.body.gender,req.body.idNumber,req.session.key['username'],time.getDate()+'/'+(time.getMonth()+1)+'/'+time.getFullYear()+"  "+time.getHours()+':'+time.getMinutes()]; 
            SQLqueryLogin="INSERT INTO login(password,user_type,email,ID_Number) VALUES(?,?,?,?)";
            argsArrayLogin=[passwordEnc,req.body.position,req.body.emailAdd,req.body.idNumber];
            break;
        case "voter":
            SQLqueryCheck="SELECT * FROM login WHERE Reg_ID="+connection.escape(req.body.regNumber)+"OR email="+connection.escape(req.body.emailAdd);

            SQLquery = "INSERT INTO voters(votername,email,gender,residence,reg_ID,reg_by,reg_on) VALUES(?,?,?,?,?,?,?)";
            argsArray=[req.body.voterName,req.body.emailAdd,req.body.gender,req.body.residence,req.body.regNumber,req.session.key['username'],time.getDate()+'/'+(time.getMonth()+1)+'/'+time.getFullYear()+"  "+time.getHours()+':'+time.getMinutes()]; 
            SQLqueryLogin="INSERT INTO login(password,user_type,email,Reg_ID) VALUES(?,?,?,?)";
            argsArrayLogin=[passwordEnc,"voter",req.body.emailAdd,req.body.regNumber];
            break;
          default:
            break;
      }
      callback(null,connection,SQLquery,SQLqueryLogin,argsArray,argsArrayLogin);
    },function(connection,SQLquery,SQLqueryLogin,argsArray,argsArrayLogin,callback){
      //Execute Multiple Queries using transaction
      connection.beginTransaction(function(err){
        if(err){ console.log("Error Beginning Transaction"); }
            //Executing First Query
            connection.query(SQLqueryCheck,function(err,rows){
              if(err){
                connection.rollback(function(){
                  console.log("Error Searching Existing Id");
                  callback(true);
                });
              }else  if(!err){
                  if(rows.length>0){
                      //Dummy Tests
                      console.log("Exists");
                      //console.log(rows);
                      if(rows[0]["email"]==req.body.emailAdd){
                        callback("Email Exists")
                      }else if(rows[0]["user_type"]=="admin" && rows[0]["user_type"]=="officer" && rows[0]["ID_Number"]==req.body.idNumber){
                           callback("ID Exists")
                      }else if(rows[0]["user_type"]=="voter" && rows[0]["Reg_ID"]==req.body.regNumber){
                         callback("Reg Exists")
                      }                   
                  }else{
                                 //Executing Second Query
                          connection.query(SQLquery,argsArray,function(err,res){
                          if(err){
                            connection.rollback(function(){
                              console.log("First Query Caused Rolled Back");
                              callback(true);
                            });
                          }
                        //Executing Third Query
                          connection.query(SQLqueryLogin,argsArrayLogin,function(err,res){
                            if(err){
                                connection.rollback(function(){
                                console.log("Second Query Caused Rolled Back");
                                callback(true);
                              });
                            }
                            connection.commit(function(err){
                              if(err){
                                connection.rollback(function(){
                                  console.log("Error while committing");
                                  callback(true);
                                });
                              }
                              console.log("Transaction Complete");
                              connection.release();
                              callback("OK");
                            });
                          }); 
                      });
                  }
             }
        });
      });
    }],
    function(result){
      if(typeof(result) === "boolean" && result === true) {
        console.log("Null");
        callback(null);
      } else {
        console.log("Result or False");
        //console.log(result);
        callback(result);
      }
    });
}

//Candidate Registration
exports.handleCandidateRegistration=function(req,callback){
  async.waterfall([
    function(callback){
      pool.getConnection(function(err,connection){
        if(err){
          //Stop on error
          callback(true); //Stop async code execution and go to the last function
        }else{
          callback(null,connection);
        }
      });
    },function(connection,callback){
            SQLqueryCheckVoter="SELECT * FROM voters WHERE reg_ID="+connection.escape(req.body.regNumber)+"OR email="+connection.escape(req.body.emailAdd);
            SQLqueryCheckCand="SELECT * FROM candidates WHERE reg_ID="+connection.escape(req.body.regNumber)+"OR email="+connection.escape(req.body.emailAdd);
            
            SQLquery = "INSERT INTO candidates(cand_name,email,gender,reg_ID,reg_by,reg_on,post) VALUES(?,?,?,?,?,?,?)";
            argsArray=[req.body.candName,req.body.emailAdd,req.body.gender,req.body.regNumber,req.session.key['username'],time.getDate()+'/'+(time.getMonth()+1)+'/'+time.getFullYear()+"  "+time.getHours()+':'+time.getMinutes(),req.body.position]; 
                       
      callback(null,connection,SQLquery,SQLqueryCheckVoter,SQLqueryCheckCand,argsArray);
    },function(connection,SQLquery,SQLqueryCheckVoter,SQLqueryCheckCand,argsArray,callback){
      //Execute Multiple Queries using transaction
      connection.beginTransaction(function(err){
        if(err){ console.log("Error Beginning Transaction"); }
            //Executing First Query
            connection.query(SQLqueryCheckCand,function(err,rows){
              if(err){
                connection.rollback(function(){
                  console.log("Error Searching Existing Id/Email");
                  callback(true);
                });
              }else  if(!err){
                  if(rows.length>0){
                      //Dummy Tests
                      console.log("Candidate Exists");
                      
                      if(rows[0]["email"].toLowerCase()==req.body.emailAdd.toLowerCase()){
                        callback("Email Exists")
                      }else if(rows[0]["reg_ID"].toLowerCase()==req.body.regNumber.toLowerCase()){
                         callback("Reg Exists")
                      }                   
                  }else{
                        //Executing Second Query Check if Candidate is Voter
                          connection.query(SQLqueryCheckVoter,function(err,rows2){
                          if(err){
                            connection.rollback(function(){
                              console.log("2nd Query Caused Rolled Back");
                              callback(true);
                            });
                          }else if(!err){
                              if(rows2.length==0){
                                callback("Not Voter")
                              }else if(rows2.length>0){
                                if(rows2[0]['email'].toLowerCase()==req.body.emailAdd.toLowerCase() && rows2[0]['reg_ID'].toLowerCase()==req.body.regNumber.toLowerCase()){
                                    //Executing Third Query
                                    connection.query(SQLquery,argsArray,function(err,res){
                                      if(err){
                                          connection.rollback(function(){
                                          console.log("Third Query Caused Roll Back");
                                          callback(true);
                                        });
                                      }
                                      connection.commit(function(err){
                                        if(err){
                                          connection.rollback(function(){
                                            console.log("Error while committing");
                                            callback(true);
                                          });
                                        }
                                        console.log("Transaction Complete");
                                        connection.release();
                                        callback("OK");
                                      });
                                    }); 
                                }else{
                                  //Email-ID Conflict
                                  callback("E-I Conflict");
                                }
                              }
                          }
                      });
                  }
             }
        });
      });
    }],
    function(result){
      if(typeof(result) === "boolean" && result === true) {
        console.log("Null");
        callback(null);
      } else {
        //console.log("Result or False");
        //console.log(result);
        callback(result);
      }
    });
}

exports.uploadProfile=function(req,table,id,profName,callback){
   async.waterfall([
    function(callback){
      pool.getConnection(function(err,connection){
        if(err){
          //Stop on error
          //Send database connection error page 
          callback(true); //Stop async code execution and go to the last function
        }else{
          callback(null,connection);
        }
      });
    },function(connection,callback){
      var SQLquery;
      switch(table){
        case "users":
            SQLquery = "UPDATE users SET photo=? WHERE user_id=?";   
            break;
          case "candidates":
            SQLquery = "UPDATE candidates SET photo=? WHERE cand_id=?";  
            break;
          default:
            break;
      }
      callback(null,connection,SQLquery);
    },function(connection,SQLquery,callback){
      connection.query(SQLquery,[profName,id],function(err,status){
        connection.release();
        if(!err){
          if(status){
            callback("UPDATE OK");
          }else{
            callback(false);
          }
        }else{
          callback(true);
        }
      });
    }],
    function(result){
      if(typeof(result) === "boolean" && result === true) {
        console.log("Null: Error Occurred");
        callback(null);
      } else {
        //console.log("Update or False");
        //console.log(result);
        callback(result);
      }
    });
}

// Get candidates or Voting details
exports.getVotingDetails=function(req,detailsType,callback) {
   async.waterfall([
    function(callback) {
        pool.getConnection(function(err,connection){
          if(err) {
            callback(true);
          } else {
            callback(null,connection);
          }
        });
    },
    function(connection,callback) {  
        var SQLquery;
        if(detailsType=="votesDetails"){
              SQLquery = "SELECT * FROM voting WHERE email=? AND Reg_ID=?";
        } else if(detailsType=='candidates'){
              SQLquery = "SELECT * FROM candidates ORDER BY post,cand_name ASC";
        }  
        callback(null,connection,SQLquery);
    },
    function(connection,SQLquery,callback) {
          if(detailsType=="votesDetails"){
              connection.query(SQLquery,[req.session.key['email'],req.session.key['reg_ID']],function(err,rows){
                   connection.release();
                if(!err) {
                    callback(rows.length === 0 ? false : rows[0]);
                } else {
                    callback(true);
                 }
            });
          }else if(detailsType=="candidates"){
                connection.query(SQLquery,function(err,rows){
                     connection.release();
                  if(!err) {
                      callback(rows.length === 0 ? false : rows);
                  } else {
                      callback(true);
                   }
              });
          }
       }],
       function(result){
      // This function gets call after every async task finished.
      if(typeof(result) === "boolean" && result === true) {
        callback(null);
      } else {
        callback(result);
      }
    });
}

//Android Voting Details
// Get candidates or Voting details
exports.getVotingDetailsAndroid=function(req,detailsType,callback) {
   async.waterfall([
    function(callback) {
        pool.getConnection(function(err,connection){
          if(err) {
            callback(true);
          } else {
            callback(null,connection);
          }
        });
    },
    function(connection,callback) {  
        var SQLquery;
        if(detailsType=="votesDetails"){
              SQLquery = "SELECT * FROM voting WHERE email=? AND Reg_ID=?";
        } else if(detailsType=='candidates'){
              SQLquery = "SELECT * FROM candidates ORDER BY post,cand_name ASC";
        }  
        callback(null,connection,SQLquery);
    },
    function(connection,SQLquery,callback) {
          if(detailsType=="votesDetails"){
              connection.query(SQLquery,[req.body.email,req.body.regID],function(err,rows){
                   connection.release();
                if(!err) {
                    callback(rows.length === 0 ? false : rows[0]);
                } else {
                    callback(true);
                 }
            });
          }else if(detailsType=="candidates"){
                connection.query(SQLquery,function(err,rows){
                     connection.release();
                  if(!err) {
                      callback(rows.length === 0 ? false : rows);
                  } else {
                      callback(true);
                   }
              });
          }
       }],
       function(result){
      if(typeof(result) === "boolean" && result === true) {
        callback(null);
      } else {
        callback(result);
      }
    });
}

//Voting Database Transactions
//Cahnge vote_status in voters table
var now=time.getHours()+":"+time.getMinutes();
var choiceA,choiceB,choiceC,choiceD;
exports.castVote=function(data,callback){
  async.waterfall([
    function(callback){
      pool.getConnection(function(err,connection){
        if(err){
          //Stop on error
          callback(true); //Stop async code execution and go to the last function
        }else{
          callback(null,connection);
        }
      });
    },function(connection,callback){
        var SQLqueryGetCandidates="SELECT * FROM candidates ORDER BY post,cand_name ASC";
        var SQLqueryInsertVotes="INSERT INTO voting(email,Reg_ID,vote_time,gender,residence,postA,postB,postC,postD) VALUES(?,?,?,?,?,?,?,?,?)";
        //Implement this
        var SQLqueryUpdateVoters="UPDATE voters SET vote_status=? WHERE email=?";
        var updateArray=["Y",data.email];
                                   
      callback(null,connection,SQLqueryGetCandidates,SQLqueryInsertVotes,SQLqueryUpdateVoters,updateArray);
    },function(connection,SQLqueryGetCandidates,SQLqueryInsertVotes,SQLqueryUpdateVoters,updateArray,callback){
      //Execute Multiple Queries using transaction
      connection.beginTransaction(function(err){
        if(err){ console.log("Error Beginning Transaction"); }
            //Executing First Query
            connection.query(SQLqueryGetCandidates,function(err,rows){
              if(err){
                  connection.rollback(function(){
                  console.log("Error Retrieving Candidates. Db Line 516");
                  callback(true);
                });
              }else  if(!err){
                      /*
                      Each Post takes 4 candidates, so the candidates will be extracted in Ascending Order of Post Names
                      therefore 4 candidates for each of the 4 posts(Index 0 to 15)
                      Miscalculation Here can result to Assigning wrong choice of candidates in Database although it wont affect vote count since 
                      vote count happens in Redis Database. 
                      */
                        //Accommodation Post (Post A)
                        if(data.A=='paa'){
                          choiceA=rows[0]['cand_name'];
                          console.log('data'+data.A)
                        }else if(data.A=='pab'){
                          choiceA=rows[1]['cand_name'];
                        }else if(data.A=='pac'){
                          choiceA=rows[2]['cand_name'];
                        }else if(data.A=='pad'){
                          choiceA=rows[3]['cand_name'];
                        }
                        //Finance Posts(post B)
                        if(data.B=='pba'){
                          choiceB=rows[4]['cand_name'];
                        }else if(data.B=='pbb'){
                          choiceB=rows[5]['cand_name'];
                        }else if(data.B=='pbc'){
                          choiceB=rows[6]['cand_name'];
                        }else if(data.B=='pbc'){
                          choiceB=rows[7]['cand_name'];
                        } 
                        //President Posts(Post C)
                        if(data.C=='pca'){
                          choiceC=rows[8]['cand_name'];
                        }else if(data.C=='pcb'){
                          choiceC=rows[9]['cand_name'];
                        }else if(data.C=='pcc'){
                          choiceC=rows[10]['cand_name'];
                        }else if(data.C=='pcc'){
                          choiceC=rows[11]['cand_name'];
                        }
                        //Sports and Gender (Post D)                        
                        if(data.D=='pda'){
                          choiceD=rows[12]['cand_name'];
                        }else if(data.D=='pdb'){
                          choiceD=rows[13]['cand_name'];
                        }else if(data.D=='pdc'){
                          choiceD=rows[14]['cand_name'];
                        }else if(data.D=='pdd'){
                          choiceD=rows[15]['cand_name'];
                        }
                          
                          var arrayInsertArgs=[data.email,data.reg_ID,now,data.gender,data.residence,choiceA,choiceB,choiceC,choiceD];
                 
                          connection.query(SQLqueryInsertVotes,arrayInsertArgs,function(err,res){
                          if(err){
                              connection.rollback(function(){
                                console.log("Failed To Insert Into Voting Database. Rollback In Progress. DB line 576");
                                callback(true);
                              });
                          }else if(!err){
                              connection.query(SQLqueryUpdateVoters,updateArray,function(err,res){
                                  if(res){
                                  //console.log("Result");
                                  //console.log(res);
                                      connection.commit(function(err){
                                          if(err){
                                            connection.rollback(function(){
                                              console.log("Error while committing");
                                              callback(true);
                                            });
                                          }else{
                                              //console.log("Transaction Complete");
                                              connection.release();
                                              callback("OK")
                                          }
                                        });
                               }else{
                                callback(false);
                               }
                              });                            
                          }
                      });
             }
        });
      });
    }],
    function(result){
      if(typeof(result) === "boolean" && result === true) {
        //console.log("Null");
        callback(null);
      } else {
        //console.log("Result or False");
        //console.log(result);
        callback(result);
      }
    });
}

//Android Check Vote Status
exports.checkVoteStatus=function(req,callback){
     async.waterfall([
    function(callback){
      pool.getConnection(function(err,connection){
        if(err){
          callback(true); //Stop async code execution and go to the last function
        }else{
          callback(null,connection);
        }
      });
    },function(connection,callback){
      var SQLquery;
      SQLquery = "SELECT * FROM voting WHERE Reg_ID=? AND email=?";   
      callback(null,connection,SQLquery);
    },function(connection,SQLquery,callback){
      connection.query(SQLquery,[req.body.regNumber,req.body.email],function(err,rows){
        connection.release();
        if(!err){
            callback(rows.length===0 ? false: rows[0]);
        }else{
          callback(true);
        }
      });
    }],function(result){
      if(typeof(result) === "boolean" && result === true) {
        callback(null);
      } else {
        callback(result);
      }
    });
}