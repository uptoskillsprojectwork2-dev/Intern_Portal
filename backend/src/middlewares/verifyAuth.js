import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const verifyAuth = async (req, res, next) => {
    try {
        let token = req.cookies?.token;

        if (!token && req.headers.authorization) {
            const parts = req.headers.authorization.split(/\s+/);
            if (parts.length >= 2 && parts[0].toLowerCase() === "bearer") {
                token = parts[1];
            }
        }

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized, token not found"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            message: "invalid or expired token"
        });
    }
};

export default verifyAuth;