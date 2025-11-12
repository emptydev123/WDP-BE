const Message = require('../model/message');
const User = require('../model/user');

// Lấy lịch sử chat giữa 2 người dùng
exports.getChatHistory = async (req, res) => {
  const currentUserId = (req._id || req.user?._id)?.toString();
  const { otherId } = req.params;
  if (!currentUserId || !otherId) {
    return res.status(400).json({ error: 'Thiếu tham số user' });
  }
  try {
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherId },
        { sender: otherId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy lịch sử chat' });
  }
};

// Lấy danh sách unique user (đối tác chat) đã từng trao đổi với current user
exports.getChatPartners = async (req, res) => {
  const currentUserId = (req._id || req.user?._id)?.toString();
  if (!currentUserId) {
    return res.status(400).json({ error: 'Thiếu user hiện tại' });
  }
  try {
    // Tìm tất cả messages có liên quan
    const msgs = await Message.find({
      $or: [ { sender: currentUserId }, { receiver: currentUserId } ]
    }).select('sender receiver').lean();

    const partnerIdsSet = new Set();
    for (const m of msgs) {
      if (m.sender.toString() !== currentUserId) partnerIdsSet.add(m.sender.toString());
      if (m.receiver.toString() !== currentUserId) partnerIdsSet.add(m.receiver.toString());
    }
    const partnerIds = Array.from(partnerIdsSet);
    const partners = await User.find({ _id: { $in: partnerIds } }).select('_id fullName username email role');
    res.json({ partners });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi lấy danh sách đối thoại' });
  }
};

// Gửi tin nhắn
exports.sendMessage = async (req, res) => {
  const currentUserId = (req._id || req.user?._id)?.toString();
  const { receiver, content } = req.body || {};
  if (!currentUserId || !receiver || !content?.trim()) {
    return res.status(400).json({ error: 'Thiếu dữ liệu gửi tin nhắn' });
  }
  try {
    const message = await Message.create({ sender: currentUserId, receiver, content: content.trim() });
    // Emit realtime tới phòng của receiver
    const io = req.app.get('io');
    if (io) {
      io.to(receiver).emit('new_message', {
        _id: message._id,
        sender: currentUserId,
        receiver,
        content: message.content,
        createdAt: message.createdAt,
      });
    }
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi gửi tin nhắn' });
  }
};
