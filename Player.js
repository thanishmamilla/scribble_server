const mongoose=require("mongoose");
const playerSchema=new mongoose.Schema({
    nickname:{
        type:String,
        trim:true,
    },
    socketId:{
        type:String,
    },
    isPlayerLeader:{
        type:Boolean,
        default:false,
    },
    points:{
        type:Number,
        default:0
    }
})


const playermodel=mongoose.model("Player",playerSchema);
module.exports = {playermodel,playerSchema};
