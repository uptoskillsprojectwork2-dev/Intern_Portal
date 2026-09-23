import User from '../models/User.js';
import { generateInternCode } from '../utils/generateInternCode.js';
import CertificateRequest from '../models/CertificateRequest.js';

export async function createIntern(req, res) {
	try {
		const { fullName, email, mobileNo, domain, startDate, endDate } = req.body;
		const teamLeader = await User.findById(req.user.id).select('email role');

		if (!teamLeader || teamLeader.role !== 'teamleader') {
			return res.status(403).json({ message: 'Team leader access required' });
		}

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(409).json({ message: 'user already exists' });
		}

		const internCode = await generateInternCode();
		const user = await User.create({
			fullName,
			email,
			mobileNo,
			internCode,
			domain,
			startDate,
			endDate,
			role: 'intern',
			password: internCode,
			internshipDetails: {
				teamleaderEmail: teamLeader.email,
				status: 'ongoing',
				createdBy: teamLeader._id,
			},
		});

		return res.status(201).json({
			message: 'Intern created successfully',
			user: { id: user._id, email: user.email },
		});
	} catch (error) {
		return res.status(500).json({ message: 'internal server error' });
	}
}

export async function getInternsForTL(req, res) {
	try {
		const interns = await User.find({
			role: 'intern',
			'internshipDetails.teamleaderEmail': req.user.email.toLowerCase(),
		})
			.select('-password')
			.sort({ createdAt: -1 });

		return res.status(200).json({
			message: 'Interns fetched successfully',
			interns,
		});
	} catch (error) {
		return res.status(500).json({ message: 'internal server error' });
	}
}



// Step 1: TL sees requests waiting for their review
export const getRequestsForReview = async (req, res) => {
  try {
    const requests = await CertificateRequest.find({ status: 'pending' })
      .populate('userId', 'fullName email internCode domain')
      .sort({ requestedAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// Step 2: TL either forwards (→ processing) or rejects (→ rejected, terminal)
export const reviewRequestAsTL = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'forward' | 'reject'

    if (!['forward', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be "forward" or "reject"' });
    }

    const request = await CertificateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'This request has already been reviewed' });
    }

    if (action === 'reject') {
      if (!rejectionReason) {
        return res.status(400).json({ message: 'rejectionReason is required when rejecting' });
      }
      request.status = 'rejected';
      request.reviewedBy = req.user.id;
      request.reviewedAt = new Date();
      request.rejectionReason = rejectionReason;
    } else {
      request.status = 'processing';
      request.forwardedBy = req.user.id;   // remove this line if you skipped the schema addition
      request.forwardedAt = new Date();    // remove this line if you skipped the schema addition
    }

    await request.save();
    res.json({ request });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};