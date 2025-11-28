import passport from 'passport';
import AppleStrategy from 'passport-apple';
import userModel from '../models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

passport.use(
  new AppleStrategy(
    {
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyLocation: process.env.APPLE_PRIVATE_KEY_LOCATION, // or privateKeyString
      callbackURL: process.env.APPLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, idToken, profile, done) => {
      try {
        // Apple only returns name and email on the first login.
        // We might need to handle this if the user logs in again.
        // However, for this implementation, we'll assume we get what we need or handle it gracefully.

        const appleId = idToken.sub;
        const email = idToken.email;
        const name = profile?.name
          ? `${profile.name.firstName} ${profile.name.lastName}`
          : undefined;

        if (!email) {
          // If email is not present in idToken, we might need to check if we already have a user with this appleId
          let user = await userModel.findOne({ appleId });
          if (user) return done(null, user);
          return done(new Error('No email returned from Apple and user not found'));
        }

        let user = await userModel.findOne({ email });

        if (user?.isBlocked) {
          return done(null, false, { message: 'User is blocked' });
        }

        if (!user) {
          user = new userModel({
            name: name || 'Apple User', // Fallback name
            email,
            isVerified: true,
            appleId: appleId,
          });
          await user.save();
        } else {
          const updated = {};
          if (!user.appleId) updated.appleId = appleId;

          if (Object.keys(updated).length) {
            await userModel.findByIdAndUpdate(user._id, updated, { new: true });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;
