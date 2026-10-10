import mongoose from "mongoose";
import User from "../models/User.js";
import RetentionPolicy from "../models/RetentionPolicy.model.js";

/**
 * GET /api/admin/retention-policy
 * Retrieves the current singleton data retention policy.
 * Initializes default policy (30 grace days, 90 purge days) if none exists.
 */
export const getRetentionPolicy = async (req, res) => {
  try {
    const policy = await RetentionPolicy.getOrCreatePolicy();
    return res.status(200).json({
      message: "Retention policy retrieved successfully",
      policy: {
        _id: policy._id,
        graceDays: policy.graceDays,
        purgeDays: policy.purgeDays,
        updatedBy: policy.updatedBy,
        updatedAt: policy.updatedAt,
        createdAt: policy.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * PATCH /api/admin/retention-policy
 * Updates retention policy parameters (graceDays and purgeDays).
 * Enforces:
 * - Integer values >= 1
 * - purgeDays > graceDays
 * - Exactly one singleton document maintained
 */
export const updateRetentionPolicy = async (req, res) => {
  try {
    const { graceDays, purgeDays } = req.body;

    // Validate type and presence
    if (graceDays === undefined || purgeDays === undefined) {
      return res.status(400).json({ message: "Both graceDays and purgeDays are required" });
    }

    const grace = Number(graceDays);
    const purge = Number(purgeDays);

    if (!Number.isInteger(grace) || !Number.isInteger(purge)) {
      return res.status(400).json({ message: "graceDays and purgeDays must be integers" });
    }

    if (grace < 1 || purge < 1) {
      return res.status(400).json({ message: "graceDays and purgeDays must be at least 1" });
    }

    if (purge <= grace) {
      return res.status(400).json({ message: "purgeDays must be strictly greater than graceDays" });
    }

    const adminId = req.user?.id || req.user?._id;

    // Atomic update or insert ensuring singleton key integrity
    const updatedPolicy = await RetentionPolicy.findOneAndUpdate(
      { singletonKey: "default_policy" },
      {
        $set: {
          graceDays: grace,
          purgeDays: purge,
          updatedBy: adminId
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Retention policy updated successfully",
      policy: {
        _id: updatedPolicy._id,
        graceDays: updatedPolicy.graceDays,
        purgeDays: updatedPolicy.purgeDays,
        updatedBy: updatedPolicy.updatedBy,
        updatedAt: updatedPolicy.updatedAt
      }
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * GET /api/admin/interns/archived
 * Retrieves archived intern accounts eligible for restoration.
 * Excludes accounts that have already been purged and anonymized.
 */
export const getArchivedInterns = async (req, res) => {
  try {
    const policy = await RetentionPolicy.getOrCreatePolicy();
    const purgeDays = policy.purgeDays || 90;
    const now = new Date();

    const archivedUsers = await User.find({
      role: "intern",
      isArchived: true,
      purgedAt: null
    })
      .select("fullName email internCode domain archivedAt createdAt")
      .sort({ archivedAt: -1 });

    const interns = archivedUsers.map((user) => {
      let daysRemaining = purgeDays;
      if (user.archivedAt) {
        const purgeDate = new Date(user.archivedAt);
        purgeDate.setDate(purgeDate.getDate() + purgeDays);
        const diffMs = purgeDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / 86400000));
      }

      return {
        _id: user._id,
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        internCode: user.internCode,
        domain: user.domain || "N/A",
        archivedAt: user.archivedAt,
        daysRemaining
      };
    });

    return res.status(200).json({
      message: "Archived interns retrieved successfully",
      interns,
      total: interns.length
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * PATCH /api/admin/interns/:id/restore
 * Restores an archived intern account back to active status.
 * Rejects restoration if:
 * - ID is invalid or user not found
 * - User is not currently archived
 * - User has already been purged and anonymized
 */
export const restoreArchivedIntern = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid intern ID format" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Intern not found" });
    }

    if (user.purgedAt) {
      return res.status(400).json({
        message: "Cannot restore an account that has already been purged and anonymized"
      });
    }

    if (!user.isArchived) {
      return res.status(400).json({
        message: "User account is not archived"
      });
    }

    // Atomic conditional update to prevent race condition with purge job
    const restoredUser = await User.findOneAndUpdate(
      { _id: id, isArchived: true, purgedAt: null },
      {
        $set: {
          isArchived: false,
          archivedAt: null
        }
      },
      { new: true }
    ).select("-password");

    if (!restoredUser) {
      return res.status(409).json({
        message: "Account could not be restored because it is no longer in an archivable state or was purged"
      });
    }

    return res.status(200).json({
      message: "Intern account restored successfully",
      user: restoredUser
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

export default {
  getRetentionPolicy,
  updateRetentionPolicy,
  getArchivedInterns,
  restoreArchivedIntern
};
