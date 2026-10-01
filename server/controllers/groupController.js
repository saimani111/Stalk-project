const Group = require("../models/group");
const User = require("../models/user");

// Create Group
const createGroup = async (req, res) => {
  try {
    const { name, description, members, avatar } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    let groupMembers = Array.isArray(members) ? members : [];
    if (!groupMembers.includes(req.user._id.toString())) {
      groupMembers.push(req.user._id);
    }

    const group = await Group.create({
      name,
      description: description || "",
      avatar: avatar || "",
      admin: req.user._id,
      members: groupMembers,
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic");

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("CREATE GROUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get Groups for logged in user
const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user._id,
    })
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic")
      .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (error) {
    console.error("GET USER GROUPS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get Single Group Details
const getGroupDetails = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some(
      (m) => String(m._id) === String(req.user._id)
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    res.json(group);
  } catch (error) {
    console.error("GET GROUP DETAILS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add Members to Group (admin only)
const addGroupMembers = async (req, res) => {
  try {
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "memberIds must be a non-empty array" });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (String(group.admin) !== String(req.user._id)) {
      return res.status(403).json({ message: "Only the admin can add members" });
    }

    const validUsers = await User.find({ _id: { $in: memberIds } }).select("_id");
    const newIds = validUsers
      .map((u) => u._id)
      .filter((id) => !group.members.some((m) => String(m) === String(id)));

    if (newIds.length === 0) {
      return res.status(400).json({ message: "No new valid members to add" });
    }

    group.members.push(...newIds);
    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic");

    res.json(populatedGroup);
  } catch (error) {
    console.error("ADD GROUP MEMBERS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// Remove Member from Group (admin removes anyone; member removes self = leave)
const removeGroupMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const isSelfLeave = String(memberId) === String(req.user._id);

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const isMember = group.members.some((m) => String(m) === String(memberId));
    if (!isMember) {
      return res.status(404).json({ message: "Member not found in this group" });
    }

    const isAdmin = String(group.admin) === String(req.user._id);
    if (!isSelfLeave && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Only the admin can remove other members" });
    }

    group.members = group.members.filter((m) => String(m) !== String(memberId));

    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      return res.json({ deleted: true, groupId });
    }

    // Transfer admin if the admin left
    if (String(group.admin) === String(memberId)) {
      group.admin = group.members[0];
    }

    await group.save();

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "name email profilePic")
      .populate("members", "name email profilePic");

    res.json(populatedGroup);
  } catch (error) {
    console.error("REMOVE GROUP MEMBER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addGroupMembers,
  removeGroupMember,
};
