const io = require("socket.io")();
// const chat = require(".././modules/chat/service");
// const db = require("./../models");
const socketio = {
  io: io,
};

const messageFormate = (action, data) => {
  return {
    action,
    data,
  };
};

// Add your socket.io logic here!
io.on("connection", (socket) => {
  console.log("User Connected", socket.id);
  socket.on("user_join", () => {
    socket.join("chat_room");
    console.log("join room");
  });

  // socket.on("join_room", (data) => {
  //   socket.join(`${data.senderId}${data.receiverId}`);
  //   socket.join(`${data.receiverId}${data.senderId}`);

  //   console.log("user ", data.userName, "join Room", data.room);
  // });
  socket.on("sendMessage", (data) => {
    console.log("sendMessage", data);
    // socket.to(data.room).emit("receiveMessage", data);
    socket.to("chat_room").emit(data.receiverId, messageFormate("chat", data));
    chat.create(data);
  });
  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});
// end of socket.io logic

module.exports = socketio;
