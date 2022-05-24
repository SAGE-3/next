const redis = require("redis");
const mypass = process.env.REDIS_PASSWD || "secrets";

const client = redis.createClient({
	host: "localhost",
	// host: "cumulus.evl.uic.edu",
	// port: 6666,
	// password: mypass,
	// tls: { }
});

client.on("error", function(error) {
	console.error(error);
});
client.on("ready", function() {
	console.log("REDIS> ready");
});
client.on("connect", function() {
	console.log("REDIS> connected");
});

client.get("key", function(getError, result) {
	if (getError) throw getError;    
	console.log("REDIS>", "Got value", typeof result, result);

	// Listen to subscribe event
	client.on("subscribe", function(channel, count) {
		console.log('REDIS>', 'new susbcriber', channel, count);
	});
	client.on("message", function(channel, message) {
		console.log('REDIS>', 'new message', channel, JSON.parse(message));
	});

	// Subscribe to a channel
	client.subscribe("sage3");
});
