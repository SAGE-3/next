const accountSid = 'AC43f67ea8d72208ae398d8d234d365d99'; // Your Account SID from www.twilio.com/console
const authToken = 'a69de47d75b2edf85da3ea3575ad8128'; // Your Auth Token from www.twilio.com/console

const twilio = require('twilio');
const client = new twilio(accountSid, authToken);

const apiKey = "SK9fcd5219bfa48d8b68ddf459e54fe110";
const apiSecret = "S0TzN2srXLGypAjUnCBdQXOcdhVzosYH";


const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

export function twilioTokenGenerator(identity: string, room: string) {
  // Create an access token which we will sign and return to the client,
  // containing the grant we just created
  const token = new AccessToken(
    accountSid,
    apiKey,
    apiSecret
  );

  // Assign identity to the token
  token.identity = identity;

  // Grant the access token Twilio Video capabilities
  const grant = new VideoGrant();
  grant.room = room;
  token.addGrant(grant);

  // Serialize the token to a JWT string
  return token.toJwt();
}
