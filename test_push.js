const axios = require('axios');

async function sendTestNotification() {
    console.log("Sending test push notification...");
    try {
        const response = await axios.post('https://exp.host/--/api/v2/push/send', {
            to: 'ExponentPushToken[CUqsscGg_sPNwSh-RGELCN]',
            title: 'No Signal',
            body: 'Incoming Gigs: A new AV Tech position just opened up at the Superdome!',
            data: { someData: 'goes here' }
        }, {
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            }
        });
        console.log("Response:", response.data);
    } catch (e) {
        console.error("Error sending push notification:", e.message);
    }
}

sendTestNotification();
