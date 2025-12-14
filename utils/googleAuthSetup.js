import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import userModel from '../models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();
function normalizeGooglePhoto(photoUrl) {
  if (!photoUrl) return null;
  return photoUrl.includes('lh3.googleusercontent.com')
    ? `${photoUrl.split('=')[0]}?sz=200`
    : photoUrl;
}
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (_, __, profile, done) => {
      try {
        console.log('---------------- GOOGLE AUTH DEBUGGER ----------------');
        console.log('Google Profile:', JSON.stringify(profile, null, 2));

        const extractedFirstName = profile.name?.givenName || profile.displayName.split(' ')[0];
        const extractedLastName =
          profile.name?.familyName || profile.displayName.split(' ').slice(1).join(' ') || 'User';

        console.log('Extracted firstName:', extractedFirstName);
        console.log('Extracted lastName:', extractedLastName);
        console.log('------------------------------------------------------');

        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'));

        let user = await userModel.findOne({ email });
        if (user?.isBlocked) {
          return done();
        }
        if (!user) {
          user = new userModel({
            firstName: extractedFirstName,
            lastName: extractedLastName,
            email,
            isVerified: true,
            googleId: profile.id,
            gender: null,
            image: normalizeGooglePhoto(profile.photos?.[0]?.value) || null,
          });
          await user.save();
        } else {
          const updated = {};
          if (!user.googleId) updated.googleId = profile.id;

          const newPhoto = normalizeGooglePhoto(profile.photos?.[0]?.value);
          if (newPhoto && user.image !== newPhoto) updated.image = newPhoto;

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
