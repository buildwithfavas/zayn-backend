import { Strategy as FacebookStrategy } from 'passport-facebook';
import userModel from '../models/user.model.js';
import passport from 'passport';
import dotenv from 'dotenv';
dotenv.config();

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    },

    async (_, __, profile, done) => {
      try {
        console.log('---------------- FACEBOOK AUTH DEBUGGER ----------------');
        console.log('Facebook Profile:', JSON.stringify(profile, null, 2));

        const email = profile.emails?.[0]?.value;
        const photoUrl = profile.photos?.[0]?.value;

        const firstName = profile.name?.givenName || profile.displayName.split(' ')[0];
        const lastName =
          profile.name?.familyName || profile.displayName.split(' ').slice(1).join(' ') || 'User';

        console.log('Extracted Email:', email);
        console.log('Extracted Name:', firstName, lastName);
        console.log('--------------------------------------------------------');

        if (!email) {
          // Fallback or Error if email is strict requirement
          // For now, we return error if no email, same as Google logic
          return done(new Error('No email returned from Facebook'));
        }

        let user = await userModel.findOne({ email });

        if (user?.isBlocked) {
          return done(null, false, { message: 'User is blocked' });
        }

        if (!user) {
          user = new userModel({
            firstName,
            lastName,
            email,
            isVerified: true,
            facebookId: profile.id,
            image: photoUrl,
          });
          await user.save();
        } else {
          const updated = {};
          if (!user.facebookId) updated.facebookId = profile.id;
          if (photoUrl && user.image !== photoUrl) updated.image = photoUrl;

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
