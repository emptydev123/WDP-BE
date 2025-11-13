const Message = require('../model/message');
const User = require('../model/user');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

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

// Multer setup (memory for processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Ensure upload dir exists
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Upload file for chat -> returns {url, type, name, size}
exports.uploadChatFile = [upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const uploadRoot = path.join(__dirname, '..', 'public', 'uploads', 'chat');
    ensureDir(uploadRoot);

    const ext = file.mimetype.startsWith('image/') ? 'webp' : (file.originalname.split('.').pop() || 'bin');
    const baseName = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const finalName = `${baseName}.${ext}`;
    const absPath = path.join(uploadRoot, finalName);

    if (file.mimetype.startsWith('image/')) {
      // Optimize image
      await sharp(file.buffer)
        .rotate()
        .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(absPath);
    } else {
      // Save original buffer for non-image
      fs.writeFileSync(absPath, file.buffer);
    }

    const publicUrl = `/uploads/chat/${finalName}`;
    res.json({
      url: publicUrl,
      type: file.mimetype,
      name: file.originalname,
      size: file.size,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
}];

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
  const { receiver, content, attachments } = req.body || {};
  if (!currentUserId || !receiver || (!attachments?.length && !content?.trim())) {
    return res.status(400).json({ error: 'Thiếu dữ liệu gửi tin nhắn' });
  }
  try {
    const message = await Message.create({
      sender: currentUserId,
      receiver,
      content: content?.trim() || '',
      attachments: Array.isArray(attachments) ? attachments : [],
    });
    
    // Lấy thông tin sender để gửi cùng với message
    const senderInfo = await User.findById(currentUserId).select('_id fullName username email role');
    
    // Emit realtime tới phòng của receiver
    const io = req.app.get('io');
    if (io) {
      io.to(receiver).emit('new_message', {
        _id: message._id,
        sender: currentUserId,
        receiver,
        content: message.content,
        attachments: message.attachments,
        createdAt: message.createdAt,
        senderInfo: senderInfo ? {
          _id: senderInfo._id,
          fullName: senderInfo.fullName,
          username: senderInfo.username,
          email: senderInfo.email,
          role: senderInfo.role,
        } : null,
      });
    }
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi gửi tin nhắn' });
  }
};
