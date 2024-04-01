const express=require("express");
var http=require("http");
const app=express();
const port= process.env.PORT || 3000;
var server=http.createServer(app);
const cors = require('cors');
const mongoose=require("mongoose");
const getWord=require("./api/getWord.js");
const Room=require( "./Room.js");
var io=require("socket.io")(server);


app.use(express.json());
app.use(cors());


const DB= "mongodb+srv://thanishmamilla:thanish123@cluster0.1x0tmmk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"


mongoose.connect(DB).then(()=>{console.log('connected to the database')},err => console.error(err));

io.on('connection', socket => {
    console.log("connected");
    socket.on("create-game", async({nickname,name,occupancy,maxRounds}) =>{
        try{
            const existingRoom = await Room.findOne({name});
            if(existingRoom)
            {
                socket.emit("notCorrectGame","Room already exists");
            }
            console.log(socket.id);

            let room = new Room();
            const word=getWord();
            room.word=word;
            room.name=name;
            room.occupancy=occupancy;
            room.maxRounds=maxRounds;

            let player={
                socketId:socket.id,
                nickname:nickname,
            isPartyLeader:true,
            };
            room.players.push(player);
            room = await room.save();
            socket.join(name);
            io.to(name).emit("updateRoom",room);
        }
        catch(err){
            console.log(err);

        }
    });
    
    socket.on('join-game',async({nickname,name})=>{
        try{
            let room = await Room.findOne({name});
            console.log(socket.id);
            if(!room)
            {
                socket.emit('notCorrectgame','Please enter a valid room name');
                return;
            }

            if(room.isJoin)
            {
                let player= {
                    socketId:socket.id,
                    nickname,
                }
                room.players.push(player);
                socket.join(name);

                if(room.players.length === room.occupancy){
                    room.isJoin = false;
                }
                console.log(room);
                room.turn = room.players[room.turnIndex];
                room = await room.save();
                console.log(room);
                io.to(name).emit('updateRoom',room);
            }
            else{
                socket.emit('notCorrectgame','The game is in progress,Please try later**');
            }

        }
        catch(err)
        {
            console.error(err);
        }
    })


    socket.on('msg',async(data)=>{
        try{
            if(data.msg === data.word){
                let room = await Room.find({name:data.roomName});
                let userPlayer = room[0].players.filter(
                    (player)=>player.nickname=== data.username
                )
                if(data.timeTaken !== 0){
                    userPlayer[0].points += Math.round((200/data.timeTaken) *10);
                }
                room = await room[0].save();
                io.to(data.roomName).emit('msg',{
                    username:data.username,
                    msg:'Guessed it',
                    guessedUserCtr:data.guessedUserCtr+1,

                })
                socket.emit('closeInput',"");

            }else{
                io.to(data.roomName).emit('msg',{
                    username:data.username,
                    msg:data.msg,
                    guessedUserCtr:data.guessedUserCtr,
                })
            }

        }catch(err){
            console.log(err);
        }
    })

    socket.on('change-turn',async(name)=>{
        try{
            let room = await Room.findOne({name});
            if (!room) {
                console.log('Room not found');
                return;
            }
            
            if (room.players.length === 0) {
                console.log('No players in the room');
                return;
            }
    
            let idx = room.turnIndex;
            if (idx + 1 === room.players.length) {
                room.currentRound += 1;
            }
            if(room.currentRound <= room.maxRounds){
                const word = getWord();
                room.word = word;
                room.turnIndex=(idx+1)%room.players.length;
                room.turn = room.players[room.turnIndex];
                room = await room.save();
                io.to(name).emit('change-turn',room);
            }
            else{
                io.to(name).emit("show-leaderboard",room.players);

            }

        }
        catch(err){
            console.log(err);

        }
    })

    socket.on('updateScore',async(name)=>{
        try{
            const room = await Room.findOne({name});
            io.to(name).emit('updateScore',room);

        }
        catch(err){
            console.log(err);
        }
    })
    socket.on('paint',({details,roomName})=>{
        io.to(roomName).emit('points',{details:details});
    })

    socket.on('color-change',({color,roomName})=>{
        io.to(roomName).emit('color-change',color);
    })

    socket.on('stroke-width',({value,roomName})=>{
        io.to(roomName).emit('stroke-width',value);
    })

    socket.on('clean-screen',(roomName)=>{
        io.to(roomName).emit('clean-screen','');
    })

    socket.on('disconnect',async()=>{
        try{
            let room = await Room.findOne({"players.socketId":socket.id})
            for(let i=0;i<room.players.length;i++)
            {
                if(room.players[i].socketId === socket.id)
                {
                    room.players.splice(i,1);
                    break;   
                }
            }
            room = await room.save();
            if(room.players.length === 1){
                socket.broadcast.to(room.name).emit('show-leaderboard',room.players);
            }
            else{
                socket.broadcast.to(room.name).emit('user-disconnected',room);
            }

        }
        catch(err){

        }
    })


    
})


server.listen(port,"0.0.0.0",()=>{
    console.log('Server started and running'+ port);
})