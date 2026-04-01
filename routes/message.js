const express = require('express');
const router = express.Router();
const Message = require('../models/message');

function getCurrentUserId(req) {
  return String(
    req.headers['x-user-id'] ||
    req.headers['user-id'] ||
    req.query.currentUserId ||
    req.body.currentUserId ||
    ''
  ).trim();
}

function buildMessageContent(body) {
  const rawType = String(body.type || body.messageContent?.type || '').trim().toLowerCase();
  const rawText = body.text ?? body.messageContent?.text;
  const rawFilePath = body.filePath ?? body.path;

  if (rawType === 'file') {
    const filePath = String(rawFilePath ?? rawText ?? '').trim();
    if (!filePath) {
      return { error: 'file message requires filePath or messageContent.text' };
    }

    return {
      value: {
        type: 'file',
        text: filePath
      }
    };
  }

  const text = String(rawText ?? '').trim();
  if (!text) {
    return { error: 'text message requires text or messageContent.text' };
  }

  return {
    value: {
      type: 'text',
      text
    }
  };
}

router.get('/', async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
      return res.status(400).json({ message: 'Current user id is required in x-user-id header' });
    }

    const latestMessages = await Message.aggregate([
      {
        $match: {
          $or: [
            { from: currentUserId },
            { to: currentUserId }
          ]
        }
      },
      {
        $addFields: {
          partnerId: {
            $cond: [{ $eq: ['$from', currentUserId] }, '$to', '$from']
          }
        }
      },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: '$partnerId',
          message: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$message' } },
      { $sort: { createdAt: -1, _id: -1 } }
    ]);

    return res.json(latestMessages);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Get latest messages failed' });
  }
});

router.get('/:userID', async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const otherUserId = String(req.params.userID || '').trim();

    if (!currentUserId) {
      return res.status(400).json({ message: 'Current user id is required in x-user-id header' });
    }

    if (!otherUserId) {
      return res.status(400).json({ message: 'userID is required' });
    }

    const messages = await Message.find({
      $or: [
        { from: currentUserId, to: otherUserId },
        { from: otherUserId, to: currentUserId }
      ]
    }).sort({ createdAt: 1, _id: 1 });

    return res.json(messages);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Get conversation failed' });
  }
});

router.post('/:userID', async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const toUserId = String(req.params.userID || '').trim();

    if (!currentUserId) {
      return res.status(400).json({ message: 'Current user id is required in x-user-id header' });
    }

    if (!toUserId) {
      return res.status(400).json({ message: 'userID is required' });
    }

    const messageContentResult = buildMessageContent(req.body);
    if (messageContentResult.error) {
      return res.status(400).json({ message: messageContentResult.error });
    }

    const message = await Message.create({
      from: currentUserId,
      to: toUserId,
      messageContent: messageContentResult.value
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Send message failed' });
  }
});

module.exports = router;

