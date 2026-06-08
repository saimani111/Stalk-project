const Message = require("../models/message");

const sendMessage = async (req, res) => {
  try {
    const { receiver, message } = req.body;

    const newMessage = await Message.create({
      sender: req.user._id,
      receiver,
      message,
      seen: false,
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

const getMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        {
          sender: req.user._id,
          receiver: otherUserId,
        },
        {
          sender: otherUserId,
          receiver: req.user._id,
        },
      ],
    })
      .populate("sender", "name profilePic")
      .populate("receiver", "name profilePic")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: req.user._id,
        seen: false,
      },
      {
        seen: true,
      }
    );

    res.json(messages);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
};