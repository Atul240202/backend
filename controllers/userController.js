const User = require("../models/User");
const asyncHandler = require("express-async-handler");
const FinalOrder = require("../models/FinalOrder");

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Admin: Get all users with basic info
// @route   GET /api/admin/users
// @access  Admin
exports.getAllUsersForAdmin = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");

  res.status(200).json({
    success: true,
    users,
  });
});

// @desc    Admin: Search users by keyword (name or email)
// @route   GET /api/users/search?keyword=abc
// @access  Admin
exports.searchUsersByKeyword = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword?.trim();
  if (!keyword)
    return res.status(400).json({ success: false, message: "Missing keyword" });

  const query = {
    $or: [
      { name: { $regex: keyword, $options: "i" } },
      { email: { $regex: keyword, $options: "i" } },
    ],
  };

  const users = await User.find(query).select("-password");
  res.status(200).json({ success: true, users });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const { fullName, email, phone, subscribeToNewsletter, userGST } = req.body;

    // Find user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== user.email) {
      const emailExists = await User.findOne({
        email,
        _id: { $ne: req.user.id },
      });
      if (emailExists) {
        return res.status(400).json({
          message: "This email is already registered with another account",
        });
      }
    }

    // Check if phone is being changed and if it's already in use
    if (phone && phone !== user.phone) {
      const phoneExists = await User.findOne({
        phone,
        _id: { $ne: req.user.id },
      });
      if (phoneExists) {
        return res.status(400).json({
          message:
            "This phone number is already registered with another account",
        });
      }
    }

    // Update user fields
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (userGST) user.userGST = userGST;
    if (subscribeToNewsletter !== undefined)
      user.subscribeToNewsletter = subscribeToNewsletter;

    // Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        userGST: user.userGST,
        subscribeToNewsletter: user.subscribeToNewsletter,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Get user GST
// @route   GET /api/users/usergst
// @access  Private

exports.getUserGstNo = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("userGST");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      userGST: user.userGST || "",
    });
  } catch (error) {
    console.error("Error fetching user gst no.:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Update user GST
// @route   GET /api/users/usergst
// @access  Private

exports.updateUserGst = asyncHandler(async (req, res) => {
  try {
    const { userGST } = req.body;
    // Find user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (userGST) user.userGST = userGST;
    // Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      message: "UserGST updated successfully",
      user: {
        userGST: user.userGST,
      },
    });
  } catch (error) {
    console.error("Error updating user gst:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Get user addresses
// @route   GET /api/users/addresses
// @access  Private
exports.getUserAddresses = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("addresses");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      addresses: user.addresses || [],
    });
  } catch (error) {
    console.error("Error fetching user addresses:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Add user address
// @route   POST /api/users/addresses
// @access  Private
exports.addUserAddress = asyncHandler(async (req, res) => {
  try {
    const {
      type,
      isDefault,
      firstName,
      lastName,
      address1,
      address2,
      city,
      state,
      postcode,
      country,
      companyName,
      phone,
    } = req.body;

    // Validate required fields
    if (
      !type ||
      !firstName ||
      !lastName ||
      !address1 ||
      !city ||
      !state ||
      !postcode ||
      !country
    ) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    // Find user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create new address
    const newAddress = {
      id: new Date().getTime().toString(),
      type,
      isDefault: isDefault || false,
      firstName,
      lastName,
      address1,
      address2,
      city,
      state,
      postcode,
      country,
      companyName,
      phone,
    };

    // Initialize addresses array if it doesn't exist
    if (!user.addresses) {
      user.addresses = [];
    }

    // If this is set as default, update other addresses of the same type
    if (newAddress.isDefault) {
      user.addresses.forEach((addr) => {
        if (addr.type === newAddress.type) {
          addr.isDefault = false;
        }
      });
    }
    // If this is the first address of its type, set it as default
    else if (!user.addresses.some((addr) => addr.type === newAddress.type)) {
      newAddress.isDefault = true;
    }

    // Add the new address
    user.addresses.push(newAddress);

    // Save updated user
    await user.save();

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    console.error("Error adding user address:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Update user address
// @route   PUT /api/users/addresses/:addressId
// @access  Private
exports.updateUserAddress = asyncHandler(async (req, res) => {
  try {
    const { addressId } = req.params;
    const {
      type,
      isDefault,
      firstName,
      lastName,
      address1,
      address2,
      city,
      state,
      postcode,
      country,
      companyName,
      phone,
    } = req.body;

    // Find user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the address to update
    const addressIndex = user.addresses.findIndex(
      (addr) => addr.id === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Update address fields
    const updatedAddress = {
      ...user.addresses[addressIndex],
      type: type || user.addresses[addressIndex].type,
      firstName: firstName || user.addresses[addressIndex].firstName,
      lastName: lastName || user.addresses[addressIndex].lastName,
      address1: address1 || user.addresses[addressIndex].address1,
      address2: address2 || user.addresses[addressIndex].address2,
      city: city || user.addresses[addressIndex].city,
      state: state || user.addresses[addressIndex].state,
      postcode: postcode || user.addresses[addressIndex].postcode,
      country: country || user.addresses[addressIndex].country,
      companyName: companyName || user.addresses[addressIndex].companyName,
      phone: phone || user.addresses[addressIndex].phone,
      isDefault:
        isDefault !== undefined
          ? isDefault
          : user.addresses[addressIndex].isDefault,
      id: addressId,
    };

    // If this is set as default, update other addresses of the same type
    if (updatedAddress.isDefault) {
      user.addresses.forEach((addr) => {
        if (addr.id !== addressId && addr.type === updatedAddress.type) {
          addr.isDefault = false;
        }
      });
    }

    // Update the address
    user.addresses[addressIndex] = updatedAddress;

    // Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    console.error("Error updating user address:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Delete user address
// @route   DELETE /api/users/addresses/:addressId
// @access  Private
exports.deleteUserAddress = asyncHandler(async (req, res) => {
  try {
    const { addressId } = req.params;

    // Find user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the address to delete
    const addressIndex = user.addresses.findIndex(
      (addr) => addr.id === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({ message: "Address not found" });
    }

    const addressToDelete = user.addresses[addressIndex];

    // Remove the address
    user.addresses.splice(addressIndex, 1);

    // If this was a default address and there are other addresses of the same type,
    // set the first one as default
    if (addressToDelete.isDefault) {
      const sameTypeAddress = user.addresses.find(
        (addr) => addr.type === addressToDelete.type
      );
      if (sameTypeAddress) {
        sameTypeAddress.isDefault = true;
      }
    }

    // Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user address:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Set default address
// @route   PUT /api/users/addresses/:addressId/default
// @access  Private
exports.setDefaultAddress = asyncHandler(async (req, res) => {
  try {
    const { addressId } = req.params;

    // Find user
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the address to set as default
    const address = user.addresses.find((addr) => addr.id === addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Update addresses - set the specified address as default and others of same type as non-default
    user.addresses.forEach((addr) => {
      if (addr.type === address.type) {
        addr.isDefault = addr.id === addressId;
      }
    });

    // Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      message: "Default address updated successfully",
    });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @desc    Fetch user metrics
// @route   PUT /api/users/admin/user-insights
// @access  Private
exports.getUserInsights = asyncHandler(async (req, res) => {
  const now = new Date();
  const past30Days = new Date(now.setDate(now.getDate() - 30));

  const users = await User.find().select("-password");

  const finalOrders = await FinalOrder.find({
    createdAt: { $gte: past30Days },
  });

  const userOrderMap = {};
  finalOrders.forEach((order) => {
    const userId = order.user?.toString();
    if (!userOrderMap[userId]) userOrderMap[userId] = 0;
    userOrderMap[userId] += parseFloat(order.total || 0);
  });

  const enrichedUsers = users.map((user) => ({
    ...user._doc,
    totalSpent: userOrderMap[user._id.toString()] || 0,
  }));

  const topSpenders = enrichedUsers
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);

  const recentRegistrations = users
    .filter((u) => new Date(u.createdAt) >= past30Days)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  const activeUserCount = users.filter(
    (u) => new Date(u.lastLogin) >= past30Days
  ).length;
  const recentUserCount = recentRegistrations.length;
  const totalSales = finalOrders.reduce(
    (sum, order) => sum + parseFloat(order.total || 0),
    0
  );

  res.json({
    topSpenders,
    recentRegistrations,
    activeUserCount,
    recentUserCount,
    totalSales: totalSales.toFixed(2),
  });
});
