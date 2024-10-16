const mongoose = require("mongoose");

// const DB = process.env.DATABASE;


mongoose.connect(process.env.DATABASE_URL,{
    useUnifiedTopology:true,
    useNewUrlParser:true
}).then(()=>console.log("database connected")).catch((err)=>console.log("errr",err))