require("dotenv").config();
const admin = require("./firebaseConfige");
const Notification = require(".././modules/notification/service");

exports.pushNotificationTo = async (to, title, body, click_action, userId) => {
  await new Promise((resolve, reject) => {
    const message = {
      token: to,
      notification: {
        title,
        body,
      },
      data: {
        click_action,
      },
    };
    admin
      .messaging()
      .send(message)
      .then(async function (response) {
        // See the MessagingTopicManagementResponse reference documentation
        // for the contents of response.
        console.log("Successfully subscribed to:", response);
        // console.log(userId, title, body, click_action);
        await Notification.create(userId, title, body, click_action);
        resolve("success");
      })
      .catch(function (error) {
        console.log("Error subscribing to to:", error);
      });
  });
  return data;
};

exports.pushNotificationTopic = async (topic, title, body, click_action) => {
  await new Promise((resolve, reject) => {
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        click_action,
      },
      topic,
    };
    admin
      .messaging()
      .send(message)
      .then(function (response) {
        // See the MessagingTopicManagementResponse reference documentation
        // for the contents of response.
        console.log("Successfully subscribed to topic:", response);
        resolve("success");
      })
      .catch(function (error) {
        console.log("Error subscribing to topic:", error);
      });
  });
  return data;
};

// const tryfnc = () => {
//   var topic = "new-users";

//   var message = {
//     // to: "dh1Z5jnGRuWWHsWg_wKeZf:APA91bGPcW9B-Vfu4qXLXiZS3lOMVzUoGwS19s4FRHMd0xlUoP_C59qBAUMQd7H2Tmb8b_Nwm6XSuGwTBG9IBDSylH12W956x7Uf-kozc7l4fa_i8QE00kVCk1ozvvEYywINJy49ufTc",
//     notification: {
//       title: "not singup",
//       body: "hi you are not singup",
//     },
//     topic: topic,
//   };

//   // Send a message to devices subscribed to the provided topic.
//   admin
//     .messaging()
//     .send(message)
//     .then((response) => {
//       // Response is a message ID string.
//       console.log("hi send ", response);
//     })
//     .catch((error) => {
//       console.log("Error sending message:", error);
//     });
// };

// const tryfnc = async () => {
//   const data = await new Promise((resolve, reject) => {
//     var registrationTokens =
//       "dh1Z5jnGRuWWHsWg_wKeZf:APA91bGPcW9B-Vfu4qXLXiZS3lOMVzUoGwS19s4FRHMd0xlUoP_C59qBAUMQd7H2Tmb8b_Nwm6XSuGwTBG9IBDSylH12W956x7Uf-kozc7l4fa_i8QE00kVCk1ozvvEYywINJy49ufTc";

//     // Subscribe the devices corresponding to the registration tokens to the
//     // topic.
//     var message = {
//       // to: "dh1Z5jnGRuWWHsWg_wKeZf:APA91bGPcW9B-Vfu4qXLXiZS3lOMVzUoGwS19s4FRHMd0xlUoP_C59qBAUMQd7H2Tmb8b_Nwm6XSuGwTBG9IBDSylH12W956x7Uf-kozc7l4fa_i8QE00kVCk1ozvvEYywINJy49ufTc",
//       notification: {
//         title: "hii",
//         body: "hello",
//       },
//       token: registrationTokens,
//       // topic: topic,
//     };
//     admin
//       .messaging()
//       .send(message)
//       .then(function (response) {
//         // See the MessagingTopicManagementResponse reference documentation
//         // for the contents of response.
//         resolve("success");
//       })
//       .catch(function (error) {
//         reject(err);
//       });
//   });
//   return data;
// };
