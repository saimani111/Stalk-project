const Community = require("../models/community");
const Group = require("../models/group");

// Get all communities
const getCommunities = async (req, res) => {
  try {
    const communities = await Community.find()
      .populate("creator", "name email profilePic")
      .populate({
        path: "groups",
        populate: { path: "members", select: "name email profilePic" },
      })
      .populate("members", "name email profilePic")
      .populate("announcements.author", "name email profilePic")
      .sort({ updatedAt: -1 });

    res.json(communities);
  } catch (error) {
    console.error("getCommunities error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new Community
const createCommunity = async (req, res) => {
  try {
    const { name, description, avatar, groupIds } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Community name is required" });
    }

    const newCommunity = await Community.create({
      name,
      description: description || "",
      avatar: avatar || "",
      creator: req.user._id,
      groups: groupIds || [],
      members: [req.user._id],
      announcements: [
        {
          message: `Welcome to the ${name} Community! Stay tuned for announcements.`,
          author: req.user._id,
        },
      ],
    });

    const populated = await Community.findById(newCommunity._id)
      .populate("creator", "name email profilePic")
      .populate("groups")
      .populate("members", "name email profilePic")
      .populate("announcements.author", "name email profilePic");

    res.status(201).json(populated);
  } catch (error) {
    console.error("createCommunity error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Post an announcement
const postAnnouncement = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    const isMember = community.members.some(
      (m) => String(m) === String(req.user._id)
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this community" });
    }

    community.announcements.unshift({
      message,
      author: req.user._id,
      createdAt: new Date(),
    });

    await community.save();

    const populated = await Community.findById(communityId)
      .populate("creator", "name email profilePic")
      .populate("groups")
      .populate("members", "name email profilePic")
      .populate("announcements.author", "name email profilePic");

    res.json(populated);
  } catch (error) {
    console.error("postAnnouncement error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Link group to community
const linkGroupToCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { groupId } = req.body;

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    const isMember = community.members.some(
      (m) => String(m) === String(req.user._id)
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this community" });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (!community.groups.includes(groupId)) {
      community.groups.push(groupId);
      await community.save();
    }

    const populated = await Community.findById(communityId)
      .populate("creator", "name email profilePic")
      .populate("groups")
      .populate("members", "name email profilePic");

    res.json(populated);
  } catch (error) {
    console.error("linkGroupToCommunity error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getCommunities,
  createCommunity,
  postAnnouncement,
  linkGroupToCommunity,
};
