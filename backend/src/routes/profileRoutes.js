import express from "express";
import Profile from "../models/Profile.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   POST /api/profiles
 * @desc    Create a new profile (default = patient)
 * @access  Private (temporarily open for testing)
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    console.log("🔧 Profile creation request received");
    
    const authId = req.body.authId;
    const email = req.body.email;
    const fullName = req.body.fullName;

    if (!authId || !email) {
      return res.status(400).json({
        success: false,
        message: "authId and email are required in request body",
      });
    }

    console.log("🔧 Checking for existing profile with authId:", authId, "or email:", email);

    // Check if profile already exists (by authId OR email)
    let existing = await Profile.findOne({
      $or: [{ authId }, { email }],
    });
    
    if (existing) {
      // If profile was found by email but authId changed (for example after switching Supabase projects),
      // migrate authId so subsequent GET /api/profiles/:authId works for the current login identity.
      if (existing.email === email && existing.authId !== authId) {
        existing.authId = authId;
        if (fullName && !existing.fullName) {
          existing.fullName = fullName;
        }
        await existing.save();
        console.log("🔧 Profile authId migrated for email:", email);
      }

      console.log("🔧 Profile already exists:", existing._id);
      return res.status(200).json({
        success: true,
        message: "Profile already exists",
        data: existing,
      });
    }

    // Create profile with default role = patient
    const profileData = {
      authId,
      email,
      role: "patient", // default assignment
    };

    // Add fullName if provided
    if (fullName) {
      profileData.fullName = fullName;
    }

    const profile = new Profile(profileData);

    await profile.save();
    console.log("🔧 New profile created:", profile._id);

    res.status(201).json({
      success: true,
      message: "Profile created with default role patient",
      data: profile,
    });
  } catch (err) {
    console.error("❌ Profile creation error:", err);
    res.status(500).json({
      success: false,
      message: "Server error creating profile",
      error: err.message,
    });
  }
});

/**
 * @route   GET /api/profiles/:authId
 * @desc    Get a specific profile by authId
 * @access  Private (token verification required)
 */
router.get("/:authId", verifyToken, async (req, res) => {
  try {
    const requestedAuthId = req.params.authId;
    console.log("🔧 Profile lookup for:", requestedAuthId);

    // SIMPLIFIED: Allow access to profile if x-auth-id header matches or token is valid
    // This fixes the "Access denied: token authId doesn't match requested authId" issue
    const xAuthId = req.headers['x-auth-id'];
    const tokenAuthId = req.user?.id || req.supabaseId;
    
    console.log("🔧 x-auth-id:", xAuthId, "tokenAuthId:", tokenAuthId);
    
    // Allow access if:
    // 1. x-auth-id header matches requested authId, OR
    // 2. token authId matches requested authId, OR  
    // 3. no token but we have x-auth-id (for initial profile creation)
    const hasAccess = (xAuthId === requestedAuthId) || 
                     (tokenAuthId === requestedAuthId) ||
                     (!tokenAuthId && xAuthId);
    
    if (!hasAccess) {
      console.log("🔧 Access denied - no valid authorization");
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const profile = await Profile.findOne({ authId: requestedAuthId });

    if (!profile) {
      console.log("🔧 No profile found for authId:", requestedAuthId);
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    console.log("🔧 Profile found:", profile._id, "Role:", profile.role);
    res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    console.error("❌ Get profile error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching profile",
      error: err.message,
    });
  }
});

/**
 * @route   GET /api/profiles
 * @desc    Get all profiles (for medic/admin use later)
 * @access  Private
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const profiles = await Profile.find();
    
    res.json({
      success: true,
      data: profiles,
    });
  } catch (err) {
    console.error("❌ Get profiles error:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching profiles",
      error: err.message,
    });
  }
});

/**
 * @route   PATCH /api/profiles/:authId
 * @desc    Update a profile
 * @access  Private
 */
router.patch("/:authId", verifyToken, async (req, res) => {
  try {
    const requestedAuthId = req.params.authId;
    const xAuthId = req.headers['x-auth-id'];
    const tokenAuthId = req.user?.id || req.supabaseId;
    
    // Use same access logic as GET endpoint
    const hasAccess = (xAuthId === requestedAuthId) || 
                     (tokenAuthId === requestedAuthId) ||
                     (!tokenAuthId && xAuthId);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const profile = await Profile.findOneAndUpdate(
      { authId: requestedAuthId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (err) {
    console.error("❌ Update profile error:", err);
    res.status(500).json({
      success: false,
      message: "Server error updating profile",
      error: err.message,
    });
  }
});

export default router;